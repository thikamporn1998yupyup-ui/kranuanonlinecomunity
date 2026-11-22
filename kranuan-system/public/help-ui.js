/* KRANUAN COMMUNITY + KRANUAN HELP — v1 | no framework or external icon CDN */
(() => {
  'use strict';
  if (window.__krHelpUI) return;
  window.__krHelpUI = true;

  const icons = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/><rect x="3" y="14" width="7" height="7" rx="1.4"/><rect x="14" y="14" width="7" height="7" rx="1.4"/>',
    help: '<path d="M9 12l2 2 4-4"/><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    dishes: '<path d="M3 12h18a9 9 0 0 1-18 0Z"/><path d="M7 20h10M7 4v4M12 2v6M17 4v4"/>',
    cleaning: '<path d="m7 21 8-16 2 1-8 16"/><path d="M4 21h9M10 14l5 2M18 3l3 3"/>',
    vehicle: '<circle cx="5.5" cy="17.5" r="2.5"/><circle cx="18.5" cy="17.5" r="2.5"/><path d="M8 17h8l-2-6H9l-3-5H2M14 11h4l3 4v2"/>',
    tools: '<path d="M14 7a5 5 0 0 0-6.9 6.9L3 18a2 2 0 0 0 3 3l4.1-4.1A5 5 0 0 0 17 10l-4 4-3-3 4-4Z"/>',
    delivery: '<rect x="2" y="7" width="13" height="11" rx="2"/><path d="M15 11h4l3 4v3h-3M15 18h-5"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    moving: '<rect x="4" y="7" width="16" height="14" rx="2"/><path d="M4 12h16M12 7v14M8 4h8M10 2h4"/>',
    briefcase: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3M3 13h18M10 13v2h4v-2"/>',
    news: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>',
    chat: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a8.5 8.5 0 1 1 16.1-4Z"/>',
    store: '<path d="M3 10h18l-2-6H5l-2 6ZM5 10v11h14V10M9 21v-8h6v8"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    admin: '<path d="m12 2 8 4v6c0 5-3 8-8 10-5-2-8-5-8-10V6l8-4Z"/><path d="m9 12 2 2 4-4"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    back: '<path d="M19 12H5m6-6-6 6 6 6"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
    camera: '<path d="M3 7h4l2-3h6l2 3h4v13H3V7Z"/><circle cx="12" cy="13" r="4"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    alert: '<path d="m12 2 10 18H2L12 2Z"/><path d="M12 9v4m0 4h.01"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2 5M20 4v7h-7"/>',
    phone: '<path d="M7 3h3l1 5-2 2a15 15 0 0 0 5 5l2-2 5 1v3a4 4 0 0 1-4 4A15 15 0 0 1 3 7a4 4 0 0 1 4-4Z"/>',
    send: '<path d="m22 2-7 20-4-9-9-4 20-7ZM11 13 22 2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
    edit: '<path d="M4 20h4L20 8l-4-4L4 16v4ZM14 6l4 4"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'
  };
  const svg = (name, extra = '') => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ' + extra + '>' + (icons[name] || icons.grid) + '</svg>';
  const E = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = n => Number(n || 0).toLocaleString('th-TH', {maximumFractionDigits:0}) + ' บาท';
  const date = value => value ? new Date(value).toLocaleString('th-TH', {dateStyle:'medium',timeStyle:'short'}) : '-';
  const categories = [
    ['dishwashing','จ้างล้างจาน','ร้านอาหาร งานเลี้ยง งานจัดโต๊ะ','dishes'],
    ['cleaning','ทำความสะอาด','บ้าน ร้านค้า สถานที่จัดงาน','cleaning'],
    ['vehicle','รถเสีย / ช่วยเหลือ','ยางรั่ว น้ำมันหมด แบตหมด','vehicle'],
    ['repair','ช่าง / ซ่อมแซม','งานซ่อมและช่วยดูแล','tools'],
    ['delivery','ฝากซื้อ / ส่งของ','จ่ายตลาด รับส่งสิ่งของ','delivery'],
    ['moving','ยกของ / ขนย้าย','งานใช้แรงในพื้นที่','moving'],
    ['general','จ้างงานทั่วไป','งานรายครั้ง งานรายวัน','briefcase']
  ];
  const cat = id => categories.find(c=>c[0]===id) || categories[6];
  const statuses = {open:'เปิดรับงาน',assigned:'มีผู้รับงาน',completed:'เสร็จสิ้น',cancelled:'ยกเลิก'};
  const postStatus = {pending:'รอแอดมินตรวจ',approved:'เผยแพร่แล้ว',hidden:'ซ่อนแล้ว',rejected:'ไม่อนุมัติ',removed:'นำออกแล้ว'};
  const S = {open:false, tab:'home', user:null, ready:false, csrf:'', jobs:[], posts:[], audit:[], job:null, targetJob:null, formCategory:'dishwashing', postKind:'general', filter:'all', loading:false, geo:null, photo:null, proof:null, timer:0, dialog:null};
  let root;

  function css() {
    if (document.getElementById('krHelpCss')) return;
    const style = document.createElement('style');style.id='krHelpCss';
    style.textContent = `
      @font-face{font-family:KRHelp;src:url('/assets/fonts/LINESeedSansTH_W_Rg.woff2') format('woff2');font-display:swap;font-weight:400}
      @font-face{font-family:KRHelp;src:url('/assets/fonts/LINESeedSansTH_W_Bd.woff2') format('woff2');font-display:swap;font-weight:700}
      #krHelpDock,#krHelpDialog{font-family:KRHelp,system-ui,Tahoma,sans-serif;letter-spacing:0;box-sizing:border-box}
      #krHelpDock * ,#krHelpDialog *{box-sizing:border-box}#krHelpDialog svg,#krHelpDock svg{width:21px;height:21px;flex-shrink:0}
      #krHelpDock{position:fixed;bottom:calc(17px + env(safe-area-inset-bottom,0px));left:15px;z-index:9001;display:flex;align-items:center}
      #krHelpDock button{display:flex;align-items:center;gap:9px;border:1px solid #ffc694;border-radius:999px;background:#12243d;color:#fff;padding:11px 15px;font:700 13px KRHelp,system-ui;box-shadow:0 7px 24px #15243e55;cursor:pointer}
      #krHelpDock button svg{color:#ffad66;width:20px;height:20px}
      #krHelpDock button:focus-visible,#krHelpDialog button:focus-visible{outline:3px solid #ffb46b;outline-offset:2px}
      #krHelpDialog{width:min(100vw,720px);height:min(94dvh,960px);max-width:720px;max-height:94dvh;border:0;border-radius:22px;background:#f4f6f9;color:#182b41;padding:0;margin:auto;box-shadow:0 18px 90px #0e16295e;overflow:hidden}
      #krHelpDialog::backdrop{background:#091323be;backdrop-filter:blur(4px)}
      #krHelpDialog button,#krHelpDialog input,#krHelpDialog select,#krHelpDialog textarea{font:inherit}
      #krHelpDialog button{cursor:pointer}#krHelpDialog button:disabled{opacity:.5;cursor:wait}
      #krHelpDialog .kh-shell{height:100%;display:flex;flex-direction:column;overflow:hidden}
      #krHelpDialog .kh-header{padding:18px 19px 15px;color:white;background:linear-gradient(118deg,#101f36,#223c59);flex-shrink:0}
      #krHelpDialog .kh-brand{display:flex;align-items:center;gap:12px}
      #krHelpDialog .kh-symbol{display:grid;place-items:center;width:42px;height:42px;border-radius:15px;background:linear-gradient(130deg,#ffbc68,#f27439);color:#12243d}
      #krHelpDialog .kh-brand-title{font-size:18px;line-height:1.1;font-weight:700;letter-spacing:.4px}#krHelpDialog .kh-overline{font-size:10px;font-weight:700;letter-spacing:2px;color:#adc0d1}
      #krHelpDialog .kh-exit{margin-left:auto;display:grid;place-items:center;border:1px solid #667a92;background:#fff1;color:#fff;width:35px;height:35px;border-radius:12px}
      #krHelpDialog .kh-subtitle{font-size:12px;color:#c2d0df;margin-top:12px}
      #krHelpDialog .kh-nav{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;background:#fff;padding:10px;border-bottom:1px solid #e8edf1;flex-shrink:0}
      #krHelpDialog .kh-nav button{white-space:nowrap;border:0;border-radius:10px;padding:10px 11px;background:transparent;color:#647489;font-weight:700;font-size:12px;display:flex;align-items:center;gap:6px}
      #krHelpDialog .kh-nav button svg{width:17px;height:17px}#krHelpDialog .kh-nav .on{color:#e7662c;background:#fff1e7}
      #krHelpDialog .kh-body{overflow:auto;overflow-x:hidden;flex:1;padding:19px 18px 32px;overscroll-behavior:contain}
      #krHelpDialog .kh-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:13px}
      #krHelpDialog h2,#krHelpDialog h3,#krHelpDialog p{margin:0}#krHelpDialog h2{font-size:19px;color:#10253d}#krHelpDialog h3{font-size:15px}
      #krHelpDialog .kh-muted{font-size:12px;color:#718095;line-height:1.55}#krHelpDialog .kh-eyebrow{font-size:10px;font-weight:700;letter-spacing:1.4px;color:#e36e37;text-transform:uppercase}
      #krHelpDialog .kh-hero{position:relative;overflow:hidden;padding:19px;border-radius:20px;background:linear-gradient(135deg,#e66e36,#fdad66);color:#fff;margin-bottom:18px}
      #krHelpDialog .kh-hero:after{content:'';position:absolute;width:150px;height:150px;right:-44px;top:-50px;border:23px solid #ffffff2a;border-radius:50%}
      #krHelpDialog .kh-hero h2{color:#fff;font-size:24px;line-height:1.3;max-width:75%;margin:5px 0 9px}#krHelpDialog .kh-hero p{font-size:12px;color:#fffdf3;max-width:85%}
      #krHelpDialog .kh-hero button{border:0;background:#172944;color:#fff;border-radius:12px;padding:10px 13px;display:inline-flex;align-items:center;gap:7px;margin-top:14px;font-weight:700}
      #krHelpDialog .kh-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:18px}
      #krHelpDialog .kh-tile{padding:15px;border:1px solid #e6ebf0;border-radius:16px;background:#fff;text-align:left;min-height:128px;display:flex;flex-direction:column;align-items:flex-start;gap:7px;box-shadow:0 3px 10px #21334a06}
      #krHelpDialog .kh-tile:hover{border-color:#fdaf75;transform:translateY(-1px)}#krHelpDialog .kh-tile strong{font-size:13px;color:#152942}#krHelpDialog .kh-tile small{font-size:11px;line-height:1.4;color:#78869a}
      #krHelpDialog .kh-ic{display:grid;place-items:center;border-radius:12px;background:#fff0e3;color:#dc632f;width:38px;height:38px}
      #krHelpDialog .kh-ic.blue{background:#e7f0f8;color:#466887}#krHelpDialog .kh-panel{background:#fff;border:1px solid #e7ebf1;border-radius:17px;padding:16px;margin-bottom:12px}
      #krHelpDialog .kh-quick{display:flex;gap:8px;flex-wrap:wrap}#krHelpDialog .kh-pill{display:flex;align-items:center;gap:7px;border-radius:99px;border:1px solid #dce4ee;background:white;color:#243a53;padding:10px 12px;font-size:12px;font-weight:700}
      #krHelpDialog .kh-pill svg{width:17px;height:17px}#krHelpDialog .kh-primary{border:0;background:#ed763a;color:white;padding:12px 15px;border-radius:12px;font-weight:700;display:inline-flex;align-items:center;gap:7px;justify-content:center}
      #krHelpDialog .kh-secondary{border:1px solid #dbe2ea;color:#31455d;background:#fff;padding:11px 13px;border-radius:12px;font-weight:700;display:inline-flex;align-items:center;gap:6px;justify-content:center}
      #krHelpDialog .kh-danger{border:1px solid #f0cdcd;background:#fff5f4;color:#b94237;padding:9px 12px;border-radius:10px;font-weight:700;font-size:12px}
      #krHelpDialog .kh-row{display:flex;gap:9px;align-items:center;flex-wrap:wrap}#krHelpDialog .kh-space{justify-content:space-between}
      #krHelpDialog .kh-card{background:#fff;border:1px solid #e4eaf0;border-radius:15px;margin:10px 0;padding:14px;display:flex;flex-direction:column;gap:8px}
      #krHelpDialog .kh-card-top{display:flex;align-items:flex-start;gap:10px}#krHelpDialog .kh-card-top>div:nth-child(2){flex:1;min-width:0}
      #krHelpDialog .kh-card h3{font-size:14px;line-height:1.45}#krHelpDialog .kh-card small{font-size:11px;color:#7d899b}
      #krHelpDialog .kh-status{display:inline-block;padding:5px 9px;border-radius:99px;font-size:10px;font-weight:700;background:#e8f6ec;color:#2a7748}
      #krHelpDialog .kh-status.assigned,#krHelpDialog .kh-status.pending{background:#fff1d9;color:#946222}
      #krHelpDialog .kh-status.cancelled,#krHelpDialog .kh-status.rejected,#krHelpDialog .kh-status.removed{background:#ffeded;color:#b84b4b}
      #krHelpDialog .kh-status.completed,#krHelpDialog .kh-status.approved{background:#e4f4f0;color:#2c866f}
      #krHelpDialog .kh-status.hidden{background:#edf0f4;color:#6a7284}
      #krHelpDialog .kh-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
      #krHelpDialog label.kh-field{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700;color:#354960}
      #krHelpDialog .kh-field.full{grid-column:1/-1}#krHelpDialog input,#krHelpDialog select,#krHelpDialog textarea{background:#fff;color:#172b44;border:1px solid #dbe4ed;border-radius:10px;padding:11px 12px;width:100%;min-width:0;outline:none;font-size:13px}
      #krHelpDialog textarea{min-height:86px;resize:vertical}#krHelpDialog input:focus,#krHelpDialog textarea:focus,#krHelpDialog select:focus{border-color:#ef8b54;box-shadow:0 0 0 3px #fda96c27}
      #krHelpDialog .kh-note{padding:11px 12px;border-radius:11px;background:#fff3e9;color:#9a552d;font-size:11px;line-height:1.65}
      #krHelpDialog .kh-info{padding:12px;border-radius:11px;background:#eaf2fb;color:#3a5877;font-size:12px}
      #krHelpDialog .kh-hr{height:1px;background:#e8edf1;margin:14px 0}#krHelpDialog .kh-empty{padding:34px 16px;text-align:center;color:#7c8a9e}
      #krHelpDialog .kh-empty svg{width:34px;height:34px;display:block;margin:0 auto 11px;color:#b2becc}
      #krHelpDialog .kh-photo{max-width:100%;max-height:200px;object-fit:cover;border-radius:10px;display:block;margin-top:9px}
      #krHelpDialog .kh-label{font-size:12px;font-weight:700;color:#4b5e74}#krHelpDialog .kh-proof-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      #krHelpDialog .kh-proof{border:1px solid #dbe2eb;border-radius:12px;padding:10px;font-size:11px;background:#f8fafc}
      #krHelpDialog .kh-proof img{width:100%;height:80px;object-fit:cover;border-radius:8px;margin:6px 0}
      #krHelpDialog .kh-chat{max-height:240px;overflow-y:auto;background:#f3f6f9;border-radius:12px;padding:11px;margin:10px 0}
      #krHelpDialog .kh-message{padding:9px 12px;background:#fff;border:1px solid #e5ebf1;border-radius:11px;margin:7px 0;font-size:12px;overflow-wrap:anywhere}
      #krHelpDialog .kh-message b{display:block;font-size:11px;margin-bottom:4px;color:#d36b33}
      #krHelpDialog .kh-error{color:#c53d30;font-size:12px;font-weight:700;min-height:17px}
      #krHelpDialog .kh-footer{display:flex;justify-content:space-between;gap:12px;align-items:center;border-top:1px solid #e5ebef;padding:10px 18px;background:#fff;color:#718095;font-size:10px;flex-shrink:0}
      #krHelpDialog .kh-footer span:last-child{font-weight:700;color:#dd733d}
      #krHelpDialog .kh-toast{position:absolute;left:17px;right:17px;bottom:58px;border-radius:11px;padding:11px 14px;background:#172940;color:#fff;box-shadow:0 5px 26px #10254055;z-index:6;font-size:12px}
      #krHelpDialog .kh-toast.error{background:#bb4537}
      #krHelpDialog .kh-loading{color:#75859b;text-align:center;padding:35px}
      @media(max-width:540px){#krHelpDialog{height:100dvh;max-height:100dvh;width:100vw;max-width:100vw;border-radius:0;margin:0}#krHelpDialog .kh-body{padding:15px 13px 26px}#krHelpDialog .kh-nav{padding:7px}#krHelpDialog .kh-nav button{padding:10px 9px;font-size:11px}#krHelpDialog .kh-header{padding:16px 14px}#krHelpDialog .kh-hero h2{font-size:22px}#krHelpDialog .kh-grid{gap:8px}#krHelpDialog .kh-fields{grid-template-columns:1fr}#krHelpDialog .kh-proof-grid{grid-template-columns:1fr 1fr}#krHelpDock{left:10px;bottom:calc(86px + env(safe-area-inset-bottom,0px))}#krHelpDock button{padding:9px 11px}}
      @media(prefers-reduced-motion:reduce){#krHelpDialog *{animation:none!important;transition:none!important}}
    `;
    document.head.appendChild(style);
  }

  async function api(path, value) {
    const write = value !== undefined;
    if (write && !S.csrf) await session();
    const response = await fetch('/api/help/' + path, {credentials:'same-origin', method:write?'POST':'GET', headers:{...(write?{'Content-Type':'application/json','X-CSRF-Token':S.csrf}:{})}, ...(write?{body:JSON.stringify(value)}:{})});
    let data = await response.json().catch(()=>({}));
    if (!response.ok) throw Error(data.error || 'เชื่อมต่อไม่สำเร็จ');
    return data;
  }
  async function session() {
    let response = await fetch('/api/session',{credentials:'same-origin',method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    const data = await response.json().catch(()=>({}));
    if(!response.ok) throw Error('กรุณาเข้าสู่ระบบก่อนใช้บริการ');
    S.csrf=data.csrf||window.K?.csrf||'';
    if (data.user) S.user=data.user;
    return data;
  }
  async function init() {
    try {await session();const detail=await api('session');S.user=detail.user;S.ready=detail.member_ready;}
    catch(error){S.user=null;S.ready=false;}
  }
  async function load({quiet=false}={}) {
    if(!S.user)return;
    try {
      const [jobs,posts] = await Promise.all([api('jobs'),api('posts')]);
      S.jobs=jobs;S.posts=posts;
      if(S.user.role==='admin' && S.tab==='admin') S.audit=await api('admin/audit');
      if(!quiet)renderBody();
      const unseen=jobs.filter(x=>x.status==='open' && !x.hidden).length;
      document.getElementById('krHelpDock')?.querySelector('button')?.setAttribute('aria-label','บริการชุมชน งานเปิดรับ '+unseen+' รายการ');
    }catch(e){if(!quiet)toast(e.message,true);}
  }
  const member = () => S.user && (S.user.role !== 'customer' || S.ready);
  function toast(msg,error=false){const old=root?.querySelector('.kh-toast');old?.remove();if(!root)return;const e=document.createElement('div');e.className='kh-toast'+(error?' error':'');e.setAttribute('role','status');e.textContent=msg;root.appendChild(e);setTimeout(()=>e.remove(),4300);}
  function shell() {
    css();
    const dock=document.createElement('aside');dock.id='krHelpDock';dock.innerHTML='<button type="button" aria-label="เปิดบริการชุมชน">'+svg('help')+' ชุมชนและบริการ</button>';
    dock.querySelector('button').onclick=()=>open('home');document.body.appendChild(dock);
    const dialog=document.createElement('dialog');dialog.id='krHelpDialog';dialog.setAttribute('aria-label','ชุมชนและ KRANUAN HELP');
    dialog.innerHTML='<div class="kh-shell"><div class="kh-header"><div class="kh-brand"><div class="kh-symbol">'+svg('help')+'</div><div><div class="kh-overline">KRANUAN ONLINE</div><div class="kh-brand-title">COMMUNITY <span style="color:#ffb979">/ HELP</span></div></div><button class="kh-exit" type="button" data-action="close" aria-label="ปิด">'+svg('close')+'</button></div><div class="kh-subtitle">กระนวนใกล้กัน ช่วยเหลือกัน งานเล็กงานใหญ่ในพื้นที่ของเรา</div></div><nav class="kh-nav" aria-label="เมนูบริการชุมชน"></nav><main class="kh-body"></main><div class="kh-footer"><span>KRANUAN COMMUNITY · LOCAL FIRST</span><span>ไม่หัก GP จากงาน</span></div></div>';
    dialog.addEventListener('click',click);
    dialog.addEventListener('submit',submit);
    dialog.addEventListener('change',change);
    dialog.addEventListener('close',()=>{S.open=false;S.job=null;});
    document.body.appendChild(dialog);root=dialog;S.dialog=dialog;
    // Add a services entry directly to the existing chat dialog without changing its messaging logic.
    const observer=new MutationObserver(()=>{
      const chat=document.getElementById('krCommunityDialog');
      if(!chat)return;
      const header=chat.querySelector('header');
      if(header && !chat.querySelector('#krHelpChatLink')){
        const button=document.createElement('button');button.id='krHelpChatLink';button.type='button';button.textContent='บริการชุมชน / HELP';
        button.style.cssText='border:0;border-radius:10px;background:#172944;color:#fff;padding:7px 10px;font:700 11px KRHelp,system-ui;cursor:pointer';
        button.onclick=()=>{try{chat.close()}catch{}open('home')};header.appendChild(button);
      }
      chat.querySelectorAll('.kc-bubble:not([data-kh-checked])').forEach(bubble=>{
        bubble.dataset.khChecked='1';
        const match=bubble.textContent.match(/\[KR-HELP:([a-f0-9-]{36})\]/i);
        if(!match)return;
        bubble.textContent=bubble.textContent.replace(match[0],'').trim();
        const action=document.createElement('button');action.type='button';action.textContent='ดูรายละเอียดและรับงาน';
        action.style.cssText='display:block;margin-top:9px;background:#17314c;color:white;border:0;border-radius:9px;padding:8px 11px;font-weight:700;font-size:12px';
        action.onclick=async()=>{try{chat.close()}catch{}await open('jobs');await jobOpen(match[1]);};
        bubble.appendChild(action);
      });
    });
    observer.observe(document.body,{childList:true,subtree:true});
    const script=()=>{const button=document.getElementById('krHelpDock');if(button)button.hidden=!!document.querySelector('#krHelpDialog[open]')};
    dialog.addEventListener('close',script);dialog.addEventListener('close',()=>dock.hidden=false);
  }
  function nav() {
    const options=[['home','หน้าชุมชน','grid'],['jobs','งานทั้งหมด','briefcase'],['posts','โพสต์ชุมชน','news'],['mine','งานของฉัน','user'],...(S.user?.role==='admin'?[['admin','แอดมิน','admin']]:[])];
    root.querySelector('.kh-nav').innerHTML=options.map(([id,label,icon])=>'<button type="button" data-tab="'+id+'" class="'+(id===S.tab?'on':'')+'">'+svg(icon)+E(label)+'</button>').join('');
  }
  function backButton(tab='home'){return '<button class="kh-secondary" type="button" data-tab="'+tab+'">'+svg('back')+'กลับ</button>'}
  function needLogin(){return '<div class="kh-panel"><div class="kh-empty">'+svg('user')+'<h3>เข้าสู่ระบบก่อนใช้บริการ</h3><p class="kh-muted" style="margin:10px auto;max-width:370px">สมัครสมาชิกและเข้าสู่ระบบ Google เพื่อความปลอดภัยของผู้จ้างและผู้รับงาน</p><button type="button" class="kh-primary" data-action="login">'+svg('user')+' เข้าสู่ระบบ</button></div></div>'}
  function home() {
    const jobOpen=S.jobs.filter(x=>x.status==='open'&&!x.hidden).length;
    return '<section class="kh-hero"><div class="kh-eyebrow" style="color:#fff5dc">LOCAL HELP · KRANUAN</div><h2>มีงานให้ช่วย<br>มีคนพร้อมช่วย</h2><p>จ้างงานในชุมชนได้ง่าย เลือกงาน กำหนดค่าจ้างและวันเวลา ให้ไรเดอร์ในพื้นที่รับงาน</p><button type="button" data-action="createJob">'+svg('plus')+' ลงประกาศจ้างงาน</button></section>'+
      '<div class="kh-title"><div><div class="kh-eyebrow">OUR SERVICES</div><h2>บริการในชุมชน</h2></div><small class="kh-muted">'+jobOpen+' งานเปิดรับ</small></div>'+
      '<div class="kh-grid">'+categories.map((c,i)=>'<button type="button" class="kh-tile" data-category="'+c[0]+'"><span class="kh-ic '+(i%3===1?'blue':'')+'">'+svg(c[3])+'</span><strong>'+E(c[1])+'</strong><small>'+E(c[2])+'</small></button>').join('')+'</div>'+
      '<div class="kh-title"><h2>ชุมชนของเรา</h2></div><div class="kh-quick"><button class="kh-pill" data-tab="posts">'+svg('news')+' ข่าวและโพสต์</button><button class="kh-pill" data-action="chat">'+svg('chat')+' แชทอำเภอ</button><button class="kh-pill" data-action="market">'+svg('store')+' ตลาดชุมชน</button><button class="kh-pill" data-tab="mine">'+svg('briefcase')+' ติดตามงาน</button></div>'+
      '<div class="kh-note" style="margin-top:16px">ระบบ KRANUAN HELP รับงานรายครั้ง ค่าจ้างขั้นต่ำ 100 บาท การชำระเงินจริงตกลงและชำระกันโดยตรง โปรดตรวจสอบผู้รับงานก่อนนัดหมาย</div>';
  }
  const status = (id,post=false)=>'<span class="kh-status '+E(id)+'">'+E((post?postStatus:statuses)[id]||id)+'</span>';
  function jobCard(j){const c=cat(j.category);return '<article class="kh-card"><div class="kh-card-top"><span class="kh-ic">'+svg(c[3])+'</span><div><h3>'+E(j.title)+'</h3><small>'+E(c[1])+' · '+E(j.area||'พื้นที่กระนวน')+' · '+E(date(j.created_at))+'</small></div>'+status(j.status)+'</div><div class="kh-muted">'+E(j.detail).slice(0,155)+'</div><div class="kh-row kh-space"><strong style="color:#d66531">'+money(j.budget)+'</strong><small>'+svg('clock','style="width:14px;height:14px;vertical-align:middle"')+' '+E(date(j.date_time))+'</small></div><div class="kh-row"><button class="kh-secondary" type="button" data-job="'+E(j.id)+'">ดูรายละเอียด'+svg('arrow')+'</button>'+(S.user?.role==='rider'&&j.status==='open'&&!j.hidden?'<button class="kh-primary" type="button" data-claim="'+E(j.id)+'">'+svg('check')+' รับงาน</button>':'')+'</div></article>'}
  function jobs(){const all=S.jobs.filter(j=>S.filter==='all'||j.category===S.filter),values=all.sort((a,b)=>b.created_at.localeCompare(a.created_at));return '<div class="kh-title"><h2>กระดานงาน KRANUAN HELP</h2><button class="kh-primary" data-action="createJob">'+svg('plus')+' ลงงาน</button></div><div class="kh-panel"><label class="kh-field"><span class="kh-label">เลือกประเภทงาน</span><select id="khFilter"><option value="all">งานทุกประเภท</option>'+categories.map(c=>'<option value="'+c[0]+'" '+(S.filter===c[0]?'selected':'')+'>'+E(c[1])+'</option>').join('')+'</select></label></div>'+(values.length?values.map(jobCard).join(''):'<div class="kh-empty">'+svg('briefcase')+'ยังไม่มีงานในหมวดนี้</div>')}
  function postCard(p){return '<article class="kh-card"><div class="kh-row kh-space"><div class="kh-eyebrow">'+E({news:'ข่าวสาร',general:'พูดคุย',market:'ฝากร้าน / ตลาด',help:'ช่วยเหลือ'}[p.kind]||'ชุมชน')+'</div>'+status(p.status,true)+'</div><h3>'+E(p.title)+'</h3><div class="kh-muted">'+E(p.content)+'</div>'+(p.photo?'<img class="kh-photo" loading="lazy" src="'+E(p.photo)+'" alt="ภาพประกอบโพสต์">':'')+'<small>'+E(p.author_name)+' · '+E(p.area||'กระนวน')+' · '+E(date(p.created_at))+'</small>'+(p.review_note?'<div class="kh-note">หมายเหตุแอดมิน: '+E(p.review_note)+'</div>':'')+(S.user?.role==='admin'?'<div class="kh-row">'+'<button class="kh-secondary" data-moderate="posts|'+E(p.id)+'|approve">อนุมัติ/คืนโพสต์</button><button class="kh-secondary" data-moderate="posts|'+E(p.id)+'|hide">ซ่อน</button><button class="kh-danger" data-moderate="posts|'+E(p.id)+'|remove">นำออก</button></div>':'')+'</article>'}
  function posts(){return '<div class="kh-title"><h2>ข่าวสารและโพสต์ชุมชน</h2><button class="kh-primary" data-action="createPost">'+svg('plus')+' เขียนโพสต์</button></div>'+(S.posts.length?S.posts.map(postCard).join(''):'<div class="kh-empty">'+svg('news')+'ยังไม่มีโพสต์ที่เผยแพร่</div>')}
  function myJobs(){if(!S.user)return needLogin();const items=S.jobs.filter(j=>j.mine||j.assigned_to_me);return '<div class="kh-title"><h2>งานของฉัน</h2><button type="button" class="kh-secondary" data-action="refresh">'+svg('refresh')+' อัปเดต</button></div><div class="kh-note">งานที่ประกาศและงานที่รับไว้จะอยู่ที่นี่ สามารถตรวจหลักฐานและแชทกับอีกฝ่ายในรายละเอียดงาน</div>'+(items.length?items.map(jobCard).join(''):'<div class="kh-empty">'+svg('briefcase')+'ยังไม่มีงานของคุณ</div>')}
  function admin(){if(S.user?.role!=='admin')return needLogin();const pending=S.posts.filter(p=>p.status==='pending').length,active=S.jobs.filter(j=>j.status==='open').length;return '<div class="kh-title"><h2>จัดการชุมชน</h2><button class="kh-secondary" data-action="refresh">'+svg('refresh')+' โหลดใหม่</button></div><div class="kh-grid"><div class="kh-panel"><div class="kh-eyebrow">POST REVIEW</div><h2>'+pending+' โพสต์</h2><div class="kh-muted">รอตรวจสอบ</div></div><div class="kh-panel"><div class="kh-eyebrow">OPEN JOBS</div><h2>'+active+' งาน</h2><div class="kh-muted">เปิดรับในชุมชน</div></div></div><div class="kh-title"><h3>คิวจัดการโพสต์</h3></div>'+(S.posts.length?S.posts.map(postCard).join(''):'<div class="kh-empty">ไม่มีโพสต์</div>')+'<div class="kh-title" style="margin-top:19px"><h3>งานและการระงับประกาศ</h3></div>'+S.jobs.slice(0,50).map(j=>jobCard(j)+'<div class="kh-row" style="margin:-6px 5px 12px"><button class="kh-secondary" data-moderate="jobs|'+E(j.id)+'|hide">ซ่อนงาน</button><button class="kh-secondary" data-moderate="jobs|'+E(j.id)+'|restore">คืนประกาศ</button><button class="kh-danger" data-moderate="jobs|'+E(j.id)+'|cancel">ยกเลิกงาน</button></div>').join('')+'<div class="kh-title" style="margin-top:19px"><h3>ประวัติการจัดการล่าสุด</h3></div><div class="kh-panel">'+(S.audit.length?S.audit.slice(0,25).map(a=>'<div class="kh-muted" style="border-bottom:1px solid #ecf0f3;padding:8px 0">'+E(date(a.created_at))+' · '+E(a.event)+' · '+E(a.note||a.target)+'</div>').join(''):'<p class="kh-muted">ยังไม่มีรายการ</p>')+'</div>'}
  const defaultDate=()=>{const d=new Date(Date.now()+3600000);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)};
  function jobForm(){if(!S.user || !member())return needLogin();return '<div class="kh-title">'+backButton()+'<h2>ลงประกาศจ้างงาน</h2></div><div class="kh-panel"><div class="kh-eyebrow">KRANUAN HELP · JOB REQUEST</div><h2 style="margin:4px 0 14px">ระบุรายละเอียดงาน</h2><form id="khJobForm" class="kh-fields">'+
    '<label class="kh-field full">ประเภทงาน<select name="category" required>'+categories.map(c=>'<option value="'+c[0]+'" '+(S.formCategory===c[0]?'selected':'')+'>'+E(c[1])+'</option>').join('')+'</select></label>'+
    '<label class="kh-field full">ชื่องาน<input name="title" maxlength="100" minlength="6" required placeholder="เช่น จ้างล้างจานหลังงานเลี้ยง 100 คน" value="'+(S.formCategory==='dishwashing'?'จ้างล้างจานหลังงานเลี้ยง':'')+'"></label>'+
    '<label class="kh-field full">รายละเอียด<textarea name="detail" maxlength="1800" minlength="10" required placeholder="สถานที่ อุปกรณ์ที่มี จำนวนคนที่ต้องการ ขอบเขตงาน"></textarea></label>'+
    '<label class="kh-field">ค่าจ้าง (บาท)<input type="number" name="budget" min="100" max="100000" step="1" value="100" required></label>'+
    '<label class="kh-field">วันและเวลาที่เริ่มงาน<input type="datetime-local" name="date_time" value="'+defaultDate()+'" required></label>'+
    '<label class="kh-field">ชั่วโมงโดยประมาณ<input type="number" name="estimated_hours" min="0" max="72" step="0.5" value="2"></label>'+
    '<label class="kh-field">จำนวนภาชนะ / ปริมาณงาน<input type="number" name="quantity" min="0" max="10000" step="1" placeholder="ถ้าไม่ทราบเว้นว่าง"></label>'+
    '<label class="kh-field">ตำบล / พื้นที่<input name="area" required maxlength="120" placeholder="เช่น หนองโก อ.กระนวน"></label>'+
    '<label class="kh-field">เบอร์ติดต่อ (แสดงเฉพาะผู้รับงาน)<input name="contact_phone" maxlength="30" type="tel" placeholder="เบอร์โทรสำหรับนัดหมาย"></label>'+
    '<label class="kh-field full">จุดนัดหมาย / ที่อยู่<input name="address" maxlength="250" placeholder="บ้านเลขที่ จุดสังเกต หรือสถานที่นัดหมาย"></label>'+
    '<div class="kh-field full"><div class="kh-row"><button type="button" data-action="geo" class="kh-secondary">'+svg('pin')+' ใช้ GPS ปัจจุบัน</button><span class="kh-muted" id="khGeoNote">พิกัดจะแสดงเฉพาะผู้จ้าง ผู้รับงาน และแอดมิน</span></div><div class="kh-row"><input name="lat" type="number" min="-90" max="90" step="any" placeholder="Latitude (ถ้ามี)" style="flex:1"><input name="lng" type="number" min="-180" max="180" step="any" placeholder="Longitude (ถ้ามี)" style="flex:1"></div></div>'+
    '<label class="kh-field full">รูปประกอบงาน (ถ้ามี)<input type="file" name="photo" accept="image/*"></label>'+
    '<div class="kh-field full kh-note">ค่าจ้างขั้นต่ำ 100 บาท ไม่มีการหัก GP จากผู้รับงาน เมื่อรับงานแล้วไรเดอร์ต้องส่งหลักฐานก่อน ระหว่าง และหลังทำงานครบทั้ง 3 ขั้นตอน</div>'+
    '<div class="kh-field full"><button type="submit" class="kh-primary" style="width:100%">'+svg('send')+' ประกาศงานให้ไรเดอร์ในพื้นที่</button><div class="kh-error" role="status"></div></div></form></div>'}
  function postForm(){if(!S.user||!member())return needLogin();return '<div class="kh-title">'+backButton('posts')+'<h2>เขียนโพสต์ชุมชน</h2></div><div class="kh-panel"><form id="khPostForm" class="kh-fields"><label class="kh-field full">ประเภท<select name="kind"><option value="general">โพสต์ทั่วไป</option><option value="news">ข่าว / ประชาสัมพันธ์</option><option value="market">ฝากร้าน / ซื้อขาย</option><option value="help">ขอความช่วยเหลือ</option></select></label><label class="kh-field full">หัวข้อ<input name="title" maxlength="140" minlength="5" required placeholder="หัวข้อประกาศ"></label><label class="kh-field full">รายละเอียด<textarea name="content" required minlength="10" maxlength="2000"></textarea></label><label class="kh-field full">ตำบล / พื้นที่<input name="area" maxlength="120" placeholder="เช่น อ.กระนวน"></label><label class="kh-field full">รูปภาพ (ถ้ามี)<input type="file" name="photo" accept="image/*"></label><div class="kh-field full kh-note">โพสต์สมาชิกจะเข้าสู่คิวตรวจของแอดมินก่อนเผยแพร่สาธารณะ</div><div class="kh-field full"><button class="kh-primary" type="submit" style="width:100%">'+svg('send')+' ส่งโพสต์</button><div class="kh-error" role="status"></div></div></form></div>'}
  function jobDetail(){const j=S.job;if(!j)return '<div class="kh-empty">ไม่พบงาน</div>';const c=cat(j.category),privateInfo=(j.mine||j.assigned_to_me||S.user?.role==='admin');const proofs=j.proofs||{},stages=[['before','ก่อนเริ่มงาน'],['during','ระหว่างทำงาน'],['after','หลังทำงาน']];return '<div class="kh-title">'+backButton(S.tab==='detail'?S.previous||'jobs':'jobs')+status(j.status)+'</div><div class="kh-panel"><div class="kh-row"><span class="kh-ic">'+svg(c[3])+'</span><div><div class="kh-eyebrow">'+E(c[1])+'</div><h2>'+E(j.title)+'</h2></div></div><div class="kh-hr"></div><p class="kh-muted" style="white-space:pre-wrap">'+E(j.detail)+'</p><div class="kh-hr"></div><div class="kh-row kh-space"><div><div class="kh-label">ค่าจ้าง</div><h2 style="color:#e06d35">'+money(j.budget)+'</h2></div><div><div class="kh-label">เริ่มงาน</div><strong>'+E(date(j.date_time))+'</strong></div></div><p class="kh-muted" style="margin-top:9px">พื้นที่: '+E(j.area)+' · ประมาณ '+E(j.estimated_hours)+' ชั่วโมง · ปริมาณ '+E(j.quantity||'ไม่ระบุ')+'</p>'+(privateInfo?'<div class="kh-info" style="margin-top:12px"><strong>รายละเอียดนัดหมาย</strong><div>'+E(j.address||'ผู้จ้างระบุพิกัด')+'</div>'+(j.lat!=null&&j.lng!=null?'<a href="https://www.google.com/maps?q='+encodeURIComponent(j.lat+','+j.lng)+'" target="_blank" rel="noopener noreferrer">ดูจุดนัดหมายบนแผนที่</a>':'')+(j.contact_phone?'<div>โทรติดต่อ: '+E(j.contact_phone)+'</div>':'')+'</div>':'<div class="kh-note" style="margin-top:12px">ที่อยู่และข้อมูลติดต่อจะแสดงเมื่อไรเดอร์รับงานสำเร็จ</div>')+(j.photo?'<img class="kh-photo" alt="รูปประกอบงาน" src="'+E(j.photo)+'">':'')+'<p class="kh-muted" style="margin-top:10px">ผู้จ้าง: '+E(j.customer_name)+' · ผู้รับ: '+E(j.rider_name||'รอผู้รับงาน')+'</p></div>'+
    (S.user?.role==='rider'&&j.status==='open'&&!j.hidden?'<button class="kh-primary" data-claim="'+E(j.id)+'" style="width:100%;margin:6px 0 12px">'+svg('check')+' รับงานนี้</button>':'')+
    (j.mine&&j.status==='open'?'<button class="kh-danger" data-cancel="'+E(j.id)+'">ยกเลิกประกาศของฉัน</button>':'')+
    (privateInfo&&j.status!=='open'&&j.status!=='cancelled'?'<div class="kh-panel"><h3>หลักฐานการทำงาน</h3><p class="kh-muted" style="margin:6px 0 12px">ผู้รับงานต้องส่งภาพเรียงลำดับทั้ง 3 ขั้นตอน</p><div class="kh-proof-grid">'+stages.map(([id,label],i)=>'<div class="kh-proof"><strong>'+E(label)+'</strong>'+(proofs[id]?.photo?'<img src="'+E(proofs[id].photo)+'" alt="ภาพ'+E(label)+'"><small>ส่งแล้ว</small>':j.assigned_to_me&&j.status==='assigned'&&(i===0||proofs[stages[i-1][0]])?'<label class="kh-field">ถ่ายภาพ<input type="file" data-proof="'+id+'" accept="image/*" capture="environment"></label>':'<p class="kh-muted">รอหลักฐาน</p>')+'</div>').join('')+'</div>'+(j.mine&&j.status==='assigned'&&stages.every(([id])=>proofs[id])?'<div class="kh-note" style="margin:14px 0">ตรวจสอบงานและการชำระเงินก่อนยืนยัน ระบบไม่ตัดเงินอัตโนมัติ</div><button data-complete="'+E(j.id)+'" class="kh-primary">'+svg('check')+' ตรวจรับงานและยืนยันชำระแล้ว</button>':'')+(j.status==='completed'?'<div class="kh-info" style="margin-top:13px">ผู้จ้างยืนยันงานเสร็จและการชำระเงินแล้ว (แจ้งด้วยตนเอง ไม่ใช่หลักฐานธนาคาร)</div>':'')+'</div>':'')+
    (privateInfo&&['assigned','completed'].includes(j.status)?'<div class="kh-panel"><h3>แชทระหว่างผู้จ้างและผู้รับ</h3><div class="kh-chat" id="khMessages"><div class="kh-muted">กำลังโหลดข้อความ</div></div>'+(j.status==='assigned'?'<form id="khChatForm" class="kh-row"><input name="content" maxlength="1000" required placeholder="พิมพ์ข้อความ" style="flex:1"><button type="submit" class="kh-primary" aria-label="ส่ง">'+svg('send')+'</button></form><div class="kh-error" role="status"></div>':'')+'</div>':'')}
  function renderBody(){if(!root || !root.open)return;nav();const el=root.querySelector('.kh-body');const content= S.tab==='home'?home():S.tab==='jobs'?jobs():S.tab==='posts'?posts():S.tab==='mine'?myJobs():S.tab==='admin'?admin():S.tab==='jobForm'?jobForm():S.tab==='postForm'?postForm():S.tab==='detail'?jobDetail():home();el.innerHTML=content;el.scrollTop=0;if(S.tab==='detail'&&S.job&&['assigned','completed'].includes(S.job.status))loadMessages();}
  async function open(tab='home'){
    if(!root) shell();S.tab=tab;
    if(!root.open)root.showModal();S.open=true;document.getElementById('krHelpDock').hidden=true;
    root.querySelector('.kh-body').innerHTML='<div class="kh-loading">กำลังเตรียมข้อมูลชุมชน...</div>';
    await init();await load({quiet:true});renderBody();
    if(!S.user) toast('เข้าสู่ระบบด้วย Google หรือบัญชีทีมงานเพื่อใช้งานบริการ',false);
  }
  async function navigate(tab) {S.tab=tab;S.job=null;if(tab==='admin'&&S.user?.role==='admin')S.audit=await api('admin/audit').catch(()=>[]);renderBody();}
  async function reload(){await load({quiet:true});if(S.tab==='detail'&&S.job)S.job=S.jobs.find(j=>j.id===S.job.id)||S.job;renderBody();}
  async function jobOpen(id){try{S.previous=S.tab==='detail'?'jobs':S.tab;S.job=await api('jobs/'+encodeURIComponent(id));S.tab='detail';renderBody();}catch(e){toast(e.message,true)}}
  function click(e){const button=e.target.closest('button');if(!button)return;
    if(button.dataset.action==='close'){root.close();return;}
    if(button.dataset.tab){navigate(button.dataset.tab).catch(x=>toast(x.message,true));return;}
    if(button.dataset.category){S.formCategory=button.dataset.category;navigate('jobForm');return;}
    if(button.dataset.job){jobOpen(button.dataset.job);return;}
    if(button.dataset.claim){claim(button.dataset.claim,button);return;}
    if(button.dataset.cancel){cancel(button.dataset.cancel,button);return;}
    if(button.dataset.complete){complete(button.dataset.complete,button);return;}
    if(button.dataset.moderate){moderate(button.dataset.moderate,button);return;}
    const action=button.dataset.action;
    if(action==='createJob'){navigate('jobForm');return;}
    if(action==='createPost'){navigate('postForm');return;}
    if(action==='refresh'){reload().catch(x=>toast(x.message,true));return;}
    if(action==='geo'){geo(button);return;}
    if(action==='login'){root.close();if(typeof window.openKranuanLogin==='function')window.openKranuanLogin();else location.href='/';return;}
    if(action==='chat'){root.close();if(typeof window.openKranuanCommunity==='function')window.openKranuanCommunity();else toast('ไม่พบระบบแชท');return;}
    if(action==='market'){root.close();try{const menu=document.querySelector('[data-tab="market"], [data-page="market"], [data-open="market"]');if(menu)menu.click();else location.href='/?market=1'}catch{location.href='/'}return;}
  }
  function change(e){if(e.target.id==='khFilter'){S.filter=e.target.value;renderBody();return;}
    if(e.target.dataset.proof){const stage=e.target.dataset.proof;submitProof(stage,e.target);return;}
  }
  async function submit(e){if(!['khJobForm','khPostForm','khChatForm'].includes(e.target.id))return;e.preventDefault();const form=e.target,btn=form.querySelector('[type="submit"]'),error=form.querySelector('.kh-error');if(btn.disabled)return;
    const fields=new FormData(form);btn.disabled=true;if(error)error.textContent='';
    try{
      if(form.id==='khJobForm'){
        const when=fields.get('date_time');if(!when)throw Error('กรุณาเลือกวันเวลา');
        const result=await api('jobs',{category:fields.get('category'),title:fields.get('title'),detail:fields.get('detail'),area:fields.get('area'),address:fields.get('address'),budget:Number(fields.get('budget')),date_time:new Date(when).toISOString(),estimated_hours:Number(fields.get('estimated_hours')||0),quantity:Number(fields.get('quantity')||0),contact_phone:fields.get('contact_phone'),lat:fields.get('lat')?Number(fields.get('lat')):null,lng:fields.get('lng')?Number(fields.get('lng')):null,photo:await optimize(fields.get('photo'))});
        await reload();toast('ประกาศงานสำเร็จ ไรเดอร์ในระบบเห็นงานแล้ว');jobOpen(result.id);
      }else if(form.id==='khPostForm'){
        const p=await api('posts',{kind:fields.get('kind'),title:fields.get('title'),content:fields.get('content'),area:fields.get('area'),photo:await optimize(fields.get('photo'))});await load({quiet:true});navigate('posts');toast(p.status==='approved'?'เผยแพร่โพสต์แล้ว':'ส่งโพสต์แล้ว รอแอดมินอนุมัติ');
      }else{
        await api('jobs/'+S.job.id+'/messages',{content:fields.get('content')});form.reset();await loadMessages();
      }
    }catch(err){if(error)error.textContent=err.message;else toast(err.message,true);}finally{btn.disabled=false;}
  }
  async function optimize(file){if(!(file instanceof File)||!file.size)return '';
    if(!file.type.startsWith('image/'))throw Error('กรุณาเลือกรูปภาพ');if(file.size>12*1024*1024)throw Error('รูปต้นฉบับต้องไม่เกิน 12 MB');
    const image=await new Promise((resolve,reject)=>{const i=new Image(),url=URL.createObjectURL(file);i.onload=()=>{URL.revokeObjectURL(url);resolve(i)};i.onerror=()=>{URL.revokeObjectURL(url);reject(Error('อ่านรูปภาพไม่ได้'))};i.src=url});
    const canvas=document.createElement('canvas');const ratio=Math.min(1,1000/Math.max(image.naturalWidth,image.naturalHeight));let w=Math.max(1,Math.round(image.naturalWidth*ratio)),h=Math.max(1,Math.round(image.naturalHeight*ratio));
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('อุปกรณ์ไม่รองรับการบีบอัดรูป');let data='';
    for(let round=0;round<5;round++){canvas.width=w;canvas.height=h;ctx.drawImage(image,0,0,w,h);for(const q of [.76,.62,.48,.36]){data=canvas.toDataURL('image/jpeg',q);if(data.length<=172000)return data;}w=Math.max(320,Math.round(w*.77));h=Math.max(240,Math.round(h*.77));}
    throw Error('รูปภาพยังใหญ่เกินไป กรุณาใช้รูปที่เล็กลง');
  }
  function geo(button){if(!navigator.geolocation){toast('อุปกรณ์นี้ไม่รองรับ GPS',true);return;}button.disabled=true;navigator.geolocation.getCurrentPosition(({coords})=>{const f=root.querySelector('#khJobForm');if(!f)return;f.elements.lat.value=coords.latitude.toFixed(6);f.elements.lng.value=coords.longitude.toFixed(6);const note=root.querySelector('#khGeoNote');if(note)note.textContent='ได้พิกัดแล้ว · ความคลาดเคลื่อนประมาณ '+Math.round(coords.accuracy)+' เมตร';button.disabled=false;},e=>{toast('ไม่สามารถอ่าน GPS: '+e.message,true);button.disabled=false;},{enableHighAccuracy:true,timeout:16000,maximumAge:30000});}
  async function claim(id,button){if(!confirm('ยืนยันรับงานนี้? เมื่อรับแล้ว งานจะถูกล็อกไม่ให้คนอื่นรับซ้ำ'))return;button.disabled=true;try{const j=await api('jobs/'+id+'/claim',{});await load({quiet:true});S.job=j;S.previous='mine';S.tab='detail';renderBody();toast('รับงานสำเร็จ กรุณาติดต่อผู้จ้างตามรายละเอียด');}catch(e){toast(e.message,true);await load({quiet:true});renderBody()}finally{button.disabled=false;}}
  async function cancel(id,button){if(!confirm('ยืนยันยกเลิกงานที่ยังไม่มีผู้รับ?'))return;button.disabled=true;try{await api('jobs/'+id+'/cancel',{});await reload();toast('ยกเลิกงานแล้ว');}catch(e){toast(e.message,true);button.disabled=false}}
  async function complete(id,button){if(!confirm('ยืนยันว่าตรวจภาพหลักฐานครบ ตรวจรับงานแล้ว และชำระค่าจ้างให้ผู้รับงานจริงแล้ว?\n\nระบบนี้ไม่มีการหักเงินหรือโอนเงินอัตโนมัติ'))return;button.disabled=true;try{await api('jobs/'+id+'/complete',{payment_confirmed:true});await reload();toast('ปิดงานสำเร็จ');}catch(e){toast(e.message,true);button.disabled=false}}
  async function submitProof(stage,input){if(!input.files?.length||!S.job)return;input.disabled=true;try{await api('jobs/'+S.job.id+'/proof',{stage,photo:await optimize(input.files[0])});await reload();toast('บันทึกภาพหลักฐานแล้ว');}catch(e){toast(e.message,true);input.disabled=false}}
  async function moderate(value,button){const [kind,id,action]=value.split('|');let note='';if(action==='remove'||action==='reject'||action==='cancel'||action==='hide'){const r=prompt('ระบุเหตุผลในการจัดการรายการ (เลือกยกเลิกได้)', '');if(r===null)return;note=r;}button.disabled=true;try{await api('admin/'+kind+'/'+id+'/moderate',{action,note});await reload();toast('บันทึกการจัดการแล้ว');}catch(e){toast(e.message,true);button.disabled=false}}
  async function loadMessages(){if(!S.job)return;const id=S.job.id;try{const messages=await api('jobs/'+id+'/messages');const el=root?.querySelector('#khMessages');if(!el||S.job?.id!==id)return;el.innerHTML=messages.length?messages.map(m=>'<div class="kh-message"><b>'+E(m.name)+' · '+E(date(m.created_at))+'</b>'+E(m.content)+'</div>').join(''):'<div class="kh-muted">ยังไม่มีข้อความ เริ่มพูดคุยกันได้เลย</div>';el.scrollTop=el.scrollHeight;}catch(e){const el=root?.querySelector('#khMessages');if(el)el.textContent=e.message;}}
  document.addEventListener('DOMContentLoaded',()=>{
    shell();
    window.openKranuanHelp = open;
    S.timer=window.setInterval(()=>{if(root?.open&&!['jobForm','postForm'].includes(S.tab)){load({quiet:true}).catch(()=>{});if(S.tab==='jobs'||S.tab==='home'||S.tab==='mine'||S.tab==='posts'||S.tab==='admin'){// Avoid unexpected rerenders while interacting; explicit Refresh remains available.
      }else if(S.tab==='detail'&&S.job&&S.job.status==='assigned')loadMessages();}},12000);
  },{once:true});
})();
