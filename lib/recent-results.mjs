import {modelTeam} from './arata-model.mjs';

export const ESPN_LEAGUES={epl:'eng.1',bundesliga:'ger.1','la-liga':'esp.1','serie-a':'ita.1','ligue-1':'fra.1',mls:'usa.1'};

export function recentResultMonths(now=Date.now()){
 const current=new Date(now),previous=new Date(Date.UTC(current.getUTCFullYear(),current.getUTCMonth()-1,1));
 return [current,previous].map(date=>`${date.getUTCFullYear()}${String(date.getUTCMonth()+1).padStart(2,'0')}`);
}

export function parseVerifiedEspnResults(feed,leagueId,captured=new Date().toISOString()){
 const now=Date.parse(captured);
 if(!Array.isArray(feed?.events)||!Number.isFinite(now))throw new Error('Public scoreboard has no valid event list.');
 return feed.events.flatMap(event=>{
  const competition=event.competitions?.[0],status=competition?.status?.type;
  if(event.league?.slug&&event.league.slug!==ESPN_LEAGUES[leagueId])return [];
  if(!status?.completed||status.state!=='post'||status.shortDetail!=='FT')return [];
  const home=competition.competitors?.find(team=>team.homeAway==='home'),away=competition.competitors?.find(team=>team.homeAway==='away');
  const kickoff=Date.parse(competition.date),goalsHome=Number(home?.score?.value??home?.score),goalsAway=Number(away?.score?.value??away?.score);
  if(!home?.team?.displayName||!away?.team?.displayName||!Number.isFinite(kickoff)||kickoff+3*3600000>now||![goalsHome,goalsAway].every(n=>Number.isInteger(n)&&n>=0&&n<=30)||!/^\d+$/.test(String(event.id)))return [];
  return [{home:home.team.displayName,away:away.team.displayName,leagueId,kickoff:new Date(kickoff).toISOString(),availableAt:new Date(kickoff+3*3600000).toISOString(),captured,status:'finished',score:{home:goalsHome,away:goalsAway},source:'ESPN',sourceUrl:`https://www.espn.com/soccer/match/_/gameId/${event.id}`,sourceEventId:String(event.id)}];
 });
}

export function historyIdentity(match){return [match.leagueId,String(match.kickoff).slice(0,10),modelTeam(match.home),modelTeam(match.away)].join('|');}

export function mergeVerifiedHistory(archived,online){const merged=new Map();for(const match of [...archived,...online]){const key=historyIdentity(match),previous=merged.get(key);if(!previous||Date.parse(match.captured||match.availableAt||match.kickoff)>=Date.parse(previous.captured||previous.availableAt||previous.kickoff))merged.set(key,match);}return [...merged.values()];}

export function historyRevision(matches){let hash=2166136261;const records=matches.map(m=>[historyIdentity(m),m.score?.home,m.score?.away,m.availableAt].join(':')).sort();for(const row of records)for(let i=0;i<row.length;i++)hash=Math.imul(hash^row.charCodeAt(i),16777619)>>>0;return `${records.length}:${hash.toString(16)}`;}
