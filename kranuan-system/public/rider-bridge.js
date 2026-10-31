
let riderConnected=false,riderLoading=false;
function riderAccess(){let box=document.getElementById('riderAccess');if(!box){box=document.createElement('div');box.id='riderAccess';box.style.cssText='position:fixed;inset:0;z-index:5000;background:rgba(15,16,18,.95);display:grid;place-items:center;padding:20px';document.body.appendChild(box)}box.innerHTML='<div class="kdialog" style="max-height:85vh"><h2>บัญชีไรเดอร์กระนวน</h2><p>ใช้บัญชีที่ผู้ดูแลสร้างให้ เพื่อรับงานจากระบบกลาง</p><button class="kbutton primary" onclick="staffLogin()">เข้าสู่ระบบไรเดอร์</button><p><a href="/">กลับหน้าลูกค้า</a></p>'+(K.user&&K.user.role!=='customer'?'<button class="kbutton" onclick="riderLogout()">ออกจากบัญชี '+kEscape(K.user.name)+'</button>':'')+'</div>'}
function riderOrder(o){return {...o,status:{waiting:'waiting',ready:'pending',assigned:'accepted',picked:'picked',done:'delivered',cancelled:'cancelled'}[o.status],rider_id:o.rider_id,customer_id:o.customer_id||'order-'+o.id,delivered_at:o.status==='done'?o.updated_at:null,distance_km:(o.pickup_lat!=null&&pos?distanceKm(pos.lat,pos.lng,o.pickup_lat,o.pickup_lng).toFixed(1):'–')};}
function distanceKm(a,b,c,d){const r=Math.PI/180,x=Math.sin((c-a)*r/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
DB.jobs=async()=>riderConnected?(await K.request('/orders?lite=1')).map(riderOrder):[];
DB.claim=async id=>{try{await K.request('/orders/'+id+'/claim',{method:'POST',body:'{}'});return true}catch(e){if(e.status===409){toast(e.message);return false}throw e}};
DB.patch=async(id,fields)=>{const status={picked:'picked',delivered:'done'}[fields.status];if(!status)throw Error('รายการนี้ต้องให้ผู้ดูแลดำเนินการ');await K.request('/orders/'+id+'/status',{method:'POST',body:JSON.stringify({status})})};
DB.presence=async on=>{if(riderConnected)await K.request('/presence',{method:'POST',body:JSON.stringify({online:on})})};
DB.log=async(kind,o)=>K.request('/reports',{method:'POST',body:JSON.stringify({kind,...o})});
DB.getProfile=async()=>null;DB.saveProfile=async p=>{localStorage.setItem(PROF_KEY,JSON.stringify(p))};DB.photo=async(slot,data)=>data;

actions.toggle = async () => {
  const next = !online;

  await DB.presence(next);
  online = next;

  if (
    online &&
    window.Notification?.permission === 'default'
  ) {
    window.Notification.requestPermission().catch(() => {});
  }

  toast(
    online
      ? 'ออนไลน์ รับงานจากระบบกลางแล้ว'
      : 'ปิดรับงานแล้ว'
  );

  // ไม่ล้างประวัติออเดอร์ที่เคยแจ้ง
  // ป้องกันออเดอร์เดิมเด้งซ้ำหลังเปิดออนไลน์
  detect();
};

actions.picked = async function(id) {
  const job = jobs.find(j => j.id === id);
  const isRide = job?.type === 'ride';

  const loading = window.KranuanRiderLoading?.start(
    isRide
      ? 'กำลังยืนยันรับผู้โดยสาร...'
      : 'กำลังยืนยันรับสินค้า...',
    'กำลังบันทึกสถานะกับระบบกลาง'
  );

  try {
    // รอให้เซิร์ฟเวอร์ยืนยันก่อนแสดงว่าสำเร็จ
    await DB.patch(id, { status: 'picked' });

    toast(
      isRide
        ? 'รับผู้โดยสารแล้ว เริ่มเดินทาง'
        : 'รับของแล้ว กำลังจัดส่ง'
    );

  } finally {
    // ปิด Loading ทั้งกรณีสำเร็จและผิดพลาด
    loading?.close();
  }
};


actions.delivered = async function(id) {
  const job = jobs.find(j => j.id === id);

  if (!job) {
    toast('ไม่พบงาน กรุณาโหลดรายการใหม่');
    return;
  }

  // งานอาหารและพัสดุใช้หน้าถ่ายรูปหลักฐานแยก
  // ฟังก์ชันนี้รองรับงานส่งคนและงานที่ยังใช้ระบบเดิม
  if (!['ride', 'parcel', 'market'].includes(job.type)) {
    throw Error('ประเภทงานไม่ถูกต้อง');
  }

  if (window.krTransportCompleting) return;

  // ต้องยืนยันกับไรเดอร์ก่อน จึงเริ่มส่งข้อมูล
  if (job.type === 'ride') {
    const confirmed = window.confirm(
      'ยืนยันว่าถึงจุดหมายและผู้โดยสารลงจากรถเรียบร้อยแล้ว?'
    );

    if (!confirmed) return;
  }

  window.krTransportCompleting = true;

  const loading = window.KranuanRiderLoading?.start(
    job.type === 'ride'
      ? 'กำลังยืนยันถึงปลายทาง...'
      : 'กำลังบันทึกส่งสำเร็จ...',
    'กำลังส่งข้อมูลให้ระบบกลาง กรุณารอสักครู่'
  );

  try {
    // งานส่งคนต้องบันทึกการถึงจุดหมายก่อนปิดงาน
    if (job.type === 'ride') {
      await K.request(
        '/orders/' + encodeURIComponent(id) + '/arrive',
        {
          method: 'POST',
          body: '{}'
        }
      );

      loading?.update(
        'กำลังบันทึกส่งสำเร็จ...',
        'ยืนยันปลายทางแล้ว กำลังปิดงานในระบบกลาง'
      );
    }

    // รอเซิร์ฟเวอร์ยืนยันก่อนแจ้งว่าสำเร็จ
    await DB.patch(id, { status: 'delivered' });

    // ปิด Loading ก่อนเปิดหน้าชำระเงิน
    loading?.close();

    toast('ส่งสำเร็จแล้ว กำลังเปิดหน้าชำระเงิน');

    // โหลดรายการใหม่เงียบ ๆ เบื้องหลัง
    if (typeof riderSync === 'function') {
      riderSync().catch(() => {});
    }

    // หน้าชำระเงินมีข้อผิดพลาด ต้องไม่ส่งงานซ้ำ
    if (
      typeof window.KranuanOpenOrderPayment === 'function'
    ) {
      try {
        await window.KranuanOpenOrderPayment(id);
      } catch (paymentError) {
        toast(
          'บันทึกส่งสำเร็จแล้ว แต่เปิดหน้าชำระเงินไม่ได้: ' +
          paymentError.message
        );
      }
    } else {
      toast(
        'บันทึกส่งสำเร็จแล้ว กรุณาเปิดเมนูชำระเงิน'
      );
    }

  } catch (error) {
    toast(
      'ยังบันทึกส่งสำเร็จไม่ได้: ' + error.message
    );

  } finally {
    loading?.close();
    window.krTransportCompleting = false;
  }
};

actions.doCancel=async()=>{sh.msg='งานที่รับแล้วต้องให้ผู้ดูแลช่วยยกเลิก กรุณาติดต่อฝ่ายดูแลผ่านเมนูร้องเรียน';};
actions.sendSos=async()=>{await DB.log('sos',{lat:pos?.lat,lng:pos?.lng,detail:'ไรเดอร์กด SOS'});sh.msg='บันทึกในหน้าเรื่องแจ้งของผู้ดูแลแล้ว ยังไม่โทรหรือแจ้งหน่วยฉุกเฉินอัตโนมัติ โทรขอความช่วยเหลือได้ทันที'};

let riderSyncPending = false;
let riderJobsFingerprint = '';

async function riderSync() {
  if (!riderConnected) return;

  if (riderLoading) {
    riderSyncPending = true;
    return;
  }

  riderLoading = true;

  try {
    const nextJobs = await DB.jobs();

    // ไม่ใช้ระยะทาง GPS เป็นเหตุให้วาดหน้าจอใหม่ทั้งหมด
    const fingerprint = JSON.stringify(
      nextJobs.map(({ distance_km, ...order }) => order)
    );

    const changed = fingerprint !== riderJobsFingerprint;

    jobs = nextJobs;
    lastErr = '';

    if (changed) {
      riderJobsFingerprint = fingerprint;
      detect();

      if (tab !== 'settings') {
        render();
      }
    }
  } catch (error) {
    lastErr = 'เชื่อมระบบกลางไม่ได้: ' + error.message;
    toast(lastErr);
  } finally {
    riderLoading = false;

    // หากมีเหตุการณ์เข้ามาระหว่างโหลด ให้ตรวจอีกหนึ่งรอบ
    if (riderSyncPending) {
      riderSyncPending = false;
      queueMicrotask(riderSync);
    }
  }
}
async function riderLogout(){if(riderConnected)await DB.presence(false);await K.logout();location.reload()}

function riderItems(j){const passenger=j.type==='ride';return '<div style="font-size:12px;padding:12px;background:var(--s2);border-radius:12px;margin:10px 0;overflow-wrap:anywhere"><strong style="color:'+ (passenger?'#ffcf5c':'var(--ac2)')+'">'+esc(passenger?'งานส่งคน · ผู้โดยสาร '+(j.passenger_count||1)+' คน · '+(j.vehicle==='car'?'รถยนต์':'รถจักรยานยนต์'):j.type==='market'?'รับสินค้าตลาด':j.type==='parcel'?'งานส่งของ · '+(j.vehicle==='car'?'รถยนต์':'รถจักรยานยนต์'):'งานอาหาร')+'</strong><div>'+esc(j.item||'')+'</div><div>'+(passenger?'ค่าเดินทาง ':'ค่าสินค้า '+baht(j.goods_total)+' · ค่าส่ง ')+baht(j.fee)+'</div>'+(j.note?'<div>หมายเหตุ: '+esc(j.note)+'</div>':'')+'</div>'}
async function toggleRiderPassenger(input){const before=!!K.user.accepts_rides;input.disabled=true;try{const r=await K.request('/presence',{method:'POST',body:JSON.stringify({online,accepts_rides:input.checked})});K.user=r.user;await riderSync();render();toast(input.checked?'เปิดรับงานส่งคนแล้ว':'ปิดรับงานส่งคนแล้ว')}catch(e){input.checked=before;toast(e.message)}finally{input.disabled=false}}
const centralJobCard=jobCard;jobCard=function(j,act){return centralJobCard(j,act).replace('<div class="timeline">',riderItems(j)+'<div class="timeline">')};
const centralNextAlert=nextAlert;nextAlert=function(){centralNextAlert();if(cur){const body=document.querySelector('#alert .alertbody');if(body)body.insertAdjacentHTML('afterbegin',riderItems(cur))}};
function showRiderDetails(id){const j=jobs.find(j=>j.id===id);if(!j)return;let d=document.getElementById('riderOrderDetails');if(!d){d=document.createElement('dialog');d.id='riderOrderDetails';d.className='kdialog';document.body.appendChild(d)}d.innerHTML='<h2>'+esc(j.shop)+'</h2>'+riderItems(j)+'<p>รับ: '+esc(j.pickup)+'<br>ส่ง: '+esc(j.dropoff)+'</p>'+(j.pickup_phone?'<p><a href="tel:'+esc(j.pickup_phone)+'">โทรจุดรับ '+esc(j.pickup_phone)+'</a></p>':'')+(j.phone?'<p><a href="tel:'+esc(j.phone)+'">โทรลูกค้า '+esc(j.phone)+'</a></p>':'')+(j.image?'<img class="kcover" alt="รูปประกอบจากลูกค้า" src="'+esc(j.image)+'">':'')+(j.insideImage?'<img class="kcover" alt="สิ่งของจากลูกค้า" src="'+esc(j.insideImage)+'">':'')+'<button class="kbutton" onclick="this.closest(\'dialog\').close()">ปิด</button>';d.showModal()}
const centralRiderRender=render;render=function(){centralRiderRender();if(riderConnected&&(tab==='home'||tab==='settings')){const target=document.querySelector('#screen .switch');if(target)target.insertAdjacentHTML('afterend','<div class="card" style="padding:14px"><label style="display:flex;align-items:center;gap:12px;margin:0;color:var(--tx)"><input style="width:20px;flex:none" type="checkbox" '+(K.user.accepts_rides?'checked':'')+' onchange="toggleRiderPassenger(this)"><span><strong>รับงานส่งคน</strong><small style="display:block;color:var(--tx2)">มอเตอร์ไซค์ 1 คน / รถยนต์สูงสุด 4 คน เปิดเมื่อพร้อมให้บริการ</small></span></label></div>')}const j=active();if(j)document.querySelector('#jobbar .barcard').insertAdjacentHTML('beforeend','<button class="linkbtn" style="margin-top:7px" onclick="showRiderDetails(\''+j.id+'\')">ดูรายการสินค้า / ติดต่อผู้รับ</button>')};
(async()=>{try{await K.boot();cfg.mode='central';if(K.user.role!=='rider'){riderAccess();return}cfg.riderId=K.user.id;prof.name=K.user.name;riderConnected=true;online=K.user.online;applyTheme();initMap();watchGps();render();await riderSync();K.on(riderSync);K.connect();const logout=document.createElement('button');logout.className='linkbtn';logout.style.cssText='display:block;margin:15px auto';logout.textContent='ออกจากบัญชีไรเดอร์';logout.onclick=riderLogout;document.querySelector('.app').appendChild(logout);addEventListener('resize',()=>{if(map)map.invalidateSize()})}catch(e){toast('เชื่อมต่อไม่ได้: '+e.message);riderAccess()}})();

/* Vehicle used for matching real transport jobs; saved centrally. */
let transportRiderVehicle='bike',transportVehicleLoaded=false;const beforeTransportSettings=render;render=function(){beforeTransportSettings();if(K.user?.role!=='rider'||tab!=='settings')return;const screen=document.querySelector('#screen');if(!screen||document.getElementById('transportVehicleSettings'))return;const section=document.createElement('section');section.id='transportVehicleSettings';section.className='card';section.style.padding='18px';section.innerHTML='<h3>รถที่ใช้รับงาน</h3><p>เลือกให้ตรงกับรถจริง งานส่งของ/ส่งคนจะแสดงตามประเภทรถนี้</p><select aria-label="ประเภทรถที่ใช้รับงาน"><option value="bike">รถจักรยานยนต์ · ผู้โดยสาร 1 คน</option><option value="car">รถยนต์ · ผู้โดยสารสูงสุด 4 คน</option></select><p role="status"></p>';const select=section.querySelector('select');select.value=transportRiderVehicle;select.onchange=async()=>{select.disabled=true;try{const r=await K.request('/transport/vehicle',{method:'POST',body:JSON.stringify({vehicle:select.value})});transportRiderVehicle=r.vehicle;section.querySelector('p[role]').textContent='บันทึกประเภทรถแล้ว';await riderSync()}catch(e){select.value=transportRiderVehicle;section.querySelector('p[role]').textContent=e.message}finally{select.disabled=false}};screen.append(section);if(!transportVehicleLoaded){select.disabled=true;K.request('/transport/vehicle').then(r=>{transportRiderVehicle=r.vehicle;transportVehicleLoaded=true;select.value=r.vehicle}).catch(e=>section.querySelector('p[role]').textContent=e.message).finally(()=>select.disabled=false)}};
