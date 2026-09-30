import {Mail,MessageCircle} from 'lucide-react';

export default function SupportContacts({compact=false}:{compact?:boolean}){return <div className={'support-contacts'+(compact?' compact':'')} aria-label="App support"><span>Need help?</span><a href="mailto:etopat@gmail.com"><Mail size={15}/> etopat@gmail.com</a><a href="https://wa.me/256791170164" target="_blank" rel="noopener noreferrer" aria-label="Contact Arata Odds support on WhatsApp"><MessageCircle size={15}/> WhatsApp support</a></div>;}
