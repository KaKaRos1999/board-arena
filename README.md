# 🎲 หมากฮ็อตไทยออนไลน์ (Thai Checkers Online)

เกมหมากฮ็อตไทยออนไลน์ กติกาไทยแท้ (8 ตัวต่อฝ่าย, กินบังคับ, ฮอสบินได้) เล่นกับเพื่อนข้ามอินเทอร์เน็ตผ่านลิงก์หรือสแกน QR Code พร้อมบอท AI ฉลาด 3 ระดับ และธีมสนามประลอง/กระดานหมาก/ตัวหมากการ์ตูนสุดอลังการ

---

## 🚀 วิธีขึ้นโฮสต์ฟรี (Deploy to Cloud)

### วิธีที่ 1: ขึ้น Render.com (แนะนำที่สุด - ฟรี 100% รองรับ WebSocket ถาวร 24 ชม.)
1. นำโค้ดโปรเจกต์นี้ขึ้น **GitHub**
2. สมัคร/ล็อกอินที่ [Render.com](https://render.com) (ฟรี)
3. กดปุ่ม **"New +"** -> เลือก **"Web Service"**
4. เลือก Repository ของคุณ
5. Render จะอ่านการตั้งค่าจากไฟล์ `render.yaml` อัตโนมัติ:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
6. กด **"Create Web Service"** รอประมาณ 1-2 นาที คุณจะได้ลิงก์ถาวร เช่น:
   `https://thai-checkers.onrender.com` นำไปแชร์ให้เพื่อนเล่นได้ทั่วโลกตลอด 24 ชั่วโมง!

---

### วิธีที่ 2: ขึ้น Railway.app
1. สมัคร/ล็อกอินที่ [Railway.app](https://railway.app)
2. กด **"New Project"** -> **"Deploy from GitHub repo"**
3. เลือก Repository ระบบจะติดตั้งและเปิดลิงก์สาธารณะให้ทันที

---

### วิธีที่ 3: รันในเครื่อง (Local / LAN)
```bash
npm install
npm start
```
เปิดเบราว์เซอร์: `http://localhost:3000`
