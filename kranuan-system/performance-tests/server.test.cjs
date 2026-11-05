'use strict';
const {test,before,after}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
process.env.KRANUAN_TEST_SQLITE='1';process.env.NODE_ENV='test';process.env.ADMIN_PASSWORD='performance-test-only-123';delete process.env.APP_ORIGIN;
const {server,db,initialize}=require('../server.cjs');let base;
before(async()=>{await initialize();await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;});
after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));db.close();});
class Agent {
 constructor(){this.cookie='';this.csrf='';}
 async req(p,body){const r=await fetch(base+'/api'+p,{method:body===undefined?'GET':'POST',headers:{Cookie:this.cookie,'Content-Type':'application/json','X-CSRF-Token':this.csrf},body:body===undefined?undefined:JSON.stringify(body)});if(r.headers.get('set-cookie'))this.cookie=r.headers.get('set-cookie').split(';')[0];const data=await r.json();if(data.csrf)this.csrf=data.csrf;return {status:r.status,data,headers:r.headers};}
}
test('HTML keeps every original inline script and style except byte-identical extracted photos',async()=>{
 const original=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
 const res=await fetch(base+'/'),html=await res.text();
 assert.equal(res.status,200);assert.ok(html.includes('/smart-cache.js'));assert.ok(html.length<original.length/5);
 const before=JSON.parse(original.match(/const HERO_IMAGES\s*=\s*(\{[^\n]+\})/)[1]);
 const after=JSON.parse(html.match(/const HERO_IMAGES\s*=\s*(\{[^\n]+\})/)[1]);
 for(const name of Object.keys(before)){
   const r=await fetch(base+after[name]);assert.equal(r.status,200);
   assert.deepEqual(Buffer.from(await r.arrayBuffer()),Buffer.from(before[name].split(',')[1],'base64'));
   assert.match(r.headers.get('cache-control'),/immutable/);
 }
 const strip=s=>s.replace(/<script[^>]*data-kranuan-build[^>]*><\/script>/g,'').replace(/const HERO_IMAGES\s*=\s*\{[^\n]+\}/,'const HERO_IMAGES={}').replace(/<(?:script|link)\b[^>]*>/gi,t=>t.replace(/\b(src|href)=(['"])(.*?)\2/i,(a,k,q,v)=>{const u=new URL(v,'http://test/index.html');u.searchParams.delete('__kranuan_build');return k+'='+q+u.href+q;}));
 assert.equal(strip(html),strip(original));
});
test('gzip, conditional 304, HEAD and worker update headers',async()=>{
 const a=await fetch(base+'/api.js',{headers:{'Accept-Encoding':'gzip'}});assert.equal(a.headers.get('content-encoding'),'gzip');const etag=a.headers.get('etag');assert.ok(etag);
 const b=await fetch(base+'/api.js',{headers:{'If-None-Match':etag}});assert.equal(b.status,304);assert.equal(await b.text(),'');
 const head=await fetch(base+'/api.js',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
 const noZip=await fetch(base+'/api.js',{headers:{'Accept-Encoding':'gzip;q=0'}});assert.equal(noZip.headers.get('content-encoding'),null);
 const worker=await fetch(base+'/OneSignalSDKWorker.js');assert.equal(worker.headers.get('cache-control'),'no-cache');assert.equal(worker.headers.get('service-worker-allowed'),'/');assert.match(await worker.text(),/OneSignalSDK.sw.js/);
 assert.match(await (await fetch(base+'/sw.js')).text(),/self.KRANUAN_ASSETS=/);
});
test('public catalog ETag changes after edits; private API never sends a validator',async()=>{
 const a=await fetch(base+'/api/shops'),tag=a.headers.get('etag');assert.ok(tag);assert.equal((await fetch(base+'/api/shops',{headers:{'If-None-Match':tag}})).status,304);
 db.prepare('INSERT INTO shops(id,name,category,updated_at) VALUES(?,?,?,?)').run('perf-shop','ทดสอบ','อาหาร',new Date().toISOString());
 const b=await fetch(base+'/api/shops',{headers:{'If-None-Match':tag}});assert.equal(b.status,200);assert.notEqual(b.headers.get('etag'),tag);
 const a1=new Agent();await a1.req('/session',{});const orders=await a1.req('/orders');assert.equal(orders.status,200);assert.equal(orders.headers.get('cache-control'),'no-store');assert.equal(orders.headers.get('etag'),null);
});
test('two account isolation, logout revocation and CSRF unchanged',async()=>{
 const a=new Agent(),b=new Agent();const x=await a.req('/session',{}),y=await b.req('/session',{});assert.notEqual(x.data.user.id,y.data.user.id);
 const stamp=new Date().toISOString();db.prepare('INSERT INTO orders(id,customer_id,status,snapshot,pickup,dropoff,customer_name,phone,goods_satang,fee_satang,created_at,updated_at,idempotency_key) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run('private-order',x.data.user.id,'ready','{"shop":"ทดสอบ"}','A','B','Account A','0812345678',0,2500,stamp,stamp,'performance-order');
 assert.equal((await a.req('/orders')).data.some(o=>o.id==='private-order'),true);
 assert.equal((await b.req('/orders')).data.some(o=>o.id==='private-order'),false);
 assert.equal((await b.req('/orders/private-order/events')).status,403);
 const bad=await fetch(base+'/api/logout',{method:'POST',headers:{Cookie:a.cookie,'Content-Type':'application/json'},body:'{}'});assert.equal(bad.status,403);
 assert.equal((await a.req('/logout',{})).status,200);assert.equal((await a.req('/orders')).status,401);
});
test('SSE retains live refresh with no order details and no compression',async()=>{
 const a=new Agent();await a.req('/session',{});const c=new AbortController();
 const r=await fetch(base+'/api/events',{headers:{Cookie:a.cookie,'Accept-Encoding':'gzip'},signal:c.signal});assert.equal(r.status,200);assert.equal(r.headers.get('content-encoding'),null);
 const reader=r.body.getReader(),chunk=new TextDecoder().decode((await reader.read()).value);assert.match(chunk,/event: refresh/);assert.ok(!chunk.includes('0812345678'));c.abort();await reader.cancel().catch(()=>{});
});
test('protected files and POST static still rejected',async()=>{
 assert.equal((await fetch(base+'/server.cjs')).status,404);assert.equal((await fetch(base+'/schema.sql')).status,404);assert.equal((await fetch(base+'/api.js',{method:'POST'})).status,405);
});
