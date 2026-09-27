import {outcomePredicate} from './market-outcomes.mjs';
export const DEFAULT_WEIGHTS=Object.freeze({venue:.35,form:.06,h2h:.05,attack:1,defence:1,homeScale:1,awayScale:1});
export const WEIGHT_BOUNDS={venue:[0,.8],form:[0,.2],h2h:[0,.15],attack:[.4,1.5],defence:[.4,1.5],homeScale:[.7,1.3],awayScale:[.7,1.3]};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function validFeatures(f){return f?.schema===1&&['baseH','baseA','base','homeAttack','homeVenueAttack','homeDefence','homeVenueDefence','awayAttack','awayVenueAttack','awayDefence','awayVenueDefence'].every(k=>Number.isFinite(f[k])&&f[k]>0)&&Number.isFinite(f.formDifference)&&Number.isInteger(f.h2hCount)&&f.h2hCount>=0&&(f.h2hCount<3||[f.h2hHome,f.h2hAway].every(v=>Number.isFinite(v)&&v>=0))&&['homeAdjustment','awayAdjustment'].every(k=>f[k]==null||Number.isFinite(f[k])&&f[k]>=.7&&f[k]<=1.4);}
export function coreGoals(f,weights=DEFAULT_WEIGHTS){
 const w={...DEFAULT_WEIGHTS,...weights},mix=(overall,venue)=>(1-w.venue)*overall+w.venue*venue;
 let home=f.baseH*Math.pow(mix(f.homeAttack,f.homeVenueAttack)/f.base,w.attack)*Math.pow(mix(f.awayDefence,f.awayVenueDefence)/f.base,w.defence)*Math.exp(clamp(f.formDifference,-.8,.8)*w.form)*w.homeScale;
 let away=f.baseA*Math.pow(mix(f.awayAttack,f.awayVenueAttack)/f.base,w.attack)*Math.pow(mix(f.homeDefence,f.homeVenueDefence)/f.base,w.defence)*Math.exp(clamp(-f.formDifference,-.8,.8)*w.form)*w.awayScale;
 if(f.h2hCount>=3){home=(1-w.h2h)*home+w.h2h*(f.h2hHome+(f.h2hPriorWeight||0)*home);away=(1-w.h2h)*away+w.h2h*(f.h2hAway+(f.h2hPriorWeight||0)*away);}
 return {home:clamp(clamp(home,.25,4.5)*(f.homeAdjustment||1),.25,4.5),away:clamp(clamp(away,.25,4.5)*(f.awayAdjustment||1),.25,4.5)};
}
function poisson(lambda){const p=[Math.exp(-lambda)];for(let n=1;n<=18;n++)p.push(p[n-1]*lambda/n);return p;}
export function scoreProbabilities(homeGoals,awayGoals){const h=poisson(homeGoals),a=poisson(awayGoals),cells=[];let mass=0;for(let i=0;i<h.length;i++)for(let j=0;j<a.length;j++){const p=h[i]*a[j];mass+=p;cells.push({home:i,away:j,p});}return cells.map(c=>({...c,p:c.p/mass}));}
export function probabilityFor(cells,market){const predicate=outcomePredicate(market);return predicate?cells.reduce((n,c)=>n+(predicate(c)?c.p:0),0):null;}
