"use client";
import {useEffect,useState} from 'react';
import {DEFAULT_SECURITY_SETTINGS} from '@/lib/security-settings.mjs';

const editable=(target:EventTarget|null)=>target instanceof Element&&!!target.closest('input,textarea,[contenteditable="true"],[data-allow-copy]');
export default function PresentationGuard({email}:{email?:string}){
 const [settings,setSettings]=useState<any>(DEFAULT_SECURITY_SETTINGS);
 useEffect(()=>{let mounted=true;const load=()=>{fetch('/api/security/presentation',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(value=>{if(mounted&&value)setSettings(value);}).catch(()=>{});};load();const changed=(event:Event)=>{const value=(event as CustomEvent).detail;if(value)setSettings(value);else load();};window.addEventListener('arata-security-updated',changed);return()=>{mounted=false;window.removeEventListener('arata-security-updated',changed);};},[]);
 useEffect(()=>{
  const stop=(event:Event)=>event.preventDefault();
  const copy=(event:Event)=>{const anchor=window.getSelection()?.anchorNode,allowed=anchor instanceof Element?anchor.closest('[data-allow-copy]'):anchor?.parentElement?.closest('[data-allow-copy]');if(!editable(event.target)&&!allowed)event.preventDefault();};
  const key=(event:KeyboardEvent)=>{
   const k=event.key.toLowerCase(),command=event.ctrlKey||event.metaKey;
   if(settings.blockPrint&&command&&k==='p')return event.preventDefault();
   if(settings.blockScreenshotKeys&&(k==='printscreen'||event.metaKey&&event.shiftKey&&['3','4','5'].includes(k)))return event.preventDefault();
   if(settings.blockShortcuts&&(k==='f12'||command&&event.shiftKey&&['i','j','c','k'].includes(k)||command&&['u','s'].includes(k)))return event.preventDefault();
   if(settings.blockCopy&&command&&!editable(event.target)&&['c','x'].includes(k))return event.preventDefault();
   if(settings.blockPaste&&command&&k==='v')return event.preventDefault();
  };
  if(settings.blockContextMenu)document.addEventListener('contextmenu',stop,true);
  if(settings.blockCopy)for(const type of ['copy','cut','selectstart','dragstart'])document.addEventListener(type,copy,true);
  if(settings.blockPaste)document.addEventListener('paste',stop,true);
  document.addEventListener('keydown',key,true);
  document.body.classList.toggle('arata-no-print',!!settings.blockPrint);
  return()=>{document.removeEventListener('contextmenu',stop,true);for(const type of ['copy','cut','selectstart','dragstart'])document.removeEventListener(type,copy,true);document.removeEventListener('paste',stop,true);document.removeEventListener('keydown',key,true);document.body.classList.remove('arata-no-print');};
 },[settings]);
 return settings.showWatermark&&email?<div className="arata-watermark" aria-hidden="true">{email} · Arata Odds</div>:null;
}
