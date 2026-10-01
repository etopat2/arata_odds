import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {normalizeSecuritySettings} from '../lib/security-settings.mjs';
import {applySecurityHeaders} from '../lib/security-headers.mjs';
import {isCaptureShortcut} from '../lib/capture-controls.mjs';
import {readApiJson} from '../lib/api-client.mjs';

test('security policy rejects unsafe values and response headers protect the app shell',()=>{
 assert.throws(()=>normalizeSecuritySettings({maxSessionsPerUser:0}),/between 1 and 5/);
 assert.throws(()=>normalizeSecuritySettings({blockPaste:'yes'}),/on or off/);
 assert.equal(normalizeSecuritySettings({}).replaceOtherSessionsOnLogin,true);
 assert.throws(()=>normalizeSecuritySettings({replaceOtherSessionsOnLogin:'yes'}),/on or off/);
 const headers=applySecurityHeaders(new Headers(),'https://arata.example/api/state',true);
 assert.equal(headers.get('X-Frame-Options'),'DENY');
 assert.match(headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);
 assert.equal(headers.get('Cache-Control'),'no-store');
 assert.ok(headers.get('Strict-Transport-Security'));
});

test('capture shortcut detection covers keys a browser can deliver',()=>{
 for(const event of [{key:'PrintScreen'},{key:'Unidentified',code:'PrintScreen'},{key:'4',metaKey:true,shiftKey:true},{key:'s',metaKey:true,shiftKey:true},{key:'S',ctrlKey:true,shiftKey:true}])assert.equal(isCaptureShortcut(event),true);
 assert.equal(isCaptureShortcut({key:'s',ctrlKey:true}),false);
});

test('unauthorized data responses immediately notify the open workspace',async()=>{
 const original=globalThis.window,events=[];globalThis.window={location:{href:'https://arata.example/'},dispatchEvent:event=>events.push(event.type)};
 const denied=path=>({status:401,url:'https://arata.example/api/'+path,headers:new Headers({'content-type':'application/json'}),json:async()=>({error:'Sign in to continue.'})});
 try{
  await assert.rejects(readApiJson(denied('state')),/Sign in to continue/);
  assert.deepEqual(events,['arata-session-expired']);
  await assert.rejects(readApiJson(denied('auth/login')),/Sign in to continue/);
  await assert.rejects(readApiJson(denied('auth/me')),/Sign in to continue/);
  assert.deepEqual(events,['arata-session-expired']);
 }finally{if(original===undefined)delete globalThis.window;else globalThis.window=original;}
});

test('admin policy, session limits and revocation are enforced on the server',async()=>{
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync('backend/postgres.sql','utf8'));
 const cryptoDescriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto'),nativeCrypto=globalThis.crypto;
 // Match the deployed runtime, where PBKDF2 requests above 100,000 fail.
 Object.defineProperty(globalThis,'crypto',{configurable:true,value:{
  getRandomValues:nativeCrypto.getRandomValues.bind(nativeCrypto),
  randomUUID:nativeCrypto.randomUUID.bind(nativeCrypto),
  subtle:{digest:nativeCrypto.subtle.digest.bind(nativeCrypto.subtle),importKey:nativeCrypto.subtle.importKey.bind(nativeCrypto.subtle),deriveBits(algorithm,...args){assert.ok(algorithm.iterations<=100000,'PBKDF2 exceeds the hosted runtime limit');return nativeCrypto.subtle.deriveBits(algorithm,...args);}}
 }});
 globalThis.__ARATA_DB={prepare(sql){return {sql,params:[],bind(...params){this.params=params;return this;},async all(){return {results:sqlite.prepare(sql).all(...this.params)};},async first(){return sqlite.prepare(sql).get(...this.params)||null;},async run(){sqlite.prepare(sql).run(...this.params);return {success:true};}};},async batch(commands){sqlite.exec('BEGIN');try{for(const c of commands)await c.run();sqlite.exec('COMMIT');return [];}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 try{
  const bundle=await build({entryPoints:['lib/service.ts'],bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'test-env',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:"export const env={DB:globalThis.__ARATA_DB,ARATA_ADMIN_INITIAL_PASSWORD:'TestAdmin@123',ARATA_ADMIN_EMAIL:'admin@example.test'};",loader:'js'}));}}]});
  const {handle}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
  const origin='http://localhost',call=(path,method='GET',body,cookie,from=origin)=>handle(new Request(origin+path,{method,headers:{Origin:from,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})}));
  assert.equal((await call('/api/admin/settings/security')).status,401);
  let login=await call('/api/auth/login','POST',{identity:'admin@example.test',password:'TestAdmin@123'}),cookie=login.headers.get('set-cookie')?.split(';')[0];assert.equal(login.status,200);
  assert.equal((await call('/api/auth/password','POST',{currentPassword:'TestAdmin@123',newPassword:'VerifiedAdmin@123456'},cookie)).status,200);
  login=await call('/api/auth/login','POST',{identity:'admin@example.test',password:'VerifiedAdmin@123456'});cookie=login.headers.get('set-cookie')?.split(';')[0];assert.equal(login.status,200);
  const injection=await call('/api/history?q='+encodeURIComponent("' OR 1=1 --"),'GET',undefined,cookie);assert.equal(injection.status,200);assert.equal((await injection.json()).total,0);
  assert.equal((await call('/api/auth/login','POST',{identity:"admin@example.test' OR 1=1 --",password:'VerifiedAdmin@123456'})).status,401);
  assert.equal((await call('/api/admin/settings/security','POST',{maxSessionsPerUser:1,currentPassword:'wrong'},cookie)).status,403);
  assert.equal((await call('/api/admin/settings/security','POST',{maxSessionsPerUser:1,currentPassword:'VerifiedAdmin@123456'},cookie,'https://evil.example')).status,403);
  const saved=await call('/api/admin/settings/security','POST',{maxSessionsPerUser:1,loginWhenFull:'deny-new',replaceOtherSessionsOnLogin:false,blockPaste:true,currentPassword:'VerifiedAdmin@123456'},cookie);assert.equal(saved.status,200);
  assert.equal((await call('/api/security/presentation')).status,200);
  const denied=await call('/api/auth/login','POST',{identity:'admin@example.test',password:'VerifiedAdmin@123456'});assert.equal(denied.status,409);
  assert.equal((await call('/api/auth/sessions', 'GET',undefined,cookie)).status,200);
  const change=await call('/api/admin/settings/security','POST',{maxSessionsPerUser:3,loginWhenFull:'replace-oldest',replaceOtherSessionsOnLogin:true,currentPassword:'VerifiedAdmin@123456'},cookie);assert.equal(change.status,200);
  const replacement=await call('/api/auth/login','POST',{identity:'admin@example.test',password:'VerifiedAdmin@123456'});assert.equal(replacement.status,200);
  assert.equal((await call('/api/auth/me','GET',undefined,cookie)).status,401);
  const newCookie=replacement.headers.get('set-cookie')?.split(';')[0];assert.equal((await call('/api/auth/me','GET',undefined,newCookie)).status,200);
  const sessions=await call('/api/auth/sessions','GET',undefined,newCookie);assert.equal((await sessions.json()).sessions.length,1);
  const yetAnother=await call('/api/auth/login','POST',{identity:'admin@example.test',password:'VerifiedAdmin@123456'});assert.equal(yetAnother.status,200);assert.equal((await call('/api/auth/me','GET',undefined,newCookie)).status,401);
  const latestCookie=yetAnother.headers.get('set-cookie')?.split(';')[0];assert.equal((await call('/api/auth/me','GET',undefined,latestCookie)).status,200);
  const create=await call('/api/admin/users','POST',{firstName:'Test',lastName:'User',email:'user@example.test',phone:'+256700000001'},latestCookie);assert.equal(create.status,201);const created=await create.json();assert.notEqual(created.temporaryPassword,'arataodds123');assert.match(created.temporaryPassword,/^[a-f0-9]{24}$/);
 }finally{delete globalThis.__ARATA_DB;Object.defineProperty(globalThis,'crypto',cryptoDescriptor);sqlite.close();}
});
