const CACHE='mijn-radio-v2';
const SHELL=['./','./index.html','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('mijn-radio-')&&key!==CACHE).map(key=>caches.delete(key))))]));
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||request.headers.has('range'))return;
  const shellUrls=SHELL.map(path=>new URL(path,self.registration.scope).href);
  if(request.mode!=='navigate'&&!shellUrls.includes(url.href))return;
  event.respondWith((async()=>{
    try{
      const response=await fetch(request);
      if(response.ok&&shellUrls.includes(url.href)){
        try{const cache=await caches.open(CACHE);await cache.put(request,response.clone())}catch{}
      }
      return response;
    }catch{
      const cached=await caches.match(request);
      if(cached)return cached;
      if(request.mode==='navigate'){
        const fallback=await caches.match(new URL('./index.html',self.registration.scope).href);
        if(fallback)return fallback;
      }
      return Response.error();
    }
  })());
});
