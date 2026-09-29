"use client";
import {useEffect,useState} from 'react';
export function useTicketAnalysis(input:any){
 const [result,setResult]=useState<{input:any;plan:any;error:string}>({input:null,plan:null,error:''});
 useEffect(()=>{if(!input)return;let worker:Worker|undefined,stopped=false;const finish=(data:any)=>{if(!stopped)setResult({input,plan:data.plan||null,error:data.error||''});};
 try{worker=new Worker(new URL('../frontend/ticket-worker.ts',import.meta.url),{type:'module'});worker.onmessage=e=>finish(e.data);worker.onerror=()=>finish({error:'Ticket calculation could not finish. Change a setting or refresh to retry.'});worker.postMessage(input);}catch{void (async()=>{try{const [{buildTicketPlan},{searchMatches}]=await Promise.all([import('@/lib/league-tickets.mjs'),import('@/lib/live.mjs')]);if(!stopped)finish({plan:buildTicketPlan(searchMatches(input.picks,input.query),input.quotes,input.options)});}catch(e){finish({error:(e as Error).message});}})();}
 return()=>{stopped=true;worker?.terminate();};},[input]);
 return {plan:result.input===input?result.plan:null,error:result.input===input?result.error:'',computing:!!input&&result.input!==input};
}
