const V="logdash-v7";
const SHELL=["./","index.html","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","icons/favicon.ico","icons/favicon-32.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=="GET")return;
  const same=u.origin===location.origin;
  const cdn=/(^|\.)cdnjs\.cloudflare\.com$|fonts\.googleapis\.com$|fonts\.gstatic\.com$/.test(u.hostname);
  if(!same&&!cdn)return;
  e.respondWith(
    fetch(r).then(res=>{
      if(res.ok||res.type==="opaque"){const c=res.clone();caches.open(V).then(x=>x.put(r,c))}
      return res;
    }).catch(()=>caches.match(r).then(m=>m||(r.mode==="navigate"?caches.match("index.html"):Response.error())))
  );
});