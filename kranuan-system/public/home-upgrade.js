/* home-upgrade.js
 * 1) ฟองเลือกเมนูแถบล่างเลื่อนสมูท   2) ป้ายโฆษณาเลื่อนเองทุก 2 วินาที
 * 3) ป๊อบอัพโฆษณาหน้าหลัก (ไม่แสดงอีกวันนี้)   4) สุ่ม "วันนี้กินอะไรดี" ในหน้าอาหาร
 * โหลดหลังไฟล์อื่นทั้งหมด เพราะต้อง wrap topNav() และ render() ตัวสุดท้าย
 */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const safe = (store) => ({
    get(k) { try { return store.getItem(k); } catch { return null; } },
    set(k, v) { try { store.setItem(k, v); } catch {} }
  });
  const local = safe(window.localStorage), session = safe(window.sessionStorage);
  const todayTH = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
  const rand = n => Math.floor(Math.random() * n);

  /* ───────── 1) ฟองเมนูล่าง ───────── */
  let navPrev = -1, navHidden = false;
  function upgradeNav() {
    const nav = $('nav'); if (!nav) return;
    const btns = [...nav.querySelectorAll(':scope > button')]; if (!btns.length) return;
    const idx = btns.findIndex(b => b.classList.contains('active'));
    nav.style.setProperty('--n', btns.length);
    nav.querySelector('.nav-bubble')?.remove();
    const bubble = document.createElement('span');
    bubble.className = 'nav-bubble'; bubble.setAttribute('aria-hidden', 'true');
    if (idx < 0) { // อยู่หน้าที่ไม่มีในแถบเมนู (เช่น ตลาด) → ซ่อนฟอง
      bubble.style.opacity = '0'; bubble.style.setProperty('--i', Math.max(navPrev, 0));
      nav.prepend(bubble); navHidden = true; return;
    }
    const from = navPrev < 0 ? idx : navPrev;
    bubble.style.setProperty('--i', from);
    if (navHidden) bubble.style.opacity = '0';
    nav.prepend(bubble);
    if (from !== idx || navHidden) {
      void bubble.offsetWidth; // บังคับ reflow ให้เริ่มจากตำแหน่งเดิมก่อน แล้วค่อยเลื่อน
      requestAnimationFrame(() => { bubble.style.setProperty('--i', idx); bubble.style.opacity = ''; });
    }
    navPrev = idx; navHidden = false;
  }

  /* ───────── 2) ป้ายโฆษณาเลื่อนเองทุก 2 วินาที ───────── */
  let posterPausedUntil = 0;
  const pause = e => { if (e.target.closest && e.target.closest('#posterRail')) posterPausedUntil = Date.now() + 5000; };
  ['pointerdown', 'touchstart', 'wheel', 'mouseover', 'focusin'].forEach(t =>
    document.addEventListener(t, pause, { capture: true, passive: true }));
  function posterTick() {
    if (document.hidden || Date.now() < posterPausedUntil) return;
    const rail = $('posterRail'); if (!rail) return;
    if ($('communityPosterDialog')?.open || document.querySelector('dialog.ad-popup[open]')) return;
    const slides = [...rail.querySelectorAll('.local-poster')]; if (slides.length < 2) return;
    const r = rail.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    const base = slides[0].offsetLeft;
    let cur = 0, best = Infinity;
    slides.forEach((s, i) => { const d = Math.abs(rail.scrollLeft - (s.offsetLeft - base)); if (d < best) { best = d; cur = i; } });
    const next = (cur + 1) % slides.length;
    rail.scrollTo({ left: slides[next].offsetLeft - base, behavior: reduceMotion() ? 'auto' : 'smooth' });
  }
  setInterval(posterTick, 2000);

  /* ───────── 3) ป๊อบอัพโฆษณา ───────── */
  const HIDE_KEY = 'kranuan_ad_hide_day', SHOWN_KEY = 'kranuan_ad_shown';
  const adActive = a => {
    if (!a || a.enabled === false || !(a.title || a.image)) return false;
    const t = todayTH();
    return !(a.startDate && t < a.startDate) && !(a.endDate && t > a.endDate);
  };
  function openAd(a) {
    const d = document.createElement('dialog');
    d.className = 'ad-popup'; d.setAttribute('aria-label', a.title || 'โฆษณา');
    const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const media = mk('div', 'ad-media');
    const art = () => { media.replaceChildren(mk('div', 'ad-art', '🛍️'), x); };
    const x = mk('button', 'ad-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'ปิดโฆษณา');
    if (a.image) {
      const img = new Image(); img.alt = a.title || ''; img.decoding = 'async'; img.src = a.image;
      img.onerror = art; media.append(img, x);
    } else { art(); }
    const body = mk('div', 'ad-body');
    if (a.tag) body.append(mk('span', 'ad-tag', a.tag));
    if (a.title) body.append(mk('h3', '', a.title));
    if (a.text) body.append(mk('p', '', a.text));
    if (/^https?:\/\//i.test(a.link || '')) {
      const cta = mk('a', 'ad-cta', a.linkLabel || 'ดูรายละเอียด');
      cta.href = a.link; cta.target = '_blank'; cta.rel = 'noopener noreferrer'; body.append(cta);
    }
    const row = mk('div', 'ad-row');
    const close = mk('button', '', 'ปิด'); close.type = 'button';
    const hide = mk('button', 'ad-hide', 'ไม่ต้องแสดงอีกวันนี้'); hide.type = 'button';
    row.append(close, hide); body.append(row);
    d.append(media, body); document.body.append(d);
    x.onclick = close.onclick = () => d.close();
    hide.onclick = () => { local.set(HIDE_KEY, todayTH()); d.close(); };
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
    d.addEventListener('close', () => d.remove());
    d.showModal();
  }
  function showAd(tries = 0) {
    if (local.get(HIDE_KEY) === todayTH() || session.get(SHOWN_KEY)) return;
    const list = ((window.KRANUAN_ADS || {}).popups || []).filter(adActive);
    if (!list.length) return;
    const auth = $('lineAuthModal');
    const busy = (auth && getComputedStyle(auth).display !== 'none') || document.querySelector('dialog[open]');
    if (busy) { if (tries < 8) setTimeout(() => showAd(tries + 1), 1500); return; }
    if (typeof view !== 'undefined' && view !== 'ร้านค้า') return; // แสดงเฉพาะหน้าหลัก
    session.set(SHOWN_KEY, '1');
    openAd(list[rand(list.length)]);
  }

  /* ───────── 4) วันนี้กินอะไรดี (สุ่มหมวดอาหาร) ───────── */
  // label ต้องตรงกับหมวดย่อยใน compact-activity.js (catalogSegments.อาหาร) เพื่อให้ปุ่ม "ดูร้าน" กรองได้
  const FOODS = [
    { label: 'อาหารตามสั่ง', emoji: '🍳',
      tease: ['ตามสั่งอีกแล้วบ้อ? ย้านตัดสินใจหลาย สั่งกะเพราไก่ไข่ดาวมาสิบปีแล้ว สิเปลี่ยนเมนูแหน่เด้อ',
              'ไปนั่งเลยเด้อ ร้านเขาจำหน้าเจ้าได้แล้ว บ่ต้องบอกเมนูกะได้',
              'ข้าวผัดกะเพราบ่ผิดดอก ที่ผิดคือเจ้าคิดบ่ออกมาสามชั่วโมงแล้ว'],
      flip: ['สั่งเผ็ดสุดเลย เผ็ดแล้วน้ำตาไหล คนอื่นสิได้บ่ฮู้ว่าเจ้าร้องไห้เพราะอีหยัง',
             'ตามสั่งจานละสี่สิบ ถูกกว่าค่าเสียใจเรื่องเก่า ๆ ของเจ้าเด้อ',
             'กินให้อิ่มเด้อ อย่างน้อยข้าวกะยังซื่อสัตย์กับเจ้า บ่หนีไปไสเหมือนบางคน'] },
    { label: 'ก๋วยเตี๋ยว', emoji: '🍜',
      tease: ['เส้นเล็ก เส้นใหญ่ ยังเลือกบ่ได้ แล้วสิเลือกคนรักได้จั่งได๋ล่ะเนาะ',
              'ซดน้ำจนหมดชามอีกละ ร้านเขาบ่ให้ฟรีดอก จ่ายค่าส่วนต่างความตะกละเด้อ',
              'สั่งพิเศษไข่ ลูกชิ้น หมูกรอบ ครบ แต่ตังค์ท้ายเดือนบ่พิเศษเลยเด้อ'],
      flip: ['เส้นยังมีหลายแบบ ชีวิตเจ้ากะยังมีหลายทางเลือก แม้สิเลือกผิดเกือบทุกทางกะตาม',
             'ซดน้ำซุปร้อน ๆ เด้อ ตัวร้อนใจเย็น ดีกว่าตัวเย็นใจร้อนเหมือนเมื่อวาน',
             'เส้นขาดได้ แต่ความหวังเจ้าอย่าให้ขาด (ส่วนเงินในกระเป๋าขาดไปแล้ว)'] },
    { label: 'หมูกระทะ', emoji: '🥩',
      tease: ['หมูกระทะมื้อนี้ ฮู้ว่าตังค์เหลือสองร้อย แต่ใจเจ้ากะสั่งไปสามพันแล้ว',
              'ย่างหมูไหม้ดำอีกละ เจ้าบ่ใช่นักย่าง เจ้าคือนักเผางบประมาณเด้อ',
              'ชวนเพื่อนไปนำเด้อ จะได้มีคนช่วยหารกับช่วยกินส่วนที่เจ้าย่างไหม้'],
      flip: ['ไหม้บ้างบ่เป็นหยัง ชีวิตกะไหม้มาแล้วหลายรอบ ยังลุกมาย่างต่อได้',
             'กินจนอิ่มแปล้เด้อ ใจเจ้าสิได้กว้างตามไปนำ ลืมเรื่องเศร้าได้ชั่วโมงสองชั่วโมง',
             'วันนี้อิ่มหนำสำราญ พรุ่งนี้ค่อยสำนึก ไปสำนึกพร้อมกันเด้อ'] },
    { label: 'หม่าล่า', emoji: '🌶️',
      tease: ['หม่าล่าเผ็ดชาปาก แต่บ่ชาเท่าตอนเห็นยอดบิลดอก ปากกะชา ใจกะชาเด้อ',
              'สั่งเผ็ดสี่ดาวแต่ตอนกินร้องหาแม่ เจ้ามั่นหน้ากว่าลิ้นเจ้าเด้อ',
              'เลือกไม้เสียบสิบห้าไม้ บอกว่ากินพอประมาณ ประมาณแบบไผล่ะนั่น'],
      flip: ['เผ็ดจนน้ำตาไหลกะดีเด้อ ได้ร้องไห้โดยบ่มีผู้ใดถามว่าเป็นหยัง',
             'ปากชาแล้วบ่ฮู้สึกหยัง ลองมองว่าเป็นการพักปากจากการพูดผิด ๆ เด้อ',
             'พรุ่งนี้ท้องอาจร้องเพลง แต่นั่นคือการดีท็อกซ์ฟรีจากร้านเด้อ'] },
    { label: 'ส้มตำ / อีสาน', emoji: '🥗',
      tease: ['ตำปูปลาร้าอีกละ ปลาร้ายังเบื่อเจ้า เจ้ากะยังบ่เบื่อมัน นี่แหละเรียกความซื่อสัตย์เด้อ',
              'สั่งตำเผ็ดน้อย แต่ขอพริกเพิ่มห้าเม็ด ปากบอกอย่างหนึ่ง มือทำอีกอย่าง คือเจ้าเลย',
              'ไก่ย่าง ส้มตำ ข้าวเหนียว ครบเซ็ต เหลือแต่เจ้าที่ยังบ่ครบ เพราะลืมเอาตังค์มาเด้อ'],
      flip: ['ได้กินของแซ่บวันนี้ ถือว่าชีวิตยังพอมีรสชาติ ถึงสิเค็มหน่อย ๆ',
             'ข้าวเหนียวปั้นก้อนเดียวกะอิ่มแล้ว ความทุกข์ใจสิติดคอไปนำ แต่ซดน้ำตกลงท้องกะหาย',
             'ปลาร้าเหม็นได้ แต่ใจเจ้าอย่าเหม็นเด้อ ยิ้มเข้าไว้ ตำต่อไป'] },
    { label: 'ชาบู / ปิ้งย่าง', emoji: '🍲',
      tease: ['ชาบูมื้อนี้ตั้งใจสิกินให้คุ้ม แต่กินไปได้สามจานกะเอนหลัง คุ้มอยู่ที่ค่าที่นั่งเด้อ',
              'คีบกินตอนบ่สุกอีกละ ใจร้อนแบบนี้ ความรักกะสิไหม้ไวเด้อ',
              'บุฟเฟต์ต้องกินให้คุ้ม เจ้ากะตั้งใจนัก แต่ท้ายสุดคุ้มอยู่ที่ได้นั่งแอร์ฟรีสองชั่วโมงเด้อ'],
      flip: ['น้ำซุปร้อน ๆ ช่วยได้ ไผสิว่าชาบูแก้เหงาบ่ได้ มันแก้ได้หนึ่งชั่วโมงเด้อ',
             'ลวกผักให้สุกก่อนกิน แต่ลวกใจคนอื่น อย่าเด้อ',
             'ผักเยอะ เนื้อเยอะ ความเสียใจกะเยอะ แต่หม้อใหญ่พอ ใส่ได้หมด'] },
    { label: 'ญี่ปุ่น / เกาหลี', emoji: '🍣',
      tease: ['ถ่ายรูปลงสตอรี่ก่อนกินอีกละ อาหารเย็นหมดก่อนเจ้าถ่ายเสร็จเด้อ',
              'รสนิยมญี่ปุ่น แต่กระเป๋าตังค์ยังเป็นโหมดกระนวนเด้อ',
              'ใช้ตะเกียบบ่เป็นกะบอกว่าถนัด สุดท้ายกะใช้ส้อมเหมือนเก่าเด้อ'],
      flip: ['ได้ลองของใหม่ ๆ กะดี ถึงสิบ่อร่อยกะได้เรื่องไปเล่า',
             'ซูชิชิ้นเล็ก แต่ใจเจ้าใหญ่ ใหญ่จนสั่งเพิ่มอีกสิบชิ้น (ใจใหญ่ แต่เงินเล็ก)',
             'วาซาบิเข้าจมูกจนน้ำตาไหล กะถือว่าได้ล้างพิษอารมณ์ไปในตัวเด้อ'] },
    { label: 'ขนม / เบเกอรี่', emoji: '🍰',
      tease: ['ว่าสิกินข้าว แต่ใจเจ้าอยากกินขนมตั้งแต่ตื่นนอน เจ้าบ่อยากกินข้าวแต่แรกนั่นแหละ',
              'ซื้อมาลองชิ้นเดียว สุดท้ายหมดกล่อง ความตั้งใจเจ้าบางกว่าแป้งโดนัทเด้อ',
              'เค้กชิ้นละร้อยเจ้าว่าแพง แต่กาแฟแก้วละร้อยห้าสิบเจ้ากะซื้อได้ ตรรกะเจ้าหนอ'],
      flip: ['ความหวานช่วยได้นิดหน่อย ที่เหลือเจ้าต้องช่วยตัวเองเด้อ',
             'ขนมหมดแล้วยังมีกล่องให้เก็บ ความสุขหมดแล้วยังมีวันพรุ่งนี้ให้เริ่มใหม่',
             'หวานปากแล้ว ให้ไปพูดหวานกับคนที่บ้านบ้างเด้อ'] }
  ];
  const food = { cur: null, spinning: false, done: false, tease: '', flip: '', last: -1 };

  function rouletteHtml() {
    return '<div class="fr-head"><small>FOOD ROULETTE</small><h3>วันนี้กินอะไรดี?</h3>' +
      '<p>ตัดสินใจบ่ได้ใช่บ่ ให้โชคชะตา (และความตะกละ) เลือกให้เด้อ</p></div>' +
      '<div class="fr-window" aria-live="polite"><span class="fr-emoji">🎲</span><span class="fr-name">กดหมุนเลย!</span></div>' +
      '<div class="fr-quote" hidden><p class="fr-tease"><b>คำกวนจากบ้านเฮา</b><span></span></p>' +
      '<p class="fr-flip"><b>พลังบวก (แบบลบ ๆ)</b><span></span></p></div>' +
      '<div class="fr-actions"><button type="button" class="fr-spin">หมุนเลย!</button>' +
      '<button type="button" class="fr-go" hidden>ดูร้านหมวดนี้</button></div>' +
      '<p class="fr-note">คำกวนเพื่อความบันเทิงเท่านั้น อย่าเอาไปคิดมากเด้อ</p>';
  }
  function paintRoulette(mode) {
    const el = $('foodRoulette'); if (!el) return;
    const f = food.cur;
    if (f) { el.querySelector('.fr-emoji').textContent = f.emoji; el.querySelector('.fr-name').textContent = f.label; }
    el.classList.toggle('is-spinning', food.spinning);
    const q = el.querySelector('.fr-quote');
    q.hidden = !food.done;
    el.querySelector('.fr-tease span').textContent = food.tease;
    el.querySelector('.fr-flip span').textContent = food.flip;
    const spin = el.querySelector('.fr-spin'), go = el.querySelector('.fr-go');
    spin.disabled = food.spinning;
    spin.textContent = food.spinning ? 'กำลังหมุน...' : (food.done ? 'หมุนใหม่' : 'หมุนเลย!');
    go.hidden = !food.done;
    if (food.done) go.textContent = 'ดูร้าน' + f.label;
    if (mode === 'land') { el.classList.remove('fr-land'); void el.offsetWidth; el.classList.add('fr-land'); }
  }
  function spinFood() {
    if (food.spinning) return;
    food.spinning = true; food.done = false; food.tease = ''; food.flip = '';
    const pick = FOODS[rand(FOODS.length)], steps = reduceMotion() ? 1 : 26;
    let i = 0, prev = null;
    const tick = () => {
      i++;
      let f = pick;
      if (i < steps) { do { f = FOODS[rand(FOODS.length)]; } while (f === prev); }
      prev = f; food.cur = f;
      if (i < steps) { paintRoulette(); setTimeout(tick, 55 + Math.pow(i / steps, 3) * 340); return; }
      food.spinning = false; food.done = true;
      food.tease = f.tease[rand(f.tease.length)];
      food.flip = f.flip[rand(f.flip.length)];
      try { navigator.vibrate && navigator.vibrate(30); } catch {}
      paintRoulette('land');
    };
    tick();
  }
  function showFoodShops() {
    if (!food.cur) return;
    try { chosenSegments['อาหาร'] = food.cur.label; } catch {}
    if (typeof results === 'function') results();
    ($('catalogSegments') || $('results'))?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
  }
  function ensureRoulette() {
    const on = typeof view !== 'undefined' && view === 'ร้านค้า' && typeof category !== 'undefined' && category === 'อาหาร';
    if (!on) { $('foodRoulette')?.remove(); return; }
    if ($('foodRoulette')) return;
    const anchor = document.querySelector('#app .shop-selection') || $('results'); if (!anchor) return;
    const card = document.createElement('section');
    card.id = 'foodRoulette'; card.className = 'fr-card'; card.setAttribute('aria-label', 'สุ่มเมนูวันนี้กินอะไรดี');
    card.innerHTML = rouletteHtml();
    card.querySelector('.fr-spin').onclick = spinFood;
    card.querySelector('.fr-go').onclick = showFoodShops;
    anchor.before(card);
    paintRoulette();
  }

  /* ───────── เชื่อมเข้ากับระบบเดิม ───────── */
  if (typeof topNav === 'function') {
    const baseTopNav = topNav;
    topNav = function () { const r = baseTopNav.apply(this, arguments); try { upgradeNav(); } catch (e) { console.warn(e); } return r; };
  }
  if (typeof render === 'function') {
    const baseRender = render;
    render = function () { const r = baseRender.apply(this, arguments); try { ensureRoulette(); } catch (e) { console.warn(e); } return r; };
    render();
  }
  setTimeout(() => showAd(), 900);
})();
