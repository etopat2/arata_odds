import {handle,refreshLive} from '../lib/service';
import {startHostedRefresh,refreshStatus} from '../lib/hosted-refresh';
import {jsonResponse} from '../lib/transport.mjs';
import {runWithBackground,retainBackground} from '../lib/background.mjs';
export default {
 async fetch(request:Request,env:any,ctx:ExecutionContext){
  return runWithBackground(ctx,async()=>{
   const url=new URL(request.url);
   if(url.pathname==='/api/live/stream'){
    // Short HTTP polling works across isolated edge instances without an
    // unreliable process-local SSE subscription. The client polls every 2s.
    return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
   }
   if(url.pathname.startsWith('/api/')){try{
    if(url.pathname==='/api/sync/status')return jsonResponse(await refreshStatus(),{headers:{'Cache-Control':'no-store'}});
    if(request.method==='POST'&&['/api/refresh','/api/web/ingest','/api/predictions/generate'].includes(url.pathname)){
     const origin=request.headers.get('origin');if(origin&&origin!==url.origin)return jsonResponse({error:'Request origin is not allowed.'},{status:403});
     return jsonResponse(await startHostedRefresh(url.searchParams.get('range')||'upcoming'),{status:202,headers:{'Cache-Control':'no-store'}});
    }
    if(url.pathname==='/api/live'||url.pathname==='/api/tickets')await refreshLive().catch(console.error);
    return await handle(request);}catch(error){console.error('API response:',error);return jsonResponse({error:'The data service is temporarily unavailable. Please retry.'},{status:503,headers:{'Cache-Control':'no-store'}});}
   }
   const response=await env.ASSETS.fetch(request);
   const headers=new Headers(response.headers);
   headers.set('Cache-Control',url.pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':url.pathname==='/sw.js'?'no-cache':'private, max-age=0, must-revalidate');
   headers.set('X-Content-Type-Options','nosniff');
   return new Response(response.body,{status:response.status,headers});
  });
 }
};
