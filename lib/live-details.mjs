import {parsePawaEvent} from './web-parsers.mjs';
import {parseLiveScore,matchClock,liveTeamKey} from './live.mjs';
import {teamKey} from './domain.mjs';
const goalTypes={36:'goal',47:'goal',66:'goal',50:'goal',51:'goal',39:'own-goal',70:'own-goal',37:'penalty',57:'penalty',41:'penalty'};
export function goalEvents(data,captured,sourceUrl){
 const groups=data['Incs-s']||data.Incs;if(!groups||typeof groups!=='object')return null;
 const goals=[],seen=new Set();for(const [period,rows] of Object.entries(groups)){if(!Array.isArray(rows)||!['1','2'].includes(period))continue;for(const parent of rows){const incidents=parent.Incs||[parent];for(const inc of incidents){const kind=goalTypes[inc.IT],side=Number(inc.Nm??parent.Nm)===1?'home':Number(inc.Nm??parent.Nm)===2?'away':null,name=inc.Pn||[inc.Fn,inc.Ln].filter(Boolean).join(' ');if(!kind||!side||!name)continue;const minute=Number(inc.Min??parent.Min),added=Number(inc.MinEx??parent.MinEx??0);if(!Number.isInteger(minute)||minute<0||minute>90||!Number.isInteger(added)||added<0||added>30)continue;const key=[period,minute,added,side,name,kind].join('|');if(seen.has(key))continue;seen.add(key);goals.push({id:key,name,team:side,kind,minute,added,time:added?`${minute} + ${added}'`:matchClock(minute),assist:incidents.filter(i=>i.IT===63&&Number(i.Nm)===Number(inc.Nm)).map(i=>i.Pn||[i.Fn,i.Ln].filter(Boolean).join(' ')).filter(Boolean).join(', ')||null,captured,source:'LiveScore',sourceUrl});}}}
 return goals.sort((a,b)=>a.minute-b.minute||a.added-b.added);
}
export function parseLiveScoreboard(data,captured,url,expected){
 if(String(data.Eid)!==String(expected.externalIds?.livescore)||liveTeamKey(data.T1?.[0]?.Nm)!==liveTeamKey(expected.home)||liveTeamKey(data.T2?.[0]?.Nm)!==liveTeamKey(expected.away))throw new Error('Live match identity does not match the tracked fixture.');
 const stamp=String(data.Esd||''),kickoff=data.Est?Number(data.Est):/^\d{14}$/.test(stamp)?Date.parse(`${stamp.slice(0,4)}-${stamp.slice(4,6)}-${stamp.slice(6,8)}T${stamp.slice(8,10)}:${stamp.slice(10,12)}:${stamp.slice(12,14)}Z`)/1000:Date.parse(expected.kickoff)/1000;
 if(!Number.isFinite(kickoff)||Math.abs(kickoff*1000-Date.parse(expected.kickoff))>15*60000)throw new Error('Live match kickoff does not match the tracked fixture.');
 const fixture=parseLiveScore({Sctns:[{Ts:{...(data.Stg||{}),Evs:[{...data,Est:kickoff}]}}]},captured,url)[0];if(!fixture)throw new Error('No verified live score.');
 const goals=goalEvents(data,captured,url);return {...fixture,id:expected.id,league:expected.league,leagueId:expected.leagueId,...(goals!==null?{goalScorers:goals,eventsCaptured:captured,eventsSource:'LiveScore',eventsScore:fixture.score}:{}),detailsCoverage:goals===null?'unavailable':'available'};
}

export function parsePawaTracked(e,captured,url,stale=false){
 const f=parsePawaEvent(e,captured,url);if(!f)return null;const active=!!e.additionalInfo?.live,display=e.results?.display,period=display?.currentPeriod?.slug||e.scoreboard?.currentPeriod?.slug||'',minute=display?.minute??e.scoreboard?.display?.minute;
 const getScore=(side,slug='FULL_TIME_EXCLUDING_OVERTIME')=>{const p=e.results?.participantPeriodResults?.find(p=>p.participant?.type===side),v=p?.periodResults?.find(r=>r.period?.slug===slug&&r.type==='SCORE')?.result,n=Number(v);return v==null||!Number.isInteger(n)||n<0||n>50?null:n;};
 const h=getScore('HOME'),a=getScore('AWAY'),hh=getScore('HOME','FIRST_HALF'),ha=getScore('AWAY','FIRST_HALF');if(!active&&(h===null||a===null))return null;
 // A missing live flag means the source has stopped reporting play. Scores alone
 // cannot prove FT: preserve the published score and await an explicit final state.
 const final=[e.status,period].some(value=>/^(FT|FINISHED|FULL_TIME|ENDED|COMPLETED|RESULTED|SETTLED)$/.test(String(value||'').toUpperCase()));return {...f,status:final?'finished':active?'live':'awaiting-result',quoteRefresh:true,score:h!=null&&a!=null?{home:h,away:a}:null,halfTimeScore:period!=='FIRST_HALF'&&hh!=null&&ha!=null?{home:hh,away:ha}:undefined,liveClock:final?'FT':active?matchClock(minute,period):'Result unverified',livePeriod:period,liveCaptured:captured,liveSource:'BetPawa Uganda',resultSource:final?'BetPawa Uganda':undefined,liveStale:stale,quotes:active&&!final?f.quotes.map(q=>({...q,inPlay:true,stale})):[]};
}
