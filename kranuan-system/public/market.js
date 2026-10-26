/* =====================================================================
   ตลาดคนกระนวน v2
   - ใช้ชื่อเดิม marketResults() เป็นจุดเข้า (render() และช่องค้นหาด้านบนเรียกอยู่แล้ว)
   - ข้อมูลเก็บใน state.listings เดิม เพิ่มฟิลด์ใหม่แบบ optional (ประกาศเก่ายังแสดงได้)
   - ออเดอร์ส่งของสร้างใน state.orders รูปแบบเดิม (type:'market', status:'seller')
   ===================================================================== */
Object.assign(paths,{
  phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2Z"/>',
  chat:'<path d="M4 5h16v11H9l-5 4V5Z"/><path d="M8 9.5h8M8 12.5h5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  sort:'<path d="M4 7h10M4 12h7M4 17h4M17 6v12M17 18l-3-3M17 18l3-3"/>',
  bump:'<circle cx="12" cy="12" r="9"/><path d="M12 16V9M8.5 12.5 12 9l3.5 3.5"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  leaf:'<path d="M5 19c0-8 5-13 15-14 0 9-5 14-13 14"/><path d="M5 19c2-4 5-7 9-9"/>',
  gift:'<rect x="3.5" y="9" width="17" height="4" rx="1"/><path d="M5 13v7h14v-7M12 9v11M12 9c-1-3-5-4-5-1.5S10 9 12 9Zm0 0c1-3 5-4 5-1.5S14 9 12 9Z"/>',
  image:'<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 5-4.5 3.5 3 3-2.5 4.5 4"/>',
  alert:'<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.4h.01"/>',
  qr:'<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2.5v2.5H14zM19.5 14v.01M14 19.5v.01M17.5 19.5H20V17"/>',
  cash:'<rect x="3" y="7" width="18" height="10" rx="2"/><circle cx="12" cy="12" r="2.4"/><path d="M6.5 12h.01M17.5 12h.01"/>',
  seed:'<path d="M12 21v-9"/><path d="M12 12c0-4-3-6-7-6 0 4 3 6 7 6Zm0 2c0-3 2.5-5 6-5 0 3-2.5 5-6 5Z"/>'
});

const MK_CATS=['ของกิน/อาหารสด','ของใช้/มือสอง','ผลผลิตเกษตร','บริการ/รับจ้าง','ฝากร้าน/แจกฟรี'];
const MK_CAT_ICON={'ของกิน/อาหารสด':'food','ของใช้/มือสอง':'crate','ผลผลิตเกษตร':'leaf','บริการ/รับจ้าง':'service','ฝากร้าน/แจกฟรี':'gift'};
const MK_STOCK={available:'มีของพร้อมส่ง',reserved:'ติดจอง',sold:'ขายแล้ว'};
const MK_REPORT_REASONS=['สินค้าผิดกฎหมาย','หลอกลวง','โพสต์ก่อกวน','อื่น ๆ'];
const MK_HIDE_AT=3;      /* ถูกรายงานครบกี่ครั้งให้ซ่อนจากฟีดรอแอดมินตรวจ */
const MK_MAX_PHOTOS=5;
/* แถบตลาดนัดตามฤดูกาล: แก้/เพิ่มรายการได้ที่นี่ (from/to รูปแบบ เดือน-วัน) */
const MK_SEASONS=[
  {from:'10-15',to:'12-15',title:'ผลผลิตปลายฝน ต้นหนาว',text:'ข้าว ผัก และผลผลิตจากสวนคนกระนวน ช่วยกันอุดหนุนเกษตรกรใกล้บ้าน',category:'ผลผลิตเกษตร'}
];

let mk={screen:'feed',tab:'sell',cat:'ทั้งหมด',sort:'new',open:null,lastQ:'',dl:null,form:null,gpsOk:false,reportOpen:false};

const mkE=s=>escapeHtml(s==null?'':s);
function mkMe(){
  const u=state.currentUser;
  if(u&&(u.userId||u.name))return u.userId||u.name;
  if(!state.marketDevice)state.marketDevice='D'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  return state.marketDevice;
}
function mkNorm(l){
  const m=/^L(\d+)$/.exec(String(l.id||''));
  return Object.assign({},l,{
    kind:l.kind||'sell',
    category:l.category||'ของใช้/มือสอง',
    stock:l.stock||'available',
    priceType:l.priceType||'fixed',
    images:Array.isArray(l.images)?l.images:[],
    area:l.area||'อ.กระนวน',
    acceptsDelivery:l.acceptsDelivery!==false,
    comments:Array.isArray(l.comments)?l.comments:[],
    reports:Array.isArray(l.reports)?l.reports:[],
    createdAt:l.createdAt||(m?+m[1]:0),
    poster:l.poster||{name:'คนในชุมชน'}
  });
}
function mkRaw(id){return (state.listings||[]).find(l=>l.id===id)}
function mkFind(id){const r=mkRaw(id);return r?mkNorm(r):null}
function mkVisible(l){return l.areaId===areaId&&l.status==='approved'&&l.reports.length<MK_HIDE_AT}
function mkStamp(l){return l.bumpedAt||l.createdAt||0}
function mkAgo(ts){
  if(!ts)return '';
  const m=Math.floor((Date.now()-ts)/60000);
  if(m<1)return 'เมื่อสักครู่';
  if(m<60)return m+' นาทีที่แล้ว';
  const h=Math.floor(m/60);
  if(h<24)return h+' ชั่วโมงที่แล้ว';
  return Math.floor(h/24)+' วันที่แล้ว';
}
function mkKm(a,b){
  const R=6371,r=x=>x*Math.PI/180,dLa=r(b.lat-a.lat),dLo=r(b.lng-a.lng);
  const h=Math.sin(dLa/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLo/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
function mkHasPin(l){return !!(l.pickup&&isFinite(l.pickup.lat)&&isFinite(l.pickup.lng))}
function mkPriceText(l){
  if(l.priceType==='free')return 'ฟรี';
  if(l.priceType==='ask')return 'ทักมาคุยราคา';
  return Number(l.price||0).toLocaleString('th-TH')+' ฿';
}
function mkItemPrice(l){return l.priceType==='fixed'?Number(l.price||0):(l.priceType==='free'?0:null)}
function mkNotice(t){const n=document.getElementById('notice');if(n)n.textContent=t}
function mkTop(){window.scrollTo({top:0,behavior:'smooth'})}
function mkAvatarHtml(p,cls){
  const name=(p&&p.name)||'คนในชุมชน';
  return (p&&p.avatar)?'<img class="mk-avatar" src="'+mkE(p.avatar)+'" alt="">':'<span class="mk-avatar">'+mkE(name.charAt(0))+'</span>';
}
function mkVerified(l){return l.verified?'<span class="mk-verified" title="ผู้ขายในอำเภอที่ยืนยันแล้ว">'+icon('shield')+'</span>':''}
function mkSeasonNow(){
  const d=new Date(),k=String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  return MK_SEASONS.find(s=>s.from<=s.to?(k>=s.from&&k<=s.to):(k>=s.from||k<=s.to))||null;
}
function mkActiveOrders(){return (state.orders||[]).filter(o=>o.areaId===areaId&&o.listingId&&!['done','cancelled'].includes(o.status))}
function mkOrderFor(id){
  const a=(state.orders||[]).filter(o=>o.areaId===areaId&&o.listingId===id);
  return a.length?a[a.length-1]:null;
}

/* ---------- ทางเข้า / สลับหน้า ---------- */
function marketResults(){
  if(query!==mk.lastQ){mk.lastQ=query;if(mk.screen!=='feed')mk.screen='feed'}
  mkRender();
}
function mkRender(){
  const r=document.getElementById('mkRoot');
  if(!r)return;
  if(mk.screen==='form'){r.innerHTML=mkFormHtml();mkFormInit();return}
  if(mk.screen==='detail'){
    const l=mkFind(mk.open);
    if(l&&mkVisible(l)){r.innerHTML=mkDetailHtml(l);return}
    mk.screen='feed';
  }
  r.innerHTML=mkFeedHtml();
}
function mkSetTab(t){mk.tab=t;mk.cat='ทั้งหมด';mkRender()}
function mkSetCat(c){mk.cat=c;mkRender()}
function mkSetSort(s){mk.sort=s;mkRender()}
function mkOpen(id){mk.open=id;mk.screen='detail';mk.dl=null;mk.reportOpen=false;mkRender();mkTop()}
function mkBack(){mk.screen='feed';mk.form=null;mkRender();mkTop()}

/* ---------- ฟีดหลัก ---------- */
function mkFeedHtml(){
  const all=(state.listings||[]).map(mkNorm).filter(mkVisible);
  const q=String(query||'').trim().toLowerCase();
  let list=all.filter(l=>l.kind===mk.tab&&(mk.cat==='ทั้งหมด'||l.category===mk.cat)&&(!q||[l.title,l.detail,l.area].join(' ').toLowerCase().includes(q)));
  const near=l=>mkHasPin(l)?mkKm(userLiveLocation,l.pickup):Infinity;
  const cheap=l=>l.priceType==='free'?0:(l.priceType==='ask'?Infinity:Number(l.price||0));
  if(mk.tab==='sell'&&mk.sort==='near')list.sort((a,b)=>near(a)-near(b)||mkStamp(b)-mkStamp(a));
  else if(mk.tab==='sell'&&mk.sort==='cheap')list.sort((a,b)=>cheap(a)-cheap(b)||mkStamp(b)-mkStamp(a));
  else list.sort((a,b)=>mkStamp(b)-mkStamp(a));

  const act=mkActiveOrders().filter(o=>mkFind(o.listingId));
  const season=mk.tab==='sell'?mkSeasonNow():null;
  const cats=['ทั้งหมด'].concat(MK_CATS);

  let h='<div class="mk-root">';
  h+='<div class="mk-head"><h2>ตลาดของคนกระนวน</h2><button type="button" class="mk-btn sm" onclick="mkOpenForm()">'+icon('plus')+'ลงประกาศ</button></div>';
  h+='<div class="mk-tabs" role="tablist">'+
     '<button type="button" role="tab" aria-pressed="'+(mk.tab==='sell')+'" onclick="mkSetTab(\'sell\')">'+icon('market')+'ประกาศขาย</button>'+
     '<button type="button" role="tab" aria-pressed="'+(mk.tab==='wanted')+'" onclick="mkSetTab(\'wanted\')">'+icon('search')+'ตามหาของ</button></div>';
  if(act.length){
    const o=act[act.length-1];
    h+='<button type="button" class="mk-strip" onclick="mkOpen(\''+mkE(o.listingId)+'\')">'+icon('rider')+'<span><b>มีออเดอร์ตลาดที่กำลังดำเนินการ ('+act.length+')</b>'+mkE(o.item)+' · '+mkE(statuses[o.status]||'')+'</span></button>';
  }
  if(season){
    h+='<button type="button" class="mk-season" onclick="mkSetCat(\''+mkE(season.category)+'\')"><span class="ico">'+icon('seed')+'</span><span><b>'+mkE(season.title)+'</b><span>'+mkE(season.text)+'</span></span></button>';
  }
  h+='<div class="mk-chips" role="group" aria-label="ประเภทสินค้า">'+cats.map(c=>'<button type="button" class="mk-chip" aria-pressed="'+(mk.cat===c)+'" onclick="mkSetCat(\''+mkE(c)+'\')">'+(MK_CAT_ICON[c]?icon(MK_CAT_ICON[c]):'')+mkE(c)+'</button>').join('')+'</div>';
  h+='<div class="mk-sortrow">';
  if(mk.tab==='sell'){
    h+=icon('sort')+[['new','ล่าสุด'],['near','ใกล้ฉันที่สุด'],['cheap','ราคาย่อมเยา']].map(([k,t])=>'<button type="button" class="mk-chip" aria-pressed="'+(mk.sort===k)+'" onclick="mkSetSort(\''+k+'\')">'+t+'</button>').join('');
  }
  h+='<span class="mk-count">'+list.length+' รายการ</span></div>';

  if(mk.tab==='sell'){
    h+='<div class="mk-grid">'+(list.map(mkCard).join('')||mkEmpty(all.filter(l=>l.kind==='sell').length))+'</div>';
  }else{
    h+='<div class="mk-list">'+(list.map(mkWantCard).join('')||mkEmpty(all.filter(l=>l.kind==='wanted').length,true))+'</div>';
  }
  return h+'</div>';
}
function mkEmpty(total,wanted){
  return '<div class="mk-empty"><b>'+(total?'ไม่พบรายการที่ตรงกับตัวกรอง':(wanted?'ยังไม่มีใครตามหาของ':'ยังไม่มีประกาศในตลาด'))+'</b>'+(total?'ลองเปลี่ยนประเภทสินค้า หรือค้นหาด้วยคำอื่น':'กด “ลงประกาศ” เพื่อเป็นคนแรกได้เลย')+'</div>';
}
function mkCard(l){
  const id=mkE(l.id),img=l.images[0],off=l.stock!=='available';
  return '<article class="mk-card" role="button" tabindex="0" onclick="mkOpen(\''+id+'\')" onkeydown="if(event.key===\'Enter\')mkOpen(\''+id+'\')">'+
    '<div class="mk-cover'+(off?' dim':'')+'" '+(img?'onclick="event.stopPropagation();mkOpenImage(\''+id+'\',0)"':'')+'>'+(img?'<img src="'+img+'" alt="'+mkE(l.title)+'" loading="lazy">':objectArt('market'))+
      '<span class="mk-loc">'+icon('pin')+mkE(l.area)+'</span>'+
      (l.images.length>1?'<span class="mk-imgcount">'+icon('image')+l.images.length+'</span>':'')+
      (off?'<span class="mk-ribbon">'+MK_STOCK[l.stock]+'</span>':'')+
    '</div>'+
    '<div class="mk-body">'+
      '<span class="mk-stock s-'+l.stock+'">'+MK_STOCK[l.stock]+'</span>'+
      '<h3 class="mk-title">'+mkE(l.title)+'</h3>'+
      '<span class="mk-price'+(l.priceType==='fixed'?'':' alt')+'">'+mkPriceText(l)+'</span>'+
      '<div class="mk-seller">'+mkAvatarHtml(l.poster)+'<span class="nm">'+mkE(l.poster.name||'คนในชุมชน')+'</span>'+mkVerified(l)+'</div>'+
      '<span class="mk-time">'+(l.isSample?'ประกาศตัวอย่าง':mkAgo(mkStamp(l)))+'</span>'+
    '</div></article>';
}
function mkWantCard(l){
  const id=mkE(l.id);
  return '<article class="mk-want" role="button" tabindex="0" onclick="mkOpen(\''+id+'\')" onkeydown="if(event.key===\'Enter\')mkOpen(\''+id+'\')">'+
    '<span class="mk-pill">'+icon('search')+'ตามหา</span>'+
    '<h3>'+mkE(l.title)+'</h3>'+(l.detail?'<p>'+mkE(l.detail)+'</p>':'')+
    '<div class="row"><span>'+icon('pin')+' '+mkE(l.area)+'</span><span>'+icon('chat')+' '+l.comments.length+' ความเห็น</span><span>'+mkE(mkAgo(mkStamp(l)))+'</span></div></article>';
}

/* ---------- หน้ารายละเอียดประกาศ ---------- */
function mkContactButtons(l){
  const tel=String(l.phone||'').replace(/[^0-9+]/g,'');
  let line='';
  if(l.lineId){
    const id=String(l.lineId).trim();
    line=id.startsWith('@')?'https://line.me/R/ti/p/'+encodeURIComponent(id):'https://line.me/ti/p/~'+encodeURIComponent(id);
  }
  const map=mkHasPin(l)?'https://www.google.com/maps/search/?api=1&query='+l.pickup.lat+','+l.pickup.lng:'';
  let h='';
  if(tel)h+='<a class="mk-btn sec" href="tel:'+mkE(tel)+'">'+icon('phone')+'โทรหาผู้ขาย</a>';
  if(line)h+='<a class="mk-btn sec" href="'+mkE(line)+'" target="_blank" rel="noopener">'+icon('chat')+'แชต/ทัก Line</a>';
  if(map)h+='<a class="mk-btn sec" href="'+mkE(map)+'" target="_blank" rel="noopener">'+icon('pin')+'ดูแผนที่นัดรับ</a>';
  return h?'<div class="mk-actions">'+h+'</div>':'';
}
function mkGalScroll(el){
  const n=el.children.length,i=Math.round(el.scrollLeft/Math.max(1,el.clientWidth))+1,c=document.getElementById('mkGalCount');
  if(c)c.textContent=Math.min(i,n)+'/'+n;
}
function mkDetailHtml(l){
  const mine=l.ownerId&&l.ownerId===mkMe();
  let h='<div class="mk-root">';
  h+='<div class="mk-back"><button type="button" onclick="mkBack()">'+icon('back')+'กลับตลาด</button>'+
     (mine?'':'<button type="button" onclick="mkToggleReport()" aria-label="รายงานโพสต์">'+icon('flag')+'รายงาน</button>')+'</div>';
  if(l.kind==='sell'){
    h+='<div class="mk-gallery">'+(l.images.length?
      '<div class="mk-gal-track" onscroll="mkGalScroll(this)">'+l.images.map((s,i)=>'<img src="'+s+'" alt="'+mkE(l.title)+' รูปที่ '+(i+1)+'" tabindex="0" role="button" onclick="mkOpenImage(\''+mkE(l.id)+'\','+i+')" onkeydown="if(event.key===\'Enter\')mkOpenImage(\''+mkE(l.id)+'\','+i+')">').join('')+'</div>'+(l.images.length>1?'<span class="mk-gal-count" id="mkGalCount">1/'+l.images.length+'</span>':''):
      '<div class="mk-gal-track"><div class="mk-gal-ph">'+objectArt('market')+'</div></div>')+'</div>';
  }
  h+='<div class="mk-panel" style="margin-top:12px">';
  h+='<div class="mk-badges" style="margin:0 0 8px">'+
     (l.kind==='sell'?'<span class="mk-stock s-'+l.stock+'">'+MK_STOCK[l.stock]+'</span>':'<span class="mk-pill">'+icon('search')+'ตามหา</span>')+
     '<span class="mk-pill">'+icon('pin')+mkE(l.area)+'</span>'+
     '<span class="mk-pill">'+icon(MK_CAT_ICON[l.category]||'market')+mkE(l.category)+'</span>'+
     (l.verified?'<span class="mk-pill green">'+icon('shield')+'ผู้ขายยืนยันแล้ว</span>':'')+'</div>';
  h+='<h2 class="mk-d-title">'+mkE(l.title)+'</h2>';
  if(l.kind==='sell')h+='<div class="mk-d-price'+(l.priceType==='fixed'?'':' alt')+'">'+mkPriceText(l)+'</div>';
  if(l.detail)h+='<p class="mk-d-text">'+mkE(l.detail)+'</p>';
  h+='<div class="mk-sellerbox">'+mkAvatarHtml(l.poster)+'<div><b>'+mkE(l.poster.name||'คนในชุมชน')+mkVerified(l)+'</b><small>'+(l.isSample?'ประกาศตัวอย่าง':'ลงเมื่อ '+mkE(mkAgo(mkStamp(l))))+'</small></div></div>';
  h+=mkContactButtons(l);
  h+='</div>';
  if(mk.reportOpen)h+=mkReportHtml(l);
  if(mine)h+=mkOwnerHtml(l);
  if(l.kind==='wanted')h+=mkCommentsHtml(l);
  else{
    h+='<div id="mkTrack">'+mkTrackHtml(l)+'</div>';
    h+='<div id="mkDelivery">'+mkDeliveryHtml(l)+'</div>';
  }
  return h+'</div>';
}
function mkReportHtml(l){
  const done=l.reports.some(r=>r.by===mkMe());
  return '<div class="mk-panel"><h3>'+icon('flag')+'รายงานโพสต์นี้</h3>'+(done?'<div class="mk-note ok">'+icon('check')+'<span>คุณรายงานโพสต์นี้แล้ว ขอบคุณที่ช่วยดูแลตลาด</span></div>':
    '<div class="mk-seg">'+MK_REPORT_REASONS.map(r=>'<button type="button" class="mk-opt" onclick="mkReport(\''+mkE(l.id)+'\',\''+mkE(r)+'\')"><span class="dot"></span><span><b>'+r+'</b></span></button>').join('')+'</div>'+
    '<div class="mk-note">'+icon('alert')+'<span>โพสต์ที่ถูกรายงานครบ '+MK_HIDE_AT+' ครั้งจะถูกซ่อนจากตลาดเพื่อรอแอดมินอำเภอตรวจสอบ</span></div>')+'</div>';
}
function mkToggleReport(){mk.reportOpen=!mk.reportOpen;mkRender()}
function mkReport(id,reason){
  const r=mkRaw(id);if(!r)return;
  r.reports=Array.isArray(r.reports)?r.reports:[];
  if(r.reports.some(x=>x.by===mkMe()))return;
  r.reports.push({by:mkMe(),reason,at:Date.now()});
  if(r.reports.length>=MK_HIDE_AT){mk.screen='feed';mkNotice('ขอบคุณ โพสต์นี้ถูกซ่อนและส่งให้แอดมินตรวจสอบแล้ว')}
  else mkNotice('ขอบคุณ ส่งรายงานให้แอดมินแล้ว');
  save();
}
function mkOwnerHtml(l){
  const bumped=l.bumpedAt&&new Date(l.bumpedAt).toDateString()===new Date().toDateString();
  const id=mkE(l.id);
  let h='<div class="mk-panel mk-owner"><h3>'+icon('user')+'จัดการประกาศของฉัน</h3>';
  if(l.kind==='sell'){
    h+='<div class="mk-seg" style="grid-template-columns:repeat(3,1fr)">'+Object.keys(MK_STOCK).map(k=>'<button type="button" class="mk-opt" style="padding:10px 8px;justify-content:center;text-align:center" aria-pressed="'+(l.stock===k)+'" onclick="mkSetStock(\''+id+'\',\''+k+'\')"><span><b style="font-size:12px">'+MK_STOCK[k]+'</b></span></button>').join('')+'</div>';
    h+='<label class="mk-check"><input type="checkbox" '+(l.acceptsDelivery?'checked':'')+' onchange="mkToggleDelivery(\''+id+'\')"><span>เปิดรับเดลิเวอรี่ (ให้ผู้ซื้อเรียกรถมารับของ)<small>ปิดไว้เมื่อไม่อยู่บ้านหรือไม่พร้อมให้ไรเดอร์มารับ</small></span></label>';
  }
  h+='<div class="mk-actions">'+
     '<button type="button" class="mk-btn sec'+(bumped?' off':'')+'" onclick="mkBump(\''+id+'\')">'+icon('bump')+(bumped?'ดันโพสต์แล้ววันนี้':'ดันโพสต์ขึ้นบน')+'</button>'+
     '<button type="button" class="mk-btn danger" onclick="mkDelete(\''+id+'\')">'+icon('trash')+'ลบประกาศ</button></div>';
  if(!bumped)h+='<div class="mk-note">'+icon('clock')+'<span>ดันโพสต์ได้วันละ 1 ครั้ง ประกาศจะกลับขึ้นไปอยู่ลำดับบนของตลาด</span></div>';
  return h+'</div>';
}
function mkSetStock(id,s){const r=mkRaw(id);if(r){r.stock=s;save()}}
function mkToggleDelivery(id){const r=mkRaw(id);if(r){r.acceptsDelivery=!(r.acceptsDelivery!==false);save()}}
function mkBump(id){
  const r=mkRaw(id);if(!r)return;
  if(r.bumpedAt&&new Date(r.bumpedAt).toDateString()===new Date().toDateString())return;
  r.bumpedAt=Date.now();mkNotice('ดันโพสต์เรียบร้อย');save();
}
function mkDelete(id){
  if(!confirm('ลบประกาศนี้ใช่หรือไม่?'))return;
  state.listings=state.listings.filter(l=>l.id!==id);
  mk.screen='feed';mkNotice('ลบประกาศแล้ว');save();
}

/* ---------- ตามหาของ: ความเห็น ---------- */
function mkCommentsHtml(l){
  return '<div class="mk-panel"><h3>'+icon('chat')+'ความเห็น ('+l.comments.length+')</h3>'+
    (l.comments.map(c=>'<div class="mk-cmt">'+mkAvatarHtml({name:c.name,avatar:c.avatar})+'<div><b>'+mkE(c.name||'คนในชุมชน')+'</b><small>'+mkE(mkAgo(c.at))+'</small><p>'+mkE(c.text)+'</p></div></div>').join('')||'<div class="mk-note">'+icon('chat')+'<span>ยังไม่มีใครตอบ เป็นคนแรกที่ช่วยตอบได้เลย</span></div>')+
    '<div class="mk-cmtbox"><input id="mkCmt" class="mk-input" maxlength="300" placeholder="พิมพ์ตอบ เช่น บ้านนี้มีขาย ทักมาได้เลย" onkeydown="if(event.key===\'Enter\')mkComment(\''+mkE(l.id)+'\')"><button type="button" class="mk-btn" onclick="mkComment(\''+mkE(l.id)+'\')">ส่ง</button></div></div>';
}
function mkComment(id){
  const i=document.getElementById('mkCmt'),t=i?i.value.trim():'';
  const r=mkRaw(id);if(!t||!r)return;
  r.comments=Array.isArray(r.comments)?r.comments:[];
  const u=state.currentUser||{};
  r.comments.push({name:u.name||'คนในชุมชน',avatar:u.avatar||'',text:t,at:Date.now()});
  save();
}

/* ---------- กล่องคำนวณการจัดส่ง + สรุปยอด + ชำระเงิน ---------- */
function mkDl(l){
  if(!mk.dl||mk.dl.id!==l.id)mk.dl={id:l.id,method:l.acceptsDelivery&&l.stock==='available'?'delivery':'self',drop:'gps',note:'',pay:'qr'};
  return mk.dl;
}
function mkQuote(l,dl){
  const pin=mkHasPin(l),pickup=pin?{lat:l.pickup.lat,lng:l.pickup.lng}:SERVICE_CENTER;
  const drop=(dl.drop==='home'&&state.marketHome)?state.marketHome:userLiveLocation;
  const km=mkKm(pickup,drop);
  let fee=25;try{fee=KranuanPricing.quote(km).total}catch(e){}
  return {pickup,drop,km,fee,approx:!pin,out:mkKm(SERVICE_CENTER,drop)>SERVICE_RADIUS_KM};
}
const MK_STEPS=['รอร้านค้ายืนยัน','กำลังหาไรเดอร์','ไรเดอร์กำลังไปรับของ','กำลังนำของมาส่ง'];
function mkTrackHtml(l){
  const o=mkOrderFor(l.id);if(!o)return '';
  const idx={seller:0,waiting:0,ready:1,assigned:2,picked:3,done:4}[o.status];
  let h='<div class="mk-panel"><h3>'+icon('route')+'สถานะการสั่งซื้อ</h3>';
  if(o.status==='cancelled'){
    return h+'<div class="mk-note warn">'+icon('alert')+'<span>ออเดอร์นี้ถูกยกเลิกแล้ว</span></div></div>';
  }
  h+='<div class="mk-steps">'+MK_STEPS.map((t,i)=>'<div class="mk-step '+(i<idx?'done':(i===idx?'now':''))+'"><div class="c">'+(i<idx?icon('check'):(i+1))+'</div>'+t+'</div>').join('')+'</div>';
  if(o.status==='done')h+='<div class="mk-note ok">'+icon('check')+'<span>ส่งของสำเร็จแล้ว</span></div>';
  if(['assigned','picked'].includes(o.status)){
    const tel=o.rider&&o.rider.phone?String(o.rider.phone).replace(/[^0-9+]/g,''):'';
    const d=o.coordinates&&o.coordinates.drop;
    h+='<div class="mk-actions">'+
      (tel?'<a class="mk-btn sec" href="tel:'+mkE(tel)+'">'+icon('phone')+'โทรหาไรเดอร์</a>':'<span class="mk-btn sec off">'+icon('phone')+'ยังไม่มีเบอร์ไรเดอร์</span>')+
      (d?'<a class="mk-btn sec" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination='+d.lat+','+d.lng+'&travelmode=driving">'+icon('pin')+'ดูพิกัดบนแผนที่</a>':'')+'</div>';
  }
  if(['seller','waiting','ready'].includes(o.status))h+='<div class="mk-actions"><button type="button" class="mk-btn danger" onclick="advance(\''+mkE(o.id)+'\',\'cancelled\')">ยกเลิกคำขอ</button></div>';
  return h+'</div>';
}
function mkOptBtn(on,onclick,title,sub,dis){
  return '<button type="button" class="mk-opt" aria-pressed="'+on+'" '+(dis?'disabled ':'')+'onclick="'+onclick+'"><span class="dot"></span><span><b>'+title+'</b>'+(sub?'<small>'+sub+'</small>':'')+'</span></button>';
}
function mkDeliveryHtml(l){
  if(l.kind!=='sell')return '';
  const dl=mkDl(l),id=mkE(l.id),canDel=l.acceptsDelivery&&l.stock==='available';
  const order=mkOrderFor(l.id),active=order&&!['done','cancelled'].includes(order.status);
  if(dl.method==='delivery'&&!canDel)dl.method='self';
  const q=mkQuote(l,dl),item=mkItemPrice(l),total=(item||0)+q.fee,delivering=dl.method==='delivery';
  let h='<div class="mk-panel"><h3>'+icon('rider')+'เลือกวิธีรับของ</h3>';
  h+='<div class="mk-seg">'+
    mkOptBtn(delivering,"mkSetDl('method','delivery')",'ให้รถไปรับมาส่งที่บ้าน','ไรเดอร์ไปรับจากผู้ขายแล้วนำมาส่งถึงที่',!canDel)+
    mkOptBtn(!delivering,"mkSetDl('method','self')",'นัดรับเอง','ไปรับของกับผู้ขายด้วยตัวเอง',false)+'</div>';
  if(!l.acceptsDelivery)h+='<div class="mk-note warn">'+icon('alert')+'<span>ผู้ขายปิดรับเดลิเวอรี่อยู่ในขณะนี้ ติดต่อผู้ขายเพื่อนัดรับเองได้</span></div>';
  else if(l.stock!=='available')h+='<div class="mk-note warn">'+icon('alert')+'<span>สินค้านี้'+MK_STOCK[l.stock]+' จึงยังเรียกรถไปรับไม่ได้</span></div>';
  if(!delivering){
    h+='<div class="mk-note">'+icon('pin')+'<span>จุดนัดรับ: '+mkE(l.pickupLabel||(l.pickup&&l.pickup.label)||l.area)+(mkHasPin(l)?' (กดปุ่ม “ดูแผนที่นัดรับ” ด้านบนเพื่อเปิดแผนที่)':'')+'</span></div></div>';
    return h+mkContactCta(l);
  }
  h+='<label class="mk-label">จุดส่งสินค้า</label><div class="mk-seg">'+
    mkOptBtn(dl.drop==='gps',"mkSetDl('drop','gps')",'ตำแหน่งปัจจุบันของฉัน',mk.gpsOk?'ดึงจาก GPS แล้ว':'ยังเป็นตำแหน่งโดยประมาณ กดอัปเดตเพื่อความแม่นยำ',false)+
    mkOptBtn(dl.drop==='home',"mkSetDl('drop','home')",'หมุดบ้านที่บันทึกไว้',state.marketHome?'ใช้หมุดบ้านที่บันทึกไว้':'ยังไม่ได้บันทึกหมุดบ้าน',!state.marketHome)+'</div>';
  h+='<div class="mk-actions" style="margin-top:8px"><button type="button" class="mk-btn ghost sm" onclick="mkGps()">'+icon('crosshair')+'อัปเดตตำแหน่งปัจจุบัน</button><button type="button" class="mk-btn ghost sm" onclick="mkSaveHome()">'+icon('home')+'บันทึกตำแหน่งนี้เป็นหมุดบ้าน</button></div>';
  h+='<div class="mk-fare"><div><small>ระยะทางจริง</small><b>'+q.km.toFixed(1)+'<i>กม.</i></b></div><div><small>ค่ารถไปรับ-ส่ง</small><b>'+q.fee+'<i>บาท</i></b></div></div>';
  if(q.approx)h+='<div class="mk-note">'+icon('alert')+'<span>ผู้ขายยังไม่ได้ปักหมุดจุดรับของ ระยะทางนี้คำนวณจากศูนย์กลางอำเภอ ค่าส่งจริงอาจต่างไปเล็กน้อย</span></div>';
  if(q.out)h+='<div class="mk-note warn">'+icon('alert')+'<span>จุดส่งอยู่นอกพื้นที่ให้บริการ ('+SERVICE_RADIUS_KM+' กม. จากศูนย์กลางอำเภอ)</span></div>';
  h+='<label class="mk-label" for="mkRiderNote">โน้ตถึงไรเดอร์</label><textarea id="mkRiderNote" class="mk-textarea" maxlength="200" placeholder="เช่น รับของกับยายมี บ้านสีฟ้าข้างวัด" oninput="mk.dl.note=this.value">'+mkE(dl.note)+'</textarea></div>';

  h+='<div class="mk-panel"><h3>'+icon('orders')+'สรุปยอดและการชำระเงิน</h3><div class="mk-sum" style="margin-top:0;border-top:0;padding-top:0">'+
    '<div class="r"><span>ค่าสินค้า</span><span>'+(item===null?'ตกลงกับผู้ขาย':item.toLocaleString('th-TH')+' บาท')+'</span></div>'+
    '<div class="r"><span>ค่ารถไปรับ-ส่ง</span><span>'+q.fee+' บาท</span></div>'+
    '<div class="r t"><span>ราคารวมทั้งหมด</span><b>'+total.toLocaleString('th-TH')+' บาท</b></div></div>';
  if(item===null)h+='<div class="mk-note">'+icon('chat')+'<span>สินค้านี้ราคาตกลงกับผู้ขาย ยอดด้านบนจึงเป็นค่ารถอย่างเดียว</span></div>';
  h+='<label class="mk-label">ช่องทางชำระเงิน</label><div class="mk-seg mk-pay">'+
    '<button type="button" class="mk-opt" aria-pressed="'+(dl.pay==='qr')+'" onclick="mkSetDl(\'pay\',\'qr\')"><span class="ico">'+icon('qr')+'</span><span><b>สแกน QR PromptPay</b><small>ชำระรวมทั้งหมด</small></span></button>'+
    '<button type="button" class="mk-opt" aria-pressed="'+(dl.pay==='cod')+'" onclick="mkSetDl(\'pay\',\'cod\')"><span class="ico">'+icon('cash')+'</span><span><b>จ่ายเงินสดปลายทาง (COD)</b><small>ชำระให้ไรเดอร์ตอนรับของ</small></span></button></div>';
  const can=!q.out&&!active;
  h+='<div class="mk-cta"><button type="button" class="mk-btn block'+(can?'':' off')+'" '+(can?'':'disabled ')+'onclick="mkOrder(\''+id+'\')">'+icon('rider')+(active?'สั่งซื้อสินค้านี้แล้ว':'สั่งซื้อ + เรียกรถไปรับของ')+'</button>'+
    mkContactCtaBtn(l)+'</div></div>';
  return h;
}
function mkContactCtaBtn(l){
  const tel=String(l.phone||'').replace(/[^0-9+]/g,'');
  return tel?'<a class="mk-btn sec block" href="tel:'+mkE(tel)+'">'+icon('phone')+'ติดต่อผู้ขายโดยตรง</a>':'';
}
function mkContactCta(l){const b=mkContactCtaBtn(l);return b?'<div class="mk-panel" style="margin-top:12px">'+b+'</div>':''}
function mkRenderDelivery(){
  const l=mkFind(mk.open),el=document.getElementById('mkDelivery');
  if(l&&el)el.innerHTML=mkDeliveryHtml(l);
}
function mkSetDl(k,v){if(!mk.dl)return;mk.dl[k]=v;mkRenderDelivery()}
function mkGps(){
  const done=p=>{userLiveLocation={lat:p.lat,lng:p.lng};mkRenderDelivery()};
  if(!navigator.geolocation){mkNotice('อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง');return}
  navigator.geolocation.getCurrentPosition(pos=>{mk.gpsOk=true;done({lat:pos.coords.latitude,lng:pos.coords.longitude})},()=>mkNotice('ดึงตำแหน่งไม่ได้ กรุณาอนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์'),{enableHighAccuracy:true,timeout:8000,maximumAge:0});
}
function mkSaveHome(){
  state.marketHome={lat:userLiveLocation.lat,lng:userLiveLocation.lng};
  if(mk.dl)mk.dl.drop='home';
  mkNotice('บันทึกหมุดบ้านแล้ว');save();
}
function mkOrder(id){
  const l=mkFind(id);if(!l||l.kind!=='sell')return;
  const dl=mkDl(l);
  if(dl.method!=='delivery'||!l.acceptsDelivery||l.stock!=='available')return;
  const prev=mkOrderFor(id);if(prev&&!['done','cancelled'].includes(prev.status))return;
  const q=mkQuote(l,dl);if(q.out)return;
  const item=mkItemPrice(l);
  state.orders.push({
    id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),
    areaId,status:'seller',type:'market',listingId:l.id,item:l.title,
    itemPrice:item,deliveryFee:q.fee,total:(item||0)+q.fee,paymentMethod:dl.pay,
    note:(dl.note||'').trim(),
    pickupInfo:{address:l.pickupLabel||(l.pickup&&l.pickup.label)||l.area,note:''},
    coordinates:{pickup:q.pickup,drop:q.drop,isSample:false},
    createdAt:Date.now()
  });
  mkNotice('ส่งคำสั่งซื้อแล้ว รอผู้ขายยืนยัน');
  save();
}

/* ---------- ฟอร์มลงประกาศ ---------- */
function mkEmptyForm(kind){
  return {kind,title:'',detail:'',category:kind==='sell'?'ของใช้/มือสอง':'ผลผลิตเกษตร',priceType:'fixed',price:'',area:'',pickupLabel:'',phone:'',lineId:'',acceptsDelivery:true,images:[],pickup:null};
}
function mkOpenForm(){mk.form=mkEmptyForm(mk.tab);mk.screen='form';mkRender();mkTop()}
function mkFormHtml(){
  if(!mk.form)mk.form=mkEmptyForm(mk.tab);
  const f=mk.form,sell=f.kind==='sell',v=n=>mkE(f[n]||'');
  let h='<div class="mk-root"><div class="mk-back"><button type="button" onclick="mkBack()">'+icon('back')+'ยกเลิก</button></div>';
  h+='<form id="mkForm" novalidate>';
  h+='<div class="mk-panel" style="margin-top:0"><h3>'+icon(sell?'market':'search')+(sell?'ลงประกาศขาย':'โพสต์ตามหาของ')+'</h3>';
  h+='<div class="mk-tabs" style="margin-bottom:0"><button type="button" aria-pressed="'+sell+'" onclick="mkFormKind(\'sell\')">'+icon('market')+'ขายของ</button><button type="button" aria-pressed="'+!sell+'" onclick="mkFormKind(\'wanted\')">'+icon('search')+'ตามหาของ</button></div></div>';
  if(sell){
    h+='<div class="mk-panel"><h3>'+icon('camera')+'รูปสินค้า</h3><div class="mk-photos" id="mkThumbs"></div><input id="mkFile" type="file" accept="image/*" multiple hidden onchange="mkAddPhotos(this)"><div class="mk-note">'+icon('image')+'<span>ใส่ได้สูงสุด '+MK_MAX_PHOTOS+' รูป ระบบย่อรูปให้อัตโนมัติ (ยังไม่รองรับวิดีโอ)</span></div></div>';
  }
  h+='<div class="mk-panel"><h3>'+icon('orders')+'รายละเอียด</h3>'+
    '<label class="mk-label" style="margin-top:0" for="mkTitle">'+(sell?'ชื่อสินค้า / รายการ':'ตามหาอะไร')+'</label><input id="mkTitle" class="mk-input" name="title" required maxlength="80" placeholder="'+(sell?'เช่น ไข่ไก่สด, โต๊ะไม้, รับซ่อมพัดลม':'เช่น หาช่างซ่อมพัดลม, มีใครขายไข่มดแดงบ้าง')+'" value="'+v('title')+'">'+
    '<label class="mk-label" for="mkCat">ประเภท</label><select id="mkCat" class="mk-select" name="category">'+MK_CATS.map(c=>'<option'+(f.category===c?' selected':'')+'>'+c+'</option>').join('')+'</select>';
  if(sell){
    h+='<label class="mk-label">ราคา</label><div class="mk-ptype">'+[['fixed','กำหนดราคา'],['free','ฟรี'],['ask','ทักมาคุยราคา']].map(([k,t])=>'<label><input type="radio" name="priceType" value="'+k+'"'+(f.priceType===k?' checked':'')+'><span>'+t+'</span></label>').join('')+'</div>'+
      '<div id="mkPriceWrap" style="margin-top:8px;'+(f.priceType==='fixed'?'':'display:none')+'"><input class="mk-input" name="price" type="number" inputmode="numeric" min="0" step="1" placeholder="ราคา (บาท)" value="'+v('price')+'"></div>';
  }
  h+='<label class="mk-label" for="mkDetail">ข้อความอธิบาย</label><textarea id="mkDetail" class="mk-textarea" name="detail" maxlength="600" placeholder="'+(sell?'อธิบายสินค้า สภาพ จำนวน ฯลฯ':'อธิบายสิ่งที่ต้องการ เช่น แถวตำบลไหน ต้องการเมื่อไหร่')+'">'+v('detail')+'</textarea></div>';
  h+='<div class="mk-panel"><h3>'+icon('pin')+(sell?'พื้นที่และจุดนัดรับ':'พื้นที่')+'</h3>'+
    '<label class="mk-label" style="margin-top:0" for="mkArea">ตำบล / หมู่บ้าน (แสดงเป็นแท็กพื้นที่)</label><input id="mkArea" class="mk-input" name="area" required maxlength="40" placeholder="เช่น ต.ในเมือง หรือ หมู่ 3 บ้านโนน..." value="'+v('area')+'">';
  if(sell){
    h+='<label class="mk-label" for="mkPLabel">นัดรับเองที่</label><input id="mkPLabel" class="mk-input" name="pickupLabel" maxlength="80" placeholder="เช่น หน้าบ้าน ข้างวัด" value="'+v('pickupLabel')+'">'+
      '<div class="mk-actions" style="margin-top:8px"><button type="button" class="mk-btn ghost sm" onclick="mkFormPin()">'+icon('crosshair')+'ปักหมุดตำแหน่งปัจจุบัน</button></div><div id="mkPinState"></div>'+
      '<label class="mk-check"><input type="checkbox" name="acceptsDelivery"'+(f.acceptsDelivery?' checked':'')+'><span>มีบริการส่งในอำเภอ<small>ผู้ซื้อกดเรียกรถมารับของที่จุดที่ปักหมุดไว้ได้</small></span></label>';
  }
  h+='</div>';
  h+='<div class="mk-panel"><h3>'+icon('phone')+'ช่องทางติดต่อ</h3><div class="mk-note">'+icon('shield')+'<span>ไม่ต้องพิมพ์เบอร์ในข้อความ ระบบจะแสดงเป็นปุ่มกดใต้โพสต์ให้</span></div>'+
    '<label class="mk-label" for="mkPhone">เบอร์โทรศัพท์'+(sell?'':' (ไม่บังคับ)')+'</label><input id="mkPhone" class="mk-input" name="phone" type="tel" inputmode="numeric" maxlength="10" pattern="[0-9]{9,10}"'+(sell?' required':'')+' placeholder="เช่น 0812345678" value="'+v('phone')+'">'+
    '<label class="mk-label" for="mkLine">Line ID (ไม่บังคับ)</label><input id="mkLine" class="mk-input" name="lineId" maxlength="40" placeholder="เช่น mylineid หรือ @shopname" value="'+v('lineId')+'"></div>';
  h+='<div class="mk-err" id="mkFormErr" role="alert"></div><div class="mk-cta"><button type="submit" class="mk-btn block">'+icon('check')+'โพสต์ประกาศ</button></div></form></div>';
  return h;
}
function mkFormInit(){
  const form=document.getElementById('mkForm');if(!form)return;
  form.addEventListener('input',mkFormSync);
  form.addEventListener('change',mkFormSync);
  form.addEventListener('submit',mkFormSubmit);
  mkRenderThumbs();mkRefreshPin();
}
function mkFormSync(e){
  const t=e.target;if(!t||!t.name||!mk.form)return;
  mk.form[t.name]=t.type==='checkbox'?t.checked:t.value;
  if(t.name==='priceType'){const w=document.getElementById('mkPriceWrap');if(w)w.style.display=t.value==='fixed'?'':'none'}
}
function mkFormKind(k){if(!mk.form)return;const old=mk.form;mk.form=Object.assign(mkEmptyForm(k),{title:old.title,detail:old.detail,area:old.area,phone:old.phone,lineId:old.lineId});mkRender()}
function mkRenderThumbs(){
  const el=document.getElementById('mkThumbs');if(!el||!mk.form)return;
  const imgs=mk.form.images;
  el.innerHTML=imgs.map((s,i)=>'<div class="mk-thumb"><img src="'+s+'" alt="รูปที่ '+(i+1)+'"><button type="button" aria-label="ลบรูป" onclick="mkRemovePhoto('+i+')">'+icon('close')+'</button></div>').join('')+
    (imgs.length<MK_MAX_PHOTOS?'<button type="button" class="mk-addph" onclick="document.getElementById(\'mkFile\').click()">'+icon('camera')+'เพิ่มรูป ('+imgs.length+'/'+MK_MAX_PHOTOS+')</button>':'');
}
function mkRemovePhoto(i){mk.form.images.splice(i,1);mkRenderThumbs()}
function mkCompress(file){
  return new Promise((res,rej)=>{
    const fr=new FileReader();
    fr.onerror=rej;
    fr.onload=()=>{
      const im=new Image();
      im.onerror=rej;
      im.onload=()=>{
        const M=720,s=Math.min(1,M/Math.max(im.width,im.height)),c=document.createElement('canvas');
        c.width=Math.max(1,Math.round(im.width*s));c.height=Math.max(1,Math.round(im.height*s));
        c.getContext('2d').drawImage(im,0,0,c.width,c.height);
        res(c.toDataURL('image/jpeg',.68));
      };
      im.src=fr.result;
    };
    fr.readAsDataURL(file);
  });
}
async function mkAddPhotos(input){
  const f=mk.form;if(!f)return;
  const files=[...input.files].slice(0,MK_MAX_PHOTOS-f.images.length);
  for(const file of files){try{f.images.push(await mkCompress(file))}catch(e){}}
  input.value='';mkRenderThumbs();
}
function mkRefreshPin(){
  const el=document.getElementById('mkPinState');if(!el||!mk.form)return;
  const p=mk.form.pickup;
  el.innerHTML=p?'<div class="mk-note ok">'+icon('check')+'<span>ปักหมุดแล้ว ('+p.lat.toFixed(4)+', '+p.lng.toFixed(4)+')</span></div>':'<div class="mk-note">'+icon('pin')+'<span>ยังไม่ได้ปักหมุด (จำเป็นถ้าเปิดบริการส่ง)</span></div>';
}
function mkFormPin(){
  if(!mk.form)return;
  const set=p=>{mk.form.pickup={lat:p.lat,lng:p.lng};mkRefreshPin()};
  if(!navigator.geolocation){set(userLiveLocation);return}
  navigator.geolocation.getCurrentPosition(pos=>{userLiveLocation={lat:pos.coords.latitude,lng:pos.coords.longitude};mk.gpsOk=true;set(userLiveLocation)},()=>{set(userLiveLocation);const e=document.getElementById('mkFormErr');if(e)e.textContent='ดึงตำแหน่งจริงไม่ได้ ใช้ตำแหน่งโดยประมาณแทน กรุณาอนุญาตการเข้าถึงตำแหน่งแล้วกดปักหมุดอีกครั้ง'},{enableHighAccuracy:true,timeout:8000,maximumAge:0});
}
function mkFormSubmit(e){
  e.preventDefault();
  const f=mk.form,err=document.getElementById('mkFormErr'),sell=f.kind==='sell';
  const fail=m=>{if(err)err.textContent=m;return false};
  const title=String(f.title||'').trim(),area=String(f.area||'').trim(),phone=String(f.phone||'').trim();
  if(!title)return fail(sell?'กรุณากรอกชื่อสินค้า':'กรุณากรอกว่าต้องการตามหาอะไร');
  if(!area)return fail('กรุณากรอกตำบล/หมู่บ้าน');
  if(sell&&f.priceType==='fixed'&&!(Number(f.price)>=0&&String(f.price)!==''))return fail('กรุณาใส่ราคา หรือเลือก ฟรี / ทักมาคุยราคา');
  if(sell&&!/^[0-9]{9,10}$/.test(phone))return fail('กรุณากรอกเบอร์โทร 9-10 หลัก');
  if(!sell&&phone&&!/^[0-9]{9,10}$/.test(phone))return fail('เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก');
  if(sell&&f.acceptsDelivery&&!f.pickup)return fail('เปิดบริการส่งแล้ว กรุณาปักหมุดจุดรับของก่อน');
  const u=state.currentUser||{};
  const rec={
    id:'L'+Date.now(),areaId,kind:f.kind,title,detail:String(f.detail||'').trim(),category:f.category,
    condition:f.category,price:sell&&f.priceType==='fixed'?Number(f.price):0,priceType:sell?f.priceType:'ask',
    phone,lineId:String(f.lineId||'').trim(),area,
    pickupLabel:sell?String(f.pickupLabel||'').trim():'',
    pickup:sell&&f.pickup?{lat:f.pickup.lat,lng:f.pickup.lng,label:String(f.pickupLabel||'').trim()}:null,
    acceptsDelivery:sell?!!f.acceptsDelivery:false,stock:'available',images:sell?f.images.slice():[],
    status:'approved',isSample:false,verified:!!u.verified,ownerId:mkMe(),createdAt:Date.now(),
    comments:[],reports:[],poster:{name:u.name||'คนในชุมชน',avatar:u.avatar||''}
  };
  state.listings.push(rec);
  try{localStorage.setItem(key,JSON.stringify(state))}catch(x){
    state.listings.pop();
    return fail('พื้นที่เก็บข้อมูลในเครื่องเต็ม ลองลดจำนวนรูป หรือลบประกาศเก่า');
  }
  mk.form=null;mk.screen='feed';mk.tab=rec.kind;mk.cat='ทั้งหมด';
  save();mkNotice('ลงประกาศสำเร็จ');mkTop();
}

/* กดเมนู “ตลาด” แล้วกลับมาหน้าฟีดเสมอ (ครอบฟังก์ชันเดิม ไม่แก้ logic ของหน้าอื่น) */
(function(){
  const g=go,sc=setCategory;
  go=function(v){if(v==='ตลาด'){mk.screen='feed';mk.form=null}return g.apply(this,arguments)};
  setCategory=function(c){if(c==='ตลาด'){mk.screen='feed';mk.form=null}return sc.apply(this,arguments)};
})();


/* Central storage bridge: ownership and all writes are checked by the server. */
Object.assign(paths,{back:'<path d="m14 5-7 7 7 7"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/>',camera:'<path d="M3 7h5l2-3h4l2 3h5v14H3Z"/><circle cx="12" cy="13" r="4"/>',shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',route:'<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M5 7v8h14V7h-8"/>',crate:'<path d="m3 7 9-4 9 4v14H3ZM3 7h18M12 7v14"/>'});
let marketLoading=false,marketMine=false,marketFingerprint='';
mkMe=function(){return K.user?.id||''};mkVisible=function(l){return l.status==='approved'||l.ownerId===mkMe()||K.user?.role==='admin'};
async function marketLoad(force=false){if(!K.user||marketLoading)return;marketLoading=true;try{const [listings,rows]=await Promise.all([K.request('/market/listings'),K.request('/orders')]);const fingerprint=JSON.stringify([listings,rows.filter(o=>o.type==='market')]);state.listings=listings.map(l=>({...l,areaId}));liveOrders=rows;if(view==='ตลาด'&&mk.screen!=='form'&&(force||fingerprint!==marketFingerprint))mkRender();marketFingerprint=fingerprint}catch(e){mkNotice('เชื่อมตลาดไม่ได้: '+e.message)}finally{marketLoading=false}}
const renderBeforeMarket=render;render=function(){renderBeforeMarket();if(view==='ตลาด'){document.getElementById('app').innerHTML=categoryBar()+'<div id="mkRoot"></div>';mkRender();marketLoad()}};
marketResults=function(){if(query!==mk.lastQ){mk.lastQ=query;mk.screen='feed'}mkRender();marketLoad()};K.on(()=>{if(view==='ตลาด')marketLoad()});
mkActiveOrders=function(){return liveOrders.filter(o=>o.type==='market'&&o.customer_id===mkMe()&&!['done','cancelled'].includes(o.status))};mkOrderFor=function(id){return liveOrders.find(o=>o.type==='market'&&o.listingId===id&&o.customer_id===mkMe())||null};
const baseMarketFeed=mkFeedHtml;mkFeedHtml=function(){const original=state.listings;if(marketMine)state.listings=original.filter(l=>l.ownerId===mkMe());let body=baseMarketFeed();state.listings=original;return '<div class="mk-actions" style="margin-bottom:14px"><button class="mk-btn '+(!marketMine?'':'sec')+'" onclick="marketMine=false;mkRender()">ตลาดทั้งหมด</button><button class="mk-btn '+(marketMine?'':'sec')+'" onclick="marketMine=true;mkRender()">ประกาศของฉัน</button></div>'+mkSellerRequests()+body};
function mkSellerRequests(lid){const incoming=liveOrders.filter(o=>o.type==='market'&&o.seller_id===mkMe()&&(!lid||o.listingId===lid)&&!['done','cancelled'].includes(o.status));if(!incoming.length)return '';return '<div class="mk-panel"><h3>'+icon('orders')+'คำสั่งซื้อจากลูกค้า ('+incoming.length+')</h3>'+incoming.map(o=>'<div class="mk-seller-request"><b>'+mkE(o.item)+'</b><p>'+mkE(o.customer_name)+' · '+mkE(o.phone)+'</p><p>ส่งที่ '+mkE(o.dropoff)+'</p><p>รวม '+C.money(o.total)+' · '+mkE(statuses[o.status]||o.status)+'</p>'+(o.status==='waiting'?'<div class="mk-actions"><button class="mk-btn" onclick="mkSellerDecision(\''+o.id+'\',true,this)">ยืนยันพร้อมส่งให้ไรเดอร์</button><button class="mk-btn danger" onclick="mkSellerDecision(\''+o.id+'\',false,this)">ปฏิเสธคำขอ</button></div>':'<p class="mk-note">งานเข้าคิวไรเดอร์แล้ว ติดตามต่อในงานของฉัน</p>')+'</div>').join('')+'</div>'}
async function mkSellerDecision(id,accept,button){button.disabled=true;try{await K.request('/market/orders/'+id+'/'+(accept?'confirm':'reject'),{method:'POST',body:'{}'});await marketLoad(true);mkNotice(accept?'ยืนยันแล้ว ส่งงานเข้าคิวไรเดอร์':'ปฏิเสธแล้ว คืนสถานะสินค้าเป็นพร้อมขาย')}catch(e){mkNotice(e.message);button.disabled=false}}
const baseMarketOwner=mkOwnerHtml;mkOwnerHtml=function(l){return baseMarketOwner(l)+'<div class="mk-actions"><button class="mk-btn sec" onclick="mkEdit(\''+l.id+'\')">'+icon('orders')+'แก้ไขประกาศและรูป</button></div>'+(l.status!=='approved'?'<p class="mk-note warn">ประกาศถูกซ่อนจากตลาด รอผู้ดูแลตรวจสอบ</p>':'')+mkSellerRequests(l.id)};
async function marketMutation(id,action,data){try{await K.request('/market/listings/'+encodeURIComponent(id)+(action?'/'+action:''),{method:'POST',body:JSON.stringify(data||{})});await marketLoad(true);return true}catch(e){mkNotice(e.message);return false}}
mkSetStock=(id,stock)=>marketMutation(id,'stock',{stock});mkToggleDelivery=id=>{const l=mkFind(id);return marketMutation(id,'delivery',{acceptsDelivery:!l.acceptsDelivery})};mkBump=id=>marketMutation(id,'bump');mkDelete=async id=>{if(!confirm('ซ่อนประกาศนี้จากตลาดใช่หรือไม่?'))return;if(await marketMutation(id,'delete')){mk.screen='feed';mkRender();mkNotice('ลบประกาศจากตลาดแล้ว')}};mkReport=async(id,reason)=>{if(await marketMutation(id,'report',{reason})){mk.reportOpen=false;mkNotice('บันทึกรายงานให้ผู้ดูแลแล้ว')}};mkComment=async id=>{const input=document.getElementById('mkCmt');if(input?.value.trim())await marketMutation(id,'comments',{text:input.value.trim(),name:K.user?.name})};
function mkEdit(id){const l=mkFind(id);if(!l||l.ownerId!==mkMe())return;mk.form={...mkEmptyForm(l.kind),...l,editingId:l.id,images:[...l.images]};mk.screen='form';mkRender();mkTop()}
const baseMarketForm=mkFormHtml;mkFormHtml=function(){return baseMarketForm().replace('<div class="mk-panel" style="margin-top:0">','<div class="mk-panel" style="margin-top:0"><label class="mk-label">ชื่อผู้ขาย / ชื่อที่แสดง<input class="mk-input" name="poster_name" required maxlength="100" value="'+mkE(mk.form?.poster_name||mk.form?.poster?.name||K.user?.name||'')+'"></label>').replace('<div id="mkPinState"></div>','<div id="mkPinState"></div><details class="mk-manual-pin"><summary>หรือกรอกพิกัดจุดรับเอง</summary><div class="c-two"><label>ละติจูด<input class="mk-input" type="number" name="pickup_lat" step="any" min="-90" max="90" value="'+mkE(mk.form?.pickup?.lat??'')+'"></label><label>ลองจิจูด<input class="mk-input" type="number" name="pickup_lng" step="any" min="-180" max="180" value="'+mkE(mk.form?.pickup?.lng??'')+'"></label></div></details>')};
const baseMarketSync=mkFormSync;mkFormSync=function(e){baseMarketSync(e);if(['pickup_lat','pickup_lng'].includes(e.target.name)){const a=document.querySelector('#mkForm [name=pickup_lat]').value,b=document.querySelector('#mkForm [name=pickup_lng]').value;mk.form.pickup=a!==''&&b!==''&&Math.abs(Number(a))<=90&&Math.abs(Number(b))<=180?{lat:Number(a),lng:Number(b)}:null;mkRefreshPin()}};
mkFormPin=function(){if(!navigator.geolocation){mkNotice('ไม่รองรับ GPS กรุณากรอกพิกัดจริงเอง หรือปิดบริการส่ง');return}navigator.geolocation.getCurrentPosition(p=>{mk.form.pickup={lat:p.coords.latitude,lng:p.coords.longitude};mk.gpsOk=true;userLiveLocation={...mk.form.pickup};const a=document.querySelector('#mkForm [name=pickup_lat]'),b=document.querySelector('#mkForm [name=pickup_lng]');if(a)a.value=p.coords.latitude;if(b)b.value=p.coords.longitude;mkRefreshPin()},()=>mkNotice('รับพิกัดไม่ได้ กรุณากรอกพิกัดจริงเอง จะไม่ใช้หมุดสมมติแทน'),{enableHighAccuracy:true,timeout:10000})};
mkFormSubmit=async function(e){e.preventDefault();const button=e.submitter,form=mk.form;if(!form||button?.disabled)return;if(button)button.disabled=true;try{if(form.processingPhotos)throw Error('รอเตรียมภาพให้เสร็จก่อน');const rec=await K.request('/market/listings'+(form.editingId?'/'+form.editingId:''),{method:'POST',body:JSON.stringify(form)});mk.form=null;mk.screen='detail';mk.open=rec.id;await marketLoad(true);mkNotice('บันทึกประกาศเข้าฐานข้อมูลกลางแล้ว ทุกเครื่องเห็นได้');mkTop()}catch(err){const out=document.getElementById('mkFormErr');if(out)out.textContent=err.message;if(button)button.disabled=false}};
mkAddPhotos=async function(input){const f=mk.form;if(!f)return;f.processingPhotos=true;try{for(const file of [...input.files].slice(0,MK_MAX_PHOTOS-f.images.length))f.images.push(await C.photo(file,'menu'));mkRenderThumbs()}catch(e){mkNotice(e.message)}finally{f.processingPhotos=false;input.value=''}};
const baseSortMarket=mkSetSort;mkSetSort=function(s){if(s==='near'&&!mk.gpsOk){mkGps();mkNotice('รับตำแหน่งจริงก่อนเรียงร้านใกล้ฉัน แล้วกดตัวกรองอีกครั้ง');return}baseSortMarket(s)};
mkDl=function(l){if(!mk.dl||mk.dl.id!==l.id)mk.dl={id:l.id,method:l.acceptsDelivery?'delivery':'self',note:'',pay:'cod',key:crypto.randomUUID()};return mk.dl};
mkDeliveryHtml=function(l){if(l.kind!=='sell')return '';if(l.ownerId===mkMe())return '<div class="mk-panel"><p>นี่คือประกาศของคุณ คำสั่งซื้อจากลูกค้าจะแสดงในกล่องจัดการประกาศ</p></div>';const active=mkOrderFor(l.id);if(active&&!['done','cancelled'].includes(active.status))return '<div class="mk-panel"><button class="mk-btn block" onclick="go(\'ออเดอร์ของฉัน\')">ติดตามออเดอร์นี้</button></div>';const dl=mkDl(l);return '<div class="mk-panel"><h3>'+icon('rider')+'เลือกวิธีรับสินค้า</h3><div class="mk-seg">'+mkOptBtn(dl.method==='self',"mkSetDl('method','self')",'นัดรับเอง','ติดต่อผู้ขายและตกลงจุดนัดรับ')+mkOptBtn(dl.method==='delivery',"mkSetDl('method','delivery')",'ให้ไรเดอร์รับ–ส่ง','รอผู้ขายยืนยันก่อนส่งเข้าคิว',!l.acceptsDelivery||l.stock!=='available')+'</div>'+(dl.method==='self'?mkContactButtons(l):l.priceType==='ask'?'<p class="mk-note">ติดต่อผู้ขายเพื่อตกลงราคา และให้ผู้ขายกำหนดราคาก่อนเรียกรถ</p>'+mkContactButtons(l):'<p class="mk-note">ยอดสินค้าและค่าส่งตรวจจากระบบก่อนยืนยัน ชำระปลายทาง ยังไม่มีการตัดเงินผ่าน QR</p><button class="mk-btn block" '+(l.stock!=='available'?'disabled':'')+' onclick="mkOrder(\''+l.id+'\')">สั่งสินค้าและเรียกไรเดอร์</button>')+'</div>'};
mkTrackHtml=function(l){const o=mkOrderFor(l.id);return o?'<div class="mk-panel"><h3>สถานะคำสั่งซื้อ</h3><p>'+mkE(statuses[o.status]||o.status)+'</p><button class="mk-btn sec block" onclick="go(\'ออเดอร์ของฉัน\')">ดูแอนิเมชันและรายละเอียดการจัดส่ง</button></div>':''};
mkOrder=async function(id){try{const l=mkFind(id),quote=await K.request('/market/quote',{method:'POST',body:JSON.stringify({listing_id:id})}),p=cProfile||{},dl=mkDl(l);const d=C.dialog('marketCheckoutDialog','<div class="c-dialog-head"><div><p class="c-eyebrow">สินค้าในตลาดชุมชน</p><h2>'+C.esc(l.title)+'</h2></div><button class="c-icon-btn" aria-label="ปิด" onclick="this.closest(\'dialog\').close()">'+C.icon('close')+'</button></div><div class="c-delivery-content"><div class="c-order-summary"><div><span>ค่าสินค้า</span><strong>'+C.money(quote.goods_total)+'</strong></div><div><span>ค่าส่งแบบเหมาจากระบบ</span><strong>'+C.money(quote.delivery_fee)+'</strong></div><div><span>รวมชำระปลายทาง</span><strong>'+C.money(quote.total)+'</strong></div></div><form id="marketCheckout"><div class="c-two"><label>ชื่อผู้รับ<input name="customer_name" required maxlength="100" value="'+C.esc(p.customer_name||'')+'"></label><label>เบอร์โทร<input name="phone" required inputmode="tel" pattern="[+]?[0-9]{9,15}" value="'+C.esc(p.phone||'')+'"></label></div><label>ที่อยู่จัดส่ง<textarea name="dropoff" required rows="3" maxlength="500">'+C.esc(p.dropoff||'')+'</textarea></label><button type="button" class="c-btn c-secondary" id="marketOrderGps">ใช้ตำแหน่งปัจจุบันเป็นจุดส่ง</button><div class="c-two"><label>ละติจูด (ไม่บังคับ)<input name="lat" type="number" step="any" min="-90" max="90" value="'+C.esc(p.lat??'')+'"></label><label>ลองจิจูด (ไม่บังคับ)<input name="lng" type="number" step="any" min="-180" max="180" value="'+C.esc(p.lng??'')+'"></label></div><label>หมายเหตุ<textarea name="note" rows="2" maxlength="500"></textarea></label><label class="c-check"><input name="remember" type="checkbox" checked> จำข้อมูลจัดส่งในเครื่องนี้</label><p class="c-help">รอผู้ขายยืนยันว่าพร้อมส่ง งานจึงจะเข้าคิวไรเดอร์</p><p id="marketCheckoutError" class="c-error" role="alert"></p><button class="c-btn c-primary c-wide" type="submit">ยืนยันสั่งสินค้า '+C.money(quote.total)+'</button></form></div>','c-shop-dialog');const f=d.querySelector('form');f.elements.dropoff.oninput=()=>{f.elements.lat.value='';f.elements.lng.value=''};d.querySelector('#marketOrderGps').onclick=()=>{if(!navigator.geolocation)return;const button=d.querySelector('#marketOrderGps');button.disabled=true;navigator.geolocation.getCurrentPosition(pos=>{f.elements.lat.value=pos.coords.latitude;f.elements.lng.value=pos.coords.longitude;button.textContent='แนบพิกัดจริงแล้ว';button.disabled=false},()=>{d.querySelector('#marketCheckoutError').textContent='รับพิกัดไม่ได้ กรอกที่อยู่ให้ชัดเจนแทนได้';button.disabled=false},{enableHighAccuracy:true,timeout:10000})};f.onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{const data=Object.fromEntries(new FormData(f));if((data.lat==='')!==(data.lng===''))throw Error('กรอกพิกัดให้ครบทั้งสองช่อง');await K.request('/market/orders',{method:'POST',headers:{'Idempotency-Key':dl.key},body:JSON.stringify({...data,listing_id:id,payment_method:'cod',quote_version:quote.listing_version})});if(f.elements.remember.checked){cProfile={customer_name:data.customer_name,phone:data.phone,dropoff:data.dropoff,...(data.lat!==''?{lat:Number(data.lat),lng:Number(data.lng)}:{})};try{localStorage.setItem('kranuan.delivery.v1',JSON.stringify(cProfile))}catch{}}d.close();await marketLoad(true);go('ออเดอร์ของฉัน');mkNotice('ส่งคำสั่งซื้อให้ผู้ขายแล้ว รอผู้ขายยืนยันก่อนเข้าคิวไรเดอร์')}catch(e){d.querySelector('#marketCheckoutError').textContent=e.message;button.disabled=false}}}catch(e){mkNotice(e.message)}};
requestMarketDelivery=id=>{go('ตลาด');mkOpen(id);mkOrder(id)};

let marketGallery={images:[],index:0,title:'',zoom:false};
function mkOpenImage(id,index=0){const l=mkFind(id);if(!l?.images?.length)return;marketGallery={images:[...l.images],index:Math.max(0,Math.min(index,l.images.length-1)),title:l.title,zoom:false};let d=document.getElementById('marketLightbox');if(!d){d=document.createElement('dialog');d.id='marketLightbox';d.className='mk-lightbox';document.body.appendChild(d);d.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();mkGalleryMove(1)}if(e.key==='ArrowLeft'){e.preventDefault();mkGalleryMove(-1)}});d.addEventListener('close',()=>{document.documentElement.classList.remove('mk-viewing-image')})}d.innerHTML='<div class="mk-lb-head"><span id="marketImageCount"></span><button type="button" aria-label="ปิดภาพเต็มจอ" onclick="this.closest(\'dialog\').close()">'+icon('close')+'</button></div><div class="mk-lb-stage" id="marketImageStage"><img id="marketFullImage" alt=""></div><div class="mk-lb-foot"><button type="button" aria-label="ภาพก่อนหน้า" onclick="mkGalleryMove(-1)">'+icon('back')+'</button><div><b>'+mkE(l.title)+'</b><small>ปัดซ้าย–ขวาเพื่อเปลี่ยนภาพ แตะสองครั้งเพื่อขยาย</small></div><button type="button" aria-label="ภาพถัดไป" onclick="mkGalleryMove(1)"><svg class="icon" viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg></button></div>';document.documentElement.classList.add('mk-viewing-image');if(!d.open)d.showModal();mkDrawGallery();let start=null;const stage=d.querySelector('#marketImageStage');stage.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY};if(marketGallery.zoom&&e.pointerType==='mouse')stage.setPointerCapture(e.pointerId)});stage.addEventListener('pointerup',e=>{if(start&&!marketGallery.zoom&&Math.abs(e.clientX-start.x)>50&&Math.abs(e.clientY-start.y)<100)mkGalleryMove(e.clientX<start.x?1:-1);start=null});stage.addEventListener('dblclick',()=>{marketGallery.zoom=!marketGallery.zoom;stage.classList.toggle('zoomed',marketGallery.zoom)})}
function mkDrawGallery(){const g=marketGallery,img=document.getElementById('marketFullImage');img.src=g.images[g.index];img.alt=g.title+' รูปที่ '+(g.index+1);document.getElementById('marketImageCount').textContent=(g.index+1)+' / '+g.images.length;const stage=document.getElementById('marketImageStage');stage.classList.remove('zoomed');g.zoom=false}
function mkGalleryMove(dir){if(!marketGallery.images.length)return;marketGallery.index=(marketGallery.index+dir+marketGallery.images.length)%marketGallery.images.length;mkDrawGallery()}
const marketFormKindBeforeEdit=mkFormKind;mkFormKind=function(k){if(mk.form?.editingId&&k!==mk.form.kind){mkNotice('เปลี่ยนประเภทประกาศไม่ได้ระหว่างแก้ไข กรุณาลงประกาศใหม่');return}marketFormKindBeforeEdit(k)};
render();
