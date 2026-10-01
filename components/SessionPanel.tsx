"use client";
import {useEffect,useState} from 'react';
import {readApiJson,apiErrorMessage} from '@/lib/api-client.mjs';

type Session={id:string;created:number;lastSeen:number;expires:number;device:string;current:boolean};
export default function SessionPanel({userId}:{userId?:string}){
 const [sessions,setSessions]=useState<Session[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const base=userId?`admin/users/${userId}/sessions`:'auth/sessions';
 async function load(){try{const result=await readApiJson(await fetch('/api/'+base,{cache:'no-store'}));setSessions(result.sessions||[]);}catch(e){setError(apiErrorMessage(e));}}
 useEffect(()=>{void load();},[base]);
 async function revoke(){setBusy(true);setError('');try{await readApiJson(await fetch('/api/'+base+(userId?'/revoke':'/revoke-others'),{method:'POST',credentials:'same-origin',cache:'no-store'}));await load();setNotice(userId?'All sessions were signed out.':'Other sessions were signed out.');}catch(e){setError(apiErrorMessage(e));}finally{setBusy(false);}}
 return <section className="panel-card"><div className="section-heading"><div><h3>Active sessions</h3><p className="small muted">Each browser sign-in is a separate session. Open pages check their access every few seconds and when they regain focus.</p></div><button type="button" className="secondary" onClick={()=>void load()}>Refresh</button></div>{sessions.length?sessions.map(session=><div className="session-row" key={session.id}><span><strong>{session.device}{session.current?' · This device':''}</strong><small>Signed in {new Date(session.created).toLocaleString('en-GB',{timeZone:'Africa/Kampala'})} EAT · Last seen {new Date(session.lastSeen).toLocaleString('en-GB',{timeZone:'Africa/Kampala'})} EAT</small></span></div>):<p className="small muted">No active sessions found.</p>}<div className="session-summary"><span className="small muted">{sessions.length} active</span><button className="secondary" type="button" disabled={busy||!sessions.length||!userId&&sessions.length===1} onClick={()=>void revoke()}>{busy?'Signing out…':userId?'Sign out all devices':'Sign out other devices'}</button></div>{notice&&<p className="notice" role="status">{notice}</p>}{error&&<p className="notice error" role="alert">{error}</p>}</section>;
}
