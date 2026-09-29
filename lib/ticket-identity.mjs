import {modelTeam} from './arata-model.mjs';
import {marketKey} from './markets.mjs';
// Research tickets identify a combination, not a stake or an odds snapshot.
// Team aliases and the Kampala match date also cover duplicate provider IDs.
export function ticketIdentity(legs){return JSON.stringify(legs.map(l=>[
 modelTeam(l.home||l.fixtureId),modelTeam(l.away||''),
 Number.isFinite(Date.parse(l.kickoff))?new Date(Date.parse(l.kickoff)+3*3600000).toISOString().slice(0,10):l.fixtureId,
 marketKey(l),l.period||'FT'
]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));}
const fixtureIdentity=legs=>JSON.stringify(legs.map(l=>[l.fixtureId,marketKey(l),l.period||'FT']).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
export function matchingTicket(tickets,legs){if(!legs.length)return null;const key=ticketIdentity(legs),fixtureKey=fixtureIdentity(legs);return tickets.find(t=>ticketIdentity(t.legs||[])===key||fixtureIdentity(t.legs||[])===fixtureKey)||null;}
export function pendingKickoff(leg){if(leg.legOutcome&&leg.legOutcome!=='pending'||!Number.isFinite(Date.parse(leg.kickoff)))return null;return new Date(leg.kickoff).toLocaleString('en-GB',{timeZone:'Africa/Kampala',weekday:'short',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})+' EAT';}
