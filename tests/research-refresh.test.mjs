import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';

test('online FT results update cached team form and history revision on a forced refresh',async()=>{
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync('backend/postgres.sql','utf8'));
 globalThis.__ARATA_DB={prepare(sql){return {params:[],bind(...params){this.params=params;return this;},async all(){return {results:sqlite.prepare(sql).all(...this.params)};},async first(){return sqlite.prepare(sql).get(...this.params)||null;},async run(){sqlite.prepare(sql).run(...this.params);return {success:true};}};},async batch(commands){sqlite.exec('BEGIN');try{for(const command of commands)await command.run();sqlite.exec('COMMIT');return [];}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
 const originalFetch=globalThis.fetch;
 const today=new Date(),yesterday=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate()-1,12)),recentMonth=`${yesterday.getUTCFullYear()}${String(yesterday.getUTCMonth()+1).padStart(2,'0')}`;
 const oldDate=new Date(Date.now()-7*86400000),csvDate=[String(oldDate.getUTCDate()).padStart(2,'0'),String(oldDate.getUTCMonth()+1).padStart(2,'0'),oldDate.getUTCFullYear()].join('/');
 let awayScore=0,requests=0;
 globalThis.fetch=async url=>{requests++;const address=String(url);if(address.includes('football-data.co.uk'))return new Response(`Date,HomeTeam,AwayTeam,FTHG,FTAG\n${csvDate},Arsenal,Chelsea,2,1\n`,{status:200});const month=new URL(address).searchParams.get('dates');const events=month===recentMonth?[{id:'401878773',league:{slug:'eng.1'},competitions:[{date:yesterday.toISOString(),status:{type:{completed:true,state:'post',shortDetail:'FT'}},competitors:[{homeAway:'home',team:{displayName:'Manchester United'},score:'1'},{homeAway:'away',team:{displayName:'Tottenham Hotspur'},score:String(awayScore)}]}]}]:[];return new Response(JSON.stringify({events}),{status:200,headers:{'Content-Type':'application/json'}});};
 try{
  const bundle=await build({entryPoints:['lib/research-provider.ts'],bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'test-env',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const env={DB:globalThis.__ARATA_DB};',loader:'js'}));}}]});
  const {researchHistory}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
  const first=await researchHistory('epl');assert.equal(first.history.find(m=>m.sourceEventId==='401878773')?.score.away,0);assert.equal(first.stale,false);
  const before=requests;awayScore=1;await new Promise(resolve=>setTimeout(resolve,5));const second=await researchHistory('epl',{forceOnline:true});
  assert.ok(requests>before);assert.equal(second.history.find(m=>m.sourceEventId==='401878773')?.score.away,1);assert.notEqual(second.revision,first.revision);
  const stored=sqlite.prepare("SELECT payload FROM historical_results WHERE source='ESPN'").get();assert.equal(JSON.parse(stored.payload).score.away,1);
 }finally{globalThis.fetch=originalFetch;delete globalThis.__ARATA_DB;sqlite.close();}
});
