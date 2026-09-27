export async function readApiJson(response){
 const type=response.headers.get('content-type')||'';
 if(!type.includes('application/json'))throw new Error(response.status===401||response.status===403||response.redirected?'Your session needs to be renewed. Sign in again, then refresh.':'The data service is temporarily unavailable. Please retry; your saved records are preserved.');
 let data;try{data=await response.json();}catch{throw new Error('The data service returned an incomplete response. Please retry.');}
 if(!response.ok)throw new Error(data?.error||`The data service is unavailable (${response.status}). Please retry.`);
 return data;
}
export function apiErrorMessage(error){return error?.name==='TimeoutError'||error?.name==='AbortError'?'Loading took too long. Please retry; previously loaded matches are still available.':error?.message||'Could not connect to the data service. Please retry.';}
