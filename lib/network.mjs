// Bound the entire public response, including its body, even if a transport
// ignores AbortSignal. A stalled request must never stop the live monitor.
export async function readPublicResponse(url,options={},fetcher=fetch){
 const controller=new AbortController();let timer;const timeout=options.timeoutMs??12000;
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Public source response deadline exceeded.'));},timeout);});
 const request=(async()=>{const response=await fetcher(url,{headers:options.headers,signal:controller.signal});if(!response.ok)return {response,data:null};
  const maxBytes=options.maxBytes??6*1024*1024;
  if(Number(response.headers?.get('content-length'))>maxBytes){controller.abort();throw new Error('Public source response exceeds the size limit.');}
  let data;
  if(response.body){const reader=response.body.getReader(),parts=[];let bytes=0;try{while(true){const next=await reader.read();if(next.done)break;bytes+=next.value.byteLength;if(bytes>maxBytes){await reader.cancel();throw new Error('Public source response exceeds the size limit.');}parts.push(next.value);}}finally{reader.releaseLock();}const buffer=new Uint8Array(bytes);let at=0;for(const part of parts){buffer.set(part,at);at+=part.length;}const text=new TextDecoder().decode(buffer);data=options.text?text:JSON.parse(text);}
  else data=options.text?await response.text():await response.json();
  return {response,data};})();
 try{return await Promise.race([request,deadline]);}finally{clearTimeout(timer);}
}
