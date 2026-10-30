
'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const publicDir=path.join(__dirname,'public');
const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync(path.join(__dirname,'schema.sql'),'utf8'));db.exec('PRAGMA busy_timeout=5000');
const now=()=>new Date().toISOString(),id=()=>crypto.randomUUID(),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const get=(sql,...v)=>db.prepare(sql).get(...v),all=(sql,...v)=>db.prepare(sql).all(...v),run=(sql,...v)=>db.prepare(sql).run(...v);
const FIREBASE_TABLES=['users','shops','menus','sessions','orders','order_events','reports','audit','market_listings','market_comments','market_reports','staff_profiles','shop_reviews','rider_gallery','ads','member_profiles','member_identities'];
let firebaseRef=null,saveQueue=Promise.resolve(),firebaseBaseline={};
function serializeTables(){const tables={};for(const table of FIREBASE_TABLES){const rows=all('SELECT * FROM '+table);tables[table]=JSON.stringify(Object.fromEntries(rows.map((r,i)=>[String(r.id??i),r])))}return tables}
async function persistState(){if(!firebaseRef)return;const current=serializeTables(),updates={};for(const table of FIREBASE_TABLES)if(current[table]!==firebaseBaseline[table])updates['tables/'+table]=JSON.parse(current[table]);if(!Object.keys(updates).length)return;updates.version=1;/* update() touches only the listed tables, so tables this version does not know are never deleted */await firebaseRef.update(updates);firebaseBaseline=current}
async function initialize(){
 db.exec(fs.readFileSync(path.join(__dirname,'schema.sql'),'utf8'));
 if(process.env.KRANUAN_TEST_SQLITE==='1')return seedAdmin();
 const key=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;if(!key||!process.env.FIREBASE_DATABASE_URL)throw Error('Set FIREBASE_SERVICE_ACCOUNT_JSON and FIREBASE_DATABASE_URL.');
 const admin=require('firebase-admin');const credential=admin.credential.cert(JSON.parse(key));
 const app=admin.apps[0]||admin.initializeApp({credential,databaseURL:process.env.FIREBASE_DATABASE_URL});
 firebaseRef=app.database().ref('/kranuanonline/backend_v1/state');const saved=(await firebaseRef.get()).val();
  // รองรับคอลัมน์เก่าจาก Firebase ก่อน Restore
  if (saved?.version === 1 && saved.tables) {
    for (const table of FIREBASE_TABLES) {
      const existing = new Set(
        db.prepare(`PRAGMA table_info("${table}")`)
          .all().map(c => c.name)
      );

      for (const row of Object.values(saved.tables[table] || {})) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
          throw new Error(`Invalid Firebase row in ${table}`);
        }

        for (const column of Object.keys(row)) {
          if (existing.has(column)) continue;

          if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(column)) {
            throw new Error(`Invalid column: ${column}`);
          }

          db.exec(
            `ALTER TABLE "${table}" ADD COLUMN "${column}" TEXT`
          );
          existing.add(column);
          console.log(`Restored legacy column: ${table}.${column}`);
        }
      }
    }
  }

 if(saved?.version===1&&saved.tables){db.exec('BEGIN');try{for(const table of [...FIREBASE_TABLES].reverse())db.exec('DELETE FROM '+table);for(const table of FIREBASE_TABLES){for(const row of Object.values(saved.tables[table]||{})){const columns=Object.keys(row);run('INSERT INTO '+table+'('+columns.join(',')+') VALUES('+columns.map(()=>'?').join(',')+')',...columns.map(k=>row[k]))}}db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}}
 firebaseBaseline=serializeTables();seedAdmin();await persistState();
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
function publicUser(u){return {id:u.id,username:u.username,role:u.role,name:u.name,shop_id:u.shop_id,online:!!u.online,accepts_rides:!!u.accepts_rides,member:accounts.verified(u.id),profile_complete:accounts.ready(u.id)}}
function session(req){const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('kranuan_session='))?.slice(16);if(!token)return null;const found=get('SELECT s.csrf,s.token_hash,u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>?',hash(token),Date.now());return found&&accounts.active(found.id)?found:null}
function newSession(res,userId){if(!accounts.active(userId))fail(403,'บัญชีนี้ถูกระงับ');const token=crypto.randomBytes(32).toString('hex'),csrf=crypto.randomBytes(24).toString('hex');run('INSERT INTO sessions VALUES(?,?,?,?)',hash(token),userId,csrf,Date.now()+30*86400000);res.setHeader('Set-Cookie','kranuan_session='+token+'; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000'+(production?'; Secure':''));return {user:publicUser(get('SELECT * FROM users WHERE id=?',userId)),csrf}}
function needUser(u,roles){if(!u)fail(401,'กรุณาเข้าสู่ระบบ');if(roles&&!roles.includes(u.role))fail(403,'บัญชีนี้ไม่มีสิทธิ์ทำรายการ');return u}
function ownShop(u,shopId){needUser(u,['admin','merchant']);if(u.role==='merchant'&&u.shop_id!==shopId)fail(403,'แก้ไขได้เฉพาะร้านของคุณ')}
function audit(u,action,target){run('INSERT INTO audit(actor_id,action,target,created_at) VALUES(?,?,?,?)',u.id,action,target,now())}
function adsToday(){return new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Bangkok'})}
function adView(a,admin){const img=a.image_url.startsWith('data:')?'/api/ads/'+a.id+'/image?v='+encodeURIComponent(a.updated_at):a.image_url;const v={id:a.id,kind:a.kind,title:a.title,text:a.text,tag:a.tag,image:img,link:a.link_url,linkLabel:a.link_label};if(admin)Object.assign(v,{enabled:!!a.enabled,start_date:a.start_date,end_date:a.end_date,sort_order:a.sort_order});return v}
function adsPublic(){const t=adsToday();return all('SELECT * FROM ads WHERE enabled=1 ORDER BY sort_order,created_at').filter(a=>(!a.start_date||t>=a.start_date)&&(!a.end_date||t<=a.end_date)).map(a=>adView(a))}
function shopView(s){return {...s,opt_in:!!s.opt_in,accepting:!!s.accepting}}
function orderView(o,u){const snap=JSON.parse(o.snapshot);return {rider:staffApi.publicInfo(o.rider_id),id:o.id,shop_id:o.shop_id,rider_id:o.rider_id,status:o.status,customer_id:o.customer_id,seller_id:snap.seller_id||null,listingId:snap.listing_id||null,paymentMethod:snap.payment_method||null,type:o.kind,vehicle:snap.vehicle||(['ride','parcel'].includes(o.kind)?'bike':null),vehicle_label:snap.vehicle==='car'?'รถยนต์':'รถจักรยานยนต์',passenger_count:snap.passenger_count||null,service_label:o.kind==='ride'?'รับ–ส่งผู้โดยสาร':o.kind==='parcel'?'รับ–ส่งของ':'อาหารจากร้าน',shop:snap.shop,shop_image_url:snap.shop_image_url||'',product_image_url:snap.items?.[0]?.image_url||'',items:snap.items||[],item:snap.items?.map(i=>i.name+' × '+i.quantity).join(', ')||snap.description,pickup:o.pickup,pickup_phone:snap.seller_phone||snap.shop_phone||'',pickup_lat:snap.pickup_lat??null,pickup_lng:snap.pickup_lng??null,dropoff:o.dropoff,customer_name:o.customer_name,phone:u.role==='rider'&&o.rider_id!==u.id?'':o.phone,dropoff_lat:o.lat,dropoff_lng:o.lng,note:o.note,image:o.image,insideImage:o.inside_image,goods_total:o.goods_satang/100,fee:o.fee_satang/100,deliveryFee:o.fee_satang/100,total:(o.goods_satang+o.fee_satang)/100,created_at:o.created_at,updated_at:o.updated_at,order_mode:snap.order_mode}}

function transportConfig(){const value=(key,fallback)=>{const n=Number(process.env[key]??fallback);if(!Number.isFinite(n)||n<0||n>10000)fail(500,'ตั้งค่าบริการรถไม่ถูกต้อง');return Math.round(n*100)/100};return {bike_base:value('DELIVERY_FEE_THB',25),bike_ride_base:value('RIDE_FEE_THB',process.env.DELIVERY_FEE_THB||25),car_base:value('TRANSPORT_CAR_BASE_THB',55),passenger_extra:value('TRANSPORT_PASSENGER_THB',15),bike_limit:1,car_limit:4}}
function transportVehicle(uid){const r=get("SELECT payload FROM reports WHERE user_id=? AND kind='transport_vehicle' ORDER BY created_at DESC LIMIT 1",uid);try{return JSON.parse(r?.payload||'{}').vehicle==='car'?'car':'bike'}catch{return 'bike'}}
function visibleOrders(u){if(u.role==='admin')return all('SELECT * FROM orders ORDER BY created_at DESC LIMIT 300');if(u.role==='merchant')return all("SELECT * FROM orders WHERE shop_id=? OR (kind='market' AND json_extract(snapshot,'$.seller_id')=?) ORDER BY created_at DESC LIMIT 100",u.shop_id,u.id);if(u.role==='rider')return all("SELECT * FROM orders WHERE rider_id=? OR (status='ready' AND rider_id IS NULL AND (kind<>'ride' OR ?=1)) ORDER BY created_at DESC LIMIT 100",u.id,u.accepts_rides?1:0).filter(o=>!['ride','parcel'].includes(o.kind)||(JSON.parse(o.snapshot).vehicle||'bike')===transportVehicle(u.id));return all("SELECT * FROM orders WHERE customer_id=? OR (kind='market' AND json_extract(snapshot,'$.seller_id')=?) ORDER BY created_at DESC LIMIT 100",u.id,u.id)}
function canReadOrder(u,o){return u.role==='admin'||o.customer_id===u.id||o.rider_id===u.id||(u.role==='merchant'&&o.shop_id===u.shop_id)||(o.kind==='market'&&JSON.parse(o.snapshot).seller_id===u.id)}
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
function importImage(r,t={}){
 let v=r.image_url||r.photo_url||r.image||t.image||'';if(Array.isArray(r.images))v=v||r.images[0]?.url||r.images[0]||'';
 if(!v&&t.wikimedia_commons&&/^File:/i.test(t.wikimedia_commons))v='https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(t.wikimedia_commons.replace(/^File:/i,''))+'?width=960';
 if(typeof v!=='string')return '';v=v.trim();if(v.startsWith('https://commons.wikimedia.org/wiki/File:'))v='https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(decodeURIComponent(v.split('/wiki/File:')[1]))+'?width=960';
 try{return imageURL(v)}catch{return ''}
}
function importCategory(r,t){
 const explicit=text(r.category);if(['อาหาร','เครื่องดื่ม','บริการ','ร้านค้า'].includes(explicit))return {category:explicit,category_basis:'หมวดที่ระบุในไฟล์'};
 const key=String(t.amenity||t.shop||t.craft||explicit).toLowerCase(),name=String(t['name:th']||r.name||t.name||'').toLowerCase();
 if(t.craft||/repair|hairdresser|beauty|laundry|car_wash|tailor/.test(key)||/ซ่อม|อิเล็คโทรนิค|อิเล็กทรอนิกส์|ทำเล็บ|เสริมสวย|ตัดผม|ซัก|ล้างรถ|การช่าง/.test(name))return {category:'บริการ',category_basis:'ประเภทบริการหรือคำในชื่อร้าน'};
 if(/cafe|coffee|tea|juice|bubble_tea/.test(key)||/คาเฟ่|คอฟฟี่|กาแฟ|ชานม|ชาไข่มุก|café|cafe|coffee|kaffe/.test(name))return {category:'เครื่องดื่ม',category_basis:'ประเภทต้นทางหรือคำเกี่ยวกับเครื่องดื่ม'};
 if(/restaurant|fast_food|food_court|bakery|confectionery|deli|ice_cream/.test(key)||/ก๋วยเตี๋ยว|ข้าวมันไก่|ข้าวหมู|กะเพรา|หมูกระทะ|ชาบู|สเต๊ก|steak|ครัว|อาหาร|เบเกอรี่|เบเกอรี|ขนม|หมี่เกี๊ยว/.test(name)||Array.isArray(r.menus)&&r.menus.length)return {category:'อาหาร',category_basis:'ประเภทต้นทาง ชื่อร้าน หรือรายการเมนู'};
 return {category:'ร้านค้า',category_basis:'หมวดทั่วไป กรุณาตรวจสอบหมวดก่อนใช้งาน'};
}
function importPlan(data){
 const osm=Array.isArray(data.elements);let rows=osm?data.elements:Array.isArray(data)?data:data.shops;
 if(!rows&&Array.isArray(data.menus)){const s=get('SELECT * FROM shops WHERE id=?',text(data.shop_id));if(!s)fail(400,'เลือกหน้าร้านก่อนนำเข้าไฟล์เมนู');rows=[{...s,menus:data.menus}]}
 if(!Array.isArray(rows)||rows.length>1000)fail(400,'ใช้ JSON {shops:[...]} หรือ {shop_id,menus:[...]} สูงสุด 1,000 ร้าน');
 return rows.map((r,index)=>{const t=osm?(r.tags||{}):r,name=text(t['name:th']||t.name);if(!name)return null;
 const source=osm?'OpenStreetMap':text(r.source||'JSON import'),source_id=osm?'osm:'+r.type+':'+r.id:text(r.source_id)||('import:'+hash(source+'|'+name+'|'+text(r.address,500)));
 const {category,category_basis}=importCategory(osm?{name}:r,t);
 const address=osm?[t['addr:housenumber'],t['addr:street'],t['addr:subdistrict'],t['addr:district']].filter(Boolean).join(' '):text(r.address,500);
 const existing=get('SELECT * FROM shops WHERE source_id=?',source_id)||(r.id?get('SELECT * FROM shops WHERE id=?',text(r.id)):null)||get('SELECT * FROM shops WHERE name=? AND address=?',name,address);
 const menus=Array.isArray(r.menus)?r.menus:[];if(menus.length>100)fail(400,'นำเข้าเมนูได้ไม่เกิน 100 เมนูต่อร้าน');
 return {index,name,category,category_basis,address,phone:text(t.phone||t['contact:phone'],30),lat:coord(osm?(r.lat??r.center?.lat):r.lat,-90,90),lng:coord(osm?(r.lon??r.center?.lon):r.lng,-180,180),image_url:importImage(r,t),source,source_id,source_url:osm?'https://www.openstreetmap.org/'+r.type+'/'+r.id:text(r.source_url,500),existing_id:existing?.id||null,menus:menus.map(m=>{const price=Number(m.price??(m.price_satang!==undefined?m.price_satang/100:NaN));if(!text(m.name)||!Number.isFinite(price)||price<0||price>10000)fail(400,'เมนูในร้าน '+name+' ต้องมีชื่อและราคา 0–10,000 บาท');return {name:text(m.name),price,image_url:importImage(m)}})}
 }).filter(Boolean).filter((row,i,rows)=>rows.findIndex(x=>x.source_id===row.source_id)===i);
}
function importShops(u,data){
 const plan=importPlan(data);let added=0,skipped=0,images_added=0,menus_added=0;
 transaction(()=>{for(const r of plan){let sid=r.existing_id;
 if(sid){skipped++;const old=get('SELECT * FROM shops WHERE id=?',sid);if(!old.image_url&&r.image_url){run('UPDATE shops SET image_url=?,updated_at=? WHERE id=?',r.image_url,now(),sid);images_added++}}
 else {sid=id();run('INSERT INTO shops(id,name,category,address,phone,lat,lng,image_url,source,source_id,source_url,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',sid,r.name,r.category,r.address,r.phone,r.lat,r.lng,r.image_url,r.source,r.source_id,r.source_url,now());added++;if(r.image_url)images_added++}
 for(const m of r.menus){const old=get('SELECT * FROM menus WHERE shop_id=? AND name=?',sid,m.name);if(old){if(!old.image_url&&m.image_url){run('UPDATE menus SET image_url=? WHERE id=?',m.image_url,old.id);images_added++}continue}run('INSERT INTO menus(id,shop_id,name,price_satang,image_url,available) VALUES(?,?,?,?,?,0)',id(),sid,m.name,Math.round(m.price*100),m.image_url);menus_added++;if(m.image_url)images_added++}
 }audit(u,'import shops and media',String(added))});emit();return {added,skipped,images_added,menus_added,total:plan.length,note:'เติมเฉพาะรูปที่ขาด ไม่เปลี่ยนสถานะร้าน เมนูนำเข้าใหม่พักขายไว้จนกว่าจะตรวจราคาและเปิดขาย'};
}
const accounts=require('./accounts.cjs')({db,get,all,run,fail,text,required,id,now,transaction,audit,send,newSession,publicUser,terminate:()=>{for(const [stream,s]of clients)if(!get('SELECT token_hash FROM sessions WHERE token_hash=?',s.token)){stream.end();clients.delete(stream)}}});
const staffApi=require('./staff.cjs')({get,all,run,fail,text,required,id,now,transaction,audit,emit,send});
const myActivity=require('./activity.cjs')({all,now});
const marketApi=require('./market.cjs')({get,all,run,fail,text,required,coord,imageURL,id,now,transaction,audit,emit,send,orderView});
async function api(req,res,url){
 checkOrigin(req);let u=session(req);const method=req.method,p=url.pathname;limit(req,p==='/api/login'?'login':'api:'+(u?.id||'public'),p==='/api/login'?10:240);
 if(p==='/api/session'&&method==='POST'){if(u)return send(res,200,{user:publicUser(u),csrf:u.csrf});const uid=id();run('INSERT INTO users(id,role,name,created_at) VALUES(?,?,?,?)',uid,'customer','ลูกค้ากระนวน',now());return send(res,201,newSession(res,uid))}
 if(p==='/api/shops'&&method==='GET')return send(res,200,all('SELECT * FROM shops ORDER BY name').map(s=>{const v=shopView(s);delete v.survey_note;delete v.verified_by;return v}));
 if(p==='/api/menus'&&method==='GET'){const shopId=required(url.searchParams.get('shop'),'ร้าน');return send(res,200,all('SELECT id,shop_id,name,price_satang,image_url,available FROM menus WHERE shop_id=? ORDER BY name',shopId).map(m=>({...m,price:m.price_satang/100,available:!!m.available})))}
 if(p==='/api/config'&&method==='GET')return send(res,200,{delivery_fee:Number(process.env.DELIVERY_FEE_THB||25),ride_fee:Number(process.env.RIDE_FEE_THB||process.env.DELIVERY_FEE_THB||25),ride_passenger_limit:1,transport:transportConfig()});

 if(p==='/api/catalog'&&method==='GET'){const pictures=all("SELECT shop_id,name,image_url FROM menus ORDER BY available DESC,name");const ratings=all('SELECT shop_id,COUNT(*) AS review_count,ROUND(AVG(rating),1) AS rating FROM shop_reviews GROUP BY shop_id');return send(res,200,all('SELECT id,image_url FROM shops').map(s=>({id:s.id,menu_names:pictures.filter(m=>m.shop_id===s.id).map(m=>m.name).slice(0,100),images:[...new Set([s.image_url,...pictures.filter(m=>m.shop_id===s.id).map(m=>m.image_url)].filter(Boolean))].slice(0,3),rating:ratings.find(r=>r.shop_id===s.id)?.rating??null,review_count:ratings.find(r=>r.shop_id===s.id)?.review_count||0})))}
 if(p==='/api/shop-reviews'&&method==='GET'){const sid=required(url.searchParams.get('shop'),'ร้าน');return send(res,200,all('SELECT rating,comment,created_at FROM shop_reviews WHERE shop_id=? ORDER BY created_at DESC LIMIT 20',sid))}
 const publicRiderPhoto=p.match(/^\/api\/riders\/([^/]+)\/photo\/(avatar|p[0-3])$/);if(publicRiderPhoto&&method==='GET'){const image=staffApi.publicPhoto(publicRiderPhoto[1],publicRiderPhoto[2]);if(!image)fail(404,'ยังไม่เผยแพร่รูปนี้');const match=image.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);if(!match)fail(404,'รูปไม่พร้อมใช้งาน');res.writeHead(200,{'Content-Type':match[1],'Cache-Control':'private, no-store'});return res.end(Buffer.from(match[2],'base64'))}
 if(p==='/api/riders'&&method==='GET')return send(res,200,{riders:staffApi.publicList(),vip:{available:false,price:299,currency:'THB',billing_period:null}});
 if(p==='/api/ads'&&method==='GET')return send(res,200,{ads:adsPublic()});
 // CMS: ข้อมูลที่เผยแพร่แล้วสำหรับหน้าเว็บไซต์
 if(p==='/api/site-cms'&&method==='GET'){
  if(!firebaseRef)return send(res,200,{settings:{}});
  const snap=await firebaseRef.child('site_cms/published').get();
  return send(res,200,{settings:snap.val()||{}});
 }

 const adImg=p.match(/^\/api\/ads\/([A-Za-z0-9-]+)\/image$/);if(adImg&&method==='GET'){const row=get('SELECT image_url FROM ads WHERE id=?',adImg[1]),m=row&&row.image_url.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);if(!m)fail(404,'ไม่พบรูปโฆษณา');res.writeHead(200,{'Content-Type':m[1],'Cache-Control':'public, max-age=86400'});return res.end(Buffer.from(m[2],'base64'))}
 if(p==='/api/health')return send(res,200,{ok:true});
 needUser(u);
 if(!['GET','HEAD'].includes(method)&&req.headers['x-csrf-token']!==u.csrf)fail(403,'เซสชันเปลี่ยน กรุณาโหลดหน้าใหม่');
 const b=['POST','PATCH','PUT'].includes(method)?await body(req):{};
 // CMS: อ่านฉบับร่าง (เฉพาะแอดมิน)
 if(p==='/api/admin/site-cms'&&method==='GET'){
  needUser(u,['admin']);
  if(!firebaseRef)fail(503,'Firebase ยังไม่พร้อม');
  const snap=await firebaseRef.child('site_cms').get();
  const value=snap.val()||{};
  return send(res,200,{
   draft:value.draft||{},
   settings:value.published||{}
  });
 }

 // CMS: บันทึกฉบับร่าง
 if(p==='/api/admin/site-cms'&&method==='POST'){
  needUser(u,['admin']);
  if(!firebaseRef)fail(503,'Firebase ยังไม่พร้อม');

  const input=b.settings;
  if(!input||typeof input!=='object'||
     Array.isArray(input))fail(400,'ข้อมูล CMS ไม่ถูกต้อง');

  const clean={
   brand_name:text(input.brand_name,100),
   logo:text(input.logo,1000),
   hero_image:text(input.hero_image,1000),
   hero_title:text(input.hero_title,150),
   hero_desc:text(input.hero_desc,300)
  };

  for(const key of ['logo','hero_image']){
   if(clean[key]&&!/^https:\/\//i.test(clean[key]))
    fail(400,'URL รูปต้องขึ้นต้นด้วย https://');
  }

  await firebaseRef.child('site_cms/draft').set(clean);
  audit(u,'save cms draft','website');
  return send(res,200,{ok:true});
 }

 // CMS: เผยแพร่ฉบับร่างสู่หน้าเว็บไซต์
 if(p==='/api/admin/site-cms/publish'&&method==='POST'){
  needUser(u,['admin']);
  if(!firebaseRef)fail(503,'Firebase ยังไม่พร้อม');

  const snap=await firebaseRef.child('site_cms/draft').get();
  const draft=snap.val();
  if(!draft)fail(400,'กรุณาบันทึกฉบับร่างก่อน');

  const published={
   brand_name:draft.brand_name||'',
   logo:draft.logo||'',
   heroes:{
    welcome:{
     image:draft.hero_image||'',
     title:draft.hero_title||'',
     desc:draft.hero_desc||''
    }
   },
   icons:{}
  };

  await firebaseRef.child('site_cms/published').set(published);
  audit(u,'publish cms','website');
  return send(res,200,{ok:true});
 }

 if(url.pathname.startsWith('/api/accounts/')||url.pathname.startsWith('/api/admin/members')){const handled=await accounts.handle(req,res,url,u,b);if(handled!==false)return handled;}
 if(method==='POST'&&['/api/orders','/api/market/orders'].includes(p)&&u.role==='customer'&&!accounts.verified(u.id))fail(401,'กรุณาเข้าสู่ระบบ Google ก่อนสั่งซื้อหรือเรียกรถ');
 if(method==='POST'&&['/api/orders','/api/market/orders'].includes(p)&&u.role==='customer'&&!accounts.ready(u.id))fail(428,'กรุณากรอกชื่อที่แสดง เบอร์โทร และพิกัดบ้านก่อนสั่งซื้อหรือเรียกรถ');
 if(p==='/api/my-activity'&&method==='GET')return send(res,200,myActivity(u.id));
 if(p==='/api/orders'&&method==='POST'&&(b.preferred_rider_id||b.selected_rider_id))fail(409,'ระบบเลือกไรเดอร์สำหรับ VIP ยังไม่เปิดใช้งาน');

 if(p==='/api/shop-reviews'&&method==='POST'){const order=get("SELECT * FROM orders WHERE id=? AND customer_id=? AND status='done' AND shop_id IS NOT NULL",text(b.order_id),u.id);if(!order)fail(403,'รีวิวร้านได้หลังออเดอร์ของคุณจัดส่งสำเร็จเท่านั้น');const rating=Number(b.rating);if(!Number.isInteger(rating)||rating<1||rating>5)fail(400,'คะแนนต้องเป็น 1–5');run('INSERT INTO shop_reviews(id,shop_id,order_id,user_id,rating,comment,created_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(order_id) DO UPDATE SET rating=excluded.rating,comment=excluded.comment',id(),order.shop_id,order.id,u.id,rating,text(b.comment,500),now());emit();return send(res,200,{ok:true})}
 if(p.startsWith('/api/staff/')||p==='/api/admin/staff'||p.startsWith('/api/admin/staff/'))return staffApi.route(req,res,url,u,b);
 if(p.startsWith('/api/market/'))return marketApi(req,res,url,u,b);
 if(p==='/api/login'&&method==='POST'){
 const user=get('SELECT * FROM users WHERE username=?',text(b.username,80));if(!user?.password_hash||!checkPass(text(b.password,200),user.password_hash))fail(401,'ชื่อบัญชีหรือรหัสผ่านไม่ถูกต้อง');
 for(const [stream,s] of clients)if(s.token===u.token_hash){stream.end();clients.delete(stream)}run('DELETE FROM sessions WHERE token_hash=?',u.token_hash);return send(res,200,newSession(res,user.id));
 }
 if(p==='/api/logout'&&method==='POST'){for(const [stream,s] of clients)if(s.token===u.token_hash){stream.end();clients.delete(stream)}run('DELETE FROM sessions WHERE token_hash=?',u.token_hash);res.setHeader('Set-Cookie','kranuan_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'+(production?'; Secure':''));return send(res,200,{ok:true})}
 if(p==='/api/events'&&method==='GET'){
 if([...clients.values()].filter(s=>s.token===u.token_hash).length>=3)fail(429,'เปิดหน้าจอแจ้งเตือนมากเกินไป');res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write('event: refresh\ndata: {}\n\n');clients.set(res,{token:u.token_hash});req.on('close',()=>clients.delete(res));return;
 }
 if(p==='/api/transport/search'&&method==='GET'){const query=required(url.searchParams.get('q'),'ชื่อสถานที่',200);limit(req,'transport-geocode',12);if(!process.env.GEOAPIFY_API_KEY)fail(503,'ยังไม่ได้ตั้งค่าค้นหาสถานที่ ใช้พิกัดหรือเลือกบนแผนที่แทนได้');const target=new URL('https://api.geoapify.com/v1/geocode/search');target.search=new URLSearchParams({text:query,lang:'th',format:'json',limit:'5',bias:'proximity:103.078,16.706',apiKey:process.env.GEOAPIFY_API_KEY}).toString();let response;try{response=await fetch(target,{signal:AbortSignal.timeout(8000)})}catch{fail(503,'ค้นหาสถานที่ไม่สำเร็จ ลองใหม่ภายหลัง')}if(!response.ok)fail(503,'บริการค้นหายังไม่พร้อม ใช้การปักหมุดแทนได้');const data=await response.json();return send(res,200,{results:(data.results||[]).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lon)).map(x=>({lat:x.lat,lng:x.lon,name:x.formatted||x.name||query})).slice(0,5),attribution:'Powered by Geoapify | © OpenStreetMap contributors'})}
 if(p==='/api/transport/vehicle'&&['GET','POST'].includes(method)){needUser(u,['rider']);if(method==='POST'){if(!['bike','car'].includes(b.vehicle))fail(400,'เลือกประเภทรถให้ถูกต้อง');if(get("SELECT id FROM orders WHERE rider_id=? AND status IN ('assigned','picked')",u.id))fail(409,'ส่งงานปัจจุบันให้เสร็จก่อนเปลี่ยนรถ');const r=get("SELECT id FROM reports WHERE user_id=? AND kind='transport_vehicle' ORDER BY created_at DESC LIMIT 1",u.id);if(r)run('UPDATE reports SET payload=?,created_at=? WHERE id=?',JSON.stringify({vehicle:b.vehicle}),now(),r.id);else run('INSERT INTO reports VALUES(?,?,?,?,?)',id(),u.id,'transport_vehicle',JSON.stringify({vehicle:b.vehicle}),now());emit()}return send(res,200,{vehicle:transportVehicle(u.id)})}
 if(p==='/api/presence'&&method==='POST'){needUser(u,['rider']);if(b.accepts_rides!==undefined&&typeof b.accepts_rides!=='boolean')fail(400,'สถานะรับส่งคนไม่ถูกต้อง');const online=b.online===undefined?!!u.online:b.online===true,rides=b.accepts_rides===undefined?!!u.accepts_rides:b.accepts_rides;run('UPDATE users SET online=?,accepts_rides=? WHERE id=?',online?1:0,rides?1:0,u.id);return send(res,200,{ok:true,user:publicUser(get('SELECT * FROM users WHERE id=?',u.id))})}
 if(p==='/api/reports'&&method==='POST'){run('INSERT INTO reports VALUES(?,?,?,?,?)',id(),u.id,text(b.kind,50),JSON.stringify(b).slice(0,10000),now());return send(res,201,{ok:true,message:'บันทึกเรื่องแล้ว ยังไม่มีระบบโทรหรือแจ้งเจ้าหน้าที่ภายนอก'})}
 if(p==='/api/orders'&&method==='GET')return send(res,200,visibleOrders(u).map(o=>orderView(o,u)));
 if(p==='/api/orders'&&method==='POST'){
 const idem=required(req.headers['idempotency-key'],'รหัสคำขอ',100),old=get('SELECT * FROM orders WHERE customer_id=? AND idempotency_key=?',u.id,idem);if(old)return send(res,200,orderView(old,u));
 needUser(u,['customer']);const name=required(b.customer_name,'ชื่อผู้รับ',100),phone=required(b.phone,'เบอร์โทร',30),dropoff=required(b.dropoff,'ที่อยู่ปลายทาง',500);if(!/^\+?[0-9]{9,15}$/.test(phone))fail(400,'เบอร์โทรไม่ถูกต้อง');
 const lat=coord(b.lat,-90,90),lng=coord(b.lng,-180,180);if((lat===null)!==(lng===null))fail(400,'ต้องระบุพิกัดทั้งสองค่า');
 if(b.kind!==undefined&&!['food','parcel','ride'].includes(b.kind))fail(400,'ประเภทงานไม่ถูกต้อง');const isRide=b.kind==='ride',isTransport=isRide||b.kind==='parcel';
 const orderId=transaction(()=>{
 const oid=id();let shop=null,items=[],goods=0,status='ready',snapshot,kind=isRide?'ride':'parcel',pickup=required(isTransport?b.pickup:'ร้านต้นทาง','จุดรับ',500);
 if(!isTransport){
 shop=get('SELECT * FROM shops WHERE id=?',text(b.shop_id));if(!shop||shop.verification!=='verified'||!shop.opt_in||!shop.accepting)fail(409,'ร้านนี้ยังไม่เปิดรับออเดอร์');
 if(!Array.isArray(b.items)||!b.items.length||b.items.length>20)fail(400,'เลือกสินค้า 1–20 รายการ');const menuIds=new Set();
 for(const line of b.items){if(menuIds.has(line.menu_id))fail(400,'รายการสินค้าซ้ำ');menuIds.add(line.menu_id);const m=get('SELECT * FROM menus WHERE id=? AND shop_id=?',text(line.menu_id),shop.id);if(!m?.available)fail(409,'บางรายการหมดหรือเปลี่ยนแปลง กรุณาเลือกใหม่');const q=Number(line.quantity);if(!Number.isInteger(q)||q<1||q>20)fail(400,'จำนวนต้องอยู่ระหว่าง 1–20');items.push({menu_id:m.id,name:m.name,quantity:q,price:m.price_satang/100,image_url:m.image_url});goods+=m.price_satang*q}
 if(goods>1000000)fail(400,'ยอดสินค้าสูงเกินวงเงิน 10,000 บาท');kind='food';pickup=shop.address||shop.name;status=shop.order_mode==='merchant_confirm'?'waiting':'ready';
 snapshot={shop:shop.name,shop_image_url:shop.image_url,shop_phone:shop.phone,items,order_mode:shop.order_mode,pickup_lat:shop.lat,pickup_lng:shop.lng};
 }else {const pickupLat=coord(b.pickup_lat,-90,90),pickupLng=coord(b.pickup_lng,-180,180);if((pickupLat===null)!==(pickupLng===null))fail(400,'ระบุพิกัดจุดรับให้ครบทั้งสองค่า');const vehicle=b.vehicle===undefined?'bike':b.vehicle;if(!['bike','car'].includes(vehicle))fail(400,'ประเภทรถไม่ถูกต้อง');const passengers=isRide?Number(b.passenger_count??1):0;if(isRide&&(!Number.isInteger(passengers)||passengers<1||passengers>(vehicle==='car'?4:1)))fail(400,'จำนวนผู้โดยสารเกินความจุรถ');if(b.vehicle!==undefined){if(pickupLat===null||pickupLng===null||lat===null||lng===null)fail(400,'กรุณาปักหมุดจุดรับและจุดส่ง');if(!isRide&&b.inspection_consent!==true)fail(400,'กรุณายินยอมให้ตรวจสิ่งของก่อนรับส่ง');}snapshot={shop:isRide?'เรียกรถรับ–ส่งผู้โดยสาร':'เรียกไรเดอร์รับ–ส่งของ',vehicle,description:isRide?'ผู้โดยสาร '+passengers+' คน'+(text(b.description,200)?' · '+text(b.description,200):''):required(b.description,'รายละเอียดสิ่งของ',300),items:[],order_mode:'rider_purchase',pickup_lat:pickupLat,pickup_lng:pickupLng,passenger_count:isRide?passengers:null};}
 const rate=transportConfig();const transportFee=isTransport&&b.vehicle!==undefined?((b.vehicle==='car'?rate.car_base:isRide?rate.bike_ride_base:rate.bike_base)+(isRide?Number(b.passenger_count??1)*rate.passenger_extra:0)):null;const fee=transportFee!==null?Math.round(transportFee*100):Math.round(Number(isRide?(process.env.RIDE_FEE_THB||process.env.DELIVERY_FEE_THB||25):(process.env.DELIVERY_FEE_THB||25))*100);if(!Number.isInteger(fee)||fee<0)fail(500,'ตั้งค่าค่าส่งไม่ถูกต้อง');
 run('INSERT INTO orders(id,customer_id,shop_id,status,kind,snapshot,pickup,dropoff,customer_name,phone,lat,lng,note,image,inside_image,goods_satang,fee_satang,created_at,updated_at,idempotency_key) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',oid,u.id,shop?.id||null,status,kind,JSON.stringify(snapshot),pickup,dropoff,name,phone,lat,lng,text(b.note,500),imageURL(b.image),imageURL(b.inside_image),goods,fee,now(),now(),idem);
 addEvent(oid,u,status);return oid;
 });emit();return send(res,201,orderView(get('SELECT * FROM orders WHERE id=?',orderId),u));
 }
 const orderMatch=p.match(/^\/api\/orders\/([^/]+)(?:\/(claim|status|events|feedback))?$/);
 if(orderMatch){const oid=orderMatch[1],action=orderMatch[2],o=get('SELECT * FROM orders WHERE id=?',oid);if(!o)fail(404,'ไม่พบงาน');
 if(!action&&method==='GET'){if(!canReadOrder(u,o))fail(403,'ไม่มีสิทธิ์ดูงาน');return send(res,200,orderView(o,u))}
 if(action==='events'&&method==='GET'){if(!canReadOrder(u,o))fail(403,'ไม่มีสิทธิ์ดูงาน');return send(res,200,all('SELECT status,note,created_at FROM order_events WHERE order_id=? ORDER BY id',oid))}
 if(action==='feedback'){
 if(!canReadOrder(u,o))fail(403,'ไม่มีสิทธิ์ดูความคิดเห็นของออเดอร์นี้');
 const found=all("SELECT * FROM reports WHERE user_id=? AND kind='customer_feedback'",o.customer_id).find(r=>{try{return JSON.parse(r.payload).order_id===oid}catch{return false}});const oldFeedback=found?JSON.parse(found.payload):{};
 if(method==='GET')return send(res,200,oldFeedback);
 if(method==='POST'){if(o.customer_id!==u.id)fail(403,'เฉพาะผู้สั่งที่ให้คะแนนได้');if(o.status!=='done')fail(409,'ให้คะแนนและทิปได้เมื่อส่งสำเร็จแล้ว');let rating=oldFeedback.rating??null,tip=oldFeedback.tip_amount??null;if(b.rating!==undefined){rating=Number(b.rating);if(!Number.isInteger(rating)||rating<1||rating>5)fail(400,'คะแนนต้องเป็น 1–5');}if(b.tip_amount!==undefined){tip=Number(b.tip_amount);if(!Number.isInteger(tip)||tip<1||tip>10000)fail(400,'ทิปต้องเป็นจำนวนเต็ม 1–10,000 บาท');}if(b.rating===undefined&&b.tip_amount===undefined)fail(400,'ระบุคะแนนหรือจำนวนทิป');const payload={order_id:oid,rider_id:o.rider_id,rating,comment:b.comment===undefined?(oldFeedback.comment||''):text(b.comment,500),tip_amount:tip,tip_method:'direct',tip_status:tip?'intent':null,updated_at:now()};if(found)run('UPDATE reports SET payload=? WHERE id=?',JSON.stringify(payload),found.id);else run('INSERT INTO reports VALUES(?,?,?,?,?)',id(),u.id,'customer_feedback',JSON.stringify(payload),now());return send(res,200,{ok:true,paid:false,feedback:payload})}
 }
 if(action==='claim'&&method==='POST'){
 needUser(u,['rider']);if(['ride','parcel'].includes(o.kind)&&(JSON.parse(o.snapshot).vehicle||'bike')!==transportVehicle(u.id))fail(409,'งานนี้ต้องใช้ประเภทรถให้ตรงกับที่ลูกค้าเลือก');if(!u.online)fail(409,'เปิดออนไลน์ก่อนรับงาน');if(o.kind==='ride'&&!u.accepts_rides)fail(409,'เปิดรับงานส่งคนก่อนรับงานผู้โดยสาร');
 transaction(()=>{if(get("SELECT id FROM orders WHERE rider_id=? AND status IN ('assigned','picked')",u.id))fail(409,'ส่งงานปัจจุบันให้เสร็จก่อน');const r=run("UPDATE orders SET status='assigned',rider_id=?,updated_at=? WHERE id=? AND status='ready' AND rider_id IS NULL",u.id,now(),oid);if(!r.changes)fail(409,'งานถูกยกเลิกหรือไรเดอร์คนอื่นรับแล้ว');addEvent(oid,u,'assigned')});emit();return send(res,200,orderView(get('SELECT * FROM orders WHERE id=?',oid),u));
 }
 if(action==='status'&&method==='POST'){
 const next=text(b.status,20);let allowed=false;
 if(u.role==='rider'&&o.rider_id===u.id)allowed=(o.status==='assigned'&&next==='picked')||(o.status==='picked'&&next==='done');
 if(u.role==='merchant'&&u.shop_id===o.shop_id)allowed=o.status==='waiting'&&['ready','cancelled'].includes(next);
 if(o.customer_id===u.id)allowed=['waiting','ready'].includes(o.status)&&next==='cancelled';
 if(u.role==='admin')allowed=['waiting','ready','assigned'].includes(o.status)&&next==='cancelled';
 if(!allowed)fail(409,'เปลี่ยนสถานะนี้ไม่ได้ หรือคุณไม่มีสิทธิ์');
 transaction(()=>{const r=run('UPDATE orders SET status=?,updated_at=? WHERE id=? AND status=?',next,now(),oid,o.status);if(!r.changes)fail(409,'สถานะเปลี่ยนแล้ว กรุณาโหลดใหม่');addEvent(oid,u,next,text(b.note,500));if(o.kind==='market'){const listing=JSON.parse(o.snapshot).listing_id;if(next==='done')run("UPDATE market_listings SET stock='sold',updated_at=? WHERE id=?",Date.now(),listing);else if(next==='cancelled')run("UPDATE market_listings SET stock='available',updated_at=? WHERE id=? AND stock='reserved'",Date.now(),listing)}});emit();return send(res,200,orderView(get('SELECT * FROM orders WHERE id=?',oid),u));
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
 if(p==='/api/admin/ads'&&method==='GET'){needUser(u,['admin']);return send(res,200,all('SELECT * FROM ads ORDER BY kind,sort_order,created_at').map(a=>adView(a,true)))}
 if(p==='/api/admin/ads'&&method==='POST'){
  needUser(u,['admin']);const kind=text(b.kind);if(!['poster','popup'].includes(kind))fail(400,'ประเภทโฆษณาไม่ถูกต้อง');
  const aid=text(b.id,64)||id(),existing=get('SELECT * FROM ads WHERE id=?',aid);
  if(!existing&&get('SELECT COUNT(*) n FROM ads').n>=30)fail(400,'ลงโฆษณาได้ไม่เกิน 30 รายการ');
  const rawImg=text(b.image_url,1600000),img=/^\/api\/ads\/[A-Za-z0-9-]+\/image/.test(rawImg)?(existing?existing.image_url:''):imageURL(rawImg);
  if(img.startsWith('data:')&&img.length>700000)fail(400,'รูปโฆษณาใหญ่เกินไป (ไม่เกินประมาณ 500 KB)');
  const title=text(b.title,100);if(!title&&!img)fail(400,'กรุณาระบุหัวข้อหรือรูปโฆษณา');
  const link=text(b.link_url,500);if(link&&!/^https?:\/\//i.test(link))fail(400,'ลิงก์ต้องขึ้นต้นด้วย https:// หรือ http://');
  const sd=text(b.start_date,10),ed=text(b.end_date,10),okDate=v=>v===''||/^\d{4}-\d{2}-\d{2}$/.test(v);
  if(!okDate(sd)||!okDate(ed))fail(400,'รูปแบบวันที่ไม่ถูกต้อง');if(sd&&ed&&sd>ed)fail(400,'วันสิ้นสุดต้องไม่ก่อนวันเริ่ม');
  const order=Math.max(-1000,Math.min(10000,Math.round(Number(b.sort_order)||0))),stamp=now();
  run('INSERT INTO ads(id,kind,title,text,tag,image_url,link_url,link_label,start_date,end_date,sort_order,enabled,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET kind=excluded.kind,title=excluded.title,text=excluded.text,tag=excluded.tag,image_url=excluded.image_url,link_url=excluded.link_url,link_label=excluded.link_label,start_date=excluded.start_date,end_date=excluded.end_date,sort_order=excluded.sort_order,enabled=excluded.enabled,updated_at=excluded.updated_at',aid,kind,title,text(b.text,300),text(b.tag,30),img,link,text(b.link_label,40),sd,ed,order,b.enabled===false?0:1,stamp,stamp);
  audit(u,'save ad',aid);emit();return send(res,200,{id:aid});
 }
 const adDel=p.match(/^\/api\/admin\/ads\/([A-Za-z0-9-]+)\/delete$/);
 if(adDel&&method==='POST'){needUser(u,['admin']);if(!get('SELECT id FROM ads WHERE id=?',adDel[1]))fail(404,'ไม่พบโฆษณา');run('DELETE FROM ads WHERE id=?',adDel[1]);audit(u,'delete ad',adDel[1]);emit();return send(res,200,{ok:true})}
 if(p==='/api/admin/users'&&method==='GET'){needUser(u,['admin']);return send(res,200,all("SELECT id,username,role,name,shop_id,online FROM users WHERE role<>'customer'"))}
 if(p==='/api/admin/users'&&method==='POST'){
 needUser(u,['admin']);const role=text(b.role),username=required(b.username,'ชื่อบัญชี',80),password=required(b.password,'รหัสผ่าน',200);if(!['rider','merchant'].includes(role))fail(400,'สร้างได้เฉพาะไรเดอร์หรือร้านค้า');if(password.length<12)fail(400,'รหัสผ่านอย่างน้อย 12 ตัวอักษร');if(get('SELECT id FROM users WHERE username=?',username))fail(409,'ชื่อบัญชีซ้ำ');const sid=role==='merchant'?required(b.shop_id,'ร้าน'):null;if(sid&&!get('SELECT id FROM shops WHERE id=?',sid))fail(400,'ไม่พบร้าน');const uid=id();run('INSERT INTO users(id,username,password_hash,role,name,shop_id,created_at) VALUES(?,?,?,?,?,?,?)',uid,username,passHash(password),role,required(b.name,'ชื่อ'),sid,now());audit(u,'create user',uid);return send(res,201,{id:uid});
 }
 const userReset=p.match(/^\/api\/admin\/users\/([^/]+)\/password$/);
 if(userReset&&method==='POST'){needUser(u,['admin']);const target=get("SELECT * FROM users WHERE id=? AND role<>'customer'",userReset[1]);if(!target)fail(404,'ไม่พบบัญชีทีมงาน');const password=required(b.password,'รหัสผ่านใหม่',200);if(password.length<12)fail(400,'รหัสผ่านอย่างน้อย 12 ตัวอักษร');run('UPDATE users SET password_hash=?,online=0 WHERE id=?',passHash(password),target.id);run('DELETE FROM sessions WHERE user_id=?',target.id);for(const [stream,s]of clients)if(!get('SELECT token_hash FROM sessions WHERE token_hash=?',s.token)){stream.end();clients.delete(stream)}audit(u,'reset password',target.id);return send(res,200,{ok:true})}
 if(p==='/api/admin/import/preview'&&method==='POST'){needUser(u,['admin']);return send(res,200,{shops:importPlan(b)})}
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
