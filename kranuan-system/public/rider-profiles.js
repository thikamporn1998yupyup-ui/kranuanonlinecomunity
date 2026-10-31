
/* Photo-first rider browsing. VIP selection is intentionally not enabled or charged. */

let riderDirectory = { rows: [], index: 0, photo: 0 };

const profileBadge = () =>
  '<span class="rp-badge"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11"/><path d="m6 12 4 4 8-8"/></svg>บัญชีรับรองแล้ว</span>';


const categoryBeforeRiderProfiles = categoryBar;

categoryBar = function () {

  // ดูไรเดอร์ — คนสวมหมวกกันน็อก
  const helmet = `
    <svg xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      aria-hidden="true"
      style="width:36px!important;height:36px!important;display:block;margin:auto">
      <path fill="#e65d30" fill-rule="evenodd" d="
M42 17 35 25 30 37 31 42 34 60 38 66 44 72 42 75 42 79 26 85 22 88 18 94 14 107 7 108 7 109 113 109 113 108 106 107 102 94 98 88 93 85 78 79 78 74 76 72 82 66 86 61 90 42 89 34 83 22 75 15 69 12 63 11 52 12Z
M59 90 59 108 32 108 32 101 32 100 31 101 30 108 16 107 21 92 24 88 30 85 43 81 45 84 49 87Z
M61 90 71 87 75 84 78 81 92 86 97 89 100 93 104 107 90 108 89 101 88 100 88 101 88 108 61 108Z
M49 76 49 76 54 78 60 79 71 76 70 77 63 81 60 87 57 81Z
M75 73 76 75 76 79 75 82 69 86 61 88 64 83 72 78 73 75Z
M45 74 47 75 47 78 48 78 56 83 59 88 52 86 46 83 44 80Z
M51 64 60 65 69 63 66 71 65 76 61 77 55 76 54 71Z
M56 70 57 70 63 71 64 70 63 69Z
M54 66 55 68 64 68 66 67 65 66Z
M34 53 40 59 49 63 53 72 53 76 45 71 39 66 36 60 44 68 48 72 49 71 38 60 35 55Z
M86 53 85 56 81 61 71 71 73 71 78 67 84 60 80 66 75 71 67 76 68 72 72 63 73 63 75 64 77 63 78 62 78 60 82 57Z
M32 35 33 34 39 37 46 38 64 39 78 38 87 34 88 36 87 44 85 51 79 57 69 62 58 63 47 60 42 58 38 55 33 46Z
M37 42 38 51 40 55 47 59 57 61 69 60 78 56 82 53 83 45 82 41 79 39 63 40 41 39 39 40Z
M44 44 46 41 58 42 74 41 76 44 76 50 71 55 70 58 61 60 54 59 50 58 48 55 45 52Z
M56 44 48 51 48 52 56 45Z
M52 44 47 47 48 48 52 45Z
M80 41 81 43 80 52 77 55 73 57 76 53 77 51 78 43 77 41Z
M40 41 43 41 42 43 43 51 47 57 42 55 40 52 39 43Z
M85 37 84 38 84 40 86 42 87 41 87 39 86 37Z
M34 37 33 38 33 40 34 42 35 42 36 41 36 39 36 37Z
M74 17 78 20 75 24 72 25Z
M76 19 74 20 74 22 75 22 76 20Z
M46 17 48 25 45 24 42 20Z
M44 19 44 20 45 22 46 22 46 20Z
M34 32 37 26 41 21 44 26 49 27 50 27 48 15 55 13 62 13 68 14 72 16 69 26 70 27 71 27 76 26 80 21 84 27 86 33 76 36 57 37 42 36 37 34Z
M52 31 53 34 58 35 65 35 67 34 68 32 68 31 67 30 61 28 54 29Z
M53 32 57 30 61 30 65 30 67 32 64 33 58 34 55 33Z
      "/>
    </svg>
  `;

  // เรียกไรเดอร์ — รถมอเตอร์ไซค์ยกล้อ
  const wheelie = `
    <svg xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      aria-hidden="true"
      style="width:36px!important;height:36px!important;display:block;margin:auto">
      <path fill="#e65d30" fill-rule="evenodd" d="
M112 53 108 48 102 46 95 46 90 50 89 48 92 46 96 44 102 43 103 41 98 39 95 38 91 39 85 41 72 32 75 30 76 28 72 21 70 20 64 23 61 28 55 30 55 32 56 32 61 30 74 47 76 63 75 65 64 70 61 69 58 67 57 64 58 58 59 55 57 51 55 50 51 50 37 56 32 45 29 43 25 44 8 52 7 54 7 56 14 71 16 74 19 75 30 70 26 79 26 86 27 90 28 95 34 93 37 97 25 98 24 99 25 100 76 100 77 99 76 98 54 97 56 94 58 91 59 86 58 82 83 70 85 68 85 55 87 51 88 52 87 56 87 60 88 66 93 70 98 72 104 71 108 70 111 67 113 61 113 57Z
M44 82 47 82 49 84 44 86 45 88 49 86 50 87 49 89 47 91 43 91 41 88 41 84Z
M44 76 47 76 51 77 54 81 51 83 48 80 45 80 41 81 39 84 38 87 39 90 41 93 45 94 49 93 52 89 52 85 55 84 56 84 56 89 55 92 52 96 48 97 43 97 39 96 36 93 35 89 35 85 36 81 39 78Z
M99 54 103 55 104 58 104 61 101 63 98 63 95 59 96 57 99 60 101 59 101 58 97 55Z
M56 54 56 55 40 62 38 59 38 58 40 56 52 53 54 53Z
M31 51 37 63 19 72 17 72 12 60Z
M96 48 101 48 105 49 108 52 110 56 111 59 110 63 107 67 103 69 97 69 94 68 92 66 89 62 89 56 91 54 94 56 93 61 97 65 102 66 106 62 107 58 106 55 104 53 100 52 95 53 92 51Z
M29 46 30 48 29 49 11 58 10 56 10 54 11 53 27 46Z
M96 41 90 44 86 48 86 44 87 43 92 41Z
M82 42 83 44 82 67 81 69 57 80 54 76 49 74 45 74 40 74 37 77 34 80 32 84 32 90 29 92 29 83 30 76 34 69 39 65 55 58 55 64 56 67 58 70 61 72 66 72 76 67 78 65 78 62 76 48 68 34 68 33 70 33Z
M70 23 73 29 66 32 64 29 63 28 66 25Z
      "/>
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
