"use client";
import {useState} from 'react';
import {ChevronDown} from 'lucide-react';
import {marketLabel} from '@/lib/markets.mjs';
import {MARKET_FILTERS,matchesMarketFilter} from '@/lib/market-outcomes.mjs';
import MatchStatus from './MatchStatus';

function AvailableMatchCard({fixture,selections,legs,onAdd}:{fixture:any;selections:any[];legs:any[];onAdd:(pick:any)=>void}){
 const [market,setMarket]=useState('all');
 const quotes=selections.filter(q=>q.fixtureId===fixture.id);
 const resultQuotes=quotes.filter(q=>q.market==='1X2');
 const otherQuotes=quotes.filter(q=>q.market!=='1X2');
 const filters=MARKET_FILTERS.filter(([id])=>id!=='1X2');
 const counts=Object.fromEntries(filters.map(([id])=>[id,otherQuotes.filter(q=>matchesMarketFilter(q.market,id)).length]));
 const activeMarket=market==='all'||counts[market]?market:'all';
 const shown=otherQuotes.filter(q=>matchesMarketFilter(q.market,activeMarket));
 const selectedLeg=legs.find(l=>l.fixtureId===fixture.id);
 const choices=(items:any[])=><div className="available-prices">{items.map(q=>{const selected=legs.some(l=>l.id===q.id),other=!!selectedLeg&&!selected;return <button type="button" key={q.id} className={'quote-choice '+(selected?'selected':'')} disabled={other} onClick={()=>onAdd(q)}><span>{marketLabel(q)}</span><strong>{q.odds.toFixed(2)} {selected?'✓':'+'}</strong><small>{q.bookmaker}{q.inPlay?' · In play':''}</small></button>;})}</div>;
 return <article className="fixture-card available-match-card">
  <div className="fixture-meta"><span>{fixture.league}</span><span>{new Date(fixture.kickoff).toLocaleString('en-GB',{timeZone:'Africa/Kampala',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})} EAT</span></div>
  <h3>{fixture.home} <span className="muted">vs</span> {fixture.away}</h3>
  <MatchStatus fixture={fixture}/>
  <div className="match-result-market"><div className="match-market-heading"><strong>Match result · 1X2</strong><small>{resultQuotes.length} available</small></div>{resultQuotes.length?choices(resultQuotes):<p className="small muted">1X2 prices are currently unavailable for this match.</p>}</div>
  <details className="match-market-panel">
   <summary aria-label={`Other markets for ${fixture.home} versus ${fixture.away}; ${otherQuotes.length} available`}>
    <span className="match-market-title">Other markets &amp; picks <small>{otherQuotes.length} available</small></span>
    {selectedLeg&&(selectedLeg.market||'1X2')!=='1X2'&&<span className="match-market-selected">Selected · {marketLabel(selectedLeg)}</span>}
    <ChevronDown className="match-market-chevron" size={18} aria-hidden="true"/>
   </summary>
   <div className="match-market-content">
    <div className="filter-row match-market-filters" role="group" aria-label={`Market filters for ${fixture.home} versus ${fixture.away}`}>
     {filters.map(([id,label])=><button type="button" key={id} className={'filter-chip '+(activeMarket===id?'selected':'')} aria-pressed={activeMarket===id} disabled={!counts[id]} onClick={()=>setMarket(id)}>{id==='all'?'All other':label} <span className="market-filter-count">{counts[id]}</span></button>)}
    </div>
    {shown.length?choices(shown):<p className="small muted">No other markets are currently available for this match.</p>}
    {selectedLeg&&<p className="small muted market-selection-note">One pick per match. Remove the current leg to choose another market.</p>}
   </div>
  </details>
 </article>;
}

export default function AvailableMatches({fixtures,selections,legs,onAdd}:{fixtures:any[];selections:any[];legs:any[];onAdd:(p:any)=>void}){
 const [mode,setMode]=useState('all'),[limit,setLimit]=useState(20);
 const availableIds=new Set(selections.map(q=>q.fixtureId));
 const visible=fixtures.filter(f=>availableIds.has(f.id)&&(f.status==='live'||f.status==='scheduled'&&Date.parse(f.kickoff)>Date.now())&&(mode!=='live'||f.status==='live'));
 return <><h2 className="subheading">Choose from available matches</h2><p className="small muted">Real published bookmaker quotes, including in-play prices when available. A model estimate is optional; live quotes never inherit a pre-match prediction.</p>
  <div className="filter-row">{[['all','Upcoming & live'],['live','Live matches']].map(([id,label])=><button type="button" key={id} className={'filter-chip '+(mode===id?'selected':'')} aria-pressed={mode===id} onClick={()=>{setMode(id);setLimit(20);}}>{label}</button>)}</div>
  {!visible.length&&<p className="empty compact">No matches with current bookmaker quotes match this period and search.</p>}
  {visible.slice(0,limit).map(f=><AvailableMatchCard key={f.id} fixture={f} selections={selections} legs={legs} onAdd={onAdd}/>)}
  {visible.length>limit&&<button type="button" className="secondary" onClick={()=>setLimit(limit+20)}>Show more available matches</button>}
 </>;
}
