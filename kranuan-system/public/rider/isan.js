/* isan.js — ธีมอีสาน กระนวนไรเดอร์
   อัปเดต: แก้แผนที่ชิดขอบ, ปรับ Modal งานใหม่ให้กระชับเห็นข้อมูลครบ */
(function () {
  'use strict';
  var body = document.body;
  if (!body) return;

  /* ---------- 1) คลาสและโหมด ---------- */
  body.classList.add('isan');
  body.setAttribute('data-scene', 'home');

  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {}
    return null;
  }
  if (store('isanDark') === '1') body.classList.add('dark');

  /* ---------- 2) ฉากพื้นหลัง ---------- */
  var land =
    '<svg viewBox="0 0 640 520" preserveAspectRatio="xMidYMax slice" ' +
    'style="position:absolute;left:0;bottom:0;width:100%;height:62%" aria-hidden="true">' +
    '<defs><linearGradient id="lk" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="var(--lake1)"/><stop offset="1" stop-color="var(--lake2)"/>' +
    '</linearGradient></defs>' +
    '<path class="far" d="M0 250 Q80 205 170 240 T340 232 T510 238 T640 220 V300 H0Z"/>' +
    '<path class="mid" d="M0 268 Q60 238 120 262 T250 258 T380 264 T520 256 T640 262 V310 H0Z"/>' +
    '<rect class="lake" x="0" y="290" width="640" height="230"/>' +
    '<path class="rip" d="M60 360 q20 -6 40 0 t40 0"/>' +
    '<path class="rip" d="M300 400 q25 -7 50 0 t50 0"/>' +
    '<path class="rip" d="M120 440 q25 -7 50 0 t50 0"/>' +
    '<path class="rip" d="M430 470 q25 -7 50 0 t50 0"/>' +
    '<path class="rip" d="M200 332 q18 -5 36 0 t36 0"/>' +
    '<g class="hang">' +
    '<path class="cab" d="M70 300 Q320 190 570 300"/>' +
    '<path class="cab2" d="M70 312 Q320 205 570 312"/>' +
    '<line x1="130" y1="257" x2="130" y2="300"/><line x1="190" y1="233" x2="190" y2="300"/>' +
    '<line x1="250" y1="219" x2="250" y2="300"/><line x1="320" y1="214" x2="320" y2="300"/>' +
    '<line x1="390" y1="219" x2="390" y2="300"/><line x1="450" y1="233" x2="450" y2="300"/>' +
    '<line x1="510" y1="257" x2="510" y2="300"/>' +
    '</g>' +
    '<rect class="brf" x="50" y="298" width="540" height="12" rx="3"/>' +
    '<rect class="brd" x="50" y="310" width="540" height="5"/>' +
    '<rect class="br" x="62" y="262" width="9" height="40" rx="2"/>' +
    '<rect class="br" x="569" y="262" width="9" height="40" rx="2"/>' +
    '<rect class="brd" x="140" y="315" width="7" height="34"/><rect class="brd" x="320" y="315" width="7" height="34"/>' +
    '<rect class="brd" x="500" y="315" width="7" height="34"/>' +
    '<g class="stepT"><rect x="48" y="294" width="18" height="6"/><rect x="574" y="294" width="18" height="6"/></g>' +
    '<g class="stepF"><rect x="48" y="300" width="18" height="4"/><rect x="574" y="300" width="18" height="4"/></g>' +
    '<circle class="lamp" cx="66" cy="258" r="6"/><circle class="lamp" cx="574" cy="258" r="6"/>' +
    '<circle class="lamp" cx="320" cy="212" r="5"/><circle class="lamp" cx="190" cy="231" r="4"/>' +
    '<circle class="lamp" cx="450" cy="231" r="4"/>' +
    '<g class="canopy">' +
    '<rect class="leaf2" x="38" y="340" width="10" height="180"/>' +
    '<ellipse class="leaf2" cx="44" cy="330" rx="72" ry="48"/>' +
    '<ellipse class="leaf1" cx="34" cy="318" rx="56" ry="36"/>' +
    '<ellipse class="leafhi" cx="22" cy="308" rx="34" ry="20"/>' +
    '</g>' +
    '<g class="canopy r">' +
    '<rect class="leaf2" x="592" y="360" width="10" height="160"/>' +
    '<ellipse class="leaf2" cx="598" cy="350" rx="68" ry="44"/>' +
    '<ellipse class="leaf1" cx="606" cy="338" rx="52" ry="32"/>' +
    '<ellipse class="leafhi" cx="614" cy="330" rx="30" ry="18"/>' +
    '</g>' +
    '</svg>';

  var bg = document.createElement('div');
  bg.className = 'isan-bg';
  bg.setAttribute('aria-hidden', 'true');
  bg.innerHTML =
    '<div class="sky"></div><div class="stars"></div><div class="sun"></div>' +
    '<div class="clouds"><i></i><i></i><i></i></div>' +
    '<div class="ground"></div>' +
    '<div class="land">' + land + '</div>';
  body.insertBefore(bg, body.firstChild);

  /* ---------- 3) ปุ่มสลับโหมดมืด/สว่าง ---------- */
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'modebtn';
  btn.setAttribute('aria-label', 'สลับโหมดมืด/สว่าง');
  btn.innerHTML =
    '<svg class="i-moon" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>' +
    '<svg class="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/>' +
    '<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  btn.addEventListener('click', function () {
    var on = body.classList.toggle('dark');
    store('isanDark', on ? '1' : '0');
  });

  function mountButton() {
    if (btn.isConnected) return;
    var sos = document.querySelector('.sosbtn');
    var top = document.querySelector('.topbar');
    if (sos && sos.parentNode) sos.parentNode.insertBefore(btn, sos);
    else if (top) top.appendChild(btn);
  }

  /* ---------- 4) สลับฉากตามแท็บ ---------- */
  var SCENES = ['home', 'jobs', 'history', 'settings'];

  function syncScene() {
    var buttons = document.querySelectorAll('.nav button');
    if (!buttons.length) return;
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].classList.contains('active')) {
        var s = SCENES[i] || 'home';
        if (body.getAttribute('data-scene') !== s) body.setAttribute('data-scene', s);
        return;
      }
    }
  }

  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; mountButton(); syncScene(); relayout(); });
  }

  new MutationObserver(schedule).observe(body, {
    subtree: true, childList: true, attributes: true, attributeFilter: ['class'], characterData: true
  });
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.nav')) setTimeout(syncScene, 60);
  });
  mountButton();
  syncScene();


  /* ---------- 6) จัดหน้าใหม่ (CSS Overrides) ---------- */
  var css = document.createElement('style');
  css.textContent =
    /* แถบบน: กะทัดรัด */
    'body.isan .topbar{flex-wrap:wrap;padding-bottom:6px!important}' +
    'body.isan .topbar strong{font-size:17px!important;line-height:1.15}' +
    'body.isan .topbar small{font-size:10px!important}' +
    'body.isan .modebtn{width:36px!important;height:36px!important;min-width:0!important;border-radius:12px!important;padding:0!important}' +
    'body.isan .modebtn svg{width:18px!important;height:18px!important}' +
    'body.isan .sosbtn{height:36px!important;min-height:0!important;min-width:0!important;padding:0 12px!important;font-size:12px!important;border-radius:12px!important}' +
    'body.isan .sosbtn svg{width:15px!important;height:15px!important}' +
    /* แถวสถานะ: ปุ่มออนไลน์ + สรุปรายได้ */
    '.isan-dock{flex:0 0 100%;display:flex;gap:8px;align-items:stretch;padding:6px 0 0}' +
    '.isan-dock .isan-tg{flex:1;min-height:40px;display:flex;align-items:center;justify-content:center;gap:8px;' +
    'border-radius:14px;font:600 13px Mitr,Seed,sans-serif;border:1px solid var(--ln2);background:var(--chip);' +
    'color:var(--tx2);cursor:pointer;padding:0 10px}' +
    '.isan-tg i{width:9px;height:9px;border-radius:50%;background:var(--tx2);flex:none}' +
    '.isan-tg.on{background:rgba(var(--okrgb),.16);border-color:rgba(var(--okrgb),.55);color:var(--ok)}' +
    '.isan-tg.on i{background:var(--ok);box-shadow:0 0 8px var(--ok)}' +
    '.isan-fare{flex:none;min-width:104px;padding:4px 12px;border-radius:14px;border:1px solid var(--ln2);' +
    'background:var(--chip);display:flex;flex-direction:column;justify-content:center}' +
    '.isan-fare[hidden]{display:none}' +
    '.isan-fare span{font-size:9.5px;color:var(--tx2);line-height:1.2}' +
    '.isan-fare b{font:500 16px/1.2 Mitr,Seed,sans-serif;color:var(--ac2)}' +
    '.isan-fare em{font:400 10px Mitr,Seed,sans-serif;color:var(--tx2);font-style:normal;margin-left:6px}' +
    '.isan-hide{display:none!important}' +
    'body.isan .switch:has(>button[data-act="toggle"]){display:none}' +
    /* การ์ดให้เล็กลง อ่านง่าย */
    'body.isan #screen .card{padding:14px!important;border-radius:20px!important}' +
    'body.isan #screen .card h2{font-size:19px!important;margin:2px 0 8px!important}' +
    'body.isan #screen button.full,body.isan #screen button.primary,body.isan #screen button.secondary{min-height:44px!important;font-size:14px!important;border-radius:14px!important}' +
    /* เมนูล่าง: เล็กลง ไม่บังแผนที่ */
    'body.isan .nav{padding:5px 8px!important;border-radius:22px!important}' +
    'body.isan .nav button{padding:6px 4px!important;min-height:0!important;font-size:10.5px!important;border-radius:16px!important;gap:2px!important}' +
    'body.isan .nav button svg{width:21px!important;height:21px!important}' +
    
    /* ========================================================
       🔥 แก้ไขแผนที่ชิดขอบ (Map Fix)
       ======================================================== */
    'body.isan.rmc-map-screen #realMapContainer{position:absolute!important;top:0!important;left:0!important;width:100vw!important;height:100vh!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important;z-index:0!important}' +
    'body.isan.rmc-map-screen .content{position:relative!important;z-index:10!important;background:transparent!important;padding-top:0!important}' +
    'body.isan.rmc-map-screen .maptop{top:calc(var(--isan-top, 100px) + 10px)!important;z-index:20!important}' +
    'body.isan.rmc-map-screen .topbar strong{color:var(--tx)}' +
    'body.isan.rmc-map-screen .topbar small{color:var(--ac2)}' +
    'body.isan.rmc-map-screen #realMapContainer:after{background:linear-gradient(to bottom,rgba(255,243,220,.92),rgba(255,243,220,.35) 14%,transparent 28%,transparent 70%,rgba(255,243,220,.5) 100%)}' +
    'body.isan.dark.rmc-map-screen #realMapContainer:after{background:linear-gradient(to bottom,rgba(7,12,30,.92),rgba(7,12,30,.35) 14%,transparent 28%,transparent 70%,rgba(7,12,30,.55) 100%)}' +
    
    /* การ์ด Trip Insight ให้เว้นระยะจากด้านบน ไม่ทับ Topbar */
    'body.isan.rmc-map-screen #screen .card{margin-top:calc(var(--isan-top, 100px) + 10px)!important}' +

    /* ========================================================
       🔥 แก้ไขหน้างานเด้ง Modal แน่นเกิน (Popup Fix)
       ======================================================== */
    /* ลด Padding ของ Modal */
    'body.isan .modal, body.isan .bottom-sheet, body.isan .sheet, body.isan #jobModal {padding: 12px !important;}' +
    /* ลดขนาดตัวอักษรหัวข้อ */
    'body.isan .modal h1, body.isan .modal h2, body.isan .modal h3, body.isan .bottom-sheet h1, body.isan .bottom-sheet h2, body.isan .bottom-sheet h3 {font-size: 16px !important; margin: 4px 0 !important; line-height: 1.2 !important;}' +
    /* ลด Line-height และ Margin ของข้อมูล */
    'body.isan .modal p, body.isan .modal span, body.isan .modal div, body.isan .bottom-sheet p, body.isan .bottom-sheet span, body.isan .bottom-sheet div {line-height: 1.3 !important; margin-bottom: 2px !important;}' +
    /* บีบระยะห่างของ Timeline จุดรับ-ส่ง */
    'body.isan .modal .route, body.isan .bottom-sheet .route, body.isan .modal .timeline, body.isan .bottom-sheet .timeline {gap: 4px !important; margin: 6px 0 !important;}' +
    /* ลดขนาดปุ่มใน Modal ให้ไม่ดันขอบ */
    'body.isan .modal button, body.isan .bottom-sheet button {min-height: 38px !important; font-size: 14px !important; padding: 6px 10px !important;}' +
    /* ลดระยะเวลานับถอยหลัง (20 วินาที) */
    'body.isan .modal .timer, body.isan .bottom-sheet .timer {margin-bottom: 4px !important;}';

  document.head.appendChild(css);

  var dock = null, tg = null, fare = null, fareV = null, fareN = null, lastW = 0;

  function ensureDock() {
    var tb = document.querySelector('.topbar');
    if (!tb) return;

    var all = document.querySelectorAll('.isan-dock');
    for (var i = 0; i < all.length; i++) {
      if (all[i] !== dock) all[i].remove();
    }

    if (dock && dock.parentNode !== tb) tb.appendChild(dock);

    if (!dock) {
      dock = document.createElement('div');
      dock.className = 'isan-dock';
      dock.innerHTML =
        '<button type="button" class="isan-tg" data-act="toggle"><i></i><span></span></button>' +
        '<div class="isan-fare" hidden><span>รายได้วันนี้</span><div><b>—</b><em></em></div></div>';
      tb.appendChild(dock);
      tg = dock.querySelector('.isan-tg');
      fare = dock.querySelector('.isan-fare');
      fareV = fare.querySelector('b'); fareN = fare.querySelector('em');
    }

    var on = !!document.querySelector('#topStatus.on');
    tg.classList.toggle('on', on);
    var t = on ? 'ออนไลน์ · แตะเพื่อปิด' : 'ออฟไลน์ · แตะเพื่อเปิด';
    var sp = tg.lastChild;
    if (sp.textContent !== t) sp.textContent = t;
  }

  function showEarnings() {
    if (!dock) return;
    if (typeof done !== 'function' || typeof isToday !== 'function' || typeof sum !== 'function') return;
    var d = done().filter(function (j) { return isToday(j.delivered_at); });
    var v = sum(d);
    var txt = (typeof baht === 'function') ? baht(v) : Number(v).toLocaleString('th-TH') + ' บาท';
    if (fareV.textContent !== txt) fareV.textContent = txt;
    var nt = d.length + ' งาน';
    if (fareN.textContent !== nt) fareN.textContent = nt;
    fare.hidden = false;
  }

  function relayoutCost() {
    var src = document.querySelector('[data-rmc-settings]');
    if (!src) return;
    src.classList.add('isan-hide');
    if (body.getAttribute('data-scene') !== 'settings') return;
    var scr = document.querySelector('#screen');
    if (!scr || scr.querySelector('#isanCostCard')) return;
    var c = document.createElement('div');
    c.className = 'card';
    c.id = 'isanCostCard';
    c.innerHTML = '<h2>ต้นทุนการวิ่ง</h2>' +
      '<span class="muted">ตั้งต้นทุนรถ เพื่อให้ระบบประเมินว่างานนี้วิ่งคุ้มไหม</span>' +
      '<button type="button" class="secondary full" style="margin-top:10px">ตั้งต้นทุน</button>';
    var after = scr.querySelector('.sectiontitle');
    scr.insertBefore(c, after ? after.nextSibling : scr.firstChild);
    c.querySelector('button').addEventListener('click', function () {
      var s = document.querySelector('[data-rmc-settings]');
      if (s) s.click();
    });
  }

  /* 🔥 อัปเกรด fixMap ให้บังคับขนาดกระตุ้น Leaflet */
  function fixMap() {
    var tb = document.querySelector('.topbar');
    if (tb) body.style.setProperty('--isan-top', tb.offsetHeight + 'px');
    
    var m = document.querySelector('#realMapContainer');
    if (!m) return;

    // บังคับขนาดความสูงตรงๆ ให้ Leaflet รับรู้
    m.style.height = '100vh';
    m.style.width = '100vw';

    var w = m.offsetWidth + 'x' + m.offsetHeight;
    if (w !== lastW) {
      lastW = w;
      // ยิง resize 3 จังหวะ เพื่อให้ Leaflet คำนวณขนาดใหม่แน่ๆ
      setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 100);
      setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 500);
      setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 1000);
    }
  }

  window.addEventListener('load', function () { setTimeout(function () { lastW = 0; relayout(); }, 400); });

  function relayout() {
    try { ensureDock(); showEarnings(); relayoutCost(); fixMap(); } catch (e) { /* ไม่ให้ธีมพัง */ }
  }

  /* ---------- 5) ฝูงนกบิน ---------- */
  var BIRD =
    '<div class="bi"><svg viewBox="0 0 24 12"><path d="M0 6 Q6 -2 12 6 Q18 -2 24 6 Q18 3 12 9 Q6 3 0 6Z"/></svg></div>';

  function launchFlock() {
    if (document.hidden) return;
    var dir = Math.random() < 0.5 ? 'ltr' : 'rtl';
    var f = document.createElement('div');
    f.className = 'flock ' + dir;
    f.style.top = (8 + Math.random() * 26) + 'vh';
    var dur = 22 + Math.random() * 14;
    f.style.animationDuration = dur + 's';
    var n = 3 + Math.floor(Math.random() * 4);
    for (var i = 0; i < n; i++) {
      var b = document.createElement('div');
      b.className = 'bird';
      var s = 14 + Math.random() * 8;
      b.style.width = s + 'px';
      b.style.height = s * 0.5 + 'px';
      b.style.left = (i * 22 + Math.random() * 10) + 'px';
      b.style.top = (Math.abs(i - n / 2) * 8 + Math.random() * 8) + 'px';
      b.style.animationDelay = (-Math.random() * 1.3) + 's';
      b.innerHTML = BIRD;
      f.appendChild(b);
    }
    f.addEventListener('animationend', function () { f.remove(); });
    body.appendChild(f);
  }

  relayout();

  setTimeout(launchFlock, 2500);
  setInterval(launchFlock, 24000);
})();