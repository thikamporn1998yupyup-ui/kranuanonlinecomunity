
/* Kranuan Online - Checkout Map & Payment Selection */
(() => {
  'use strict';

  function install() {
    if (
      typeof cDeliveryMarkup !== 'function' ||
      typeof cBindDelivery !== 'function'
    ) {
      console.warn('Checkout map: commerce system not loaded');
      return;
    }

    const originalMarkup = cDeliveryMarkup;
    const originalBind = cBindDelivery;

    // เพิ่มแผนที่และวิธีชำระเงินในหน้าสรุปบิลเดิม
    cDeliveryMarkup = function () {
      let html = originalMarkup();
      const transfer =
        cCheckout?.draft?.payment_method === 'transfer';

      html = html.replace(
        '<details><summary>กรอกหรือแก้ไขพิกัดเอง</summary>',
        `
          <div id="checkoutDropoffMap"
            style="height:270px;border-radius:16px;
            margin:12px 0;overflow:hidden;
            border:1px solid #e8d6b9;background:#f5f0e7">
          </div>

          <p class="c-help">
            📍 แตะบนแผนที่หรือลากหมุดไปยังจุดส่งจริง
            เพื่อช่วยให้ไรเดอร์หาบ้านได้ง่ายขึ้น
          </p>

          <details>
            <summary>กรอกหรือแก้ไขพิกัดเอง</summary>
        `
      );

      html = html.replace(
        '</details></div><label>หมายเหตุถึงร้าน / ไรเดอร์',
        `
          </details></div>

          <fieldset style="border:1px solid #ecdcc2;
            border-radius:15px;padding:15px;margin:15px 0">

            <legend style="font-weight:bold">
              เลือกวิธีชำระเงิน
            </legend>

            <label style="display:block;padding:10px 0">
              <input type="radio"
                name="payment_method"
                value="cash"
                ${transfer ? '' : 'checked'}>
              💵 เงินสดเมื่อได้รับอาหาร
            </label>

            <label style="display:block;padding:10px 0">
              <input type="radio"
                name="payment_method"
                value="transfer"
                ${transfer ? 'checked' : ''}>
              📱 โอนเงินตรงให้ร้านค้าหรือไรเดอร์
            </label>

            <p class="c-help">
              แอปจะบันทึกวิธีชำระเงินที่เลือก
              แต่จะไม่ตัดเงินหรือรับเงินแทนคู่ค้า
            </p>
          </fieldset>

          <label>หมายเหตุถึงร้าน / ไรเดอร์
        `
      );

      return html;
    };

    let leafletPromise = null;

    function loadMapLibrary() {
      if (window.L) return Promise.resolve(window.L);
      if (leafletPromise) return leafletPromise;

      leafletPromise = new Promise((resolve, reject) => {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href =
          'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        css.integrity =
          'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        css.crossOrigin = 'anonymous';
        document.head.append(css);

        const script = document.createElement('script');
        script.src =
          'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity =
          'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = 'anonymous';

        script.onload = () =>
          window.L ? resolve(window.L)
            : reject(new Error('Map unavailable'));

        script.onerror = () =>
          reject(new Error('โหลดแผนที่ไม่สำเร็จ'));

        document.head.append(script);
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
      const message = dialog.querySelector('#cGpsStatus');

      // แก้ที่อยู่แล้วไม่ล้างพิกัดทันที
      form.querySelector('[name=dropoff]').oninput = () => {
        message.textContent = checkout.gps
          ? 'ตรวจสอบว่าหมุดตรงกับที่อยู่ใหม่หรือไม่'
          : 'กรุณาเลือกจุดส่งบนแผนที่';
      };

      function valid(lat, lng) {
        return Number.isFinite(Number(lat)) &&
          Number.isFinite(Number(lng)) &&
          Number(lat) >= -90 && Number(lat) <= 90 &&
          Number(lng) >= -180 && Number(lng) <= 180;
      }

      // ปุ่มใช้ตำแหน่งปัจจุบัน
      dialog.querySelector('#cGetGps').onclick = () => {
        if (!navigator.geolocation) {
          message.textContent = 'อุปกรณ์ไม่รองรับ GPS';
          return;
        }

        message.textContent = 'กำลังค้นหาตำแหน่ง...';

        navigator.geolocation.getCurrentPosition(
          position => {
            if (!dialog.isConnected) return;

            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            checkout.gps = { lat, lng };

            latInput.value = lat.toFixed(6);
            lngInput.value = lng.toFixed(6);

            message.textContent = 'ใช้ตำแหน่งปัจจุบันแล้ว';

            if (checkout.deliveryMap) {
              checkout.deliveryMap.setView([lat, lng], 17);
              checkout.deliveryMarker.setLatLng([lat, lng]);
            }
          },
          () => {
            message.textContent =
              'เปิด GPS ไม่สำเร็จ สามารถปักหมุดเองได้';
          },
          { enableHighAccuracy: true, timeout: 12000 }
        );
      };

      loadMapLibrary().then(L => {
        if (
          cCheckout !== checkout ||
          !dialog.isConnected ||
          !element.isConnected
        ) return;

        if (checkout.deliveryMap) {
          checkout.deliveryMap.remove();
        }

        const start = checkout.gps &&
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
            attribution:
              '&copy; OpenStreetMap contributors'
          }
        ).addTo(map);

        const marker = L.marker(start, {
          draggable: true,
          autoPan: true
        }).addTo(map);

        checkout.deliveryMap = map;
        checkout.deliveryMarker = marker;

        function choosePoint(point) {
          const lat = Number(point.lat);
          const lng = Number(point.lng);

          if (!valid(lat, lng)) return;

          checkout.gps = { lat, lng };

          latInput.value = lat.toFixed(6);
          lngInput.value = lng.toFixed(6);

          marker.setLatLng([lat, lng]);

          message.textContent =
            'ปักหมุดจุดส่งแล้ว: ' +
            lat.toFixed(5) + ', ' +
            lng.toFixed(5);
        }

        map.on('click', event => {
          choosePoint(event.latlng);
        });

        marker.on('dragend', () => {
          choosePoint(marker.getLatLng());
        });

        function manualCoordinates() {
          if (!latInput.value || !lngInput.value) return;

          if (!valid(latInput.value, lngInput.value)) return;

          const point = {
            lat: Number(latInput.value),
            lng: Number(lngInput.value)
          };

          choosePoint(point);
          map.setView([point.lat, point.lng], 16);
        }

        latInput.addEventListener('change', manualCoordinates);
        lngInput.addEventListener('change', manualCoordinates);

        setTimeout(() => {
          if (element.isConnected) map.invalidateSize();
        }, 200);

      }).catch(error => {
        element.textContent =
          'ไม่สามารถโหลดแผนที่ได้ ใช้ GPS หรือกรอกพิกัดแทน';
        element.style.height = 'auto';
        element.style.padding = '18px';

        console.warn('Checkout map:', error.message);
      });
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, {
      once: true
    });
  } else {
    install();
  }
})();
