import {retainBackground,requestState} from './background.mjs';
import {cachedRead,db,latestPredictions,resultFixtureHeads} from './store';
import {buildLearningMatches,trainFeedback,checkDrift,usableActive,LEARNING_SCHEMA,LEARNING_RULES} from './learning-engine.mjs';
import {modelTeam} from './arata-model.mjs';

const KEY='learning:registry:v1';
let registry:any=null,loaded=false,lastChecked=0;
export function resetLearningCache(){registry=null;loaded=false;lastChecked=0;}
function learningWork():any{return requestState('learning-work',()=>({job:null,timer:undefined}));}
export async function learningRegistry(){if(!loaded){registry=(await cachedRead(KEY))?.data||{schema:LEARNING_SCHEMA,status:'collecting',active:null,runs:[],message:'Collecting immutable pre-match forecasts and verified outcomes.',rules:LEARNING_RULES};loaded=true;}const active=usableActive(registry.active);return {...registry,...(registry.active&&!active?{status:'collecting',message:'Previous learning update expired; starting rules are used while new evidence is checked.'}:{}),active,running:!!learningWork().job};}
export async function learningProfile(){return (await learningRegistry()).active;}
export function queueLearning(force=false){
 if(learningWork().job||learningWork().timer||!force&&Date.now()-lastChecked<300000)return;
 const scheduled=new Promise<void>(resolve=>{learningWork().timer=setTimeout(()=>{learningWork().timer=undefined;learningWork().job=(async()=>{
  const owner=crypto.randomUUID(),lease='learning:lease:v1',now=Date.now();
  await db().prepare('INSERT INTO api_cache(key,expires,payload) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET expires=excluded.expires,payload=excluded.payload WHERE api_cache.expires<?').bind(lease,now+90000,JSON.stringify({data:owner}),now).run();
  if((await cachedRead(lease))?.data!==owner)return;
  try{
  // Shared D1 storage arbitrates edge instances; each attempt reloads the
  // incumbent instead of training against an isolate's older cached revision.
  registry=(await cachedRead(KEY))?.data||await learningRegistry();
  const previous=registry;
  if(!force&&Date.now()-Date.parse(previous.checkedAt||'')<300000)return;
  const [predictions,fixtures]=await Promise.all([latestPredictions(true),resultFixtureHeads()]);
  // Use the same canonical team aliases as forecasting, so duplicate providers
  // cannot add votes to either fitting or later-match validation.
  const dataset=buildLearningMatches(predictions,fixtures.map((f:any)=>({...f,home:modelTeam(f.home),away:modelTeam(f.away)})));
  const guarded=checkDrift(dataset,previous),updated=guarded.drift?.status==='rolled-back'&&previous.active?{...guarded,checkedAt:new Date().toISOString()}:await trainFeedback(dataset,guarded);
  const operations=[db().prepare('INSERT INTO api_cache(key,expires,payload) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET expires=excluded.expires,payload=excluded.payload').bind(KEY,Number.MAX_SAFE_INTEGER,JSON.stringify({data:updated,captured:updated.checkedAt}))];
  const latest=updated.runs?.at(-1);if(latest&&latest.id!==previous.runs?.at(-1)?.id)operations.push(db().prepare('INSERT INTO api_cache(key,expires,payload) VALUES(?,?,?) ON CONFLICT(key) DO NOTHING').bind('learning:audit:'+latest.id,Number.MAX_SAFE_INTEGER,JSON.stringify({data:latest,captured:latest.at})));
  if((await cachedRead(lease))?.data!==owner)throw new Error('Learning lease changed; candidate was not activated.');
  await db().batch(operations);
  registry=updated;
  }finally{await db().prepare('DELETE FROM api_cache WHERE key=? AND payload=?').bind(lease,JSON.stringify({data:owner})).run();}
 })().catch((error:Error)=>{registry={...registry,error:error.message,message:'Learning check failed; existing validated profile retained.'};console.error('Learning check:',error);}).finally(()=>{lastChecked=Date.now();learningWork().job=null;resolve();});},0);});retainBackground(scheduled);
}
export async function learningStatus(){const value=await learningRegistry();queueLearning();return {...value,running:!!learningWork().job||!!learningWork().timer};}
