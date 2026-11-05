/* Imported by the existing OneSignal worker; API/HTML/cross-origin requests pass through. */
(() => {
  const manifest = self.KRANUAN_ASSETS || {};
  const cacheName = 'kranuan-static-' + (self.KRANUAN_BUILD || 'disabled');
  const MAX_ENTRIES = 160;
  self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('kranuan-static-') && k !== cacheName).map(k => caches.delete(k)))));
  });
  // No skipWaiting or forced reload: an in-progress order stays on its current release.
  self.addEventListener('fetch', event => {
    const req=event.request, url=new URL(req.url);
    if(req.method!=='GET'||url.origin!==self.location.origin||req.mode==='navigate'||req.headers.has('range')) return;
    if(url.pathname.startsWith('/api/')||['/sw.js','/OneSignalSDKWorker.js'].includes(url.pathname)) return;
    const hash=manifest[url.pathname]; if(!hash) return;
    const requestedBuild=url.searchParams.get('__kranuan_build');
    if(requestedBuild && requestedBuild!==self.KRANUAN_BUILD)return;
    const cacheFirst=requestedBuild===self.KRANUAN_BUILD||url.pathname.startsWith('/_kranuan/hero-');
    // Each deployment and file hash has a separate key; arbitrary query strings cannot grow storage.
    const key=new Request(url.origin+url.pathname+'?__kranuan_hash='+hash);
    event.respondWith((async()=>{
      let cache;try{cache=await caches.open(cacheName);const hit=await cache.match(key);if(hit&&cacheFirst)return hit;}catch{}
      const response=await fetch(req);
      if(response.ok&&!response.redirected&&response.type!=='opaque'&&cache) {
        const copy=response.clone();
        event.waitUntil((async()=>{try{
          await cache.put(key,copy);const keys=await cache.keys();
          await Promise.all(keys.slice(0,Math.max(0,keys.length-MAX_ENTRIES)).map(k=>cache.delete(k)));
        }catch{}})());
      }
      return response;
    })());
  });
})();
