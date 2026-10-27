'use strict';
const qr=require('./vendor/qrcode.cjs');
function crc16(s){let crc=0xffff;for(const ch of Buffer.from(s,'ascii')){crc^=ch<<8;for(let i=0;i<8;i++)crc=((crc&0x8000)?(crc<<1)^0x1021:crc<<1)&0xffff}return crc.toString(16).toUpperCase().padStart(4,'0')}
function payload(phone,satang){if(!/^0[0-9]{9}$/.test(phone))throw Error('ต้องเป็นหมายเลขโทรศัพท์ไทย 10 หลักที่ผูกพร้อมเพย์');if(!Number.isSafeInteger(satang)||satang<100||satang>100000000)throw Error('ยอดชำระไม่ถูกต้อง');const tlv=(tag,value)=>tag+String(value.length).padStart(2,'0')+value;const account=tlv('00','A000000677010111')+tlv('01','0066'+phone.slice(1));const value=tlv('00','01')+tlv('01','12')+tlv('29',account)+tlv('53','764')+tlv('54',(satang/100).toFixed(2))+tlv('58','TH')+'6304';return value+crc16(value)}
function svg(phone,satang){const data=payload(phone,satang),code=qr(0,'M');code.addData(data,'Byte');code.make();return code.createSvgTag({cellSize:6,margin:24,scalable:true})}
module.exports={payload,svg,crc16};
