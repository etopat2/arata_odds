import {db,cachedRead,cachedWrite} from './store';
import {buildTicketPlan} from './league-tickets.mjs';

const day=()=>new Date(Date.now()+3*3600000).toISOString().slice(0,10);
const key=(userId:string)=>`daily-ticket:v1:${day()}:${userId}`;
export async function dailyStatus(userId:string){return (await cachedRead(key(userId)))?.data||{status:'waiting',day:day(),message:'Daily analysis will run when current forecasts and prices are available.'};}
export async function ensureDailyTickets(userId:string,loadState:(id:string)=>Promise<any>,save:(body:any,id:string,generated:boolean)=>Promise<any>){
 const recordKey=key(userId),now=Date.now(),owner=crypto.randomUUID(),today=day();
 await db().prepare('INSERT INTO api_cache(key,expires,payload) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET expires=excluded.expires,payload=excluded.payload WHERE api_cache.expires<?').bind(recordKey,now+300000,JSON.stringify({data:{status:'running',day:today,owner,updated:new Date().toISOString()}}),now).run();
 const claim=await cachedRead(recordKey);if(claim?.data?.owner!==owner)return claim?.data;
 let saved=0,reason='';try{
  const snapshot=await loadState(userId),strategies=[{risk:'cautious',legCount:2},{risk:'cautious',legCount:1},{risk:'balanced',legCount:2},{risk:'balanced',legCount:1}];
  for(const strategy of strategies){const plan:any=buildTicketPlan(snapshot.allPicks,snapshot.eligibleSelections,{predictor:'auto',recommendation:snapshot.comparison?.recommendation,...strategy,priority:'chance'});reason=plan.reason||'';if(!plan.tickets.length)continue;
   for(const suggestion of plan.tickets.slice(0,3)){try{await save({predictionIds:suggestion.legs.map((l:any)=>l.id),stake:1,name:`Daily ${strategy.risk} insight · ${today}`},userId,true);saved++;}catch(error:any){if(error?.status!==409)console.error('Daily ticket save:',error);}}
   if(saved)break;
  }
  const data={status:saved?'complete':'waiting',day:today,count:saved,message:saved?`${saved} researched combination${saved===1?' was':'s were'} saved automatically. No bet was placed.`:reason||'No current priced model picks qualify yet. The app will check again.',updated:new Date().toISOString()};await cachedWrite(recordKey,saved?Number.MAX_SAFE_INTEGER:Date.now()+900000,{data});return data;
 }catch(error){console.error('Daily ticket analysis:',error);const data={status:'waiting',day:today,count:0,message:'Daily analysis will retry when the feeds are available.',updated:new Date().toISOString()};await cachedWrite(recordKey,Date.now()+300000,{data});return data;}
}
export async function ensureDailyForAll(loadState:(id:string)=>Promise<any>,save:(body:any,id:string,generated:boolean)=>Promise<any>){
 const cursorKey=`daily-ticket-cursor:${day()}`,cursor=Number((await cachedRead(cursorKey))?.data||0);
 let start=cursor,people=await db().prepare('SELECT id FROM auth_users WHERE active=1 AND deleted_at IS NULL ORDER BY created LIMIT 20 OFFSET ?').bind(start).all();
 if(!people.results.length&&start){start=0;people=await db().prepare('SELECT id FROM auth_users WHERE active=1 AND deleted_at IS NULL ORDER BY created LIMIT 20').all();}
 let shared:Promise<any>|undefined;
 const commonState=(id:string)=>shared??=loadState(id);
 for(const person of people.results as any[])await ensureDailyTickets(person.id,commonState,save);
 await cachedWrite(cursorKey,Number.MAX_SAFE_INTEGER,{data:start+people.results.length});
}
