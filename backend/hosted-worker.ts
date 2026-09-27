import {handle,refresh,refreshLive} from '../lib/service';
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
   if(url.pathname.startsWith('/api/')){
    if(url.pathname==='/api/state')retainBackground(refresh(url.searchParams.get('range')||'upcoming').catch(console.error));
    if(url.pathname==='/api/live'||url.pathname==='/api/tickets')await refreshLive().catch(console.error);
    return handle(request);
   }
   const response=await env.ASSETS.fetch(request);
   const headers=new Headers(response.headers);
   headers.set('Cache-Control',url.pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':url.pathname==='/sw.js'?'no-cache':'private, max-age=0, must-revalidate');
   headers.set('X-Content-Type-Options','nosniff');
   return new Response(response.body,{status:response.status,headers});
  });
 }
};
