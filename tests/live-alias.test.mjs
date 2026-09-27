import test from 'node:test';
import assert from 'node:assert/strict';
import {applyLiveUpdates} from '../lib/live.mjs';
test('stable LiveScore ID repairs earlier league aliases without deleting referenced records',()=>{
 const base={home:'Example A',away:'Example B',kickoff:'2026-09-26T18:00:00Z',status:'live',quotes:[],externalIds:{livescore:'event-1'}};
 const old={...base,id:'old',liveCaptured:'2026-09-26T18:01:00Z',league:'Country',leagueId:'web:country'},current={...base,id:'current',liveCaptured:'2026-09-26T18:02:00Z',league:'Real League',leagueId:'web:league'};
 const updated=applyLiveUpdates([old,current],[{...current,status:'finished',score:{home:2,away:1},liveClock:'FT',liveCaptured:'2026-09-26T20:00:00Z',resultSource:'LiveScore'}]);
 assert.equal(updated.length,2);assert.equal(updated.find(f=>f.id==='old').duplicateOf,'current');assert.equal(updated.find(f=>f.id==='old').league,'Real League');assert.ok(updated.every(f=>f.status==='finished'&&f.score.home===2));assert.equal(updated.filter(f=>!f.duplicateOf).length,1);
});

test('absent legacy live events still collapse to the newest displayed provider identity',()=>{const f={externalIds:{livescore:'same'},quotes:[]};const out=applyLiveUpdates([{...f,id:'old',liveCaptured:'2026-09-26T18:00:00Z'},{...f,id:'new',liveCaptured:'2026-09-26T19:00:00Z'}],[]);assert.equal(out.length,2);assert.equal(out.find(x=>x.id==='old').duplicateOf,'new');assert.equal(out.filter(x=>!x.duplicateOf).length,1);});
