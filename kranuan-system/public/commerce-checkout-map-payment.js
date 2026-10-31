
/* Kranuan Online - Checkout Map & Payment UI V2 */
(() => {
  'use strict';

  function install() {
    if (
      typeof cDeliveryMarkup !== 'function' ||
      typeof cBindDelivery !== 'function'
    ) {
      console.warn('Checkout UI: commerce system not ready');
      return;
    }

    const css = document.createElement('style');
    css.textContent = `
      .kc-payment-options {
        border: 0;
        padding: 0;
        margin: 22px 0 16px;
        min-width: 0;
      }

      .kc-payment-options legend {
        font-size: 16px;
        font-weight: 800;
        color: #30291f;
        padding: 0;
        margin-bottom: 12px;
      }

      .kc-payment-card {
        display: flex !important;
        align-items: center;
        gap: 13px;
        padding: 15px !important;
        margin: 9px 0 !important;
        background: #fff;
        border: 2px solid #e9dfd2;
        border-radius: 16px;
        cursor: pointer;
        transition: border-color .15s, background .15s;
      }

      .kc-payment-card:has(input:checked) {
        border-color: #ed7037;
        background: #fff5e9;
      }

      .kc-payment-card:focus-within {
        outline: 2px solid #ed7037;
        outline-offset: 2px;
      }

      .kc-payment-card input {
        width: 19px !important;
        height: 19px !important;
        margin: 0 !important;
        flex: none;
        accent-color: #e8662e;
      }

      .kc-payment-icon {
        width: 44px;
        height: 44px;
        flex: none;
        border-radius: 13px;
        display: grid;
        place-items: center;
        color: #c86631;
        background: #fff0d9;
      }

      .kc-payment-icon svg {
        width: 23px;
        height: 23px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .kc-payment-details {
        display: flex;
        flex-direction: column;
        flex: 1;
        gap: 4px;
        min-width: 0;
      }

      .kc-payment-details strong {
        font-size: 14px;
        color: #332b24;
      }

      .kc-payment-details small {
        font-size: 11px;
        line-height: 1.5;
        color: #827667;
      }

      .kc-payment-help {
        background: #fff8ec;
        border-radius: 12px;
        padding: 12px;
        font-size: 11px;
        line-height: 1.7;
        color: #7b654f;
      }
    `;
    document.head.appendChild(css);

    const originalMarkup = cDeliveryMarkup;
    const originalBind = cBindDelivery;

    const cashIcon = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <circle cx="12" cy="12" r="3"/>
        <path d="M5 9h1M18 15h1"/>
      </svg>
    `;

    const transferIcon = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="7" y="2" width="10" height="20" rx="2"/>
        <path d="M10 5h4M10 19h4"/>
        <path d="M3 10h10m-3-3 3 3-3 3"/>
      </svg>
    `;

    cDeliveryMarkup = function () {
      let html = originalMarkup();
      const transfer =
        cCheckout?.draft?.payment_method === 'transfer';

      html = html.replace(
        '<details><summary>กรอกหรือแก้ไขพิกัดเอง</summary>',
        `
          <div id="checkoutDropoffMap"
            style="height:270px;overflow:hidden;
            margin:12px 0;border-radius:16px;
            background:#f5f0e7;
            border:1px solid #e9ddca">
          </div>

          <p class="c-help">
            แตะบนแผนที่หรือลากหมุดเพื่อระบุจุดส่งจริง
          </p>

          <details>
            <summary>กรอกหรือแก้ไขพิกัดเอง</summary>
        `
      );

      html = html.replace(
        '</details></div><label>หมายเหตุถึงร้าน / ไรเดอร์',
        `
          </details></div>

          <fieldset class="kc-payment-options">
            <legend>วิธีชำระเงิน</legend>

            <label class="kc-payment-card">
              <input type="radio"
                name="payment_method"
                value="cash"
                ${transfer ? '' : 'checked'}>

              <span class="kc-payment-icon">
                ${cashIcon}
              </span>

              <span class="kc-payment-details">
                <strong>เงินสดเมื่อได้รับอาหาร</strong>
                <small>
                  ชำระเงินสดกับผู้รับเงินตามข้อตกลง
                </small>
              </span>
            </label>

            <label class="kc-payment-card">
              <input type="radio"
                name="payment_method"
                value="transfer"
                ${transfer ? 'checked' : ''}>

              <span class="kc-payment-icon">
                ${transferIcon}
              </span>

              <span class="kc-payment-details">
                <strong>โอนเงินผ่านธนาคาร</strong>
                <small>
                  โอนตรงให้ร้านค้าหรือไรเดอร์
                  และตรวจสอบชื่อบัญชีก่อนชำระ
                </small>
              </span>
            </label>

            <div class="kc-payment-help">
              การเลือกวิธีชำระเป็นการแจ้งความประสงค์
              ยังไม่มีการตัดเงินจากบัญชีของคุณ
              Kranuan Online ไม่ถือเงินแทนคู่ค้า
            </div>
          </fieldset>

          <label>หมายเหตุถึงร้าน / ไรเดอร์
        `
      );

      return html;
    };

    let leafletPromise = null;

    function loadLeaflet() {
      if (window.L) return Promise.resolve(window.L);
      if (leafletPromise) return leafletPromise;

      leafletPromise = new Promise((resolve, reject) => {
        if (!document.querySelector('#kcLeafletCss')) {
          const link = document.createElement('link');
          link.id = 'kcLeafletCss';
          link.rel = 'stylesheet';
          link.href =
            'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        const script = document.createElement('script');
        script.src =
          'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

        script.onload = () => {
          if (window.L) resolve(window.L);
          else reject(new Error('Map not ready'));
        };

        script.onerror = () => {
          reject(new Error('โหลดแผนที่ไม่สำเร็จ'));
        };

        document.head.appendChild(script);
      });

      return leafletPromise;
    }

    cBindDelivery = function (dialog) {
      originalBind(dialog);

      const checkout = cCheckout;
      const form = dialog.querySelector('#commerceDeliveryForm');
      const element = dialog.querySelector('#checkoutDropoffMap');

      if (!form || !element) return;

      const latInput = dialog.querySelector('#cLat');
      const lngInput = dialog.querySelector('#cLng');
      const status = dialog.querySelector('#cGpsStatus');

      function valid(lat, lng) {
        if (lat == null || lng == null ||
            lat === '' || lng === '') return false;

        const a = Number(lat);
        const b = Number(lng);

        return Number.isFinite(a) &&
          Number.isFinite(b) &&
          a >= -90 && a <= 90 &&
          b >= -180 && b <= 180;
      }

      form.querySelector('[name=dropoff]').oninput = () => {
        status.textContent = checkout.gps
          ? 'ตรวจสอบว่าหมุดตรงกับที่อยู่ที่ระบุ'
          : 'กรุณาเลือกจุดส่งบนแผนที่';
      };

      dialog.querySelector('#cGetGps').onclick = () => {
        if (!navigator.geolocation) {
          status.textContent = 'อุปกรณ์ไม่รองรับ GPS';
          return;
        }

        status.textContent = 'กำลังค้นหาตำแหน่ง...';

        navigator.geolocation.getCurrentPosition(
          position => {
            if (!dialog.isConnected) return;

            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            checkout.gps = { lat, lng };

            latInput.value = lat.toFixed(6);
            lngInput.value = lng.toFixed(6);

            status.textContent = 'เลือกตำแหน่งปัจจุบันแล้ว';

            if (checkout.deliveryMap) {
              checkout.deliveryMap.setView([lat, lng], 17);
              checkout.deliveryMarker.setLatLng([lat, lng]);
            }
          },
          () => {
            status.textContent =
              'ไม่สามารถรับ GPS ได้ กรุณาปักหมุดเอง';
          },
          { enableHighAccuracy: true, timeout: 12000 }
        );
      };

      loadLeaflet().then(L => {
        if (
          cCheckout !== checkout ||
          !element.isConnected
        ) return;

        if (checkout.deliveryMap) {
          checkout.deliveryMap.remove();
        }

        const start =
          checkout.gps &&
          valid(checkout.gps.lat, checkout.gps.lng)
            ? [checkout.gps.lat, checkout.gps.lng]
            : valid(checkout.shop.lat, checkout.shop.lng)
              ? [checkout.shop.lat, checkout.shop.lng]
              : [16.7, 103.08];

        const map = L.map(element, {
          scrollWheelZoom: false
        }).setView(start, checkout.gps ? 16 : 13);

        L.tileLayer(
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
          }
        ).addTo(map);

        const marker = L.marker(start, {
          draggable: true,
          autoPan: true
        }).addTo(map);

        checkout.deliveryMap = map;
        checkout.deliveryMarker = marker;

        function setPoint(point) {
          const lat = Number(point.lat);
          const lng = Number(point.lng);

          if (!valid(lat, lng)) return;

          checkout.gps = { lat, lng };

          latInput.value = lat.toFixed(6);
          lngInput.value = lng.toFixed(6);

          marker.setLatLng([lat, lng]);

          status.textContent =
            'ปักหมุดแล้ว ' +
            lat.toFixed(5) + ', ' +
            lng.toFixed(5);
        }

        map.on('click', event => setPoint(event.latlng));

        marker.on('dragend', () => {
          setPoint(marker.getLatLng());
        });

        function updateManual() {
          if (!valid(latInput.value, lngInput.value)) return;

          const point = {
            lat: Number(latInput.value),
            lng: Number(lngInput.value)
          };

          setPoint(point);
          map.setView([point.lat, point.lng], 16);
        }

        latInput.addEventListener('change', updateManual);
        lngInput.addEventListener('change', updateManual);

        setTimeout(() => {
          if (element.isConnected) map.invalidateSize();
        }, 200);

      }).catch(error => {
        element.textContent =
          'โหลดแผนที่ไม่ได้ ใช้ GPS หรือกรอกพิกัดแทนได้';

        element.style.height = 'auto';
        element.style.padding = '18px';

        console.warn('Checkout map:', error.message);
      });
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      install,
      { once: true }
    );
  } else {
    install();
  }
})();
