import test from 'node:test';
import assert from 'node:assert/strict';
import {leagueCombinations,filterLeagues,leagueOptions} from '../lib/league-tickets.mjs';
const now=Date.now();
const pick=(id,league,probability=.8,odds=1.4)=>({id,fixtureId:id,league,home:id+' home',away:id+' away',market:'1X2',period:'FT',selection:'home',line:null,outcome:'pending',kickoff:new Date(now+3600000).toISOString(),probability,odds,edge:probability-1/odds,confidence:'high',bookmaker:'Actual feed',oddsCaptured:new Date(now).toISOString()});
const quote=p=>({...p,probability:null,captured:new Date(now).toISOString()});
test('league selection distinguishes different countries with the same league name',()=>{const rows=[{league:'Premier League',leagueId:'epl'},{league:'Premier League',leagueId:'web:uganda:premier league'}];assert.equal(filterLeagues(rows,['epl']).length,1);assert.equal(leagueOptions(rows).length,2);});
test('single and multiple league choices scope fixture lists and suggested tickets',()=>{
 const picks=[pick('a','A'),pick('b','A'),pick('c','B'),pick('d','C')],quotes=picks.map(quote);
 assert.equal(filterLeagues(picks,['a']).length,2);
 assert.equal(leagueOptions(picks).find(o=>o.id==='a').count,2);
 assert.equal(leagueCombinations(picks,quotes,{leagues:['a'],mix:true,now}).length,0);
 const mixes=leagueCombinations(picks,quotes,{leagues:['a','b'],mix:true,now});
 assert.ok(mixes.length);assert.ok(mixes.every(t=>new Set(t.legs.map(l=>l.league)).size===t.legs.length && t.legs.every(l=>['A','B'].includes(l.league))));
});
test('mixer excludes unavailable, stale, live and unmodelled prices',()=>{
 const a=pick('a','A'),b=pick('b','B');
 assert.equal(leagueCombinations([a,b],[quote(a)],{now}).length,0);
 assert.equal(leagueCombinations([a,b],[quote(a),{...quote(b),captured:new Date(now-121000).toISOString()}],{now}).length,0);
 assert.equal(leagueCombinations([a,{...b,inPlay:true}],[quote(a),quote(b)],{now}).length,0);
 assert.equal(leagueCombinations([a,{...b,probability:null}],[quote(a),quote(b)],{now}).length,0);
 assert.equal(leagueCombinations([a,b],[quote(a),{...quote(b),odds:1.6}],{now}).length,0);
});
test('chance and value priorities expose the tradeoff and avoid shared teams',()=>{
 const a=pick('a','A',.9,1.2),b=pick('b','B',.85,1.3),c=pick('c','C',.7,2),picks=[a,b,c],quotes=picks.map(quote);
 const chance=leagueCombinations(picks,quotes,{mix:true,priority:'chance',now}),value=leagueCombinations(picks,quotes,{mix:true,priority:'value',now});
 assert.ok(chance[0].probability>value[0].probability);assert.ok(value[0].expectedReturn>chance[0].expectedReturn);
 const same={...b,home:a.home};assert.equal(leagueCombinations([a,same],[quote(a),quote(same)],{now}).length,0);
});
