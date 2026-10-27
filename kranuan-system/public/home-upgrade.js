/* home-upgrade.js — แสดงโฆษณาจากแท็บ "โฆษณา" ในหน้าแอดมิน บนหน้าลูกค้า
 * - ป๊อบอัพ: สุ่มแสดง 1 รายการต่อการเข้าใช้ มีปุ่ม "ไม่ต้องแสดงอีกวันนี้"
 * - ป้ายหน้าหลัก: แทนที่โปสเตอร์ตัวอย่าง เลื่อนอัตโนมัติทุก 2 วินาที
 * ข้อมูลมาจาก /api/ads (เปลี่ยนในแอดมินแล้วอัปเดตเอง ไม่ต้องแก้ไฟล์) */
(function () {
  'use strict';
  var HIDE_KEY = 'kranuan_ad_hide_date';
  var ads = null, loadedAt = 0, loading = null;

  function todayTH() { return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }); }
  function safeUrl(u) { return /^(https?:\/\/|\/)/i.test(u || '') ? u : ''; }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function openLink(url) { var w = window.open(url, '_blank', 'noopener'); if (w) w.opener = null; }

  function loadAds() {
    if (ads && Date.now() - loadedAt < 60000) return Promise.resolve(ads);
    if (loading) return loading;
    loading = fetch('/api/ads', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : { ads: [] }; })
      .then(function (d) { ads = Array.isArray(d.ads) ? d.ads : []; loadedAt = Date.now(); return ads; })
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
    if (img) { var im = el('img'); im.src = img; im.alt = a.title || 'โฆษณา'; d.appendChild(im); }
    var body = el('div', 'poster-dialog-body');
    if (a.tag) body.appendChild(el('span', 'badge', a.tag));
    if (a.title) body.appendChild(el('h2', '', a.title));
    if (a.text) body.appendChild(el('p', '', a.text));
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
      var art = el('article', 'local-poster' + (i % 2 ? ' pond' : ''));
      var img = safeUrl(a.image);
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
      if (!posters.length) return; /* ไม่มีป้ายในแอดมิน = คงโปสเตอร์ตัวอย่างเดิมไว้ */
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
