/* ads-admin.js — แท็บ "โฆษณา" ในแผงแอดมิน (เพิ่ม/แก้/ลบ/เปิดปิด/เรียงลำดับ/ตั้งวันที่)
 * ใช้รูปแบบเดียวกับ market-admin.js: wrap staffRender() แล้วเพิ่มปุ่มแท็บ */
(function () {
  const E = kEscape;
  let adsRows = [], adsLoaded = false, adsBusy = false, draftImage = '';
  const KIND = { poster: 'ป้ายโฆษณาหน้าหลัก (เลื่อนอัตโนมัติ)', popup: 'ป๊อบอัพตอนเข้าใช้' };
  const todayTH = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

  if (!document.getElementById('adsAdminCss')) {
    const st = document.createElement('style'); st.id = 'adsAdminCss';
    st.textContent = '.ads-head{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}.ads-sec{margin:18px 0 8px}.ads-sec small{color:#85735f}.ads-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}.ads-card{border:1px solid #eadfce;background:#fffdf8;border-radius:16px;overflow:hidden;display:flex;flex-direction:column}.ads-thumb{aspect-ratio:16/9;background:linear-gradient(145deg,#ffd873,#f07b46);display:grid;place-items:center;font-size:34px;overflow:hidden}.ads-thumb img{width:100%;height:100%;object-fit:cover}.ads-body{padding:11px;display:grid;gap:5px;flex:1}.ads-body h3{margin:0;font-size:15px}.ads-body p{margin:0;font-size:12px;color:#6d5f50;overflow-wrap:anywhere}.ads-state{display:inline-block;font-size:11px;padding:2px 9px;border-radius:20px;background:#eee}.ads-state.on{background:#dff5e6;color:#1f7a45}.ads-state.wait{background:#fff0ce;color:#9a6a12}.ads-state.end,.ads-state.off{background:#f1e6e4;color:#8a5b52}.ads-actions{display:flex;gap:6px;flex-wrap:wrap;padding:0 11px 11px}.ads-actions button{font-size:12px;padding:6px 10px}.ads-form-preview{aspect-ratio:16/9;border-radius:12px;background:#f3ead9;display:grid;place-items:center;overflow:hidden;color:#85735f;font-size:12px}.ads-form-preview img{width:100%;height:100%;object-fit:cover}.ads-two{display:grid;grid-template-columns:1fr 1fr;gap:8px}#adDialog{max-width:560px;width:calc(100% - 24px);border-radius:20px;border:0;padding:16px}';
    document.head.appendChild(st);
  }

  const status = a => {
    const t = todayTH();
    if (!a.enabled) return ['ปิดอยู่', 'off'];
    if (a.start_date && t < a.start_date) return ['รอเริ่ม ' + a.start_date, 'wait'];
    if (a.end_date && t > a.end_date) return ['หมดอายุแล้ว', 'end'];
    return ['กำลังแสดง', 'on'];
  };
  const payload = (a, over = {}) => ({ id: a.id, kind: a.kind, tag: a.tag, title: a.title, text: a.text, image_url: a.image, link_url: a.link, link_label: a.linkLabel, start_date: a.start_date, end_date: a.end_date, sort_order: a.sort_order, enabled: a.enabled, ...over });
  const save = p => K.request('/admin/ads', { method: 'POST', body: JSON.stringify(p) });
  const byKind = k => adsRows.filter(a => a.kind === k).sort((x, y) => x.sort_order - y.sort_order);

  const baseRender = staffRender;
  staffRender = function () {
    baseRender();
    if (K.user?.role !== 'admin') return;
    document.getElementById('staffNav').insertAdjacentHTML('beforeend', '<button class="kbutton ' + (staffTab === 'ads' ? 'active' : '') + '" onclick="staffGo(\'ads\')">โฆษณา</button>');
    if (staffTab === 'ads') loadAds();
  };

  async function loadAds() {
    const app = document.getElementById('staffApp'); if (!app) return;
    if (adsLoaded) draw(); else app.innerHTML = '<h2>โฆษณา</h2><p>กำลังโหลด...</p>';
    if (adsBusy) return; adsBusy = true;
    try { adsRows = await K.request('/admin/ads'); adsLoaded = true; if (staffTab === 'ads') draw(); }
    catch (e) { message(e.message); } finally { adsBusy = false; }
  }

  function card(a, i, n) {
    const [label, cls] = status(a);
    const dates = (a.start_date || a.end_date) ? (a.start_date || '…') + ' ถึง ' + (a.end_date || '…') : 'แสดงตลอด';
    return '<article class="ads-card"><div class="ads-thumb">' + (a.image ? '<img src="' + E(a.image) + '" alt="" loading="lazy">' : '🛍️') + '</div><div class="ads-body"><span class="ads-state ' + cls + '">' + E(label) + '</span><h3>' + E(a.title || '(ไม่มีหัวข้อ)') + '</h3>' + (a.tag ? '<p>ป้าย: ' + E(a.tag) + '</p>' : '') + (a.text ? '<p>' + E(a.text) + '</p>' : '') + '<p>' + E(dates) + '</p>' + (a.link ? '<p>ลิงก์: ' + E(a.link) + '</p>' : '') + '</div><div class="ads-actions"><button class="kbutton" onclick="adsEdit(\'' + a.id + '\')">แก้ไข</button><button class="kbutton" onclick="adsToggle(\'' + a.id + '\',this)">' + (a.enabled ? 'ปิด' : 'เปิด') + '</button><button class="kbutton" ' + (i === 0 ? 'disabled' : '') + ' onclick="adsMove(\'' + a.id + '\',-1,this)" aria-label="เลื่อนขึ้น">↑</button><button class="kbutton" ' + (i === n - 1 ? 'disabled' : '') + ' onclick="adsMove(\'' + a.id + '\',1,this)" aria-label="เลื่อนลง">↓</button><button class="kbutton" onclick="adsDelete(\'' + a.id + '\',this)">ลบ</button></div></article>';
  }
  function draw() {
    const app = document.getElementById('staffApp'); if (!app || staffTab !== 'ads') return;
    const sec = k => { const rows = byKind(k); return '<div class="ads-sec"><h3>' + KIND[k] + ' (' + rows.length + ')</h3><small>' + (k === 'poster' ? 'แสดงต่อจากกันตามลำดับ เลื่อนเองทุก 2 วินาที ใช้ปุ่ม ↑ ↓ เรียงลำดับ' : 'สุ่มแสดง 1 รายการต่อการเข้าใช้หนึ่งครั้ง ผู้ใช้กด "ไม่ต้องแสดงอีกวันนี้" ได้') + '</small></div><div class="ads-grid">' + (rows.map((a, i) => card(a, i, rows.length)).join('') || (k === 'poster' ? '<div><p class="muted">ยังไม่มีป้าย (หน้าแอพจะซ่อนแถบป้ายนี้ไว้)</p><button class="kbutton primary" onclick="adsImportSamples(this)">นำโปสเตอร์ตัวอย่าง (งิ้ว / สระหนองโก) มาแก้ไขได้</button></div>' : '<p class="muted">ยังไม่มีรายการ</p>')) + '</div>'; };
    app.innerHTML = '<div class="ads-head"><div><h2>จัดการโฆษณา</h2><p class="muted">เปลี่ยนแล้วหน้าเว็บของลูกค้าอัปเดตเอง ไม่ต้องแก้ไฟล์</p></div><button class="kbutton primary" onclick="adsEdit()">+ เพิ่มโฆษณา</button></div>' + sec('popup') + sec('poster');
  }

  window.adsToggle = async (id, btn) => { const a = adsRows.find(x => x.id === id); if (!a) return; btn.disabled = true; try { await save(payload(a, { enabled: !a.enabled })); await refresh(); } catch (e) { message(e.message); btn.disabled = false; } };
  window.adsDelete = async (id, btn) => { const a = adsRows.find(x => x.id === id); if (!a || !confirm('ลบโฆษณา "' + (a.title || 'ไม่มีหัวข้อ') + '" ?')) return; btn.disabled = true; try { await K.request('/admin/ads/' + id + '/delete', { method: 'POST', body: '{}' }); await refresh(); message('ลบโฆษณาแล้ว'); } catch (e) { message(e.message); btn.disabled = false; } };
  window.adsMove = async (id, dir, btn) => {
    const a = adsRows.find(x => x.id === id); if (!a) return;
    const g = byKind(a.kind), i = g.findIndex(x => x.id === id), j = i + dir; if (j < 0 || j >= g.length) return;
    btn.disabled = true; [g[i], g[j]] = [g[j], g[i]];
    try { for (let k = 0; k < g.length; k++) if (g[k].sort_order !== k * 10) await save(payload(g[k], { sort_order: k * 10 })); await refresh(); }
    catch (e) { message(e.message); btn.disabled = false; }
  };

  const SAMPLES = [
    { key: 'festival', tag: 'สีสันงานท้องถิ่น', title: 'งานงิ้วกระนวน', text: 'เสน่ห์ประเพณี ที่คนบ้านเฮาคิดฮอด' },
    { key: 'welcome', tag: 'มุมพักใจ ใกล้บ้าน', title: 'มาพักใจริมสระหนองโก', text: 'ชวนกันออกมาเจอเรื่องดี ๆ รอบตัว' }
  ];
  window.adsImportSamples = async btn => {
    btn.disabled = true; btn.textContent = 'กำลังนำเข้า...';
    try {
      let html = '';
      try { html = await (await fetch('/', { cache: 'no-store' })).text(); } catch (e) {}
      for (let i = 0; i < SAMPLES.length; i++) {
        const sm = SAMPLES[i]; let image = '';
        try {
          const m = html.match(new RegExp('"' + sm.key + '":"(data:image/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+)"'));
          if (m) { const blob = await (await fetch(m[1])).blob(); image = await resize(new File([blob], sm.key, { type: blob.type })); }
        } catch (e) { image = ''; }
        await save({ kind: 'poster', tag: sm.tag, title: sm.title, text: sm.text, image_url: image, link_url: '', link_label: '', start_date: '', end_date: '', sort_order: i * 10, enabled: true });
      }
      await refresh(); message('นำเข้าโปสเตอร์ตัวอย่างแล้ว แก้ไขหรือลบได้เลย');
    } catch (e) { message(e.message); btn.disabled = false; btn.textContent = 'ลองอีกครั้ง'; }
  };

  async function refresh() { adsRows = await K.request('/admin/ads'); draw(); }

  function resize(file) {
    return new Promise((resolve, reject) => {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(Error('รองรับเฉพาะรูป JPEG, PNG, WebP'));
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        for (const [maxW, q] of [[1200, .82], [1000, .72], [800, .65], [640, .6]]) {
          const s = Math.min(1, maxW / img.width), c = document.createElement('canvas');
          c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
          const out = c.toDataURL('image/jpeg', q); if (out.length <= 600000) return resolve(out);
        }
        reject(Error('รูปใหญ่เกินไป ลองใช้รูปที่เล็กลง'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(Error('เปิดรูปไม่ได้')); };
      img.src = url;
    });
  }

  window.adsEdit = id => {
    const a = id ? adsRows.find(x => x.id === id) : null;
    const v = a || { kind: 'poster', enabled: true, tag: '', title: '', text: '', image: '', link: '', linkLabel: '', start_date: '', end_date: '', sort_order: byKind('poster').length * 10 };
    draftImage = v.image || '';
    let d = document.getElementById('adDialog');
    if (!d) { d = document.createElement('dialog'); d.id = 'adDialog'; d.className = 'kdialog'; document.body.appendChild(d); }
    const isUploaded = draftImage.startsWith('/api/ads/');
    d.innerHTML = '<form id="adForm"><h2>' + (a ? 'แก้ไขโฆษณา' : 'เพิ่มโฆษณา') + '</h2>' +
      '<label>ประเภท<select name="kind"><option value="poster">' + KIND.poster + '</option><option value="popup">' + KIND.popup + '</option></select></label>' +
      '<label>ป้ายเล็กด้านบน (ไม่บังคับ)<input name="tag" maxlength="30" value="' + E(v.tag) + '" placeholder="เช่น โปรโมชั่น"></label>' +
      '<label>หัวข้อ<input name="title" maxlength="100" value="' + E(v.title) + '"></label>' +
      '<label>ข้อความ<textarea name="text" rows="3" maxlength="300">' + E(v.text) + '</textarea></label>' +
      '<label>รูปโฆษณา</label><div class="ads-form-preview" id="adPreview"></div>' +
      '<div class="krow" style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0"><label class="kbutton" style="margin:0">เลือกรูปจากเครื่อง<input id="adFile" type="file" accept="image/jpeg,image/png,image/webp" hidden></label><button type="button" class="kbutton" id="adClearImg">ลบรูป</button></div>' +
      '<label>หรือใส่ลิงก์รูป (https)<input id="adImgUrl" placeholder="https://..." value="' + (draftImage && !isUploaded ? E(draftImage) : '') + '"></label>' +
      (isUploaded ? '<p class="muted" id="adKeepNote">ใช้รูปที่อัปโหลดไว้เดิม (เลือกรูปใหม่เพื่อเปลี่ยน)</p>' : '') +
      '<label>ลิงก์เมื่อกดปุ่ม (ไม่บังคับ ขึ้นต้น https://)<input name="link_url" maxlength="500" value="' + E(v.link) + '"></label>' +
      '<label>ข้อความบนปุ่ม<input name="link_label" maxlength="40" value="' + E(v.linkLabel) + '" placeholder="ดูรายละเอียด"></label>' +
      '<div class="ads-two"><label>วันเริ่มแสดง<input type="date" name="start_date" value="' + E(v.start_date) + '"></label><label>วันสิ้นสุด<input type="date" name="end_date" value="' + E(v.end_date) + '"></label></div>' +
      '<label><input type="checkbox" name="enabled" ' + (v.enabled ? 'checked' : '') + '> เปิดใช้งาน</label>' +
      '<p id="adDialogError" class="kerror" role="alert"></p><div class="krow" style="display:flex;gap:8px;justify-content:flex-end"><button type="button" class="kbutton" id="adCancel">ยกเลิก</button><button class="kbutton primary" type="submit">บันทึก</button></div></form>';
    const f = d.querySelector('form'), err = d.querySelector('#adDialogError');
    f.kind.value = v.kind;
    const paint = () => { const p = d.querySelector('#adPreview'); p.innerHTML = draftImage ? '<img alt="" src="' + E(draftImage) + '">' : 'ยังไม่มีรูป (จะใช้พื้นสีส้มแทน)'; };
    paint();
    d.querySelector('#adFile').onchange = async e => { const file = e.target.files[0]; if (!file) return; err.textContent = ''; try { draftImage = await resize(file); d.querySelector('#adImgUrl').value = ''; d.querySelector('#adKeepNote')?.remove(); paint(); } catch (x) { err.textContent = x.message; } e.target.value = ''; };
    d.querySelector('#adImgUrl').oninput = e => { const t = e.target.value.trim(); if (t) { draftImage = t; d.querySelector('#adKeepNote')?.remove(); paint(); } };
    d.querySelector('#adClearImg').onclick = () => { draftImage = ''; d.querySelector('#adImgUrl').value = ''; d.querySelector('#adKeepNote')?.remove(); paint(); };
    d.querySelector('#adCancel').onclick = () => d.close();
    f.onsubmit = async e => {
      e.preventDefault(); const b = e.submitter; b.disabled = true; err.textContent = '';
      const fd = new FormData(f);
      try {
        await save({ id: a?.id, kind: fd.get('kind'), tag: fd.get('tag'), title: fd.get('title'), text: fd.get('text'), image_url: draftImage, link_url: fd.get('link_url'), link_label: fd.get('link_label'), start_date: fd.get('start_date') || '', end_date: fd.get('end_date') || '', sort_order: a ? (a.kind === fd.get('kind') ? a.sort_order : byKind(fd.get('kind')).length * 10) : byKind(fd.get('kind')).length * 10, enabled: f.enabled.checked });
        d.close(); await refresh(); message('บันทึกโฆษณาแล้ว');
      } catch (x) { err.textContent = x.message; b.disabled = false; }
    };
    d.showModal();
  };

  if (K.user?.role === 'admin') staffRender();
})();
