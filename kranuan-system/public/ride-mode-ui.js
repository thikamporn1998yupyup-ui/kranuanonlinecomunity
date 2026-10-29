/* ride-mode-ui.js
 * หน้า "เรียกไรเดอร์" แบบใหม่ ตามดีไซน์ UX/UI ที่ออกแบบไว้
 *   1) หน้าเลือกยานพาหนะ (รถจักรยานยนต์ / รถยนต์)
 *   2) สวิตช์ ส่งของ / ส่งคน
 *   3) ตัวเพิ่ม-ลดจำนวนผู้โดยสาร (โหมดส่งคน)
 *   4) กล่องค่าบริการแบบในดีไซน์
 *
 * หลักความปลอดภัย: ไฟล์นี้ "ต่อเพิ่ม" จากของเดิม ไม่แก้ไฟล์เดิมเลย
 * - ใช้ฟอร์ม แผนที่ปักหมุด และระบบส่งออเดอร์เดิมทั้งหมด
 * - ราคา/ขีดจำกัดผู้โดยสาร ยึดตามเซิร์ฟเวอร์ (/api/config) เสมอ
 * - ถ้าส่วนใดของระบบเดิมไม่ครบ หรือเกิดข้อผิดพลาด ไฟล์นี้จะหยุดทำงานเอง
 *   แล้วหน้าเรียกไรเดอร์เดิมจะทำงานต่อได้ตามปกติ
 */
(function(){
try{
  if(typeof deliveryFormHtml!=='function'||typeof courierRequest==='undefined'||typeof render!=='function'||!window.K||!window.C)return;

  var VEH={
    bike:{label:'รถจักรยานยนต์',cap:1,desc:'ส่งไว เหมาะกับของชิ้นเล็ก',
      svg:'<svg viewBox="0 0 24 24"><path d="M19 7h-3V5h3a1 1 0 0 1 1 1v1zm-4 0h-2.5l-2-2H9v2H4v2h2.5l-2 5H4v2h2a2 2 0 0 0 1.7-1l1.8-4.5h1.5l4.3 3.4A2 2 0 0 0 16.5 14H18a3 3 0 1 0 0-6h-2.5V7zM9 9h3.5l2 3H11L9 9zm8 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/><circle cx="6" cy="17" r="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="17" r="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>'},
    car:{label:'รถยนต์',cap:4,desc:'รับส่งผู้โดยสาร หรือของชิ้นใหญ่',
      svg:'<svg viewBox="0 0 24 24"><path d="M18.9 6.1l-1.2-3.5C17.4 1.6 16.5 1 15.5 1h-7C7.5 1 6.6 1.6 6.3 2.6l-1.2 3.5C4.4 6.4 4 7.2 4 8v11a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-1h6v1a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2V8c0-.8-.4-1.6-1.1-1.9zM7.5 3.5c.1-.3.3-.5.6-.5h7.8c.3 0 .5.2.6.5L17.4 7H6.6l.9-3.5zM6.5 15.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm11 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>'}
  };
  var USER_SVG='<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';

  /* ---------- ค่าตั้งจากเซิร์ฟเวอร์ (ค่าส่ง / ขีดจำกัดผู้โดยสาร) ---------- */
  var cfgPromise=null;
  function getConfig(){
    if(!cfgPromise)cfgPromise=K.request('/config').catch(function(e){cfgPromise=null;throw e});
    return cfgPromise;
  }

  /* ---------- สไตล์ (ใส่ครั้งเดียว ใช้ชื่อคลาสขึ้นต้น rm- ไม่ชนของเดิม) ---------- */
  function ensureStyle(){
    if(document.getElementById('rm-style'))return;
    var s=document.createElement('style');s.id='rm-style';
    s.textContent=[
      '.rm-vs,.rm-bar,.rm-stepper,.rm-fare{--rm-bg:#fffaf0;--rm-tx:#4a2c1a;--rm-tx2:#8c6b53;--rm-ac:#b73a1b;--rm-ln:#e8d5b5}',
      '.rm-vs{padding:8px 4px 24px}',
      '.rm-vs-head{text-align:center;margin:18px 0 26px}',
      '.rm-vs-head h2{font-size:24px;color:var(--rm-tx);margin:0 0 6px}',
      '.rm-vs-head p{font-size:14px;color:var(--rm-tx2);margin:0}',
      '.rm-cards{display:flex;flex-direction:column;gap:14px}',
      '.rm-card{display:flex;align-items:center;gap:18px;width:100%;text-align:left;background:#fff;border:2px solid var(--rm-ln);border-radius:24px;padding:20px;cursor:pointer;box-shadow:0 4px 15px rgba(0,0,0,.03);transition:transform .2s,border-color .2s,box-shadow .2s;font:inherit;color:inherit}',
      '.rm-card:hover{border-color:var(--rm-ac);box-shadow:0 8px 25px rgba(183,58,27,.15);transform:translateY(-3px)}',
      '.rm-card:active{transform:scale(.97)}',
      '.rm-icon{flex:none;width:72px;height:72px;border-radius:20px;background:rgba(183,58,27,.1);display:flex;align-items:center;justify-content:center;color:var(--rm-ac)}',
      '.rm-icon svg{width:40px;height:40px;fill:var(--rm-ac)}',
      '.rm-card h3{margin:0 0 4px;font-size:19px;color:var(--rm-tx)}',
      '.rm-card p{margin:0;font-size:14px;color:var(--rm-tx2)}',
      '.rm-bar{display:flex;flex-direction:column;gap:10px;margin:4px 0 14px}',
      '.rm-chip{align-self:flex-start;display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--rm-ln);border-radius:999px;padding:6px 14px 6px 8px;font-size:13px;font-weight:700;color:var(--rm-tx);cursor:pointer}',
      '.rm-chip i{display:inline-flex;width:26px;height:26px;border-radius:50%;background:rgba(183,58,27,.1);align-items:center;justify-content:center}',
      '.rm-chip svg{width:16px;height:16px;fill:var(--rm-ac)}',
      '.rm-chip em{font-style:normal;font-weight:400;color:var(--rm-ac);margin-left:4px}',
      '.rm-toggle{display:flex;background:#f0e8d5;padding:4px;border-radius:12px}',
      '.rm-toggle button{flex:1;padding:10px;border:0;background:transparent;border-radius:10px;font-size:14px;font-weight:700;color:var(--rm-tx2);cursor:pointer;transition:all .2s}',
      '.rm-toggle button.active{background:#fff;color:var(--rm-ac);box-shadow:0 2px 6px rgba(0,0,0,.1)}',
      '.rm-stepper{display:flex;align-items:center;justify-content:space-between;background:#fff;border:1px solid var(--rm-ln);border-radius:16px;padding:14px 16px;margin:12px 0 6px;box-shadow:0 2px 8px rgba(0,0,0,.02)}',
      '.rm-stepper .rm-who{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:700;color:var(--rm-tx)}',
      '.rm-stepper .rm-who svg{width:22px;height:22px;fill:var(--rm-tx)}',
      '.rm-ctl{display:flex;align-items:center;gap:14px}',
      '.rm-ctl button{width:34px;height:34px;border-radius:50%;border:1px solid #ddd;background:#fff;color:var(--rm-tx);font-size:20px;font-weight:700;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}',
      '.rm-ctl button:active{transform:scale(.9);background:#f5f5f5}',
      '.rm-ctl button:disabled{opacity:.3;pointer-events:none}',
      '.rm-ctl output{font-size:18px;font-weight:700;color:var(--rm-tx);min-width:20px;text-align:center}',
      '.rm-note{font-size:12px;color:var(--rm-tx2);margin:0 0 10px 4px}',
      '.rm-fare{display:flex;justify-content:space-between;align-items:center;background:#fdf3d8;border-radius:12px;padding:16px;margin:12px 0}',
      '.rm-fare span{font-size:14px;color:var(--rm-tx2)}',
      '.rm-fare b{font-size:20px;color:var(--rm-ac)}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ---------- หน้าเลือกยานพาหนะ ---------- */
  function vehicleScreen(){
    ensureStyle();
    function card(k){var v=VEH[k];return '<button type="button" class="rm-card" onclick="rmPickVehicle(\''+k+'\')"><span class="rm-icon">'+v.svg+'</span><span><h3>'+v.label+'</h3><p>'+v.desc+'</p></span></button>'}
    return '<section class="rm-vs c-courier"><div class="rm-vs-head"><h2>เรียกไรเดอร์</h2><p>เลือกประเภทยานพาหนะที่คุณต้องการ</p></div><div class="rm-cards">'+card('bike')+card('car')+'</div></section>';
  }

  /* ---------- ห่อฟอร์มเดิม: ยังไม่เลือกรถ -> โชว์หน้าเลือกรถ, เลือกแล้ว -> ฟอร์มเดิม ---------- */
  var prevForm=deliveryFormHtml;
  deliveryFormHtml=function(){
    if(!courierRequest.vehicle||!VEH[courierRequest.vehicle])return vehicleScreen();
    return prevForm.apply(this,arguments);
  };

  /* ---------- ปุ่มต่าง ๆ (เรียกจาก onclick) ---------- */
  window.rmPickVehicle=function(k){
    if(!VEH[k])return;
    courierRequest.vehicle=k;
    courierRequest.service=(k==='car')?'ride':'delivery';
    courierRequest.passengers=1;
    render();window.scrollTo({top:0,behavior:'smooth'});
  };
  window.rmChangeVehicle=function(){courierRequest.vehicle=null;render();window.scrollTo({top:0,behavior:'smooth'})};
  window.rmSetService=function(s){
    if(courierRequest.service===s)return;
    courierRequest.service=s;courierRequest.passengers=1;render();
  };

  /* ---------- ปรับหน้าฟอร์มเดิมหลังวาดเสร็จ ---------- */
  function hide(el){if(el)el.style.setProperty('display','none','important')}
  function relabel(h3,text){
    var n=Array.prototype.filter.call(h3.childNodes,function(x){return x.nodeType===3}).pop();
    if(n)n.textContent=' '+text;
  }

  function mount(){
    var root=document.querySelector('.c-courier'),f=document.getElementById('courierRequestForm');
    if(!root||!f||f.dataset.rmBound)return;
    var veh=VEH[courierRequest.vehicle];if(!veh)return;
    f.dataset.rmBound='true';ensureStyle();
    var ride=courierRequest.service==='ride';

    /* แถบบน: ประเภทรถที่เลือก + สวิตช์ ส่งของ/ส่งคน */
    var bar=document.createElement('div');bar.className='rm-bar';
    bar.innerHTML='<button type="button" class="rm-chip" onclick="rmChangeVehicle()"><i>'+veh.svg+'</i>'+veh.label+'<em>เปลี่ยน</em></button>'+
      '<div class="rm-toggle"><button type="button" class="'+(ride?'':'active')+'" onclick="rmSetService(\'delivery\')">ส่งของ</button><button type="button" class="'+(ride?'active':'')+'" onclick="rmSetService(\'ride\')">ส่งคน</button></div>';
    var title=root.querySelector('.c-page-title');
    if(title)title.after(bar);else root.prepend(bar);

    /* ชื่อหัวข้อตามโหมด */
    var h2=root.querySelector('.c-page-title h2');
    if(h2)h2.textContent=ride?'เรียกพี่วิน / ไรเดอร์':'ส่งพัสดุ / อาหาร';
    var sub=root.querySelector('.c-page-title .c-help');
    if(sub&&ride)sub.textContent='ปักหมุดจุดขึ้นรถ–ลงรถบนแผนที่ ไรเดอร์ใกล้บ้านมารับถึงที่';

    if(!ride)return; /* โหมดส่งของ: ใช้ฟอร์มเดิมทุกอย่าง */

    /* โหมดส่งคน: ซ่อนช่องที่เกี่ยวกับพัสดุ (ส่งเข้าเซิร์ฟเวอร์เป็นงานประเภท ride) */
    var desc=f.elements.description;
    if(desc){desc.required=false;hide(desc.closest('label'))}
    hide(f.querySelector('.c-courier-photos'));
    var consent=f.elements.consent;
    if(consent){hide(consent.closest('label'));consent.checked=true;consent.dispatchEvent(new Event('change'))}

    var hs=f.querySelectorAll('.c-courier-location h3');
    if(hs[0])relabel(hs[0],'จุดขึ้นรถ');
    if(hs[1])relabel(hs[1],'จุดลงรถ');
    var pu=f.elements.pickup,dr=f.elements.dropoff;
    if(pu)pu.placeholder='จุดรับผู้โดยสาร ชื่อสถานที่ และจุดสังเกต';
    if(dr)dr.placeholder='จุดหมายปลายทาง ชื่อสถานที่ และจุดสังเกต';
    f.querySelectorAll('[data-courier-gps]').forEach(function(b){
      b.textContent=b.dataset.courierGps==='pickup'?'ใช้ตำแหน่งปัจจุบันเป็นจุดขึ้นรถ':'ใช้ตำแหน่งปัจจุบันเป็นจุดลงรถ';
    });
    var submit=f.querySelector('#courierSubmit');
    if(submit)submit.textContent='ยืนยันเรียกรถรับ–ส่ง';

    /* ตัวนับผู้โดยสาร + กล่องค่าบริการ ใส่ก่อนกล่องค่าส่งเดิม (ซ่อนกล่องเดิมในโหมดนี้) */
    var price=f.querySelector('.c-courier-price');
    var html='<div class="rm-stepper"><div class="rm-who">'+USER_SVG+'<span>จำนวนผู้โดยสาร</span></div><div class="rm-ctl"><button type="button" id="rmMinus" aria-label="ลดจำนวนผู้โดยสาร">−</button><output id="rmCount" aria-live="polite">1</output><button type="button" id="rmPlus" aria-label="เพิ่มจำนวนผู้โดยสาร">+</button></div></div><p class="rm-note" id="rmNote" hidden></p>'+
      '<div class="rm-fare"><span>ค่าบริการโดยสาร</span><b id="rmFare">กำลังโหลด...</b></div>';
    if(price){price.insertAdjacentHTML('beforebegin',html);hide(price)}
    else{var sb=f.querySelector('#courierSubmit');if(sb)sb.insertAdjacentHTML('beforebegin',html)}

    var max=1;
    function paint(){
      var n=Math.max(1,Math.min(max,Number(courierRequest.passengers)||1));
      courierRequest.passengers=n;
      var out=f.querySelector('#rmCount'),m=f.querySelector('#rmMinus'),p=f.querySelector('#rmPlus'),note=f.querySelector('#rmNote');
      if(out)out.textContent=n;if(m)m.disabled=n<=1;if(p)p.disabled=n>=max;
      if(note){
        if(veh.cap>max){note.hidden=false;note.textContent='ตอนนี้ระบบรับผู้โดยสารได้ '+max+' คนต่อคำขอ'}
        else note.hidden=true;
      }
    }
    f.querySelector('#rmMinus').onclick=function(){courierRequest.passengers=(courierRequest.passengers||1)-1;paint()};
    f.querySelector('#rmPlus').onclick=function(){courierRequest.passengers=(courierRequest.passengers||1)+1;paint()};
    paint();

    getConfig().then(function(c){
      if(!f.isConnected)return;
      max=Math.max(1,Math.min(veh.cap,Number(c.ride_passenger_limit)||1));
      var fee=Number(c.ride_fee!=null?c.ride_fee:c.delivery_fee);
      var el=f.querySelector('#rmFare');if(el&&Number.isFinite(fee))el.textContent=C.money(fee);
      paint();
    }).catch(function(e){
      var el=f.isConnected&&f.querySelector('#rmFare');if(el)el.textContent='โหลดค่าบริการไม่ได้';
    });
  }

  /* ---------- ปรับข้อมูลที่ส่งเข้าเซิร์ฟเวอร์ (เฉพาะงานจากหน้าเรียกไรเดอร์เท่านั้น) ---------- */
  var origRequest=K.request;
  K.request=function(path,options){
    try{
      if(path==='/orders'&&options&&options.method==='POST'&&courierRequest.vehicle&&VEH[courierRequest.vehicle]){
        var b=JSON.parse(options.body);
        if(b&&b.kind==='parcel'){
          var label='ประเภทรถ: '+VEH[courierRequest.vehicle].label;
          if(courierRequest.service==='ride'){
            b.kind='ride';
            b.passenger_count=Math.max(1,Number(courierRequest.passengers)||1);
            b.description=label;
          }else{
            b.description=(label+' · '+(b.description||'')).slice(0,300);
          }
          options=Object.assign({},options,{body:JSON.stringify(b)});
        }
      }
    }catch(e){console.warn('ride-mode-ui: ใช้ข้อมูลเดิมแทน',e)}
    return origRequest.call(this,path,options);
  };

  /* ---------- ต่อเข้ากับการวาดหน้า ---------- */
  var prevRender=render;
  render=function(){
    prevRender.apply(this,arguments);
    if(typeof view!=='undefined'&&view==='ส่งของ'){try{mount()}catch(e){console.warn('ride-mode-ui',e)}}
  };
  render();
}catch(e){console.warn('ride-mode-ui ปิดตัวเอง ใช้หน้าเดิมแทน',e)}
})();
