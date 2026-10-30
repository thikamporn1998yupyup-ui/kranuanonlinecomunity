
/* Kranuan Food Delivery V2 - Merchant */
(() => {
  'use strict';

  if (typeof staffRender !== 'function') {
    console.warn('Food V2: admin.js not ready');
    return;
  }

  const stageNames = {
    waiting: 'รอร้านยืนยัน',
    confirmed: 'ร้านรับออเดอร์แล้ว',
    preparing: 'ร้านกำลังเตรียมอาหาร',
    ready: 'อาหารพร้อมส่ง รอไรเดอร์',
    assigned: 'ไรเดอร์รับงานแล้ว',
    picked: 'ไรเดอร์รับอาหารแล้ว',
    done: 'จัดส่งสำเร็จ',
    cancelled: 'ยกเลิกออเดอร์'
  };

  const steps = {
    waiting: {
      next: 'confirmed',
      label: '✓ ยืนยันรับออเดอร์'
    },
    confirmed: {
      next: 'preparing',
      label: '🍳 เริ่มเตรียมอาหาร'
    },
    preparing: {
      next: 'ready',
      label: '🛵 อาหารพร้อมส่ง แจ้งไรเดอร์'
    }
  };

  const originalRender = staffRender;

  staffRender = function(...args) {
    originalRender.apply(this, args);

    if (
      staffTab !== 'orders' ||
      !window.K ||
      !K.user
    ) return;

    const root = document.getElementById('staffApp');
    if (!root) return;

    const cards = Array.from(
      root.querySelectorAll('article.card')
    );

    // ป้องกันการจับคู่การ์ดผิดออเดอร์
    if (cards.length !== staffOrders.length) {
      console.warn('Food V2: order cards mismatch');
      return;
    }

    staffOrders.forEach((order, index) => {
      if (order.type !== 'food') return;

      const card = cards[index];

      const stage = order.status === 'waiting'
        ? (order.food_stage || 'waiting')
        : order.status;

      const code = order.short_code ||
        String(order.id || '').slice(0, 8).toUpperCase();

      // เลขประจำออเดอร์ของระบบ
      const codeBox = document.createElement('div');
      codeBox.style.cssText = [
        'background:#fff0d4',
        'padding:12px',
        'border-radius:12px',
        'margin-bottom:12px'
      ].join(';');

      const small = document.createElement('div');
      small.textContent = 'เลขออเดอร์';
      small.style.fontSize = '12px';

      const strong = document.createElement('strong');
      strong.textContent = '#' + code;
      strong.style.cssText =
        'font-size:23px;color:#d95829';

      codeBox.append(small, strong);
      card.prepend(codeBox);

      // แสดงสถานะเตรียมอาหาร
      const statusElement =
        card.querySelector('p.status');

      if (statusElement) {
        statusElement.textContent =
          stageNames[stage] || stage;
      }

      // แสดงข้อมูลไรเดอร์ที่รับงานแล้ว
      if (order.rider_id) {
        const riderBox = document.createElement('div');

        riderBox.style.cssText = [
          'background:#eaf7ed',
          'padding:12px',
          'border-radius:12px',
          'margin:12px 0'
        ].join(';');

        const riderName =
          order.rider?.name || 'ไรเดอร์ที่รับงาน';

        riderBox.textContent =
          '🛵 ไรเดอร์รับงานแล้ว: ' + riderName;

        card.append(riderBox);
      }

      // เปลี่ยนปุ่มเดิมเป็นขั้นตอนรับออเดอร์
      if (
        K.user.role !== 'merchant' ||
        order.status !== 'waiting' ||
        K.user.shop_id !== order.shop_id
      ) return;

      const step = steps[stage];

      if (!step) return;

      let button = card.querySelector(
        'button.kbutton.primary'
      );

      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'kbutton primary';
        card.append(button);
      }

      button.textContent = step.label;

      // แทนที่การกดพร้อมส่งแบบเดิม
      button.onclick = () => {
        staffStatus(order.id, step.next, button);
      };
    });
  };

  console.log('Kranuan Merchant Food V2 ready');
})();
