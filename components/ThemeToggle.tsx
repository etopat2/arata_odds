"use client";
import {useEffect,useState} from 'react';
import {Sun,Moon} from 'lucide-react';
export default function ThemeToggle(){
 const [theme,setTheme]=useState('dark');
 useEffect(()=>{const apply=(value:string)=>{const next=value==='light'?'light':'dark';setTheme(next);document.documentElement.dataset.theme=next;document.documentElement.classList.toggle('dark',next==='dark');document.documentElement.style.colorScheme=next;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',next==='light'?'#f5f6f8':'#0a0e1a');};try{apply(localStorage.getItem('arata-theme')||'dark');}catch{apply('dark');}const changed=(e:StorageEvent)=>{if(e.key==='arata-theme')apply(e.newValue||'dark');};window.addEventListener('storage',changed);return()=>window.removeEventListener('storage',changed);},[]);
 function toggle(){const next=theme==='dark'?'light':'dark';setTheme(next);document.documentElement.dataset.theme=next;document.documentElement.classList.toggle('dark',next==='dark');document.documentElement.style.colorScheme=next;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',next==='light'?'#f5f6f8':'#0a0e1a');try{localStorage.setItem('arata-theme',next);}catch{}}
 return <button className="theme-toggle" onClick={toggle} aria-label={'Switch to '+(theme==='dark'?'light':'dark')+' mode'} title={'Switch to '+(theme==='dark'?'light':'dark')+' mode'}>{theme==='dark'?<Sun size={17}/>:<Moon size={17}/>}<span>{theme==='dark'?'Light':'Dark'}</span></button>;
}
