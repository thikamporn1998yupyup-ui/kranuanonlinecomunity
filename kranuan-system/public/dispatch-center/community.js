
(() => {
  'use strict';

  let dialog, user, refreshTimer;

  const escapeHtml = value =>
    String(value ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#39;'
    })[c]);

  async function request(path, body) {
    let csrf = window.K?.csrf;

    if (body && !csrf) {
      const session = await fetch('/api/session', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {'Content-Type': 'application/json'},
        body: '{}'
      }).then(r => r.json());
      csrf = session.csrf;
    }

    const response = await fetch('/api/dispatch/' + path, {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...(csrf ? {'X-CSRF-Token': csrf} : {})
      },
      ...(body ? {body: JSON.stringify(body)} : {})
    });

    const data = await response.json();
    if (!response.ok) throw Error(data.error || 'เชื่อมต่อไม่ได้');
    return data;
  }

  function build() {
    if (dialog) return;

    const style = document.createElement('style');
    style.textContent = `
      #krCommunityDialog {
        box-sizing:border-box;width:min(100%,480px);height:90dvh;
        max-height:90dvh;margin:auto auto 0;padding:0;
        border:0;border-radius:22px 22px 0 0;
        font:14px/1.5 sans-serif;background:#fff;color:#292929
      }
      #krCommunityDialog::backdrop {background:#0009}
      #krCommunityDialog .kc-shell {
        display:flex;flex-direction:column;height:100%
      }
      #krCommunityDialog header {
        display:flex;justify-content:space-between;
        align-items:center;padding:15px;border-bottom:1px solid #eee
      }
      #krCommunityDialog header h2 {font-size:18px;margin:0}
      #krCommunityDialog button {cursor:pointer}
      #krCommunityDialog .kc-pin {
        margin:10px;padding:12px;background:#fff0d9;
        border-radius:12px;white-space:pre-wrap
      }
      #krCommunityDialog .kc-list {
        flex:1;overflow:auto;padding:12px
      }
      #krCommunityDialog .kc-message {
        background:#f3f3f3;border-radius:13px;
        padding:10px 12px;margin-bottom:10px;
        overflow-wrap:anywhere
      }
      #krCommunityDialog .kc-message.admin {
        background:#273142;color:#fff
      }
      #krCommunityDialog .kc-meta {
        display:flex;align-items:center;gap:7px;
        font-size:12px;margin-bottom:5px
      }
      #krCommunityDialog .kc-role {
        background:#e3a24d;color:#251900;
        border-radius:5px;padding:1px 6px;font-size:10px
      }
      #krCommunityDialog .kc-message p {
        margin:0;white-space:pre-wrap
      }
      #krCommunityDialog .kc-tools button {
        margin:6px 5px 0 0;font-size:11px
      }
      #krCommunityDialog form {
        display:flex;gap:8px;padding:12px;
        border-top:1px solid #eee
      }
      #krCommunityDialog input {
        flex:1;min-width:0;padding:12px;
        border:1px solid #ddd;border-radius:12px
      }
      #krCommunityDialog form button {
        border:0;border-radius:12px;
        background:#d46231;color:#fff;padding:0 16px
      }
      #krCommunityDialog .kc-error {
        color:#b42318;padding:0 12px;font-size:12px
      }
    `;
    document.head.appendChild(style);

    dialog = document.createElement('dialog');
    dialog.id = 'krCommunityDialog';
    dialog.innerHTML = `
      <div class="kc-shell">
        <header>
          <h2>💬 แชทอำเภอกระนวน</h2>
          <button type="button" data-close>ปิด</button>
        </header>
        <div class="kc-pin" hidden></div>
        <div class="kc-list"></div>
        <div class="kc-error" role="status"></div>
        <form>
          <input maxlength="500" required
                 placeholder="พูดคุยกับคนกระนวน...">
          <button type="submit">ส่ง</button>
        </form>
      </div>
    `;
    document.body.appendChild(dialog);

    dialog.querySelector('[data-close]').onclick = () => dialog.close();
    dialog.addEventListener('close', () => {
      clearInterval(refreshTimer);
      refreshTimer = null;
    });

    dialog.querySelector('form').onsubmit = async event => {
      event.preventDefault();
      const input = dialog.querySelector('input');
      const message = input.value.trim();
      if (!message) return;

      const button = dialog.querySelector('form button');
      button.disabled = true;
      try {
        await request('community', {
          message,
          client_key: crypto.randomUUID()
        });
        input.value = '';
        await load();
      } catch (error) {
        showError(error.message);
      } finally {
        button.disabled = false;
      }
    };

    dialog.addEventListener('click', async event => {
      const button = event.target.closest('[data-action]');
      if (!button || user?.role !== 'admin') return;

      const action = button.dataset.action;
      const id = button.dataset.id;
      if (action === 'delete' &&
          !confirm('ซ่อนข้อความนี้จากแชทอำเภอ?')) return;

      try {
        await request(
          'community/' + encodeURIComponent(id) + '/' + action,
          {}
        );
        await load();
      } catch (error) {
        showError(error.message);
      }
    });
  }

  function showError(message) {
    dialog.querySelector('.kc-error').textContent = message || '';
  }

  function messageHtml(m) {
    const role = m.role === 'admin' ? 'แอดมิน' :
      m.role === 'rider' ? 'ไรเดอร์' :
      m.role === 'merchant' ? 'ร้านค้า' : '';

    const adminTools = user?.role === 'admin'
      ? `<div class="kc-tools">
          <button data-action="pin" data-id="${escapeHtml(m.id)}">
            📌 ปักหมุด
          </button>
          <button data-action="delete" data-id="${escapeHtml(m.id)}">
            ซ่อนข้อความ
          </button>
        </div>` : '';

    return `
      <article class="kc-message ${m.role === 'admin' ? 'admin' : ''}">
        <div class="kc-meta">
          <strong>${escapeHtml(m.name)}</strong>
          ${role ? `<span class="kc-role">${role}</span>` : ''}
        </div>
        <p>${escapeHtml(m.body)}</p>
        ${adminTools}
      </article>
    `;
  }

  async function load() {
    if (!dialog?.open) return;

    try {
      const data = await request('community');
      const list = dialog.querySelector('.kc-list');
      const atBottom =
        list.scrollHeight - list.scrollTop - list.clientHeight < 100;

      const pin = dialog.querySelector('.kc-pin');
      pin.hidden = !data.pinned;
      pin.textContent = data.pinned
        ? '📌 ประกาศปักหมุด\n' +
          data.pinned.name + ': ' + data.pinned.body
        : '';

      list.innerHTML = data.messages
        .filter(m => m.id !== data.pinned?.id)
        .map(messageHtml).join('') ||
        '<p>ยังไม่มีข้อความ มาเริ่มพูดคุยกันได้เลย</p>';

      if (atBottom) list.scrollTop = list.scrollHeight;
      showError('');
    } catch (error) {
      showError(error.message);
    }
  }

  window.openKranuanCommunity = async function () {
    build();
    if (!dialog.open) dialog.showModal();

    try {
      const session = await request('session');
      user = session.user;
      await load();
      clearInterval(refreshTimer);
      refreshTimer = setInterval(load, 8000);
    } catch (error) {
      showError(error.message);
    }
  };
})();
