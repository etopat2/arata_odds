import {modelTeam} from './arata-model.mjs';

// Football-Data rows have a date but no kickoff time. Confirm only a unique
// home/away/league match close to the scheduled kickoff, after publication.
export function publishedFinalFor(fixture,results,now=Date.now()){
 if(!fixture||fixture.status==='finished'||Date.parse(fixture.kickoff)>now-2*3600000)return null;
 const matches=results.filter(result=>result.status==='finished'&&result.leagueId===fixture.leagueId&&result.score&&Date.parse(result.availableAt)<=now&&modelTeam(result.home)===modelTeam(fixture.home)&&modelTeam(result.away)===modelTeam(fixture.away)&&Math.abs(Date.parse(result.kickoff)-Date.parse(fixture.kickoff))<24*3600000);
 if(matches.length!==1)return null;
 const result=matches[0];return {...fixture,status:'finished',score:result.score,liveClock:'FT',livePeriod:'FULL_TIME',liveStale:false,liveCaptured:new Date(now).toISOString(),liveSource:'Football-Data.co.uk',resultSource:'Football-Data.co.uk',finalConfirmedAt:new Date(now).toISOString(),resultUrl:result.sourceUrl};
}
