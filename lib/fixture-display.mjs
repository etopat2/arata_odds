import {teamKey} from './domain.mjs';
// Retain all stored identities for saved tickets, while showing one real event per source-alias group.
export function displayFixtures(fixtures){
 const groups=new Map();
 const score=f=>(f.marketModels?.length||0)*3+(f.quotes||[]).filter(q=>!q.stale).length+(f.arataModel?.available?2:0);
 const league=f=>teamKey(f.league||f.leagueId||'');
 for(const f of fixtures){
  if(f.duplicateOf)continue;
  const key=[teamKey(f.home),teamKey(f.away),f.kickoff.slice(0,10)].join('|'),group=groups.get(key)||[];
  const prior=group.find(g=>{
   const a=league(f),b=league(g);
   return Math.abs(Date.parse(g.kickoff)-Date.parse(f.kickoff))<=900000&&(!a||!b||a.includes(b)||b.includes(a));
  });
  if(!prior)group.push(f);
  else if(score(f)>score(prior)||score(f)===score(prior)&&String(f.oddsCaptured||'')>String(prior.oddsCaptured||''))group[group.indexOf(prior)]=f;
  groups.set(key,group);
 }
 return [...groups.values()].flat().sort((a,b)=>a.kickoff.localeCompare(b.kickoff));
}
