const CACHE='coffee-1010-github-pages-v39';
const CORE=['./','./index.html','./menu-content.js','./owner-menu.css','./data/menu.json','./manifest.webmanifest','./assets/caffee-1010-red-logo.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('coffee-1010-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{
  if(event.data?.type==='OWNER_CACHE_POLICY'){event.ports[0]?.postMessage({privateOwnerAPI:true});return;}
  if(event.data?.type!=='CACHE_MENU'||!Array.isArray(event.data.urls))return;
  const urls=[...new Set(event.data.urls)].filter(url=>typeof url==='string'&&(/^(assets\/menu-products\/[a-z0-9-]+\.(jpg|png|webp))$/.test(url)||/^api\/photo\?id=[a-f0-9-]{36}$/.test(url)));
  event.waitUntil(caches.open(CACHE).then(async cache=>{for(const url of urls){const request=new Request(new URL(url,self.registration.scope).href,{credentials:'omit'});if(await cache.match(request))continue;try{const response=await fetch(request);if(response.ok&&(!url.startsWith('api/')||response.headers.get('Cache-Control')?.startsWith('public')))await cache.put(request,response);}catch{}}}));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url),base=new URL(self.registration.scope),relative=url.pathname.slice(base.pathname.length);
  if(url.origin!==base.origin||relative.startsWith('admin/')||relative==='admin'||url.searchParams.has('preview'))return;
  // Owner sessions, drafts, and private photo previews never enter the offline cache.
  if(relative.startsWith('api/')&&relative!=='api/menu'&&relative!=='api/photo')return;
  if(relative==='api/photo'){
    if(event.request.referrer&&new URL(event.request.referrer).searchParams.has('preview'))return;
    event.respondWith(fetch(event.request).then(response=>{if(response.ok&&response.headers.get('Cache-Control')?.startsWith('public')){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;}).catch(async()=>await caches.match(event.request)||Response.error()));return;
  }
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('./index.html',copy));}return response;}).catch(()=>caches.match('./index.html')));return;
  }
  if(relative==='api/menu'||relative==='data/menu.json'){
    event.respondWith(fetch(event.request).then(response=>{if(!response.ok)throw new Error('Menu unavailable');const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;}).catch(async()=>await caches.match(event.request)||Response.error()));return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;}).catch(()=>Response.error())));
});
