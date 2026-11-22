'use strict';
/** KRANUAN HELP v1 — isolated Firebase RTDB data, no changes to legacy order tables. */
const crypto = require('node:crypto');

module.exports = function createCommunityHelp({db, ref = null, clock = () => Date.now(), onJobCreated = async () => {}}) {
  if (!db || typeof db.prepare !== 'function') throw Error('KRANUAN HELP requires the existing core database');
  if (!ref && process.env.KRANUAN_TEST_SQLITE !== '1') throw Error('KRANUAN HELP needs a Firebase Realtime Database reference');
  const memory = Object.create(null), rate = new Map();
  const fail = (status, message) => { throw Object.assign(new Error(message), {status}); };
  const now = () => new Date(clock()).toISOString();
  const uuid = () => crypto.randomUUID();
  const clean = (v, max = 500) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '';
  const pathParts = p => p.split('/').filter(Boolean);
  const rtdb = p => pathParts(p).reduce((node, part) => node.child(part), ref);
  const clone = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  async function read(p) {
    if (ref) return (await rtdb(p).get()).val();
    let cur = memory;
    for (const part of pathParts(p)) cur = (cur || {})[part];
    return clone(cur ?? null);
  }
  async function set(p, v) {
    if (ref) return rtdb(p).set(v);
    const parts = pathParts(p); let cur = memory;
    for (const key of parts.slice(0, -1)) cur = cur[key] ||= Object.create(null);
    cur[parts.at(-1)] = clone(v);
  }
  async function transaction(p, update) {
    if (ref) {
      const result = await rtdb(p).transaction(update, undefined, false);
      return {committed: result.committed, value: result.snapshot.val()};
    }
    // In-memory test mode performs read+update synchronously, like Firebase transactions.
    const parts = pathParts(p);
    let cursor = memory;
    for (const key of parts.slice(0,-1)) cursor = cursor[key] ||= Object.create(null);
    const leaf = parts.at(-1);
    const previous = clone(cursor[leaf] ?? null);
    const changed = update(previous);
    if (changed === undefined) return {committed:false,value:previous};
    cursor[leaf] = clone(changed);
    return {committed:true,value:clone(changed)};
  }
  async function audit(user, event, target, note = '') {
    const id = uuid();
    await set('audit/'+id, {id, actor_id:user.id, role:user.role, event, target, note:clean(note,300), created_at:now()});
  }
  function take(user, key, max) {
    const k = user.id + ':' + key, cur = rate.get(k);
    const next = cur && cur.until > clock() ? cur : {n:0,until:clock()+60000};
    if (++next.n > max) fail(429, 'ทำรายการถี่เกินไป กรุณาลองใหม่อีกครั้ง');
    rate.set(k,next);
    if (rate.size > 4000) for(const [x,y] of rate) if(y.until < clock()) rate.delete(x);
  }
  function actor(req) {
    const raw = String(req.headers.cookie || '').split(';').map(s=>s.trim()).find(s=>s.startsWith('kranuan_session='))?.slice('kranuan_session='.length);
    if (!raw) fail(401, 'กรุณาเข้าสู่ระบบก่อน');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const u = db.prepare('SELECT u.*,s.csrf,s.token_hash FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>?').get(hash,clock());
    if (!u) fail(401, 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    return u;
  }
  function ensureMember(u) {
    if (['admin','merchant','rider'].includes(u.role)) return;
    const m = db.prepare("SELECT 1 AS ok FROM member_profiles WHERE id=? AND verified=1 AND status='active' AND setup_complete=1").get(u.id);
    if (!m) fail(403, 'กรุณาเข้าสู่ระบบ Google และยืนยันโปรไฟล์สมาชิกก่อนใช้บริการ');
  }
  function ensureAdmin(u) {if(u.role !== 'admin') fail(403,'เมนูนี้สำหรับแอดมินเท่านั้น');}
  function origin(req) {
    const allowed = process.env.APP_ORIGIN || 'http://' + req.headers.host;
    if (req.headers.origin && req.headers.origin !== allowed || req.headers['sec-fetch-site'] === 'cross-site') fail(403,'ไม่อนุญาตคำขอข้ามเว็บไซต์');
  }
  async function body(req) {
    let total=0, parts=[];
    for await(const chunk of req){total+=chunk.length;if(total>550000)fail(413,'ไฟล์ใหญ่เกินไป (ไม่เกิน 500 KB ต่อคำขอ)');parts.push(chunk);}
    try{const value=JSON.parse(Buffer.concat(parts).toString('utf8')||'{}');if(!value||Array.isArray(value)||typeof value!=='object')throw Error();return value;}
    catch{fail(400,'รูปแบบข้อมูลไม่ถูกต้อง');}
  }
  function photo(data){
    if(data == null || data === '')return '';
    if(typeof data !== 'string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(data)||data.length>175000)fail(400,'รูปภาพต้องเป็น JPG ที่บีบอัดแล้ว ขนาดไม่เกิน 130 KB');
    return data;
  }
  const categories = new Set(['dishwashing','cleaning','vehicle','repair','delivery','moving','general']);
  const postTypes = new Set(['news','general','market','help']);
  const jobStages = ['before','during','after'];
  function viewJob(j,u){
    const party = !!u && (u.role==='admin'||u.id===j.customer_id||u.id===j.rider_id);
    const out={id:j.id,category:j.category,title:j.title,detail:j.detail,area:j.area,budget:j.budget,date_time:j.date_time,estimated_hours:j.estimated_hours,quantity:j.quantity,status:j.status,hidden:!!j.hidden,created_at:j.created_at,updated_at:j.updated_at,customer_name:j.customer_name,rider_name:j.rider_name||'',has_photo:!!j.photo,proof_stages:Object.keys(j.proofs||{}),mine:!!u&&j.customer_id===u.id,assigned_to_me:!!u&&j.rider_id===u.id,payment_confirmed:!!j.payment_confirmed};
    if(party)Object.assign(out,{address:j.address,lat:j.lat,lng:j.lng,contact_phone:j.contact_phone,photo:j.photo,proofs:j.proofs||{}});
    return out;
  }
  function viewPost(p,u){
    return {id:p.id,kind:p.kind,title:p.title,content:p.content,area:p.area,status:p.status,author_name:p.author_name,created_at:p.created_at,updated_at:p.updated_at,photo:p.photo||'',mine:!!u&&p.author_id===u.id,review_note:u?.role==='admin'||u?.id===p.author_id?p.review_note||'':''};
  }
  const respond=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
  function isParty(j,u){return u.role==='admin'||j.customer_id===u.id||j.rider_id===u.id;}
  function needJob(j,u){if(!j)fail(404,'ไม่พบงาน');if(!isParty(j,u))fail(403,'คุณไม่มีสิทธิ์ดูงานนี้');}
  function needPost(p,u){if(!p)fail(404,'ไม่พบโพสต์');if(u.role!=='admin'&&p.author_id!==u.id&&p.status!=='approved')fail(403,'โพสต์นี้ยังไม่เปิดเผย');}
  async function handle(req,res,url){
    origin(req);
    const method=req.method, path=url.pathname, u=actor(req);
    take(u,'api',240);
    if(!['GET','POST'].includes(method))fail(405,'ไม่รองรับวิธีเรียกนี้');
    if(method==='POST'&&req.headers['x-csrf-token']!==u.csrf)fail(403,'โปรดโหลดหน้าใหม่และลองอีกครั้ง');
    const b=method==='POST'?await body(req):{};
    if(path==='/api/help/session'&&method==='GET')return respond(res,200,{user:{id:u.id,name:u.name||u.username,role:u.role},member_ready:!!(u.role!=='customer'||db.prepare("SELECT 1 AS ok FROM member_profiles WHERE id=? AND verified=1 AND status='active' AND setup_complete=1").get(u.id))});
    if(path==='/api/help/jobs'&&method==='GET'){
      const values=Object.values(await read('jobs')||{});
      const visible=values.filter(j=>u.role==='admin'||j.customer_id===u.id||j.rider_id===u.id||(!j.hidden&&j.status==='open'));
      return respond(res,200,visible.sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,120).map(j=>viewJob(j,u)));
    }
    if(path==='/api/help/jobs'&&method==='POST'){
      ensureMember(u);take(u,'newjob',4);
      if(!categories.has(b.category))fail(400,'หมวดงานไม่ถูกต้อง');
      const title=clean(b.title,100),detail=clean(b.detail,1800),area=clean(b.area,120),address=clean(b.address,250);
      if(title.length<6||detail.length<10||!area)fail(400,'กรุณากรอกชื่องาน รายละเอียด และพื้นที่ให้ครบ');
      const budget=Number(b.budget),h=Number(b.estimated_hours),quantity=Number(b.quantity||0);
      if(!Number.isInteger(budget)||budget<100||budget>100000)fail(400,'ค่าจ้างต้องอยู่ระหว่าง 100 ถึง 100,000 บาท');
      if(!Number.isFinite(h)||h<0||h>72)fail(400,'จำนวนชั่วโมงไม่ถูกต้อง');
      if(!Number.isFinite(quantity)||quantity<0||quantity>10000)fail(400,'จำนวนงานไม่ถูกต้อง');
      const dt=clean(b.date_time,40);
      if(!dt||!Number.isFinite(Date.parse(dt))||Date.parse(dt)<clock()-300000)fail(400,'กรุณาเลือกวันเวลาที่ถูกต้อง');
      const lat=b.lat==null?null:Number(b.lat),lng=b.lng==null?null:Number(b.lng);
      if(lat!==null&&(!Number.isFinite(lat)||lat< -90||lat>90)||lng!==null&&(!Number.isFinite(lng)||lng<-180||lng>180))fail(400,'พิกัดไม่ถูกต้อง');
      if(!address&&(lat===null||lng===null))fail(400,'กรุณากรอกจุดนัดหมายหรือใช้ตำแหน่งปัจจุบัน');
      const id=uuid(), stamp=now();
      const j={id,category:b.category,title,detail,area,address,lat,lng,budget,date_time:dt,estimated_hours:h,quantity,photo:photo(b.photo),contact_phone:clean(b.contact_phone,30),status:'open',hidden:false,customer_id:u.id,customer_name:clean(u.name||u.username,100)||'สมาชิก',rider_id:null,rider_name:null,proofs:{},payment_confirmed:false,created_at:stamp,updated_at:stamp};
      await set('jobs/'+id,j);await audit(u,'create_job',id,j.category);
      // Announce on the existing community chat; never disclose exact address/phone.
      // If chat is unavailable the job remains safely available on the HELP job board.
      try {await onJobCreated({user:u,job:j,request:req});}
      catch(error) {console.warn('KRANUAN HELP chat announcement deferred:',error.message);}
      return respond(res,201,viewJob(j,u));
    }
    const jobRoute=path.match(/^\/api\/help\/jobs\/([0-9a-f-]{36})(?:\/(claim|proof|complete|cancel|messages))?$/);
    if(jobRoute){
      const [,id,action]=jobRoute, key='jobs/'+id, j=await read(key);
      if(!j)fail(404,'ไม่พบงาน');
      if(!action&&method==='GET'){if(!isParty(j,u)&&(!j.hidden&&j.status==='open'))return respond(res,200,viewJob(j,u));needJob(j,u);return respond(res,200,viewJob(j,u));}
      if(action==='claim'&&method==='POST'){
        if(u.role!=='rider')fail(403,'เฉพาะไรเดอร์ที่เข้าสู่ระบบเท่านั้น');
        take(u,'claim',12);
        const result=await transaction(key,cur=>{
          if(!cur||cur.status!=='open'||cur.hidden||cur.customer_id===u.id)return;
          return {...cur,status:'assigned',rider_id:u.id,rider_name:clean(u.name||u.username,100),updated_at:now()};
        });
        if(!result.committed)fail(409,'งานนี้มีผู้รับไปแล้ว หรือไม่พร้อมรับงาน');
        await audit(u,'claim_job',id);return respond(res,200,viewJob(result.value,u));
      }
      if(action==='proof'&&method==='POST'){
        if(j.rider_id!==u.id||j.status!=='assigned')fail(403,'เฉพาะไรเดอร์ที่รับงานนี้');
        if(!jobStages.includes(b.stage))fail(400,'ขั้นตอนหลักฐานไม่ถูกต้อง');
        const img=photo(b.photo);if(!img)fail(400,'กรุณาแนบภาพหลักฐาน');
        const result=await transaction(key,cur=>{
          if(!cur||cur.status!=='assigned'||cur.rider_id!==u.id)return;
          const proofs=cur.proofs||{};
          const previous=b.stage==='during'?'before':b.stage==='after'?'during':null;
          if(previous&&!proofs[previous])return;
          return {...cur,proofs:{...proofs,[b.stage]:{photo:img,created_at:now()}},updated_at:now()};
        });
        if(!result.committed)fail(409,'กรุณาแนบภาพตามลำดับ ก่อนทำ ระหว่างทำ และหลังทำ');
        await audit(u,'upload_proof',id,b.stage);return respond(res,200,viewJob(result.value,u));
      }
      if(action==='complete'&&method==='POST'){
        if(j.customer_id!==u.id&&u.role!=='admin')fail(403,'เฉพาะผู้จ้างหรือแอดมินที่ยืนยันได้');
        if(b.payment_confirmed!==true)fail(400,'โปรดยืนยันว่าได้ตรวจสอบงานและชำระเงินแล้ว');
        const result=await transaction(key,cur=>{
          if(!cur||cur.status!=='assigned'||!jobStages.every(stage=>cur.proofs?.[stage]))return;
          return {...cur,status:'completed',payment_confirmed:true,completed_at:now(),updated_at:now()};
        });
        if(!result.committed)fail(409,'ต้องมีรูปก่อน ระหว่าง และหลังทำงานครบก่อนปิดงาน');
        await audit(u,'complete_job',id,'manual_payment_confirmation');return respond(res,200,viewJob(result.value,u));
      }
      if(action==='cancel'&&method==='POST'){
        if(j.customer_id!==u.id&&u.role!=='admin')fail(403,'เฉพาะผู้จ้างหรือแอดมิน');
        const result=await transaction(key,cur=>{
          if(!cur||cur.status!=='open'||(cur.customer_id!==u.id&&u.role!=='admin'))return;
          return {...cur,status:'cancelled',updated_at:now()};
        });
        if(!result.committed)fail(409,'งานที่ไรเดอร์รับแล้วต้องติดต่อแอดมินเพื่อยกเลิก');
        await audit(u,'cancel_job',id);return respond(res,200,viewJob(result.value,u));
      }
      if(action==='messages'){
        needJob(j,u);
        if(j.status==='open')fail(409,'เริ่มแชทได้เมื่อมีไรเดอร์รับงานแล้ว');
        if(method==='GET')return respond(res,200,Object.values(await read('messages/'+id)||{}).sort((a,b)=>a.created_at.localeCompare(b.created_at)).slice(-100));
        take(u,'message',15);const content=clean(b.content,1000);if(!content)fail(400,'กรุณาพิมพ์ข้อความ');
        const mid=uuid(), message={id:mid,actor_id:u.id,name:clean(u.name||u.username,100),role:u.role,content,created_at:now()};
        await set('messages/'+id+'/'+mid,message);return respond(res,201,message);
      }
      fail(405,'ไม่รองรับการทำรายการ');
    }
    if(path==='/api/help/posts'&&method==='GET'){
      const posts=Object.values(await read('posts')||{}).filter(p=>u.role==='admin'||p.author_id===u.id||p.status==='approved');
      return respond(res,200,posts.sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,120).map(p=>viewPost(p,u)));
    }
    if(path==='/api/help/posts'&&method==='POST'){
      ensureMember(u);take(u,'newpost',3);
      const kind=clean(b.kind,30),title=clean(b.title,140),content=clean(b.content,2000),area=clean(b.area,120);
      if(!postTypes.has(kind)||title.length<5||content.length<10)fail(400,'กรุณาเลือกประเภทและกรอกหัวข้อกับรายละเอียดให้ครบ');
      const id=uuid(), stamp=now();
      const p={id,kind,title,content,area,photo:photo(b.photo),status:u.role==='admin'?'approved':'pending',author_id:u.id,author_name:clean(u.name||u.username,100)||'สมาชิก',created_at:stamp,updated_at:stamp,review_note:''};
      await set('posts/'+id,p);await audit(u,'create_post',id,p.status);
      return respond(res,201,viewPost(p,u));
    }
    const postRoute=path.match(/^\/api\/help\/posts\/([0-9a-f-]{36})$/);
    if(postRoute&&method==='GET'){
      const p=await read('posts/'+postRoute[1]);needPost(p,u);return respond(res,200,viewPost(p,u));
    }
    const moderation=path.match(/^\/api\/help\/admin\/(posts|jobs)\/([0-9a-f-]{36})\/moderate$/);
    if(moderation&&method==='POST'){
      ensureAdmin(u);take(u,'moderate',30);
      const [,kind,id]=moderation,action=clean(b.action,30),note=clean(b.note,300);
      if(kind==='posts'){
        if(!['approve','hide','reject','remove'].includes(action))fail(400,'คำสั่งไม่ถูกต้อง');
        const result=await transaction('posts/'+id,cur=>cur?{...cur,status:{approve:'approved',hide:'hidden',reject:'rejected',remove:'removed'}[action],review_note:note,updated_at:now()}:undefined);
        if(!result.committed)fail(404,'ไม่พบโพสต์');
        await audit(u,'moderate_post_'+action,id,note);return respond(res,200,viewPost(result.value,u));
      }
      if(!['hide','restore','cancel'].includes(action))fail(400,'คำสั่งไม่ถูกต้อง');
      const result=await transaction('jobs/'+id,cur=>{
        if(!cur)return;
        if(action==='restore'&&cur.status!=='open')return;
        if(action==='cancel'&&cur.status==='completed')return;
        return {...cur,hidden:action==='hide'?true:action==='restore'?false:cur.hidden,status:action==='cancel'?'cancelled':cur.status,moderation_note:note,updated_at:now()};
      });
      if(!result.committed)fail(409,'ไม่พบงาน หรือสถานะไม่อนุญาต');
      await audit(u,'moderate_job_'+action,id,note);return respond(res,200,viewJob(result.value,u));
    }
    if(path==='/api/help/admin/audit'&&method==='GET'){
      ensureAdmin(u);return respond(res,200,Object.values(await read('audit')||{}).sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,100));
    }
    fail(404,'ไม่พบ API');
  }
  return {handler:async(req,res,url)=>{try{await handle(req,res,url);}catch(err){const status=err.status||500; if(status===500)console.error('Community Help error:',err);if(!res.headersSent)respond(res,status,{error:status===500?'ระบบ KRANUAN HELP ขัดข้อง กรุณาลองใหม่':err.message});else if(!res.writableEnded)res.end();}}, _test:{read,set,transaction}};
};
