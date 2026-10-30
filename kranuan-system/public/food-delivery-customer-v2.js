
/* Kranuan Food Delivery V2 - Customer Tracking */
(() => {
  'use strict';

  const esc = s => String(s ?? '').replace(
    /[&<>"']/g,
    c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c])
  );

  const baht = n => Number(n || 0).toLocaleString(
    'th-TH',
    { style: 'currency', currency: 'THB' }
  );

  const names = {
    waiting: 'รอร้านยืนยัน',
    confirmed: 'ร้านรับออเดอร์แล้ว',
    preparing: 'กำลังเตรียมอาหาร',
    ready: 'พร้อมส่ง · รอไรเดอร์',
    assigned: 'ไรเดอร์รับงานแล้ว',
    picked: 'ไรเดอร์รับอาหารแล้ว',
    done: 'ส่งสำเร็จ',
    cancelled: 'ยกเลิก'
  };

  let orders = [];
  let initialized = false;
  let loading = false;
  let activeId = null;
  let lastStatus = new Map();

  function currentStage(o) {
    return o.status === 'waiting'
      ? (o.food_stage || 'waiting')
      : o.status;
  }

  function ensure() {
    if (
      !document.body ||
      document.getElementById('krFoodTrack')
    ) return;

    const root = document.createElement('div');
    root.id = 'krFoodTrack';

    root.style.cssText = [
      'position:fixed',
      'z-index:3500',
      'left:10px',
      'bottom:83px',
      'max-width:min(420px,calc(100vw - 20px))',
      'font-family:Tahoma,sans-serif'
    ].join(';');

    root.innerHTML = `
      <button id="krFoodTrackBtn"
        style="background:#df5c2b;color:white;border:0;
        border-radius:50px;padding:12px 18px;
        font-weight:700;box-shadow:0 6px 25px #0004">
        🛍 ติดตามออเดอร์
      </button>

      <dialog id="krFoodTrackDialog"
        style="border:0;border-radius:20px;
        background:#fffdf9;color:#2c2721;
        padding:20px;width:min(92vw,430px);
        max-height:85vh;overflow:auto;
        box-shadow:0 15px 80px #0006">
      </dialog>
    `;

    document.body.append(root);

    root.querySelector('button').onclick = () => openTracker();
    root.hidden = true;
  }

  function dialog(html) {
    ensure();

    const d = document.getElementById('krFoodTrackDialog');
    if (!d) return null;

    d.innerHTML = html + `
      <p>
        <button type="button" id="krTrackClose"
          style="padding:12px 20px;border:0;
          border-radius:12px;background:#eee">
          ปิด
        </button>
      </p>
    `;

    d.querySelector('#krTrackClose').onclick = () => d.close();

    if (!d.open) d.showModal();

    return d;
  }

  function paymentPanel(o) {
    const d = dialog(
      '<h2>✅ จัดส่งสำเร็จ</h2>' +
      '<p>ออเดอร์ <b>#' +
      esc(o.short_code || o.id.slice(0, 8)) +
      '</b></p>' +
      '<p>ค่าอาหาร ' + baht(o.goods_total) +
      '<br>ค่าจัดส่ง ' + baht(o.fee) + '</p>' +
      '<h3>ยอดรวม ' + baht(o.total) + '</h3>' +
      `<p style="background:#fff1d6;padding:14px;
      border-radius:12px">
        กรุณาตรวจจำนวนและสภาพอาหารให้ตรงกับออเดอร์
        ก่อนรับของ แล้วชำระเงินสดหรือโอนตรงให้ผู้รับเงิน
        ตามที่ตกลงไว้กับร้านและไรเดอร์

        <strong>แอปไม่ได้รับหรือยืนยันเงินแทน</strong>
      </p>` +
      `<button id="krViewOrderTimeline"
        style="border:0;background:#e75d2c;
        color:#fff;padding:12px;border-radius:12px;
        width:100%">
        ดูประวัติออเดอร์และรูปถ่าย
      </button>`
    );

    if (!d) return;

    d.querySelector('#krViewOrderTimeline').onclick = () => {
      d.close();
      openTracker(o.id);
    };
  }

  function orderLine(o) {
    return `
      <button type="button"
        data-oid="${esc(o.id)}"
        style="width:100%;text-align:left;
        border:1px solid #e7dac7;
        background:white;padding:12px;
        border-radius:12px;margin:5px 0">

        <strong>
          #${esc(o.short_code || o.id.slice(0, 8))}
        </strong>

        ${esc(o.shop)}

        <br>

        <small>
          ${esc(names[currentStage(o)] || o.status)}
          · ${baht(o.total)}
        </small>
      </button>
    `;
  }

  async function openTracker(id) {
    activeId = id || null;

    if (!activeId) {
      const d = dialog(
        '<h2>ติดตามออเดอร์ของฉัน</h2>' +
        orders.slice(0, 12).map(orderLine).join('')
      );

      if (!d) return;

      d.querySelectorAll('[data-oid]').forEach(b => {
        b.onclick = () => {
          d.close();
          openTracker(b.dataset.oid);
        };
      });

      return;
    }

    const o = orders.find(x => x.id === activeId);
    if (!o) return;

    const d = dialog(
      '<h2>ออเดอร์ #' +
      esc(o.short_code || o.id.slice(0, 8)) +
      '</h2>' +

      '<p>' + esc(o.shop) + '</p>' +

      `<p style="background:#ffe8c3;
      padding:12px;border-radius:12px">
        <strong>
          ${esc(names[currentStage(o)] || o.status)}
        </strong>
      </p>` +

      '<p>ผู้รับ: ' + esc(o.customer_name) +
      '<br>จุดส่ง: ' + esc(o.dropoff) + '</p>' +

      (o.rider_id
        ? `<p style="background:#eaf7ed;
          padding:12px;border-radius:12px">
            🛵 ไรเดอร์:
            <b>${esc(o.rider?.name || 'ไรเดอร์ที่รับงาน')}</b>
          </p>`
        : '') +

      '<h3>ข้อความอัปเดตออเดอร์</h3>' +

      `<div id="krFoodEvents">
        กำลังโหลดข้อความ...
      </div>` +

      (o.pickup_photo
        ? `<p>
            <b>📷 ภาพอาหารตอนรับจากร้าน</b><br>
            <img
              src="${esc(o.pickup_photo)}"
              alt="ภาพอาหารที่ไรเดอร์รับ"
              style="max-width:100%;
              max-height:300px;border-radius:12px">
          </p>`
        : '') +

      (o.status === 'done'
        ? `<p style="background:#fff1d6;
          padding:12px;border-radius:12px">
            ยอดรวม ${baht(o.total)}
            · ตรวจสอบอาหารก่อนชำระเงินโดยตรง
          </p>`
        : '')
    );

    if (!d) return;

    try {
      const events = await K.request(
        '/orders/' + encodeURIComponent(o.id) + '/events'
      );

      if (d.open && activeId === o.id) {
        const el = d.querySelector('#krFoodEvents');

        if (el) {
          el.innerHTML = (events || []).map(x => `
            <div style="border-left:3px solid #f9b86b;
              padding:8px 12px;margin:4px 0;
              background:#fffaf1">

              <strong>
                ${esc(names[x.status] || x.status)}
              </strong>

              <br>

              <small>
                ${esc(x.note || 'ระบบอัปเดตสถานะ')}
                · ${esc(new Date(x.created_at).toLocaleString('th-TH'))}
              </small>
            </div>
          `).join('') || 'ไม่มีข้อความ';
        }
      }
    } catch (e) {
      const el = d.querySelector('#krFoodEvents');

      if (el) {
        el.textContent = 'โหลดประวัติไม่ได้: ' + e.message;
      }
    }
  }

  async function refresh() {
    if (
      loading ||
      !window.K ||
      K.user?.role !== 'customer'
    ) return;

    loading = true;

    try {
      const list = (await K.request('/orders'))
        .filter(o => o.type === 'food');

      orders = list;

      ensure();

      document.getElementById('krFoodTrack').hidden =
        !list.length;

      for (const o of list) {
        const stage = currentStage(o);
        const was = lastStatus.get(o.id);

        if (
          initialized &&
          was &&
          was !== stage &&
          stage === 'done'
        ) {
          paymentPanel(o);
        }

        lastStatus.set(o.id, stage);
      }

      initialized = true;
    } catch (e) {
      console.warn('Order tracking:', e.message);
    } finally {
      loading = false;
    }
  }

  function start() {
    if (!window.K) return;

    ensure();

    let registered = false;
    let lastAccount = '';

    const update = () => {
      if (K.user?.role !== 'customer') {
        document.getElementById('krFoodTrack').hidden = true;
        return;
      }

      if (K.user.id !== lastAccount) {
        lastAccount = K.user.id;
        lastStatus.clear();
        initialized = false;
      }

      if (!registered) {
        K.on(refresh);
        registered = true;
      }

      refresh();
    };

    update();
    setInterval(update, 15000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      start,
      { once: true }
    );
  } else {
    start();
  }
})();
