
/* Photo-first rider browsing. VIP selection is intentionally not enabled or charged. */

let riderDirectory = { rows: [], index: 0, photo: 0 };

const profileBadge = () =>
  '<span class="rp-badge"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11"/><path d="m6 12 4 4 8-8"/></svg>บัญชีรับรองแล้ว</span>';


const categoryBeforeRiderProfiles = categoryBar;

categoryBar = function () {
 const helmet = `
<svg
  viewBox="0 0 64 64"
  width="30"
  height="30"
  aria-hidden="true"
  style="display:block;margin:0 auto;"
  xmlns="http://www.w3.org/2000/svg"
>
  <g
    fill="none"
    stroke="#C86A3A"
    stroke-width="3.2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M20 54v-4c0-7 5-13 12-15" />
    <path d="M44 54v-4c0-7-5-13-12-15" />
    <path d="M24 50h16" />
    <path d="M22 22c0-10 7-16 10-16s10 6 10 16" />
    <path d="M18 24c2-3 7-5 14-5s12 2 14 5" />
    <path d="M19 25v8c0 6 6 11 13 11s13-5 13-11v-8" />
    <path d="M23 28h18" />
    <path d="M26 36h12" />
    <path d="M29 44v6" />
    <path d="M35 44v6" />
    <path d="M27 13l3 3" />
    <path d="M37 13l-3 3" />
  </g>
</svg>
`;

const wheelie = `
<svg
  viewBox="0 0 64 64"
  width="30"
  height="30"
  aria-hidden="true"
  style="display:block;margin:0 auto;"
  xmlns="http://www.w3.org/2000/svg"
>
  <g
    fill="none"
    stroke="#C86A3A"
    stroke-width="3.2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="18" cy="46" r="6" />
    <circle cx="46" cy="33" r="6" />
    <path d="M14 52h30" />
    <path d="M18 40l8-13h10l6 6" />
    <path d="M36 27l7-8" />
    <path d="M43 19l5 2" />
    <path d="M26 27l-8-5h-8" />
    <path d="M25 28l9 8 8-1" />
    <path d="M34 36l-10 5" />
    <path d="M13 23l10 6" />
    <path d="M9 22h8" />
    <path d="M46 27l4 6" />
    <path d="M41 39l5-6" />
    <path d="M18 40l0 0" />
  </g>
</svg>
`;
  let html = categoryBeforeRiderProfiles();

  html = html.replace(
    '<span>' + C.icon('bike') +
    '</span><b>เรียกไรเดอร์</b>',
    '<span>' + wheelie +
    '</span><b>เรียกไรเดอร์</b>'
  );

  return html.replace(
    '</nav>',
    '<button type="button" class="c-category" onclick="openRiderDirectory()"><span>' +
    helmet +
    '</span><b>ดูไรเดอร์</b></button></nav>'
  );
};


async function openRiderDirectory(id) {
  let d = document.getElementById('riderProfilesDialog');

  if (!d) {
    d = document.createElement('dialog');
    d.id = 'riderProfilesDialog';
    d.className = 'rp-dialog';
    document.body.appendChild(d);

    d.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') riderPhoto(-1);
      if (e.key === 'ArrowRight') riderPhoto(1);
    });
  }

  d.innerHTML =
    '<header><div><small>คนส่งของใกล้บ้าน</small><h2>รู้จักไรเดอร์ของเรา</h2></div>' +
    '<button type="button" data-close aria-label="ปิดโปรไฟล์">' +
    C.icon('close') +
    '</button></header>' +
    '<p class="rp-notice" role="status">กำลังโหลดโปรไฟล์...</p>' +
    '<div id="riderProfileContent"></div>';

  d.querySelector('[data-close]').onclick = () => d.close();

  if (!d.open) d.showModal();

  try {
    const data = await K.request('/riders');
    if (!d.open) return;

    const rows = Array.isArray(data.riders) ? data.riders : [];
    riderDirectory = { rows, index: 0, photo: 0 };

    if (id) {
      const at = rows.findIndex(x => x.id === id);
      if (at < 0) {
        d.querySelector('.rp-notice').textContent =
          'โปรไฟล์นี้ยังไม่เปิดเผยแพร่ หรืออยู่ระหว่างตรวจสอบรูป';
        return;
      }
      riderDirectory.index = at;
    }

    drawRiderProfile();
  } catch (e) {
    d.querySelector('.rp-notice').textContent =
      'โหลดโปรไฟล์ไม่ได้: ' + e.message;
  }
}

function drawRiderProfile() {
  const root = document.getElementById('riderProfileContent');
  const d = document.getElementById('riderProfilesDialog');

  if (!root || !d?.open) return;

  const rows = riderDirectory.rows;
  const r = rows[riderDirectory.index];

  d.querySelector('.rp-notice').textContent =
    'ดูรูปและข้อมูลการบริการได้ · การเลือกไรเดอร์ยังไม่เปิดใช้งาน';

  if (!r) {
    root.innerHTML =
      '<div class="rp-empty">' +
      C.icon('bike') +
      '<h3>ยังไม่มีโปรไฟล์ที่พร้อมแสดง</h3>' +
      '<p>ไรเดอร์ต้องอนุญาตเผยแพร่ และรูปโปรไฟล์ต้องผ่านผู้ดูแลก่อน</p></div>';
    return;
  }

  const photos = Array.isArray(r.photos) ? r.photos : [];
  const p = photos.length
    ? riderDirectory.photo % photos.length
    : 0;

  const image = photos.length
    ? '<img src="' + C.esc(photos[p]) + '" alt="' +
      C.esc(r.name) + ' รูปที่ ' + (p + 1) + '">'
    : '<div class="rp-empty">ยังไม่มีรูปภาพ</div>';

  root.innerHTML =
    '<article class="rp-card">' +
    '<div class="rp-image">' +
    image +
    '<div class="rp-dots">' +
    photos.map((_, i) =>
      '<button type="button" data-photo="' + i +
      '" class="' + (i === p ? 'active' : '') +
      '" aria-label="ดูรูปที่ ' + (i + 1) + '"></button>'
    ).join('') +
    '</div>' +
    '<button type="button" class="rp-photo-prev" data-prev-photo aria-label="รูปก่อนหน้า">' +
    C.icon('back') + '</button>' +
    '<button type="button" class="rp-photo-next" data-next-photo aria-label="รูปถัดไป">' +
    C.icon('arrow') + '</button>' +
    '<button type="button" class="rp-photo-fit" data-photo-fit aria-pressed="false">ดูรูปเต็มภาพ</button>' +
    '<div class="rp-overlay">' +
    '<span class="rp-online ' + (r.online ? 'online' : '') + '">' +
    '<i></i>' + (r.online ? 'ออนไลน์' : 'ออฟไลน์') + '</span>' +
    '<h3>' + C.esc(r.name) + '</h3>' +
    (r.verified
      ? profileBadge()
      : '<span class="rp-unverified">ยังไม่รับรองบัญชี</span>') +
    '</div></div>' +
    '<div class="rp-content">' +
    '<div class="rp-stats">' +
    '<span><b>' + Number(r.completed_orders || 0) + '</b> งานสำเร็จ</span>' +
    '<span><b>' +
    (r.rating == null ? '—' : Number(r.rating).toFixed(1)) +
    '</b> คะแนนไรเดอร์ <small>(' +
    Number(r.review_count || 0) + ' รีวิว)</small></span>' +
    '</div>' +
    '<p>' + C.esc(r.bio || 'ไรเดอร์ยังไม่ได้เพิ่มคำแนะนำตัว') + '</p>' +
    '<div class="rp-area">' + C.icon('pin') +
    C.esc(r.service_area || 'สอบถามพื้นที่บริการผ่านระบบเมื่อรับงาน') +
    '</div>' +
    '<div class="rp-vip"><div><small>เตรียมพบกับ VIP</small>' +
    '<b>299 บาท</b><span>ปลดล็อกการเลือกไรเดอร์ในอนาคต</span>' +
    '</div><button type="button" data-vip>ดูรายละเอียด</button></div>' +
    '</div></article>' +
    '<div class="rp-browse">' +
    '<button type="button" data-prev-rider ' +
    (rows.length < 2 ? 'disabled' : '') + '>' +
    C.icon('back') + ' ก่อนหน้า</button>' +
    '<span>' + (riderDirectory.index + 1) + ' / ' + rows.length + '</span>' +
    '<button type="button" data-next-rider ' +
    (rows.length < 2 ? 'disabled' : '') + '>' +
    'คนถัดไป ' + C.icon('arrow') + '</button></div>';

  root.querySelectorAll('[data-photo]').forEach(btn => {
    btn.onclick = () => {
      riderDirectory.photo = Number(btn.dataset.photo);
      drawRiderProfile();
    };
  });

  root.querySelector('[data-prev-photo]').onclick =
    () => riderPhoto(-1);

  root.querySelector('[data-next-photo]').onclick =
    () => riderPhoto(1);

  root.querySelector('[data-prev-rider]').onclick =
    () => nextRiderProfile(-1);

  root.querySelector('[data-next-rider]').onclick =
    () => nextRiderProfile(1);

  root.querySelector('[data-vip]').onclick = openRiderVipInfo;

  root.querySelector('[data-photo-fit]').onclick = e => {
    const img = root.querySelector('.rp-image > img');
    if (!img) return;

    const fit =
      e.currentTarget.getAttribute('aria-pressed') !== 'true';

    img.style.objectFit = fit ? 'contain' : 'cover';
    e.currentTarget.setAttribute('aria-pressed', String(fit));
    e.currentTarget.textContent =
      fit ? 'กลับมุมมองการ์ด' : 'ดูรูปเต็มภาพ';
  };

  let start = null;
  const imageBox = root.querySelector('.rp-image');

  imageBox.onpointerdown = e => {
    if (e.target.closest('button')) return;
    start = e.clientX;
  };

  imageBox.onpointerup = e => {
    if (start !== null && Math.abs(e.clientX - start) > 45) {
      riderPhoto(e.clientX < start ? 1 : -1);
    }
    start = null;
  };
}

function riderPhoto(delta) {
  const r = riderDirectory.rows[riderDirectory.index];
  if (!r || !Array.isArray(r.photos) || !r.photos.length) return;

  riderDirectory.photo =
    (riderDirectory.photo + delta + r.photos.length) %
    r.photos.length;

  drawRiderProfile();
}

function nextRiderProfile(delta) {
  if (!riderDirectory.rows.length) return;

  riderDirectory.index =
    (riderDirectory.index + delta + riderDirectory.rows.length) %
    riderDirectory.rows.length;

  riderDirectory.photo = 0;
  drawRiderProfile();
}

function openRiderVipInfo() {
  const d = C.dialog(
    'riderVipInfo',
    '<div class="c-delivery-content">' +
    '<p class="c-eyebrow">VIP · เร็ว ๆ นี้</p>' +
    '<h2>เลือกไรเดอร์ที่คุณชอบ</h2>' +
    '<h3>ราคาเตรียมเปิดตัว 299 บาท</h3>' +
    '<p>ขณะนี้ดูโปรไฟล์และรูปไรเดอร์ได้ ฟังก์ชันเลือกไรเดอร์และการสมัครสมาชิกยังไม่เปิดให้ใช้งาน</p>' +
    '<p class="c-help">ยังไม่มีการรับชำระเงิน ไม่มีการต่ออายุ และยังไม่กำหนดรอบสมาชิก เมื่อเปิดจริงระบบจะตรวจสิทธิ์จากเซิร์ฟเวอร์ก่อนเลือกไรเดอร์</p>' +
    '<button type="button" class="c-btn c-primary" data-close>เข้าใจแล้ว</button>' +
    '</div>'
  );

  d.querySelector('[data-close]').onclick = () => d.close();
}

/* Fix missing staffCustomerIdentity without removing rider features. */

var staffCustomerIdentity =
  typeof staffCustomerIdentity === 'function'
    ? staffCustomerIdentity
    : function () {};

const beforeDirectoryIdentity = staffCustomerIdentity;

staffCustomerIdentity = function () {
  beforeDirectoryIdentity();

  for (const o of liveOrders) {
    if (!o.rider?.profile_available) continue;

    const host = document.querySelector(
      '[data-rider-identity="' + o.id + '"]'
    );

    if (host && !host.querySelector('[data-view-rider]')) {
      const button = document.createElement('button');

      button.type = 'button';
      button.className = 'c-btn c-secondary';
      button.dataset.viewRider = o.rider.id;
      button.textContent = 'ดูโปรไฟล์';
      button.style.cssText =
        'margin-left:auto;font-size:11px;padding:6px 10px';

      button.onclick =
        () => openRiderDirectory(o.rider.id);

      host.appendChild(button);
    }
  }
};

render();
