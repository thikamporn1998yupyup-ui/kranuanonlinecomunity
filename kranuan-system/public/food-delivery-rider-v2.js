
/* Kranuan Food Delivery V2 - Rider */
(() => {
  'use strict';

  // ต้องโหลดหลัง rider-bridge.js
  if (
    typeof actions === 'undefined' ||
    typeof K === 'undefined'
  ) {
    console.warn('Food V2: Rider system not ready');
    return;
  }

  const escapeHTML = value =>
    String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));

  const money = value =>
    '฿' + Number(value || 0).toLocaleString('th-TH');

  function shortCode(job) {
    return job.short_code ||
      String(job.id || '').slice(0, 8).toUpperCase();
  }

  // แสดงเลขออเดอร์บนบัตรงานและป๊อปอัปเดิม
  if (typeof riderItems === 'function') {
    const originalItems = riderItems;

    riderItems = function(job) {
      const details = originalItems(job);

      if (job.type !== 'food') return details;

      return `
        <div style="
          background:#fff3da;
          color:#392916;
          padding:10px 12px;
          border-radius:12px;
          font-weight:800;
          margin:8px 0;
        ">
          🍱 ออเดอร์ #${escapeHTML(shortCode(job))}
        </div>
      ` + details;
    };
  }

  // ย่อรูปก่อนส่งไปเซิร์ฟเวอร์
  function compressPhoto(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('กรุณาเลือกรูปภาพอาหาร'));
        return;
      }

      const image = new Image();
      const url = URL.createObjectURL(file);

      image.onload = () => {
        try {
          const scale = Math.min(
            1,
            800 / Math.max(image.width, image.height)
          );

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(
            1, Math.round(image.width * scale)
          );
          canvas.height = Math.max(
            1, Math.round(image.height * scale)
          );

          canvas.getContext('2d').drawImage(
            image, 0, 0, canvas.width, canvas.height
          );

          const data = canvas.toDataURL('image/jpeg', 0.68);

          if (data.length > 900000) {
            throw new Error('รูปภาพใหญ่เกินไป กรุณาถ่ายใหม่');
          }

          resolve(data);
        } catch (error) {
          reject(error);
        } finally {
          URL.revokeObjectURL(url);
        }
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('อ่านไฟล์ภาพไม่สำเร็จ'));
      };

      image.src = url;
    });
  }

  // แสดงหน้าถ่ายรูปก่อนเปลี่ยนสถานะเป็นรับอาหาร
  const originalPicked = actions.picked;

  actions.picked = async function(orderId) {
    const job = jobs.find(item => item.id === orderId);

    // งานเรียกรถและส่งพัสดุยังใช้ระบบเดิม
    if (!job || job.type !== 'food') {
      return originalPicked(orderId);
    }

    if (document.getElementById('krPickupDialog')) return;

    let photoData = '';

    const dialog = document.createElement('dialog');
    dialog.id = 'krPickupDialog';

    dialog.style.cssText = `
      border:0;
      border-radius:20px;
      padding:20px;
      width:min(92vw,430px);
      max-height:90vh;
      overflow:auto;
      background:#fffdf8;
      color:#29251f;
      box-shadow:0 15px 80px #0008;
    `;

    dialog.innerHTML = `
      <h2 style="margin-top:0">
        📷 ยืนยันรับอาหารจากร้าน
      </h2>

      <p id="krPickupCode"
        style="font-size:22px;font-weight:800">
      </p>

      <p>
        ตรวจสอบเลขออเดอร์และจำนวนอาหารกับร้านค้า
        จากนั้นถ่ายรูปอาหารก่อนออกจัดส่ง
      </p>

      <label style="display:block;margin:16px 0">
        <strong>ถ่ายภาพอาหารหรือถุงสินค้า</strong>

        <input id="krPickupFile"
          type="file"
          accept="image/*"
          capture="environment"
          style="display:block;width:100%;
          margin-top:10px;color:#29251f">
      </label>

      <img id="krPickupPreview"
        alt="ตัวอย่างภาพอาหาร"
        style="display:none;width:100%;
        max-height:300px;
        object-fit:contain;
        border-radius:12px;margin:10px 0">

      <p id="krPickupMessage"
        style="color:#c0392b;font-size:13px">
      </p>

      <button id="krPickupConfirm" disabled
        style="width:100%;border:0;
        border-radius:12px;padding:14px;
        background:#e96531;color:white;
        font-weight:800;margin-bottom:10px">
        ยืนยันรับอาหารและอัปเดตลูกค้า
      </button>

      <button id="krPickupCancel"
        style="width:100%;border:0;
        border-radius:12px;padding:12px;
        background:#eee;color:#333">
        ย้อนกลับ
      </button>
    `;

    document.body.appendChild(dialog);

    dialog.querySelector('#krPickupCode').textContent =
      'ออเดอร์ #' + shortCode(job);

    const fileInput = dialog.querySelector('#krPickupFile');
    const preview = dialog.querySelector('#krPickupPreview');
    const message = dialog.querySelector('#krPickupMessage');
    const confirm = dialog.querySelector('#krPickupConfirm');

    dialog.onclose = () => dialog.remove();

    dialog.querySelector('#krPickupCancel').onclick =
      () => dialog.close();

    fileInput.onchange = async () => {
      photoData = '';
      confirm.disabled = true;
      preview.style.display = 'none';
      message.textContent = '';

      const file = fileInput.files?.[0];
      if (!file) return;

      try {
        message.textContent = 'กำลังเตรียมรูปภาพ...';
        photoData = await compressPhoto(file);
        preview.src = photoData;
        preview.style.display = 'block';
        message.textContent = '';
        confirm.disabled = false;
      } catch (error) {
        message.textContent = error.message;
      }
    };

    confirm.onclick = async () => {
      if (!photoData) return;

      confirm.disabled = true;
      message.textContent = 'กำลังบันทึกภาพและสถานะ...';

      try {
        // API ฝั่งเซิร์ฟเวอร์จะตรวจว่าภาพถูกบันทึก
        // ก่อนเปลี่ยนสถานะเป็น picked
        await K.request(
          '/orders/' + encodeURIComponent(orderId) + '/status',
          {
            method: 'POST',
            body: JSON.stringify({
              status: 'picked',
              photo: photoData
            })
          }
        );

        dialog.close();

        toast('รับอาหารแล้ว กำลังจัดส่งให้ลูกค้า');

        if (typeof riderSync === 'function') {
          await riderSync();
        }
      } catch (error) {
        message.textContent =
          'บันทึกไม่สำเร็จ: ' + error.message;
        confirm.disabled = false;
      }
    };

    dialog.showModal();
  };

  // แสดงสรุปยอดหลังส่งอาหารสำเร็จ
  const originalDelivered = actions.delivered;

  actions.delivered = async function(orderId) {
    const job = jobs.find(item => item.id === orderId);

    // ใช้ระบบเดิมยืนยันการส่งสำเร็จก่อน
    await originalDelivered(orderId);

    if (!job || job.type !== 'food') return;

    const total = Number(job.total || (
      Number(job.goods_total || 0) +
      Number(job.fee || 0)
    ));

    const dialog = document.createElement('dialog');

    dialog.style.cssText = `
      border:0;
      border-radius:20px;
      padding:22px;
      width:min(92vw,420px);
      background:#fffdf8;
      color:#29251f;
      box-shadow:0 15px 80px #0008;
    `;

    dialog.innerHTML = `
      <h2>✅ ส่งอาหารสำเร็จ</h2>

      <p id="krDeliveredCode"></p>

      <div style="background:#fff1d8;
        padding:15px;border-radius:12px">
        <p id="krDeliveredFood"></p>
        <p id="krDeliveredFee"></p>
        <h2 id="krDeliveredTotal"></h2>
      </div>

      <h3>คำแนะนำก่อนรับชำระเงิน</h3>

      <p>
        1. ให้ลูกค้าตรวจสอบรายการและสภาพอาหาร
        <br>
        2. ยืนยันยอดที่ตกลงกับร้านค้าและลูกค้า
        <br>
        3. รับเงินสดหรือโอนตรงตามข้อตกลง
        <br>
        4. ตรวจสอบยอดเงินจริงในบัญชีของผู้รับเงิน
      </p>

      <p style="font-size:12px;color:#666">
        Kranuan Online ไม่ได้รับหรือถือเงินค่าอาหาร
        และค่าจัดส่งแทนคู่ค้า
      </p>

      <button id="krDeliveredClose"
        style="width:100%;border:0;
        border-radius:12px;padding:14px;
        background:#e96531;color:white">
        เสร็จสิ้น
      </button>
    `;

    document.body.appendChild(dialog);

    dialog.querySelector('#krDeliveredCode').textContent =
      'ออเดอร์ #' + shortCode(job);

    dialog.querySelector('#krDeliveredFood').textContent =
      'ค่าอาหาร ' + money(job.goods_total);

    dialog.querySelector('#krDeliveredFee').textContent =
      'ค่าจัดส่ง ' + money(job.fee);

    dialog.querySelector('#krDeliveredTotal').textContent =
      'ยอดรวม ' + money(total);

    dialog.querySelector('#krDeliveredClose').onclick =
      () => dialog.close();

    dialog.onclose = () => dialog.remove();
    dialog.showModal();
  };

  console.log('Kranuan Food Delivery Rider V2 loaded');
})();
