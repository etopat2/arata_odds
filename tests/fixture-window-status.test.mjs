import test from 'node:test';
import assert from 'node:assert/strict';
import {dateRange,dayKey} from '../lib/domain.mjs';
import {filterFixtureWindow,normalizeMatchStatus} from '../lib/live.mjs';

test('upcoming hides past unconfirmed fixtures while today keeps them honestly labelled',()=>{
 const now=Date.parse('2026-09-30T06:00:00Z'),window=dateRange('upcoming','Africa/Kampala',new Date(now));
 const old={id:'old',home:'A',away:'B',kickoff:'2026-09-29T21:00:00Z',status:'scheduled'},future={...old,id:'future',kickoff:'2026-09-30T12:00:00Z'},finished={...old,id:'finished',status:'finished',score:{home:1,away:0}};
 assert.deepEqual(filterFixtureWindow([old,future,finished],'upcoming',window,dayKey,now).map(f=>f.id),['future']);
 assert.equal(normalizeMatchStatus(old,now).status,'awaiting-result');
 assert.equal(normalizeMatchStatus(future,now).status,'scheduled');
 assert.equal(normalizeMatchStatus(finished,now).status,'finished');
 const today=dateRange('today','Africa/Kampala',new Date(now));assert.deepEqual(filterFixtureWindow([old,future,finished],'today',today,dayKey,now).map(f=>f.id),['old','future','finished']);
});
