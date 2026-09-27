import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';import {openSqlite} from '../backend/sqlite-client.mjs';
import {databaseAdapter} from '../backend/database-adapter.mjs';

test('production prepared batches cross the worker boundary, preserve locked records and roll back atomically',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'arata-adapter-test-'));let connection;
 try{
  connection=await openSqlite(path.join(directory,'test.sqlite'),'CREATE TABLE fixtures(id TEXT PRIMARY KEY,value TEXT); CREATE TABLE tickets(id TEXT PRIMARY KEY,value TEXT);');
  const db=databaseAdapter(connection);
  await db.prepare('INSERT INTO tickets VALUES(?,?)').bind('owner','locked odds').run();
  const results=await db.batch([db.prepare('INSERT INTO fixtures VALUES(?,?)').bind('match1','live'),db.prepare('INSERT INTO fixtures VALUES(?,?)').bind('match2','FT')]);
  assert.equal(results.length,2);
  assert.deepEqual((await db.prepare('SELECT * FROM fixtures ORDER BY id').all()).results,[{id:'match1',value:'live'},{id:'match2',value:'FT'}]);
  await assert.rejects(db.batch([db.prepare('UPDATE fixtures SET value=? WHERE id=?').bind('incorrect','match1'),db.prepare('INSERT INTO tickets VALUES(?,?)').bind('owner','overwrite')]),/UNIQUE/);
  assert.equal((await db.prepare('SELECT value FROM fixtures WHERE id=?').bind('match1').first()).value,'live');
  assert.equal((await db.prepare('SELECT value FROM tickets WHERE id=?').bind('owner').first()).value,'locked odds');
  await assert.rejects(connection.query('SELECT ?', [()=>{}]),/could not be cloned/);
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM fixtures').first()).count,2);
 }finally{if(connection)await connection.close();await rm(directory,{recursive:true});}
});
test('database worker preserves committed data, atomically rolls back failures and keeps the score event loop responsive',async()=>{const directory=await mkdtemp(path.join(tmpdir(),'arata-worker-test-'));let db;try{db=await openSqlite(path.join(directory,'test.sqlite'),'CREATE TABLE records(id TEXT PRIMARY KEY,value TEXT);');await db.transaction([{sql:'INSERT INTO records VALUES(?,?)',params:['saved','locked ticket']}]);await assert.rejects(db.transaction([{sql:'INSERT INTO records VALUES(?,?)',params:['draft','temporary']},{sql:'INSERT INTO records VALUES(?,?)',params:['saved','conflict']}]),/UNIQUE/);assert.deepEqual(await db.query('SELECT * FROM records'),[{id:'saved',value:'locked ticket'}]);let ticks=0;const clock=setInterval(()=>ticks++,1);await db.query('WITH RECURSIVE valueset(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM valueset WHERE n<500000) SELECT SUM(n) AS total FROM valueset');clearInterval(clock);assert.ok(ticks>3,'timers and score processing run while SQL executes');await db.close();db=null;db=await openSqlite(path.join(directory,'test.sqlite'),'');assert.equal((await db.query('SELECT value FROM records WHERE id=?',['saved']))[0].value,'locked ticket');}finally{if(db)await db.close();await rm(directory,{recursive:true});}});
