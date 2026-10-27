/* courier-grab-ui.js
   ปรับหน้าตาหน้า "เรียกไรเดอร์ / ส่งของ + ส่งคน" ให้ใช้งานแบบ Grab (แผนที่ปักหมุด + จัดช่องไฟใหม่)
   - ไม่แก้ระบบส่งข้อมูล: ฟอร์ม ชื่อช่อง และการส่งไปหลังบ้าน/ไรเดอร์ ยังเป็นของเดิมใน commerce-customer.js ทั้งหมด
   - ส่วนแผนที่แค่ "เติมค่า" ลงในช่องพิกัดเดิม (pickup_lat/pickup_lng และ lat/lng) เหมือนที่ปุ่ม "ใช้ตำแหน่งปัจจุบัน" ทำ
   - ถ้าไฟล์นี้หรือแผนที่โหลดไม่ได้ หน้าเดิมยังใช้งานได้ตามปกติ
   วางไว้โฟลเดอร์เดียวกับ commerce-customer.js และเรียกเป็นสคริปต์ตัวสุดท้ายใน index.html */
(function () {
  var DEFAULT_CENTER = { lat: 16.706, lng: 103.078 };
  var FIELDS = { pickup: ['pickup_lat', 'pickup_lng', 'pickup'], drop: ['lat', 'lng', 'dropoff'] };
  var gx = { map: null, markers: {}, target: 'pickup', lock: { pickup: null, drop: null }, failed: false, obs: null };

  var PIN_SVG = '<svg viewBox="0 0 38 48" aria-hidden="true"><path class="gx-pinbody" d="M19 0C8.5 0 0 8.4 0 18.8 0 32 19 48 19 48s19-16 19-29.2C38 8.4 29.5 0 19 0z"/><circle cx="19" cy="19" r="7" fill="#fff"/></svg>';
  var GPS_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="8.5"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3"/></svg>';

  var CSS = [
    /* ---------- ภาพรวม / ช่องไฟ ---------- */
    '.c-courier.gx .c-page-title{margin:4px 4px 16px}',
    /* แท็บ ส่งของ / ส่งคน: บังคับ 2 ช่องเท่ากัน กันปุ่มขวาล้นขอบจอจนถูกตัดหาย */
    '.c-courier.gx .c-service-switch{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;box-sizing:border-box;margin:0 0 16px}',
    '.c-courier.gx .c-service-switch > button{display:flex;align-items:center;gap:8px;min-width:0;width:100%;box-sizing:border-box;margin:0;padding:12px}',
    '.c-courier.gx .c-service-switch > button > span{min-width:0}',
    '.c-courier.gx .c-service-switch > button small{display:block;line-height:1.35;overflow-wrap:anywhere}',
    '.c-courier.gx .c-service-switch > button{border:2px solid #eadfce;border-radius:20px;background:#fff;box-shadow:0 2px 8px rgba(60,40,20,.05);transition:all .2s}',
    '.c-courier.gx .c-service-switch > button.active{background:linear-gradient(135deg,#19c25f,#00a043);border-color:transparent;box-shadow:0 8px 20px rgba(0,160,67,.32)}',
    '.c-courier.gx .c-service-switch > button.active,.c-courier.gx .c-service-switch > button.active b,.c-courier.gx .c-service-switch > button.active small{color:#fff}',
    '.c-courier.gx .c-page-title h2{font-size:22px;line-height:1.3;margin:0 0 4px}',
    '.c-courier.gx #courierRequestForm{display:flex;flex-direction:column;gap:16px;background:#fff;border:1px solid #eee2d3;border-radius:24px;padding:20px 18px 22px;box-shadow:0 6px 20px rgba(60,40,20,.06);margin:0}',
    '.c-courier.gx.gx-map-on #courierRequestForm{position:relative;z-index:1;margin-top:-22px;box-shadow:0 -6px 20px rgba(60,40,20,.07),0 4px 16px rgba(60,40,20,.05)}',
    '#courierRequestForm label{display:block;font-size:12px;font-weight:700;color:#8a7b6b;line-height:1.4}',
    '#courierRequestForm label.c-check{display:flex;align-items:flex-start;gap:12px;font-size:13px;font-weight:400;color:#5d4f41;line-height:1.55}',
    '#courierRequestForm label.c-check input{width:20px;height:20px;margin:1px 0 0;flex-shrink:0;accent-color:#e95e30}',
    '#courierRequestForm input:not([type=checkbox]),#courierRequestForm textarea{display:block;width:100%;box-sizing:border-box;margin-top:6px;padding:12px 14px;font-size:14px;color:#332e29;background:#faf5ed;border:1.5px solid #ebdcc9;border-radius:14px;outline:none}',
    '#courierRequestForm input:not([type=checkbox]):focus,#courierRequestForm textarea:focus{background:#fff;border-color:#e95e30}',
    '#courierRequestForm textarea{resize:none;line-height:1.5}',
    '#courierRequestForm .c-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
    /* ---------- ลำดับ: เส้นทางก่อน แล้วรายละเอียด แล้วผู้ติดต่อ ---------- */
    '#courierRequestForm > section:nth-of-type(1){order:1}',
    '#courierRequestForm > section:nth-of-type(2){order:2}',
    '#courierRequestForm > label:not(.c-check){order:3}',
    '#courierRequestForm > .c-two{order:4}',
    '#courierRequestForm > details{order:5}',
    '#courierRequestForm > label.c-check{order:6}',
    '#courierRequestForm > .c-courier-price{order:7}',
    '#courierRequestForm > p{order:8;margin:0}',
    '#courierRequestForm > button[type=submit]{order:9}',
    /* ---------- การ์ดจุดรับ / จุดส่ง ---------- */
    '#courierRequestForm > section.c-courier-location{background:#faf5ed;border:1.5px solid #ebdcc9;border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:12px;margin:0;transition:border-color .15s,background .15s}',
    '#courierRequestForm > section.c-courier-location.gx-active{background:#fff;border-color:#00b14f}',
    '#courierRequestForm > section.c-courier-location:nth-of-type(2).gx-active{border-color:#e95e30}',
    '#courierRequestForm > section.c-courier-location h3{display:flex;align-items:center;gap:10px;margin:0;font-size:15px}',
    '#courierRequestForm > section.c-courier-location h3 svg{display:none}',
    '#courierRequestForm > section.c-courier-location h3::before{content:"";width:14px;height:14px;border-radius:50%;background:#00b14f;flex-shrink:0;box-shadow:0 0 0 4px rgba(0,177,79,.18)}',
    '#courierRequestForm > section.c-courier-location:nth-of-type(2) h3::before{border-radius:4px;background:#e95e30;box-shadow:0 0 0 4px rgba(233,94,48,.18)}',
    '#courierRequestForm > section.c-courier-location textarea{background:#fff;margin-top:6px}',
    '#courierRequestForm > section.c-courier-location > .c-btn{align-self:flex-start;padding:10px 16px}',
    '#courierRequestForm > section.c-courier-location > .c-help{margin:0;font-size:12px;line-height:1.5}',
    '#courierRequestForm > section.c-courier-location > details summary{font-size:12px;padding:4px 0}',
    '#courierRequestForm > section.c-courier-location > details .c-two{margin-top:8px}',
    '#courierRequestForm > details.c-courier-photos{border:1.5px dashed #dccdb8;border-radius:16px;padding:14px 16px;background:#faf5ed}',
    '#courierRequestForm > details.c-courier-photos .c-two{margin-top:14px;gap:14px}',
    '#courierRequestForm > .c-courier-price{display:flex;justify-content:space-between;align-items:center;background:#e7f8ee;border-radius:16px;padding:12px 16px;color:#2f6a49}',
    '#courierRequestForm > .c-courier-price strong{font-size:20px;color:#00803c}',
    '#courierRequestForm > button[type=submit]{width:100%;padding:17px;font-size:16px;font-weight:700;border-radius:18px;border:0;color:#fff;background:linear-gradient(135deg,#19c25f,#00a043);box-shadow:0 8px 20px rgba(0,160,67,.35)}',
    '#courierRequestForm > button[type=submit]:disabled{background:#cfc8bd;box-shadow:none}',
    /* ---------- แผนที่ ---------- */
    '.gx-map{position:relative;isolation:isolate;z-index:0;height:310px;border-radius:26px;overflow:hidden;background:#e9e3d8;box-shadow:0 8px 24px rgba(60,40,20,.14);margin:0}',
    '#gxMap{position:absolute;inset:0}',
    '.gx-loading{position:absolute;inset:0;display:grid;place-items:center;font-size:13px;color:#8a7b6b}',
    '.gx-seg{position:absolute;left:14px;right:14px;top:14px;z-index:610;display:grid;grid-template-columns:1fr 1fr;gap:4px;background:rgba(255,255,255,.96);border-radius:14px;padding:4px;box-shadow:0 3px 10px rgba(0,0,0,.14)}',
    '.gx-seg button{border:0;background:none;border-radius:10px;padding:9px 6px;font-size:13px;font-weight:700;color:#7a6b5c;display:flex;align-items:center;justify-content:center;gap:8px}',
    '.gx-seg button::before{content:"";width:10px;height:10px;border-radius:50%;background:#00b14f}',
    '.gx-seg button[data-gx-t=drop]::before{border-radius:3px;background:#e95e30}',
    '.gx-seg button.on{background:#f1faf4;color:#00803c}',
    '.gx-seg button[data-gx-t=drop].on{background:#fff1ea;color:#c84c23}',
    '.gx-hint{position:absolute;left:50%;top:64px;transform:translateX(-50%);z-index:610;max-width:calc(100% - 28px);background:rgba(45,36,30,.82);color:#fff;border-radius:999px;padding:6px 14px;font-size:11px;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.gx-pin{position:absolute;left:50%;top:50%;transform:translate(-50%,-100%);z-index:600;pointer-events:none;width:38px;height:48px;filter:drop-shadow(0 4px 4px rgba(0,0,0,.28))}',
    '.gx-pin svg{width:100%;height:100%;display:block}',
    '.gx-pin .gx-pinbody{fill:#00b14f}',
    '.gx-pin.drop .gx-pinbody{fill:#e95e30}',
    '.gx-gps{position:absolute;right:14px;bottom:76px;z-index:610;width:44px;height:44px;border-radius:50%;border:0;background:#fff;color:#00994a;display:grid;place-items:center;box-shadow:0 3px 10px rgba(0,0,0,.2);padding:0}',
    '.gx-gps svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round}',
    '.gx-confirm{position:absolute;left:14px;right:14px;bottom:14px;z-index:610;border:0;border-radius:16px;padding:15px;font-size:15px;font-weight:700;color:#fff;background:linear-gradient(135deg,#19c25f,#00a043);box-shadow:0 6px 16px rgba(0,140,60,.38)}',
    '.gx-confirm.drop{background:linear-gradient(135deg,#ff7a4a,#e04f22);box-shadow:0 6px 16px rgba(200,76,35,.38)}',
    '.gx-dot{width:20px;height:20px;border-radius:50%;border:4px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)}',
    '.gx-dot.pickup{background:#00b14f}.gx-dot.drop{background:#e95e30;border-radius:7px}',
    /* ---------- ช่องไฟ: ทับ dense-layout.css ให้ไม่ชิดขอบ ---------- */
    '.c-courier.gx{padding:0 16px 8px!important;box-sizing:border-box}',
    '.c-courier.gx .c-page-title{margin:6px 4px 16px!important}',
    '.c-courier.gx .c-service-switch{gap:10px!important;margin:0 0 16px!important}',
    '.c-courier.gx #courierRequestForm{padding:22px 20px 24px!important;gap:20px!important}',
    '#courierRequestForm > section.c-courier-location{padding:18px!important;gap:14px!important}',
    '#courierRequestForm input:not([type=checkbox]),#courierRequestForm textarea{padding:13px 16px!important}',
    '#courierRequestForm > details.c-courier-photos{padding:16px 18px!important}',
    '#courierRequestForm > .c-courier-price{padding:14px 18px!important}',
    '#courierRequestForm > button[type=submit]{padding:17px!important}',
    '@media (max-width:380px){.c-courier.gx{padding:0 12px 8px!important}.c-courier.gx #courierRequestForm{padding:20px 16px 22px!important}.gx-hint{font-size:10px}}'
  ].join('\n');

  function num(v) { return v !== '' && v != null && isFinite(Number(v)) ? Number(v) : null; }
  function readPoint(f, t) {
    var a = f.elements[FIELDS[t][0]], b = f.elements[FIELDS[t][1]];
    if (!a || !b) return null;
    var la = num(a.value), lo = num(b.value);
    return la !== null && lo !== null ? { lat: la, lng: lo } : null;
  }
  function setStatus(f, t, text) {
    var el = f.querySelector('[data-gps-status="' + (t === 'pickup' ? 'pickup' : 'dropoff') + '"]');
    if (el) el.textContent = text;
  }
  function labelOf(sec) { var h = sec && sec.querySelector('h3'); return h ? h.textContent.trim() : ''; }

  function loadLeaflet(cb) {
    if (window.L) { cb(true); return; }
    if (gx.failed) { cb(false); return; }
    if (!document.getElementById('gxLeafletCss')) {
      var l = document.createElement('link');
      l.id = 'gxLeafletCss'; l.rel = 'stylesheet';
      l.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(l);
    }
    var s = document.getElementById('gxLeafletJs');
    if (!s) {
      s = document.createElement('script');
      s.id = 'gxLeafletJs';
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      s.addEventListener('error', function () { gx.failed = true; });
      document.head.appendChild(s);
    }
    s.addEventListener('load', function () { cb(true); });
    s.addEventListener('error', function () { cb(false); });
  }

  function drawMarkers(f) {
    if (!gx.map || !window.L) return;
    ['pickup', 'drop'].forEach(function (t) {
      if (gx.markers[t]) { gx.map.removeLayer(gx.markers[t]); gx.markers[t] = null; }
      var p = readPoint(f, t);
      if (p) {
        gx.markers[t] = L.marker([p.lat, p.lng], {
          interactive: false,
          icon: L.divIcon({ className: '', html: '<div class="gx-dot ' + t + '"></div>', iconSize: [20, 20], iconAnchor: [10, 10] })
        }).addTo(gx.map);
      }
    });
  }

  function setTarget(f, t) {
    gx.target = t;
    var box = document.getElementById('gxMapBox');
    if (!box) return;
    var secs = f.querySelectorAll(':scope > section.c-courier-location');
    var name = labelOf(secs[t === 'pickup' ? 0 : 1]);
    box.querySelectorAll('.gx-seg button').forEach(function (b) { b.classList.toggle('on', b.dataset.gxT === t); });
    if (secs[0]) secs[0].classList.toggle('gx-active', t === 'pickup');
    if (secs[1]) secs[1].classList.toggle('gx-active', t === 'drop');
    box.querySelector('#gxPin').classList.toggle('drop', t === 'drop');
    var c = box.querySelector('#gxConfirm');
    c.textContent = 'ยืนยัน' + name + 'ตรงนี้';
    c.classList.toggle('drop', t === 'drop');
    box.querySelector('#gxHint').textContent = 'เลื่อนแผนที่ให้หมุดอยู่ตรง' + name + ' แล้วกดยืนยัน';
    var p = readPoint(f, t);
    if (gx.map && p) gx.map.setView([p.lat, p.lng], gx.map.getZoom());
  }

  function confirmPin(f) {
    if (!gx.map) return;
    var c = gx.map.getCenter(), t = gx.target, p = { lat: +c.lat.toFixed(6), lng: +c.lng.toFixed(6) };
    var a = f.elements[FIELDS[t][0]], b = f.elements[FIELDS[t][1]];
    a.value = p.lat; b.value = p.lng;
    a.dispatchEvent(new Event('input', { bubbles: true }));   /* ให้ระบบเดิมจำค่าฉบับร่างไว้ */
    gx.lock[t] = p;
    setStatus(f, t, 'ปักหมุดบนแผนที่แล้ว ' + p.lat.toFixed(5) + ', ' + p.lng.toFixed(5));
    drawMarkers(f);
    if (t === 'pickup' && !readPoint(f, 'drop')) setTarget(f, 'drop');
  }

  function goMyLocation() {
    if (!navigator.geolocation || !gx.map) return;
    navigator.geolocation.getCurrentPosition(function (pos) {
      if (gx.map) gx.map.setView([pos.coords.latitude, pos.coords.longitude], 17);
    }, function () {}, { enableHighAccuracy: true, timeout: 12000 });
  }

  function initMap(f, sec) {
    loadLeaflet(function (ok) {
      var el = document.getElementById('gxMap');
      if (!el || gx.map) return;
      if (!ok) {                       /* โหลดแผนที่ไม่ได้ → เอากล่องแผนที่ออก หน้าเดิมใช้ต่อได้ */
        var box = document.getElementById('gxMapBox');
        if (box) box.remove();
        sec.classList.remove('gx-map-on');
        f.querySelectorAll('section.c-courier-location').forEach(function (s) { s.classList.remove('gx-active'); });
        return;
      }
      try {
        var start = readPoint(f, gx.target) || readPoint(f, 'pickup') || readPoint(f, 'drop') || DEFAULT_CENTER;
        gx.map = L.map(el, { zoomControl: false, attributionControl: true }).setView([start.lat, start.lng], 16);
        var tl = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap', referrerPolicy: 'origin' });
        /* เว็บตั้งค่าไม่ส่ง Referer ทำให้ OpenStreetMap บล็อก → บังคับส่งชื่อเว็บไปกับภาพแผนที่ทุกแผ่น */
        if (tl.on) tl.on('tileloadstart', function (ev) { try { ev.tile.referrerPolicy = 'origin'; } catch (e) {} });
        tl.addTo(gx.map);
        var ld = document.querySelector('.gx-loading'); if (ld) ld.remove();
        drawMarkers(f);
        setTimeout(function () { if (gx.map) gx.map.invalidateSize(); }, 60);
      } catch (e) { gx.map = null; }
    });
  }

  function mount() {
    var sec = document.querySelector('#app .c-courier'), f = document.getElementById('courierRequestForm');
    if (!sec || !f || f.dataset.gx) return;
    var secs = f.querySelectorAll(':scope > section.c-courier-location');
    if (secs.length !== 2 || !f.elements.pickup_lat || !f.elements.lat) return;   /* โครงหน้าไม่ตรง → ไม่ยุ่ง */
    f.dataset.gx = '1';

    if (!document.getElementById('gxStyle')) {
      var st = document.createElement('style'); st.id = 'gxStyle'; st.textContent = CSS; document.head.appendChild(st);
    }
    if (gx.map) { try { gx.map.remove(); } catch (e) {} }
    gx.map = null; gx.markers = {};

    var box = document.createElement('div');
    box.className = 'gx-map'; box.id = 'gxMapBox';
    box.innerHTML = '<div id="gxMap"></div><div class="gx-loading">กำลังโหลดแผนที่...</div>' +
      '<div class="gx-seg" role="group" aria-label="เลือกจุดที่จะปักหมุด"><button type="button" data-gx-t="pickup"></button><button type="button" data-gx-t="drop"></button></div>' +
      '<div class="gx-hint" id="gxHint"></div><div class="gx-pin" id="gxPin">' + PIN_SVG + '</div>' +
      '<button type="button" class="gx-gps" aria-label="ไปยังตำแหน่งของฉัน">' + GPS_SVG + '</button>' +
      '<button type="button" class="gx-confirm" id="gxConfirm"></button>';
    f.parentNode.insertBefore(box, f);
    box.querySelector('[data-gx-t=pickup]').textContent = labelOf(secs[0]);
    box.querySelector('[data-gx-t=drop]').textContent = labelOf(secs[1]);
    box.querySelectorAll('.gx-seg button').forEach(function (b) { b.onclick = function () { setTarget(f, b.dataset.gxT); }; });
    box.querySelector('.gx-gps').onclick = goMyLocation;
    box.querySelector('#gxConfirm').onclick = function () { confirmPin(f); };
    sec.classList.add('gx', 'gx-map-on');

    /* พิกัดที่ปักไว้ เทียบกับค่าในช่อง: ถ้าตรงกันถือว่ายังล็อกอยู่ */
    ['pickup', 'drop'].forEach(function (t) {
      var p = readPoint(f, t), k = gx.lock[t];
      if (!(p && k && p.lat === k.lat && p.lng === k.lng)) gx.lock[t] = null;
    });

    /* พิมพ์ที่อยู่ต่อหลังปักหมุด: ระบบเดิมจะล้างพิกัด → คืนค่าหมุดที่ผู้ใช้ปักเองไว้ */
    ['pickup', 'drop'].forEach(function (t) {
      var addr = f.elements[FIELDS[t][2]];
      if (!addr) return;
      addr.addEventListener('input', function () {
        var p = gx.lock[t];
        if (!p) return;
        f.elements[FIELDS[t][0]].value = p.lat; f.elements[FIELDS[t][1]].value = p.lng;
        setStatus(f, t, 'ปักหมุดบนแผนที่แล้ว ' + p.lat.toFixed(5) + ', ' + p.lng.toFixed(5));
      });
      [FIELDS[t][0], FIELDS[t][1]].forEach(function (n) {      /* ผู้ใช้แก้พิกัดเอง → เลิกล็อก */
        f.elements[n].addEventListener('input', function (e) { if (e.isTrusted) gx.lock[t] = null; });
      });
    });
    /* เมื่อกดปุ่ม "ใช้ตำแหน่งปัจจุบัน" ของเดิม หมุดบนแผนที่จะขยับตาม */
    if (gx.obs) gx.obs.disconnect();
    gx.obs = new MutationObserver(function () { drawMarkers(f); });
    gx.obs.observe(f, { subtree: true, childList: true, characterData: true });

    secs[0].addEventListener('focusin', function () { setTarget(f, 'pickup'); });
    secs[1].addEventListener('focusin', function () { setTarget(f, 'drop'); });
    setTarget(f, gx.target);
    initMap(f, sec);
  }

  if (typeof render === 'function') {
    var prevRender = render;
    render = function () {
      var r = prevRender.apply(this, arguments);
      try { if (typeof view !== 'undefined' && view === 'ส่งของ') mount(); } catch (e) { if (window.console) console.error('courier-grab-ui:', e); }
      return r;
    };
  }
})();
