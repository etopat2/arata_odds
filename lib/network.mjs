// Bound the entire public response, including its body, even if a transport
// ignores AbortSignal. A stalled request must never stop the live monitor.
export async function readPublicResponse(url,options={},fetcher=fetch){
 const controller=new AbortController();let timer;const timeout=options.timeoutMs??12000;
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Public source response deadline exceeded.'));},timeout);});
 const request=(async()=>{const response=await fetcher(url,{headers:options.headers,signal:controller.signal});if(!response.ok)return {response,data:null};const data=options.text?await response.text():await response.json();return {response,data};})();
 try{return await Promise.race([request,deadline]);}finally{clearTimeout(timer);}
}
