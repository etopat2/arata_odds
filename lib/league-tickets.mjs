import {supportedMarket} from './market-outcomes.mjs';
import {ticketTotals} from './live.mjs';
import {marketKey,halfLine} from './markets.mjs';
import {teamKey} from './domain.mjs';

// Persisted prediction snapshots also carry the fixture's display league, including older records.
export const leagueKey = row => String(row.leagueId || row.league || '').trim().toLowerCase();
/** @param {any[]} rows @param {string[]} leagues */
export function filterLeagues(rows, leagues = []) {
  const selected = new Set(leagues);
  return selected.size ? rows.filter(row => selected.has(leagueKey(row))) : rows;
}
export function leagueOptions(fixtures) {
  const options = new Map();
  for (const f of fixtures) {
    const key = leagueKey(f);
    if (!key) continue;
    const option = options.get(key) || {id:key, name:f.league, count:0};
    option.count++; options.set(key, option);
  }
  const labels=new Map();for(const o of options.values())labels.set(o.name,(labels.get(o.name)||0)+1);const countries={epl:'England','la-liga':'Spain',bundesliga:'Germany','serie-a':'Italy','ligue-1':'France',mls:'USA'};for(const o of options.values())if(labels.get(o.name)>1)o.name+=' · '+(countries[o.id]||o.id.split(':')[1]||o.id);
  return [...options.values()].sort((a,b) => a.name.localeCompare(b.name));
}
export const RISK_PROFILES = {
  cautious:{label:'Cautious',minLeg:.75,minTicket:.5,highOnly:true},
  balanced:{label:'Balanced',minLeg:.65,minTicket:.25,highOnly:false},
  extended:{label:'Long ticket',minLeg:.65,minTicket:.05,highOnly:false}
};
const percent = n => (100*n).toFixed(1)+'%';
const quoteKey = p => JSON.stringify([p.fixtureId,marketKey(p),p.bookmaker,p.odds]);
const fresh = (stamp,limit,now) => Number.isFinite(Date.parse(stamp)) && now-Date.parse(stamp)>=0 && now-Date.parse(stamp)<limit;
const sameTeams = (a,b) => [a.home,a.away].some(t=>[b.home,b.away].some(other=>teamKey(t)===teamKey(other)));
const compare = (a,b,priority) => priority==='value' ? b.expectedReturn-a.expectedReturn||b.probability-a.probability : b.probability-a.probability||b.expectedReturn-a.expectedReturn;

export function ticketAdvice(legs) {
  const totals=ticketTotals(legs,1),weakest=[...legs].sort((a,b)=>a.probability-b.probability)[0];
  if(totals.probability==null)return {risk:'Unassessed',lossProbability:null,weakest:null,messages:['This ticket has an unmodelled or live selection. Its win chance cannot be estimated. Check each current quote before saving.']};
  const lossProbability=1-totals.probability,risk=totals.probability>=.5?'Lower relative risk':totals.probability>=.25?'Elevated risk':'High risk';
  const messages=[`Estimated chance all ${legs.length} pick${legs.length===1?' wins':'s win'}: ${percent(totals.probability)}; chance at least one loses: ${percent(lossProbability)}.`];
  if(legs.length>1)messages.push(`The weakest leg is ${weakest.home} vs ${weakest.away} (${percent(weakest.probability)}). Removing it raises the estimated win chance to ${percent(totals.probability/weakest.probability)}, with a smaller payout.`);
  if(legs.length>=5)messages.push('A long accumulator needs every result to win. Fewer legs or singles offer a higher estimated chance of success.');
  messages.push('Positive model value is an estimate, not a proven profit. Recheck prices and team news before deciding.');
  return {risk,lossProbability,weakest:{fixtureId:weakest.fixtureId,probability:weakest.probability},messages};
}

// Exact-length generation; bounded beam search never pads a ticket with unmodelled or weak picks.
/** @param {{leagues?:string[],mix?:boolean,maxLegs?:number,legCount?:number,priority?:string,risk?:string,now?:number}} options */
export function generateTicketPlan(picks,quotes,options={}) {
  const {leagues=[],mix=false,priority='chance',risk='balanced',now=Date.now()}=options;
  const legCount=Number(options.legCount??options.maxLegs??2);
  if(!Number.isInteger(legCount)||legCount<1||legCount>10)throw new Error('Choose exactly 1–10 picks per generated ticket.');
  if(!Object.hasOwn(RISK_PROFILES,risk))throw new Error('Choose a valid ticket risk profile.');
  const rules=options.review?{...RISK_PROFILES[risk],highOnly:false,minTicket:0}:RISK_PROFILES[risk],scoped=filterLeagues(picks,leagues);
  const available=new Set(quotes.filter(q=>q.period==='FT'&&!q.inPlay&&!q.stale&&fresh(q.captured||q.oddsCaptured,q.source==='Owner-entered'?86400000:120000,now)).map(quoteKey));
  const supported=supportedMarket;
  const eligible=scoped.filter(p=>supported(p)&&p.outcome==='pending'&&!p.inPlay&&Date.parse(p.kickoff)>now&&!p.modelStale&&(!p.modelCaptured||fresh(p.modelCaptured,1800000,now))&&
    Number.isFinite(p.probability)&&p.probability>=rules.minLeg&&p.probability<1&&Number.isFinite(p.odds)&&p.odds>1&&p.odds<=1000&&
    Number.isFinite(p.edge)&&p.edge>0&&p.probability*p.odds>1&&['medium','high'].includes(p.confidence)&&(!rules.highOnly||p.confidence==='high')&&
    fresh(p.oddsCaptured,p.oddsSource==='Owner-entered'?86400000:120000,now)&&available.has(quoteKey(p)));
  const ranked=[...eligible].sort((a,b)=>priority==='value'?(b.probability*b.odds-a.probability*a.odds)||b.probability-a.probability:b.probability-a.probability||b.edge-a.edge);
  // Keep at most three alternative markets per fixture and round-robin leagues for coverage.
  const buckets=new Map(),counts=new Map();
  for(const p of ranked){const n=counts.get(p.fixtureId)||0;if(n>=3)continue;counts.set(p.fixtureId,n+1);const k=leagueKey(p);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(p);}
  const candidates=[];while(candidates.length<60&&[...buckets.values()].some(b=>b.length))for(const b of buckets.values())if(b.length&&candidates.length<60)candidates.push(b.shift());
  candidates.sort((a,b)=>b.probability-a.probability||b.edge-a.edge);
  const candidateTeams=new Map(candidates.map(p=>[p.id,[teamKey(p.home),teamKey(p.away)]]));
  const distinctFixtures=new Set(eligible.map(p=>p.fixtureId)).size;
  const report={legCount,risk,rules,eligiblePicks:eligible.length,eligibleMatches:distinctFixtures,candidatePicks:candidates.length,excludedPicks:scoped.length-eligible.length,priority,mix,generatedAt:new Date(now).toISOString(),reason:'',tickets:[]};
  if(distinctFixtures<legCount){report.reason=`Only ${distinctFixtures} matches meet the model, confidence, positive-value and current-price rules; ${legCount} ${legCount===1?'is':'are'} required. Choose fewer picks, a wider date window or more leagues.`;return report;}
  if(mix&&legCount>1&&new Set(eligible.map(leagueKey)).size<2){report.reason='League mixing needs suitable picks from at least two leagues. Include more leagues or turn mixing off.';return report;}
  function search(order){let beam=[{legs:[],last:-1,probability:1,odds:1,expectedReturn:0}];
    for(let depth=0;depth<legCount;depth++){const next=[];
      for(const t of beam)for(let i=t.last+1;i<candidates.length;i++){const p=candidates[i];if(candidates.length-i<legCount-depth)break;
        if(t.legs.some(l=>l.fixtureId===p.fixtureId||candidateTeams.get(l.id).some(t=>candidateTeams.get(p.id).includes(t))))continue;
        if(mix&&legCount>1&&t.legs.filter(l=>leagueKey(l)===leagueKey(p)).length>=Math.ceil(legCount/2))continue;
        const probability=t.probability*p.probability;if(probability<rules.minTicket)continue;
        const odds=t.odds*p.odds;if(!Number.isFinite(odds))continue;
        next.push({legs:[...t.legs,p],last:i,probability,odds,expectedReturn:probability*odds-1});
      }
      next.sort((a,b)=>compare(a,b,order));beam=next.slice(0,400);if(!beam.length)break;
    }
    return beam.filter(t=>t.legs.length===legCount&&t.expectedReturn>0&&(!mix||legCount===1||new Set(t.legs.map(leagueKey)).size>=2));
  }
  const pool=[...search('chance'),...search('value')].sort((a,b)=>compare(a,b,priority));
  const seen=new Set(),tickets=[];
  for(const t of pool){const key=JSON.stringify(t.legs.map(l=>l.fixtureId).sort());if(seen.has(key))continue;seen.add(key);tickets.push({...ticketTotals(t.legs,1),legs:t.legs,advice:ticketAdvice(t.legs)});if(tickets.length===6)break;}
  report.tickets=tickets;
  if(!tickets.length)report.reason=`No ${legCount}-pick ticket meets the ${percent(rules.minTicket)} minimum estimated win chance, shared-team exclusions and league settings. Try fewer picks or a different risk profile. The app will not fill gaps with weaker or unmodelled selections.`;
  return report;
}
// Keep strict qualification separate from review drafts. Never manufacture prices,
// probabilities or fewer legs when a requested risk target cannot be met.
export function buildTicketPlan(picks,quotes,options={}) {
  const requested=options.predictor||'auto',leader=options.recommendation||'betbetter';
  if(!['auto','arata','blend','betbetter'].includes(requested))throw new Error('Choose a supported predictor.');
  const engines=requested==='auto'?[leader,...['arata','blend','betbetter'].filter(p=>p!==leader)]:[requested];
  const plans=engines.map(engine=>({...generateTicketPlan(picks.filter(p=>(p.predictor||'betbetter')===engine),quotes,options),engine}));
  const qualified=plans.find(p=>p.tickets.length);let plan=qualified||plans[0];
  const reviews=qualified?[]:engines.map(engine=>({...generateTicketPlan(picks.filter(p=>(p.predictor||'betbetter')===engine),quotes,{...options,risk:options.risk==='extended'?'extended':'balanced',review:true}),engine})).sort((a,b)=>b.eligibleMatches-a.eligibleMatches);
  const review=reviews.find(p=>p.tickets.length);
  if(!qualified&&review)plan={...plan,engine:review.engine,reviewTickets:review.tickets.map(t=>({...t,reviewOnly:true,advice:{...t.advice,messages:[`Review draft: the requested ${RISK_PROFILES[options.risk||'balanced'].label} qualification target was not met. These picks have at least 65% estimated individual chance, medium or high confidence and positive model edge, but the combined chance may be much lower.`,...t.advice.messages]}})),reviewMatches:review.eligibleMatches};
  return {...plan,reviewTickets:plan.reviewTickets||[],requestedPredictor:requested,engineMessage:requested==='auto'&&plan.engine!==leader?'Auto selected '+plan.engine+' because the preferred predictor could not supply this exact ticket with current prices. This is a coverage choice, not evidence of superior accuracy.':''};
}
export function leagueCombinations(picks,quotes,options={}) {return generateTicketPlan(picks,quotes,options).tickets;}
