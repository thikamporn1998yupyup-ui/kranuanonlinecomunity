/* home-upgrade.js — แสดงโฆษณาจากแท็บ "โฆษณา" ในหน้าแอดมิน บนหน้าลูกค้า
 * - ป๊อบอัพ: สุ่มแสดง 1 รายการต่อการเข้าใช้ มีปุ่ม "ไม่ต้องแสดงอีกวันนี้"
 * - ป้ายหน้าหลัก: แทนที่โปสเตอร์ตัวอย่าง เลื่อนอัตโนมัติทุก 2 วินาที
 * ข้อมูลมาจาก /api/ads (เปลี่ยนในแอดมินแล้วอัปเดตเอง ไม่ต้องแก้ไฟล์) */
(function () {
  'use strict';
  var HIDE_KEY = 'kranuan_ad_hide_date';
  var ads = null, loadedAt = 0, loading = null, adsOk = false;

  function todayTH() { return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }); }
  function safeUrl(u) { return /^(https?:\/\/|\/)/i.test(u || '') ? u : ''; }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function openLink(url) { var w = window.open(url, '_blank', 'noopener'); if (w) w.opener = null; }


  /* ---------- สไตล์: ภาพเต็ม + เงาดำไล่จากล่างขึ้นบน ---------- */
  (function () {
    if (document.getElementById('liveAdCss')) return;
    var st = document.createElement('style'); st.id = 'liveAdCss';
    st.textContent =
      '.local-poster.live-ad{height:auto;aspect-ratio:16/9;padding:0;align-items:flex-end;background:#2b211b}' +
      '.local-poster.live-ad.noimg{background:linear-gradient(145deg,#c2452b,#8f2a1a)}' +
      '.local-poster.live-ad:before{background:linear-gradient(to top,rgba(0,0,0,.88) 0%,rgba(0,0,0,.6) 38%,rgba(0,0,0,.18) 68%,rgba(0,0,0,0) 100%)}' +
      '.local-poster.live-ad .poster-copy{width:100%;box-sizing:border-box;padding:0 16px 14px}' +
      '.local-poster.live-ad h3{font-size:20px;line-height:1.3;margin:6px 0 3px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-shadow:0 1px 4px #0008}' +
      '.local-poster.live-ad p{font-size:12px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-shadow:0 1px 3px #0008}' +
      '.local-poster.live-ad .poster-action{margin-top:8px}' +
      '.poster-dialog .live-pop-img{position:relative;background:#2b211b}' +
      '.poster-dialog .live-pop-img img{aspect-ratio:auto;width:100%;height:auto;max-height:68dvh;object-fit:cover;display:block}' +
      '.live-pop-cap{position:absolute;left:0;right:0;bottom:0;box-sizing:border-box;padding:56px 18px 16px;color:#fff;background:linear-gradient(to top,rgba(0,0,0,.9) 0%,rgba(0,0,0,.65) 50%,rgba(0,0,0,0) 100%)}' +
      '.live-pop-cap h2{color:#fff5d4;font-size:21px;line-height:1.3;margin:8px 0 4px;text-shadow:0 1px 4px #0008}' +
      '.live-pop-cap p{color:#ffedda;font-size:13px;line-height:1.5;margin:0;text-shadow:0 1px 3px #0008}' +
      '.live-pop-cap .badge{background:#fff0ce;color:#7a351d}';
    document.head.appendChild(st);
  })();

  function loadAds() {
    if (ads && Date.now() - loadedAt < 60000) return Promise.resolve(ads);
    if (loading) return loading;
    loading = fetch('/api/ads', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : { ads: [] }; })
      .then(function (d) { ads = Array.isArray(d.ads) ? d.ads : []; adsOk = true; loadedAt = Date.now(); return ads; })
      .catch(function () { return ads || []; })
      .then(function (v) { loading = null; return v; });
    return loading;
  }
  function byKind(list, k) { return list.filter(function (a) { return a.kind === k; }); }

  /* ---------- ป๊อบอัพ ---------- */
  var popupShown = false;
  function showPopup(list) {
    if (popupShown) return;
    var pops = byKind(list, 'popup');
    if (!pops.length) return;
    try { if (localStorage.getItem(HIDE_KEY) === todayTH()) return; } catch (e) {}
    popupShown = true;
    var a = pops[Math.floor(Math.random() * pops.length)];
    var d = document.getElementById('liveAdDialog');
    if (d) d.remove();
    d = el('dialog', 'poster-dialog'); d.id = 'liveAdDialog';
    var close = el('button', 'poster-close', '×'); close.setAttribute('aria-label', 'ปิด');
    close.onclick = function () { d.close(); };
    d.appendChild(close);
    var img = safeUrl(a.image);
    var body = el('div', 'poster-dialog-body');
    if (img) {
      var wrap = el('div', 'live-pop-img');
      var im = el('img'); im.src = img; im.alt = a.title || 'โฆษณา'; wrap.appendChild(im);
      if (a.tag || a.title || a.text) {
        var cap = el('div', 'live-pop-cap');
        if (a.tag) cap.appendChild(el('span', 'badge', a.tag));
        if (a.title) cap.appendChild(el('h2', '', a.title));
        if (a.text) cap.appendChild(el('p', '', a.text));
        wrap.appendChild(cap);
      }
      d.appendChild(wrap);
    } else {
      if (a.tag) body.appendChild(el('span', 'badge', a.tag));
      if (a.title) body.appendChild(el('h2', '', a.title));
      if (a.text) body.appendChild(el('p', '', a.text));
    }
    var link = safeUrl(a.link);
    if (link) {
      var go = el('button', 'primary', a.linkLabel || 'ดูรายละเอียด');
      go.onclick = function () { openLink(link); };
      body.appendChild(go);
    }
    var hide = el('button', '', 'ไม่ต้องแสดงอีกวันนี้');
    hide.style.cssText = 'width:100%;margin-top:8px;padding:10px;border:0;background:transparent;color:#85735f;font-size:12px;cursor:pointer';
    hide.onclick = function () { try { localStorage.setItem(HIDE_KEY, todayTH()); } catch (e) {} d.close(); };
    body.appendChild(hide);
    d.appendChild(body);
    d.addEventListener('close', function () { d.remove(); });
    document.body.appendChild(d);
    try { d.showModal(); } catch (e) {}
  }

  /* ---------- ป้ายหน้าหลัก ---------- */
  function posterCount(rail) { return rail ? rail.children.length : 0; }
  function posterWidth(rail) { return rail.firstElementChild.getBoundingClientRect().width + 12; }
  window.currentPosterIndex = function () {
    var r = document.getElementById('posterRail');
    return r && r.firstElementChild ? Math.round(r.scrollLeft / posterWidth(r)) : 0;
  };
  window.scrollPosterTo = function (n) {
    var r = document.getElementById('posterRail');
    if (!r || !r.firstElementChild) return;
    var max = posterCount(r) - 1;
    r.scrollTo({ left: Math.max(0, Math.min(max, n)) * posterWidth(r), behavior: 'smooth' });
  };
  window.scrollPoster = function (dir) { window.scrollPosterTo(window.currentPosterIndex() + dir); };

  function buildRail(rail, posters) {
    rail.textContent = '';
    posters.forEach(function (a, i) {
      var img = safeUrl(a.image);
      var art = el('article', 'local-poster live-ad' + (img ? '' : ' noimg'));
      if (img) { var im = el('img'); im.src = img; im.alt = a.title || 'โฆษณา'; im.loading = 'lazy'; art.appendChild(im); }
      var copy = el('div', 'poster-copy');
      if (a.tag) copy.appendChild(el('span', 'poster-tag', a.tag));
      if (a.title) copy.appendChild(el('h3', '', a.title));
      if (a.text) copy.appendChild(el('p', '', a.text));
      var link = safeUrl(a.link);
      if (link) {
        var b = el('button', 'poster-action', a.linkLabel || 'ดูรายละเอียด');
        b.onclick = function () { openLink(link); };
        copy.appendChild(b);
      }
      art.appendChild(copy);
      rail.appendChild(art);
    });
    var controls = rail.nextElementSibling;
    var dots = controls && controls.querySelector('.poster-dots');
    if (dots) {
      dots.textContent = '';
      posters.forEach(function (a, i) {
        var d = el('button', 'poster-dot');
        d.setAttribute('data-poster-dot', String(i));
        d.setAttribute('aria-label', 'ป้ายที่ ' + (i + 1));
        d.setAttribute('aria-current', i === 0 ? 'true' : 'false');
        d.onclick = function () { window.scrollPosterTo(i); };
        dots.appendChild(d);
      });
    }
    if (controls) controls.style.display = posters.length > 1 ? '' : 'none';
  }

  function applyPosters() {
    var rail = document.getElementById('posterRail');
    if (!rail || rail.dataset.live === '1') return;
    loadAds().then(function (list) {
      var r = document.getElementById('posterRail');
      if (!r || r.dataset.live === '1') return;
      var posters = byKind(list, 'poster');
      if (!posters.length) {
        /* ไม่มีป้ายในแอดมิน = ซ่อนทั้งแถบ (ถ้าโหลดข้อมูลสำเร็จ) ให้แอดมินคุมได้ทั้งหมด */
        if (adsOk) {
          r.dataset.live = '1';
          r.style.display = 'none';
          if (r.previousElementSibling) r.previousElementSibling.style.display = 'none';
          if (r.nextElementSibling) r.nextElementSibling.style.display = 'none';
        }
        return;
      }
      r.dataset.live = '1';
      buildRail(r, posters);
    });
  }

  /* เลื่อนอัตโนมัติทุก 2 วินาที (หยุดชั่วคราวเมื่อผู้ใช้แตะ/เลื่อนเอง) */
  var pausedUntil = 0;
  ['pointerdown', 'touchstart', 'wheel'].forEach(function (ev) {
    document.addEventListener(ev, function (e) {
      if (e.target && e.target.closest && e.target.closest('#posterRail')) pausedUntil = Date.now() + 6000;
    }, { passive: true });
  });
  setInterval(function () {
    var r = document.getElementById('posterRail');
    if (!r || r.dataset.live !== '1' || document.hidden || Date.now() < pausedUntil) return;
    var n = posterCount(r);
    if (n < 2) return;
    var next = window.currentPosterIndex() + 1;
    window.scrollPosterTo(next >= n ? 0 : next);
  }, 2000);

  /* ---------- เริ่มทำงาน ---------- */
  function start() {
    var app = document.getElementById('app');
    if (app) new MutationObserver(applyPosters).observe(app, { childList: true, subtree: true });
    applyPosters();
    loadAds().then(function (list) { setTimeout(function () { showPopup(list); }, 1200); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();


/* ===== ปุ่มสุ่มกินไรดี ห้อยอยู่หน้า "อาหาร" กดแล้วเด้งป๊อบอัพ ===== */
(function () {
  'use strict';
  var MENUS=[
    {n:'ข้าวกะเพราไก่ไข่ดาว',i:'rice',c:'จานเดียว',j:'ตัดสินใจไม่ได้ก็กะเพรา ถูกที่สุดในบรรดาคำตอบ',t:'ขอเพิ่มผักหรือถั่วฝักยาว และเปลี่ยนไข่ดาวเป็นไข่ต้มเพื่อลดน้ำมัน'},
    {n:'ส้มตำปูปลาร้า + ไก่ย่าง',i:'salad',c:'อีสาน / ปิ้งย่าง',j:'บอกว่าเผ็ดน้อย แต่น้ำตาไหลเป็นสายก็ยังไม่ยอมแพ้',t:'ส้มตำเค็มจัด ชิมก่อนเติมน้ำปลา และดื่มน้ำตามให้พอ'},
    {n:'ก๋วยเตี๋ยวเรือ',i:'noodle',c:'เส้น',j:'ชามเล็กน่ารัก แต่คนกินน่ากลัว สั่งทีละยี่สิบ',t:'ซดน้ำซุปพอประมาณเพราะโซเดียมสูง และเติมผักบุ้งช่วยได้'},
    {n:'หมูกระทะ',i:'grill',c:'อีสาน / ปิ้งย่าง',j:'เข้าไปด้วยความหิว ออกมาด้วยกลิ่นควัน แต่ไม่เคยเสียใจ',t:'กินผักรองท้องก่อน ย่างเนื้อให้สุกทั่วและอย่าให้ไหม้ดำ'},
    {n:'ข้าวมันไก่',i:'drumstick',c:'จานเดียว',j:'ใครว่าไม่กินมันไก่ ก็แอบซดน้ำซุปหมดถ้วยทุกราย',t:'เลือกไก่ต้มแทนไก่ทอด และตักข้าวให้พอดีกับความหิว'},
    {n:'ลาบหมู + ข้าวเหนียว',i:'salad',c:'อีสาน / ปิ้งย่าง',j:'สั่งข้าวเหนียวพอดี กินลาบหมดก่อน สั่งเพิ่มอีกตะกร้า',t:'กินผักสดแกล้มเยอะๆ และเลือกลาบแบบสุก'},
    {n:'ผัดไทยกุ้งสด',i:'noodle',c:'เส้น',j:'กุ้งตัวใหญ่ เส้นตัวเล็ก ความอร่อยตัวใหญ่กว่าทุกอย่าง',t:'บีบมะนาวและเพิ่มถั่วงอก ลดน้ำตาลที่เติมเองลงได้'},
    {n:'ข้าวผัดหมู',i:'rice',c:'จานเดียว',j:'ข้าวผัดจานเดียวแก้ได้ทุกเรื่อง ยกเว้นยอดเงินเดือน',t:'ขอผักเพิ่มและไข่เจียวแทนไข่ทอดมันๆ จะอิ่มนานขึ้น'},
    {n:'สุกี้น้ำ',i:'pot',c:'เบาๆ',j:'ผักเต็มชาม แต่ยังหาข้ออ้างสั่งเพิ่มวุ้นเส้นได้อีก',t:'เน้นผักกับเต้าหู้ และลดน้ำจิ้มสุกี้ที่หวานและเค็ม'},
    {n:'ไก่ทอด + ข้าวเหนียว',i:'drumstick',c:'อีสาน / ปิ้งย่าง',j:'บอกจะกินแค่ชิ้นเดียว ชิ้นที่สี่ยังเรียกว่าชิ้นแรก',t:'ซับน้ำมันด้วยกระดาษก่อนกิน และแกล้มผักสดสักถ้วย'},
    {n:'ต้มยำกุ้ง',i:'soup',c:'เบาๆ',j:'เปรี้ยว เผ็ด เค็ม ครบรสแบบที่ชีวิตยังไม่ครบ',t:'เลือกแบบน้ำใสแทนน้ำข้น จะได้ไขมันน้อยลง'},
    {n:'แกงเขียวหวานไก่',i:'curry',c:'จานเดียว',j:'ข้าวสองทัพพีกำลังดี ถ้าไม่นับทัพพีที่สามที่แอบตัก',t:'กะทิมีไขมันสูง ตักเนื้อกับผักมากกว่าน้ำแกง'},
    {n:'ข้าวขาหมู',i:'rice',c:'จานเดียว',j:'กินเสร็จแล้วง่วง แต่ง่วงอย่างมีความสุข',t:'แยกหนังที่มันมากออก และกินผักกาดดองตัดเลี่ยน'},
    {n:'ก๋วยจั๊บน้ำข้น',i:'noodle',c:'เส้น',j:'ม้วนไปม้วนมาเหมือนชีวิต แต่อย่างน้อยอันนี้อร่อย',t:'ซดน้ำซุปไม่หมดชามเพื่อลดโซเดียม และเพิ่มผักเคียง'},
    {n:'หมูปิ้ง + ข้าวเหนียว',i:'skewer',c:'อีสาน / ปิ้งย่าง',j:'ยี่สิบบาทห้าไม้ ตั้งใจซื้อห้า กินเสร็จไปซื้ออีกห้า',t:'เลือกเนื้อที่ไม่ติดมัน และอย่ากินส่วนที่ไหม้เกรียม'},
    {n:'ข้าวหน้าเป็ด',i:'rice',c:'จานเดียว',j:'เป็ดยังไม่รู้เลยว่ามื้อนี้ตัวเองเป็นพระเอก',t:'ขอน้ำราดน้อยๆ เพราะน้ำราดมักหวานและเค็ม'},
    {n:'แกงจืดเต้าหู้หมูสับ',i:'soup',c:'เบาๆ',j:'จืดแต่ไม่จืดชืด เหมือนเพื่อนที่เงียบๆ แต่พึ่งได้',t:'เมนูเบาท้อง ใส่ผักหลายอย่างเพิ่มได้ตามชอบ'},
    {n:'ยำรวมมิตร',i:'salad',c:'เบาๆ',j:'ยำแล้วต้องยำต่อ ใครเริ่มคนนั้นต้องรับผิดชอบความหิว',t:'ใช้น้ำยำไม่มากและเน้นผักสด ลดน้ำตาลได้'},
    {n:'ข้าวต้มปลา',i:'soup',c:'เบาๆ',j:'ร้อนๆ ซดๆ ลืมไปเลยว่าเมื่อคืนนอนกี่โมง',t:'ย่อยง่าย เหมาะกับวันที่ท้องไม่ค่อยดี ระวังก้างปลาด้วย'},
    {n:'ไข่เจียวหมูสับ + ข้าวสวย',i:'rice',c:'จานเดียว',j:'ไข่เจียวฟูๆ ไม่เคยทำให้ใครเสียใจ ยกเว้นตอนมันหมดจาน',t:'ใช้น้ำมันน้อยลงด้วยกระทะเคลือบ และกินคู่ผักสด'},
    {n:'บะหมี่เกี๊ยวหมูแดง',i:'noodle',c:'เส้น',j:'ชามเดียวมีครบ เส้น หมู เกี๊ยว ใครว่าโลกไม่ยุติธรรม',t:'แยกน้ำมันกระเทียมเจียวออกบ้างเพื่อลดไขมัน'},
    {n:'ข้าวเหนียวมะม่วง',i:'mango',c:'ของหวาน',j:'บอกว่ากินแค่สองคำ จานก็ว่างเปล่าก่อนจะรู้ตัว',t:'มีน้ำตาลและกะทิ แบ่งกินกับเพื่อนหรือกินครึ่งชุดก็พอ'},
    {n:'ชาไทยเย็น + ขนมปังปิ้ง',i:'drink',c:'ของหวาน',j:'มื้อเบาๆ ที่ใจกินไปเต็มจาน',t:'ขอหวานน้อย ไม่ใส่นมข้นหวาน และดื่มน้ำเปล่าสลับ'},
    {n:'แซนด์วิชไข่ + นมถั่วเหลือง',i:'sandwich',c:'เบาๆ',j:'สองแผ่นขนมปังพาชีวิตข้ามบ่ายนี้ไปได้สบายๆ',t:'เลือกขนมปังโฮลวีตถ้ามี และเติมผักกาดแก้วหรือมะเขือเทศ'}
  ];
  var ICONS={"plate": "<circle cx=\"60\" cy=\"62\" r=\"36\" fill=\"#fffaf0\"/><circle cx=\"60\" cy=\"62\" r=\"24\" fill=\"#f9d35b\" stroke-width=\"2.5\"/><path d=\"M8 22v20M14 22v20M20 22v20M8 42h12M14 42v54\" fill=\"none\"/><path d=\"M106 22c-9 6-9 26 0 30v44\" fill=\"#fffaf0\"/>", "rice": "<ellipse cx=\"60\" cy=\"88\" rx=\"50\" ry=\"14\" fill=\"#fffaf0\"/><ellipse cx=\"60\" cy=\"85\" rx=\"36\" ry=\"8\" fill=\"#f3e6c8\" stroke-width=\"2\"/><path d=\"M26 82c0-30 68-30 68 0-12 8-56 8-68 0z\" fill=\"#fff\"/><path d=\"M50 58c-10-3-18 5-13 12s16 8 22 3 5-14-9-15z\" fill=\"#fffaf0\"/><circle cx=\"50\" cy=\"65\" r=\"5\" fill=\"#f9b928\" stroke-width=\"2\"/><path d=\"M72 56c8-8 18-6 20 2-6 6-16 6-20-2z\" fill=\"#2f7d4f\"/><path d=\"M74 72c6 2 12 0 17-5\" fill=\"none\" stroke=\"#e95e30\" stroke-width=\"4\"/>", "curry": "<path d=\"M12 58h96c0 26-20 44-48 44S12 84 12 58z\" fill=\"#fffaf0\"/><ellipse cx=\"60\" cy=\"58\" rx=\"48\" ry=\"11\" fill=\"#8ccf6f\"/><circle cx=\"42\" cy=\"56\" r=\"6\" fill=\"#f3e6c8\" stroke-width=\"2.5\"/><circle cx=\"64\" cy=\"60\" r=\"5\" fill=\"#f3e6c8\" stroke-width=\"2.5\"/><circle cx=\"84\" cy=\"55\" r=\"4\" fill=\"#2f7d4f\" stroke-width=\"2.5\"/><path d=\"M50 62c6 3 12 2 16-1\" fill=\"none\" stroke=\"#e95e30\" stroke-width=\"3\"/><path d=\"M42 40c-5-6 5-9 0-16M62 40c-5-6 5-9 0-16M82 40c-5-6 5-9 0-16\" fill=\"none\"/>", "noodle": "<path d=\"M12 58h96c0 26-20 44-48 44S12 84 12 58z\" fill=\"#fffaf0\"/><ellipse cx=\"60\" cy=\"58\" rx=\"48\" ry=\"11\" fill=\"#f9d35b\"/><path d=\"M26 58c6-6 10 6 16 0s10 6 16 0 10 6 16 0 10 6 16 0\" fill=\"none\" stroke-width=\"2.5\"/><circle cx=\"82\" cy=\"52\" r=\"8\" fill=\"#fff\" stroke-width=\"2.5\"/><circle cx=\"82\" cy=\"52\" r=\"3\" fill=\"#f9b928\" stroke-width=\"2\"/><path d=\"M60 8 92 50M72 6 100 44\" fill=\"none\" stroke-width=\"4\"/>", "salad": "<path d=\"M14 62h92c0 24-18 38-46 38S14 86 14 62z\" fill=\"#fffaf0\"/><path d=\"M22 62c-2-16 12-24 22-18 6-12 24-12 28 0 12-6 26 4 26 18z\" fill=\"#8ccf6f\"/><circle cx=\"46\" cy=\"52\" r=\"7\" fill=\"#e95e30\"/><path d=\"M68 50c6-5 14-2 16 5\" fill=\"none\" stroke=\"#e95e30\" stroke-width=\"4\"/><path d=\"M88 66a12 12 0 0 0 12-10z\" fill=\"#d4e87c\" stroke-width=\"2.5\"/><path d=\"M30 40c-4-8 4-12 0-20M60 36c-4-8 4-12 0-20\" fill=\"none\"/>", "skewer": "<path d=\"M8 32H112M8 60H112M8 88H112\" fill=\"none\" stroke-width=\"4\"/><rect x=\"24\" y=\"20\" width=\"22\" height=\"24\" rx=\"8\" fill=\"#c8643a\"/><rect x=\"52\" y=\"20\" width=\"22\" height=\"24\" rx=\"8\" fill=\"#d98a3d\"/><rect x=\"80\" y=\"20\" width=\"22\" height=\"24\" rx=\"8\" fill=\"#c8643a\"/><rect x=\"24\" y=\"48\" width=\"22\" height=\"24\" rx=\"8\" fill=\"#d98a3d\"/><rect x=\"52\" y=\"48\" width=\"22\" height=\"24\" rx=\"8\" fill=\"#c8643a\"/><rect x=\"80\" y=\"48\" width=\"22\" height=\"24\" rx=\"8\" fill=\"#d98a3d\"/><rect x=\"24\" y=\"76\" width=\"22\" height=\"24\" rx=\"8\" fill=\"#c8643a\"/><rect x=\"52\" y=\"76\" width=\"22\" height=\"24\" rx=\"8\" fill=\"#d98a3d\"/><rect x=\"80\" y=\"76\" width=\"22\" height=\"24\" rx=\"8\" fill=\"#c8643a\"/>", "grill": "<path d=\"M30 100c-8-12 6-14 2-26 10 4 12 14 6 26zM58 102c-8-14 8-16 2-30 12 6 14 18 6 30zM86 100c-8-12 6-14 2-26 10 4 12 14 6 26z\" fill=\"#e95e30\"/><ellipse cx=\"60\" cy=\"58\" rx=\"50\" ry=\"26\" fill=\"#6b5b4d\"/><ellipse cx=\"60\" cy=\"54\" rx=\"40\" ry=\"19\" fill=\"#3a2f27\"/><rect x=\"30\" y=\"46\" width=\"28\" height=\"13\" rx=\"6\" fill=\"#e8806a\" transform=\"rotate(-14 44 52)\"/><rect x=\"58\" y=\"50\" width=\"28\" height=\"13\" rx=\"6\" fill=\"#d96b55\" transform=\"rotate(10 72 56)\"/><path d=\"M36 34c-4-6 4-8 0-14M62 32c-4-6 4-8 0-14M86 34c-4-6 4-8 0-14\" fill=\"none\"/>", "drumstick": "<path d=\"M56 64 30 90\" fill=\"none\" stroke-width=\"13\"/><path d=\"M56 64 30 90\" fill=\"none\" stroke=\"#fffaf0\" stroke-width=\"7\"/><circle cx=\"26\" cy=\"86\" r=\"7\" fill=\"#fffaf0\"/><circle cx=\"34\" cy=\"96\" r=\"7\" fill=\"#fffaf0\"/><ellipse cx=\"76\" cy=\"44\" rx=\"32\" ry=\"26\" transform=\"rotate(-35 76 44)\" fill=\"#d98a3d\"/><path d=\"M66 26c10-2 18 4 20 12\" fill=\"none\" stroke=\"#f3c47a\" stroke-width=\"3.5\"/><path d=\"M58 40c2 8 8 14 16 16\" fill=\"none\" stroke=\"#a85f1f\" stroke-width=\"2.5\"/>", "soup": "<path d=\"M12 58h96c0 26-20 44-48 44S12 84 12 58z\" fill=\"#fffaf0\"/><ellipse cx=\"60\" cy=\"58\" rx=\"48\" ry=\"11\" fill=\"#f08a3c\"/><circle cx=\"40\" cy=\"57\" r=\"5\" fill=\"#fffaf0\" stroke-width=\"2.5\"/><path d=\"M52 60c4-8 14-8 16 0-6 4-12 4-16 0z\" fill=\"#f3b6a0\" stroke-width=\"2.5\"/><path d=\"M76 56c6-6 12-4 12 2-6 3-10 2-12-2z\" fill=\"#2f7d4f\" stroke-width=\"2.5\"/><path d=\"M40 40c-5-6 5-9 0-16M60 40c-5-6 5-9 0-16M80 40c-5-6 5-9 0-16\" fill=\"none\"/>", "pot": "<path d=\"M14 62h92v8c0 20-14 32-46 32S14 90 14 70z\" fill=\"#c8643a\"/><rect x=\"8\" y=\"52\" width=\"104\" height=\"13\" rx=\"6.5\" fill=\"#fffaf0\"/><path d=\"M8 58H2M112 58h6\" fill=\"none\" stroke-width=\"6\"/><path d=\"M28 52c-4-12 6-18 12-12 2-9 16-9 18 0 8-6 20 2 16 14z\" fill=\"#8ccf6f\"/><circle cx=\"84\" cy=\"46\" r=\"7\" fill=\"#e95e30\"/><path d=\"M46 36c-4-6 4-8 0-14M72 34c-4-6 4-8 0-14\" fill=\"none\"/>", "mango": "<ellipse cx=\"60\" cy=\"90\" rx=\"50\" ry=\"14\" fill=\"#fffaf0\"/><ellipse cx=\"60\" cy=\"86\" rx=\"38\" ry=\"8\" fill=\"#f3e6c8\" stroke-width=\"2\"/><ellipse cx=\"40\" cy=\"72\" rx=\"26\" ry=\"15\" fill=\"#fff\"/><path d=\"M62 82c0-28 26-38 42-22-4 16-24 28-42 22z\" fill=\"#f9b928\"/><path d=\"M70 74c4-14 14-20 24-18M78 80c6-10 12-14 20-14\" fill=\"none\" stroke-width=\"2.5\"/><circle cx=\"32\" cy=\"66\" r=\"1.8\" fill=\"#2b1d14\"/><circle cx=\"44\" cy=\"62\" r=\"1.8\" fill=\"#2b1d14\"/><circle cx=\"48\" cy=\"74\" r=\"1.8\" fill=\"#2b1d14\"/>", "drink": "<path d=\"M70 8 62 70\" fill=\"none\" stroke-width=\"7\" stroke=\"#2b1d14\"/><path d=\"M70 8 62 70\" fill=\"none\" stroke-width=\"3.5\" stroke=\"#e95e30\"/><path d=\"M32 32h56l-7 70H39z\" fill=\"#fffaf0\"/><path d=\"M35 56h50l-4 42H39z\" fill=\"#e5873a\" stroke-width=\"0\"/><path d=\"M35 56h50\" fill=\"none\" stroke-width=\"2.5\"/><rect x=\"40\" y=\"52\" width=\"17\" height=\"17\" rx=\"3\" fill=\"#fff\" transform=\"rotate(12 48 60)\" stroke-width=\"2.5\"/><rect x=\"60\" y=\"66\" width=\"16\" height=\"16\" rx=\"3\" fill=\"#fff\" transform=\"rotate(-10 68 74)\" stroke-width=\"2.5\"/>", "sandwich": "<path d=\"M14 88h92l-5 12H19z\" fill=\"#f3d9a4\"/><path d=\"M12 78c8-6 14 6 22 0s14 6 22 0 14 6 22 0 14 6 22 0v10H12z\" fill=\"#8ccf6f\"/><rect x=\"16\" y=\"64\" width=\"88\" height=\"14\" rx=\"4\" fill=\"#f9d35b\"/><rect x=\"26\" y=\"58\" width=\"30\" height=\"8\" rx=\"3\" fill=\"#e95e30\"/><path d=\"M12 62c0-24 20-34 48-34s48 10 48 34z\" fill=\"#f3d9a4\"/><path d=\"M34 44c6-6 16-8 26-8\" fill=\"none\" stroke=\"#fff\" stroke-width=\"3\" opacity=\".7\"/>"};
  var TYPES=['ทั้งหมด','จานเดียว','เส้น','อีสาน / ปิ้งย่าง','เบาๆ','ของหวาน'];
  function art(k) { return '<svg viewBox="0 0 120 120" width="100%" height="100%" stroke="#2b1d14" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' + (ICONS[k] || ICONS.plate) + '</svg>'; }
  var STAR = function (c) { return '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path d="M12 2l2.6 6.6L21 10l-5 4.4L17.4 21 12 17.5 6.6 21 8 14.4 3 10l6.4-1.4z" fill="' + c + '" stroke="#2b1d14" stroke-width="1.6" stroke-linejoin="round"/></svg>'; };
  var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11Z"/></svg>';
  var XICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';

  if (!document.getElementById('eatPopCss')) {
    var st = document.createElement('style'); st.id = 'eatPopCss';
    st.textContent = `
#eatFab{position:fixed;right:12px;bottom:calc(104px + env(safe-area-inset-bottom));z-index:60;width:76px;height:112px;border:0;background:none;padding:0;cursor:pointer;transform-origin:50% 0;translate:0 0;rotate:0deg;animation:eatDrop .8s cubic-bezier(.3,1.5,.5,1) both,eatSwing 3.4s ease-in-out .8s infinite;-webkit-tap-highlight-color:transparent}
#eatFab .hook{position:absolute;left:50%;top:0;width:10px;height:10px;margin-left:-5px;border-radius:50%;background:#2b1d14}
#eatFab .cord{position:absolute;left:50%;top:5px;width:2.5px;height:30px;margin-left:-1.25px;background:#2b1d14}
#eatFab .badge{position:absolute;left:50%;top:32px;width:62px;height:62px;margin-left:-31px;border-radius:50%;background:#f9d35b;border:3px solid #2b1d14;box-shadow:0 5px 0 #2b1d1433;display:grid;place-items:center;padding:7px}
#eatFab .tag{position:absolute;left:50%;bottom:0;translate:-50% 0;white-space:nowrap;background:#e95e30;color:#fff;font:700 12px/1 "Sarabun","Noto Sans Thai",Tahoma,sans-serif;padding:5px 9px;border-radius:12px;border:2px solid #2b1d14}
#eatFab:active .badge{scale:.92}
#eatFab:focus-visible{outline:3px solid #1a73e8;outline-offset:3px;border-radius:20px}
@keyframes eatDrop{from{translate:0 -140px}to{translate:0 0}}
@keyframes eatSwing{0%,100%{rotate:6deg}50%{rotate:-6deg}}
dialog.eat-pop{border:0;padding:0;border-radius:30px;width:min(calc(100% - 28px),380px);max-height:92dvh;overflow:visible;background:#fffaf0;color:#332e29;font:16px/1.6 "Sarabun","Noto Sans Thai",Tahoma,sans-serif;box-shadow:0 24px 70px #0006}
dialog.eat-pop::backdrop{background:#241c17b3;backdrop-filter:blur(3px)}
dialog.eat-pop[open]{animation:eatIn .55s cubic-bezier(.2,1.5,.4,1)}
@keyframes eatIn{from{opacity:0;scale:.55;rotate:-5deg;translate:0 40px}to{opacity:1;scale:1;rotate:0deg;translate:0 0}}
.eat-x{position:absolute;right:10px;top:10px;z-index:3;width:34px;height:34px;border:2px solid #2b1d14;border-radius:50%;background:#fffaf0;color:#2b1d14;display:grid;place-items:center;cursor:pointer;padding:0}
.eat-top{position:relative;background:#f9d35b;border-radius:30px 30px 0 0;padding:26px 18px 18px;text-align:center;color:#2b1d14;overflow:hidden}
.eat-art{width:140px;height:140px;margin:0 auto;rotate:-4deg;filter:drop-shadow(0 5px 0 #2b1d1422)}
.eat-art.rolling{animation:eatRoll .32s ease-in-out infinite}
.eat-art.pop{animation:eatPop .5s cubic-bezier(.3,1.6,.5,1)}
@keyframes eatRoll{0%,100%{rotate:-12deg;translate:0 0}50%{rotate:10deg;translate:0 -9px}}
@keyframes eatPop{0%{scale:.5;rotate:-18deg}60%{scale:1.14;rotate:5deg}100%{scale:1;rotate:-4deg}}
.eat-name{margin:10px 0 0;font-size:28px;line-height:1.2;font-weight:800;letter-spacing:-.3px;overflow-wrap:anywhere}
.eat-spark{position:absolute;width:20px;height:20px;animation:eatTwinkle 2.2s ease-in-out infinite}
.eat-spark.a{left:16%;top:30px}.eat-spark.b{right:15%;top:56px;width:15px;height:15px;animation-delay:.7s}.eat-spark.c{left:10%;top:112px;width:13px;height:13px;animation-delay:1.3s}.eat-spark.d{right:11%;top:118px;animation-delay:.3s}
@keyframes eatTwinkle{0%,100%{scale:.5;opacity:.4}50%{scale:1.15;opacity:1}}
.eat-burst{position:absolute;left:50%;top:92px;width:18px;height:18px;margin:-9px;pointer-events:none;animation:eatBurst .85s ease-out forwards}
@keyframes eatBurst{from{translate:0 0;scale:.3;opacity:1}to{translate:var(--dx) var(--dy);scale:1.1;opacity:0}}
.eat-body{padding:14px 18px 20px}
.eat-chips{display:flex;gap:6px;overflow-x:auto;margin:0 -18px 12px;padding:2px 18px;scrollbar-width:none}
.eat-chips::-webkit-scrollbar{display:none}
.eat-chips button{flex:none;border:1.5px solid #2b1d14;background:transparent;color:inherit;border-radius:18px;padding:4px 12px;font:inherit;font-size:13px;cursor:pointer}
.eat-chips button[aria-pressed=true]{background:#2b1d14;color:#f9d35b}
.eat-joke{margin:0 0 12px;font-size:17px;line-height:1.5;font-weight:600;min-height:2.9em}
.eat-tip{display:flex;gap:10px;align-items:flex-start;background:#e6f4ea;color:#2a3a2f;border-radius:14px;padding:10px 12px;font-size:13.5px;line-height:1.5;margin-bottom:14px}
.eat-tip svg{flex:none;width:19px;height:19px;margin-top:2px;stroke:#2f7d4f;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.eat-tip b{color:#2f7d4f}
.eat-spin{display:block;width:100%;border:0;border-radius:16px;padding:14px;background:#e95e30;color:#fff;font:700 18px/1.2 "Sarabun","Noto Sans Thai",Tahoma,sans-serif;cursor:pointer;box-shadow:0 5px 0 #a73d1c}
.eat-spin:active{translate:0 3px;box-shadow:0 2px 0 #a73d1c}
.eat-spin:disabled{opacity:.75;cursor:wait}
.eat-x:focus-visible,.eat-spin:focus-visible,.eat-chips button:focus-visible{outline:3px solid #1a73e8;outline-offset:2px}
@media (prefers-color-scheme:dark){dialog.eat-pop{background:#241d17;color:#f3ebe0}.eat-chips button{border-color:#f3ebe0}.eat-chips button[aria-pressed=true]{background:#f9d35b;color:#2b1d14}.eat-tip{background:#243a2c;color:#e6f4ea}.eat-tip b{color:#8fd3a8}.eat-tip svg{stroke:#8fd3a8}}
@media (prefers-reduced-motion:reduce){#eatFab,dialog.eat-pop[open],.eat-art.rolling,.eat-art.pop,.eat-spark,.eat-burst{animation:none!important}}
`;
    document.head.appendChild(st);
  }

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var type = 'ทั้งหมด', last = null, timer = null, dlg = null;

  function pool() { return MENUS.filter(function (m) { return type === 'ทั้งหมด' || m.c === type; }); }
  function pick() { var p = pool(), m; do { m = p[Math.floor(Math.random() * p.length)]; } while (m === last && p.length > 1); return m; }
  function $(id) { return document.getElementById(id); }

  function build() {
    dlg = document.createElement('dialog'); dlg.className = 'eat-pop'; dlg.setAttribute('aria-labelledby', 'eatName');
    dlg.innerHTML =
      '<button class="eat-x" type="button" aria-label="ปิด">' + XICON + '</button>' +
      '<div class="eat-top">' +
        '<span class="eat-spark a">' + STAR('#fffaf0') + '</span><span class="eat-spark b">' + STAR('#e95e30') + '</span><span class="eat-spark c">' + STAR('#2f7d4f') + '</span><span class="eat-spark d">' + STAR('#fffaf0') + '</span>' +
        '<div class="eat-art" id="eatArt"></div><h2 class="eat-name" id="eatName">หิวแล้วใช่ไหม</h2>' +
      '</div>' +
      '<div class="eat-body"><div class="eat-chips" id="eatChips" role="group" aria-label="ประเภทอาหาร"></div>' +
        '<p class="eat-joke" id="eatJoke" aria-live="polite">กดปุ่มสุ่ม เดี๋ยวบ้านเฮาเลือกให้</p>' +
        '<div class="eat-tip" id="eatTip" hidden>' + HEART + '<span id="eatTipText"></span></div>' +
        '<button class="eat-spin" id="eatSpin" type="button">สุ่มเมนู</button></div>';
    document.body.appendChild(dlg);
    $('eatArt').innerHTML = art('plate');
    var chips = $('eatChips');
    TYPES.forEach(function (t) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.setAttribute('aria-pressed', String(t === type));
      b.onclick = function () { type = t; [].forEach.call(chips.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); }); };
      chips.appendChild(b);
    });
    dlg.querySelector('.eat-x').onclick = function () { dlg.close(); };
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () { clearInterval(timer); var s = $('eatSpin'); if (s) { s.disabled = false; } $('eatArt').classList.remove('rolling'); });
    $('eatSpin').onclick = spin;
  }

  function burst() {
    if (reduce) return;
    var top = dlg.querySelector('.eat-top'), cols = ['#fffaf0', '#e95e30', '#2f7d4f', '#fffaf0', '#e95e30', '#2f7d4f', '#fffaf0', '#e95e30'];
    for (var i = 0; i < 8; i++) {
      var a = i / 8 * Math.PI * 2, s = document.createElement('span');
      s.className = 'eat-burst'; s.style.setProperty('--dx', Math.round(Math.cos(a) * 95) + 'px'); s.style.setProperty('--dy', Math.round(Math.sin(a) * 70) + 'px');
      s.innerHTML = STAR(cols[i]); top.appendChild(s);
      setTimeout(function (n) { return function () { n.remove(); }; }(s), 900);
    }
  }
  function settle(m) {
    last = m; var artEl = $('eatArt');
    artEl.innerHTML = art(m.i); $('eatName').textContent = m.n; $('eatJoke').textContent = m.j;
    var tt = $('eatTipText'); tt.textContent = ''; var b = document.createElement('b'); b.textContent = 'เพื่อสุขภาพ: '; tt.appendChild(b); tt.appendChild(document.createTextNode(m.t));
    $('eatTip').hidden = false;
    artEl.classList.remove('rolling', 'pop'); void artEl.offsetWidth; artEl.classList.add('pop');
    burst();
    var s = $('eatSpin'); s.disabled = false; s.textContent = 'สุ่มใหม่';
  }
  function spin() {
    var target = pick(), s = $('eatSpin'), artEl = $('eatArt');
    if (reduce) { settle(target); return; }
    s.disabled = true; $('eatTip').hidden = true; $('eatJoke').textContent = '...';
    artEl.classList.remove('pop'); artEl.classList.add('rolling');
    var p = pool(), n = 0; clearInterval(timer);
    timer = setInterval(function () {
      n++;
      if (n >= 12) { clearInterval(timer); settle(target); return; }
      var r = p[Math.floor(Math.random() * p.length)]; artEl.innerHTML = art(r.i); $('eatName').textContent = r.n;
    }, 85);
  }
  function openPop() { if (!dlg) build(); if (!dlg.open) dlg.showModal(); }

  function wantFab() { try { return view === 'ร้านค้า' && category === 'อาหาร'; } catch (e) { return false; } }
  function syncFab() {
    var f = $('eatFab'), want = wantFab();
    if (want && !f) {
      f = document.createElement('button'); f.id = 'eatFab'; f.type = 'button'; f.setAttribute('aria-label', 'สุ่มเมนูอาหาร กินไรดีวันนี้');
      f.innerHTML = '<span class="hook"></span><span class="cord"></span><span class="badge">' + art('noodle') + '</span><span class="tag">กินไรดี?</span>';
      f.onclick = openPop; document.body.appendChild(f);
    } else if (!want && f) { f.remove(); }
  }
  function startFab() {
    var app = document.getElementById('app');
    if (app) new MutationObserver(syncFab).observe(app, { childList: true });
    syncFab();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startFab); else startFab();
})();
