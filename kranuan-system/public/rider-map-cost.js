/* Rider map/cost add-on. Load AFTER rider-modern.js. No order or fare mutations. */
(function () {
  'use strict';
  if (window.__riderMapCost) return;
  window.__riderMapCost = true;
  function number(v) { return v === '' || v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null; }
  function point(lat,lng) {
    lat=number(lat);lng=number(lng);
    return lat!==null&&lng!==null&&Math.abs(lat)<=90&&Math.abs(lng)<=180 ? [lat,lng] : null;
  }
  function km(a,b) {
    if(!a||!b)return null;
    var r=Math.PI/180,h=Math.sin((b[0]-a[0])*r/2)**2+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin((b[1]-a[1])*r/2)**2;
    return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
  }
  function cost(distance,fee,c) {
    var fuel=number(c.fuel),economy=number(c.economy),wear=number(c.wear),other=number(c.other),extra=number(c.extra),target=number(c.target);
    if(distance===null||number(fee)===null||fuel===null||fuel<=0||economy===null||economy<=0||wear===null||wear<0||other===null||other<0||extra===null||extra<0)return null;
    var totalKm=distance+extra,gas=totalKm/economy*fuel,reserve=totalKm*wear,total=gas+reserve+other,net=Number(fee)-total;
    return {km:totalKm,fuel:gas,wear:reserve,total:total,net:net,target:target,meets:target===null||target<0?null:net>=target};
  }
  window.RiderTripMath={point:point,km:km,cost:cost};
  if(typeof render!=='function'||typeof active!=='function')return;
  var selected='',origins={},mapLayer=null,tileMap=null,fitKey='',lastRoute='',panel=null;
  var settings={fuel:'',economy:'',wear:'',other:'0',extra:'0',target:''},tripKm={};
  function key(){return 'kranuan_rider_cost_'+(typeof cfg!=='undefined'?cfg.riderId:'local');}
  var loadedKey='';
  function loadSettings(){if(loadedKey===key())return;loadedKey=key();settings={fuel:'',economy:'',wear:'',other:'0',extra:'0',target:''};try{Object.assign(settings,JSON.parse(localStorage.getItem(loadedKey)||'{}'));}catch(e){}}
  function money(n){return n===null?'—':Number(n).toLocaleString('th-TH',{maximumFractionDigits:2})+' บาท';}
  function distance(n){return n===null?'ไม่มีพิกัด':n.toFixed(2)+' กม.';}
  function current(){return typeof pos!=='undefined'&&pos?point(pos.lat,pos.lng):null;}
  function list(){return jobs.filter(function(j){return j.status==='pending'||((j.status==='accepted'||j.status==='picked')&&j.rider_id===cfg.riderId);});}
  function job(){var a=active();return a||list().find(function(j){return j.id===selected;})||null;}
  function put(id,value){var e=document.getElementById(id);if(e&&e.textContent!==value)e.textContent=value;}
  function snapshot(j){
    if(j&&!origins[j.id]&&current())origins[j.id]={point:current(),status:j.status};
    var o=j&&origins[j.id],p=j&&point(j.pickup_lat,j.pickup_lng),d=j&&point(j.dropoff_lat,j.dropoff_lng);
    var approach=o?km(o.point,p):null,delivery=km(p,d);
    return {pickup:p,drop:d,approach:approach,delivery:delivery,total:approach===null||delivery===null?null:approach+delivery,partial:!!(o&&o.status==='picked')};
  }
  function mount(){
    if(panel)return;
    panel=document.createElement('section');panel.id='riderTripPanel';panel.className='rmc-panel';
    panel.innerHTML='<div class="rmc-heading"><div><small>TRIP INSIGHT</small><h2>งานนี้ วิ่งคุ้มไหม?</h2></div><button type="button" data-rmc-settings>ตั้งต้นทุน</button></div><label for="rmcJob">งานที่แสดงบนแผนที่</label><select id="rmcJob"></select><p id="rmcRouteNote" class="rmc-note" role="status"></p><div class="rmc-distances"><div><small>ไปรับ · เส้นตรง</small><b id="rmcApproach">—</b></div><div><small>รับ → ส่ง · เส้นตรง</small><b id="rmcDelivery">—</b></div></div><div class="rmc-estimate"><div><small>ค่ารอบไรเดอร์</small><b id="rmcFee">—</b></div><div><small>ต้นทุนประมาณ</small><b id="rmcCost">—</b></div><div><small>เหลือสุทธิประมาณ</small><b id="rmcNet">—</b></div></div><p id="rmcVerdict" class="rmc-verdict" role="status"></p><p id="rmcBreakdown" class="rmc-note"></p><div class="rmc-tools"><button type="button" data-rmc-gps>ตำแหน่งฉัน</button><button type="button" data-rmc-fit>ดูสองจุด</button><a id="rmcNavigate" target="_blank" rel="noopener">เปิดนำทาง</a></div><p class="rmc-note">เส้นบนแผนที่เป็นเส้นตรง ไม่ใช่เส้นทางถนน • จุดลูกค้าคือพิกัดปลายทางที่แนบในงาน ไม่ใช่ GPS สดของลูกค้า</p>';
    var mc=document.getElementById('realMapContainer');if(mc)mc.after(panel);else document.querySelector('.content').before(panel);
    panel.querySelector('select').onchange=function(e){selected=e.target.value;fitKey='';lastRoute='';update();};
    panel.querySelector('[data-rmc-settings]').onclick=openSettings;
    panel.querySelector('[data-rmc-fit]').onclick=function(){fitKey='';lastRoute='';update();};
    panel.querySelector('[data-rmc-gps]').onclick=function(){
      if(!navigator.geolocation){put('rmcRouteNote','อุปกรณ์ไม่รองรับ GPS');return;}
      navigator.geolocation.getCurrentPosition(function(p){pos={lat:p.coords.latitude,lng:p.coords.longitude};fitKey='';lastRoute='';update();},function(){put('rmcRouteNote','ยังไม่ได้ตำแหน่ง กรุณาอนุญาต GPS และเปิดตำแหน่งในเครื่อง');},{enableHighAccuracy:true,timeout:15000,maximumAge:5000});
    };
  }
  function openSettings(){
    loadSettings();var j=job(),d=document.getElementById('riderCostSettings');
    if(!d){d=document.createElement('dialog');d.id='riderCostSettings';d.className='rmc-settings';document.body.appendChild(d);}
    var fields=[['fuel','ราคาน้ำมัน (บาท/ลิตร)',false],['economy','รถวิ่งได้ (กม./ลิตร)',false],['wear','สำรองค่าใช้รถ (บาท/กม.)',true],['other','ค่าธรรมเนียม/ค่าใช้จ่ายอื่น (บาท/งาน)',true],['extra','ระยะเผื่อกลับหรือวิ่งเพิ่ม (กม.)',true],['target','อยากเหลือสุทธิอย่างน้อย (บาท/งาน)',true]];
    d.innerHTML='<form><h2>ต้นทุนของรถคุณ</h2><p>กรอกตามรถที่ใช้จริง ไม่รวมราคาสินค้าของลูกค้า</p>'+fields.map(function(f){return '<label>'+f[1]+'<input name="'+f[0]+'" type="number" inputmode="decimal" step="any" min="'+(f[2]?'0':'0.01')+'" required value="'+esc(settings[f[0]])+'"></label>';}).join('')+(j?'<label>ระยะถนนรวมทั้งงานที่ทราบ (กม.)<input name="road" type="number" inputmode="decimal" step="any" min="0" value="'+esc(tripKm[j.id]||'')+'"></label><small>รวมไปรับและไปส่ง ไม่รวมระยะเผื่อที่กรอกด้านบน เว้นว่างเพื่อดูต้นทุนจากเส้นตรงเท่านั้น</small>':'')+'<p class="rmc-note">ค่ารอบหักค่าน้ำมัน ค่าใช้รถ และค่าใช้จ่ายอื่น เป็นเพียงประมาณการ ไม่ใช่ยอดโอนเงินจริง</p><div class="rmc-tools"><button type="button" data-close>ปิด</button><button type="submit">บันทึก</button></div></form>';
    d.querySelector('[data-close]').onclick=function(){d.close();};
    d.querySelector('form').onsubmit=function(e){e.preventDefault();var data=Object.fromEntries(new FormData(e.target));fields.forEach(function(f){settings[f[0]]=data[f[0]];});if(j)tripKm[j.id]=data.road;try{localStorage.setItem(key(),JSON.stringify(settings));}catch(err){}d.close();update();};d.showModal();
  }
  function mapUpdate(j,s){
    if(typeof map==='undefined'||!map||!window.L)return;
    if(tileMap!==map){
      tileMap=map;map.dragging.enable();setTimeout(function(){map.invalidateSize()},300);setTimeout(function(){map.invalidateSize()},1500);
      map.eachLayer(function(layer){if(layer instanceof L.TileLayer){layer.options.referrerPolicy='origin';layer.on('tileerror',function(){put('rmcRouteNote','โหลดแผนที่ไม่สำเร็จ ระยะและต้นทุนยังดูได้ กรุณาลองใหม่ภายหลัง');});layer.redraw();}});
    }
    var gps=current();
    if(typeof pin!=='undefined'&&pin){if(gps){if(!map.hasLayer(pin))pin.addTo(map);pin.setLatLng(gps);pin.bindTooltip('ไรเดอร์ · ตำแหน่งล่าสุด');}else if(map.hasLayer(pin))map.removeLayer(pin);}
    if(window.RiderHubRoads){if(mapLayer){map.removeLayer(mapLayer);mapLayer=null;}return;}
    var points=gps?[gps]:[],route=[gps,j&&j.status!=='picked'?s.pickup:null,s.drop].filter(Boolean);
    var signature=JSON.stringify([j&&j.id,j&&j.status,gps,s.pickup,s.drop]);
    if(lastRoute!==signature){
      lastRoute=signature;if(mapLayer)map.removeLayer(mapLayer);mapLayer=L.layerGroup().addTo(map);
      if(j&&s.pickup){L.circleMarker(s.pickup,{radius:7,color:'#fff',weight:2,fillColor:'#ffae6b',fillOpacity:1}).bindTooltip('จุดรับ').addTo(mapLayer);points.push(s.pickup);}
      if(j&&s.drop){L.circleMarker(s.drop,{radius:8,color:'#fff',weight:2,fillColor:'#74dfcb',fillOpacity:1}).bindTooltip('ลูกค้า · จุดส่งที่บันทึกไว้').addTo(mapLayer);points.push(s.drop);}
      // Draw separate known legs; do not bridge across a missing pickup coordinate.
      if(gps&&j&&j.status!=='picked'&&s.pickup)L.polyline([gps,s.pickup],{color:'#ffae6b',weight:4,dashArray:'8 7'}).addTo(mapLayer);
      if(j&&j.status==='picked'&&gps&&s.drop)L.polyline([gps,s.drop],{color:'#74dfcb',weight:4,dashArray:'8 7'}).addTo(mapLayer);
      else if(j&&s.pickup&&s.drop)L.polyline([s.pickup,s.drop],{color:'#74dfcb',weight:4,dashArray:'8 7'}).addTo(mapLayer);
      var fk=j?j.id+':'+j.status:'gps';
      if(fitKey!==fk&&points.length){fitKey=fk;map.invalidateSize();if(points.length>1)map.fitBounds(L.latLngBounds(points),{paddingTopLeft:[35,110],paddingBottomRight:[35,70],maxZoom:16});else map.setView(points[0],15);}
    }
  }
  function update(){
    mount();loadSettings();var visible=tab==='home'||(tab==='jobs'&&!window.RiderHubRoads);document.body.classList.remove('rmc-map-screen');panel.hidden=!visible;if(!visible)return;
    var j=job(),a=active(),rows=list(),select=panel.querySelector('select'),old=select.value;
    var html=rows.length?'<option value="">เลือกงานเพื่อประเมิน</option>'+rows.map(function(x){return '<option value="'+esc(x.id)+'">'+esc(x.shop||'งาน')+(x===a?' · งานที่รับอยู่':' · ประเมินก่อนรับ')+'</option>';}).join(''):'<option value="">ยังไม่มีงาน</option>';
    if(select.innerHTML!==html)select.innerHTML=html;select.value=j?j.id:'';select.disabled=!!a||!rows.length;
    var s=snapshot(j),manual=j?number(tripKm[j.id]):null,c=j?cost(manual!==null?manual:s.total,j.fee,settings):null;
    put('rmcApproach',distance(s.approach));put('rmcDelivery',distance(s.delivery));put('rmcFee',j?money(number(j.fee)):'—');put('rmcCost',c?money(c.total):'—');put('rmcNet',c?money(c.net):'—');
    put('rmcRouteNote',!current()?'ยังไม่ได้ GPS ไรเดอร์ แตะ “ตำแหน่งฉัน” เพื่อขอพิกัด':!j?'เลือกงานเพื่อแสดงจุดรับและจุดส่ง':!s.pickup||!s.drop?'งานนี้มีพิกัดไม่ครบ จะแสดงเฉพาะจุดที่ทราบ':s.partial?'เปิดหน้าระหว่างส่ง: ไม่ทราบระยะที่วิ่งมาก่อนหน้านี้':'ไปรับจากตำแหน่งเริ่มประเมิน · จุดไรเดอร์อัปเดตตาม GPS');
    var verdict=!j?'เลือกงานเพื่อประเมิน':!c?'ตั้งต้นทุนรถและตรวจพิกัดก่อนประเมิน':manual===null?'ต้นทุนจากเส้นตรงเท่านั้น ยังไม่พอตัดสินความคุ้ม':c.meets===null?'ตั้งเป้าเงินเหลือต่องานเพื่อเปรียบเทียบ':c.net<0?'ประมาณการ: ค่ารอบไม่พอต้นทุน':c.meets?'ประมาณการ: ถึงเป้าเงินเหลือที่ตั้งไว้':'ประมาณการ: ยังไม่ถึงเป้าเงินเหลือที่ตั้งไว้';
    put('rmcVerdict',verdict);put('rmcBreakdown',c?'ระยะคำนวณ '+distance(c.km)+' · น้ำมัน '+money(c.fuel)+' · ค่าใช้รถ '+money(c.wear)+' · อื่น ๆ '+money(number(settings.other)):'กรอกต้นทุนตามรถจริงได้ที่ปุ่ม “ตั้งต้นทุน”');
    var nav=panel.querySelector('#rmcNavigate'),target=j&&(j.status==='picked'?s.drop:s.pickup);nav.hidden=!target;nav.href=target?'https://www.google.com/maps/dir/?api=1&destination='+target.join(',')+'&travelmode=driving':'#';
    mapUpdate(j,s);
  }
  window.RiderTripUI={settings:function(){loadSettings();return Object.assign({},settings);},openSettings:openSettings};
  var previous=render;render=function(){previous();update();};render();
  var interval=setInterval(update,2000);addEventListener('pagehide',function(){clearInterval(interval);});
})();
