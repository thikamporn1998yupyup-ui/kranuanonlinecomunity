/* KRANUAN performance bootstrap. No markup, styles, routes or order data are persisted. */
(() => {
  'use strict';
  if(window.KranuanPerformance || !window.fetch) return;
  const nativeFetch=window.fetch.bind(window), memory=new Map(), pending=new Map();
  const build=document.currentScript?.dataset.kranuanBuild||'1';
  const DB='kranuan-public-catalog-v1', STORE='catalog', STORAGE='kranuan-cache-event-v1';
  const ttlFor=u=>u.pathname==='/api/shops'||u.pathname==='/api/menus'?5000:u.pathname==='/api/config'?60000:0;
  let epoch=0,authEpoch=0,dbPromise,writeQueue=Promise.resolve(),channel;
  let authPending=Promise.resolve();
  const stats={network:0,memory:0,indexedDB:0,joined:0};
  function database(){
    if(dbPromise)return dbPromise;
    dbPromise=new Promise(resolve=>{
      if(!window.indexedDB){resolve(null);return;}
      let done=false;const finish=value=>{if(done){value?.close();return;}done=true;clearTimeout(timer);resolve(value);};
      const timer=setTimeout(()=>finish(null),800);
      try{
        const r=indexedDB.open(DB,1);
        r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:'key'});};
        r.onsuccess=()=>{r.result.onversionchange=()=>r.result.close();finish(r.result);};
        r.onerror=r.onblocked=()=>finish(null);
      }catch{finish(null);}
    });return dbPromise;
  }
  async function dbRead(key){
    await writeQueue.catch(()=>{});const db=await database();if(!db)return null;
    return new Promise(resolve=>{
      const timer=setTimeout(()=>resolve(null),300);
      try{const r=db.transaction(STORE).objectStore(STORE).get(key);r.onsuccess=()=>{clearTimeout(timer);resolve(r.result||null);};r.onerror=()=>{clearTimeout(timer);resolve(null);};}catch{clearTimeout(timer);resolve(null);}
    });
  }
  function dbWrite(record,version){
    writeQueue=writeQueue.catch(()=>{}).then(async()=>{
      const db=await database();if(!db||version!==epoch)return;
      await new Promise(resolve=>{try{
        const tx=db.transaction(STORE,'readwrite'),s=tx.objectStore(STORE);
        tx.oncomplete=tx.onerror=tx.onabort=()=>resolve();
        if(!record){s.clear();return;}
        s.put(record);
        const r=s.getAll();r.onsuccess=()=>{
          const rows=r.result.sort((a,b)=>b.expires-a.expires);let size=0;
          rows.forEach((row,i)=>{size+=row.text.length;if(i>=80||size>8*1024*1024||row.expires<Date.now()-60000)s.delete(row.key);});
        };
      }catch{resolve();}});
    });
  }
  function clearLegacyIdentity(){
    // These old keys were not account-scoped. Profiles are restored from the authenticated API.
    try{
      for(const key of ['kranuan.delivery.v1','kranuan_profile'])localStorage.removeItem(key);
      const key='kranuan-isolated-demo-v6',saved=JSON.parse(localStorage.getItem(key)||'null');
      if(saved&&typeof saved==='object'){saved.currentUser=null;saved.orders=[];localStorage.setItem(key,JSON.stringify(saved));}
    }catch{}
    // Existing customer scripts use global lexical state rather than window properties.
    try{if(typeof cProfile!=='undefined')cProfile=null;}catch{}
    try{if(typeof cCart!=='undefined')cCart={};}catch{}
    try{if(typeof liveOrders!=='undefined')liveOrders=[];}catch{}
    try{if(typeof state!=='undefined'){state.currentUser=null;state.orders=[];}}catch{}
  }
  clearLegacyIdentity();
  function invalidate(auth=false,broadcast=false){
    epoch++;memory.clear();pending.clear();dbWrite(null,epoch);
    if(auth){authEpoch++;clearLegacyIdentity();}
    if(broadcast){const message={auth,nonce:Date.now()+':'+Math.random()};try{channel?.postMessage(message);}catch{}try{localStorage.setItem(STORAGE,JSON.stringify(message));}catch{}}
  }
  let lastMessage='';
  function remote(message){
    if(!message||message.nonce===lastMessage)return;lastMessage=message.nonce;
    invalidate(!!message.auth);
    // Another tab changed the shared HttpOnly session: reset its old account UI.
    if(message.auth)location.reload();
  }
  try{channel=new BroadcastChannel(STORAGE);channel.onmessage=e=>remote(e.data);}catch{}
  window.addEventListener('storage',e=>{if(e.key===STORAGE&&e.newValue)try{remote(JSON.parse(e.newValue));}catch{}});
  function response(record){return new Response(record.text,{status:200,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...(record.etag?{ETag:record.etag}:{})}});}
  const staleAccount=()=>new DOMException('บัญชีเปลี่ยนแล้ว กรุณาลองใหม่','AbortError');
  window.fetch=async function(input,init){
    let req;try{req=new Request(input,init);}catch{return nativeFetch(input,init);}
    const u=new URL(req.url);
    if(u.origin!==location.origin||!u.pathname.startsWith('/api/'))return nativeFetch(input,init);
    const read=req.method==='GET',auth=/^\/api\/(?:login|logout|accounts\/google)$/.test(u.pathname);
    if(!read){
      invalidate(auth);
      if(auth){
        const task=authPending.then(()=>nativeFetch(req));authPending=task.catch(()=>{});
        try{return await task;}finally{invalidate(true,true);}
      }
      try{return await nativeFetch(req);}finally{invalidate(false,true);}
    }
    await authPending;
    const account=authEpoch,version=epoch;
    // Never coalesce stream/image requests or explicitly controlled/cancellable requests.
    const bypass=/\/(?:events|image|photo)(?:\/|$)/.test(u.pathname)||init?.signal||(input instanceof Request)||['no-store','reload','no-cache'].includes(req.cache);
    if(bypass){const r=await nativeFetch(req);if(account!==authEpoch)throw staleAccount();return r;}
    const publicTTL=!req.headers.has('authorization')?ttlFor(u):0;
    const key=publicTTL?build+'|public|'+u.href:build+'|'+u.href+'|'+req.credentials+'|'+JSON.stringify([...req.headers]);
    if(pending.has(key)){stats.joined++;return (await pending.get(key)).clone();}
    const task=(async()=>{
      let record=publicTTL?memory.get(key):null;
      if(!record&&publicTTL){record=await dbRead(key);if(record)stats.indexedDB++;}
      if(account!==authEpoch)throw staleAccount();
      if(record&&record.expires>Date.now()&&record.expires<=Date.now()+publicTTL&&version===epoch){stats.memory++;memory.set(key,record);return response(record);}
      const headers=new Headers(req.headers);
      if(record?.etag&&version===epoch)headers.set('If-None-Match',record.etag);
      stats.network++;
      let res=await nativeFetch(new Request(req,{headers}));
      if(account!==authEpoch)throw staleAccount();
      if(res.status===304&&record){record={...record,expires:Date.now()+publicTTL};res=response(record);}
      else if(publicTTL&&res.ok&&res.headers.get('content-type')?.includes('application/json')){
        const text=await res.clone().text();
        if(text.length<=2*1024*1024)record={key,text,etag:res.headers.get('etag'),expires:Date.now()+publicTTL};else record=null;
      }else record=null;
      if(publicTTL&&record&&version===epoch){memory.set(key,record);while(memory.size>80)memory.delete(memory.keys().next().value);dbWrite(record,version);}
      return res;
    })();
    pending.set(key,task);
    try{return (await task).clone();}finally{if(pending.get(key)===task)pending.delete(key);}
  };
  // Upgrade each existing K client without changing its public API or its DOM.
  function enhance(K){
    if(!K||K.__performance)return;Object.defineProperty(K,'__performance',{value:true});
    let timer=null,notifyTimer=null,last=0,running=false,again=false,connected=false;
    const originalDisconnect=K.disconnect.bind(K);
    K.notify=function(){
      invalidate();
      if(running){again=true;return;}
      if(notifyTimer)return;
      notifyTimer=setTimeout(async()=>{
        notifyTimer=null;running=true;last=Date.now();
        try{await Promise.allSettled([...K.listeners].map(fn=>Promise.resolve().then(fn)));}
        finally{running=false;if(again){again=false;K.notify();}}
      },60);
    };
    K.disconnect=function(){connected=false;clearInterval(timer);clearTimeout(notifyTimer);timer=notifyTimer=null;again=false;originalDisconnect();};
    K.connect=function(){
      K.disconnect();connected=true;
      if(window.EventSource){
        K.events=new EventSource('/api/events');
        K.events.addEventListener('refresh',()=>K.notify());
        K.events.onopen=()=>K.notify();
      }
      // SSE first; 15s fallback on disconnect and 60s reconciliation while healthy.
      timer=setInterval(()=>{const healthy=K.events?.readyState===1;if(Date.now()-last>=(healthy?60000:15000))K.notify();},5000);
      K.poll=timer;
    };
    const wake=()=>{if(connected)K.notify();};
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)wake();});window.addEventListener('online',wake);
  }
  // Existing scripts assign window.K synchronously; install their helpers immediately.
  let client=window.K;
  const descriptor=Object.getOwnPropertyDescriptor(window,'K');
  if(!descriptor||descriptor.configurable){Object.defineProperty(window,'K',{configurable:true,enumerable:true,get:()=>client,set:value=>{client=value;enhance(value);}});enhance(client);}
  const optimizeImage=img=>{
    if(img.hasAttribute('data-kranuan-image'))return;img.setAttribute('data-kranuan-image','');
    if(!img.hasAttribute('decoding'))img.decoding='async';
    // Leave visible images, hero art, maps and explicitly configured images alone.
    if(!img.hasAttribute('loading')&&img.getBoundingClientRect().top>window.innerHeight+300)img.loading='lazy';
  };
  function ready(){
    document.querySelectorAll('img').forEach(optimizeImage);
    new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1){if(n.tagName==='IMG')optimizeImage(n);n.querySelectorAll?.('img').forEach(optimizeImage);}}).observe(document.body,{subtree:true,childList:true});
    if('serviceWorker' in navigator && window.isSecureContext){
      // Use OneSignal's already-configured root worker, never compete with it.
      navigator.serviceWorker.register('/OneSignalSDKWorker.js',{scope:'/',updateViaCache:'none'}).then(reg=>{
        let checked=Date.now();document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-checked>3600000){checked=Date.now();reg.update().catch(()=>{});}});
      }).catch(()=>{});
    }
  }
  window.KranuanPerformance={build,stats,invalidate:()=>invalidate(false,true)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
