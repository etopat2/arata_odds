"use client";
import {useEffect,useState,useRef} from 'react';
import {WifiOff} from 'lucide-react';
export default function PwaTools(){
 const [online,setOnline]=useState(true),[update,setUpdate]=useState<ServiceWorker|null>(null),updating=useRef(false);
 useEffect(()=>{if(!('serviceWorker' in navigator))return;let disposed=false;const changed=()=>{if(updating.current)window.location.reload();};navigator.serviceWorker.addEventListener('controllerchange',changed);navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(reg=>{const inspect=()=>{if(!disposed&&reg.waiting)setUpdate(reg.waiting);};inspect();reg.addEventListener('updatefound',()=>reg.installing?.addEventListener('statechange',inspect));}).catch(console.error);return()=>{disposed=true;navigator.serviceWorker.removeEventListener('controllerchange',changed);};},[]);
 useEffect(()=>{const connection=()=>setOnline(navigator.onLine);connection();window.addEventListener('online',connection);window.addEventListener('offline',connection);return()=>{window.removeEventListener('online',connection);window.removeEventListener('offline',connection);};},[]);
 return <>{update&&<div className="pwa-update"><span>A new version of Arata Odds is ready.</span><button className="secondary" onClick={()=>{updating.current=true;update.postMessage({type:'SKIP_WAITING'});}}>Update app</button></div>}{!online&&<p className="notice offline-banner" role="status"><WifiOff size={16}/> Offline. Live scores, current prices and saving tickets require a connection.</p>}</>;
}
