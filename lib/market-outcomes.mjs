// A single regulation-score predicate drives pricing, generation and settlement.
// Refund lines and unsupported periods deliberately have no binary predicate.
export function outcomePredicate(m){
 if(m.period&&m.period!=='FT')return null;
 const type=m.market||'1X2',s=m.selection,l=m.line;
 const half=Number.isFinite(l)&&Math.abs(l%1)===.5;
 const winner=c=>c.home>c.away?'home':c.home<c.away?'away':'draw';
 const yesNo=f=>['yes','no'].includes(s)?c=>s==='yes'?f(c):!f(c):null;
 if(type==='1X2')return ['home','draw','away'].includes(s)?c=>winner(c)===s:null;
 if(type==='BTTS')return yesNo(c=>c.home>0&&c.away>0);
 if(type==='DOUBLE_CHANCE')return ['1X','X2','12'].includes(s)?c=>s.includes(c.home>c.away?'1':c.home<c.away?'2':'X'):null;
 if(['TOTALS','HOME_TOTALS','AWAY_TOTALS'].includes(type)){if(!half||!['over','under'].includes(s))return null;const value=c=>type==='HOME_TOTALS'?c.home:type==='AWAY_TOTALS'?c.away:c.home+c.away;return c=>s==='over'?value(c)>l:value(c)<l;}
 if(type==='HANDICAP')return half&&['home','away'].includes(s)?c=>s==='home'?c.home+l>c.away:c.away+l>c.home:null;
 if(['HOME_CLEAN_SHEET','AWAY_CLEAN_SHEET'].includes(type))return yesNo(c=>type==='HOME_CLEAN_SHEET'?c.away===0:c.home===0);
 if(['HOME_WIN_TO_NIL','AWAY_WIN_TO_NIL'].includes(type))return yesNo(c=>type==='HOME_WIN_TO_NIL'?c.home>0&&c.away===0:c.away>0&&c.home===0);
 if(['ODD_EVEN','HOME_ODD_EVEN','AWAY_ODD_EVEN'].includes(type)){if(!['odd','even'].includes(s))return null;return c=>((type==='HOME_ODD_EVEN'?c.home:type==='AWAY_ODD_EVEN'?c.away:c.home+c.away)%2===1)===(s==='odd');}
 if(type==='RESULT_TOTALS'){const match=String(s).match(/^(home|draw|away)_(over|under)$/);if(!match||!half)return null;return c=>winner(c)===match[1]&&(match[2]==='over'?c.home+c.away>l:c.home+c.away<l);}
 if(type==='RESULT_BTTS'){const match=String(s).match(/^(home|draw|away)_(yes|no)$/);if(!match)return null;return c=>winner(c)===match[1]&&((c.home>0&&c.away>0)===(match[2]==='yes'));}
 return null;
}
export const supportedMarket=m=>outcomePredicate(m)!==null;
export const PAWA_MARKET_TYPES=['3743','3795','5000','3774','4693','5006','5003','3816','3807','4833','4842','4836','1096755','3591790','5051'];

export const MARKET_FILTERS=[['all','All markets'],['1X2','1X2'],['BTTS','BTTS'],['TOTALS','Over / Under'],['HANDICAP','Asian handicap'],['DOUBLE_CHANCE','Double chance'],['TEAM_TOTALS','Team totals'],['CLEAN_SHEET','Clean sheets'],['WIN_TO_NIL','Win to nil'],['PARITY','Odd / Even'],['COMBINED','Result combinations']];
export function matchesMarketFilter(market,filter){if(filter==='all')return true;const groups={TEAM_TOTALS:['HOME_TOTALS','AWAY_TOTALS'],CLEAN_SHEET:['HOME_CLEAN_SHEET','AWAY_CLEAN_SHEET'],WIN_TO_NIL:['HOME_WIN_TO_NIL','AWAY_WIN_TO_NIL'],PARITY:['ODD_EVEN','HOME_ODD_EVEN','AWAY_ODD_EVEN'],COMBINED:['RESULT_TOTALS','RESULT_BTTS']};return groups[filter]?groups[filter].includes(market):market===filter;}

// BetPawa validates a maximum of seven market types per query view.
export function withPawaMarkets(request){return {...request,queries:request.queries.flatMap(query=>Array.from({length:Math.ceil(PAWA_MARKET_TYPES.length/7)},(_,i)=>({...query,view:{...query.view,marketTypes:PAWA_MARKET_TYPES.slice(i*7,(i+1)*7)}})))};}
