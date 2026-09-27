import {db,cachedRead,cachedWrite} from './store';
import {refresh} from './service';
import {retainBackground} from './background.mjs';
const LEASE='refresh:lease:v2';
export async function refreshStatus(){const [lease,last]=await Promise.all([cachedRead(LEASE),cachedRead('sync-status')]);return {inProgress:!!lease&&lease.expires>Date.now(),updated:last?.data?.updated||null,error:last?.data?.error||null};}
export async function startHostedRefresh(range:string){
 const owner=crypto.randomUUID(),now=Date.now();
 await db().prepare('INSERT INTO api_cache(key,expires,payload) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET expires=excluded.expires,payload=excluded.payload WHERE api_cache.expires<?').bind(LEASE,now+28000,JSON.stringify({data:owner}),now).run();
 if((await cachedRead(LEASE))?.data!==owner)return {accepted:true,inProgress:true};
 retainBackground((async()=>{try{await refresh(range);}catch(error){console.error('Fixture refresh:',error);await cachedWrite('refresh-error:v1',Number.MAX_SAFE_INTEGER,{data:{message:String(error),captured:new Date().toISOString()}});const last=await cachedRead('sync-status');await cachedWrite('sync-status',0,{data:{...last?.data,error:'Some football sources are temporarily unavailable. Refresh again to resume.'}});}finally{await db().prepare('DELETE FROM api_cache WHERE key=? AND payload=?').bind(LEASE,JSON.stringify({data:owner})).run();}})());
 return {accepted:true,inProgress:true};
}
