# คู่มือติดตั้งชุดฟรี: Render Free + Firebase Realtime Database

ชุดนี้ใช้ฐานข้อมูลเดิมของโครงการ Firebase “kranuan-app” ที่ URL “https://kranuan-app-default-rtdb.asia-southeast1.firebasedatabase.app” โดยให้เซิร์ฟเวอร์บน Render คุยกับ Firebase ผ่าน Firebase Admin SDK ข้อมูลแอปเก็บที่ /kranuanonline/backend_v1/state

## ก่อนเริ่ม

- เลือก Render Web Service แพ็กเกจ Free ราคา $0 และไม่เพิ่ม Persistent Disk
- Firebase Spark ใช้ได้ฟรีภายในโควตาของ Firebase; เมื่อถึงโควตาจะถูกจำกัดการใช้งานจนกว่าจะรอบใหม่หรืออัปเกรด
- Render Free อาจพักบริการเมื่อไม่มีคนใช้ ทำให้เปิดครั้งแรกหลังพักช้ากว่าปกติ
- บัญชีบริการ Firebase เป็นกุญแจส่วนตัว ห้ามอัปโหลด JSON กุญแจลง GitHub หรือส่งในแชต
- บริการนี้เก็บตาราง SQLite ในหน่วยความจำของเซิร์ฟเวอร์ แล้วซิงก์ข้อมูลรวมเข้า Firebase ทุกครั้งที่มี API ตอบกลับ เหมาะกับรุ่นทดลองที่มีบริการเว็บเพียงหนึ่ง instance และมีผู้ใช้ไม่มาก ยังไม่เหมาะกับหลาย instance หรือปริมาณงานสูง

## ตั้งค่า Firebase

1. ใน Firebase Console เปิด Project settings > Service accounts
2. สร้าง private key ใหม่และดาวน์โหลด JSON เก็บไว้ในเครื่อง ห้ามใส่ในโฟลเดอร์โปรเจกต์ ห้าม commit ขึ้น GitHub
3. ใน Render เพิ่ม Environment Variables ตามรายการด้านล่าง โดยใส่เนื้อหา JSON ทั้งไฟล์ในช่อง FIREBASE_SERVICE_ACCOUNT_JSON
4. ค่า FIREBASE_DATABASE_URL ใช้ URL RTDB ของโปรเจกต์ตามด้านบน
5. ตั้ง Rules ที่ root เป็น { ".read": false, ".write": false } แล้วกด Publish หลังจาก Render ตั้งค่าเสร็จ Firebase Admin SDK ใช้สิทธิ์ service account และไม่อาศัย public rules

## ตั้งค่า Render Free

- Build Command: npm install --omit=dev
- Start Command: node server.cjs
- Instance Type: Free
- ไม่ต้องตั้ง Root Directory และไม่ต้องเพิ่ม Disk

Environment Variables:

| Key | Value |
| --- | --- |
| NODE_ENV | production |
| FIREBASE_DATABASE_URL | https://kranuan-app-default-rtdb.asia-southeast1.firebasedatabase.app |
| FIREBASE_SERVICE_ACCOUNT_JSON | วางเนื้อหา JSON ของ service-account ในช่อง Render เท่านั้น |
| ADMIN_USERNAME | admin |
| ADMIN_PASSWORD | ตั้งรหัสผ่านใหม่อย่างน้อย 12 ตัวอักษร |
| APP_ORIGIN | URL เว็บไซต์ Render ของคุณ เช่น https://kranuanonline.onrender.com |
| DELIVERY_FEE_THB | 25 |

APP_ORIGIN ต้องตรงกับ URL เว็บ Render ทุกตัวอักษร และไม่มี / ต่อท้าย

## ลำดับเริ่มใช้งาน

1. อัปโหลดไฟล์ชุดนี้ขึ้น GitHub ด้วยไฟล์เดิมของแอป
2. ตั้งค่า Environment Variables ใน Render ก่อน deploy
3. Deploy และเปิด URL Render ตรวจว่าหน้าเว็บเปิดได้
4. เมื่อยืนยันว่า Render เริ่มทำงานแล้ว ตั้ง Firebase Rules ที่ root เป็นปิดอ่านและเขียนสาธารณะ
5. เข้าหน้า /admin.html ด้วยชื่อ admin และรหัสผ่านจาก Environment Variables แล้วสร้างบัญชีทีมงาน

## ข้อควรจำ

- ห้ามใส่ service-account JSON ใน GitHub, ZIP ที่แชร์สาธารณะ หรือแชต
- ถ้าเปลี่ยน private key ต้องอัปเดต FIREBASE_SERVICE_ACCOUNT_JSON ใน Render ด้วย
- อย่าลบ /kranuanonline/backend_v1/state ใน Firebase เพราะเป็นข้อมูลร้าน ผู้ใช้ และออเดอร์ของระบบ
- ถ้ามีข้อมูลเดิมอยู่ใน path นี้ ระบบจะโหลดข้อมูลเดิมมาใช้; อย่าใช้ path นี้ร่วมกับแอปอื่น
- Rules ปัจจุบันในภาพเปิด public access จนถึง 25 พ.ย. 2026: การอ่านและแก้ไขข้อมูลสามารถทำได้โดยผู้ที่รู้ URL จนกว่าจะปิด Rules
