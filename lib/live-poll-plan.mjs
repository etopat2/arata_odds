import {activeTicketIds,isCurrentLive,sameLiveFixture} from './live.mjs';
export function planMatchChecks(fixtures,tickets,now=Date.now()){
 const ids=activeTicketIds(fixtures,tickets,now),saved=fixtures.filter(f=>ids.has(f.id)),allSaved=new Set(tickets.flatMap(t=>t.legs.map(l=>l.fixtureId)));
 const tracked=f=>ids.has(f.id)||saved.some(s=>sameLiveFixture(s,f));
 const unique=new Map();for(const f of [...fixtures.filter(tracked),...fixtures]){const key=f.externalIds?.livescore?'ls:'+f.externalIds.livescore:f.externalIds?.betpawa?'pawa:'+f.externalIds.betpawa:f.id;if(!unique.has(key))unique.set(key,f);}
 const rows=[...unique.values()],active=rows.filter(f=>f.status!=='finished'&&(isCurrentLive(f,now)||tracked(f)&&Date.parse(f.kickoff)<=now+15*60000&&now-Date.parse(f.kickoff)<3*3600000));
 const recovery=rows.filter(f=>f.status!=='finished'&&['live','awaiting-result','scheduled'].includes(f.status)&&Date.parse(f.kickoff)<now-2*3600000&&now-Date.parse(f.kickoff)<3*86400000&&(!f.resultCheckedAt||now-Date.parse(f.resultCheckedAt)>(tracked(f)?120000:600000))&&!active.includes(f));
 const finalDetails=rows.filter(f=>allSaved.has(f.id)&&f.status==='finished'&&!f.detailsCheckedAt&&!(f.detailsCoverage==='available'&&f.goalScorers?.length===(f.score?.home||0)+(f.score?.away||0)));
 return {active:active.sort((a,b)=>Number(tracked(b))-Number(tracked(a))),priority:active.filter(tracked),recovery:recovery.sort((a,b)=>Number(tracked(b))-Number(tracked(a))),finalDetails};
}
export function rotatingBatch(rows,cursor,limit){if(!rows.length)return [];const start=cursor%rows.length;return [...rows.slice(start),...rows.slice(0,start)].slice(0,limit);}
