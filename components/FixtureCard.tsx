"use client";
import {readApiJson} from '@/lib/api-client.mjs';


import {memo,useState} from 'react';

import type {Fixture,Side} from '@/lib/types';

import {marketLabel} from '@/lib/markets.mjs';

import ModelEvidence from './ModelEvidence';
import MatchStatus from './MatchStatus';
import {Input} from '@/components/ui/input';

function FixtureCard({fixture:f,onSaved,canEdit=false}:{fixture:Fixture;onSaved:()=>void;canEdit?:boolean}){

 const [editing,setEditing]=useState(false),[marketsOpen,setMarketsOpen]=useState(false),[modelOpen,setModelOpen]=useState(false),[prices,setPrices]=useState<any>({...f.odds}),[bookmaker,setBookmaker]=useState('My bookmaker'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[context,setContext]=useState<any>(null),[contextBusy,setContextBusy]=useState(false);

 async function history(){setContextBusy(true);setError('');try{const r=await fetch('/api/fixtures/h2h?id='+encodeURIComponent(f.id));const d:any=await readApiJson(r);if(!r.ok)throw new Error(d.error);setContext(d);}catch(e){setError((e as Error).message);}finally{setContextBusy(false);}}

 async function save(){setBusy(true);setError('');try{const r=await fetch('/api/odds',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fixtureId:f.id,odds:prices,bookmaker})});const result:any=await readApiJson(r);if(!r.ok)throw new Error(result.error);setEditing(false);onSaved();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}

 const probabilities=f.probabilities||{},sum=Object.values(probabilities).reduce((s,n)=>s+(n||0),0);

 return <article className="fixture-card"><div className="fixture-meta"><span>{f.league}</span><span>{new Date(f.kickoff).toLocaleString('en-GB',{timeZone:'Africa/Kampala',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})} EAT</span></div><h3>{f.home}<span className="muted"> vs </span>{f.away}</h3><MatchStatus fixture={f}/><p className="small muted">Published Bet Better selections · Arata’s independent forecast below</p><div className="probabilities">{(['home','draw','away'] as Side[]).map(s=><div key={s}><span>{s==='home'?'Home':s==='draw'?'Draw':'Away'}</span><b>{probabilities[s]?(probabilities[s]!*100).toFixed(1)+'%':'—'}</b><small>Odds {f.odds?.[s]?.toFixed(2)||'unavailable'}</small></div>)}</div>{Object.keys(probabilities).length<3&&<p className="small muted">Only published selections are shown. Missing outcomes are not estimated.</p>}{Object.keys(probabilities).length===3&&Math.abs(sum-1)>.03&&<p className="small muted">The provider's three selection probabilities do not sum to 100%. These are independent published estimates.</p>}<div className="card-actions"><small>{f.source} · {f.status}</small>{canEdit&&f.status==='scheduled'&&Date.parse(f.kickoff)>Date.now()&&<button className="text-button" onClick={()=>setEditing(!editing)}>{editing?'Close':'Enter bookmaker odds'}</button>}</div><details className="reason" onToggle={e=>setMarketsOpen(e.currentTarget.open)}><summary>Bookmaker prices & other markets ({f.quotes?.length||0})</summary>{marketsOpen&&f.quotes?.length?<div className="quote-list">{f.quotes.map((q:any,i:number)=><div className="quote-row" key={i}><b>{marketLabel({...q,home:f.home,away:f.away})}</b><span>{q.odds.toFixed(2)}</span><small>{q.bookmaker} · {new Date(q.captured).toLocaleString('en-GB',{timeZone:'Africa/Kampala'})} EAT{q.stale?' · stale cache':''}</small></div>)}</div>:marketsOpen?<p className="muted">No accessible bookmaker quote for this fixture. Prices can be entered manually.</p>:null}{marketsOpen&&<p className="small muted">1X2, BTTS, match/team totals, double chance, clean sheets, win to nil, odd/even, result combinations and half-goal Asian handicaps. Prices are snapshots and can change. Only exact markets with a published model are ranked as picks.</p>}</details><details className="reason" onToggle={e=>setModelOpen(e.currentTarget.open)}><summary>Arata’s independent forecast & evidence</summary>{modelOpen&&<ModelEvidence model={(f as any).arataModel} home={f.home} away={f.away}/>}</details><button className="text-button" onClick={history} disabled={contextBusy}>{contextBusy?'Loading history…':'Head-to-head & recent form'}</button>{error&&!editing&&<p className="notice error" role="alert">{error}</p>}{context&&<div className="context-panel"><h3>Recent form</h3>{[['Home',context.homeForm],['Away',context.awayForm]].map(([label,form]:any)=><div className="form-row" key={label}><span>{label}</span>{form.length?form.map((v:string,i:number)=><span key={i} className={'form-pill '+v}>{v}</span>):<span className="muted">Unavailable</span>}</div>)}<h3>Previous meetings</h3>{context.h2h.length?context.h2h.map((m:any)=><div className="h2h-row" key={m.id}><small>{new Date(m.kickoff).toLocaleDateString('en-GB',{timeZone:'Africa/Kampala'})} · {context.source}</small>{m.home} {m.score.home} – {m.score.away} {m.away}</div>):<p className="muted">No prior meetings in the covered seasons.</p>}{context.message&&<p className="muted small">{context.message}</p>}<p className="muted small">Form is newest first. Historical context does not alter the provider model estimate.</p></div>}{editing&&<div className="odds-editor"><label>Bookmaker<Input value={bookmaker} onChange={e=>setBookmaker(e.target.value)} maxLength={80}/></label><div className="probabilities">{(['home','draw','away'] as Side[]).map(s=><label key={s}>{s}<Input type="number" min="1.01" max="1000" step=".01" value={prices[s]||''} onChange={e=>setPrices({...prices,[s]:e.target.value})}/></label>)}</div><p className="muted">Use current decimal prices from your bookmaker. These are owner-entered prices.</p>{error&&<p role="alert" className="error notice">{error}</p>}<button className="primary" onClick={save} disabled={busy}>{busy?'Saving…':'Save prices & calculate value'}</button></div>}</article>;

}




export default memo(FixtureCard);
