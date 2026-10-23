const CACHE='fde-shell-v8-public';
const FILES=['./','./index.html','./style.css','./app.js','./core.js','./study-pack.js','./store.js','./i18n.js','./platform.js','./config.json','./course.json','./study-pack.enc.json','./manifest.json','./icon.svg',...['taxonomy','knowledge','books','resources','cases','case-fields','scenarios','home'].map(n=>'./content/'+n+'.json')];
const allowed=new Set(FILES.map(p=>new URL(p,self.location).href));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('fde-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.includes('/api/'))return;
 const canonical=u.origin+u.pathname;if(!allowed.has(canonical))return;
 // Fresh shell/content when online; the exact cache is the offline fallback. Never cache AI responses.
 event.respondWith(fetch(event.request).then(async response=>{if(response.ok&&!u.search){const cache=await caches.open(CACHE);await cache.put(event.request,response.clone());}return response;}).catch(()=>caches.match(canonical)));
});
