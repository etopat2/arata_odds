import {Worker} from 'node:worker_threads';
export async function openSqlite(path,schema){
 const worker=new Worker(new URL('./sqlite-worker.mjs',import.meta.url),{workerData:{path,schema}}),pending=new Map();let sequence=0,readyResolve,readyReject,closed=false;
 const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});
 const fail=error=>{readyReject(error);for(const p of pending.values())p.reject(error);pending.clear();};
 worker.on('message',message=>{if(message.ready){readyResolve();return;}const p=pending.get(message.id);if(!p)return;pending.delete(message.id);message.error?p.reject(new Error(message.error)):p.resolve(message.result);});
 worker.on('error',fail);worker.on('exit',code=>{if(!closed)fail(new Error('Database worker stopped ('+code+').'));});
 await ready;
 const send=(type,payload={})=>new Promise((resolve,reject)=>{if(closed){reject(new Error('Database is closed.'));return;}const id=++sequence;pending.set(id,{resolve,reject});try{worker.postMessage({id,type,...payload});}catch(error){pending.delete(id);reject(error);}});
 return {query:(sql,params=[])=>send('query',{sql,params}),transaction:statements=>send('batch',{statements}),close:async()=>{await send('close');closed=true;await worker.terminate();}};
}
