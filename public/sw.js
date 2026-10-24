// Pongie offline cache. Bump VERSION whenever index.html changes.
const VERSION='pongie-v57';
const FILES=['./','./index.html','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./favicon-32.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==VERSION).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
// Cache first so the game opens instantly and works with no signal; refresh the cache quietly in the background.
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==location.origin||u.pathname==='/healthz')return;
 e.respondWith(caches.match(r,{ignoreSearch:true}).then(m=>{
  const net=fetch(r).then(x=>{if(x&&x.ok){const cp=x.clone();caches.open(VERSION).then(c=>c.put(r,cp))}return x}).catch(()=>null);
  if(m){e.waitUntil(net);return m}
  return net.then(x=>x||caches.match('./index.html'))}))});
