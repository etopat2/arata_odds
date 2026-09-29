"use client";
import {readApiJson} from '@/lib/api-client.mjs';

import {MARKET_FILTERS,matchesMarketFilter} from '@/lib/market-outcomes.mjs';

import {useState,useEffect,useRef,useCallback} from 'react';

import {Plus,Check,Trash2,ArrowUpRight,Layers,ChartNoAxesCombined,ExternalLink} from 'lucide-react';

import {Input} from '@/components/ui/input';

import {Select,SelectTrigger,SelectContent,SelectItem,SelectValue} from '@/components/ui/select';

import {Table,TableHeader,TableHead,TableBody,TableRow,TableCell} from '@/components/ui/table';



import type {Prediction,Ticket} from '@/lib/types';

import {marketLabel,lowerRisk} from '@/lib/markets.mjs';

import MatchStatus from './MatchStatus';
import {ticketTotals,searchMatches} from '@/lib/live.mjs';
import GeneratedTickets,{RiskAdvice} from './GeneratedTickets';
import {ticketAdvice} from '@/lib/league-tickets.mjs';

const pct=(n:number|null|undefined)=>n==null?'—':(100*n).toFixed(1)+'%';

export const selectionLabel=(p:Prediction)=>marketLabel(p);

export function PickList({picks,legs,onAdd,onFixtures,onSaved}:{picks:Prediction[];legs:Prediction[];onAdd:(p:Prediction)=>void;onFixtures:()=>void;onSaved:()=>void}){

 const [filter,setFilter]=useState('value'),[market,setMarket]=useState('all');

 const risk=lowerRisk(picks);const visible=picks.filter(p=>matchesMarketFilter(p.market||'1X2',market)&&(filter==='all'||filter==='value'&&(p.edge??0)>.05||filter==='high'&&p.confidence==='high'&&(p.edge??0)>.05||filter==='risk'&&risk.some((x:any)=>x.id===p.id))).sort((a,b)=>filter==='risk'?b.probability-a.probability:(b.edge??-1)-(a.edge??-1));

 return <><div className="filter-row">{[['value','Value picks'],['high','High confidence'],['risk','Higher win chance'],['all','All model picks']].map(([id,label])=><button key={id} className={filter===id?'filter-chip selected':'filter-chip'} onClick={()=>setFilter(id)}>{label}</button>)}</div><div className="filter-row">{MARKET_FILTERS.map(([id,label])=><button key={id} className={market===id?'filter-chip selected':'filter-chip'} onClick={()=>setMarket(id)}>{label}</button>)}</div>{filter==='risk'&&<p className="notice">At least 70% published model probability, high confidence, non-negative edge and a price captured within 15 minutes. This ranks estimated win chance; it cannot identify a risk-free bet.</p>}<p className="small muted">Half-goal totals and Asian handicaps are supported. Integer and quarter lines are excluded because this feed does not publish refund probabilities.</p>{!visible.length?<div className="empty"><ChartNoAxesCombined size={28}/><h3>{picks.length?'No priced value picks yet':'No model picks in this window'}</h3><p>{picks.length?'Enter your bookmaker’s current odds on the Fixtures view. Picks with an edge above 5 percentage points will appear here.':'Try the upcoming schedule. A fixture needs a supported model estimate to become a pick.'}</p><button className="secondary" onClick={onFixtures}>Check fixtures <ArrowUpRight size={16}/></button></div>:visible.map(p=>{const selected=legs.some(l=>l.id===p.id),fresh=p.oddsCaptured&&Date.now()-Date.parse(p.oddsCaptured)<((p as any).oddsSource==='Owner-entered'?86400000:900000);return <article className="fixture-card pick-card" key={p.id}><div className="fixture-meta"><span>{p.league} · {new Date(p.kickoff).toLocaleString('en-GB',{timeZone:'Africa/Kampala',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})} EAT</span><span className={p.confidence==='high'?'badge value':'badge'}>{p.confidence==='high'?'★ High confidence':p.confidence+' confidence'}</span></div><h3>{p.home}<span className="muted"> vs </span>{p.away}</h3><div className="pick-heading"><span>{p.market||'1X2'} · <strong>{selectionLabel(p)}</strong></span><span className={(p.edge??0)>.05?'edge-value':'muted'}>{p.edge!=null?(p.edge>=0?'+':'')+(p.edge*100).toFixed(1)+' pp edge':'Price needed'}</span></div><div className="comparison"><div><span>Model probability</span><b className="mint">{pct(p.probability)}</b></div><div className="prob-bar"><i style={{width:p.probability*100+'%'}}/></div><div><span>Market implied</span><b>{pct(p.implied)}</b></div><div className="prob-bar market"><i style={{width:(p.implied||0)*100+'%'}}/></div></div><div className="card-actions"><span>Market odds <b className="odds-number">{p.odds?.toFixed(2)||'—'}</b> · Fair {p.fairOdds.toFixed(2)}</span><button className={selected?'secondary':'primary'} disabled={!p.odds||!fresh} onClick={()=>onAdd(p)}>{selected?<Check size={15}/>:<Plus size={15}/>} {selected?'Added':'Add to ticket'}</button></div>{p.odds&&!fresh&&<p className="muted small">Price is out of date. Refresh or enter a current quote before building a ticket.</p>}<p className="small muted">{p.bookmaker||'No bookmaker price'} · {p.oddsCaptured?new Date(p.oddsCaptured).toLocaleString('en-GB',{timeZone:'Africa/Kampala'})+' EAT':'Not captured'}</p><PickPriceEditor prediction={p} onSaved={onSaved}/><details className="reason"><summary>Why this pick?</summary><p>{p.verdict}</p><p>Prediction engine: {p.source}</p><p>Probability edge compares the selected model estimate with 1 ÷ your entered market odds. Fair odds shown here are 1 ÷ probability. Provider fair odds: {p.providerFairOdds?.toFixed(2)||'unavailable'}.</p><p>Predictor: {p.source}. Arata forecasts use historical goals, home/away performance, recent form and a small H2H adjustment. Bet Better remains a separate external model. The blend averages matching estimates.</p></details></article>;})}</>;

}

export function Slip({legs,setLegs,onBuild}:{legs:Prediction[];setLegs:(p:Prediction[])=>void;onBuild:()=>void}){let preview:any=null;try{if(legs.length)preview=ticketTotals(legs,1);}catch{}return <div className="ticket-panel"><span className="eyebrow">YOUR TICKET · {legs.length} PICKS</span><div className="section-heading"><h2>A little discipline.<br/>A sharper ticket.</h2><Layers size={25} className="mint"/></div>{!legs.length?<div className="ticket-empty">Your first pick goes here</div>:legs.map(l=><div className="slip-leg" key={l.id}><div><b>{selectionLabel(l)}</b><small>{l.home} vs {l.away}</small></div><span>{l.odds?.toFixed(2)}</span><button className="text-button" aria-label={'Remove '+selectionLabel(l)} onClick={()=>setLegs(legs.filter(x=>x.id!==l.id))}><Trash2 size={15}/></button></div>)}<div className="ticket-total"><span>Combined odds</span><strong>{preview?.odds.toFixed(2)||'—'}</strong></div><button className="primary" onClick={onBuild}>Open builder <ArrowUpRight size={17}/></button></div>;}

export {default as TicketBuilder} from './TicketReview';

function PickPriceEditor({prediction:p,onSaved}:{prediction:Prediction;onSaved:()=>void}){const [open,setOpen]=useState(false),[price,setPrice]=useState(''),[book,setBook]=useState('BetPawa Uganda'),[busy,setBusy]=useState(false),[error,setError]=useState('');async function save(){setBusy(true);setError('');try{const r=await fetch('/api/odds/market',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fixtureId:p.fixtureId,market:p.market||'1X2',selection:p.selection,line:p.line,bookmaker:book,odds:Number(price)})});const d:any=await readApiJson(r);if(!r.ok)throw new Error(d.error);setOpen(false);onSaved();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}return <><button className="text-button" onClick={()=>setOpen(!open)}>{open?'Close price entry':'Enter a current bookmaker quote'}</button>{open&&<div className="odds-editor"><label>Bookmaker<Select value={book} onValueChange={setBook}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['BetPawa Uganda','GSB Uganda','1XBet Uganda','Betway Uganda','SBA Uganda','Betwinner','Other bookmaker'].map(b=><SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select></label><label>Decimal odds · {selectionLabel(p)}<Input type="number" min="1.01" max="1000" step=".01" value={price} onChange={e=>setPrice(e.target.value)}/></label><p className="small muted">Stored as an owner-entered quote, separate from automated prices.</p>{error&&<p className="notice error">{error}</p>}<button className="primary" disabled={busy||!price} onClick={save}>{busy?'Saving…':'Save quote'}</button></div>}</>;}

