    snap.delivery_photo_at = now();
  }


  // PARCEL V1: รองรับภาพหลักฐานรับและส่งพัสดุ
  
  if (
    o.kind === 'parcel' &&
    u.role === 'rider' &&
    ['picked', 'done'].includes(next)
  ) {

    const photo = b.photo;

    if (
      typeof photo !== 'string' ||
      photo.length > 700000 ||
      !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(photo)
    ) {
      fail(400, 'รูปหลักฐานพัสดุไม่ถูกต้อง');
    }

    const bytes = Buffer.from(
      photo.slice('data:image/jpeg;base64,'.length),
      'base64'
    );

    if (
      bytes.length < 100 ||
      bytes.length > 500000 ||
      bytes[0] !== 255 ||
      bytes[1] !== 216 ||
      bytes[2] !== 255
    ) {
      fail(400, 'กรุณาถ่ายรูป JPEG ใหม่');
    }

    if (next === 'picked') {
      snap.pickup_photo = photo;
      snap.pickup_photo_at = now();
    } else {
      snap.delivery_photo = photo;
      snap.delivery_photo_at = now();
    }
  }

  transaction(() => {
    const result = run(
      'UPDATE orders SET status=?,snapshot=?,updated_at=? ' +
      'WHERE id=? AND status=?',
      next,
      JSON.stringify(snap),
      now(),
      oid,
      o.status
    );

    if (!result.changes) {
      fail(409, 'สถานะเปลี่ยนแล้ว กรุณาโหลดใหม่');
    }

    addEvent(
      oid,
      u,
      next,
      pickupPhoto
        ? 'ไรเดอร์รับอาหารจากร้านและถ่ายภาพยืนยัน'
        : text(b.note, 500)
    );

    // รักษาการทำงานของระบบตลาดเดิม
    if (o.kind === 'market') {
      const listing = snap.listing_id;

      if (next === 'done') {
        run(
          "UPDATE market_listings SET stock='sold',updated_at=? WHERE id=?",
          Date.now(),
          listing
        );
      } else if (next === 'cancelled') {
        run(
          "UPDATE market_listings SET stock='available',updated_at=? " +
          "WHERE id=? AND stock='reserved'",
          Date.now(),
          listing
        );
      }
    }
  });

  emit();

  return send(
    res,
    200,
    orderView(
      get('SELECT * FROM orders WHERE id=?', oid),
      u
    )
  );
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
 if(!['GET','HEAD'].includes(req.method))fail(405,'Method not allowed');if(await servePerformance(req,res,url))return;let file=decodeURIComponent(url.pathname);if(file.endsWith('/'))file+='index.html';file=path.resolve(publicDir,'.'+file);if(!file.startsWith(publicDir+path.sep))fail(403,'Forbidden');if(!fs.existsSync(file)||!fs.statSync(file).isFile())fail(404,'File not found');res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
 }catch(e){if(!res.headersSent){if(!e.status)console.error('Request failed:',e.message);send(res,e.status||500,{error:e.status?e.message:'ระบบขัดข้อง กรุณาลองใหม่'})}else res.end()}});
