'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../public/smart-cache.js'),'utf8');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function fakeIDB(rows=new Map()) {
 const db={objectStoreNames:{contains:()=>true},close(){},transaction(){
   const tx={};let outstanding=0;
   const result=fn=>{const r={};outstanding++;setTimeout(()=>{try{r.result=fn();r.onsuccess?.();}catch{r.onerror?.();}if(!--outstanding)setTimeout(()=>tx.oncomplete?.(),0);},0);return r;};
   tx.objectStore=()=>({get:k=>result(()=>structuredClone(rows.get(k))),put:v=>result(()=>rows.set(v.key,structuredClone(v))),clear:()=>result(()=>rows.clear()),getAll:()=>result(()=>[...rows.values()].map(v=>structuredClone(v))),delete:k=>result(()=>rows.delete(k))});return tx;
 }};
 return {rows,open(){const r={};setTimeout(()=>{r.result=db;r.onsuccess?.();},0);return r;}};
}
function runtime(fetcher,db,storage=new Map()) {
 const listeners={},docListeners={},timers=[],events=[];let reloads=0;
 class RelativeRequest extends Request{constructor(input,init){super(typeof input==='string'?new URL(input,'https://test.local/'):input,init);}}
 class ES {constructor(url){this.url=url;this.readyState=1;this.handlers={};events.push(this);}addEventListener(n,fn){this.handlers[n]=fn;}close(){this.readyState=2;}}
 const document={currentScript:{dataset:{kranuanBuild:'test-v1'}},readyState:'loading',hidden:false,addEventListener(n,f){docListeners[n]=f;}};
 const c={Request:RelativeRequest,Response,Headers,URL,DOMException,console,Promise,Map,Set,Date,Math,JSON,document,location:{origin:'https://test.local',reload(){reloads++;}},fetch:fetcher,EventSource:ES,indexedDB:db,localStorage:{setItem(k,v){storage.set(k,v);},getItem:k=>storage.get(k)||null,removeItem:k=>storage.delete(k)},setTimeout,clearTimeout,setInterval(fn,ms){timers.push({fn,ms});return timers.length;},clearInterval(){},addEventListener(n,f){listeners[n]=f;}};
 c.window=c;vm.createContext(c);vm.runInContext(code,c);return {c,db,events,timers,listeners,docListeners,reloads:()=>reloads};
}
test('simultaneous catalog reads coalesce; private orders are never stored',async()=>{
 let count=0;const db=fakeIDB(),{c}=runtime(async req=>{count++;await pause(10);return Response.json(req.url.includes('/orders')?[{phone:'private'}]:[{name:'public'}]);},db);
 const out=await Promise.all(Array.from({length:8},()=>c.fetch('/api/shops').then(r=>r.json())));assert.equal(count,1);assert.equal(out[0][0].name,'public');
 await c.fetch('/api/shops');assert.equal(count,1);
 await c.fetch('/api/orders');await c.fetch('/api/orders');assert.equal(count,3);await pause(25);
 assert.equal(db.rows.size,1);assert.ok(!JSON.stringify([...db.rows.values()]).includes('private'));
});
test('IndexedDB survives page runtime, excludes CSRF, expires and revalidates',async()=>{
 let count=0;const db=fakeIDB();const fetcher=async req=>{count++;return req.headers.has('if-none-match')?new Response(null,{status:304}):Response.json([{name:'shop'}],{headers:{ETag:'"one"'}});};
 const a=runtime(fetcher,db);await a.c.fetch('/api/shops',{headers:{'X-CSRF-Token':'DO-NOT-PERSIST'}});await pause(30);
 assert.ok(!JSON.stringify([...db.rows.values()]).includes('DO-NOT-PERSIST'));
 const b=runtime(fetcher,db);await b.c.fetch('/api/shops');assert.equal(count,1);
 for(const row of db.rows.values())row.expires=Date.now()-1;
 const d=runtime(fetcher,db);const r=await d.c.fetch('/api/shops');assert.equal(count,2);assert.equal((await r.json())[0].name,'shop');
});
test('mutation invalidates persistent catalog and failed network never returns expired data',async()=>{
 let value=1,fail=false;const db=fakeIDB(),{c}=runtime(async req=>{if(fail)throw Error('offline');if(req.method==='POST'){value=2;return Response.json({ok:true});}return Response.json({value});},db);
 assert.equal((await (await c.fetch('/api/shops')).json()).value,1);await c.fetch('/api/admin/shops/x',{method:'POST',body:'{}'});
 assert.equal((await (await c.fetch('/api/shops')).json()).value,2);
 c.KranuanPerformance.invalidate();fail=true;await assert.rejects(c.fetch('/api/shops'),/offline/);
});
test('late old-account response is rejected; reads wait for account transition',async()=>{
 let finishOld,finishLogin;const {c}=runtime(req=>req.url.endsWith('/login')?new Promise(r=>finishLogin=r):req.url.endsWith('/orders')?new Promise(r=>finishOld=r):Promise.resolve(Response.json({ok:true})),fakeIDB());
 const old=c.fetch('/api/orders');await pause(5);const rejected=assert.rejects(old,{name:'AbortError'});
 const login=c.fetch('/api/login',{method:'POST',body:'{}'});await pause(5);
 finishOld(Response.json([{owner:'A'}]));await rejected;
 let done=false;const fresh=c.fetch('/api/config').then(()=>done=true);await pause(5);assert.equal(done,false);
 finishLogin(Response.json({user:{id:'B'}}));await login;await fresh;assert.equal(done,true);
});
test('storage failure leaves network usable; explicit cancellation stays independent',async()=>{
 let calls=0;const {c}=runtime(async()=>{calls++;return Response.json([]);},{open(){throw Error('denied');}});
 await c.fetch('/api/shops');assert.equal(calls,1);
 const ac=new AbortController();await Promise.all([c.fetch('/api/orders',{signal:ac.signal}),c.fetch('/api/orders',{signal:ac.signal})]);assert.equal(calls,3);
});
test('SSE refresh bursts coalesce without overlapping callbacks; fallback and account broadcast remain',async()=>{
 const r=runtime(async()=>Response.json([]),fakeIDB()),{c}=r;let calls=0,max=0,active=0,release,started,second;
 const start=new Promise(r=>started=r),next=new Promise(r=>second=r),gate=new Promise(r=>release=r);
 c.K={listeners:new Set([async()=>{calls++;active++;max=Math.max(max,active);if(calls===1){started();await gate;}else second();active--;}]),disconnect(){this.events?.close();},connect(){},notify(){}};
 c.K.connect();r.events[0].handlers.refresh();r.events[0].handlers.refresh();await start;r.events[0].handlers.refresh();release();
 await Promise.race([next,pause(2000).then(()=>{throw Error('follow-up refresh missing');})]);
 assert.equal(max,1);assert.equal(calls,2);assert.equal(r.timers[0].ms,5000);
 r.listeners.storage({key:'kranuan-cache-event-v1',newValue:JSON.stringify({auth:true,nonce:'new-account'})});assert.equal(r.reloads(),1);
 c.K.disconnect();assert.equal(r.events[0].readyState,2);
});

test('legacy unscoped identity is cleared while unrelated local settings survive',async()=>{
 const storage=new Map([['kranuan.delivery.v1','private address'],['kranuan_profile','old profile'],['sound','on'],['kranuan-isolated-demo-v6',JSON.stringify({currentUser:{name:'A'},orders:[{phone:'old'}],listings:[{id:'keep'}]})]]);
 const {c}=runtime(async()=>Response.json({ok:true}),fakeIDB(),storage);
 assert.equal(storage.has('kranuan.delivery.v1'),false);assert.equal(storage.has('kranuan_profile'),false);assert.equal(storage.get('sound'),'on');
 const saved=JSON.parse(storage.get('kranuan-isolated-demo-v6'));assert.equal(saved.currentUser,null);assert.equal(saved.orders.length,0);assert.equal(saved.listings[0].id,'keep');
 vm.runInContext("let cProfile={phone:'A'},cCart={food:1},liveOrders=[{owner:'A'}];",c);
 await c.fetch('/api/logout',{method:'POST',body:'{}'});
 assert.equal(vm.runInContext('cProfile',c),null);assert.equal(vm.runInContext('liveOrders.length',c),0);
});
