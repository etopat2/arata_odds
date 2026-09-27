const CACHE='arata-offline-v5';
const STATIC=['/offline.html','/manifest.webmanifest','/brand/arata-mark.png','/brand/icon-180.png','/brand/icon-192.png','/brand/icon-512.png','/brand/icon-maskable-512.png'];
async function cacheShell(cache,response){
 if(!response.ok)return;
 const html=await response.clone().text();
 // Development/HMR scripts cannot be replayed as an offline application.
 const assets=[...html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+\.(?:js|css))"/g)].map(m=>m[1]);
 if(!assets.length)return;
 try{await cache.addAll(assets);await cache.put('/',response.clone());}catch{}
}
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(STATIC);try{await cacheShell(cache,await fetch('/',{cache:'reload'}));}catch{}})()));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('arata-offline-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(event.request.mode==='navigate')event.respondWith((async()=>{const cache=await caches.open(CACHE);try{const response=await fetch(event.request);if(response.ok){event.waitUntil(cacheShell(cache,response.clone()));return response;}if(response.status<500)return response;}catch{}return await cache.match('/')||await cache.match('/offline.html');})());
 else if(STATIC.includes(url.pathname)||url.pathname.startsWith('/assets/'))event.respondWith((async()=>{const cache=await caches.open(CACHE),cached=await cache.match(event.request);if(cached)return cached;const response=await fetch(event.request);if(response.ok&&url.pathname.startsWith('/assets/'))await cache.put(event.request,response.clone());return response;})());
});
// Scores, odds, predictions, tickets and external requests are never cached here.
