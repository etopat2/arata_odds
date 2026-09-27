import {outcomePredicate} from './market-outcomes.mjs';
export function marketKey(m){return `${m.market||'1X2'}|${m.selection}|${m.line??''}|FT`;}
export function halfLine(n){return Number.isFinite(n)&&Math.abs(n%1)===.5;}
export function normalizeModel(p,home,away,teamKey){
 const side=/^(draw|tie|x)$/i.test(p.selection)?'draw':teamKey(p.selection)===teamKey(home)?'home':teamKey(p.selection)===teamKey(away)?'away':null;
 if(['Head to Head','Head to Head 3-Way','Moneyline','Match Winner','1X2'].includes(p.market)&&p.line==null&&side)return {market:'1X2',selection:side,line:null};
 if(p.market==='Both Teams to Score'&&/^(yes|no)$/i.test(p.selection))return {market:'BTTS',selection:p.selection.toLowerCase(),line:null};
 const line=Number(p.line);
 // Half-goal lines have binary settlement. Integer and quarter lines require refund probabilities absent from this model feed.
 if(p.line!=null&&halfLine(line)&&p.market==='Total Goals'&&/^(over|under)$/i.test(p.selection))return {market:'TOTALS',selection:p.selection.toLowerCase(),line};
 if(p.line!=null&&halfLine(line)&&p.market==='Spread'&&['home','away'].includes(side))return {market:'HANDICAP',selection:side,line};
 return null;
}
export function marketLabel(p){const side=p.selection==='home'?p.home:p.selection==='away'?p.away:p.selection==='draw'?'Draw':p.selection;const m=p.market||'1X2',team=m.startsWith('HOME_')?p.home:p.away;
 if(['HOME_TOTALS','AWAY_TOTALS'].includes(m))return `${team} · ${p.selection==='over'?'Over':'Under'} ${p.line} goals`;
 if(m.endsWith('_CLEAN_SHEET'))return `${team} clean sheet · ${p.selection==='yes'?'Yes':'No'}`;
 if(m.endsWith('_WIN_TO_NIL'))return `${team} win to nil · ${p.selection==='yes'?'Yes':'No'}`;
 if(m.endsWith('ODD_EVEN'))return `${m==='ODD_EVEN'?'Total goals':team+' goals'} · ${p.selection==='odd'?'Odd':'Even'}`;
 if(['RESULT_TOTALS','RESULT_BTTS'].includes(m)){const [result,condition]=p.selection.split('_'),winner=result==='home'?p.home:result==='away'?p.away:'Draw';return m==='RESULT_TOTALS'?`${winner} & ${condition} ${p.line} goals`:`${winner} & BTTS ${condition}`;}
 return m==='TOTALS'?`${p.selection==='over'?'Over':'Under'} ${p.line} goals`:m==='BTTS'?`BTTS · ${p.selection==='yes'?'Yes':'No'}`:m==='HANDICAP'?`${side} ${p.line>0?'+':''}${p.line} (Asian handicap)`:m==='DOUBLE_CHANCE'?`Double chance · ${p.selection}`:side;}
export function settleMarket(p,f){if(!f?.score||f.status!=='finished'||!Object.values(f.score).every(n=>Number.isInteger(n)&&n>=0))return 'pending';const predicate=outcomePredicate(p);return predicate?predicate(f.score)?'won':'lost':'pending';}
export function lowerRisk(picks){return picks.filter(p=>p.probability>=.7&&p.confidence==='high'&&p.odds>1&&p.edge>=0&&p.oddsCaptured&&Date.now()-Date.parse(p.oddsCaptured)<900000&&!p.modelStale).sort((a,b)=>b.probability-a.probability||(b.edge||0)-(a.edge||0));}
