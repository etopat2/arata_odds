import test from 'node:test';
import assert from 'node:assert/strict';
import {parseVerifiedEspnResults,recentResultMonths,mergeVerifiedHistory,historyRevision} from '../lib/recent-results.mjs';
import {validHistoricalResult} from '../lib/historical-archive.mjs';
import {forecastArata} from '../lib/arata-model.mjs';

const captured='2026-10-11T08:00:00Z';
const event=(id,finished=true)=>({id:String(id),league:{slug:'eng.1'},competitions:[{date:'2026-10-10T16:30:00Z',status:{type:{completed:finished,state:finished?'post':'in',shortDetail:finished?'FT':'90+2'}},competitors:[{homeAway:'home',team:{displayName:'Manchester United'},score:'1'},{homeAway:'away',team:{displayName:'Tottenham Hotspur'},score:'1'}]}]});

test('recent scoreboard accepts only confirmed FT results after a safe finality window',()=>{
 const rows=parseVerifiedEspnResults({events:[event(401878773),event(401878774,false)]},'epl',captured);
 assert.equal(rows.length,1);assert.equal(rows[0].score.home,1);assert.equal(rows[0].score.away,1);
 assert.equal(rows[0].availableAt,'2026-10-10T19:30:00.000Z');assert.ok(validHistoricalResult(rows[0],Date.parse(captured)));
 assert.equal(parseVerifiedEspnResults({events:[event(401878773)]},'epl','2026-10-10T18:00:00Z').length,0);
 assert.deepEqual(recentResultMonths(Date.parse(captured)),['202610','202609']);
});

test('fresh verified online history replaces stale aliases and changes the forecast revision',()=>{
 const old={leagueId:'epl',home:'Man United',away:'Tottenham',kickoff:'2026-10-10T12:00:00Z',availableAt:'2026-10-10T23:59:59Z',captured:'2026-10-10T23:59:59Z',status:'finished',score:{home:0,away:0},source:'Football-Data.co.uk'};
 const fresh=parseVerifiedEspnResults({events:[event(401878773)]},'epl',captured)[0];
 const merged=mergeVerifiedHistory([old],[fresh]);assert.equal(merged.length,1);assert.deepEqual(merged[0].score,{home:1,away:1});assert.notEqual(historyRevision([old]),historyRevision(merged));
 const fixture={home:'Manchester United',away:'Arsenal',leagueId:'epl',kickoff:'2026-10-18T14:00:00Z',quotes:[]};
 const base=Array.from({length:48},(_,i)=>({leagueId:'epl',home:i%2?'Manchester United':'Arsenal',away:i%2?'Chelsea':'Tottenham',kickoff:new Date(Date.parse('2026-10-01T12:00:00Z')-i*86400000).toISOString(),availableAt:new Date(Date.parse('2026-10-01T15:00:00Z')-i*86400000).toISOString(),status:'finished',score:{home:2,away:0},source:'Test'}));
 const before=forecastArata(fixture,[...base,old],{},Date.parse(captured)),after=forecastArata(fixture,[...base,fresh],{},Date.parse(captured));assert.equal(before.available,true);assert.equal(after.available,true);assert.equal(after.evidence.homeForm[0].opponent,'Tottenham Hotspur');assert.notDeepEqual(before.evidence.homeForm[0],after.evidence.homeForm[0]);
});
