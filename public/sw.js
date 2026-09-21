const CACHE='adler-mobile-v2';
const scopeUrl=new URL(self.registration.scope);
const appShell=new URL('./',scopeUrl).href;
const core=[appShell,new URL('manifest.webmanifest',scopeUrl).href];

self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(core)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  const request=event.request;const url=new URL(request.url);
  const isAppRequest=request.method==='GET'&&url.origin===scopeUrl.origin&&url.pathname.startsWith(scopeUrl.pathname)&&!url.pathname.includes('/api/');
  if(!isAppRequest)return;
  event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy))}return response}).catch(async()=>{const cached=await caches.match(request);if(cached)return cached;if(request.mode==='navigate')return caches.match(appShell);return Response.error()}))
});
