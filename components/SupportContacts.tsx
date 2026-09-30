"use client";
import {useEffect,useState} from 'react';
import {Mail,MessageCircle} from 'lucide-react';
import {DEFAULT_SUPPORT_CONTACTS,whatsappUrl} from '@/lib/support-settings.mjs';
import {readApiJson} from '@/lib/api-client.mjs';

type Contacts={email:string;whatsapp:string};

export default function SupportContacts({compact=false}:{compact?:boolean}){
 const [contacts,setContacts]=useState<Contacts>(DEFAULT_SUPPORT_CONTACTS);
 useEffect(()=>{let mounted=true,sequence=0;const load=async()=>{const current=++sequence;try{const result=await readApiJson(await fetch('/api/support',{cache:'no-store'}));if(mounted&&current===sequence)setContacts(result);}catch{}};const changed=(event:Event)=>{const next=(event as CustomEvent<Contacts>).detail;if(next?.email&&next?.whatsapp){sequence++;setContacts(next);}else void load();};void load();window.addEventListener('arata-support-updated',changed);window.addEventListener('focus',load);const timer=window.setInterval(load,120000);return()=>{mounted=false;window.clearInterval(timer);window.removeEventListener('arata-support-updated',changed);window.removeEventListener('focus',load);};},[]);
 return <div className={'support-contacts'+(compact?' compact':'')} aria-label="App support"><span>Need help?</span><a href={'mailto:'+contacts.email}><Mail size={15}/>{contacts.email}</a><a href={whatsappUrl(contacts.whatsapp)} target="_blank" rel="noopener noreferrer" aria-label={'Contact Arata Odds support on WhatsApp at '+contacts.whatsapp}><MessageCircle size={15}/>WhatsApp {contacts.whatsapp}</a></div>;
}
