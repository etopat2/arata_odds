import {dateRange} from './domain.mjs';
export function discoveryDays(range,cursor=0,hosted=false,now=new Date()){
 const window=dateRange(range,'Africa/Kampala',now),start=new Date(window.from+'T00:00:00+03:00');
 const count=Math.min(7,Math.round((Date.parse(window.to+'T00:00:00+03:00')-start.getTime())/86400000)+1);
 const dates=Array.from({length:count},(_,i)=>new Date(start.getTime()+i*86400000+3*3600000).toISOString().slice(0,10));
 return hosted?[dates[Math.abs(cursor)%dates.length]]:dates;
}
export function rotatingWindow(items,cursor,limit){if(items.length<=limit)return items;const at=Math.abs(cursor)%items.length;return Array.from({length:limit},(_,i)=>items[(at+i)%items.length]);}
export function forecastBatch(records,cursor,limit){const groups=new Map();for(const r of records){const list=groups.get(r.fixtureId)||[];list.push(r);groups.set(r.fixtureId,list);}for(const list of groups.values())list.sort((a,b)=>Number(!!b.odds)-Number(!!a.odds)||b.probability-a.probability);const balanced=[];for(let round=0;;round++){let added=false;for(const list of groups.values())if(list[round]){balanced.push(list[round]);added=true;}if(!added)break;}return rotatingWindow(balanced,cursor,limit);}
