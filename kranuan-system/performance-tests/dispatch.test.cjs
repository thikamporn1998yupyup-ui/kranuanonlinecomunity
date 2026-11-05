'use strict';
const {test,before,after}=require('node:test'),assert=require('node:assert/strict');
process.env.KRANUAN_TEST_SQLITE='1';process.env.ADMIN_PASSWORD='performance-dispatch-test';process.env.NODE_ENV='test';process.env.PORT='0';delete process.env.APP_ORIGIN;
let app,base;
before(async()=>{app=await require('../dispatch-start.cjs').start();if(!app.core.server.listening)await new Promise(r=>app.core.server.once('listening',r));base='http://127.0.0.1:'+app.core.server.address().port;});
after(async()=>{app.feature.close();await app.hub.close();app.core.server.closeAllConnections();await new Promise(r=>app.core.server.close(r));app.core.db.close();});
test('dispatch entrypoint keeps integration and rider scripts with performance enabled',async()=>{
 for(const p of ['/','/rider/','/owner-portal/','/admin.html']){
  const res=await fetch(base+p,{headers:{'Accept-Encoding':'gzip'}}),html=await res.text();assert.equal(res.status,200,p);
  assert.ok(html.includes('/smart-cache.js'),p);assert.ok(html.includes('/dispatch-center/integration.js'),p);
  assert.equal(res.headers.get('content-encoding'),null);
  if(['/rider/','/admin.html'].includes(p))assert.ok(html.includes('/rider-hub.js'),p);
 }
});
test('dispatch and rider hub endpoints still enforce authentication',async()=>{
 assert.equal((await fetch(base+'/api/dispatch/session')).status,401);assert.equal((await fetch(base+'/api/rider-hub/me')).status,401);
 assert.equal((await fetch(base+'/api/health')).status,200);
});
