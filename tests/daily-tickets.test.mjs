import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';

test('daily guidance saves once per user and day from qualified current-price picks',async()=>{
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync('backend/postgres.sql','utf8'));
 globalThis.__ARATA_DAILY_DB={prepare(sql){return {params:[],bind(...p){this.params=p;return this;},async first(){return sqlite.prepare(sql).get(...this.params)||null;},async all(){return {results:sqlite.prepare(sql).all(...this.params)};},async run(){sqlite.prepare(sql).run(...this.params);return {success:true};}};}};
 const bundle=await build({entryPoints:['lib/daily-tickets.ts'],bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'test-env',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const env={DB:globalThis.__ARATA_DAILY_DB};',loader:'js'}));}}]});
 const {ensureDailyTickets,ensureDailyForAll,dailyStatus}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
 const now=new Date().toISOString(),kickoff=new Date(Date.now()+3*3600000).toISOString();
 const picks=[0,1].map(i=>({id:'p'+i,fixtureId:'f'+i,home:'Home '+i,away:'Away '+i,kickoff,league:'Test',leagueId:'test',market:'BTTS',selection:'yes',line:null,period:'FT',outcome:'pending',probability:.82,odds:1.6,edge:.195,confidence:'high',predictor:'arata',bookmaker:'Test',modelCaptured:now,oddsCaptured:now,oddsSource:'Public bookmaker feed'}));
 const quotes=picks.map(p=>({fixtureId:p.fixtureId,market:p.market,selection:p.selection,line:p.line,period:p.period,bookmaker:p.bookmaker,odds:p.odds,captured:now}));const saved=[];
 const load=async()=>({allPicks:picks,eligibleSelections:quotes,comparison:{recommendation:'arata'}}),save=async(body,userId,generated)=>{saved.push({body,userId,generated});};
 try{const first=await ensureDailyTickets('user-1',load,save);assert.equal(first.status,'complete');assert.ok(first.count>=1);assert.ok(saved.every(item=>item.generated&&item.userId==='user-1'&&item.body.predictionIds.length===2));
  const count=saved.length;await ensureDailyTickets('user-1',load,save);assert.equal(saved.length,count);assert.equal((await dailyStatus('user-1')).status,'complete');
  await ensureDailyTickets('user-2',load,save);assert.ok(saved.length>count);assert.ok(saved.slice(count).every(item=>item.userId==='user-2'));
  const insert=sqlite.prepare('INSERT INTO auth_users(id,username,email,first_name,last_name,phone,role,active,must_change_password,salt,password_hash,created,updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
  for(let i=0;i<25;i++)insert.run('batch-'+i,'batch-'+i,`batch${i}@example.test`,'Batch','User','','user',1,0,'salt','hash',now,now);
  let stateReads=0;const sharedLoad=async id=>{stateReads++;return load(id);};
  await ensureDailyForAll(sharedLoad,save);assert.equal(new Set(saved.filter(s=>s.userId.startsWith('batch-')).map(s=>s.userId)).size,20);assert.equal(stateReads,1);
  await ensureDailyForAll(sharedLoad,save);assert.equal(new Set(saved.filter(s=>s.userId.startsWith('batch-')).map(s=>s.userId)).size,25);assert.equal(stateReads,2);
 }finally{delete globalThis.__ARATA_DAILY_DB;sqlite.close();}
});
