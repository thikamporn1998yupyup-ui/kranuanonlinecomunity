
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

    
    // งานอาหารและพัสดุต้องถ่ายรูปตอนรับสินค้า
    // งานส่งคนยังใช้ขั้นตอนรับผู้โดยสารเดิม
    if (!job || !['food', 'parcel'].includes(job.type)) {
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

    // เปลี่ยนข้อความหน้ากล้องสำหรับงานส่งพัสดุ
    if (job.type === 'parcel') {
      dialog.querySelector('h2').textContent =
        '📦 ยืนยันรับพัสดุจากผู้ส่ง';

      dialog.querySelectorAll('p')[1].textContent =
        'ตรวจสภาพและจำนวนพัสดุกับผู้ส่ง ' +
        'จากนั้นถ่ายรูปพัสดุก่อนเริ่มจัดส่ง ' +
        'หลีกเลี่ยงการถ่ายข้อมูลส่วนตัวที่ไม่จำเป็น';

      dialog.querySelector('label strong').textContent =
        'ถ่ายภาพพัสดุตอนรับ';

      dialog.querySelector('#krPickupConfirm').textContent =
        'ยืนยันรับพัสดุและเริ่มจัดส่ง';
    }

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



  // FOOD V4: ถ่ายภาพก่อนยืนยันส่งถึงลูกค้า
  const originalDelivered = actions.delivered;

  actions.delivered = async function(orderId) {
    const job = jobs.find(j => j.id === orderId);

    if (!job || job.type !== 'food') {
      return originalDelivered(orderId);
    }

    if (document.getElementById('krDeliveryProofDialog')) {
      return;
    }

    let photo = '';

    const d = document.createElement('dialog');
    d.id = 'krDeliveryProofDialog';
    d.style.cssText = `
      width:min(92vw,440px);
      max-height:85vh;
      overflow:auto;
      border:0;
      border-radius:22px;
      padding:22px;
      background:#fffdf9;
      color:#29251f;
    `;

    d.innerHTML = `
      <h2>📷 ยืนยันส่งถึงลูกค้า</h2>
      <p>ถ่ายภาพอาหารที่ส่งถึงจุดหมาย</p>
      <p style="font-size:12px;color:#777">
        หลีกเลี่ยงใบหน้าและข้อมูลส่วนตัวของลูกค้า
      </p>

      <input id="krDeliveryPhoto"
        type="file"
        accept="image/*"
        capture="environment"
        style="width:100%;margin:12px 0">

      <img id="krDeliveryPreview"
        alt="ภาพหลักฐานการส่ง"
        style="display:none;width:100%;
        max-height:280px;object-fit:contain;
        border-radius:12px;margin-bottom:12px">

      <p id="krDeliveryError"
        role="status" style="color:#b43a32"></p>

      <button id="krDeliveryConfirm"
        type="button" disabled
        style="width:100%;padding:15px;
        border:0;border-radius:12px;
        background:#e96531;color:#fff;
        font-weight:800">
        ยืนยันส่งงานสำเร็จ
      </button>

      <button id="krDeliveryCancel"
        type="button"
        style="width:100%;padding:13px;
        border:0;border-radius:12px;
        margin-top:10px;background:#eee">
        ยกเลิก
      </button>
    `;

    document.body.appendChild(d);

    const input = d.querySelector('#krDeliveryPhoto');
    const preview = d.querySelector('#krDeliveryPreview');
    const confirm = d.querySelector('#krDeliveryConfirm');
    const cancel = d.querySelector('#krDeliveryCancel');
    const error = d.querySelector('#krDeliveryError');

    d.onclose = () => d.remove();
    cancel.onclick = () => d.close();

    input.onchange = async () => {
      photo = '';
      confirm.disabled = true;
      preview.style.display = 'none';

      if (!input.files?.[0]) return;

      try {
        error.textContent = 'กำลังเตรียมรูปภาพ...';
        photo = await compressPhoto(input.files[0]);

        if (photo.length > 700000) {
          throw Error('ภาพใหญ่เกินไป กรุณาถ่ายใหม่');
        }

        preview.src = photo;
        preview.style.display = 'block';
        confirm.disabled = false;
        error.textContent = '';
      } catch (e) {
        photo = '';
        error.textContent = e.message;
      }
    };

    confirm.onclick = async () => {
      if (!photo) return;

      confirm.disabled = true;
      cancel.disabled = true;
      input.disabled = true;
      error.textContent = 'กำลังบันทึกหลักฐาน...';

      try {
        await K.request(
          '/orders/' + encodeURIComponent(orderId) + '/status',
          {
            method: 'POST',
            body: JSON.stringify({
              status: 'done',
              photo: photo
            })
          }
        );

        d.close();

        window.dispatchEvent(
          new CustomEvent('kranuan:delivery-completed', {
            detail: { orderId: String(orderId) }
          })
        );

        toast('ส่งงานสำเร็จ กำลังเปิดหน้าชำระเงิน');

        // เปิดหน้ารับเงินสำหรับไรเดอร์โดยตรง
        if (
          typeof window.KranuanOpenOrderPayment === 'function'
        ) {
          await window.KranuanOpenOrderPayment(orderId);
        }

        if (typeof riderSync === 'function') {
          await riderSync();
        }
      } catch (e) {
        error.textContent = 'เกิดข้อผิดพลาด: ' + e.message;
        confirm.disabled = false;
        cancel.disabled = false;
        input.disabled = false;
      }
    };

    d.showModal();

    // เปิดกล้องทันทีเมื่อเบราว์เซอร์อนุญาต
    try {
      input.click();
    } catch (_) {
      // หากเปิดไม่ได้ ไรเดอร์กดเลือกกล้องเองได้
    }
  };


  console.log('Kranuan Food Delivery Rider V2 loaded');
})();
