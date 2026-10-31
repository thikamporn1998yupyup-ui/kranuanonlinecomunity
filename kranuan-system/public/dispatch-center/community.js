
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

/* FLOATING CHAT BUBBLE — KRANUAN */
(() => {
  'use strict';

  if (window.__krFloatingChatBubble) return;
  window.__krFloatingChatBubble = true;

  const style = document.createElement('style');
  style.textContent = `
    #krCommunityDialog .floating-chat-layer {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 85px;
      display: flex;
      justify-content: center;
      pointer-events: none;
      z-index: 20;
      padding: 0 15px;
    }

    #krCommunityDialog .floating-chat-bubble {
      max-width: 90%;
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: 11px 17px;
      border-radius: 20px;
      background: linear-gradient(135deg,#ec965c,#d96e38);
      color: #fff;
      box-shadow: 0 10px 26px #9c4c3250;
      overflow-wrap: anywhere;
      animation: krBubbleFloat 4s ease-out forwards;
    }

    #krCommunityDialog .floating-chat-bubble strong {
      font-size: 11px;
      opacity: .85;
    }

    #krCommunityDialog .floating-chat-bubble span {
      font-size: 14px;
      font-weight: 500;
    }

    @keyframes krBubbleFloat {
      0% {
        opacity: 0;
        transform: translateY(35px) scale(.8);
      }
      12% {
        opacity: 1;
        transform: translateY(0) scale(1.05);
      }
      23% {
        transform: translateY(-8px) scale(1);
      }
      65% {
        opacity: 1;
        transform: translateY(-28px);
      }
      100% {
        opacity: 0;
        transform: translateY(-105px) scale(.96);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #krCommunityDialog .floating-chat-bubble {
        animation: krBubbleFade 4s ease-out forwards;
      }
      @keyframes krBubbleFade {
        0% { opacity: 0; }
        15%, 65% { opacity: 1; }
        100% { opacity: 0; }
      }
    }
  `;

  document.head.appendChild(style);

  const seen = new WeakSet();

  function attach() {
    const dialog = document.getElementById(
      'krCommunityDialog'
    );

    if (!dialog || dialog.dataset.floatingReady) return;

    const shell = dialog.querySelector('.kc-shell');
    const list = dialog.querySelector('.kc-list');

    if (!shell || !list) return;

    dialog.dataset.floatingReady = '1';

    const layer = document.createElement('div');
    layer.className = 'floating-chat-layer';
    shell.appendChild(layer);

    list.querySelectorAll('.kc-row').forEach(row => {
      seen.add(row);
    });

    function showBubble(row) {
      const text = row.querySelector(
        '.kc-bubble'
      )?.textContent?.trim();

      const name = row.querySelector(
        '.kc-meta strong'
      )?.textContent?.trim() || 'สมาชิก';

      if (!text) return;

      const bubble = document.createElement('div');
      bubble.className = 'floating-chat-bubble';

      const sender = document.createElement('strong');
      sender.textContent = name;

      const message = document.createElement('span');
      message.textContent = text;

      bubble.append(sender, message);

      // แสดงเฉพาะข้อความล่าสุด
      layer.replaceChildren(bubble);

      // หายไปเองหลัง 4 วินาที
      setTimeout(() => bubble.remove(), 4000);
    }

    const observer = new MutationObserver(changes => {
      if (!dialog.open) return;

      let newest = null;

      for (const change of changes) {
        for (const node of change.addedNodes) {
          if (node.nodeType !== 1) continue;

          const rows = node.matches('.kc-row')
            ? [node]
            : [...node.querySelectorAll('.kc-row')];

          for (const row of rows) {
            if (seen.has(row)) continue;
            seen.add(row);
            newest = row;
          }
        }
      }

      if (newest) showBubble(newest);
    });

    observer.observe(list, {
      childList: true
    });
  }

  if (document.body) {
    new MutationObserver(attach).observe(
      document.body,
      { childList: true }
    );
    attach();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      new MutationObserver(attach).observe(
        document.body,
        { childList: true }
      );
      attach();
    });
  }
})();

/* KRANUAN — ADMIN MARKET ANNOUNCEMENTS */
(() => {
  'use strict';

  if (window.__krMarketAnnouncements) return;
  window.__krMarketAnnouncements = true;

  const MARKER = /\[\[KR-MARKET:([a-zA-Z0-9_-]{6,120})\]\]/;
  const CATS = [
    'ของกิน/อาหารสด',
    'ของใช้/มือสอง',
    'ผลผลิตเกษตร',
    'บริการ/รับจ้าง',
    'ฝากร้าน/แจกฟรี'
  ];

  const S = {
    user: null,
    chat: null,
    modal: null,
    listings: null
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

  async function api(path, body) {
    let csrf = window.K?.csrf;

    if (body && !csrf) {
      const response = await fetch('/api/session', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });

      const session = await response.json();
      if (!response.ok) {
        throw Error(session.error || 'กรุณาเข้าสู่ระบบ');
      }
      csrf = session.csrf;
    }

    const response = await fetch('/api' + path, {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...(csrf ? { 'X-CSRF-Token': csrf } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw Error(result.error || 'เชื่อมต่อระบบไม่ได้');
    }

    return result;
  }

  function error(message) {
    const el = S.modal?.querySelector('[data-error]');
    if (el) el.textContent = message || '';
  }

  function styles() {
    const style = document.createElement('style');

    style.textContent = `
      #krCommunityDialog .kc-admin-post {
        padding:9px;
        border:0;
        border-radius:11px;
        background:#293b50;
        color:#fff;
        font-size:12px;
        font-weight:700;
        white-space:nowrap;
      }

      #krMarketAttachDialog {
        width:min(94vw,470px);
        max-width:470px;
        max-height:90dvh;
        margin:auto;
        padding:0;
        border:0;
        border-radius:20px;
        background:#fff;
        color:#263547;
        font:14px/1.5 system-ui,Tahoma,sans-serif;
        overflow:auto;
      }

      #krMarketAttachDialog::backdrop {
        background:#141b26aa;
      }

      #krMarketAttachDialog * {
        box-sizing:border-box;
      }

      #krMarketAttachDialog header {
        display:flex;
        justify-content:space-between;
        align-items:center;
        padding:15px;
        border-bottom:1px solid #eee;
      }

      #krMarketAttachDialog h3 {
        margin:0;
        font-size:17px;
      }

      #krMarketAttachDialog button {
        cursor:pointer;
      }

      #krMarketAttachDialog .km-tabs {
        display:flex;
        gap:7px;
        padding:12px;
      }

      #krMarketAttachDialog .km-tabs button {
        flex:1;
        padding:10px 5px;
        border:1px solid #e4e7eb;
        border-radius:10px;
        background:#fff;
        font-size:12px;
        font-weight:700;
      }

      #krMarketAttachDialog .km-tabs
      button[aria-pressed="true"] {
        background:#d66d34;
        color:white;
        border-color:#d66d34;
      }

      #krMarketAttachDialog .km-content {
        padding:0 14px 15px;
      }

      #krMarketAttachDialog label {
        display:grid;
        gap:5px;
        margin:9px 0;
        font-size:12px;
      }

      #krMarketAttachDialog input,
      #krMarketAttachDialog select,
      #krMarketAttachDialog textarea {
        width:100%;
        padding:10px;
        border:1px solid #dce2e8;
        border-radius:10px;
        background:#fff;
        color:#263547;
        font:14px system-ui,Tahoma,sans-serif;
      }

      #krMarketAttachDialog textarea {
        min-height:65px;
        resize:vertical;
      }

      #krMarketAttachDialog .km-list {
        max-height:44dvh;
        overflow:auto;
      }

      #krMarketAttachDialog .km-item {
        width:100%;
        display:block;
        margin:6px 0;
        padding:11px;
        border:1px solid #e8ebef;
        border-radius:11px;
        background:white;
        text-align:left;
        color:#263547;
      }

      #krMarketAttachDialog .km-item small {
        display:block;
        margin-top:4px;
        color:#84909b;
      }

      #krMarketAttachDialog .km-submit {
        width:100%;
        margin-top:10px;
        padding:12px;
        border:0;
        border-radius:11px;
        background:#d66d34;
        color:white;
        font-weight:700;
      }

      #krMarketAttachDialog [data-error] {
        padding:0 14px 12px;
        color:#b63324;
        font-size:12px;
      }

      #krCommunityDialog .kc-market-card {
        margin-top:8px;
        max-width:260px;
        padding:9px;
        border:1px solid #efd7c0;
        border-radius:13px;
        background:#fffaf4;
        color:#263547;
        box-shadow:0 2px 9px #0000000c;
      }

      #krCommunityDialog .kc-market-card img {
        width:100%;
        max-height:125px;
        object-fit:cover;
        border-radius:8px;
      }

      #krCommunityDialog .kc-market-card strong {
        display:block;
        margin-top:5px;
        overflow-wrap:anywhere;
      }

      #krCommunityDialog .kc-market-card small {
        display:block;
        color:#75808b;
        font-size:11px;
      }

      #krCommunityDialog .kc-market-card button {
        margin-top:7px;
        padding:8px 11px;
        border:0;
        border-radius:8px;
        background:#dc743d;
        color:#fff;
        font-size:12px;
      }
    `;

    document.head.appendChild(style);
  }

  // Share an existing market listing into group chat
  async function share(listing) {
    if (S.user?.role !== 'admin') {
      throw Error('เฉพาะแอดมินเท่านั้น');
    }

    const message =
      '📣 ประกาศตลาด: ' +
      String(listing.title).slice(0, 80) +
      '\n[[KR-MARKET:' + listing.id + ']]';

    await api('/dispatch/community', {
      message,
      client_key: crypto.randomUUID()
    });
  }

  // Open the real listing in the market
  async function openMarket(id) {
    S.chat?.close();

    try {
      if (typeof window.setCategory === 'function') {
        window.setCategory('ตลาด');
      }

      if (typeof window.marketLoad === 'function') {
        await window.marketLoad(true);
      }

      if (typeof window.mkOpen === 'function') {
        window.mkOpen(id);
      } else {
        throw Error('หน้าตลาดยังไม่พร้อม');
      }
    } catch (err) {
      alert('เปิดประกาศไม่ได้: ' + err.message);
    }
  }

  // Turn a market announcement into a card
  async function decorateMessage(row) {
    const bubble = row.querySelector('.kc-bubble');
    if (!bubble || row.dataset.marketReady) return;

    const content = bubble.textContent || '';
    const match = content.match(MARKER);
    if (!match) return;

    row.dataset.marketReady = '1';

    const listingId = match[1];

    bubble.textContent = content.replace(
      MARKER, ''
    ).trim();

    const card = document.createElement('div');
    card.className = 'kc-market-card';
    card.textContent = 'กำลังโหลดประกาศ…';

    row.querySelector('.kc-message-main')?.append(card);

    try {
      const listing = await api(
        '/market/listings/' + encodeURIComponent(listingId)
      );

      if (listing.status !== 'approved') {
        throw Error('ประกาศไม่ได้เผยแพร่');
      }

      if (!row.isConnected) return;

      card.replaceChildren();

      const picture = Array.isArray(listing.images)
        ? listing.images[0]
        : null;

      if (picture) {
        const image = document.createElement('img');
        image.src = picture;
        image.loading = 'lazy';
        image.alt = 'ภาพประกาศตลาด';
        card.appendChild(image);
      }

      const title = document.createElement('strong');
      title.textContent = listing.title;

      const price = listing.priceType === 'free'
        ? 'ฟรี'
        : listing.priceType === 'ask'
          ? 'สอบถามราคา'
          : Number(listing.price || 0)
              .toLocaleString('th-TH') + ' บาท';

      const meta = document.createElement('small');
      meta.textContent = [
        listing.category,
        price,
        listing.area
      ].filter(Boolean).join(' · ');

      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'ดูประกาศในหน้าตลาด';

      button.onclick = () => openMarket(listingId);

      card.append(title, meta, button);

    } catch (err) {
      card.textContent =
        'ประกาศนี้ถูกปิดหรือไม่พร้อมแสดงแล้ว';
    }
  }

  function decorateMessages() {
    if (!S.chat) return;

    S.chat.querySelectorAll('.kc-row')
      .forEach(decorateMessage);

    // Existing server-side admin-only soft delete
    S.chat.querySelectorAll(
      '.kc-tools [data-action="delete"]'
    ).forEach(button => {
      button.textContent = '🗑 ลบข้อความ';
    });
  }

  function adminButton() {
    if (!S.chat || S.user?.role !== 'admin') return;

    const header = S.chat.querySelector('header');
    if (!header || header.querySelector('.kc-admin-post')) {
      return;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'kc-admin-post';
    button.textContent = '📣 แนบประกาศ';
    button.onclick = openPanel;

    header.querySelector('[data-close]')?.before(button);
  }

  function makeModal() {
    if (S.modal) return S.modal;

    const modal = document.createElement('dialog');
    modal.id = 'krMarketAttachDialog';

    modal.innerHTML = `
      <header>
        <h3>📣 ประกาศในแชทอำเภอ</h3>
        <button type="button" data-close>×</button>
      </header>

      <div class="km-tabs">
        <button type="button" data-mode="existing"
          aria-pressed="true">เลือกจากตลาด</button>
        <button type="button" data-mode="new"
          aria-pressed="false">สร้างประกาศใหม่</button>
      </div>

      <div class="km-content"></div>
      <div data-error role="status"></div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('[data-close]').onclick =
      () => modal.close();

    modal.querySelectorAll('[data-mode]').forEach(button => {
      button.onclick = () => switchMode(button.dataset.mode);
    });

    S.modal = modal;
    return modal;
  }

  function switchMode(mode) {
    const modal = makeModal();
    error('');

    modal.querySelectorAll('[data-mode]').forEach(button => {
      button.setAttribute(
        'aria-pressed',
        String(button.dataset.mode === mode)
      );
    });

    const content = modal.querySelector('.km-content');

    if (mode === 'existing') {
      content.innerHTML = `
        <label>
          ค้นหาประกาศในตลาด
          <input data-search
            placeholder="ค้นชื่อสินค้า ร้านค้า หรือบริการ">
        </label>
        <div class="km-list">กำลังโหลดประกาศ…</div>
      `;

      content.querySelector('[data-search]').oninput =
        showListings;

      showListings();
      return;
    }

    content.innerHTML = `
      <form data-create>
        <label>
          ประเภทประกาศ
          <select name="kind">
            <option value="sell">ขายสินค้า / บริการ</option>
            <option value="wanted">ตามหาสินค้า</option>
          </select>
        </label>

        <label>
          ชื่อประกาศ
          <input name="title" maxlength="80" required
            placeholder="เช่น ผักสดจากสวน">
        </label>

        <label>
          รายละเอียด
          <textarea name="detail" maxlength="600"
            placeholder="รายละเอียดเพิ่มเติม"></textarea>
        </label>

        <label>
          หมวดหมู่
          <select name="category">
            ${CATS.map(c =>
              `<option>${esc(c)}</option>`
            ).join('')}
          </select>
        </label>

        <label>
          พื้นที่
          <input name="area" required maxlength="80"
            value="อำเภอกระนวน">
        </label>

        <label>
          รูปแบบราคา
          <select name="priceType">
            <option value="fixed">ระบุราคา</option>
            <option value="ask">สอบถามราคา</option>
            <option value="free">ฟรี</option>
          </select>
        </label>

        <label data-price>
          ราคา (บาท)
          <input name="price" type="number"
            min="0" max="10000" step=".01" value="0">
        </label>

        <label data-phone>
          เบอร์ติดต่อเจ้าของประกาศ
          <input name="phone" inputmode="tel"
            placeholder="08xxxxxxxx" maxlength="15">
        </label>

        <label>
          แนบภาพประกาศ (ไม่บังคับ)
          <input name="photo" type="file"
            accept="image/jpeg,image/png,image/webp">
        </label>

        <button type="submit" class="km-submit">
          สร้างลงตลาดและแชร์ในแชท
        </button>
      </form>
    `;

    const form = content.querySelector('form');

    const update = () => {
      const sell = form.elements.kind.value === 'sell';

      form.querySelector('[data-phone]').hidden = !sell;
      form.elements.phone.required = sell;

      form.querySelector('[data-price]').hidden =
        form.elements.priceType.value !== 'fixed';
    };

    form.elements.kind.onchange = update;
    form.elements.priceType.onchange = update;
    form.onsubmit = createListing;

    update();
  }

  async function showListings() {
    const list = S.modal?.querySelector('.km-list');
    if (!list) return;

    if (!S.listings) {
      try {
        S.listings = await api('/market/listings');
      } catch (err) {
        error(err.message);
        list.textContent = 'โหลดประกาศไม่ได้';
        return;
      }
    }

    if (!list.isConnected) return;

    const search = S.modal
      .querySelector('[data-search]')
      ?.value.trim().toLowerCase() || '';

    const items = S.listings
      .filter(listing =>
        listing.status === 'approved' &&
        [
          listing.title,
          listing.category,
          listing.area
        ].join(' ').toLowerCase().includes(search)
      )
      .slice(0, 50);

    list.replaceChildren();

    for (const listing of items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'km-item';

      const name = document.createElement('strong');
      name.textContent = listing.title;

      const detail = document.createElement('small');
      detail.textContent = [
        listing.category,
        listing.area
      ].filter(Boolean).join(' · ');

      button.append(name, detail);

      button.onclick = async () => {
        button.disabled = true;
        error('');

        try {
          await share(listing);
          S.modal.close();
        } catch (err) {
          error('แนบประกาศไม่ได้: ' + err.message);
        } finally {
          button.disabled = false;
        }
      };

      list.appendChild(button);
    }

    if (!items.length) {
      list.textContent = 'ไม่พบประกาศที่ตรงกับคำค้น';
    }
  }

  async function preparePhoto(file) {
    if (!file || !file.size) return null;

    if (
      !/^image\/(jpeg|png|webp)$/.test(file.type) ||
      file.size > 10000000
    ) {
      throw Error('ใช้รูป JPG PNG หรือ WebP ไม่เกิน 10 MB');
    }

    const bitmap = await createImageBitmap(file);

    try {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(
        1,
        1000 / Math.max(bitmap.width, bitmap.height)
      );

      canvas.width = Math.max(
        1,
        Math.round(bitmap.width * ratio)
      );

      canvas.height = Math.max(
        1,
        Math.round(bitmap.height * ratio)
      );

      canvas.getContext('2d').drawImage(
        bitmap, 0, 0, canvas.width, canvas.height
      );

      const data = canvas.toDataURL('image/jpeg', .74);

      if (data.length > 450000) {
        throw Error('รูปใหญ่เกินไป กรุณาเลือกรูปเล็กลง');
      }

      return data;
    } finally {
      bitmap.close();
    }
  }

  async function createListing(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');

    button.disabled = true;
    error('');

    try {
      const values = new FormData(form);

      const kind = values.get('kind');
      const priceType = kind === 'wanted'
        ? 'ask'
        : values.get('priceType');

      const picture = await preparePhoto(
        form.elements.photo.files[0]
      );

      const listing = {
        kind,
        title: String(values.get('title')).trim(),
        detail: String(values.get('detail')).trim(),
        category: values.get('category'),
        area: String(values.get('area')).trim(),
        priceType,
        price: priceType === 'fixed'
          ? Number(values.get('price'))
          : 0,
        phone: kind === 'sell'
          ? String(values.get('phone')).trim()
          : '',
        images: picture ? [picture] : [],
        poster_name: S.user.name,
        acceptsDelivery: false
      };

      if (!listing.title || !listing.area) {
        throw Error('กรุณากรอกชื่อและพื้นที่');
      }

      if (
        kind === 'sell' &&
        !/^\+?[0-9]{9,15}$/.test(listing.phone)
      ) {
        throw Error('กรุณากรอกเบอร์ติดต่อให้ถูกต้อง');
      }

      // Create the real market listing
      const created = await api(
        '/market/listings',
        listing
      );

      // Then share it into community chat
      try {
        await share(created);
        S.modal.close();
      } catch (err) {
        S.listings = null;

        error(
          'ลงตลาดสำเร็จแล้ว แต่แนบเข้าแชทไม่สำเร็จ: ' +
          err.message +
          ' กรุณาเลือกประกาศเดิมเพื่อแนบอีกครั้ง'
        );
      }

    } catch (err) {
      error(err.message);
    } finally {
      button.disabled = false;
    }
  }

  function openPanel() {
    const modal = makeModal();
    switchMode('existing');

    if (!modal.open) {
      modal.showModal();
    }
  }

  async function attach() {
    const dialog = document.getElementById(
      'krCommunityDialog'
    );

    if (!dialog || dialog === S.chat) return;

    S.chat = dialog;

    try {
      const session = await api('/dispatch/session');
      S.user = session.user;
    } catch {
      S.user = null;
    }

    adminButton();

    const list = dialog.querySelector('.kc-list');

    if (list) {
      new MutationObserver(decorateMessages).observe(
        list,
        { childList: true }
      );
    }

    decorateMessages();
  }

  styles();

  new MutationObserver(() => {
    if (!S.chat || !S.chat.isConnected) {
      attach();
    }
  }).observe(document.body, {
    childList: true,
    subtree: true
  });

  attach();
})();

