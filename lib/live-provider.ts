import {fetchCached,requestCache} from './providers';
import {dayKey} from './domain.mjs';
import {parseLiveScore,matchClock,trackedFixtureDays,activeTicketIds,isCurrentLive} from './live.mjs';
import {parseLiveScoreboard,parsePawaTracked} from './live-details.mjs';
import {parsePawaEvent,combineWeb} from './web-parsers.mjs';
import {PAWA_MARKET_TYPES,withPawaMarkets} from './market-outcomes.mjs';
import {planMatchChecks,rotatingBatch} from './live-poll-plan.mjs';
const liveBase='https://prod-cdn-mev-api.lsmedia1.com/api/v2';
let detailCursor=0,recoveryCursor=0;
const detailBase='https://prod-cdn-public-api.lsmedia1.com/v1/api/app';
export async function liveIngest(existing:any[]=[],tickets:any[]=[],publish:(fixtures:any[],status:any)=>Promise<void>=async()=>{}){
 const memo=requestCache(),fixtures:any[]=[],statuses:any[]=[],today=dayKey(),midnight=new Date(today+'T00:00:00+03:00'),days=[...new Set([midnight.toISOString().slice(0,10),new Date(midnight.getTime()+86400000).toISOString().slice(0,10),...trackedFixtureDays(existing,tickets)])];
 const trackedIds=activeTicketIds(existing,tickets),tracked=existing.filter(f=>trackedIds.has(f.id));
 async function batch(fs:any[],status:any){fixtures.push(...fs);statuses.push(status);await publish(fs,status);}
 const tasks=days.map(async d=>{const url=liveBase+'/date/soccer/'+d.replace(/-/g,'')+'/0?locale=en';try{const r=await fetchCached(url,10000,memo,{volatile:true,headers:{Referer:'https://www.livescore.com/'},timeoutMs:1500,retries:1,maxStaleMs:15000});await batch(parseLiveScore(r.data,r.captured,url).map((f:any)=>({...f,liveStale:r.stale})),{name:'LiveScore results '+d,status:r.stale?'cached':'connected',captured:r.captured});}catch(e){statuses.push({name:'LiveScore results '+d,status:'unavailable',message:(e as Error).message});}});
 tasks.push((async()=>{const url=liveBase+'/live/soccer/0?locale=en';try{const r=await fetchCached(url,1500,memo,{volatile:true,headers:{Referer:'https://www.livescore.com/'},timeoutMs:1500,retries:1,maxStaleMs:10000});const fs=parseLiveScore(r.data,r.captured,url).map((f:any)=>({...f,liveStale:r.stale}));await batch(fs,{name:'LiveScore',status:r.stale?'cached':'connected',count:fs.length,captured:r.captured,message:'Score stream checks every 2 seconds; published source latency still applies.'});}catch(e){await batch([],{name:'LiveScore',status:'unavailable',message:(e as Error).message});}})());
 tasks.push((async()=>{const q={queries:[{query:{categories:['2'],eventType:'LIVE'},view:{marketTypes:PAWA_MARKET_TYPES},take:100,skip:0}]},url='https://www.betpawa.ug/api/sportsbook/v4/events/lists/by-queries?q='+encodeURIComponent(JSON.stringify(withPawaMarkets(q)));try{const r=await fetchCached(url,2000,memo,{volatile:true,headers:{'X-Pawa-Brand':'betpawa-uganda','X-Pawa-Language':'en'},timeoutMs:1500,retries:1,maxStaleMs:10000});const fs:any[]=[];for(const e of r.data.responses?.flatMap((x:any)=>x.responses)||[]){const f=pawaLive(e,r.captured,url,r.stale);if(f)fs.push(f);}await batch(combineWeb([],fs),{name:'BetPawa live',status:r.stale?'cached':'connected',count:fs.length,captured:r.captured,message:'Live scores and actual in-play prices; up to 100 events.'});}catch(e){await batch([],{name:'BetPawa live',status:'unavailable',message:(e as Error).message});}})());
 // Every saved leg is considered, including aliases. Fair rotation prevents the
 // first ticket or first eight legs from monopolising detail/scorer checks.
 const plan=planMatchChecks(existing,tickets),priority=rotatingBatch(plan.priority,detailCursor,24),others=plan.active.filter((f:any)=>!plan.priority.includes(f)),selected=[...priority,...rotatingBatch(others,detailCursor,24-priority.length)];detailCursor+=plan.priority.length>24?24:Math.max(1,24-priority.length);
 const recovery=rotatingBatch(plan.recovery,recoveryCursor,16);recoveryCursor+=16;
 const finalDetails=plan.finalDetails.slice(0,12);
 const jobs=[...selected.map((f:any)=>({f,kind:'live'})),...recovery.map((f:any)=>({f,kind:'result'})),...finalDetails.map((f:any)=>({f,kind:'final-details'}))];let cursor=0;
 tasks.push(...Array.from({length:8},async()=>{while(cursor<jobs.length){const {f,kind}=jobs[cursor++],checked=new Date().toISOString();
  let supplied=false;
  if(f.externalIds?.livescore){const id=String(f.externalIds.livescore);if(/^\d+$/.test(id)){const url=detailBase+'/scoreboard/soccer/'+id+'?locale=en';try{const r=await fetchCached(url,kind==='live'?2000:600000,memo,{volatile:true,headers:{Referer:'https://www.livescore.com/'},timeoutMs:1500,retries:1,maxStaleMs:kind==='live'?10000:600000});const parsed=parseLiveScoreboard(r.data,r.captured,url,f);await batch([{...parsed,liveStale:r.stale,...(kind==='result'?{resultCheckedAt:checked}:{}),...(kind==='final-details'?{detailsCheckedAt:checked}:{})}],{name:'LiveScore match details',status:r.stale?'cached':'connected',captured:r.captured});supplied=true;}catch{}}}
  if(kind!=='final-details'&&f.externalIds?.betpawa&&!supplied){const id=String(f.externalIds.betpawa);if(/^\d+$/.test(id)){const url='https://www.betpawa.ug/api/sportsbook/v4/events/'+id;try{const r=await fetchCached(url,kind==='live'?2000:600000,memo,{volatile:true,headers:{'X-Pawa-Brand':'betpawa-uganda','X-Pawa-Language':'en'},timeoutMs:1500,retries:1,maxStaleMs:kind==='live'?10000:600000});const parsed=parsePawaTracked(r.data,r.captured,url,r.stale);if(parsed){await batch([{...parsed,id:f.id,...(kind==='result'?{resultCheckedAt:checked}:{})}],{name:'BetPawa tracked match',status:r.stale?'cached':'connected',captured:r.captured});supplied=true;}}catch{}}}
  if(kind==='result'&&!supplied)await batch([{...f,status:'awaiting-result',liveClock:'Awaiting FT',liveStale:true,resultCheckedAt:checked}],{name:'Result confirmation',status:'partial',message:'Final score not published in the available sources.'});
  if(kind==='final-details'&&!supplied)await batch([{...f,detailsCheckedAt:checked,detailsCoverage:'unavailable'}],{name:'Saved match events',status:'partial',message:'Scorer coverage is unavailable for some completed matches.'});
 }}));
 await Promise.allSettled(tasks);return {fixtures,statuses};
}
function pawaLive(e:any,captured:string,url:string,stale:boolean){return e.additionalInfo?.live?parsePawaTracked(e,captured,url,stale):null;}
