import {scoreProbabilities,probabilityFor} from './goal-core.mjs';
import {marketKey} from './markets.mjs';
import {supportedMarket} from './market-outcomes.mjs';

const minute=60000;
const templates=[
 ...['home','draw','away'].map(selection=>({market:'1X2',selection,line:null,period:'FT'})),
 ...['1X','X2','12'].map(selection=>({market:'DOUBLE_CHANCE',selection,line:null,period:'FT'})),
 ...['yes','no'].map(selection=>({market:'BTTS',selection,line:null,period:'FT'})),
 ...[1.5,2.5,3.5].flatMap(line=>['over','under'].map(selection=>({market:'TOTALS',selection,line,period:'FT'}))),
];
const round=(value,places=3)=>Math.round(value*10**places)/10**places;
const latestQuote=(quotes,key,now)=>quotes.filter(q=>marketKey(q)===key&&q.period==='FT'&&!q.inPlay&&!q.stale&&q.odds>1&&Number.isFinite(Date.parse(q.captured))&&now-Date.parse(q.captured)>=0&&now-Date.parse(q.captured)<=2*minute).sort((a,b)=>b.odds-a.odds||b.captured.localeCompare(a.captured))[0];

export function analyzeFixture(fixture,now=Date.now()){
 const model=fixture?.arataModel,preMatch=fixture?.status==='scheduled'&&Date.parse(fixture.kickoff)>now,available=!!model?.available&&Number.isFinite(model.expectedGoals?.home)&&Number.isFinite(model.expectedGoals?.away);
 const base={fixture:{id:fixture.id,home:fixture.home,away:fixture.away,league:fixture.league,leagueId:fixture.leagueId,kickoff:fixture.kickoff,status:fixture.status},generated:new Date(now).toISOString(),model:model||{available:false,reason:'No independent forecast has been generated.'},external:fixture.marketModels||[]};
 if(!available)return {...base,scorelines:[],options:[],tiers:[],decision:'avoid',decisionReason:model?.reason||'Verified historical coverage is insufficient for this match. No score or bet recommendation is made.',coverage:{ready:false,reason:model?.reason||'Model unavailable.'}};
 const cells=scoreProbabilities(model.expectedGoals.home,model.expectedGoals.away),scorelines=cells.filter(c=>c.home<=6&&c.away<=6).sort((a,b)=>b.p-a.p).slice(0,5).map(c=>({home:c.home,away:c.away,probability:round(c.p,4)}));
 const evidence=model.evidence||{},stale=!!evidence.stale||now-Date.parse(model.created)>30*minute||Date.parse(model.created)>=Date.parse(fixture.kickoff),coverage={ready:!stale&&preMatch,historyMatches:evidence.leagueMatches||0,homeMatches:evidence.homeMatches||0,awayMatches:evidence.awayMatches||0,historyThrough:evidence.historyThrough||null,historyStale:!!evidence.stale,learning:evidence.learning?.status||'unknown',lineupStatus:{home:evidence.advanced?.home?.match?.lineup?.status||'unverified',away:evidence.advanced?.away?.match?.lineup?.status||'unverified'},injuryCoverage:{home:evidence.advanced?.home?.coverage||'not comprehensive',away:evidence.advanced?.away?.coverage||'not comprehensive'},sourceNames:evidence.sources||[]};
 const markets=new Map(templates.map(m=>[marketKey(m),m]));for(const q of fixture.quotes||[])if(supportedMarket(q)&&q.period==='FT')markets.set(marketKey(q),{market:q.market,selection:q.selection,line:q.line??null,period:'FT'});
 const modelMarkets=new Map((model.markets||[]).map(m=>[marketKey(m),m]));
 const options=[...markets.values()].map(m=>{const key=marketKey(m),estimate=modelMarkets.get(key),p=m.market==='1X2'?model.probabilities?.[m.selection]:(estimate?.probability??probabilityFor(cells,m));if(!(p>0&&p<1))return null;const quote=latestQuote(fixture.quotes||[],key,now),odds=quote?.odds||null,edge=odds?p-1/odds:null;return {...m,probability:round(p,4),fairOdds:round(1/p,2),minimumValueOdds:p>.05?round(1/(p-.05),2):null,odds,edge:edge==null?null:round(edge,4),bookmaker:quote?.bookmaker||null,oddsCaptured:quote?.captured||null,sourceUrl:quote?.sourceUrl||null,estimateSource:estimate?'calibrated model market':'goal-grid estimate',qualified:!!(coverage.ready&&odds&&edge>=.05)};}).filter(Boolean);
 const used=new Set(),pick=(name,description,range,minimumEdge)=>{const candidates=options.filter(o=>!used.has(marketKey(o))&&o.probability>=range[0]&&o.probability<range[1]).sort((a,b)=>Number(b.qualified)-Number(a.qualified)||Number(b.edge!=null&&b.edge>=minimumEdge)-Number(a.edge!=null&&a.edge>=minimumEdge)||(b.odds?b.probability*b.odds:0)-(a.odds?a.probability*a.odds:0)||Math.abs(a.probability-(range[0]+range[1])/2)-Math.abs(b.probability-(range[0]+range[1])/2));const option=candidates[0]||null;if(option)used.add(marketKey(option));return {name,description,option,actionable:!!(option?.odds&&option.edge>=minimumEdge&&coverage.ready),minimumEdge};};
 const tiers=[pick('Lower risk','Higher estimated hit rate, usually lower price.',[.7,1],.03),pick('Balanced','Moderate probability with room for a better return.',[.53,.78],.05),pick('Higher risk','Longer price; a larger chance of losing.',[.32,.64],.07)];
 const strongest=tiers.find(t=>t.actionable&&t.option?.probability>=.6&&t.option?.edge>=.05),decision=strongest?'consider':'avoid';
 const decisionReason=!preMatch?'This match has started or finished. Pre-match ticket advice is closed.':stale?'Research or model data is stale. Refresh the analysis before considering a pick.':strongest?`Consider only the quoted ${strongest.name.toLowerCase()} option after checking lineups and price again. A model edge is an estimate, not a guarantee.`:'Leave this match off the ticket for now: no current, adequately priced model selection meets the evidence and value checks.';
 return {...base,scorelines,options,tiers,decision,decisionReason,coverage};
}
