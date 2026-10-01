import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {ticketIdentity,matchingTicket,pendingKickoff} from '../lib/ticket-identity.mjs';
import {ticketProgress,eligibleQuotes} from '../lib/live.mjs';
test('ticket identity ignores order, stake, prices and snapshot/predictor IDs, but distinguishes selections and periods',()=>{
 const a={home:'Arsenal',away:'Chelsea',kickoff:'2026-09-29T18:00:00Z',fixtureId:'a',market:'TOTALS',selection:'over',line:2.5,period:'FT'},b={home:'Liverpool',away:'Everton',kickoff:'2026-09-29T20:00:00Z',fixtureId:'b',market:'BTTS',selection:'yes',period:'FT'};
 assert.equal(ticketIdentity([a,b]),ticketIdentity([{...b,id:'new',odds:9},{...a,fixtureId:'other-provider',predictor:'blend',odds:2}]));
 assert.ok(matchingTicket([{name:'Old ticket',legs:[a,b],stake:5,status:'won'}],[b,a]));
 assert.notEqual(ticketIdentity([a,b]),ticketIdentity([{...a,selection:'under'},b]));
 assert.notEqual(ticketIdentity([a]),ticketIdentity([{...a,period:'HT'}]));
 assert.notEqual(ticketIdentity([a]),ticketIdentity([{...a,line:3.5}]));
 assert.ok(matchingTicket([{legs:[a,b]}],[{...a,kickoff:'2026-09-30T18:00:00Z'},b]));
});
test('pending kickoff uses Kampala date boundaries and current fixture schedules; settled legs hide it',()=>{
 const leg={id:'p',fixtureId:'f',home:'A',away:'B',market:'1X2',selection:'home',kickoff:'2026-09-29T18:00:00Z'};
 const progress=ticketProgress({legs:[leg]},[{id:'f',kickoff:'2026-09-29T22:30:00Z',status:'scheduled'}])[0];
 assert.equal(progress.kickoff,'2026-09-29T22:30:00Z');assert.match(pendingKickoff(progress),/30 Sept 2026.*01:30.*EAT/);
 assert.equal(pendingKickoff({...progress,legOutcome:'won'}),null);assert.equal(pendingKickoff({...progress,legOutcome:'lost'}),null);assert.equal(pendingKickoff({...progress,kickoff:'invalid'}),null);
});
test('real save API rejects concurrent duplicates and legacy tickets, without adding extra locked legs',async()=>{
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync('backend/postgres.sql','utf8'));sqlite.exec('PRAGMA foreign_keys=ON');
 globalThis.__ARATA_DB={prepare(sql){return {sql,params:[],bind(...params){this.params=params;return this;},async all(){return {results:sqlite.prepare(sql).all(...this.params)};},async first(){return sqlite.prepare(sql).get(...this.params)||null;},async run(){sqlite.prepare(sql).run(...this.params);return {success:true};}};},async batch(commands){sqlite.exec('BEGIN');try{for(const c of commands)await c.run();sqlite.exec('COMMIT');return [];}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 const bundle=await build({entryPoints:['lib/service.ts'],bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'test-env',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:"export const env={DB:globalThis.__ARATA_DB,ARATA_ADMIN_INITIAL_PASSWORD:'TestAdmin@123',ARATA_ADMIN_EMAIL:'admin@example.test'};",loader:'js'}));}}]});
 const {handle}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
 const captured=new Date().toISOString(),fixtures=[0,1,2].map(i=>({id:'f'+i,home:'Home '+i,away:'Away '+i,league:'Test League',leagueId:'test',status:'scheduled',kickoff:new Date(Date.now()+7200000).toISOString(),quotes:[{market:'BTTS',selection:'yes',period:'FT',line:null,odds:1.6,bookmaker:'Test quote',source:'Owner-entered',captured}]}));
 for(const f of fixtures)sqlite.prepare('INSERT INTO fixtures VALUES(?,?,?,?)').run(f.id,f.kickoff,JSON.stringify(f),captured);
 const quotes=eligibleQuotes(fixtures),origin='http://localhost',authPost=(path,body,cookie)=>handle(new Request(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)}));
 let login=await authPost('/api/auth/login',{identity:'admin@example.test',password:'TestAdmin@123'});assert.equal(login.status,200);assert.match(sqlite.prepare("SELECT salt FROM auth_users WHERE id='admin'").get().salt,/^100000:/);let cookie=login.headers.get('set-cookie').split(';')[0];
 assert.equal((await authPost('/api/auth/password',{currentPassword:'TestAdmin@123',newPassword:'VerifiedAdmin@123456'},cookie)).status,200);
 login=await authPost('/api/auth/login',{identity:'admin@example.test',password:'VerifiedAdmin@123456'});assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
 const request=(legs,name='Draft',stake=10)=>handle(new Request(origin+'/api/tickets',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({selectionIds:legs.map(l=>l.id),name,stake})}));
 const originalError=console.error;console.error=()=>{};
 try{
  // Force both checks to read the empty collection before either insert commits.
  const responses=await Promise.all([request(quotes.slice(0,2)),request(quotes.slice(0,2).reverse(),'Different name',20)]);assert.deepEqual(responses.map(r=>r.status).sort(),[201,409]);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM tickets').get().n,1);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM ticket_quote_legs').get().n,2);
  const duplicate=await request(quotes.slice(0,2),'Renamed',100);assert.equal(duplicate.status,409);assert.match((await duplicate.json()).error,/already saved/);
  const legacy={id:'legacy-id',name:'Legacy ticket',legs:[quotes[2]],status:'won'};sqlite.prepare('INSERT INTO tickets VALUES(?,?,?,?)').run(legacy.id,captured,'won',JSON.stringify(legacy));assert.equal((await request([quotes[2]])).status,409);
  fixtures[2].quotes[0].selection='no';sqlite.prepare('UPDATE fixtures SET payload=? WHERE id=?').run(JSON.stringify(fixtures[2]),fixtures[2].id);assert.equal((await request(eligibleQuotes([fixtures[2]]))).status,201);
 }finally{console.error=originalError;delete globalThis.__ARATA_DB;sqlite.close();}
});
