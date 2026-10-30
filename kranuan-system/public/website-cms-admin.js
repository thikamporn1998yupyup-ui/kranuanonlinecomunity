
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
