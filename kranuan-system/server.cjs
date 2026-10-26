
'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const publicDir=path.join(__dirname,'public');
const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync(path.join(__dirname,'schema.sql'),'utf8'));db.exec('PRAGMA busy_timeout=5000');
const now=()=>new Date().toISOString(),id=()=>crypto.randomUUID(),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const get=(sql,...v)=>db.prepare(sql).get(...v),all=(sql,...v)=>db.prepare(sql).all(...v),run=(sql,...v)=>db.prepare(sql).run(...v);
const FIREBASE_TABLES=['users','shops','menus','sessions','orders','order_events','reports','audit'];
let firebaseRef=null,saveQueue=Promise.resolve(),firebaseBaseline='';
function serializeState(){const tables={};for(const table of FIREBASE_TABLES){const rows=all('SELECT * FROM '+table);tables[table]=Object.fromEntries(rows.map((r,i)=>[String(r.id??i),r]))}return JSON.stringify({version:1,tables})}
async function persistState(){if(!firebaseRef)return;const state=serializeState();if(state===firebaseBaseline)return;await firebaseRef.set(JSON.parse(state));firebaseBaseline=state}
async function initialize(){
 db.exec(fs.readFileSync(path.join(__dirname,'schema.sql'),'utf8'));
 if(process.env.KRANUAN_TEST_SQLITE==='1')return seedAdmin();
 const key=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;if(!key||!process.env.FIREBASE_DATABASE_URL)throw Error('Set FIREBASE_SERVICE_ACCOUNT_JSON and FIREBASE_DATABASE_URL.');
 const admin=require('firebase-admin');const credential=admin.credential.cert(JSON.parse(key));
 const app=admin.apps[0]||admin.initializeApp({credential,databaseURL:process.env.FIREBASE_DATABASE_URL});
 firebaseRef=app.database().ref('/kranuanonline/backend_v1/state');const saved=(await firebaseRef.get()).val();
 if(saved?.version===1&&saved.tables){db.exec('BEGIN');try{for(const table of [...FIREBASE_TABLES].reverse())db.exec('DELETE FROM '+table);for(const table of FIREBASE_TABLES){for(const row of Object.values(saved.tables[table]||{})){const columns=Object.keys(row);run('INSERT INTO '+table+'('+columns.join(',')+') VALUES('+columns.map(()=>'?').join(',')+')',...columns.map(k=>row[k]))}}db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}}
 firebaseBaseline=serializeState();seedAdmin();await persistState();
}
function seedAdmin(){if(!get("SELECT id FROM users WHERE role='admin'")){const pass=process.env.ADMIN_PASSWORD;if(!pass||pass.length<12)throw Error('Set ADMIN_PASSWORD to at least 12 characters before first start.');run('INSERT INTO users(id,username,password_hash,role,name,created_at) VALUES(?,?,?,?,?,?)',id(),process.env.ADMIN_USERNAME||'admin',passHash(pass),'admin','ผู้ดูแลกระนวน',now())}}
function fail(status,message){throw Object.assign(new Error(message),{status})}
function text(v,max=200){if(typeof v!=='string')return '';return v.trim().slice(0,max)}
function required(v,label,max=200){const s=text(v,max);if(!s)fail(400,'กรุณาระบุ'+label);return s}
function imageURL(v){const s=text(v,1600000);if(!s)return '';if(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s))return s;try{const u=new URL(s);if(u.protocol==='https:')return u.href}catch{}fail(400,'รูปต้องเป็น URL HTTPS หรือรูป JPEG/PNG/WebP')}
function coord(v,min,max){if(v===null||v===undefined||v==='')return null;const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)fail(400,'พิกัดไม่ถูกต้อง');return n}
function passHash(pass){const salt=crypto.randomBytes(16).toString('hex');return salt+':'+crypto.scryptSync(pass,salt,64).toString('hex')}
function checkPass(pass,stored){try{const [salt,key]=stored.split(':');const a=crypto.scryptSync(pass,salt,64),b=Buffer.from(key,'hex');return a.length===b.length&&crypto.timingSafeEqual(a,b)}catch{return false}}
const production=process.env.NODE_ENV==='production';
if(production&&!process.env.APP_ORIGIN)throw Error('Set APP_ORIGIN for production.');
function publicUser(u){return {id:u.id,username:u.username,role:u.role,name:u.name,shop_id:u.shop_id,online:!!u.online}}
function session(req){const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('kranuan_session='))?.slice(16);if(!token)return null;return get('SELECT s.csrf,s.token_hash,u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>?',hash(token),Date.now())||null}
function newSession(res,userId){const token=crypto.randomBytes(32).toString('hex'),csrf=crypto.randomBytes(24).toString('hex');run('INSERT INTO sessions VALUES(?,?,?,?)',hash(token),userId,csrf,Date.now()+30*86400000);res.setHeader('Set-Cookie','kranuan_session='+token+'; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000'+(production?'; Secure':''));return {user:publicUser(get('SELECT * FROM users WHERE id=?',userId)),csrf}}
function needUser(u,roles){if(!u)fail(401,'กรุณาเข้าสู่ระบบ');if(roles&&!roles.includes(u.role))fail(403,'บัญชีนี้ไม่มีสิทธิ์ทำรายการ');return u}
function ownShop(u,shopId){needUser(u,['admin','merchant']);if(u.role==='merchant'&&u.shop_id!==shopId)fail(403,'แก้ไขได้เฉพาะร้านของคุณ')}
function audit(u,action,target){run('INSERT INTO audit(actor_id,action,target,created_at) VALUES(?,?,?,?)',u.id,action,target,now())}
function shopView(s){return {...s,opt_in:!!s.opt_in,accepting:!!s.accepting}}
function orderView(o,u){const snap=JSON.parse(o.snapshot);return {id:o.id,shop_id:o.shop_id,rider_id:o.rider_id,status:o.status,type:o.kind,shop:snap.shop,shop_image_url:snap.shop_image_url||'',product_image_url:snap.items?.[0]?.image_url||'',items:snap.items||[],item:snap.items?.map(i=>i.name+' × '+i.quantity).join(', ')||snap.description,pickup:o.pickup,pickup_lat:snap.pickup_lat??null,pickup_lng:snap.pickup_lng??null,dropoff:o.dropoff,customer_name:o.customer_name,phone:u.role==='rider'&&o.rider_id!==u.id?'':o.phone,dropoff_lat:o.lat,dropoff_lng:o.lng,note:o.note,image:o.image,insideImage:o.inside_image,goods_total:o.goods_satang/100,fee:o.fee_satang/100,deliveryFee:o.fee_satang/100,total:(o.goods_satang+o.fee_satang)/100,created_at:o.created_at,updated_at:o.updated_at,order_mode:snap.order_mode}}
function visibleOrders(u){if(u.role==='admin')return all('SELECT * FROM orders ORDER BY created_at DESC LIMIT 300');if(u.role==='merchant')return all('SELECT * FROM orders WHERE shop_id=? ORDER BY created_at DESC LIMIT 100',u.shop_id);if(u.role==='rider')return all("SELECT * FROM orders WHERE rider_id=? OR (status='ready' AND rider_id IS NULL) ORDER BY created_at DESC LIMIT 100",u.id);return all('SELECT * FROM orders WHERE customer_id=? ORDER BY created_at DESC LIMIT 100',u.id)}
function canReadOrder(u,o){return u.role==='admin'||o.customer_id===u.id||o.rider_id===u.id||(u.role==='merchant'&&o.shop_id===u.shop_id)}
const clients=new Map();function emit(){for(const [res] of clients){try{res.write('event: refresh\ndata: {}\n\n')}catch{clients.delete(res)}}}
function transaction(fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}
function addEvent(orderId,u,status,note=''){run('INSERT INTO order_events(order_id,actor_id,status,note,created_at) VALUES(?,?,?,?,?)',orderId,u.id,status,note,now())}
const buckets=new Map();function limit(req,key,max=200){const ip=req.socket.remoteAddress;const k=ip+':'+key;let b=buckets.get(k);if(!b||b.until<Date.now()){b={n:0,until:Date.now()+60000};buckets.set(k,b)}if(++b.n>max)fail(429,'ทำรายการบ่อยเกินไป กรุณารอสักครู่')}
function send(res,status,value){const task=saveQueue.then(async()=>{await persistState();if(!res.destroyed){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value))}});saveQueue=task.catch(()=>{});return task}
async function body(req){let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>3500000)fail(413,'รูปหรือข้อมูลใหญ่เกินไป');chunks.push(chunk)}try{return JSON.parse(Buffer.concat(chunks).toString()||'{}')}catch{fail(400,'JSON ไม่ถูกต้อง')}}
function checkOrigin(req){const allowed=process.env.APP_ORIGIN||'http://'+req.headers.host;const origin=req.headers.origin;if(origin&&origin!==allowed)fail(403,'Origin ไม่ถูกต้อง');if(req.headers['sec-fetch-site']==='cross-site')fail(403,'ไม่รับคำขอข้ามเว็บไซต์')}
let importBusy=false;
async function importOSM(u){
 if(importBusy)fail(409,'กำลังนำเข้าข้อมูล กรุณารอ');importBusy=true;
 try{
 const query='[out:json][timeout:40];area["boundary"="administrative"]["admin_level"="6"]["name"~"กระนวน"]->.a;(nwr["amenity"~"^(restaurant|cafe|fast_food|food_court)$"](area.a);nwr["shop"](area.a);nwr["craft"](area.a););out tags center 1000;';
 let data;for(const endpoint of ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter']){try{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'data='+encodeURIComponent(query),signal:AbortSignal.timeout(50000)});if(r.ok){data=await r.json();break}else if(r.status===406||r.status===405){const retry=await fetch(endpoint+'?data='+encodeURIComponent(query),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(45000)});if(retry.ok){data=await retry.json();break}}}catch{}}
 if(!data?.elements)fail(502,'เชื่อม OpenStreetMap ไม่สำเร็จ ลองใหม่หรือนำเข้าไฟล์ JSON');
 return importShops(u,data);
 }finally{importBusy=false}
}
function importShops(u,data){
 const osm=Array.isArray(data.elements),rows=osm?data.elements:data.shops;if(!Array.isArray(rows)||rows.length>1000)fail(400,'ใช้ JSON {shops:[...]} หรือ Overpass JSON สูงสุด 1,000 รายการ');
 let added=0,skipped=0;
 transaction(()=>{for(const r of rows){const t=osm?(r.tags||{}):r;const name=text(t['name:th']||t.name);if(!name){skipped++;continue}
 const source=osm?'OpenStreetMap':text(r.source||'manual import'),sourceId=osm?'osm:'+r.type+':'+r.id:text(r.source_id)||('import:'+hash(source+'|'+name+'|'+text(r.address,500))); 
 if(sourceId&&get('SELECT id FROM shops WHERE source_id=?',sourceId)){skipped++;continue}
 const lat=coord(osm?(r.lat??r.center?.lat):r.lat,-90,90),lng=coord(osm?(r.lon??r.center?.lon):r.lng,-180,180);
 const category=osm?(t.amenity==='cafe'?'เครื่องดื่ม':['restaurant','fast_food','food_court'].includes(t.amenity)?'อาหาร':t.craft?'บริการ':'ร้านค้า'):text(r.category||'ร้านค้า');
 if(!['อาหาร','เครื่องดื่ม','บริการ','ร้านค้า'].includes(category))fail(400,'หมวดหมู่ไม่ถูกต้อง');
 const address=osm?[t['addr:housenumber'],t['addr:street'],t['addr:subdistrict'],t['addr:district']].filter(Boolean).join(' '):text(r.address,500);
 run('INSERT INTO shops(id,name,category,address,phone,lat,lng,source,source_id,source_url,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',id(),name,category,address,text(t.phone||t['contact:phone'],30),lat,lng,source,sourceId,osm?'https://www.openstreetmap.org/'+r.type+'/'+r.id:text(r.source_url,500),now());added++;
 }audit(u,'import shops',String(added))});emit();return {added,skipped,total:rows.length,note:'นำเข้าเป็นร้านที่ยังไม่ตรวจสอบทั้งหมด'};
}
async function api(req,res,url){
 checkOrigin(req);let u=session(req);const method=req.method,p=url.pathname;limit(req,p==='/api/login'?'login':'api:'+(u?.id||'public'),p==='/api/login'?10:240);
 if(p==='/api/session'&&method==='POST'){if(u)return send(res,200,{user:publicUser(u),csrf:u.csrf});const uid=id();run('INSERT INTO users(id,role,name,created_at) VALUES(?,?,?,?)',uid,'customer','ลูกค้ากระนวน',now());return send(res,201,newSession(res,uid))}
 if(p==='/api/shops'&&method==='GET')return send(res,200,all('SELECT * FROM shops ORDER BY name').map(s=>{const v=shopView(s);delete v.survey_note;delete v.verified_by;return v}));
 if(p==='/api/menus'&&method==='GET'){const shopId=required(url.searchParams.get('shop'),'ร้าน');return send(res,200,all('SELECT id,shop_id,name,price_satang,image_url,available FROM menus WHERE shop_id=? ORDER BY name',shopId).map(m=>({...m,price:m.price_satang/100,available:!!m.available})))}
 if(p==='/api/config'&&method==='GET')return send(res,200,{delivery_fee:Number(process.env.DELIVERY_FEE_THB||25)});
 if(p==='/api/health')return send(res,200,{ok:true});
 needUser(u);
 if(!['GET','HEAD'].includes(method)&&req.headers['x-csrf-token']!==u.csrf)fail(403,'เซสชันเปลี่ยน กรุณาโหลดหน้าใหม่');
 const b=['POST','PATCH','PUT'].includes(method)?await body(req):{};
 if(p==='/api/login'&&method==='POST'){
 const user=get('SELECT * FROM users WHERE username=?',text(b.username,80));if(!user?.password_hash||!checkPass(text(b.password,200),user.password_hash))fail(401,'ชื่อบัญชีหรือรหัสผ่านไม่ถูกต้อง');
 for(const [stream,s] of clients)if(s.token===u.token_hash){stream.end();clients.delete(stream)}run('DELETE FROM sessions WHERE token_hash=?',u.token_hash);return send(res,200,newSession(res,user.id));
 }
 if(p==='/api/logout'&&method==='POST'){for(const [stream,s] of clients)if(s.token===u.token_hash){stream.end();clients.delete(stream)}run('DELETE FROM sessions WHERE token_hash=?',u.token_hash);res.setHeader('Set-Cookie','kranuan_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'+(production?'; Secure':''));return send(res,200,{ok:true})}
 if(p==='/api/events'&&method==='GET'){
 if([...clients.values()].filter(s=>s.token===u.token_hash).length>=3)fail(429,'เปิดหน้าจอแจ้งเตือนมากเกินไป');res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write('event: refresh\ndata: {}\n\n');clients.set(res,{token:u.token_hash});req.on('close',()=>clients.delete(res));return;
 }
 if(p==='/api/presence'&&method==='POST'){needUser(u,['rider']);run('UPDATE users SET online=? WHERE id=?',b.online?1:0,u.id);return send(res,200,{ok:true})}
 if(p==='/api/reports'&&method==='POST'){run('INSERT INTO reports VALUES(?,?,?,?,?)',id(),u.id,text(b.kind,50),JSON.stringify(b).slice(0,10000),now());return send(res,201,{ok:true,message:'บันทึกเรื่องแล้ว ยังไม่มีระบบโทรหรือแจ้งเจ้าหน้าที่ภายนอก'})}
 if(p==='/api/orders'&&method==='GET')return send(res,200,visibleOrders(u).map(o=>orderView(o,u)));
 if(p==='/api/orders'&&method==='POST'){
 const idem=required(req.headers['idempotency-key'],'รหัสคำขอ',100),old=get('SELECT * FROM orders WHERE customer_id=? AND idempotency_key=?',u.id,idem);if(old)return send(res,200,orderView(old,u));
 needUser(u,['customer']);const name=required(b.customer_name,'ชื่อผู้รับ',100),phone=required(b.phone,'เบอร์โทร',30),dropoff=required(b.dropoff,'ที่อยู่ปลายทาง',500);if(!/^\+?[0-9]{9,15}$/.test(phone))fail(400,'เบอร์โทรไม่ถูกต้อง');
 const lat=coord(b.lat,-90,90),lng=coord(b.lng,-180,180);if((lat===null)!==(lng===null))fail(400,'ต้องระบุพิกัดทั้งสองค่า');
 const orderId=transaction(()=>{
 const oid=id();let shop=null,items=[],goods=0,status='ready',snapshot,kind='parcel',pickup=required(b.kind==='parcel'?b.pickup:'ร้านต้นทาง','ต้นทาง',500);
 if(b.kind!=='parcel'){
 shop=get('SELECT * FROM shops WHERE id=?',text(b.shop_id));if(!shop||shop.verification!=='verified'||!shop.opt_in||!shop.accepting)fail(409,'ร้านนี้ยังไม่เปิดรับออเดอร์');
 if(!Array.isArray(b.items)||!b.items.length||b.items.length>20)fail(400,'เลือกสินค้า 1–20 รายการ');const menuIds=new Set();
 for(const line of b.items){if(menuIds.has(line.menu_id))fail(400,'รายการสินค้าซ้ำ');menuIds.add(line.menu_id);const m=get('SELECT * FROM menus WHERE id=? AND shop_id=?',text(line.menu_id),shop.id);if(!m?.available)fail(409,'บางรายการหมดหรือเปลี่ยนแปลง กรุณาเลือกใหม่');const q=Number(line.quantity);if(!Number.isInteger(q)||q<1||q>20)fail(400,'จำนวนต้องอยู่ระหว่าง 1–20');items.push({menu_id:m.id,name:m.name,quantity:q,price:m.price_satang/100,image_url:m.image_url});goods+=m.price_satang*q}
 if(goods>1000000)fail(400,'ยอดสินค้าสูงเกินวงเงิน 10,000 บาท');kind='food';pickup=shop.address||shop.name;status=shop.order_mode==='merchant_confirm'?'waiting':'ready';
 snapshot={shop:shop.name,shop_image_url:shop.image_url,items,order_mode:shop.order_mode,pickup_lat:shop.lat,pickup_lng:shop.lng};
 }else snapshot={shop:'งานรับ–ส่งของ',description:required(b.description,'รายละเอียดสิ่งของ',300),items:[],order_mode:'rider_purchase'};
 const fee=Math.round(Number(process.env.DELIVERY_FEE_THB||25)*100);if(!Number.isInteger(fee)||fee<0)fail(500,'ตั้งค่าค่าส่งไม่ถูกต้อง');
 run('INSERT INTO orders(id,customer_id,shop_id,status,kind,snapshot,pickup,dropoff,customer_name,phone,lat,lng,note,image,inside_image,goods_satang,fee_satang,created_at,updated_at,idempotency_key) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',oid,u.id,shop?.id||null,status,kind,JSON.stringify(snapshot),pickup,dropoff,name,phone,lat,lng,text(b.note,500),imageURL(b.image),imageURL(b.inside_image),goods,fee,now(),now(),idem);
 addEvent(oid,u,status);return oid;
 });emit();return send(res,201,orderView(get('SELECT * FROM orders WHERE id=?',orderId),u));
 }
 const orderMatch=p.match(/^\/api\/orders\/([^/]+)(?:\/(claim|status|events))?$/);
 if(orderMatch){const oid=orderMatch[1],action=orderMatch[2],o=get('SELECT * FROM orders WHERE id=?',oid);if(!o)fail(404,'ไม่พบงาน');
 if(action==='events'&&method==='GET'){if(!canReadOrder(u,o))fail(403,'ไม่มีสิทธิ์ดูงาน');return send(res,200,all('SELECT status,note,created_at FROM order_events WHERE order_id=? ORDER BY id',oid))}
 if(action==='claim'&&method==='POST'){
 needUser(u,['rider']);if(!u.online)fail(409,'เปิดออนไลน์ก่อนรับงาน');
 transaction(()=>{if(get("SELECT id FROM orders WHERE rider_id=? AND status IN ('assigned','picked')",u.id))fail(409,'ส่งงานปัจจุบันให้เสร็จก่อน');const r=run("UPDATE orders SET status='assigned',rider_id=?,updated_at=? WHERE id=? AND status='ready' AND rider_id IS NULL",u.id,now(),oid);if(!r.changes)fail(409,'งานถูกยกเลิกหรือไรเดอร์คนอื่นรับแล้ว');addEvent(oid,u,'assigned')});emit();return send(res,200,orderView(get('SELECT * FROM orders WHERE id=?',oid),u));
 }
 if(action==='status'&&method==='POST'){
 const next=text(b.status,20);let allowed=false;
 if(u.role==='rider'&&o.rider_id===u.id)allowed=(o.status==='assigned'&&next==='picked')||(o.status==='picked'&&next==='done');
 if(u.role==='merchant'&&u.shop_id===o.shop_id)allowed=o.status==='waiting'&&['ready','cancelled'].includes(next);
 if(o.customer_id===u.id)allowed=['waiting','ready'].includes(o.status)&&next==='cancelled';
 if(u.role==='admin')allowed=['waiting','ready','assigned'].includes(o.status)&&next==='cancelled';
 if(!allowed)fail(409,'เปลี่ยนสถานะนี้ไม่ได้ หรือคุณไม่มีสิทธิ์');
 transaction(()=>{const r=run('UPDATE orders SET status=?,updated_at=? WHERE id=? AND status=?',next,now(),oid,o.status);if(!r.changes)fail(409,'สถานะเปลี่ยนแล้ว กรุณาโหลดใหม่');addEvent(oid,u,next,text(b.note,500))});emit();return send(res,200,orderView(get('SELECT * FROM orders WHERE id=?',oid),u));
 }
 }
 if(p==='/api/admin/shops'&&method==='GET'){needUser(u,['admin','merchant']);return send(res,200,(u.role==='admin'?all('SELECT * FROM shops ORDER BY name'):all('SELECT * FROM shops WHERE id=?',u.shop_id)).map(shopView))}
 if(p==='/api/admin/shops'&&method==='POST'){
 needUser(u,['admin']);const sid=id(),cat=text(b.category);if(!['อาหาร','เครื่องดื่ม','บริการ','ร้านค้า'].includes(cat))fail(400,'หมวดหมู่ไม่ถูกต้อง');run('INSERT INTO shops(id,name,category,address,phone,lat,lng,image_url,source,source_url,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',sid,required(b.name,'ชื่อร้าน'),cat,text(b.address,500),text(b.phone,30),coord(b.lat,-90,90),coord(b.lng,-180,180),imageURL(b.image_url),text(b.source||'survey'),text(b.source_url,500),now());audit(u,'create shop',sid);emit();return send(res,201,shopView(get('SELECT * FROM shops WHERE id=?',sid)));
 }
 const shopMatch=p.match(/^\/api\/admin\/shops\/([^/]+)(?:\/(verify|availability))?$/);
 if(shopMatch&&method==='POST'){
 const sid=shopMatch[1],action=shopMatch[2],s=get('SELECT * FROM shops WHERE id=?',sid);if(!s)fail(404,'ไม่พบร้าน');ownShop(u,sid);
 if(action==='verify'){needUser(u,['admin']);const verified=b.verified===true;if(verified)required(b.survey_note,'รายละเอียดการตรวจสอบ',1000);run('UPDATE shops SET verification=?,verified_at=?,verified_by=?,survey_note=?,accepting=CASE WHEN ?=0 THEN 0 ELSE accepting END,updated_at=? WHERE id=?',verified?'verified':'unverified',verified?now():null,verified?u.id:null,text(b.survey_note,1000),verified?1:0,now(),sid);audit(u,verified?'verify shop':'unverify shop',sid)}
 else if(action==='availability'){
 const opening=b.accepting===true;if(opening&&(s.verification!=='verified'||!s.opt_in||!['อาหาร','เครื่องดื่ม'].includes(s.category)||!get('SELECT id FROM menus WHERE shop_id=? AND available=1',sid)))fail(409,'ต้องยืนยันร้าน เข้าร่วมระบบ และมีเมนูพร้อมขายก่อนเปิดรับออเดอร์');
 if(opening&&s.order_mode==='merchant_confirm'&&!get("SELECT id FROM users WHERE role='merchant' AND shop_id=?",sid))fail(409,'สร้างบัญชีร้านก่อนใช้โหมดร้านยืนยัน');
 run('UPDATE shops SET accepting=?,updated_at=? WHERE id=?',opening?1:0,now(),sid);audit(u,opening?'open shop':'close shop',sid)
 }else{
 const admin=u.role==='admin',category=admin?text(b.category||s.category):s.category;if(!['อาหาร','เครื่องดื่ม','บริการ','ร้านค้า'].includes(category))fail(400,'หมวดหมู่ไม่ถูกต้อง');const opt=admin?(b.opt_in===true):!!s.opt_in,mode=admin?text(b.order_mode||s.order_mode):s.order_mode;if(!['rider_purchase','merchant_confirm'].includes(mode))fail(400,'โหมดรับงานไม่ถูกต้อง');if(s.accepting&&mode==='merchant_confirm'&&!get("SELECT id FROM users WHERE role='merchant' AND shop_id=?",sid))fail(409,'สร้างบัญชีร้านก่อนเปลี่ยนโหมด');
 run('UPDATE shops SET name=?,category=?,address=?,phone=?,lat=?,lng=?,image_url=?,opt_in=?,order_mode=?,accepting=CASE WHEN ?=0 OR ? NOT IN (\'อาหาร\',\'เครื่องดื่ม\') THEN 0 ELSE accepting END,updated_at=? WHERE id=?',required(b.name,'ชื่อร้าน'),category,text(b.address,500),text(b.phone,30),coord(b.lat,-90,90),coord(b.lng,-180,180),imageURL(b.image_url),opt?1:0,mode,opt?1:0,category,now(),sid);audit(u,'edit shop',sid)
 }
 emit();return send(res,200,shopView(get('SELECT * FROM shops WHERE id=?',sid)));
 }
 if(p==='/api/admin/menus'&&method==='POST'){
 const sid=required(b.shop_id,'ร้าน');ownShop(u,sid);if(!get('SELECT id FROM shops WHERE id=?',sid))fail(404,'ไม่พบร้าน');const price=Number(b.price);if(!Number.isFinite(price)||price<0||price>10000)fail(400,'ราคาไม่ถูกต้อง');const mid=text(b.id)||id(),existing=get('SELECT * FROM menus WHERE id=?',mid);if(existing&&existing.shop_id!==sid)fail(403,'เมนูอยู่คนละร้าน');
 run('INSERT INTO menus(id,shop_id,name,price_satang,image_url,available) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,price_satang=excluded.price_satang,image_url=excluded.image_url,available=excluded.available',mid,sid,required(b.name,'ชื่อเมนู'),Math.round(price*100),imageURL(b.image_url),b.available===false?0:1);
 if(!get('SELECT id FROM menus WHERE shop_id=? AND available=1',sid))run('UPDATE shops SET accepting=0 WHERE id=?',sid);audit(u,'save menu',mid);emit();return send(res,200,{id:mid});
 }
 if(p==='/api/admin/users'&&method==='GET'){needUser(u,['admin']);return send(res,200,all("SELECT id,username,role,name,shop_id,online FROM users WHERE role<>'customer'"))}
 if(p==='/api/admin/users'&&method==='POST'){
 needUser(u,['admin']);const role=text(b.role),username=required(b.username,'ชื่อบัญชี',80),password=required(b.password,'รหัสผ่าน',200);if(!['rider','merchant'].includes(role))fail(400,'สร้างได้เฉพาะไรเดอร์หรือร้านค้า');if(password.length<12)fail(400,'รหัสผ่านอย่างน้อย 12 ตัวอักษร');if(get('SELECT id FROM users WHERE username=?',username))fail(409,'ชื่อบัญชีซ้ำ');const sid=role==='merchant'?required(b.shop_id,'ร้าน'):null;if(sid&&!get('SELECT id FROM shops WHERE id=?',sid))fail(400,'ไม่พบร้าน');const uid=id();run('INSERT INTO users(id,username,password_hash,role,name,shop_id,created_at) VALUES(?,?,?,?,?,?,?)',uid,username,passHash(password),role,required(b.name,'ชื่อ'),sid,now());audit(u,'create user',uid);return send(res,201,{id:uid});
 }
 const userReset=p.match(/^\/api\/admin\/users\/([^/]+)\/password$/);
 if(userReset&&method==='POST'){needUser(u,['admin']);const target=get("SELECT * FROM users WHERE id=? AND role<>'customer'",userReset[1]);if(!target)fail(404,'ไม่พบบัญชีทีมงาน');const password=required(b.password,'รหัสผ่านใหม่',200);if(password.length<12)fail(400,'รหัสผ่านอย่างน้อย 12 ตัวอักษร');run('UPDATE users SET password_hash=?,online=0 WHERE id=?',passHash(password),target.id);run('DELETE FROM sessions WHERE user_id=?',target.id);for(const [stream,s]of clients)if(!get('SELECT token_hash FROM sessions WHERE token_hash=?',s.token)){stream.end();clients.delete(stream)}audit(u,'reset password',target.id);return send(res,200,{ok:true})}
 if(p==='/api/admin/import'&&method==='POST'){needUser(u,['admin']);return send(res,200,b.osm===true?await importOSM(u):importShops(u,b))}
 if(p==='/api/admin/reports'&&method==='GET'){needUser(u,['admin']);return send(res,200,all('SELECT id,kind,payload,created_at FROM reports ORDER BY created_at DESC LIMIT 100'))}
 fail(404,'ไม่พบ API');
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.json':'application/json'};
const server=http.createServer(async(req,res)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','SAMEORIGIN');res.setHeader('Permissions-Policy','geolocation=(self), camera=(self)');try{
 const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/'))return await api(req,res,url);
 if(!['GET','HEAD'].includes(req.method))fail(405,'Method not allowed');let file=decodeURIComponent(url.pathname);if(file.endsWith('/'))file+='index.html';file=path.resolve(publicDir,'.'+file);if(!file.startsWith(publicDir+path.sep))fail(403,'Forbidden');if(!fs.existsSync(file)||!fs.statSync(file).isFile())fail(404,'File not found');res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
 }catch(e){if(!res.headersSent){if(!e.status)console.error('Request failed:',e.message);send(res,e.status||500,{error:e.status?e.message:'ระบบขัดข้อง กรุณาลองใหม่'})}else res.end()}});
if(require.main===module)process.once('SIGTERM',()=>{for(const [res]of clients)res.end();server.close(()=>{db.close();process.exit(0)});setTimeout(()=>process.exit(0),10000).unref()});
const heartbeat=setInterval(()=>{for(const [res,s] of clients){if(!get('SELECT token_hash FROM sessions WHERE token_hash=? AND expires>?',s.token,Date.now())){res.end();clients.delete(res)}else res.write(': heartbeat\n\n')}for(const [k,b]of buckets)if(b.until<Date.now())buckets.delete(k);run('DELETE FROM sessions WHERE expires<?',Date.now())},25000);heartbeat.unref();
if(require.main===module)initialize().then(()=>server.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Kranuan server listening on '+(process.env.PORT||3000)))).catch(e=>{console.error('Startup failed:',e.message);process.exit(1)});
module.exports={server,db,initialize};
