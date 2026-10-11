import {isHostedRequest} from './background.mjs';
import {parseHistoricalCsv} from './arata-model.mjs';
import {fetchCached,requestCache} from './providers';
import {ESPN_LEAGUES,recentResultMonths,parseVerifiedEspnResults} from './recent-results.mjs';
import {verifiedFinalAcrossSources} from './result-confirmation.mjs';

const codes:Record<string,string>={epl:'E0',bundesliga:'D1','la-liga':'SP1','serie-a':'I1','ligue-1':'F1'};

export async function publishedFinals(fixtures:any[],now=Date.now()){
 const pending=fixtures.filter(f=>ESPN_LEAGUES[f.leagueId]&&f.status!=='finished'&&Date.parse(f.kickoff)<now-3*3600000&&now-Date.parse(f.kickoff)<30*86400000);
 const leagues=[...new Set(pending.map(f=>f.leagueId))];if(!leagues.length)return {fixtures:[],statuses:[]};
 const season=new Date(now).getUTCFullYear()-(new Date(now).getUTCMonth()<6?1:0),memo=requestCache(),updates:any[]=[],statuses:any[]=[];
 await Promise.all(leagues.map(async league=>{
  const published:any[]=[],scoreboard:any[]=[];
  if(codes[league]){
   const url=`https://www.football-data.co.uk/mmz4281/${String(season).slice(-2)}${String(season+1).slice(-2)}/${codes[league]}.csv`;
   try{const response:any=await fetchCached(url,600000,memo,{text:true,headers:{Accept:'text/csv'},maxStaleMs:3600000,retries:1,timeoutMs:isHostedRequest()?4000:12000});published.push(...parseHistoricalCsv(response.data,league,url,now));statuses.push({name:`Football-Data results · ${league}`,status:response.stale?'cached':'connected',count:published.length,captured:response.captured});}
   catch(e){statuses.push({name:`Football-Data results · ${league}`,status:'unavailable',message:(e as Error).message});}
  }
  await Promise.all(recentResultMonths(now).map(async(month,i)=>{
   const url=`https://site.api.espn.com/apis/site/v2/sports/soccer/${ESPN_LEAGUES[league]}/scoreboard?dates=${month}&limit=1000`;
   try{const response:any=await fetchCached(url,i===0?120000:1800000,memo,{maxStaleMs:2*86400000,retries:1,timeoutMs:isHostedRequest()?4000:12000});const rows=parseVerifiedEspnResults(response.data,league,response.captured);scoreboard.push(...rows);statuses.push({name:`ESPN FT results · ${league} · ${month}`,status:response.stale?'cached':'connected',count:rows.length,captured:response.captured});}
   catch(e){statuses.push({name:`ESPN FT results · ${league} · ${month}`,status:'unavailable',message:(e as Error).message});}
  }));
  for(const fixture of pending.filter(f=>f.leagueId===league)){
   const {result,conflict}=verifiedFinalAcrossSources(fixture,scoreboard,published,now);
   if(conflict){statuses.push({name:`Result conflict · ${fixture.id}`,status:'partial',message:'Published final scores disagree; settlement withheld.'});continue;}
   if(result)updates.push(result);
  }
 }));
 return {fixtures:updates,statuses};
}
