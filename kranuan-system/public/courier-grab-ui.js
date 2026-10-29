/* Real vehicle booking using the user's reference design. Scoped, no demo orders. */
(()=>{'use strict';const markup="<div class=\"phone-mockup\"><button type=\"button\" class=\"transport-close\" aria-label=\"ปิดหน้าเรียกรถ\" onclick=\"TransportUI.close()\"><svg viewBox=\"0 0 24 24\"><path d=\"m6 6 12 12M18 6 6 18\"/></svg></button>\n  <div class=\"map-bg\"></div>\n  <div class=\"toast\" id=\"toast\">แจ้งเตือน</div>\n\n  <!-- 1. หน้าเลือกยานพาหนะ -->\n  <div class=\"vehicle-selection-screen\" id=\"vs-screen\">\n    <div class=\"vs-header\">\n      <h1>เรียกไรเดอร์</h1>\n      <p>เลือกประเภทยานพาหนะที่คุณต้องการ</p>\n    </div>\n\n    <div class=\"vs-cards\">\n      <div class=\"vs-card\" onclick=\"TransportUI.selectVehicle('bike')\">\n        <div class=\"vs-icon-box\">\n          <svg viewBox=\"0 0 24 24\"><path d=\"M19 7h-3V5h3a1 1 0 0 1 1 1v1zm-4 0h-2.5l-2-2H9v2H4v2h2.5l-2 5H4v2h2a2 2 0 0 0 1.7-1l1.8-4.5h1.5l4.3 3.4A2 2 0 0 0 16.5 14H18a3 3 0 1 0 0-6h-2.5V7zM9 9h3.5l2 3H11L9 9zm8 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2z\"/><circle cx=\"6\" cy=\"17\" r=\"3\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"/><circle cx=\"18\" cy=\"17\" r=\"3\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"/></svg>\n        </div>\n        <div class=\"vs-info\">\n          <h3>รถจักรยานยนต์</h3>\n          <p>ส่งไว เหมาะกับของชิ้นเล็ก</p>\n        </div>\n      </div>\n\n      <div class=\"vs-card\" onclick=\"TransportUI.selectVehicle('car')\">\n        <div class=\"vs-icon-box\">\n          <svg viewBox=\"0 0 24 24\"><path d=\"M18.9 6.1l-1.2-3.5C17.4 1.6 16.5 1 15.5 1h-7C7.5 1 6.6 1.6 6.3 2.6l-1.2 3.5C4.4 6.4 4 7.2 4 8v11a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-1h6v1a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2V8c0-.8-.4-1.6-1.1-1.9zM7.5 3.5c.1-.3.3-.5.6-.5h7.8c.3 0 .5.2.6.5L17.4 7H6.6l.9-3.5zM6.5 15.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm11 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z\"/></svg>\n        </div>\n        <div class=\"vs-info\">\n          <h3>รถยนต์</h3>\n          <p>รับส่งผู้โดยสาร หรือของชิ้นใหญ่</p>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <!-- 2. หน้าจอฟอร์มกรอกข้อมูล -->\n  <div class=\"call-rider-container\" id=\"call-rider-container\">\n    <button class=\"btn-back\" onclick=\"TransportUI.goBackToVehicleSelection()\">\n      <svg viewBox=\"0 0 24 24\"><path d=\"M15 18l-6-6 6-6\"/></svg>\n    </button>\n\n    <div class=\"sheet-scroll-area\">\n      <div class=\"drag-handle\"></div>\n      <h2 id=\"title-text\">ส่งพัสดุ / อาหาร</h2>\n      \n      <div class=\"mode-toggle-wrapper\">\n        <button class=\"mode-btn active\" id=\"btn-mode-delivery\" onclick=\"TransportUI.switchMode('delivery')\">ส่งของ</button>\n        <button class=\"mode-btn\" id=\"btn-mode-ride\" onclick=\"TransportUI.switchMode('ride')\">ส่งคน</button>\n      </div>\n\n      <div class=\"address-input-group\">\n        <div class=\"address-icon pickup\"></div>\n        <input type=\"text\" id=\"pickup-input\" placeholder=\"จุดรับพัสดุ\" readonly onclick=\"TransportUI.openMapPicker('pickup')\">\n        <button class=\"btn-action\" onclick=\"TransportUI.getGPS('pickup')\"><svg viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 2v3M12 19v3M2 12h3M19 12h3\"/><path d=\"M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1\"/></svg></button>\n        <button class=\"btn-action\" onclick=\"TransportUI.openMapPicker('pickup')\"><svg viewBox=\"0 0 24 24\"><path d=\"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z\"/><circle cx=\"12\" cy=\"10\" r=\"3\"/></svg></button>\n      </div>\n\n      <div class=\"address-input-group\">\n        <div class=\"address-icon dropoff\"></div>\n        <input type=\"text\" id=\"dropoff-input\" placeholder=\"จุดส่งพัสดุ\" readonly onclick=\"TransportUI.openMapPicker('dropoff')\">\n        <button class=\"btn-action\" onclick=\"TransportUI.openMapPicker('dropoff')\"><svg viewBox=\"0 0 24 24\"><path d=\"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z\"/><circle cx=\"12\" cy=\"10\" r=\"3\"/></svg></button>\n      </div>\n\n      <!-- 🔥 ส่วนจำนวนผู้โดยสาร (ไอคอนคนทึบ + ปุ่ม + / -) -->\n      <div class=\"passenger-section\" id=\"passenger-section\">\n        <div class=\"passenger-info\">\n          <!-- Solid User Icon -->\n          <svg viewBox=\"0 0 24 24\">\n            <path d=\"M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z\"/>\n          </svg>\n          <span>จำนวนผู้โดยสาร</span>\n        </div>\n        <div class=\"passenger-controls\">\n          <button class=\"btn-count\" id=\"btn-minus\" onclick=\"TransportUI.changePassenger(-1)\">-</button>\n          <span class=\"count-number\" id=\"count-display\">0</span>\n          <button class=\"btn-count\" id=\"btn-plus\" onclick=\"TransportUI.changePassenger(1)\">+</button>\n        </div>\n      </div>\n\n      <!-- ส่วนข้อมูลพัสดุ -->\n      <div id=\"parcel-section\">\n        <label class=\"input-label\">ของที่ต้องการให้รับ-ส่ง</label>\n        <div class=\"parcel-details\">\n          <textarea id=\"parcel-desc\" placeholder=\"เช่น เอกสาร กล่องพัสดุ หรืออาหารจากร้าน\"></textarea>\n        </div>\n\n        <label class=\"input-label\">หมายเหตุถึงไรเดอร์</label>\n        <div class=\"parcel-details\">\n          <textarea id=\"parcel-note\" placeholder=\"เช่น โทรมือถือจุดรับ หรือฝากของที่หน้าเคาน์เตอร์\"></textarea>\n        </div>\n\n        <button class=\"btn-attach-image\" onclick=\"TransportUI.openImagePopup()\">\n          <svg viewBox=\"0 0 24 24\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><circle cx=\"8.5\" cy=\"8.5\" r=\"1.5\"/><path d=\"M21 15l-5-5L5 21\"/></svg>\n          <span id=\"attach-status\">แนบภาพสิ่งของ / จุดส่ง (ไม่บังคับ)</span>\n        </button>\n\n        <div class=\"checkbox-group\">\n          <label class=\"checkbox-item\">\n            <input type=\"checkbox\" id=\"transport-remember\" checked>\n            <span>จดจำชื่อ เบอร์โทร ที่อยู่และพิกัดจุดส่งในเครื่องนี้</span>\n          </label>\n          <label class=\"checkbox-item\">\n            <input type=\"checkbox\" id=\"transport-consent\">\n            <span>ยินยอมให้ไรเดอร์ตรวจสอบสิ่งของก่อนรับส่ง</span>\n          </label>\n        </div>\n      </div>\n\n      <div class=\"transport-contact\"><label>ชื่อผู้ติดต่อ<input id=\"transport-name\" maxlength=\"100\" autocomplete=\"name\"></label><label>เบอร์โทร<input id=\"transport-phone\" maxlength=\"15\" type=\"tel\" inputmode=\"tel\" autocomplete=\"tel\"></label></div><div class=\"fare-summary\">\n        <span id=\"fare-label\">ค่าบริการ</span>\n        <b id=\"price-text\">25 บาท</b>\n      </div>\n\n      <button class=\"btn-call-rider\" id=\"call-btn\" onclick=\"TransportUI.callRider()\">\n        <div class=\"spinner\" id=\"spinner\"></div>\n        <span id=\"btn-text\">ยืนยันเรียกไรเดอร์</span>\n      </button>\n    </div>\n  </div>\n\n  <!-- Modal Map & Image (Standard) -->\n  <div id=\"map-picker-modal\">\n    <div class=\"search-box-wrapper\">\n      <div class=\"search-input-group\">\n        <svg class=\"icon-search\" viewBox=\"0 0 24 24\"><circle cx=\"11\" cy=\"11\" r=\"8\"/><path d=\"M21 21l-4.3-4.3\"/></svg>\n        <input type=\"text\" id=\"place-search\" placeholder=\"ค้นหาสถานที่...\" onkeypress=\"TransportUI.handleSearchEnter(event)\">\n        <button class=\"btn-search\" id=\"btn-search\" onclick=\"TransportUI.searchLocation()\"><svg viewBox=\"0 0 24 24\"><path d=\"M5 12h14M12 5l7 7-7 7\"/></svg></button>\n      </div>\n    </div>\n    <div id=\"picker-map\"></div>\n    <div class=\"center-pin\">\n      <svg viewBox=\"0 0 24 24\"><path d=\"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z\"/><circle cx=\"12\" cy=\"10\" r=\"3\" fill=\"#fff\" stroke=\"none\"/></svg>\n      <div class=\"pin-shadow\"></div>\n    </div>\n    <div class=\"picker-bottom\">\n      <div class=\"picker-info\">เลื่อนแผนที่เพื่อปักหมุด<b id=\"picker-place-name\">กำลังค้นหาชื่อสถานที่...</b></div>\n      <button class=\"btn-confirm\" onclick=\"TransportUI.confirmPin()\">ยืนยันจุดนี้</button>\n      <button class=\"btn-cancel\" onclick=\"TransportUI.closeMapPicker()\">ยกเลิก</button>\n    </div>\n  </div>\n\n  <div id=\"popup-backdrop\" class=\"popup-backdrop\" onclick=\"TransportUI.closeImagePopup()\"></div>\n  <div id=\"image-popup\" class=\"image-popup-sheet\">\n    <div class=\"image-popup-header\">\n      <div class=\"drag-handle\"></div>\n      <h3>แนบภาพถ่าย<button class=\"btn-close-popup\" onclick=\"TransportUI.closeImagePopup()\"><svg viewBox=\"0 0 24 24\"><path d=\"M18 6L6 18M6 6l12 12\"/></svg></button></h3>\n    </div>\n    <div class=\"image-popup-body\">\n      <div class=\"image-upload-section\">\n        <div class=\"image-upload-title\">ภาพสิ่งของ</div>\n        <div class=\"upload-grid\">\n          <label class=\"upload-box\" id=\"box-item\">\n            <input type=\"file\" accept=\"image/jpeg,image/png,image/webp\" onchange=\"TransportUI.previewImage(this, 'box-item')\">\n            <svg viewBox=\"0 0 24 24\"><path d=\"M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z\"/><circle cx=\"12\" cy=\"13\" r=\"4\"/></svg>\n            <span>ถ่ายภาพ<br>หรืออัปโหลด</span>\n          </label>\n        </div>\n      </div>\n      <div class=\"image-upload-section\">\n        <div class=\"image-upload-title\">ภาพจุดส่ง (หน้าบ้าน/จุดสังเกต)</div>\n        <div class=\"upload-grid\">\n          <label class=\"upload-box\" id=\"box-dropoff\">\n            <input type=\"file\" accept=\"image/jpeg,image/png,image/webp\" onchange=\"TransportUI.previewImage(this, 'box-dropoff')\">\n            <svg viewBox=\"0 0 24 24\"><path d=\"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"/><polyline points=\"9 22 9 12 15 12 15 22\"/></svg>\n            <span>ถ่ายภาพ<br>หรืออัปโหลด</span>\n          </label>\n        </div>\n      </div>\n    </div>\n    <div class=\"image-popup-footer\">\n      <button class=\"btn-save-images\" onclick=\"TransportUI.saveImages()\">บันทึกภาพ</button>\n    </div>\n  </div>\n\n</div>";let host=null,pricing=null,requestKey=crypto.randomUUID(),sending=false,uploading=0,images={},imageVersions={},pins={},leafletPromise=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function loadLeaflet(){if(window.L)return Promise.resolve();if(leafletPromise)return leafletPromise;const css=document.createElement('link');css.rel='stylesheet';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.append(css);leafletPromise=new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.onload=ok;s.onerror=()=>{leafletPromise=null;no(Error('map'))};document.head.append(s)});return leafletPromise}
async function open(){if(!host){host=document.createElement('dialog');host.id='transportBooking';host.setAttribute('aria-label','เรียกรถรับส่ง');host.innerHTML=markup;document.body.append(host)}if(!host.open)host.showModal();try{if(!K.user)await K.boot();if(K.user.role!=='customer'){showToast('กรุณาใช้บัญชีลูกค้าเพื่อเรียกรถ');return}const data=await K.request('/config');pricing=data.transport;if(!pricing)throw Error('กรุณาอัปเดต server.cjs พร้อมชุดนี้');const profile=typeof cProfile!=='undefined'?cProfile:null;if(profile){host.querySelector('#transport-name').value=profile.customer_name||'';host.querySelector('#transport-phone').value=profile.phone||'';if(profile.lat!=null&&profile.lng!=null&&!pins.dropoff){pins.dropoff={lat:Number(profile.lat),lng:Number(profile.lng)};host.querySelector('#dropoff-input').value=profile.dropoff||'จุดส่งที่บันทึกไว้'}}updatePrice()}catch(e){pricing=null;showToast(e.message)}}
function close(){if(sending){showToast('กำลังส่งคำขอ กรุณารอสักครู่');return}host?.close()}
let currentVehicle = 'bike';
  let currentMode = 'delivery';
  let passengerCount = 1; 
  let maxPassengers = 1;  

  let currentPickTarget = null;
  let leafletMap = null;
  let currentCenter = { lat: 16.706, lng: 103.078 };
  let currentPlaceName = 'ตำแหน่งที่เลือก'; 
  let debounceTimer = null;
  
  let hasItemImage = false;
  let hasDropoffImage = false;

  function selectVehicle(type) {
    currentVehicle = type;
    maxPassengers = (type === 'bike') ? 1 : 4;
    
    host.querySelector('#'+'vs-screen').classList.add('hide');
    
    if (type === 'car') {
      switchMode('ride');
    } else {
      switchMode('delivery');
    }

    setTimeout(() => {
      host.querySelector('#'+'call-rider-container').classList.add('show');
    }, 150);
  }

  function goBackToVehicleSelection() {
    host.querySelector('#'+'call-rider-container').classList.remove('show');
    setTimeout(() => {
      host.querySelector('#'+'vs-screen').classList.remove('hide');
    }, 200);
  }

  function switchMode(mode) {
    currentMode = mode;
    const isDelivery = (mode === 'delivery');

    host.querySelector('#'+'btn-mode-delivery').classList.toggle('active', isDelivery);
    host.querySelector('#'+'btn-mode-ride').classList.toggle('active', !isDelivery);

    host.querySelector('#'+'parcel-section').style.display = isDelivery ? 'block' : 'none';
    host.querySelector('#'+'passenger-section').classList.toggle('show', !isDelivery);

    const titleText = host.querySelector('#'+'title-text');
    const pickupInput = host.querySelector('#'+'pickup-input');
    const dropoffInput = host.querySelector('#'+'dropoff-input');
    const fareLabel = host.querySelector('#'+'fare-label');

    if (isDelivery) {
      titleText.innerText = 'ส่งพัสดุ / อาหาร';
      pickupInput.placeholder = 'จุดรับพัสดุ';
      dropoffInput.placeholder = 'จุดส่งพัสดุ';
      fareLabel.innerText = 'ค่าฝากส่งตามระบบ';
      passengerCount = 1;
    } else {
      titleText.innerText = 'เรียกพี่วิน / ไรเดอร์';
      pickupInput.placeholder = 'จุดรับผู้โดยสาร';
      dropoffInput.placeholder = 'จุดหมายปลายทาง';
      fareLabel.innerText = 'ค่าบริการโดยสาร';
      passengerCount = 1;
    }

    updatePassengerUI();
    updatePrice();
  }

  function changePassenger(amount) {
    passengerCount += amount;
    if (passengerCount < 0) passengerCount = 1;
    if (passengerCount > maxPassengers) passengerCount = maxPassengers;
    
    updatePassengerUI();
    updatePrice();
  }

  function updatePassengerUI() {
    host.querySelector('#'+'count-display').innerText = passengerCount;
    host.querySelector('#'+'btn-minus').disabled = (passengerCount <= 1);
    host.querySelector('#'+'btn-plus').disabled = (passengerCount >= maxPassengers);
  }

  function updatePrice(){const p=host.querySelector('#price-text');if(!pricing){p.textContent='กำลังโหลดราคา…';return}const base=currentVehicle==='car'?pricing.car_base:currentMode==='ride'?pricing.bike_ride_base:pricing.bike_base;p.textContent=(base+(currentMode==='ride'?passengerCount*pricing.passenger_extra:0)).toLocaleString('th-TH')+' บาท';}

  /* Map & Others Standard */
  async function openMapPicker(target) {
    try{await loadLeaflet()}catch{showToast("โหลดแผนที่ไม่ได้ กรุณาลองใหม่");return}
    currentPickTarget = target;
    host.querySelector('#'+'map-picker-modal').classList.add('open');
    host.querySelector('#'+'place-search').value = '';
    currentCenter = pins[target] ? {...pins[target]} : { lat: 16.706, lng: 103.078 };
    updatePlaceName(currentCenter.lat, currentCenter.lng);

    if (!leafletMap) {
      leafletMap = L.map('picker-map', { zoomControl: false, attributionControl: true }).setView([currentCenter.lat, currentCenter.lng], 15);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 20,attribution:'&copy; OpenStreetMap contributors &copy; CARTO' }).addTo(leafletMap);
      leafletMap.on('move', function() {
        const center = leafletMap.getCenter();
        currentCenter = { lat: center.lat, lng: center.lng };
        host.querySelector('#'+'picker-place-name').innerText = 'กำลังค้นหาชื่อสถานที่...';
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => updatePlaceName(currentCenter.lat, currentCenter.lng), 800);
      });
    } else {
      leafletMap.setView([currentCenter.lat, currentCenter.lng], 15);
    }
    setTimeout(() => leafletMap.invalidateSize(), 300);
  }
  function closeMapPicker() { host.querySelector('#'+'map-picker-modal').classList.remove('open'); }
  async function updatePlaceName(lat,lng){currentPlaceName='พิกัด '+lat.toFixed(5)+', '+lng.toFixed(5);host.querySelector('#picker-place-name').textContent=currentPlaceName;}
  function handleSearchEnter(e) { if (e.key === 'Enter') { e.preventDefault(); searchLocation(); } }
  async function searchLocation(){const query=host.querySelector('#place-search').value.trim();if(!query){showToast('พิมพ์ชื่อสถานที่ก่อนค้นหา');return}const button=host.querySelector('#btn-search');button.disabled=true;try{const match=query.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);let point,name='';if(match){point={lat:Number(match[1]),lng:Number(match[2])}}else{const shop=typeof liveShops!=='undefined'?liveShops.find(s=>(s.name+' '+s.address).includes(query)&&s.lat!=null&&s.lng!=null):null;if(shop){point={lat:Number(shop.lat),lng:Number(shop.lng)};name=shop.name}else{const data=await K.request('/transport/search?q='+encodeURIComponent(query));point=data.results?.[0];name=point?.name||''}}if(!point||Math.abs(point.lat)>85||Math.abs(point.lng)>180){showToast('ไม่พบสถานที่ ลากแผนที่เพื่อปักหมุดได้');return}leafletMap.setView([point.lat,point.lng],16);currentCenter={lat:point.lat,lng:point.lng};updatePlaceName(point.lat,point.lng);if(name){clearTimeout(debounceTimer);currentPlaceName=name;host.querySelector('#picker-place-name').textContent=name}showToast('พบสถานที่แล้ว ตรวจหมุดก่อนยืนยัน')}catch(e){showToast(e.message)}finally{button.disabled=false}}
  function confirmPin(){pins[currentPickTarget]={...currentCenter};host.querySelector('#'+(currentPickTarget==='pickup'?'pickup-input':'dropoff-input')).value=currentPlaceName;showToast('บันทึกพิกัดแล้ว');closeMapPicker()}
  function getGPS(target){if(!navigator.geolocation){showToast('อุปกรณ์ไม่รองรับ GPS');return}showToast('กำลังค้นหาตำแหน่งจริง…');navigator.geolocation.getCurrentPosition(p=>{pins[target]={lat:p.coords.latitude,lng:p.coords.longitude};host.querySelector('#'+(target==='pickup'?'pickup-input':'dropoff-input')).value='ตำแหน่งปัจจุบัน '+p.coords.latitude.toFixed(5)+', '+p.coords.longitude.toFixed(5);showToast('รับพิกัด GPS แล้ว')},()=>showToast('รับ GPS ไม่ได้ กรุณาปักหมุดบนแผนที่'),{enableHighAccuracy:true,timeout:12000,maximumAge:0})}
  function openImagePopup() { host.querySelector('#'+'popup-backdrop').classList.add('open'); host.querySelector('#'+'image-popup').classList.add('open'); }
  function closeImagePopup() { host.querySelector('#'+'popup-backdrop').classList.remove('open'); host.querySelector('#'+'image-popup').classList.remove('open'); }
  async function previewImage(input,boxId){const file=input.files?.[0];if(!file)return;const box=host.querySelector('#'+boxId),version=(imageVersions[boxId]||0)+1;imageVersions[boxId]=version;uploading++;try{if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>15000000)throw Error('ใช้ภาพ JPG PNG WebP ไม่เกิน 15 MB');const bmp=await createImageBitmap(file);let data;try{const ratio=Math.min(1,1000/Math.max(bmp.width,bmp.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(bmp.width*ratio));c.height=Math.max(1,Math.round(bmp.height*ratio));c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);for(const q of [.8,.6,.4,.2]){data=c.toDataURL('image/jpeg',q);if(data.length<600000)break}if(data.length>=600000)throw Error('ภาพใหญ่เกินไป')}finally{bmp.close()}if(imageVersions[boxId]!==version)return;images[boxId]=data;box.classList.add('has-image');let img=box.querySelector('img');if(!img){img=document.createElement('img');img.alt=boxId==='box-item'?'ภาพสิ่งของ':'ภาพจุดส่ง';box.append(img)}img.src=data;let remove=box.querySelector('button');if(!remove){remove=document.createElement('button');remove.type='button';remove.className='btn-remove-img';remove.setAttribute('aria-label','ลบภาพ');remove.innerHTML='<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>';remove.onclick=e=>removeImage(e,boxId);box.append(remove)}box.querySelectorAll(':scope>svg,:scope>span').forEach(el=>el.hidden=true);hasItemImage=!!images['box-item'];hasDropoffImage=!!images['box-dropoff'];showToast('เตรียมภาพแล้ว')}catch(e){showToast(e.message)}finally{uploading--}}
  function removeImage(e, boxId) {
    e.preventDefault(); e.stopPropagation();
    const box = host.querySelector('#'+boxId);images[boxId]='';imageVersions[boxId]=(imageVersions[boxId]||0)+1;
    box.classList.remove('has-image');
    const isItem = boxId === 'box-item';
    const iconSvg = isItem ? '<svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
    box.innerHTML = `<input type="file" accept="image/*" onchange="TransportUI.previewImage(this, '${boxId}')">${iconSvg}<span>ถ่ายภาพ<br>หรืออัปโหลด</span>`;
    if (boxId === 'box-item') hasItemImage = false;
    if (boxId === 'box-dropoff') hasDropoffImage = false;
  }
  function saveImages() {
    const statusText = host.querySelector('#'+'attach-status');
    if (hasItemImage || hasDropoffImage) {
      let txt = [];
      if (hasItemImage) txt.push('ภาพสิ่งของ');
      if (hasDropoffImage) txt.push('ภาพจุดส่ง');
      statusText.innerText = `แนบแล้ว: ${txt.join(', ')}`; statusText.style.color = 'var(--ok)';
    } else {
      statusText.innerText = 'แนบภาพสิ่งของ / จุดส่ง (ไม่บังคับ)'; statusText.style.color = 'var(--tx2)';
    }
    showToast('บันทึกภาพเรียบร้อย'); closeImagePopup();
  }
  function showToast(msg) {
    const toast = host.querySelector('#'+'toast');
    toast.innerText = msg; toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

async function callRider(){if(sending)return;if(!pricing){showToast('ยังโหลดราคาจากระบบไม่ได้ กรุณาปิดแล้วเปิดใหม่');return}const pickup=host.querySelector('#pickup-input').value.trim(),dropoff=host.querySelector('#dropoff-input').value.trim(),name=host.querySelector('#transport-name').value.trim(),phone=host.querySelector('#transport-phone').value.trim(),description=host.querySelector('#parcel-desc').value.trim(),note=host.querySelector('#parcel-note').value.trim();if(!pins.pickup||!pins.dropoff||!pickup||!dropoff){showToast('กรุณาปักหมุดจุดรับและจุดส่งให้ครบ');return}if(!name||!/^\+?[0-9]{9,15}$/.test(phone)){showToast('กรอกชื่อและเบอร์โทรให้ถูกต้อง');return}if(currentMode==='delivery'&&!description){showToast('กรอกรายละเอียดสิ่งของ');return}if(currentMode==='delivery'&&!host.querySelector('#transport-consent').checked){showToast('กรุณายินยอมให้ตรวจสิ่งของก่อนรับส่ง');return}if(uploading){showToast('รอเตรียมภาพให้เสร็จก่อน');return}sending=true;const btn=host.querySelector('#call-btn');btn.disabled=true;btn.classList.add('loading');host.querySelector('#spinner').style.display='block';host.querySelector('#btn-text').textContent='กำลังส่งคำขอ…';try{const payload={kind:currentMode==='ride'?'ride':'parcel',vehicle:currentVehicle,passenger_count:currentMode==='ride'?passengerCount:undefined,customer_name:name,phone,pickup,dropoff,pickup_lat:pins.pickup.lat,pickup_lng:pins.pickup.lng,lat:pins.dropoff.lat,lng:pins.dropoff.lng,description,note,inspection_consent:currentMode==='delivery'?host.querySelector('#transport-consent').checked:false,image:currentMode==='delivery'?images['box-dropoff']||'':'',inside_image:currentMode==='delivery'?images['box-item']||'':''};const order=await K.request('/orders',{method:'POST',headers:{'Idempotency-Key':requestKey},body:JSON.stringify(payload)});requestKey=crypto.randomUUID();if(host.querySelector('#transport-remember').checked){const profile={customer_name:name,phone,dropoff,lat:pins.dropoff.lat,lng:pins.dropoff.lng};try{localStorage.setItem('kranuan.delivery.v1',JSON.stringify(profile));if(typeof cProfile!=='undefined')cProfile=profile}catch{}}const result=document.createElement('section');result.className='transport-result';result.innerHTML='<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27"/><path d="m18 32 10 10 19-22"/></svg><h2>ส่งคำขอเข้าคิวแล้ว</h2><p>กำลังรอไรเดอร์รับงานจริง</p><p>หมายเลข #'+esc(order.id.slice(-6).toUpperCase())+'</p><p>'+esc(order.vehicle_label)+' · '+(order.type==='ride'?'ผู้โดยสาร '+Number(order.passenger_count)+' คน':'ส่งของ')+'</p><strong>ค่าบริการ '+Number(order.fee).toLocaleString('th-TH')+' บาท</strong><button type="button">ติดตามงานของฉัน</button>';result.querySelector('button').onclick=async()=>{host.close();result.remove();images={};pins={};imageVersions={};leafletMap?.remove();leafletMap=null;host.remove();host=null;await centralLoad();go('ออเดอร์ของฉัน')};host.querySelector('.phone-mockup').append(result);centralLoad().catch(()=>{})}catch(e){showToast(e.message)}finally{sending=false;btn.disabled=false;btn.classList.remove('loading');host.querySelector('#spinner').style.display='none';host.querySelector('#btn-text').textContent='ยืนยันเรียกไรเดอร์'}}
window.TransportUI={open,close,selectVehicle,goBackToVehicleSelection,switchMode,changePassenger,openMapPicker,getGPS,openImagePopup,handleSearchEnter,searchLocation,confirmPin,closeMapPicker,closeImagePopup,previewImage,saveImages,removeImage,callRider};
const css=document.createElement('link');css.rel='stylesheet';css.href='/transport-booking.css?v=20261030-1';document.head.append(css);
deliveryFormHtml=function(){return '<section class="c-courier"><div class="c-page-title"><h2>เรียกรถใกล้บ้าน</h2><p>เลือกมอเตอร์ไซค์หรือรถยนต์ สำหรับส่งของและรับส่งผู้โดยสาร</p></div><button class="c-btn c-primary c-wide" type="button" onclick="TransportUI.open()">เลือกประเภทรถและจุดรับส่ง</button></section>'};let wasTransport=false;const previous=render;render=function(){previous();if(view==='ส่งของ'){if(!wasTransport){wasTransport=true;queueMicrotask(open)}}else wasTransport=false};if(view==='ส่งของ')render();
})();