"use client";
import {MARKET_FILTERS,matchesMarketFilter} from '@/lib/market-outcomes.mjs';

import {useState,useEffect,useRef,useCallback} from 'react';

import {Plus,Check,Trash2,ArrowUpRight,Layers,ChartNoAxesCombined,ExternalLink} from 'lucide-react';

import {Input} from '@/components/ui/input';

import {Select,SelectTrigger,SelectContent,SelectItem,SelectValue} from '@/components/ui/select';

import {Table,TableHeader,TableHead,TableBody,TableRow,TableCell} from '@/components/ui/table';

import {LineChart,Line,XAxis,YAxis,Tooltip,ResponsiveContainer,CartesianGrid} from 'recharts';

import type {Prediction,Ticket} from '@/lib/types';

import {marketLabel,lowerRisk} from '@/lib/markets.mjs';

import MatchStatus from './MatchStatus';
import {ticketTotals,searchMatches} from '@/lib/live.mjs';



const pct=(n:number|null|undefined)=>n==null?'—':(100*n).toFixed(1)+'%';

export const selectionLabel=(p:Prediction)=>marketLabel(p);

export default function History({data,onSaved}:{data:any;onSaved:()=>void}){

 const [records,setRecords]=useState<Prediction[]>([]),[historyBusy,setHistoryBusy]=useState(false),[historyError,setHistoryError]=useState(''),[historyRevision,setHistoryRevision]=useState(0),[matching,setMatching]=useState(0);
 const [result,setResult]=useState('all'),[page,setPage]=useState(0),[publicData,setPublicData]=useState<any>(null),[error,setError]=useState(''),[historyQuery,setHistoryQuery]=useState('');
 useEffect(()=>{const controller=new AbortController();setHistoryBusy(true);setHistoryError('');const timer=setTimeout(()=>{fetch('/api/history?'+new URLSearchParams({q:historyQuery,outcome:result,page:String(page),pageSize:'20'}),{signal:controller.signal,cache:'no-store'}).then(async r=>{const d:any=await r.json();if(!r.ok)throw new Error(d.error||'History is unavailable.');setRecords(d.records);setMatching(d.total);}).catch(e=>{if(!controller.signal.aborted)setHistoryError(e.message);}).finally(()=>{if(!controller.signal.aborted)setHistoryBusy(false);});},250);return()=>{clearTimeout(timer);controller.abort();};},[data?.updated,historyRevision,historyQuery,result,page]);
 const filtered=records,pages=Math.ceil(matching/20);

 async function record(){try{const r=await fetch('/api/results');const d:any=await r.json();if(!r.ok)throw new Error(d.error);setPublicData(d.data);}catch(e){setError((e as Error).message);}}

 return <>{historyBusy&&<p className="notice" role="status">Loading your prediction history…</p>}{historyError&&<p className="notice error" role="alert">{historyError}</p>}<div className="section-heading"><div><h2>Your prediction record</h2><p className="muted">{data?.metrics.total||0} snapshots · {data?.metrics.settled||0} settled · {data?.metrics.pending||0} pending</p></div></div><div className="chart-panel"><h3>Accuracy over time</h3><p className="muted small">Cumulative win rate of settled prediction snapshots, grouped by prediction date.</p>{data?.metrics.trend.length?<div style={{height:240}}><ResponsiveContainer width="100%" height="100%"><LineChart data={data.metrics.trend}><CartesianGrid stroke="#29354b" strokeDasharray="3 3"/><XAxis dataKey="date" tick={{fill:'#94a2b6',fontSize:12}}/><YAxis domain={[0,100]} tick={{fill:'#94a2b6',fontSize:12}} unit="%"/><Tooltip contentStyle={{background:'#141a2e',border:'1px solid #304056',borderRadius:8}}/><Line type="monotone" dataKey="accuracy" name="Accuracy %" stroke="#00e5a0" strokeWidth={2.5} dot={{r:4}}/></LineChart></ResponsiveContainer></div>:<div className="empty compact"><ChartNoAxesCombined size={25}/><p>The chart begins when a logged prediction settles. Pending picks do not count as wins or losses.</p></div>}</div><div className="section-heading"><h2>Every prediction</h2><Select value={result} onValueChange={v=>{setResult(v);setPage(0);}}><SelectTrigger aria-label="Filter prediction outcomes"><SelectValue/></SelectTrigger><SelectContent>{['all','won','lost','pending'].map(x=><SelectItem key={x} value={x}>{x==='all'?'All outcomes':x[0].toUpperCase()+x.slice(1)}</SelectItem>)}</SelectContent></Select></div><label className="input-label">Search match history<Input aria-label="Search match history by team" placeholder="Either team or both teams" value={historyQuery} onChange={e=>{setHistoryQuery(e.target.value);setPage(0);}}/></label><p className="small muted">{matching} matching prediction snapshots</p><div className="history-table"><Table><TableHeader><TableRow>{['Match / snapshot','Selection','Model','Odds','Implied','Edge','Outcome'].map(x=><TableHead key={x}>{x}</TableHead>)}</TableRow></TableHeader><TableBody>{filtered.map(p=><TableRow key={p.id}><TableCell><b>{p.home} vs {p.away}</b><small className="cell-meta">{new Date(p.created).toLocaleString('en-GB',{timeZone:'Africa/Kampala'})}</small></TableCell><TableCell><small>{p.market||'1X2'}</small><br/>{selectionLabel(p)}</TableCell><TableCell>{pct(p.probability)}<small className="cell-meta">{p.source}</small></TableCell><TableCell>{p.odds?.toFixed(2)||'—'}</TableCell><TableCell>{pct(p.implied)}</TableCell><TableCell className={(p.edge??0)>.05?'mint':''}>{p.edge==null?'—':(p.edge*100).toFixed(1)+' pp'}</TableCell><TableCell><span className={'badge '+p.outcome}>{p.outcome}</span></TableCell></TableRow>)}</TableBody></Table>{!filtered.length&&<p className="empty compact">No predictions match this filter.</p>}</div>{pages>1&&<div className="pagination"><button className="secondary" disabled={page===0} onClick={()=>setPage(page-1)}>Previous</button><span>Page {page+1} of {pages}</span><button className="secondary" disabled={page+1>=pages} onClick={()=>setPage(page+1)}>Next</button></div>}<p className="muted small">Each model or odds update creates a new snapshot. The log preserves all estimates, including picks without an edge. Multiple snapshots and predictors for one match count separately in this log’s accuracy. Model Lab provides a fair, deduplicated predictor comparison. ROI uses actual saved ticket stakes and excludes pending tickets.</p><h2 className="subheading">Results awaiting confirmation</h2><p className="muted small">Covered results settle automatically when the official full-time score appears in OpenLigaDB. For uncovered games, enter a confirmed regulation-time score after the match.</p>{Array.from(new Set((records).filter((p:Prediction)=>p.outcome==='pending'&&Date.parse(p.kickoff)+120*60000<Date.now()).map((p:Prediction)=>p.fixtureId))).map((id:any)=>{const p=records.find((p:Prediction)=>p.fixtureId===id);return <ResultEntry key={id} prediction={p!} onSaved={()=>{setHistoryRevision(v=>v+1);onSaved();}}/>;})}<div className="source-record"><h3>Bet Better’s public record</h3><p className="muted small">Separate provider statistics. These are not your app’s accuracy or ROI.</p><button className="secondary" onClick={record}>Fetch public settled record <ExternalLink size={14}/></button>{error&&<p className="error notice" role="alert">{error}</p>}{publicData&&<><p className="small">{publicData.description}</p>{publicData.periods?.map((p:any)=><p className="small" key={p.window}>{p.window} · {p.picks} picks · {p.hitRatePct}% hit rate · {p.roiPct}% ROI</p>)}<a href="https://betbetter.world/results" target="_blank" rel="noreferrer">View provider methodology</a></>}</div></>;

}

function ResultEntry({prediction:p,onSaved}:{prediction:Prediction;onSaved:()=>void}){const [home,setHome]=useState(''),[away,setAway]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');async function save(){setBusy(true);setError('');try{const r=await fetch('/api/fixtures/result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fixtureId:p.fixtureId,home:home===''?null:Number(home),away:away===''?null:Number(away)})});const d:any=await r.json();if(!r.ok)throw new Error(d.error);onSaved();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}return <div className="fixture-card"><h3>{p.home} vs {p.away}</h3><div className="result-inputs"><label>Home score<Input type="number" min="0" max="50" value={home} onChange={e=>setHome(e.target.value)}/></label><label>Away score<Input type="number" min="0" max="50" value={away} onChange={e=>setAway(e.target.value)}/></label><button className="secondary" disabled={busy||home===''||away===''} onClick={save}>Save final score</button></div>{error&&<p className="notice error" role="alert">{error}</p>}<p className="muted small">Confirm the score after 90 minutes plus stoppage time. This will settle every supported full-time prediction and affected tickets.</p></div>;}



