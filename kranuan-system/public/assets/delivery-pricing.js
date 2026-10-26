
(function(global){
'use strict';
const policy=Object.freeze({version:'kranuan-proposal-2026-10-26',status:'proposal',baseBaht:25,includedKm:2,extraPerKm:5,maxServiceKm:15});
function point(lat,lng){if(lat===''||lng===''||lat===null||lng===null)throw Error('กรอกพิกัดให้ครบ');lat=Number(lat);lng=Number(lng);if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)throw Error('พิกัดไม่ถูกต้อง');return {lat,lng}}
function haversine(a,b){const rad=x=>x*Math.PI/180;const dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng);const h=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)))}
function quote(km){if(!Number.isFinite(km)||km<0)throw Error('ระยะทางไม่ถูกต้อง');const extraKm=Math.ceil(Math.max(0,Number((km-policy.includedKm).toFixed(6))));return {km,extraKm,base:policy.baseBaht,extra:extraKm*policy.extraPerKm,total:policy.baseBaht+extraKm*policy.extraPerKm,outside:km>policy.maxServiceKm,policyVersion:policy.version,isProposal:true}}
global.KranuanPricing={policy,point,haversine,quote};
})(globalThis);
