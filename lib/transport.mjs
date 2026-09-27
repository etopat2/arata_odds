const collection=url=>typeof url==='string'&&url.startsWith('https://www.betpawa.ug/api/sportsbook/v4/events/lists/by-queries?');
function eventUrl(object){const id=object.externalEventId||object.externalIds?.betpawa||object.quoteComparisons?.find(q=>q.bookmaker===object.bookmaker)?.externalEventId;return /^\d+$/.test(String(id||''))?'https://www.betpawa.ug/api/sportsbook/v4/events/'+id:null;}
// Stored snapshots retain the exact collection request. Client links point to the
// corresponding public event resource instead of repeating a long query per price.
export function clientPayloadJson(data){return JSON.stringify(data,function(key,value){if(key==='sourceUrl'&&collection(value))return eventUrl(this)||value;if(key==='sourceUrls'&&Array.isArray(value)){const link=eventUrl(this);return [...new Set(value.map(url=>collection(url)&&link?link:url))];}return value;});}
export function jsonResponse(data,init={}){const headers=new Headers(init.headers);headers.set('Content-Type','application/json');return new Response(clientPayloadJson(data),{...init,headers});}
export function compactDashboard(data){return {...data,compactQuotes:true,fixtures:data.fixtures.map(f=>({...f,quotes:[]}))};}
