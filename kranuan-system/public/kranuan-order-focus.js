
/* KRANUAN — ORDER FOCUS v1 */
(() => {
  'use strict';

  if (window.KranuanOrderFocus) return;
  if (!window.K) return;

  let activeId = '';
  let dialog = null;
  let currentOrder = null;
  let refreshing = false;
  let chatRefreshing = false;
  let lastRender = '';
  let gpsSupported = true;

  const escapeHTML = value =>
    String(value ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[c]);

  const money = n =>
    Number(n || 0).toLocaleString('th-TH', {
      maximumFractionDigits: 2
    }) + ' บาท';

  const statuses = {
    waiting: ['รอร้านหรือผู้ขายยืนยัน', 'clock'],
    ready: ['กำลังหาไรเดอร์', 'search'],
    assigned: ['ไรเดอร์รับงานแล้ว', 'bike'],
    picked: ['กำลังเดินทางไปส่ง', 'truck'],
    done: ['ดำเนินการสำเร็จ', 'check'],
    cancelled: ['ออเดอร์ถูกยกเลิก', 'x']
  };

  const style = document.createElement('style');

  style.textContent = `
    #krOrderFocus {
      width:min(100%,540px);
      max-width:540px;
      height:100dvh;
      max-height:100dvh;
      margin:auto;
      padding:0;
      border:0;
      background:#f6f7f9;
      color:#263343;
      font:14px/1.55 system-ui,Tahoma,sans-serif;
      overflow-y:auto;
      overscroll-behavior:contain;
    }

    #krOrderFocus::backdrop {
      background:#101720bb;
    }

    #krOrderFocus * {
      box-sizing:border-box;
    }

    #krOrderFocus .kof-head {
      position:sticky;
      top:0;
      z-index:5;
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding:15px;
      background:#fff;
      border-bottom:1px solid #edf0f2;
    }

    #krOrderFocus button {
      font:inherit;
      cursor:pointer;
    }

    #krOrderFocus .kof-back,
    #krOrderFocus .kof-refresh {
      border:1px solid #e7e8ec;
      border-radius:12px;
      padding:8px 11px;
      background:#fff;
      color:#263343;
      font-size:12px;
      font-weight:700;
    }

    #krOrderFocus .kof-heading {
      font-size:16px;
      font-weight:800;
    }

    #krOrderFocus .kof-content {
      padding:16px 14px 105px;
    }

    #krOrderFocus .kof-card {
      margin-bottom:13px;
      padding:16px;
      border:1px solid #edf0f3;
      border-radius:18px;
      background:#fff;
      box-shadow:0 3px 12px #17263808;
    }

    #krOrderFocus .kof-hero {
      text-align:center;
      background:linear-gradient(145deg,#fff5e9,#fff);
      border-color:#f0dac3;
      padding:24px 16px;
    }

    #krOrderFocus .kof-symbol {
      display:grid;
      place-items:center;
      width:62px;
      height:62px;
      margin:0 auto 12px;
      border-radius:50%;
      background:#ffead5;
      font-size:28px;
      animation:kofPulse 2s ease-in-out infinite;
    }

    @keyframes kofPulse {
      0%,100% {transform:scale(1)}
      50% {transform:scale(1.07)}
    }

    #krOrderFocus h2 {
      margin:6px 0;
      font-size:20px;
      line-height:1.35;
    }

    #krOrderFocus h3 {
      margin:0 0 12px;
      font-size:15px;
    }

    #krOrderFocus p {
      margin:5px 0;
    }

    #krOrderFocus .kof-sub {
      font-size:12px;
      color:#78838e;
    }

    #krOrderFocus .kof-number {
      display:inline-block;
      padding:5px 11px;
      border-radius:20px;
      background:#fff;
      color:#b86131;
      font-size:12px;
      font-weight:700;
    }

    #krOrderFocus .kof-row {
      display:flex;
      justify-content:space-between;
      gap:12px;
      padding:8px 0;
      border-bottom:1px solid #f0f1f2;
    }

    #krOrderFocus .kof-row:last-child {
      border-bottom:0;
    }

    #krOrderFocus .kof-row > span:first-child {
      color:#7b8590;
      flex:none;
    }

    #krOrderFocus .kof-row > strong {
      text-align:right;
      overflow-wrap:anywhere;
    }

    #krOrderFocus .kof-rider {
      display:flex;
      align-items:center;
      gap:12px;
    }

    #krOrderFocus .kof-avatar {
      width:53px;
      height:53px;
      display:grid;
      place-items:center;
      border-radius:50%;
      background:#f9e5d4;
      color:#ab5c32;
      font-size:23px;
      font-weight:800;
      overflow:hidden;
      flex:none;
    }

    #krOrderFocus .kof-avatar img {
      width:100%;
      height:100%;
      object-fit:cover;
    }

    #krOrderFocus .kof-rider-info {
      min-width:0;
      flex:1;
    }

    #krOrderFocus .kof-chat {
      padding:11px 0;
      border-bottom:1px solid #f1f2f3;
    }

    #krOrderFocus .kof-chat:last-child {
      border:0;
    }

    #krOrderFocus .kof-chat-name {
      font-size:11px;
      font-weight:700;
      color:#c16a37;
    }

    #krOrderFocus .kof-chat-message {
      display:block;
      max-width:100%;
      overflow:hidden;
      white-space:nowrap;
      text-overflow:ellipsis;
      font-size:13px;
    }

    #krOrderFocus .kof-btn {
      display:block;
      width:100%;
      padding:12px;
      border:0;
      border-radius:12px;
      background:#d76f39;
      color:#fff;
      text-align:center;
      font-weight:700;
      margin-top:12px;
    }

    #krOrderFocus .kof-gps-box {
      padding:16px;
      border-radius:12px;
      background:#f4f7fa;
      text-align:center;
      font-size:12px;
      color:#6e7d89;
    }

    #krOrderFocus .kof-link {
      color:#a95b32;
      font-weight:700;
    }

    #krOrderFocus .kof-footer {
      position:sticky;
      bottom:0;
      padding:12px 15px;
      background:#ffffffee;
      border-top:1px solid #e7e9ec;
    }

    #krOrderFocus .kof-footer button {
      width:100%;
      padding:13px;
      border:1px solid #e6c5ab;
      border-radius:13px;
      background:white;
      color:#b76535;
      font-weight:700;
    }

    @media(prefers-reduced-motion:reduce) {
      #krOrderFocus .kof-symbol {
        animation:none;
      }
    }
  `;

  document.head.appendChild(style);

  function ensureDialog() {
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.id = 'krOrderFocus';

    dialog.innerHTML = `
      <div class="kof-head">
        <button type="button" class="kof-back">
          ← กลับหน้าแอป
        </button>
        <strong class="kof-heading">ติดตามออเดอร์</strong>
        <button type="button" class="kof-refresh">
          ↻
        </button>
      </div>

      <main class="kof-content">
        <div id="kofMain">
          กำลังโหลดข้อมูลออเดอร์...
        </div>

        <section class="kof-card">
          <h3>💬 แชทล่าสุดจากคนกระนวน</h3>
          <div id="kofChats">
            กำลังโหลดข้อความ...
          </div>
          <button type="button"
            class="kof-btn" id="kofOpenChat">
            เปิดแชทอำเภอ
          </button>
        </section>
      </main>

      <footer class="kof-footer">
        <button type="button" id="kofLeave">
          กลับหน้าแอปเพื่อทำกิจกรรมอื่น
        </button>
      </footer>
    `;

    document.body.appendChild(dialog);

    dialog.querySelector('.kof-back').onclick = leave;
    dialog.querySelector('#kofLeave').onclick = leave;

    dialog.querySelector('.kof-refresh').onclick = () => {
      refreshOrder();
      refreshChats();
      refreshLocation();
    };

    dialog.querySelector('#kofOpenChat').onclick =
      openCommunityChat;

    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      leave();
    });

    return dialog;
  }

  function iconFor(status) {
    return ({
      waiting: '🕒',
      ready: '🔎',
      assigned: '🛵',
      picked: '🚚',
      done: '✅',
      cancelled: '✕'
    })[status] || '📦';
  }

  function riderHTML(order) {
    const rider = order.rider;

    if (!rider || !order.rider_id) {
      return `
        <div class="kof-gps-box">
          🛵 กำลังรอไรเดอร์รับงาน
          <p>เมื่อมีไรเดอร์รับงาน ข้อมูลผู้ขับจะปรากฏที่นี่</p>
        </div>
      `;
    }

    const name = rider.name || 'ไรเดอร์กระนวน';

    const photo = typeof rider.avatar_url === 'string'
      ? rider.avatar_url
      : '';

    const safePhoto =
      photo.startsWith('/api/riders/') ? photo : '';

    return `
      <div class="kof-rider">
        <div class="kof-avatar">
          ${safePhoto
            ? `<img src="${escapeHTML(safePhoto)}"
                alt="รูปไรเดอร์">`
            : escapeHTML(Array.from(name)[0] || 'ร')}
        </div>

        <div class="kof-rider-info">
          <strong>${escapeHTML(name)}</strong>
          <p class="kof-sub">
            ${rider.verified
              ? '✓ โปรไฟล์ไรเดอร์ผ่านการตรวจสอบ'
              : 'ไรเดอร์ที่รับงานของคุณ'}
          </p>
          <p class="kof-sub">
            ${escapeHTML(order.vehicle_label || 'รถรับส่ง')}
          </p>
        </div>
      </div>
    `;
  }

  function renderOrder(order) {
    const root = document.getElementById('kofMain');
    if (!root) return;

    const fingerprint = JSON.stringify(order);

    if (fingerprint === lastRender) return;
    lastRender = fingerprint;

    const status = statuses[order.status] ||
      ['กำลังดำเนินการ', 'clock'];

    const isRide = order.type === 'ride';
    const isParcel = order.type === 'parcel';
    const isMarket = order.type === 'market';

    const service = isRide
      ? 'บริการเรียกรถ'
      : isParcel
        ? 'บริการส่งของ'
        : isMarket
          ? 'สินค้าในตลาด'
          : 'อาหารและเครื่องดื่ม';

    const number = String(order.id || '')
      .slice(-6).toUpperCase();

    const details =
      order.item ||
      (Array.isArray(order.items)
        ? order.items.map(x => x.name).join(', ')
        : '') ||
      order.service_label ||
      service;

    root.innerHTML = `
      <section class="kof-card kof-hero">
        <div class="kof-symbol">
          ${iconFor(order.status)}
        </div>

        <div class="kof-number">
          ออเดอร์ #${escapeHTML(number)}
        </div>

        <h2>${escapeHTML(status[0])}</h2>

        <p class="kof-sub">
          ${order.status === 'waiting'
            ? 'กำลังรอร้านค้าหรือผู้ขายตอบรับ'
            : order.status === 'ready'
              ? 'ระบบกำลังรอไรเดอร์ที่พร้อมรับงาน'
              : order.status === 'assigned'
                ? 'ไรเดอร์รับงานแล้ว กำลังดำเนินการ'
                : order.status === 'picked'
                  ? 'ไรเดอร์อยู่ระหว่างเดินทาง'
                  : order.status === 'done'
                    ? 'งานนี้ดำเนินการเรียบร้อยแล้ว'
                    : order.status === 'cancelled'
                      ? 'ออเดอร์นี้ถูกยกเลิกแล้ว'
                      : 'ระบบกำลังตรวจสอบสถานะล่าสุด'}
        </p>
      </section>

      <section class="kof-card">
        <h3>📋 ข้อมูลออเดอร์ของคุณ</h3>

        <div class="kof-row">
          <span>ประเภท</span>
          <strong>${escapeHTML(service)}</strong>
        </div>

        <div class="kof-row">
          <span>รายการ</span>
          <strong>${escapeHTML(details)}</strong>
        </div>

        <div class="kof-row">
          <span>จุดรับ</span>
          <strong>${escapeHTML(order.pickup || '—')}</strong>
        </div>

        <div class="kof-row">
          <span>จุดส่ง</span>
          <strong>${escapeHTML(order.dropoff || '—')}</strong>
        </div>

        <div class="kof-row">
          <span>ชื่อผู้รับ</span>
          <strong>${escapeHTML(order.customer_name || '—')}</strong>
        </div>

        <div class="kof-row">
          <span>ยอดรวม</span>
          <strong>${money(order.total ?? order.fee)}</strong>
        </div>
      </section>

      <section class="kof-card">
        <h3>🛵 ข้อมูลไรเดอร์ของคุณ</h3>
        ${riderHTML(order)}
      </section>

      <section class="kof-card">
        <h3>📍 ตำแหน่งไรเดอร์</h3>
        <div id="kofLocation" class="kof-gps-box">
          ${order.rider_id
            ? 'กำลังตรวจสอบตำแหน่ง GPS ของไรเดอร์...'
            : 'รอไรเดอร์รับงานก่อนแสดงตำแหน่ง'}
        </div>
      </section>

      <section class="kof-card">
        <p class="kof-sub">
          ระบบจะตรวจสอบสถานะออเดอร์ให้อัตโนมัติ
          คุณสามารถอยู่หน้านี้ระหว่างรอรับงานได้
        </p>
      </section>
    `;

    refreshLocation();
  }

  async function refreshOrder() {
    if (!activeId || !dialog?.open || refreshing) return;
    refreshing = true;

    try {
      const orders = await K.request('/orders');
      if (!Array.isArray(orders)) {
        throw Error('ข้อมูลออเดอร์ไม่ถูกต้อง');
      }

      const order = orders.find(
        x => String(x.id) === String(activeId)
      );

      if (!order) {
        const el = document.getElementById('kofMain');
        if (el && !currentOrder) {
          el.innerHTML = `
            <div class="kof-card">
              กำลังรอข้อมูลออเดอร์จากเซิร์ฟเวอร์...
            </div>
          `;
        }
        return;
      }

      currentOrder = order;
      renderOrder(order);

    } catch (error) {
      const el = document.getElementById('kofMain');

      if (el && !currentOrder) {
        el.innerHTML = `
          <div class="kof-card">
            ยังโหลดออเดอร์ไม่ได้
            <p class="kof-sub">
              ตรวจสอบอินเทอร์เน็ตแล้วกดรีเฟรชอีกครั้ง
            </p>
          </div>
        `;
      }

      console.warn('Order tracking:', error);
    } finally {
      refreshing = false;
    }
  }

  async function refreshLocation() {
    if (
      !activeId ||
      !currentOrder?.rider_id ||
      !gpsSupported ||
      !dialog?.open
    ) return;

    const el = document.getElementById('kofLocation');
    if (!el) return;

    try {
      const response = await fetch(
        '/api/dispatch/orders/' +
        encodeURIComponent(activeId) +
        '/location',
        { credentials: 'same-origin', cache: 'no-store' }
      );

      // GPS API will be enabled in the rider step.
      if (response.status === 404) {
        gpsSupported = false;
        el.textContent =
          'ระบบติดตาม GPS สดยังไม่เปิดใช้งาน';
        return;
      }

      if (!response.ok) {
        throw Error('ตรวจตำแหน่งไม่สำเร็จ');
      }

      const location = await response.json();

      if (
        !location.available ||
        !Number.isFinite(Number(location.lat)) ||
        !Number.isFinite(Number(location.lng))
      ) {
        el.textContent =
          'รอไรเดอร์เปิดแชร์ตำแหน่ง GPS';
        return;
      }

      const lat = Number(location.lat);
      const lng = Number(location.lng);

      el.replaceChildren();

      const title = document.createElement('strong');
      title.textContent = '📍 มีตำแหน่ง GPS ล่าสุดแล้ว';

      const coords = document.createElement('p');
      coords.textContent =
        lat.toFixed(5) + ', ' + lng.toFixed(5);

      const link = document.createElement('a');
      link.className = 'kof-link';
      link.href =
        'https://www.openstreetmap.org/?mlat=' +
        lat + '&mlon=' + lng +
        '#map=16/' + lat + '/' + lng;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'ดูตำแหน่งบนแผนที่';

      el.append(title, coords, link);

      if (location.updated_at) {
        const time = document.createElement('p');
        time.textContent =
          'อัปเดตล่าสุด: ' +
          new Date(location.updated_at)
            .toLocaleTimeString('th-TH');
        el.appendChild(time);
      }

    } catch {
      el.textContent =
        'ยังรับตำแหน่ง GPS ล่าสุดไม่ได้';
    }
  }

  async function refreshChats() {
    if (!dialog?.open || chatRefreshing) return;
    chatRefreshing = true;

    const root = document.getElementById('kofChats');

    try {
      const data = await K.request('/dispatch/community');

      const messages = Array.isArray(data.messages)
        ? data.messages.slice(-3)
        : [];

      if (!root || !dialog.open) return;

      if (!messages.length) {
        root.textContent = 'ยังไม่มีข้อความในแชทอำเภอ';
        return;
      }

      root.replaceChildren();

      for (const item of messages) {
        const line = document.createElement('div');
        line.className = 'kof-chat';

        const name = document.createElement('div');
        name.className = 'kof-chat-name';
        name.textContent = item.name || 'สมาชิก';

        const body = document.createElement('span');
        body.className = 'kof-chat-message';

        const clean = String(item.body || '')
          .replace(/\[\[KR-MARKET:[^\]]+\]\]/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        body.textContent = clean.length > 65
          ? clean.slice(0, 65) + '…'
          : clean;

        line.append(name, body);
        root.appendChild(line);
      }

    } catch {
      if (root) {
        root.textContent =
          'ยังโหลดแชทอำเภอไม่ได้';
      }
    } finally {
      chatRefreshing = false;
    }
  }

  async function openCommunityChat() {
    try {
      if (
        typeof window.openKranuanCommunity !== 'function'
      ) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src =
            '/dispatch-center/community.js?v=20261031-admin2';

          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      if (
        typeof window.openKranuanCommunity === 'function'
      ) {
        await window.openKranuanCommunity();
      }
    } catch {
      alert('ไม่สามารถเปิดแชทอำเภอได้');
    }
  }

  function open(id) {
    if (!id) return;

    activeId = String(id);
    currentOrder = null;
    lastRender = '';
    gpsSupported = true;

    try {
      sessionStorage.setItem(
        'kranuan.active.order',
        activeId
      );
    } catch {}

    ensureDialog();

    if (!dialog.open) {
      dialog.showModal();
    }

    document.getElementById('kofMain').textContent =
      'กำลังโหลดข้อมูลออเดอร์...';

    document.getElementById('kofChats').textContent =
      'กำลังโหลดข้อความ...';

    // Close the booking popup after a successful booking.
    const transport = document.getElementById(
      'transportBooking'
    );
    if (transport?.open) transport.close();

    refreshOrder();
    refreshChats();
  }

  function leave() {
    if (dialog?.open) dialog.close();

    activeId = '';
    currentOrder = null;
    lastRender = '';

    try {
      sessionStorage.removeItem(
        'kranuan.active.order'
      );
    } catch {}

    const transport = document.getElementById(
      'transportBooking'
    );

    if (transport?.open) transport.close();
  }

  // Intercept only successful order-creation requests.
  const originalRequest = K.request;

  K.request = async function(path, options = {}) {
    const result = await originalRequest.call(
      this, path, options
    );

    const isOrder =
      path === '/orders' ||
      path === '/market/orders';

    const isCreate =
      String(options?.method || 'GET').toUpperCase()
        === 'POST';

    if (isOrder && isCreate && result?.id) {
      try {
        sessionStorage.setItem(
          'kranuan.active.order',
          String(result.id)
        );
      } catch {}

      // Allow the original checkout to finish closing.
      setTimeout(() => open(result.id), 1100);
    }

    return result;
  };

  // Refresh live order status while the tracking page is open.
  setInterval(() => {
    if (!dialog?.open || document.hidden) return;

    refreshOrder();

    if (currentOrder?.rider_id) {
      refreshLocation();
    }
  }, 12000);

  // Show the latest district messages.
  setInterval(() => {
    if (dialog?.open && !document.hidden) {
      refreshChats();
    }
  }, 25000);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && dialog?.open) {
      refreshOrder();
      refreshChats();
    }
  });

  if (typeof K.on === 'function') {
    K.on(() => {
      if (dialog?.open) refreshOrder();
    });
  }

  // Reopen the active order after a page refresh.
  setTimeout(() => {
    let saved = '';

    try {
      saved = sessionStorage.getItem(
        'kranuan.active.order'
      ) || '';
    } catch {}

    if (saved) open(saved);
  }, 1400);

  window.KranuanOrderFocus = {
    open,
    close: leave,
    refresh: refreshOrder
  };
})();
