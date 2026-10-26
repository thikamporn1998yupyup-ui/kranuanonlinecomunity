# กระนวนใกล้บ้าน — ติดตั้งชุดฟรี

> คู่มือนี้เป็นคู่มือหลักสำหรับชุด Render Free + Firebase Realtime Database โปรดใช้ค่านี้แทนคำแนะนำเก่าใน README-DETAILS-TH.md ซึ่งเขียนไว้ก่อนเปลี่ยนมาใช้ Firebase

## ค่าใช้จ่าย

- Render: เลือก Web Service แบบ Free ($0) และอย่าเพิ่ม Persistent Disk
- Firebase: ใช้แผน Spark โดยไม่ต้องอัปเกรดตามที่ตั้งใจไว้ โควตาฟรีมีขีดจำกัด เมื่อใช้ครบระบบอาจถูกจำกัดจนกว่าจะเริ่มรอบใหม่
- Render Free อาจพักบริการเมื่อไม่มีผู้เข้าชม ทำให้การเปิดหน้าเว็บครั้งแรกหลังพักใช้เวลานานขึ้น

## ข้อมูลจาก Firebase ของคุณ

- Project: kranuan-app
- Realtime Database URL: https://kranuan-app-default-rtdb.asia-southeast1.firebasedatabase.app
- ระบบบันทึกข้อมูลไว้ที่ /kranuanonline/backend_v1/state
- SQLite ทำงานชั่วคราวในหน่วยความจำของ Render; Firebase เป็นที่เก็บข้อมูลถาวร จึงไม่ต้องซื้อดิสก์ Render

ข้อจำกัดของรุ่นนี้: เว็บหนึ่ง instance โหลดและบันทึกข้อมูลทั้งชุดเข้า Firebase เมื่อ API ทำงาน เหมาะกับช่วงเริ่มต้นและปริมาณไม่มาก หากมีคนใช้มากหรือเพิ่มหลาย instance ควรออกแบบการเก็บข้อมูลใหม่ก่อน

## ตั้งค่าบริการ Render

ในหน้า New Web Service ให้ตั้ง:

- Build Command: npm install --omit=dev
- Start Command: node server.cjs
- Instance Type: Free
- Root Directory: เว้นว่าง
- Persistent Disk: ไม่ต้องเพิ่ม

เพิ่ม Environment Variables เหล่านี้:

| Key | ค่า |
| --- | --- |
| NODE_ENV | production |
| FIREBASE_DATABASE_URL | https://kranuan-app-default-rtdb.asia-southeast1.firebasedatabase.app |
| FIREBASE_SERVICE_ACCOUNT_JSON | เนื้อหา JSON service account ทั้งไฟล์ ใส่ใน Render เท่านั้น |
| ADMIN_USERNAME | admin |
| ADMIN_PASSWORD | รหัสผ่านใหม่ยาวอย่างน้อย 12 ตัวอักษร |
| APP_ORIGIN | URL เว็บ Render ของคุณ เช่น https://kranuanonline.onrender.com |
| DELIVERY_FEE_THB | 25 |

APP_ORIGIN ต้องตรงกับ URL เว็บ Render ทุกตัวอักษรและไม่มี / ปิดท้าย

## ทำกุญแจ Firebase อย่างปลอดภัย

1. ใน Firebase Console ไปที่ Project settings > Service accounts
2. สร้าง private key และดาวน์โหลดไฟล์ JSON เก็บไว้ในเครื่อง
3. อย่าอัปโหลดไฟล์นี้ไป GitHub อย่าใส่ไว้ในโฟลเดอร์แอป และอย่าส่งผ่านแชต
4. เปิด Render > Environment แล้วเพิ่ม FIREBASE_SERVICE_ACCOUNT_JSON จากเนื้อหา JSON ทั้งหมด
5. ตัวแปรนี้เป็นกุญแจสิทธิ์สูงของ Firebase; ถ้ารั่ว ให้ลบ/revoke key ใน Firebase ทันทีและสร้างใหม่

## Firebase Rules

หลังจากตั้งค่า Render Environment Variables แล้ว ให้แทน Rules ระดับรากด้วย:

``{ "rules": { ".read": false, ".write": false } }``

แล้วกด Publish ใน Firebase Console การปิดนี้หยุดแอปหรือเว็บอื่นที่อ่าน/เขียน Firebase โดยตรง ชุดเว็บนี้เชื่อมผ่าน server ด้วย Admin SDK

## เริ่มใช้งานทีละข้อ

1. วางเนื้อหาภายในโฟลเดอร์ kranuan-system ที่ root ของ GitHub repo ไม่ใช่วางโฟลเดอร์ย่อย
2. Commit ไฟล์ และรอ Render เริ่ม deploy อัตโนมัติ
3. เพิ่ม Environment Variables ข้างต้นใน Render แล้วกด Manual Deploy
4. เปิด URL Render; ถ้าหน้าเว็บเปิดได้ ให้ตั้ง Rules ใน Firebase ตามตัวอย่างด้านบน
5. เข้า /admin.html ด้วยชื่อ admin และรหัสผ่านที่ตั้งใน Render แล้วสร้างบัญชีร้านค้าและไรเดอร์

หาก Render แจ้งว่า Firebase credentials ไม่ถูกต้อง ให้ตรวจ JSON ใน Render Environment โดยไม่ส่งกุญแจมาในแชต

## สำคัญ

- อย่าลบ /kranuanonline/backend_v1/state เพราะเป็นข้อมูลแอป
- ถ้ามีแอปอื่นใช้ path นี้ ต้องเลือก path ใหม่ก่อนเริ่ม deploy
- ในภาพ Rules เดิมเปิดให้ใครก็ได้อ่านและเขียนจนถึง 25 พ.ย. 2026; ระหว่างยังไม่ปิด Rules ผู้ที่รู้ URL ฐานข้อมูลอาจเข้าถึงข้อมูลได้
- แพ็กนี้ไม่รวม private key หรือข้อมูลลับ
