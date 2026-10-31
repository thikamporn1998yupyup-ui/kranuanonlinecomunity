
/* Photo-first rider browsing. VIP selection is intentionally not enabled or charged. */

let riderDirectory = { rows: [], index: 0, photo: 0 };

const profileBadge = () =>
  '<span class="rp-badge"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11"/><path d="m6 12 4 4 8-8"/></svg>บัญชีรับรองแล้ว</span>';


const categoryBeforeRiderProfiles = categoryBar;

categoryBar = function () {
  const helmet =
    '<img src="data:image/webp;base64,UklGRtICAABXRUJQVlA4IMYCAACwDgCdASpQAFAAPrFKoEynI6MiKPScAOAWCWMAz0lmyAf9vE27zNpVzFHywMzooJzBoW1LO7WsDR7+hbnc98PmWL244ct9mPfW4P5wN27/Q42S7xhkY3TAt0VZ8yewWXs86xdPLJz2k0CUTbpDHkW7Q9VIDIdpEnNAsm+C+AAA/vgaqv643N161m2WiNg8rQV7yumhWyQl882lhV4rMSrbSBn1N92Tn1k+DjvNZ20p4KtWNgnwAnWy8Y/LpYSAhKaXODszpGUjMcOdCdnE/OYhjNuq+bkQtdF2uWZ2zXgp0UKGZ7eDbfQCir5kVY7NP8y9+fKdMiM9Mr6wLR+4uS3/7igH3qGxEXHZJ50eSQBt2hSGW8W5lXahIo1yTlptIeKB6bRj+vNdDdvKvJnulJDtK9g9KvTQL1j7FX4t/cCS483TlobG8qGtyRtUVIG8GrprarzxRr9iasc1p+ipGdVF5s9kQxj7JzKeRl9qFZg+/ygZ63tv8Dtvy8FzlOSCrYMUqhWza+epjwOBiauNL2k3hANidaVibqLPLbyH/K53n70oenIwIMfJG82iY/NhtOzJKAln4leoMNvB256oq8anzoViC1tOdFNv8uUgkNr4udm/ThPIDx+sIaRLhOTBKbyYZp0RzwXpKqAvQ7hDZ8V9PsFRzVopqxXMz9/wPMrKjoMWNLXPyEB+rB9slmyP2mEiC9LjpJH+oLsq04QqNUJs81O2dy2Xo3wkaRuqH4dZWmqVyhtyrEmts2Xbhsn6g7rF8jCiSta5mWTUcTHG29O/ryLHZ0nr0YdL+6LfUl6gQ5IbN0PxR1abdac4fH9dOACkwbQAPnygthZcFTBvByIeLZO4U41YC3NWoqdrE5UEORNDrHYMyfg2Xeamc9Gp2wOsnZNSWzO7hdF3Ku4+YAc6eLl4gBPeJDAqWrizY0isJjQ2Y00AAA==" alt="" style="width:34px;height:34px;display:block;object-fit:contain;border-radius:8px;margin:auto">';

  const wheelie =
    '<img src="data:image/webp;base64,UklGRqgCAABXRUJQVlA4IJwCAACwDgCdASpQAFAAPrFQokynJKMiJnzKaOAWCWMA0yIA4kKy23A592yVf92/D6ct8GUsYz4gNIFNK8fv0v6NJMZD68BLCmF5Gzeu34zZGlYq+X2+u4iXHBcoXtaw9e5CCNbZARa7zohBW5BriG0kKWpkCvk5JjE/mvgmmXL4PgAA/vdrrlGSKc4rWc1wBEGtsU0z9nT4iYG30VjjjsTnxYyDzfrudDh1G34x+vfWRPW2v8MZexm+gN4T+87up4GUfTjBPx+nXgvPU3ob8Z7gYrZXHEWdmrYq5MTYuVGQB157Sav89/X4AZCu7Yr/mhykJmt5TyTV7BwCeGLIkfNRP1QavfNnZ0PFYDm80r/I5uy66yd6PJe5RPst2eye4rHyPs0gRNNs6x8i7YIkQEQJ6quic8tLEPSi1zRr8u3WQwqzCC/rL4nFjlRCpWqEymGnH0ir0oCWJaYpkXd2s85/kzdiS4V245GSqo9pMMgFLO2fviDF84Co+rqCbasxGslJkOsy6poDyT4BYh1PWSucN1ZeN0re4NyWK8auJVRNKYHjX3/0YIYs/MgsI2ETBMF1y1NynFmnSoqZSJTvlZJa9Z7i9WgmVpEgavfRx7y+mYuyl1koKiox5ppl/hJQxT0eEktG8k11Wxm9OtW4Qn1O+W4ktRmYMUARsApLhK4F7u8EMWSJBsoNEUvLiFxnUJQ1sfIMPuIxXhVn+zgX44GZABI+uecLP4CU2nNZjqksFJJP28av6mm8rLRf7uNNYtq+JJSXAkf0h/HDf3R7cI6CaFooqb4Mn0UOjhcuEItHhhzbf5WNfGPNx0/zV1peDOz4HJ0P8d3nTOSYM/NKSsGBMBBlHwgGM2aPCiXIEpCKKQMOeeJ9AAB8Z6lDsxAAAA==" alt="" style="width:34px;height:34px;display:block;object-fit:contain;border-radius:8px;margin:auto">';

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
