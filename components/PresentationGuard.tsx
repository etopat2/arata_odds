"use client";
import {useEffect,useState} from 'react';
import {DEFAULT_SECURITY_SETTINGS} from '@/lib/security-settings.mjs';
import {isCaptureShortcut} from '@/lib/capture-controls.mjs';

const editable=(target:EventTarget|null)=>target instanceof Element&&!!target.closest('input,textarea,[contenteditable="true"],[data-allow-copy]');
export default function PresentationGuard({email}:{email?:string}){
 const [settings,setSettings]=useState<any>(DEFAULT_SECURITY_SETTINGS);
 useEffect(()=>{let mounted=true;const load=()=>{fetch('/api/security/presentation',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(value=>{if(mounted&&value)setSettings(value);}).catch(()=>{});};load();const changed=(event:Event)=>{const value=(event as CustomEvent).detail;if(value)setSettings(value);else load();};const timer=window.setInterval(load,15000);window.addEventListener('arata-security-updated',changed);window.addEventListener('focus',load);return()=>{mounted=false;clearInterval(timer);window.removeEventListener('arata-security-updated',changed);window.removeEventListener('focus',load);};},[]);
 useEffect(()=>{
  let shieldTimer:ReturnType<typeof setTimeout>|undefined;
  const shield=()=>{if(settings.blockScreenshotKeys)document.body.classList.add('arata-capture-shield-active');};
  const reveal=()=>{if(shieldTimer)clearTimeout(shieldTimer);shieldTimer=setTimeout(()=>{if(document.visibilityState==='visible'&&document.hasFocus())document.body.classList.remove('arata-capture-shield-active');},250);};
  const visibility=()=>{if(document.visibilityState==='hidden')shield();else reveal();};
  const stop=(event:Event)=>event.preventDefault();
  const copy=(event:Event)=>{const anchor=window.getSelection()?.anchorNode,allowed=anchor instanceof Element?anchor.closest('[data-allow-copy]'):anchor?.parentElement?.closest('[data-allow-copy]');if(!editable(event.target)&&!allowed)event.preventDefault();};
  const key=(event:KeyboardEvent)=>{
   const k=event.key.toLowerCase(),command=event.ctrlKey||event.metaKey;
   if(settings.blockPrint&&command&&k==='p')return event.preventDefault();
   if(settings.blockScreenshotKeys&&isCaptureShortcut(event)){event.preventDefault();shield();if(shieldTimer)clearTimeout(shieldTimer);shieldTimer=setTimeout(()=>{if(document.hasFocus())document.body.classList.remove('arata-capture-shield-active');},1500);return;}
   if(settings.blockShortcuts&&(k==='f12'||command&&event.shiftKey&&['i','j','c','k'].includes(k)||command&&['u','s'].includes(k)))return event.preventDefault();
   if(settings.blockCopy&&command&&!editable(event.target)&&['c','x'].includes(k))return event.preventDefault();
   if(settings.blockPaste&&command&&k==='v')return event.preventDefault();
  };
  if(settings.blockContextMenu)document.addEventListener('contextmenu',stop,true);
  if(settings.blockCopy)for(const type of ['copy','cut','selectstart','dragstart'])document.addEventListener(type,copy,true);
  if(settings.blockPaste)document.addEventListener('paste',stop,true);
  document.addEventListener('keydown',key,true);
  if(settings.blockScreenshotKeys){window.addEventListener('blur',shield);window.addEventListener('focus',reveal);document.addEventListener('visibilitychange',visibility);}
  document.body.classList.toggle('arata-no-print',!!settings.blockPrint);
  return()=>{document.removeEventListener('contextmenu',stop,true);for(const type of ['copy','cut','selectstart','dragstart'])document.removeEventListener(type,copy,true);document.removeEventListener('paste',stop,true);document.removeEventListener('keydown',key,true);window.removeEventListener('blur',shield);window.removeEventListener('focus',reveal);document.removeEventListener('visibilitychange',visibility);if(shieldTimer)clearTimeout(shieldTimer);document.body.classList.remove('arata-no-print','arata-capture-shield-active');};
 },[settings]);
 return <>{settings.blockScreenshotKeys&&<div className="arata-capture-shield" aria-hidden="true"><strong>ARATA ODDS</strong><span>Workspace hidden while the window is inactive</span></div>}{settings.showWatermark&&email&&<div className="arata-watermark" aria-hidden="true">{Array.from({length:12},(_,index)=><span key={index}>{email} · Arata Odds</span>)}</div>}</>;
}
