'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),promptpay=require('./promptpay.cjs');
module.exports=function createDispatch({db,clock=()=>Date.now(),persist=async()=>{},testMode=false}){
 let persisted=null,hasProfileTable=false,hasMemberTable=false;const tables=['dispatch_payees','dispatch_messages','dispatch_payments','dispatch_notices','dispatch_food_receipts','dispatch_community_messages'];let queue=Promise.resolve(),dirty=false;const streams=new Map(),buckets=new Map();
 const plain=r=>r&&typeof r==='object'?{...r}:r,get=(sql,...values)=>plain(db.prepare(sql).get(...values)),all=(sql,...values)=>db.prepare(sql).all(...values).map(plain),write=(sql,...values)=>{const result=db.prepare(sql).run(...values);if(result.changes)dirty=true;return result},now=()=>new Date(clock()).toISOString(),uid=()=>crypto.randomUUID(),digest=s=>crypto.createHash('sha256').update(s).digest('hex');
 const fail=(status,message)=>{throw Object.assign(Error(message),{status})},text=(v,max=200)=>typeof v==='string'?v.trim().slice(0,max):'';
 function snapshot(){return JSON.parse(JSON.stringify({version:1,tables:Object.fromEntries(tables.map(table=>[table,all('SELECT * FROM '+table)]))}))}
 async function save(){if(dirty){const next=snapshot();try{await persist(next);persisted=next;dirty=false}catch(e){if(persisted){db.exec('BEGIN');try{for(const table of tables){db.prepare('DELETE FROM '+table).run();for(const row of persisted.tables[table]||[]){const cols=Object.keys(row);db.prepare('INSERT INTO '+table+'('+cols.join(',')+') VALUES('+cols.map(()=>'?').join(',')+')').run(...cols.map(k=>row[k]))}}db.exec('COMMIT');dirty=false}catch(restoreError){db.exec('ROLLBACK');throw restoreError}}throw e}}}
 function notify(users){for(const [res,client]of streams)if(!users||users.includes(client.id)){if(!get('SELECT user_id FROM sessions WHERE token_hash=? AND expires>?',client.token,clock())){res.end();streams.delete(res);continue}try{res.write('event: refresh\ndata: {}\n\n')}catch{streams.delete(res)}}}
 function notice(user,order,kind,title,body,key=uid()){write('INSERT OR IGNORE INTO dispatch_notices(id,user_id,order_id,kind,title,body,created_at) VALUES(?,?,?,?,?,?,?)',key,user,order,kind,title,body,now())}
 function actor(req){const value=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('kranuan_session='))?.slice(16);if(!value)fail(401,'กรุณาเข้าสู่ระบบ');const token=digest(value),u=get('SELECT u.*,s.csrf,s.token_hash FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>?',token,clock());if(!u)fail(401,'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');return u}
 function origin(req){const allowed=process.env.APP_ORIGIN||'http://'+req.headers.host;if(req.headers.origin&&req.headers.origin!==allowed||req.headers['sec-fetch-site']==='cross-site')fail(403,'ไม่รับคำขอข้ามเว็บไซต์')}
 function limit(user,name,max){const key=user+':'+name;let b=buckets.get(key);if(!b||b.until<clock()){b={n:0,until:clock()+60000};buckets.set(key,b)}if(++b.n>max)fail(429,'ทำรายการบ่อยเกินไป กรุณารอสักครู่')}
 async function body(req){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>900000)fail(413,'ข้อมูลหรือรูปใหญ่เกินไป');chunks.push(Buffer.from(chunk))}try{return JSON.parse(Buffer.concat(chunks).toString()||'{}')}catch{fail(400,'ข้อมูล JSON ไม่ถูกต้อง')}}
 function orderFor(id,u){const o=get('SELECT * FROM orders WHERE id=?',id);if(!o)fail(404,'ไม่พบออเดอร์');if(o.customer_id!==u.id&&!(u.role==='rider'&&o.rider_id===u.id))fail(403,'เฉพาะลูกค้าและไรเดอร์ที่รับงานนี้');return o}
 function chatWindow(o){if(!o.rider_id||!['assigned','picked','done'].includes(o.status))return {open:false,closes_at:null};if(o.status!=='done')return {open:true,closes_at:null};const event=get("SELECT created_at FROM order_events WHERE order_id=? AND status='done' ORDER BY id LIMIT 1",o.id);const close=Date.parse(event?.created_at||o.updated_at)+3600000;return {open:clock()<close,closes_at:new Date(close).toISOString()}}
 function closedChatCleanup(){write("UPDATE dispatch_payments SET state='void' WHERE state='pending' AND order_id IN (SELECT id FROM orders WHERE status='cancelled')");for(const row of all('SELECT DISTINCT order_id FROM dispatch_messages')){const o=get('SELECT * FROM orders WHERE id=?',row.order_id);if(!o||!chatWindow(o).open)write('DELETE FROM dispatch_messages WHERE order_id=?',row.order_id)}}
 function feedbackNotices(rider){if(rider.role!=='rider')return;for(const report of all("SELECT * FROM reports WHERE kind='customer_feedback' ORDER BY created_at DESC LIMIT 1000")){let f;try{f=JSON.parse(report.payload)}catch{continue}if(f.rider_id!==rider.id||typeof f.order_id!=='string')continue;const o=get("SELECT id,customer_id,rider_id,status FROM orders WHERE id=?",f.order_id);if(!o||o.customer_id!==report.user_id||o.rider_id!==rider.id||o.status!=='done')continue;if(Number.isInteger(f.rating)&&f.rating>=1&&f.rating<=5)notice(rider.id,f.order_id,'rating','ได้รับคะแนน '+f.rating+'/5',text(f.comment,500)||'ลูกค้าให้คะแนนงานที่คุณจัดส่ง',digest('rating:'+report.id+':'+f.rating+':'+(f.comment||'')));if(Number.isInteger(f.tip_amount)&&f.tip_amount>=1&&f.tip_amount<=10000)notice(rider.id,f.order_id,'tip_intent','ลูกค้าแจ้งว่าจะให้ทิป '+Number(f.tip_amount)+' บาท','เป็นการแจ้งความตั้งใจ ยังไม่ถือว่าเงินเข้าหรือชำระสำเร็จ',digest('tip-intent:'+report.id+':'+f.tip_amount))}}
 function payeeView(r){return r?{phone:r.phone,name:r.name,state:r.state,version:r.version,review_note:r.review_note}:null}
 function paymentView(p){return {id:p.id,order_id:p.order_id,purpose:p.purpose,amount:p.amount_satang/100,payee_name:p.payee_name,phone:p.phone,state:p.state,created_at:p.created_at,reported_at:p.reported_at,confirmed_at:p.confirmed_at,method:p.purpose==='collection_cash'?'cash':'qr',confirmation_method:p.purpose==='collection_cash'?'rider_manual_cash':'rider_manual',bank_reference:p.bank_reference||'',qr_url:p.purpose==='collection_cash'?null:'/api/dispatch/payments/'+p.id+'/qr.svg',slip_url:p.slip?'/api/dispatch/payments/'+p.id+'/slip':null}}
 function validPayment(p,o,allowClosed=false){if(p.rider_id!==o.rider_id||o.status==='cancelled'&&!allowClosed)fail(409,'งานนี้เปลี่ยนแปลงหรือถูกยกเลิกแล้ว');if(['fare','collection','collection_cash'].includes(p.purpose)&&p.state!=='confirmed'&&p.amount_satang!==billing.expected(o,p))fail(409,'ยอดค่าบริการเปลี่ยน กรุณาติดต่อผู้ดูแลก่อนชำระ');if(p.state==='void')fail(409,'รายการนี้ยกเลิกแล้ว')}
 const billing=require('./billing.cjs')({get,all,write,now,uid,text,fail,notice,notify,orderFor,paymentView});
 function customerAvatar(o){if(!hasMemberTable)return '';const p=get("SELECT avatar_url,updated_at FROM member_profiles WHERE id=? AND verified=1 AND status='active'",o.customer_id);return p?.avatar_url?'/api/dispatch/orders/'+encodeURIComponent(o.id)+'/customer-avatar?v='+encodeURIComponent(p.updated_at||''):''}
 function riderAvatar(o){if(!hasProfileTable||!o.rider_id)return '';const p=get("SELECT avatar_url,photo_version FROM staff_profiles WHERE user_id=? AND photo_status='approved'",o.rider_id);return p?.avatar_url?'/api/dispatch/orders/'+encodeURIComponent(o.id)+'/rider-avatar?v='+encodeURIComponent(o.rider_id+':'+(p.photo_version||0)):''}
 function reply(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
 
/* KRANUAN — SECURE CHAT MEMBERSHIP */
const communityRoute =
  p === '/api/dispatch/community' ||
  /^\/api\/dispatch\/community\/[^/]+\/(pin|delete)$/.test(p);

const orderChatRoute =
  /^\/api\/dispatch\/orders\/[^/]+\/chat$/.test(p);

if (communityRoute || orderChatRoute) {
  const staffAccount = ['admin', 'rider', 'merchant']
    .includes(u.role);

  const registeredMember = hasMemberTable && !!get(
    `SELECT 1 AS ok
     FROM member_profiles
     WHERE id = ?
       AND verified = 1
       AND status = 'active'
       AND setup_complete = 1`,
    u.id
  );

  if (!staffAccount && !registeredMember) {
    fail(
      403,
      'กรุณาสมัครสมาชิก เข้าสู่ระบบ Google และกรอกโปรไฟล์ให้ครบก่อนใช้งานแชท'
    );
  }
}
async function handle(req,res,url){origin(req);const u=actor(req),method=req.method,p=url.pathname;limit(u.id,'api',240);const b=['POST','PUT','PATCH'].includes(method)?await body(req):{};if(!['GET','HEAD'].includes(method)&&req.headers['x-csrf-token']!==u.csrf)fail(403,'เซสชันเปลี่ยน กรุณาโหลดหน้าใหม่');closedChatCleanup();
 if(p==='/api/dispatch/events'&&method==='GET'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});res.write(': connected\n\n');streams.set(res,{id:u.id,token:u.token_hash});res.on?.('close',()=>streams.delete(res));return}
 const avatarMatch=p.match(/^\/api\/dispatch\/orders\/([^/]+)\/(rider|customer)-avatar$/);if(avatarMatch&&method==='GET'){const o=orderFor(avatarMatch[1],u);const isCustomer=avatarMatch[2]==='customer';if(isCustomer?!hasMemberTable:!hasProfileTable||!o.rider_id)fail(404,'ยังไม่มีรูปโปรไฟล์');const profile=isCustomer?get("SELECT avatar_url FROM member_profiles WHERE id=? AND verified=1 AND status='active'",o.customer_id):get("SELECT avatar_url FROM staff_profiles WHERE user_id=? AND photo_status='approved'",o.rider_id),avatar=profile?.avatar_url||'',m=avatar.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);await save();if(m){res.writeHead(200,{'Content-Type':m[1],'Cache-Control':'private, no-store'});return res.end(Buffer.from(m[2],'base64'))}if(avatar.startsWith('https://')){res.writeHead(302,{'Location':avatar,'Cache-Control':'private, no-store'});return res.end()}fail(404,'ยังไม่มีรูปไรเดอร์ที่พร้อมแสดง')}const bill=await billing.handle(u,p,method,b);if(bill){await save();if(bill.media){res.writeHead(200,{'Content-Type':bill.mime,'Cache-Control':'private, no-store'});return res.end(bill.media)}return reply(res,bill.status||200,bill.data)}let result,status=200;
 if(p==='/api/dispatch/session'&&method==='GET')result={user:{id:u.id,name:u.name,role:u.role},server_time:now()};
 else if(p==='/api/dispatch/orders'&&method==='GET'){const orders=all("SELECT * FROM orders WHERE customer_id=? OR rider_id=? ORDER BY updated_at DESC LIMIT 100",u.id,u.id);result= orders.filter(o=>o.kind==='food'||chatWindow(o).open||o.status==='done'||['assigned','picked'].includes(o.status)).map(o=>({id:o.id,kind:o.kind,status:o.status,fee:o.fee_satang/100,customer_name:o.customer_name,rider_name:get('SELECT name FROM users WHERE id=?',o.rider_id)?.name||'',rider_avatar:riderAvatar(o),customer_avatar:customerAvatar(o),chat:chatWindow(o),my_role:o.rider_id===u.id?'rider':'customer',updated_at:o.updated_at,last_message:get('SELECT body,sender_id,created_at FROM dispatch_messages WHERE order_id=? ORDER BY created_at DESC,rowid DESC LIMIT 1',o.id)||null,settlement:billing.summary(o)}))}
 else if(p==='/api/dispatch/payee'&&['GET','POST'].includes(method)){if(u.role!=='rider')fail(403,'เฉพาะบัญชีไรเดอร์');if(method==='POST'){const phone=text(b.phone,30).replace(/[\s-]/g,''),name=text(b.name,100);if(!/^0\d{9}$/.test(phone)||!name)fail(400,'กรอกชื่อผู้รับเงินจริงและเบอร์ไทย 10 หลักที่ผูกพร้อมเพย์');const previous=get('SELECT * FROM dispatch_payees WHERE user_id=?',u.id);if(!previous||previous.phone!==phone||previous.name!==name){if(get("SELECT id FROM dispatch_payments WHERE rider_id=? AND state='reported'",u.id))fail(409,'มีรายการรอยืนยันเงินเข้า กรุณาตรวจรายการก่อนเปลี่ยนบัญชี');write("UPDATE dispatch_payments SET state='void' WHERE rider_id=? AND state='pending'",u.id);write("INSERT INTO dispatch_payees(user_id,phone,name,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET phone=excluded.phone,name=excluded.name,state='pending',version=dispatch_payees.version+1,review_note='',reviewer_id=NULL,reviewed_at=NULL,updated_at=excluded.updated_at",u.id,phone,name,now())}notify([u.id])}result=payeeView(get('SELECT * FROM dispatch_payees WHERE user_id=?',u.id))}
 else if(p==='/api/dispatch/admin/payees'&&method==='GET'){if(u.role!=='admin')fail(403,'เฉพาะผู้ดูแล');result=all("SELECT p.*,u.name AS rider_name FROM dispatch_payees p JOIN users u ON u.id=p.user_id WHERE u.role='rider' ORDER BY p.updated_at DESC")}
 else if(p.match(/^\/api\/dispatch\/admin\/payees\/[^/]+$/)&&method==='POST'){if(u.role!=='admin')fail(403,'เฉพาะผู้ดูแล');const id=p.split('/').pop(),old=get('SELECT * FROM dispatch_payees WHERE user_id=?',id);if(!old||old.version!==Number(b.version))fail(409,'ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่');if(!['approved','rejected'].includes(b.state))fail(400,'ระบุผลตรวจ');if(b.state==='approved'&&b.checked!==true)fail(400,'ต้องติ๊กว่าตรวจชื่อและบัญชีรับเงินจริงแล้ว');const note=text(b.note,500);if(b.state==='rejected'&&!note)fail(400,'ระบุเหตุผลให้แก้ไข');write('UPDATE dispatch_payees SET state=?,review_note=?,reviewer_id=?,reviewed_at=?,updated_at=? WHERE user_id=?',b.state,note,u.id,now(),now(),id);notice(id,null,'account','ผลตรวจพร้อมเพย์: '+(b.state==='approved'?'อนุมัติแล้ว':'ให้แก้ไข'),note||'สามารถสร้าง QR รับเงินในออเดอร์ได้');if(b.state==='rejected')write("UPDATE dispatch_payments SET state='void' WHERE rider_id=? AND state='pending'",id);notify([id]);result={ok:true}}
 else if(p==='/api/dispatch/notices'&&method==='GET'){feedbackNotices(u);result=all('SELECT * FROM dispatch_notices WHERE user_id=? ORDER BY created_at DESC LIMIT 100',u.id)}
 else if(p==='/api/dispatch/notices/read'&&method==='POST'){if(Array.isArray(b.ids)){if(b.ids.length>100||b.ids.some(x=>typeof x!=='string'||x.length>100))fail(400,'รายการแจ้งเตือนไม่ถูกต้อง');if(b.ids.length)write('UPDATE dispatch_notices SET read_at=? WHERE user_id=? AND id IN ('+b.ids.map(()=>'?').join(',')+')',now(),u.id,...b.ids)}else if(b.id)write('UPDATE dispatch_notices SET read_at=? WHERE id=? AND user_id=?',now(),text(b.id,100),u.id);else write('UPDATE dispatch_notices SET read_at=? WHERE user_id=? AND read_at IS NULL',now(),u.id);result={ok:true}}
 
else if(p==='/api/dispatch/community'&&method==='GET'){
  const messages=all(
    "SELECT m.id,m.sender_id,m.body,m.pinned,m.created_at,u.name,u.role FROM dispatch_community_messages m JOIN users u ON u.id=m.sender_id WHERE m.hidden=0 ORDER BY m.created_at DESC,m.rowid DESC LIMIT 100"
  ).reverse();
  const pinned=get(
    "SELECT m.id,m.sender_id,m.body,m.pinned,m.created_at,u.name,u.role FROM dispatch_community_messages m JOIN users u ON u.id=m.sender_id WHERE m.hidden=0 AND m.pinned=1 ORDER BY m.created_at DESC LIMIT 1"
  );
  result={messages,pinned:pinned||null};
}
else if(p==='/api/dispatch/community'&&method==='POST'){
  limit(u.id,'community',8);
  if(typeof b.message!=='string'||!b.message.trim()||b.message.length>500)
    fail(400,'ข้อความต้องมีความยาว 1–500 ตัวอักษร');
  const message=text(b.message,500),key=text(b.client_key,100);
  if(!key)fail(400,'ไม่มีรหัสข้อความ');
  const previous=get(
    'SELECT id,body FROM dispatch_community_messages WHERE sender_id=? AND client_key=?',
    u.id,key
  );
  if(previous){
    if(previous.body!==message)fail(409,'รหัสข้อความซ้ำ');
    result={id:previous.id};
  }else{
    const mid=uid();
    write(
      'INSERT INTO dispatch_community_messages(id,sender_id,body,created_at,client_key) VALUES(?,?,?,?,?)',
      mid,u.id,message,now(),key
    );
    write(
      "DELETE FROM dispatch_community_messages WHERE id IN (SELECT id FROM dispatch_community_messages WHERE pinned=0 ORDER BY created_at DESC,rowid DESC LIMIT -1 OFFSET 300)"
    );
    result={id:mid};
    status=201;
    notify();
  }
}
else if(p.match(/^\/api\/dispatch\/community\/[^/]+\/(pin|delete)$/)&&method==='POST'){
  if(u.role!=='admin')fail(403,'เฉพาะผู้ดูแลระบบ');
  const parts=p.split('/'),mid=parts[4],action=parts[5];
  const found=get('SELECT id,hidden FROM dispatch_community_messages WHERE id=?',mid);
  if(!found||found.hidden)fail(404,'ไม่พบข้อความ');
  if(action==='pin'){
    write('UPDATE dispatch_community_messages SET pinned=0 WHERE pinned=1');
    write('UPDATE dispatch_community_messages SET pinned=1 WHERE id=?',mid);
  }else{
    write('UPDATE dispatch_community_messages SET hidden=1,pinned=0 WHERE id=?',mid);
  }
  result={ok:true};
  notify();
}

else if (
  p.match(/^\/api\/dispatch\/orders\/[^/]+\/chat$/) &&
  method === 'GET'
) {
  const oid = p.split('/')[4];
  const order = orderFor(oid, u);
  const chat = chatWindow(order);

  const messages = chat.open
    ? all(
        'SELECT id,sender_id,body,created_at FROM dispatch_messages WHERE order_id=? ORDER BY created_at DESC,rowid DESC LIMIT 100',
        oid
      ).reverse()
    : [];

  const labels = {
    waiting: '🧾 ลูกค้าส่งคำสั่งซื้อแล้ว',
    confirmed: '✅ ร้านค้ายืนยันรับออเดอร์',
    preparing: '🍳 ร้านกำลังเตรียมอาหาร',
    ready: '📦 ร้านเตรียมอาหารเสร็จแล้ว',
    assigned: '🛵 ไรเดอร์รับงานแล้ว',
    picked: '🛵 ไรเดอร์รับอาหารจากร้านแล้ว',
    done: '✅ จัดส่งสำเร็จ',
    cancelled: '❌ ยกเลิกออเดอร์'
  };

  const events = order.kind === 'food'
    ? all(
        'SELECT id,status,note,created_at FROM order_events WHERE order_id=? ORDER BY id LIMIT 100',
        oid
      )
    : [];

  const systemMessages = events.map(event => ({
    id: 'system-' + event.id,
    sender_id: null,
    system: true,
    body: (labels[event.status] || event.status) +
      (event.note ? '\n' + event.note : ''),
    created_at: event.created_at
  }));

  result = {
    ...chat,
    messages: [...messages, ...systemMessages]
      .sort((a, b) =>
        String(a.created_at).localeCompare(
          String(b.created_at)
        )
      )
  };
}
else if(p.match(/^\/api\/dispatch\/orders\/[^/]+\/chat$/)){const id=p.split('/')[4],o=orderFor(id,u),window=chatWindow(o);if(method==='GET')result={...window,messages:window.open?all('SELECT id,sender_id,body,created_at FROM dispatch_messages WHERE order_id=? ORDER BY created_at DESC,rowid DESC LIMIT 100',id).reverse():[]};else if(method==='POST'){if(!window.open)fail(409,'แชทเปิดเฉพาะระหว่างรับงานและ 1 ชั่วโมงหลังส่งสำเร็จ');limit(u.id,'chat',30);if(typeof b.message!=='string'||b.message.trim().length>1500)fail(400,'ข้อความต้องไม่เกิน 1,500 ตัวอักษร');const message=text(b.message,1500),key=text(b.client_key,100);if(!message||!key)fail(400,'กรอกข้อความและรหัสรายการ');const existing=get('SELECT * FROM dispatch_messages WHERE sender_id=? AND client_key=?',u.id,key);if(existing){if(existing.order_id!==id||existing.body!==message)fail(409,'รหัสข้อความซ้ำกับรายการอื่น');result=existing}else{const mid=uid();write('INSERT INTO dispatch_messages VALUES(?,?,?,?,?,?)',mid,id,u.id,message,now(),key);const recipient=u.id===o.customer_id?o.rider_id:o.customer_id;notice(recipient,id,'chat','มีข้อความใหม่ในงาน #'+id.slice(-6).toUpperCase(),'เปิดแชทเพื่ออ่านข้อความ',digest('chat:'+mid));notify([recipient]);result=get('SELECT id,sender_id,body,created_at FROM dispatch_messages WHERE id=?',mid);status=201}}else fail(405,'ไม่รองรับวิธีนี้')}
 else if(p.match(/^\/api\/dispatch\/orders\/[^/]+\/payments$/)){const id=p.split('/')[4],o=orderFor(id,u);if(method==='GET')result=all('SELECT * FROM dispatch_payments WHERE order_id=? ORDER BY created_at DESC',id).map(paymentView);else if(method==='POST'){if(o.customer_id!==u.id)fail(403,'เฉพาะลูกค้าผู้สั่งงาน');limit(u.id,'payment',12);if(!o.rider_id||!['assigned','picked','done'].includes(o.status))fail(409,'รอไรเดอร์รับงานก่อนสร้าง QR');const purpose=b.purpose;if(!['fare','tip'].includes(purpose))fail(400,'เลือกประเภทชำระ');if(purpose==='fare')billing.legacyGuard(o);if(purpose==='fare'&&!['ride','parcel'].includes(o.kind))fail(409,'QR ค่าบริการนี้รองรับส่งคนและส่งของเท่านั้น');if(purpose==='tip'&&o.status!=='done')fail(409,'ให้ทิปได้หลังส่งสำเร็จ');const payee=get("SELECT * FROM dispatch_payees WHERE user_id=? AND state='approved'",o.rider_id);if(!payee)fail(409,'ไรเดอร์ยังไม่มีพร้อมเพย์ที่ผู้ดูแลอนุมัติ');const tipValue=typeof b.amount==='number'||typeof b.amount==='string'?String(b.amount).trim():'';if(purpose==='tip'&&!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(tipValue))fail(400,'ระบุทิปไม่เกินสองตำแหน่งทศนิยม');const tipParts=tipValue.split('.');let amount=purpose==='fare'?o.fee_satang:Number(tipParts[0])*100+Number((tipParts[1]||'').padEnd(2,'0')); if(!Number.isSafeInteger(amount)||amount<100||amount>(purpose==='tip'?1000000:100000000))fail(400,'ยอดเงินไม่ถูกต้อง');const key=text(b.client_key,100);if(!key)fail(400,'ไม่มีรหัสคำขอชำระเงิน');let payment=get('SELECT * FROM dispatch_payments WHERE customer_id=? AND client_key=?',u.id,key);if(payment&&(payment.order_id!==id||payment.purpose!==purpose||payment.amount_satang!==amount))fail(409,'รหัสคำขอซ้ำกับการชำระอื่น');if(!payment&&purpose==='tip'){const activeTip=get("SELECT * FROM dispatch_payments WHERE order_id=? AND purpose='tip' AND state IN ('pending','reported')",id);if(activeTip&&activeTip.amount_satang!==amount)fail(409,'มีทิปรอชำระหรือตรวจเงินเข้าอยู่ กรุณาทำรายการเดิมให้เสร็จก่อน');payment=activeTip}if(!payment&&purpose==='fare')payment=get("SELECT * FROM dispatch_payments WHERE order_id=? AND purpose='fare' AND state<>'void'",id);if(!payment){const pid=uid();write('INSERT INTO dispatch_payments(id,order_id,customer_id,rider_id,purpose,amount_satang,phone,payee_name,payee_version,created_at,client_key) VALUES(?,?,?,?,?,?,?,?,?,?,?)',pid,id,u.id,o.rider_id,purpose,amount,payee.phone,payee.name,payee.version,now(),key);payment=get('SELECT * FROM dispatch_payments WHERE id=?',pid)}validPayment(payment,o);result=paymentView(payment);status=201}else fail(405,'ไม่รองรับวิธีนี้')}
 else if(p.match(/^\/api\/dispatch\/payments\/[^/]+(?:\/(qr.svg|slip|report|confirm))?$/)){const parts=p.split('/'),id=parts[4],action=parts[5],payment=get('SELECT * FROM dispatch_payments WHERE id=?',id);if(!payment)fail(404,'ไม่พบรายการชำระ');const o=orderFor(payment.order_id,u);validPayment(payment,o,action==='confirm'||action==='slip'||method==='GET'&&!action);if(method==='GET'&&action==='qr.svg'){if(billing.isCash(payment))fail(409,'รายการนี้ชำระเงินสด ไม่มี QR');if(payment.state!=='pending')fail(409,'แจ้งชำระหรือยืนยันแล้ว ไม่แสดง QR เพื่อป้องกันการจ่ายซ้ำ');const account=get("SELECT * FROM dispatch_payees WHERE user_id=? AND state='approved'",payment.rider_id);if(!account||account.version!==payment.payee_version)fail(409,'บัญชีรับเงินเปลี่ยน กรุณาขอ QR ใหม่');await save();res.writeHead(200,{'Content-Type':'image/svg+xml','Cache-Control':'private, no-store'});return res.end(promptpay.svg(payment.phone,payment.amount_satang))}if(method==='GET'&&action==='slip'){if(!payment.slip)fail(404,'ไม่มีสลิป');const m=payment.slip.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);if(!m)fail(404,'รูปไม่ถูกต้อง');await save();res.writeHead(200,{'Content-Type':m[1],'Cache-Control':'private, no-store'});return res.end(Buffer.from(m[2],'base64'))}if(action==='report'&&method==='POST'){if(u.id!==o.customer_id)fail(403,'เฉพาะลูกค้าผู้สั่งงาน');if(payment.state==='confirmed')result=paymentView(payment);else{const slip=b.slip||'';if(typeof slip!=='string'||slip.length>600000||slip&&!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(slip))fail(400,'แนบสลิป JPEG/PNG/WebP ขนาดเล็กเท่านั้น');if(slip){const bytes=Buffer.from(slip.split(',')[1],'base64'),ok=slip.startsWith('data:image/jpeg;')?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:slip.startsWith('data:image/png;')?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';if(!ok)fail(400,'เนื้อหาไฟล์ไม่ใช่ภาพที่ระบุ')}write("UPDATE dispatch_payments SET state='reported',slip=CASE WHEN ?<>'' THEN ? ELSE slip END,reported_at=COALESCE(reported_at,?) WHERE id=?",slip,slip,now(),id);notice(o.rider_id,o.id,'payment_report',payment.purpose==='tip'?'ลูกค้าแจ้งโอนทิปแล้ว':'ลูกค้าแจ้งชำระค่าบริการแล้ว','ยอด '+(payment.amount_satang/100).toFixed(2)+' บาท · โปรดตรวจเงินเข้าในธนาคารก่อนยืนยัน',digest('payment-report:'+id));notify([o.rider_id]);result=paymentView(get('SELECT * FROM dispatch_payments WHERE id=?',id))}}else if(action==='confirm'&&method==='POST'){if(u.role!=='rider'||u.id!==o.rider_id)fail(403,'เฉพาะไรเดอร์ผู้รับเงินของงานนี้');if(b.checked!==true)fail(400,'กรุณาติ๊กว่าตรวจเงินเข้าในบัญชีจริงแล้ว');if(payment.state==='pending')fail(409,'รอลูกค้าแจ้งชำระก่อน');if(payment.state!=='confirmed'){const rawReference=text(b.bank_reference,100).toUpperCase();if(!billing.isCash(payment)&&!/^[A-Z0-9 _:/-]{6,100}$/.test(rawReference))fail(400,'ใช้เลขอ้างอิงรายการจากธนาคารเท่านั้น');const reference=rawReference.replace(/[^A-Z0-9]/g,'');if(!billing.isCash(payment)&&(reference.length<6||reference.length>80))fail(400,'กรอกเลขอ้างอิงรายการเงินเข้าจากแอปธนาคาร 6–80 ตัว');if(reference&&get("SELECT id FROM dispatch_payments WHERE rider_id=? AND state='confirmed' AND bank_reference=? AND id<>?",u.id,reference,id))fail(409,'เลขอ้างอิงนี้ใช้ยืนยันรายการอื่นไปแล้ว');write("UPDATE dispatch_payments SET state='confirmed',confirmed_at=?,confirmed_by=?,bank_reference=? WHERE id=?",now(),u.id,reference,id);notice(o.customer_id,o.id,'payment_confirmed','ไรเดอร์ยืนยันรับเงินแล้ว','ยอด '+(payment.amount_satang/100).toFixed(2)+' บาท · ยืนยันโดยไรเดอร์ ไม่ใช่ระบบธนาคาร',digest('payment-confirmed:'+id));if(payment.purpose==='tip')notice(o.rider_id,o.id,'tip_confirmed','บันทึกรับทิป '+(payment.amount_satang/100).toFixed(2)+' บาทแล้ว','คุณยืนยันว่าเงินเข้าบัญชีแล้ว',digest('tip-confirmed:'+id));notify([o.customer_id,o.rider_id])}result=paymentView(get('SELECT * FROM dispatch_payments WHERE id=?',id))}else if(method==='GET'&&!action)result=paymentView(payment);else fail(405,'ไม่รองรับวิธีนี้')}
 else fail(404,'ไม่พบฟังก์ชันเสริม');
 await save();reply(res,status,result);
 }
 async function initialize(saved){hasMemberTable=!!get("SELECT name FROM sqlite_master WHERE type='table' AND name='member_profiles'");hasProfileTable=!!get("SELECT name FROM sqlite_master WHERE type='table' AND name='staff_profiles'");db.exec(fs.readFileSync(path.join(__dirname,'schema.sql'),'utf8'));if(saved?.version===1&&saved.tables){db.exec('BEGIN');try{for(const table of tables){const allowed=new Set(all('PRAGMA table_info('+table+')').map(x=>x.name));for(const row of saved.tables[table]||[]){const columns=Object.keys(row);if(columns.some(c=>!allowed.has(c)))throw Error('Unknown saved column');db.prepare('INSERT OR REPLACE INTO '+table+'('+columns.join(',')+') VALUES('+columns.map(()=>'?').join(',')+')').run(...columns.map(c=>row[c]))}}db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}}dirty=false;persisted=snapshot()}
 function handler(req,res,url){res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','SAMEORIGIN');const task=queue.then(()=>handle(req,res,url)).catch(async e=>{if(!testMode)console.error('Dispatch request:',e.message);if(!res.headersSent)reply(res,e.status||500,{error:e.status?e.message:'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่'});else res.end()});queue=task.catch(()=>{});return task}
 function legacyUpdated(){const task=queue.then(async()=>{for(const user of all("SELECT id,role FROM users WHERE role='rider'"))feedbackNotices(user);closedChatCleanup();await save();notify()});queue=task.catch(e=>console.error('Dispatch sync:',e.message));return queue}
 return {initialize,handler,legacyUpdated,snapshot,close(){for(const res of streams.keys())res.end();streams.clear()},async flush(){const task=queue.then(save);queue=task.catch(()=>{});return task},testMode};
};
