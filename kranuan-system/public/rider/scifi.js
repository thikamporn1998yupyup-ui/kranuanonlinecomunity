(function(){
'use strict';
var D=document,$=function(s){return D.querySelector(s)};
var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

/* background layers */
var fx=D.createElement('div');fx.id='fx';
fx.innerHTML='<div class="fx-stars"></div><div class="fx-grid"></div>'+
 '<div class="fx-radar"><i class="sweep"></i><div class="blips"></div><span class="cap">SCANNING</span></div>'+
 '<canvas class="fx-rain"></canvas><div class="fx-rings"><b></b><b></b><b></b></div><div class="fx-scan"></div>';
D.body.insertBefore(fx,D.body.firstChild);

/* map HUD reticle */
var mc=$('#realMapContainer');
if(mc){
 var h=D.createElement('div');h.className='hud';
 h.innerHTML='<svg viewBox="-120 -120 240 240" aria-hidden="true"><circle class="a" r="104"/><circle class="b" r="76"/><circle class="c" r="44"/>'+
 '<path d="M0-114v12M0 114v-12M-114 0h12M114 0h-12"/><path d="M-62-44v-18h18M62-44v-18h-18M-62 44v18h18M62 44v18h-18"/></svg>';
 mc.appendChild(h);
}

/* data rain (history scene only) */
var cv=$('#fx .fx-rain'),cx=cv.getContext('2d'),fs=16,drops=[],timer=0,scene='';
function sizeRain(){cv.width=innerWidth;cv.height=innerHeight;drops=[];for(var i=0;i<Math.ceil(cv.width/fs);i++)drops.push(Math.random()*-40)}
function tickRain(){
 cx.fillStyle='rgba(3,5,11,.14)';cx.fillRect(0,0,cv.width,cv.height);cx.font=fs+'px monospace';
 for(var i=0;i<drops.length;i++){
  var ch='0123456789ABCDEF'.charAt(Math.random()*16|0);
  cx.fillStyle=Math.random()>.96?'#ffffff':'rgba(181,123,255,.85)';
  cx.fillText(ch,i*fs,drops[i]*fs);
  if(drops[i]*fs>cv.height&&Math.random()>.975)drops[i]=0;
  drops[i]++;
 }
}
function rainOn(on){clearInterval(timer);timer=0;cx.clearRect(0,0,cv.width,cv.height);if(on&&!reduce){sizeRain();timer=setInterval(tickRain,70)}}
addEventListener('resize',function(){if(timer)sizeRain()});

/* radar blips = pending jobs */
var sig='';
function radar(){
 var p=[];try{p=pending()}catch(e){}
 var s=p.map(function(j){return j.id}).join('|');
 if(s===sig)return;sig=s;
 $('#fx .blips').innerHTML=p.map(function(j){
  var h=0,id=String(j.id);for(var i=0;i<id.length;i++)h=(h*31+id.charCodeAt(i))>>>0;
  var a=(h%360)*Math.PI/180,r=18+((h>>>8)%64);
  return '<i style="left:'+(50+Math.cos(a)*r/2)+'%;top:'+(50+Math.sin(a)*r/2)+'%"></i>';
 }).join('');
 $('#fx .cap').textContent='SCANNING // '+p.length+' สัญญาณงาน';
}

/* ring gauges + telemetry on job cards */
function decorate(){
 document.querySelectorAll('.dash-stats button').forEach(function(b){
  var n=parseFloat((b.querySelector('strong')||{}).textContent)||0;
  b.style.setProperty('--p',Math.min(100,n/5*100));
 });
 var list=[];try{list=jobs}catch(e){}
 document.querySelectorAll('#screen .card').forEach(function(c){
  var btn=c.querySelector('[data-act="accept"],[data-act="picked"],[data-act="delivered"]');
  if(!btn||c.querySelector('.tele'))return;
  var j=list.filter(function(x){return x.id===btn.dataset.id})[0],tl=c.querySelector('.timeline');
  if(!j||!tl)return;
  var km=Number(j.distance_km)||0,eta=Math.max(3,Math.round(km*3+2));
  var el=D.createElement('div');el.className='tele';
  el.innerHTML='<div><span>ระยะทาง</span><b>'+km.toFixed(1)+'<small>กม.</small></b></div>'+
   '<div><span>เวลาโดยประมาณ</span><b>'+eta+'<small>นาที</small></b></div>'+
   '<div><span>ค่าเฉลี่ยต่อกม.</span><b>'+(km?Math.round(Number(j.fee)/km):'–')+'<small>฿</small></b></div>'+
   '<i class="bar"><u style="width:'+Math.min(100,km/6*100)+'%"></u></i>';
  tl.parentNode.insertBefore(el,tl.nextSibling);
 });
}

/* switch scene with the menu */
function curTab(){try{return tab}catch(e){return 'home'}}
function update(){
 var t=curTab();
 if(t!==scene){
  scene=t;D.body.dataset.scene=t;
  var s=$('#screen');
  if(s){s.classList.remove('enter');void s.offsetWidth;s.classList.add('enter');setTimeout(function(){s.classList.remove('enter')},900)}
  rainOn(t==='history');
  setTimeout(function(){try{map&&map.invalidateSize()}catch(e){}},80);
 }
 decorate();radar();
}
var scr=$('#screen');
if(scr)new MutationObserver(update).observe(scr,{childList:true});
update();
})();
