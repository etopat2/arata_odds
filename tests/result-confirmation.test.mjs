import test from 'node:test';
import assert from 'node:assert/strict';
import {publishedFinalFor} from '../lib/result-confirmation.mjs';
import {applyLiveUpdates,ticketProgress} from '../lib/live.mjs';

const now=Date.parse('2026-09-30T09:00:00Z');
const fixture={id:'bookmaker',home:'Man United',away:'Arsenal',league:'Premier League',leagueId:'epl',kickoff:'2026-09-29T19:00:00Z',status:'awaiting-result',score:{home:1,away:1},liveCaptured:'2026-09-29T20:00:00Z',externalIds:{betpawa:'123'}};
const result={home:'Manchester United',away:'Arsenal',leagueId:'epl',kickoff:'2026-09-29T12:00:00Z',availableAt:'2026-09-29T23:59:59Z',status:'finished',score:{home:2,away:1},sourceUrl:'https://www.football-data.co.uk/mmz4281/2627/E0.csv'};

test('published league result replaces an old unverified score and settles the saved leg',()=>{const update=publishedFinalFor(fixture,[result],now);assert.equal(update.status,'finished');assert.deepEqual(update.score,{home:2,away:1});assert.equal(update.resultSource,'Football-Data.co.uk');const merged=applyLiveUpdates([fixture],[update]);assert.equal(merged[0].status,'finished');const progress=ticketProgress({legs:[{fixtureId:'bookmaker',market:'1X2',selection:'home',period:'FT'}]},merged)[0];assert.equal(progress.fixtureStatus,'finished');assert.equal(progress.legOutcome,'won');});
test('date-only results never settle before publication or from a different league',()=>{assert.equal(publishedFinalFor(fixture,[result],Date.parse('2026-09-29T21:00:00Z')),null);assert.equal(publishedFinalFor(fixture,[{...result,leagueId:'fa-cup'}],now),null);assert.equal(publishedFinalFor({...fixture,kickoff:'2026-09-27T19:00:00Z'},[result],now),null);assert.equal(publishedFinalFor({...fixture,status:'finished'},[result],now),null);});
test('ambiguous published results do not confirm a score',()=>{assert.equal(publishedFinalFor(fixture,[result,{...result,score:{home:3,away:1}}],now),null);});
