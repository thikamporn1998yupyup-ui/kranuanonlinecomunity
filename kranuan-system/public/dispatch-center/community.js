
/* KRANUAN COMMUNITY CHAT — ANIMATED VERSION */
(() => {
  'use strict';

  if (window.__krCommunityAnimated) return;
  window.__krCommunityAnimated = true;

  const S = {
    dialog: null,
    user: window.K?.user || null,
    csrf: window.K?.csrf || '',
    messages: new Map(),
    pending: new Map(),
    loading: false,
    refreshAgain: false,
    initialized: false,
    pollTimer: null,
    events: null,
    unread: 0,
    pinnedId: '',
    lastMessage: null
  };

  const esc = value => String(value ?? '').replace(
    /[&<>"']/g,
    c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[c]
  );

  const time = value => {
    if (!value) return '';
    return new Date(value).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  function roleLabel(role) {
    return ({
      admin: 'แอดมิน',
      rider: 'ไรเดอร์',
      merchant: 'ร้านค้า'
    })[role] || '';
  }

  async function api(path, body) {
    let csrf = window.K?.csrf || S.csrf;

    if (body && !csrf) {
      const res = await fetch('/api/session', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });
      const session = await res.json();
      if (!res.ok) throw Error('เข้าสู่ระบบไม่สำเร็จ');
      csrf = session.csrf;
      S.csrf = csrf;
      if (session.user) S.user = session.user;
    }

    const res = await fetch('/api/dispatch/' + path, {
      credentials: 'same-origin',
      method: body ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(csrf ? { 'X-CSRF-Token': csrf } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });

    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw Error(result.error || 'เชื่อมต่อไม่ได้');

    return result;
  }

  function showError(message = '') {
    const el = S.dialog?.querySelector('.kc-error');
    if (el) el.textContent = message;
  }

  function isNearBottom() {
    const list = S.dialog?.querySelector('.kc-list');
    if (!list) return true;

    return list.scrollHeight - list.scrollTop -
      list.clientHeight < 130;
  }

  function scrollBottom() {
    const list = S.dialog?.querySelector('.kc-list');
    if (list) list.scrollTop = list.scrollHeight;
  }

  function avatar(message) {
    const name = String(message.name || 'สมาชิก');
    const initial = esc(Array.from(name.trim())[0] || '?');

    // รูปไรเดอร์ที่ได้รับอนุมัติและเปิดเผยสาธารณะ
    const image = message.role === 'rider'
      ? '/api/riders/' +
        encodeURIComponent(message.sender_id) +
        '/photo/avatar'
      : '';

    return `
      <span class="kc-avatar">
        <span>${initial}</span>
        ${image ? `
          <img src="${esc(image)}" alt=""
            loading="lazy"
            onerror="this.remove()">
        ` : ''}
      </span>
    `;
  }

  function messageContent(message, pending = false) {
    const mine = message.sender_id === S.user?.id;
    const role = roleLabel(message.role);

    return `
      <div class="kc-message-main">
        <div class="kc-meta">
          <strong>${esc(message.name || 'สมาชิก')}</strong>
          ${role ? `
            <span class="kc-role ${message.role === 'admin'
              ? 'admin' : ''}">${role}</span>
          ` : ''}
        </div>
        <div class="kc-bubble">${esc(message.body)}</div>
        <div class="kc-time">
          ${esc(time(message.created_at))}
          ${mine ? `<span class="kc-status">
            ${pending ? 'กำลังส่ง…' : '✓ ส่งแล้ว'}
          </span>` : ''}
        </div>
        ${S.user?.role === 'admin' && !pending ? `
          <div class="kc-tools">
            <button type="button" data-action="pin"
              data-id="${esc(message.id)}">📌 ปักหมุด</button>
            <button type="button" data-action="delete"
              data-id="${esc(message.id)}">ซ่อน</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  function createBubble(message, animated = true, pending = false) {
    const mine = message.sender_id === S.user?.id;
    const row = document.createElement('article');

    row.className = [
      'kc-row',
      mine ? 'mine' : '',
      message.role === 'admin' ? 'admin' : '',
      animated ? 'kc-animate' : ''
    ].join(' ');

    row.dataset.id = message.id || '';
    row.innerHTML = avatar(message) +
      messageContent(message, pending);

    return row;
  }

  function updateBadge(count) {
    S.unread = Math.min(99, Math.max(0, count));

    let badge = document.getElementById('krCommunityUnread');

    if (!badge) {
      const dock = document.querySelector(
        '#dispatchDock [data-bell]'
      );

      if (!dock) return;

      badge = document.createElement('span');
      badge.id = 'krCommunityUnread';
      dock.appendChild(badge);
    }

    badge.hidden = S.unread === 0;
    badge.textContent = S.unread >= 99
      ? '99+'
      : String(S.unread);

    const tab = document.querySelector(
      '#dispatchChatDialog [data-inbox-tab="history"]'
    );

    if (tab) {
      let countEl = tab.querySelector('.kc-tab-count');

      if (!countEl) {
        countEl = document.createElement('span');
        countEl.className = 'kc-tab-count';
        tab.appendChild(countEl);
      }

      countEl.hidden = S.unread === 0;
      countEl.textContent = S.unread;
    }
  }

  function readKey() {
    return S.user
      ? 'kranuan.community.read.' + S.user.id
      : '';
  }

  function updateUnread(messages) {
    if (!S.user || !messages.length) return;

    const key = readKey();
    const latest = messages[messages.length - 1];
    let lastRead = localStorage.getItem(key);

    if (!lastRead || S.dialog?.open) {
      localStorage.setItem(key, latest.created_at);
      lastRead = latest.created_at;
    }

    const unread = messages.filter(message =>
      message.sender_id !== S.user.id &&
      message.created_at > lastRead
    ).length;

    updateBadge(unread);
  }

  function markRead() {
    if (S.lastMessage?.created_at && S.user) {
      localStorage.setItem(
        readKey(),
        S.lastMessage.created_at
      );
    }

    updateBadge(0);
  }

  function render(messages, pinned) {
    const list = S.dialog?.querySelector('.kc-list');
    if (!list) return;

    const firstLoad = !S.initialized;
    const nearBottom = isNearBottom();

    const visible = messages.filter(
      message => message.id !== pinned?.id
    );

    const ids = new Set(visible.map(message => message.id));

    // ลบเฉพาะข้อความที่ถูกซ่อนหรือลบออกแล้ว
    for (const [id, element] of S.messages) {
      if (!ids.has(id)) {
        element.remove();
        S.messages.delete(id);
      }
    }

    const empty = list.querySelector('.kc-empty');
    if (visible.length) empty?.remove();

    let added = 0;

    for (const message of visible) {
      if (S.messages.has(message.id)) continue;

      let row = null;

      // จับคู่ข้อความที่แสดงล่วงหน้าไว้ตอนกดส่ง
      if (message.sender_id === S.user?.id) {
        for (const [key, item] of S.pending) {
          if (item.body === message.body) {
            row = item.row;
            row.dataset.id = message.id;

            const state = row.querySelector('.kc-status');
            if (state) state.textContent = '✓ ส่งแล้ว';

            S.pending.delete(key);
            break;
          }
        }
      }

      if (!row) {
        row = createBubble(message, !firstLoad);
      }

      S.messages.set(message.id, row);
      list.appendChild(row);
      added++;
    }

    // ข้อความที่กำลังส่งยังต้องอยู่ท้ายรายการ
    for (const item of S.pending.values()) {
      if (item.row.isConnected) {
        list.appendChild(item.row);
      }
    }

    if (!visible.length && !S.pending.size) {
      list.innerHTML = `
        <div class="kc-empty">
          💬<p>ยังไม่มีข้อความ</p>
          <small>มาเริ่มพูดคุยกับคนกระนวนกัน</small>
        </div>
      `;
    }

    const pin = S.dialog.querySelector('.kc-pin');
    pin.hidden = !pinned;
    pin.textContent = pinned
      ? '📌 ' + pinned.name + ': ' + pinned.body
      : '';

    S.initialized = true;

    if (firstLoad || nearBottom || S.pending.size) {
      scrollBottom();
    } else if (added) {
      const jump = S.dialog.querySelector('.kc-jump');
      jump.hidden = false;
      jump.textContent = '↓ มีข้อความใหม่';
    }
  }

  async function refresh() {
    if (S.loading) {
      S.refreshAgain = true;
      return;
    }

    if (document.hidden) return;

    S.loading = true;

    try {
      if (!S.user) {
        const session = await api('session');
        S.user = session.user;
      }

      const data = await api('community');

      if (!Array.isArray(data.messages)) {
        throw Error('ข้อมูลข้อความไม่ถูกต้อง');
      }

      S.lastMessage = data.messages.at(-1) || null;
      updateUnread(data.messages);

      if (S.dialog?.open) {
        render(data.messages, data.pinned);
        showError('');
      }
    } catch (error) {
      if (S.dialog?.open) showError(error.message);
    } finally {
      S.loading = false;

      if (S.refreshAgain) {
        S.refreshAgain = false;
        setTimeout(refresh, 150);
      }
    }
  }

  async function send(event) {
    event.preventDefault();

    const input = S.dialog.querySelector('.kc-input');
    const text = input.value.trim();

    if (!text) return;

    if (!S.user) {
      showError('กรุณาเข้าสู่ระบบก่อนส่งข้อความ');
      return;
    }

    const key = crypto.randomUUID();
    const message = {
      id: 'pending-' + key,
      sender_id: S.user.id,
      name: S.user.name,
      role: S.user.role,
      body: text,
      created_at: new Date().toISOString()
    };

    // แสดงข้อความทันที ไม่ต้องรอเครือข่าย
    const row = createBubble(message, true, true);
    const list = S.dialog.querySelector('.kc-list');

    list.querySelector('.kc-empty')?.remove();
    list.appendChild(row);

    S.pending.set(key, { body: text, row });

    input.value = '';
    input.style.height = '';
    scrollBottom();
    showError('');

    try {
      const result = await api('community', {
        message: text,
        client_key: key
      });

      const item = S.pending.get(key);

      if (item) {
        item.row.dataset.id = result.id;

        const state = item.row.querySelector('.kc-status');
        if (state) state.textContent = '✓ ส่งแล้ว';

        S.messages.set(result.id, item.row);
        S.pending.delete(key);
      }

      refresh();
    } catch (error) {
      const item = S.pending.get(key);

      if (item) {
        item.row.remove();
        S.pending.delete(key);
      }

      if (!input.value.trim()) input.value = text;

      showError('ส่งข้อความไม่สำเร็จ: ' + error.message);
    }
  }

  function build() {
    if (S.dialog) return;

    const style = document.createElement('style');
    style.textContent = `
      #krCommunityDialog {
        box-sizing:border-box;
        width:min(100%,500px);
        max-width:500px;
        height:90dvh;
        max-height:90dvh;
        margin:auto auto 0;
        padding:0;
        border:0;
        border-radius:24px 24px 0 0;
        background:white;
        color:#283441;
        font:14px/1.5 system-ui,Tahoma,sans-serif;
        overflow:hidden;
      }
      #krCommunityDialog::backdrop {
        background:#14202baa;
      }
      #krCommunityDialog * {box-sizing:border-box}
      #krCommunityDialog .kc-shell {
        height:100%;
        display:flex;
        flex-direction:column;
        position:relative;
      }
      #krCommunityDialog header {
        display:flex;
        align-items:center;
        gap:12px;
        padding:16px;
        border-bottom:1px solid #eee;
        background:#fff9f3;
      }
      #krCommunityDialog h2 {
        flex:1;
        font-size:18px;
        margin:0;
      }
      #krCommunityDialog button {cursor:pointer}
      #krCommunityDialog .kc-close {
        border:0;
        background:#eee;
        border-radius:12px;
        width:38px;
        height:38px;
        font-size:24px;
      }
      #krCommunityDialog .kc-pin {
        margin:9px 12px 0;
        padding:10px;
        background:#fff2d7;
        border-radius:12px;
        white-space:pre-wrap;
        max-height:100px;
        overflow:auto;
      }
      #krCommunityDialog .kc-list {
        flex:1;
        min-height:0;
        overflow-y:auto;
        padding:18px 12px;
        background:#f6f7f9;
        overscroll-behavior:contain;
      }
      #krCommunityDialog .kc-row {
        display:flex;
        align-items:flex-end;
        gap:9px;
        margin-bottom:15px;
      }
      #krCommunityDialog .kc-row.mine {
        flex-direction:row-reverse;
      }
      #krCommunityDialog .kc-avatar {
        width:35px;
        height:35px;
        flex:none;
        position:relative;
        display:grid;
        place-items:center;
        border-radius:50%;
        background:#dceaf3;
        color:#537089;
        font-weight:800;
        overflow:hidden;
      }
      #krCommunityDialog .kc-row.mine .kc-avatar {
        background:#ffdfc9;
        color:#b65e2c;
      }
      #krCommunityDialog .kc-avatar img {
        position:absolute;
        inset:0;
        width:100%;
        height:100%;
        object-fit:cover;
      }
      #krCommunityDialog .kc-message-main {
        max-width:min(79%,340px);
        min-width:0;
      }
      #krCommunityDialog .kc-meta {
        display:flex;
        align-items:center;
        flex-wrap:wrap;
        gap:6px;
        font-size:11px;
        color:#7c8792;
        margin-bottom:4px;
      }
      #krCommunityDialog .kc-row.mine .kc-meta {
        justify-content:flex-end;
      }
      #krCommunityDialog .kc-role {
        background:#e5edf7;
        padding:1px 6px;
        border-radius:6px;
        color:#47647f;
        font-size:10px;
      }
      #krCommunityDialog .kc-role.admin {
        background:#e6b75e;
        color:#342814;
      }
      #krCommunityDialog .kc-bubble {
        display:inline-block;
        max-width:100%;
        padding:11px 14px;
        border-radius:17px 17px 17px 5px;
        background:#fff;
        color:#263442;
        box-shadow:0 2px 9px #0000000c;
        white-space:pre-wrap;
        overflow-wrap:anywhere;
      }
      #krCommunityDialog .kc-row.mine .kc-bubble {
        border-radius:17px 17px 5px 17px;
        background:linear-gradient(135deg,#ed9259,#d56a35);
        color:#fff;
      }
      #krCommunityDialog .kc-row.admin:not(.mine) .kc-bubble {
        background:#28394d;
        color:#fff;
      }
      #krCommunityDialog .kc-time {
        display:flex;
        gap:7px;
        color:#9aa3ad;
        font-size:10px;
        margin-top:3px;
      }
      #krCommunityDialog .kc-row.mine .kc-time {
        justify-content:flex-end;
      }
      #krCommunityDialog .kc-status {
        color:#d46b36;
      }
      #krCommunityDialog .kc-tools {
        display:flex;
        gap:5px;
        margin-top:5px;
      }
      #krCommunityDialog .kc-tools button {
        padding:3px 7px;
        border:1px solid #ddd;
        border-radius:7px;
        background:#fff;
        font-size:10px;
      }
      #krCommunityDialog .kc-error {
        min-height:18px;
        color:#b42318;
        padding:0 12px;
        font-size:12px;
      }
      #krCommunityDialog .kc-compose {
        display:flex;
        gap:9px;
        align-items:flex-end;
        padding:12px 12px max(12px,env(safe-area-inset-bottom));
        border-top:1px solid #eee;
      }
      #krCommunityDialog .kc-input {
        flex:1;
        min-width:0;
        min-height:43px;
        max-height:116px;
        padding:11px;
        border:1px solid #ddd;
        border-radius:15px;
        background:#f7f7f8;
        font:inherit;
        resize:none;
      }
      #krCommunityDialog .kc-send {
        width:45px;
        height:45px;
        border:0;
        border-radius:14px;
        background:#dc743d;
        color:#fff;
        font-size:19px;
      }
      #krCommunityDialog .kc-send:active {
        transform:scale(.94);
      }
      #krCommunityDialog .kc-jump {
        position:absolute;
        bottom:77px;
        left:50%;
        transform:translateX(-50%);
        border:0;
        border-radius:22px;
        background:#28394d;
        color:white;
        padding:8px 13px;
        box-shadow:0 4px 15px #0003;
      }
      #krCommunityDialog .kc-empty {
        padding:50px 15px;
        text-align:center;
        color:#929ca5;
      }
      #krCommunityDialog .kc-animate {
        animation:kcPop .37s cubic-bezier(.2,1.3,.4,1) both;
      }
      #krCommunityDialog .kc-row.mine.kc-animate {
        animation:kcSend .43s cubic-bezier(.2,1.3,.4,1) both;
      }
      @keyframes kcPop {
        from {
          opacity:0;
          transform:translateY(18px) scale(.96);
        }
        to {
          opacity:1;
          transform:translateY(0) scale(1);
        }
      }
      @keyframes kcSend {
        0% {
          opacity:.3;
          transform:translateY(42px) scale(.82);
        }
        70% {
          transform:translateY(-5px) scale(1.025);
        }
        100% {
          opacity:1;
          transform:translateY(0) scale(1);
        }
      }
      #krCommunityUnread {
        position:absolute;
        top:-8px;
        left:-7px;
        min-width:20px;
        height:20px;
        padding:0 4px;
        display:grid;
        place-items:center;
        border:2px solid #fff;
        border-radius:20px;
        background:#e74c3c;
        color:white;
        font:700 10px Tahoma,sans-serif;
      }
      #krCommunityUnread[hidden] {display:none}
      .kc-tab-count {
        border-radius:12px;
        background:#e74c3c;
        color:#fff;
        font-size:10px;
        padding:1px 6px;
      }
      .kc-tab-count[hidden] {display:none}
      @media (prefers-reduced-motion:reduce) {
        #krCommunityDialog .kc-animate,
        #krCommunityDialog .kc-row.mine.kc-animate {
          animation:none;
        }
      }
      @media (min-width:720px) {
        #krCommunityDialog {
          margin:auto;
          border-radius:24px;
          height:min(85vh,850px);
        }
      }
    `;
    document.head.appendChild(style);

    const dialog = document.createElement('dialog');
    dialog.id = 'krCommunityDialog';
    dialog.innerHTML = `
      <div class="kc-shell">
        <header>
          <h2>💬 แชทอำเภอกระนวน</h2>
          <button type="button" class="kc-close"
            data-close aria-label="ปิด">×</button>
        </header>
        <div class="kc-pin" hidden></div>
        <div class="kc-list">
          <div class="kc-empty">กำลังโหลดข้อความ…</div>
        </div>
        <button class="kc-jump" type="button" hidden>
          ↓ มีข้อความใหม่
        </button>
        <p class="kc-error" role="status"></p>
        <form class="kc-compose">
          <textarea class="kc-input" maxlength="500"
            rows="1" placeholder="พูดคุยกับคนกระนวน…"
            aria-label="พิมพ์ข้อความ"></textarea>
          <button class="kc-send" type="submit"
            aria-label="ส่งข้อความ">➤</button>
        </form>
      </div>
    `;

    document.body.appendChild(dialog);
    S.dialog = dialog;

    dialog.querySelector('[data-close]').onclick =
      () => dialog.close();

    dialog.querySelector('.kc-jump').onclick = () => {
      scrollBottom();
      dialog.querySelector('.kc-jump').hidden = true;
      markRead();
    };

    dialog.querySelector('form').onsubmit = send;

    const input = dialog.querySelector('.kc-input');

    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height =
        Math.min(input.scrollHeight, 116) + 'px';
    });

    input.addEventListener('keydown', event => {
      if (
        event.key === 'Enter' &&
        !event.shiftKey &&
        !event.isComposing
      ) {
        event.preventDefault();
        dialog.querySelector('form').requestSubmit();
      }
    });

    dialog.addEventListener('click', async event => {
      const button = event.target.closest('[data-action]');
      if (!button || S.user?.role !== 'admin') return;

      const action = button.dataset.action;
      const id = button.dataset.id;

      if (
        action === 'delete' &&
        !confirm('ซ่อนข้อความนี้จากแชทอำเภอ?')
      ) return;

      button.disabled = true;

      try {
        await api(
          'community/' + encodeURIComponent(id) +
          '/' + action,
          {}
        );

        await refresh();
      } catch (error) {
        showError(error.message);
      } finally {
        button.disabled = false;
      }
    });
  }

  window.openKranuanCommunity = async function () {
    build();

    if (!S.dialog.open) S.dialog.showModal();

    if (!S.user) {
      try {
        const session = await api('session');
        S.user = session.user;
      } catch (error) {
        showError(error.message);
        return;
      }
    }

    markRead();
    await refresh();

    S.dialog.querySelector('.kc-input')
      .focus({ preventScroll: true });
  };

  // เซิร์ฟเวอร์แจ้งเมื่อข้อมูลเปลี่ยน
  function startUpdates() {
    if (S.events || !window.EventSource) return;

    S.events = new EventSource('/api/dispatch/events');

    S.events.addEventListener('refresh', () => {
      refresh();
    });

    S.events.onerror = () => {
      // EventSource จะเชื่อมต่อใหม่เอง
    };
  }

  startUpdates();

  // สำรองกรณีเน็ตหลุดหรือ EventSource ไม่พร้อม
  S.pollTimer = setInterval(() => {
    if (!document.hidden) refresh();
  }, 10000);

  window.addEventListener('kranuan:member-changed', () => {
    S.user = window.K?.user || null;
    S.initialized = false;
    S.messages.clear();
    updateBadge(0);
    refresh();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refresh();
  });

  // เริ่มตรวจข้อความใหม่ แม้ยังไม่ได้เปิดแชทอำเภอ
  setTimeout(refresh, 700);
})();
