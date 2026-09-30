import {isHostedRequest} from './background.mjs';
import {parseHistoricalCsv} from './arata-model.mjs';
import {fetchCached,requestCache} from './providers';
import {publishedFinalFor} from './result-confirmation.mjs';

const codes:Record<string,string>={epl:'E0',bundesliga:'D1','la-liga':'SP1','serie-a':'I1','ligue-1':'F1'};
export async function publishedFinals(fixtures:any[],now=Date.now()){
 const pending=fixtures.filter(f=>codes[f.leagueId]&&f.status!=='finished'&&Date.parse(f.kickoff)<now-3*3600000&&now-Date.parse(f.kickoff)<3*86400000);
 const leagues=[...new Set(pending.map(f=>f.leagueId))];if(!leagues.length)return {fixtures:[],statuses:[]};
 const season=new Date(now).getUTCFullYear()-(new Date(now).getUTCMonth()<6?1:0),memo=requestCache(),updates:any[]=[],statuses:any[]=[];
 await Promise.all(leagues.map(async league=>{const url=`https://www.football-data.co.uk/mmz4281/${String(season).slice(-2)}${String(season+1).slice(-2)}/${codes[league]}.csv`;try{const response:any=await fetchCached(url,900000,memo,{text:true,headers:{Accept:'text/csv'},maxStaleMs:3600000,retries:1,timeoutMs:isHostedRequest()?4000:12000});const results=parseHistoricalCsv(response.data,league,url,now);for(const f of pending.filter(f=>f.leagueId===league)){const confirmed=publishedFinalFor(f,results,now);if(confirmed)updates.push(confirmed);}statuses.push({name:`Football-Data results · ${league}`,status:response.stale?'cached':'connected',count:updates.length,captured:response.captured});}catch(e){statuses.push({name:`Football-Data results · ${league}`,status:'unavailable',message:(e as Error).message});}}));
 return {fixtures:updates,statuses};
}
