import {sameLiveFixture,eligibleQuotes} from './live.mjs';
import {matchFixture} from './web-parsers.mjs';
import {marketKey} from './markets.mjs';
const indexes=new WeakMap();
export function currentPrice(p,quotes){
 if(!p)return p;let index=indexes.get(quotes);if(!index){index=new Map();for(const q of quotes){if(q.inPlay)continue;const key=q.fixtureId+'|'+marketKey(q);if(!index.has(key))index.set(key,[]);index.get(key).push(q);}for(const rows of index.values())rows.sort((a,b)=>b.odds-a.odds);indexes.set(quotes,index);}
 const matches=index.get(p.fixtureId+'|'+marketKey(p))||[],q=matches.find(q=>q.bookmaker===p.bookmaker)||matches[0];
 return q?{...p,snapshotOdds:p.snapshotOdds??p.odds,snapshotOddsCaptured:p.snapshotOddsCaptured||p.oddsCaptured,odds:q.odds,implied:1/q.odds,edge:p.probability-1/q.odds,bookmaker:q.bookmaker,sourceUrl:q.sourceUrl,externalEventId:q.externalEventId,oddsSource:q.source,oddsCaptured:q.captured||q.oddsCaptured}:{...p,odds:null,implied:null,edge:null};
}
export function overlayPrices(fixtures,updates){
 const byId=new Map(fixtures.map(f=>[f.id,f])),providers=new Map();for(const f of fixtures)for(const [provider,id]of Object.entries(f.externalIds||{}))providers.set(provider+':'+id,f);
 for(const update of updates){let prior=byId.get(update.id);if(!prior)for(const [provider,id]of Object.entries(update.externalIds||{})){prior=providers.get(provider+':'+id);if(prior)break;}prior=prior||matchFixture(update,[...byId.values()]);if(prior?.status==='finished')continue;
  const f=prior||update,books=new Set([update.bookmaker,update.externalIds?.betpawa?'betpawa':null,...(update.quotes||[]).map(q=>q.bookmakerId||q.bookmaker)].filter(Boolean));const quotes=[...(f.quotes||[]).filter(q=>!books.has(q.bookmakerId||q.bookmaker)),...(update.quotes||[])];
  byId.set(f.id,{...f,quotes,odds:Object.fromEntries(quotes.filter(q=>q.market==='1X2').map(q=>[q.selection,q.odds])),oddsCaptured:update.oddsCaptured,bookmaker:update.bookmaker,externalIds:{...f.externalIds,...update.externalIds}});
 }
 return [...byId.values()];
}
export function mergePriceState(previous,update){if(!previous)return previous;const fixtures=overlayPrices(previous.fixtures,update.priceFixtures||[]),quotes=eligibleQuotes(fixtures);return {...previous,fixtures,eligibleSelections:quotes,allPicks:(previous.allPicks||[]).map(p=>currentPrice(p,quotes)),picks:(previous.picks||[]).map(p=>currentPrice(p,quotes)),pricesUpdated:update.pricesUpdated};}
export function hydrateDashboard(data){if(!data?.compactQuotes)return data;const index=new Map();for(const q of data.eligibleSelections||[]){if(!index.has(q.fixtureId))index.set(q.fixtureId,[]);index.get(q.fixtureId).push(q);}return {...data,fixtures:data.fixtures.map(f=>({...f,quotes:index.get(f.id)||[]}))};}
