import {teamKey} from './domain.mjs';

export const historicalKey=match=>[match.leagueId,String(match.kickoff).slice(0,10),teamKey(match.home),teamKey(match.away)].join('|');
export function validHistoricalResult(match,now=Date.now()){
 const score=match?.score,available=Date.parse(match?.availableAt||''),kickoff=Date.parse(match?.kickoff||'');
 return ['epl','la-liga','serie-a','ligue-1','bundesliga','mls'].includes(match?.leagueId)
  &&match.status==='finished'&&typeof match.home==='string'&&match.home.length>1&&match.home.length<120
  &&typeof match.away==='string'&&match.away.length>1&&match.away.length<120
  &&Number.isInteger(score?.home)&&Number.isInteger(score?.away)
  &&score.home>=0&&score.home<=30&&score.away>=0&&score.away<=30
  &&Number.isFinite(kickoff)&&Number.isFinite(available)&&available<now&&kickoff<=available
  &&match.source==='Football-Data.co.uk'
  &&/^https:\/\/(www\.)?football-data\.co\.uk\//.test(String(match.sourceUrl||''));
}
