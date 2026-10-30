
/* Kranuan Online CMS — Admin Panel */
(() => {
  'use strict';

  const originalRender = staffRender;
  const escape = kEscape;

  const fields = [
    ['brand_name', 'ชื่อเว็บไซต์'],
    ['logo', 'โลโก้เว็บไซต์ (URL รูป)'],
    ['hero_image', 'ภาพแบนเนอร์หลัก (URL รูป)'],
    ['hero_title', 'หัวข้อแบนเนอร์'],
    ['hero_desc', 'คำอธิบายแบนเนอร์']
  ];
  // อัปโหลดรูป CMS ผ่าน API ที่ตรวจสิทธิ์แอดมิน
  async function uploadCmsImage(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      throw Error('รองรับเฉพาะ JPG, PNG และ WebP');
    }
    if (file.size > 15000000) {
      throw Error('รูปต้องไม่เกิน 15 MB');
    }

    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

          let encoded = '';
          for (const quality of [0.85, 0.7, 0.55, 0.4, 0.25]) {
            encoded = canvas.toDataURL('image/jpeg', quality);
            if (encoded.length < 600000) break;
          }
          if (encoded.length >= 600000) {
            throw Error('รูปใหญ่เกินไป กรุณาใช้ภาพขนาดเล็กลง');
          }
          resolve(encoded);
        } catch (e) {
          reject(e);
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(Error('เปิดไฟล์รูปไม่สำเร็จ'));
      };
      img.src = objectUrl;
    });

    const response = await K.request('/admin/site-cms/upload', {
      method: 'POST',
      body: JSON.stringify({ image })
    });
    return response.url;
  }


  let settings = {};
  let loading = false;

  staffRender = function () {
    originalRender();

    if (K.user?.role !== 'admin') return;

    const nav = document.getElementById('staffNav');
    if (!nav) return;

    const button = document.createElement('button');
    button.className =
      'kbutton' + (staffTab === 'website-cms' ? ' active' : '');
    button.textContent = 'จัดการเว็บไซต์';
    button.onclick = () => staffGo('website-cms');
    nav.append(button);

    if (staffTab === 'website-cms') loadCMS();
  };

  async function loadCMS() {
    const app = document.getElementById('staffApp');
    if (!app || loading) return;

    loading = true;
    app.innerHTML = '<div class="card">กำลังโหลด CMS...</div>';

    try {
      const result = await K.request('/admin/site-cms');
      settings = result.draft || result.settings || {};
      renderEditor();
    } catch (err) {
      app.innerHTML =
        '<div class="card">ยังเชื่อมต่อ CMS ไม่ได้: ' +
        escape(err.message) + '</div>';
    } finally {
      loading = false;
    }
  }

  function renderEditor() {
    const app = document.getElementById('staffApp');

    app.innerHTML =
      '<h2>จัดการหน้าเว็บไซต์</h2>' +
      '<p class="muted">แก้ไขแล้วบันทึกฉบับร่างก่อนเผยแพร่</p>' +
      '<form id="cmsForm" class="card">' +
      fields.map(([key, title]) =>
        '<label>' + escape(title) +
        '<input name="' + key + '" value="' +
        escape(settings[key] || '') + '">' +
        '</label>'
      ).join('') +
      '<div class="toolbar">' +
      '<button class="kbutton primary" type="submit">' +
      'บันทึกฉบับร่าง</button>' +
      '<button class="kbutton" type="button" id="cmsPublish">' +
      'เผยแพร่เว็บไซต์</button>' +
      '</div><p id="cmsMessage" role="status"></p>' +
      '</form>';

    const form = document.getElementById('cmsForm');
    for (const fieldName of ['logo', 'hero_image']) {
      const input = form.elements.namedItem(fieldName);
      if (!input) continue;

      const picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = 'image/jpeg,image/png,image/webp';
      picker.style.marginTop = '8px';

      const preview = document.createElement('img');
      preview.alt = 'ตัวอย่างภาพ';
      preview.style.cssText =
        'display:none;width:100%;max-width:320px;max-height:190px;object-fit:contain;margin-top:10px;border-radius:12px';

      const updatePreview = () => {
        const value = input.value.trim();
        if (!value || !/^(https:\/\/|\/api\/site-cms\/image\/)/.test(value)) {
          preview.style.display = 'none';
          preview.removeAttribute('src');
          return;
        }
        preview.src = value;
        preview.style.display = 'block';
      };

      input.after(picker, preview);
      input.addEventListener('input', updatePreview);
      updatePreview();

      picker.addEventListener('change', async () => {
        const file = picker.files?.[0];
        if (!file) return;

        picker.disabled = true;
        msg.textContent = 'กำลังอัปโหลดภาพ...';

        try {
          input.value = await uploadCmsImage(file);
          updatePreview();
          msg.textContent = 'อัปโหลดสำเร็จ กรุณากดบันทึกฉบับร่าง';
        } catch (err) {
          msg.textContent = 'อัปโหลดไม่สำเร็จ: ' + err.message;
        } finally {
          picker.disabled = false;
          picker.value = '';
        }
      });
    }

    const msg = document.getElementById('cmsMessage');

    form.onsubmit = async event => {
      event.preventDefault();
      const button = event.submitter;
      button.disabled = true;

      try {
        const data = Object.fromEntries(new FormData(form));
        await K.request('/admin/site-cms', {
          method: 'POST',
          body: JSON.stringify({ settings: data })
        });
        msg.textContent = 'บันทึกฉบับร่างแล้ว';
      } catch (err) {
        msg.textContent = err.message;
      } finally {
        button.disabled = false;
      }
    };

    document.getElementById('cmsPublish').onclick = async event => {
      const button = event.currentTarget;
      button.disabled = true;

      try {
        await K.request('/admin/site-cms/publish', {
          method: 'POST',
          body: '{}'
        });
        msg.textContent = 'เผยแพร่เว็บไซต์แล้ว';
      } catch (err) {
        msg.textContent = err.message;
      } finally {
        button.disabled = false;
      }
    };
  }
})();
