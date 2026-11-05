'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../public/sw.js'),'utf8');
function worker({broken=false}={}) {
 const handlers={},stored=new Map();let network=0;const deleted=[];
 const c={URL,Request,Promise,self:{location:{origin:'https://test.local'},KRANUAN_BUILD:'release-one',KRANUAN_ASSETS:{'/app.js':'sha','/image.png':'sha2'},addEventListener(n,fn){handlers[n]=fn;}},caches:{async keys(){return ['other-app','kranuan-static-old','kranuan-static-release-one'];},async delete(n){deleted.push(n);},async open(){if(broken)throw Error('denied');return {async match(k){return stored.get(k.url)?.clone();},async put(k,r){stored.set(k.url,r);},async keys(){return [...stored.keys()].map(k=>new Request(k));},async delete(k){stored.delete(k.url);}};}},fetch:async()=>{network++;return new Response('current asset');}};
 vm.createContext(c);vm.runInContext(code,c);
 async function fetch(url,options){let result;const waits=[];handlers.fetch({request:new Request(url,options),respondWith(r){result=r;},waitUntil(p){waits.push(p);}});if(!result)return null;const r=await result;await Promise.all(waits);return r.text();}
 return {fetch,network:()=>network,stored,handlers,deleted};
}
test('matching release uses cache; unversioned assets revalidate over network',async()=>{
 const w=worker(),u='https://test.local/app.js?__kranuan_build=release-one';assert.equal(await w.fetch(u),'current asset');await w.fetch(u);assert.equal(w.network(),1);
 await w.fetch('https://test.local/app.js');await w.fetch('https://test.local/app.js');assert.equal(w.network(),3);
});
test('API, other origins, POST, unknown files and new releases never intercepted',async()=>{
 const w=worker();for(const u of ['https://test.local/api/orders','https://other.test/app.js','https://test.local/index.html','https://test.local/app.js?__kranuan_build=new-release','https://test.local/sw.js'])assert.equal(await w.fetch(u),null);
 assert.equal(await w.fetch('https://test.local/app.js',{method:'POST',body:'x'}),null);assert.equal(w.network(),0);
});
test('cache failure does not prevent online use; activation leaves other app caches',async()=>{
 const w=worker({broken:true});assert.equal(await w.fetch('https://test.local/app.js?__kranuan_build=release-one'),'current asset');
 let task;w.handlers.activate({waitUntil:p=>task=p});await task;assert.deepEqual(w.deleted,['kranuan-static-old']);
});
