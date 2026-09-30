"use client";

import {useCallback,useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Activity,ArrowUpRight,ChartNoAxesCombined,LogOut,ShieldCheck,UserRound,X} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import type {AppUser} from './AccountAccess';
import SupportContacts from './SupportContacts';
import LegalLinks from './LegalLinks';

type Destination={id:string;label:string;Icon:LucideIcon};

export default function MobileMenu({user,view,onNavigate,onLogout}:{user:AppUser;view:string;onNavigate:(view:string)=>void;onLogout:()=>void}){
 const [open,setOpen]=useState(false);
 const [mounted,setMounted]=useState(false);
 const triggerRef=useRef<HTMLButtonElement>(null);
 const closeRef=useRef<HTMLButtonElement>(null);
 const drawerRef=useRef<HTMLElement>(null);
 const close=useCallback((restoreFocus=true)=>{setOpen(false);if(restoreFocus)requestAnimationFrame(()=>triggerRef.current?.focus());},[]);
 useEffect(()=>setMounted(true),[]);
 useEffect(()=>{if(!open)return;const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';requestAnimationFrame(()=>closeRef.current?.focus());const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();close();return;}if(event.key!=='Tab')return;const focusable=Array.from(drawerRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),[tabindex]:not([tabindex="-1"])')||[]);if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}};const media=window.matchMedia('(min-width: 701px)');const onResize=()=>{if(media.matches)close(false);};document.addEventListener('keydown',onKey);media.addEventListener('change',onResize);return()=>{document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',onKey);media.removeEventListener('change',onResize);};},[open,close]);
 const navigate=(destination:string)=>{onNavigate(destination);close();};
 const account:Destination[]=[{id:'history',label:'History',Icon:ChartNoAxesCombined},{id:'models',label:'Model Lab',Icon:Activity},{id:'profile',label:'Profile',Icon:UserRound},...(user.role==='admin'?[{id:'admin',label:'Admin',Icon:ShieldCheck}]:[])];
 const links=(items:Destination[])=><div className="mobile-drawer-links">{items.map(({id,label,Icon},index)=><button key={id} type="button" className={'mobile-drawer-link'+(view===id?' is-active':'')} style={{'--menu-item':index} as React.CSSProperties} aria-current={view===id?'page':undefined} onClick={()=>navigate(id)}><span className="mobile-drawer-link-icon"><Icon size={19} strokeWidth={1.8}/></span><span>{label}</span><ArrowUpRight className="mobile-drawer-arrow" size={16}/></button>)}</div>;
 return <>
  <button ref={triggerRef} type="button" className={'mobile-menu-trigger'+(open?' is-open':'')} aria-label={open?'Close navigation menu':'Open navigation menu'} aria-controls="arata-mobile-drawer" aria-expanded={open} onClick={()=>open?close():setOpen(true)}><span className="mobile-menu-lines" aria-hidden="true"><i/><i/><i/></span></button>
  {mounted&&createPortal(<div className={'mobile-menu-layer'+(open?' is-open':'')} aria-hidden={!open}>
   <button className="mobile-menu-backdrop" type="button" tabIndex={-1} aria-label="Close navigation menu" onClick={()=>close()}/>
   <aside ref={drawerRef} id="arata-mobile-drawer" className="mobile-drawer" role="dialog" aria-modal={open?'true':undefined} aria-label="Navigation menu" inert={!open}>
    <div className="mobile-drawer-top"><button type="button" className="mobile-drawer-profile" onClick={()=>navigate('profile')}><span className="mobile-drawer-avatar">{(user.firstName?.[0]||'A').toUpperCase()}{(user.lastName?.[0]||'').toUpperCase()}</span><span className="mobile-drawer-identity"><small>YOUR ACCOUNT</small><strong>{user.firstName} {user.lastName}</strong><em>{user.role==='admin'?'Administrator':'Member'}</em></span></button><button ref={closeRef} type="button" className="mobile-drawer-close" aria-label="Close navigation menu" onClick={()=>close()}><X size={21}/></button></div>
    <div className="mobile-drawer-scroll"><p className="mobile-drawer-section">YOUR TOOLS</p>{links(account)}
    </div>
    <div className="mobile-drawer-bottom"><SupportContacts compact/><LegalLinks compact/><button type="button" className="mobile-drawer-signout" onClick={()=>{close(false);onLogout();}}><LogOut size={18}/> Sign out</button><p>Football intelligence, made for your edge.</p></div>
   </aside>
  </div>,document.body)}
 </>;
}
