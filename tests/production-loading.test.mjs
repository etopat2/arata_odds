import test from 'node:test';
import assert from 'node:assert/strict';
import {runWithBackground,requestState,requestMemo} from '../lib/background.mjs';
import {BoundedCache} from '../lib/bounded-cache.mjs';
import {readApiJson,apiErrorMessage} from '../lib/api-client.mjs';
import {discoveryDays,rotatingWindow,forecastBatch} from '../lib/ingest-plan.mjs';
import {readPublicResponse} from '../lib/network.mjs';
test('a later hosted request cannot inherit stalled I/O or write locks',async()=>{
 const context={waitUntil(){}};let abandoned;
 await runWithBackground(context,async()=>{abandoned=requestState('service',()=>({lock:new Promise(()=>{})}));});
 await runWithBackground(context,async()=>{const own=requestState('service',()=>({lock:Promise.resolve('ready')}));assert.notEqual(own,abandoned);assert.equal(await own.lock,'ready');assert.equal(requestState('service',()=>null),own);});
});
test('large advanced league context is loaded once per request and never shared as an I/O promise',async()=>{
 let reads=0;const context={waitUntil(){}};
 const collect=()=>runWithBackground(context,async()=>{const values=await Promise.all(Array.from({length:500},()=>requestMemo('league',async()=>{reads++;return {archive:'large',rows:[1,2]};})));assert.ok(values.every(v=>v===values[0]));});
 await collect();assert.equal(reads,1);await collect();assert.equal(reads,2);
});
test('raw cache remains below its byte budget even when individual responses are large',()=>{
 const cache=new BoundedCache(100,70);cache.set('a',{x:'a'.repeat(45)});cache.set('b',{x:'b'.repeat(45)});assert.equal(cache.has('a'),false);assert.ok(cache.bytes<=100);cache.set('oversize',{x:'c'.repeat(80)});assert.equal(cache.has('oversize'),false);cache.clear();assert.equal(cache.bytes,0);
});
test('HTML gateway and sign-in responses do not cause JSON syntax errors',async()=>{
 await assert.rejects(readApiJson(new Response('<!DOCTYPE html><title>Gateway failure</title>',{status:502,headers:{'Content-Type':'text/html'}})),/temporarily unavailable/);
 await assert.rejects(readApiJson(new Response('<!DOCTYPE html>',{status:403,headers:{'Content-Type':'text/html'}})),/session/);
 await assert.rejects(readApiJson(new Response('{broken',{headers:{'Content-Type':'application/json'}})),/incomplete/);
 assert.deepEqual(await readApiJson(Response.json({fixtures:[]})),{fixtures:[]});
 assert.match(apiErrorMessage({name:'TimeoutError'}),/previously loaded/);
});
test('discovery respects tomorrow and a specific Kampala day, and rotates every week date',()=>{
 const now=new Date('2026-09-27T20:00:00Z');
 assert.deepEqual(discoveryDays('today',0,true,now),['2026-09-27']);assert.deepEqual(discoveryDays('tomorrow',0,true,now),['2026-09-28']);assert.deepEqual(discoveryDays('date:2026-10-10',4,true,now),['2026-10-10']);
 const week=discoveryDays('week',0,false,now);assert.equal(week.length,7);assert.deepEqual(Array.from({length:7},(_,i)=>discoveryDays('week',i,true,now)[0]),week);assert.deepEqual(discoveryDays('week',7,true,now),[week[0]]);
});
test('oversized public responses are rejected before parsing or caching',async()=>{
 await assert.rejects(readPublicResponse('public',{maxBytes:10},async()=>new Response('x'.repeat(11))),/size limit/);
 await assert.rejects(readPublicResponse('public',{maxBytes:10},async()=>new Response('small',{headers:{'Content-Length':'100'}})),/size limit/);
 const result=await readPublicResponse('public',{maxBytes:100},async()=>Response.json({ok:true}));assert.deepEqual(result.data,{ok:true});
});
test('bounded fixture batches rotate fairly and forecast batches cover multiple matches first',()=>{
 const fixtures=Array.from({length:250},(_,i)=>i),seen=new Set();for(let cursor=0;cursor<300;cursor+=100){const batch=rotatingWindow(fixtures,cursor,100);assert.equal(batch.length,100);batch.forEach(f=>seen.add(f));}assert.equal(seen.size,250);
 const records=Array.from({length:10},(_,i)=>Array.from({length:30},(_,j)=>({id:i+'-'+j,fixtureId:String(i),probability:.6+j/100,odds:1.5}))).flat();const first=forecastBatch(records,0,100);assert.equal(first.length,100);assert.equal(new Set(first.slice(0,10).map(p=>p.fixtureId)).size,10);assert.equal(new Set([...first,...forecastBatch(records,100,100),...forecastBatch(records,200,100)].map(p=>p.id)).size,300);
});
