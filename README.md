# Smart Homework & Study Prioritizer

เว็บแอปจัดลำดับการบ้านสำหรับนักเรียนมัธยม: บอกว่างานไหนต้องทำก่อน ใช้เวลาเท่าไร และวางแผนอ่านหนังสือรายวันโดยไม่เกินเวลาว่าง (กันหมดไฟ)
ภาษาไทยเป็นหลัก รองรับภาษาอังกฤษ และเพิ่มภาษาอื่นได้ มีทดลองใช้ฟรี 14 วัน และสมาชิก Pro รายเดือนจ่ายผ่าน PromptPay

**Stack:** React + Vite + Tailwind CSS · Cloudflare Pages + Pages Functions + D1

---

## ฟีเจอร์

| | ฟรี (ไม่ต้องสมัคร) | ทดลอง 14 วัน / Pro |
|---|---|---|
| จัดลำดับอัจฉริยะ "ทำอันนี้ก่อน" + แผนวันนี้ | ✓ | ✓ |
| จำนวนงานค้าง | สูงสุด 5 | ไม่จำกัด |
| แผนรายสัปดาห์ | – | ✓ |
| ซิงก์ข้ามเครื่อง (คลาวด์) | – | ✓ |

- งานทั้งหมดเก็บในเบราว์เซอร์ (LocalStorage) ส่งออก/นำเข้าไฟล์สำรองได้ทุกแพ็กเกจ
- สมัครด้วยอีเมล + รหัสผ่าน แล้วเริ่มทดลอง Pro ทันที ไม่ต้องผูกบัตร
- จ่ายรายเดือน (หรือ 3/6/12 เดือน) ผ่าน QR PromptPay ล็อกยอด

### หน้าเว็บ (URL)

| URL | หน้า |
|---|---|
| `/login`, `/signup` | เข้าสู่ระบบ / สมัครสมาชิก (ต้องทำก่อนใช้ `/`) |
| `/verify/<token>` | ลิงก์ยืนยันอีเมลที่ส่งไปตอนสมัคร ใช้ได้ 24 ชม. ครั้งเดียว กดแล้วเข้าสู่ระบบให้อัตโนมัติ |
| `/` | แอปหลัก (ต้องล็อกอินและยืนยันอีเมลแล้ว ไม่งั้นพาไป `/login`) |
| `/subscription` | เลือกแพ็กเกจ: ฟรี · ทดลอง 14 วัน · Pro |
| `/trial/<token>` | ยืนยันเริ่มทดลองใช้ (สมัคร/ล็อกอินในหน้านี้ได้) ลิงก์ใช้ได้ 24 ชม. ครั้งเดียว |
| `/pay/<token>` | หน้า QR PromptPay ของรายการนั้น QR ใช้ได้ 10 นาที |
| `/receipt/<token>` | สถานะ/ใบเสร็จหลังกด "ฉันโอนแล้ว" อัปเดตเองเมื่อแอดมินอนุมัติ |

`<token>` คือรหัสสุ่ม 43 ตัวแบบ base64url (A–Z a–z 0–9 - _) เช่น `9yag-5OA38mcaqScXB9g5ZZFaNGllYncnCt8b_l8CE` เดาไม่ได้ และเปิดได้เฉพาะเจ้าของบัญชี
สิทธิ์ทดลองใช้ได้ 1 ครั้งต่อบัญชี และเริ่มเมื่อกดยืนยันในหน้า `/trial/...` เท่านั้น (สมัครเฉยๆ ยังไม่เริ่มนับ)

### ระบบชำระเงินทำงานอย่างไร

PromptPay ส่วนตัว (เช่น K PLUS) **ไม่มี API ให้เว็บตรวจเงินเข้าอัตโนมัติ** และตัดเงินรายเดือนอัตโนมัติไม่ได้ ระบบจึงทำงานแบบนี้

1. ผู้ใช้กดชำระที่ `/subscription` แล้วไปหน้า `/pay/<token>` ซึ่งมี QR ที่ **ล็อกยอดแบบมีเศษสตางค์ไม่ซ้ำกัน** เช่น 49.63 บาท QR ใช้ได้ 10 นาที ถ้าโอนทันแต่กดแจ้งไม่ทัน ยังกด "ฉันโอนแล้ว" ได้อีก 30 นาที และยอดเศษสตางค์นั้นจะถูกกันไว้ 2 ชม. ไม่ให้ซ้ำกับรายการใหม่ของคนอื่น
2. ผู้ใช้สแกนด้วยแอปธนาคาร (หรือกด "บันทึกรูป QR" แล้วเปิดจากรูปในแอป) โอน แล้วกด **"ฉันโอนแล้ว"** ระบบพาไปหน้า `/receipt/<token>`
3. คุณเห็นแจ้งเตือนเงินเข้า 49.63 ใน K PLUS แล้วกดอนุมัติในหน้า **แอดมิน**
4. Pro ต่ออายุ 30 วันต่อเดือนที่จ่าย นับต่อจากวันที่สิทธิ์เดิมหมด (ไม่เสียวันทดลอง/วันที่จ่ายไว้)
5. ใกล้หมดอายุ แอปจะแสดงแบนเนอร์ให้ต่ออายุ

---

## ตั้งค่าบน Cloudflare (ทำผ่าน Dashboard ทั้งหมด)

> ต้องเชื่อมโปรเจกต์กับ GitHub (Connect to Git) เท่านั้น การอัปโหลดไฟล์ตรงจะไม่ build และไม่รันโฟลเดอร์ `functions/`

### 1) Build settings
Workers & Pages → โปรเจกต์ → Settings → Build

| ช่อง | ค่า |
|---|---|
| Framework preset | React (Vite) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Environment variable | `NODE_VERSION` = `20` |

### 2) สร้างฐานข้อมูล D1
1. **Storage & databases → D1 SQL database → Create** ตั้งชื่อ `smarthomework-db`
2. เปิดฐานข้อมูล → แท็บ **Console** → คัดลอกเนื้อหาไฟล์ `schema.sql` ทั้งหมดไปวาง → **Execute**

> ถ้าเคยรัน `schema.sql` เวอร์ชันก่อนหน้า (v1.1 / v1.2) ไปแล้ว และยังไม่มีผู้ใช้จริง ให้รันคำสั่งนี้ใน Console ก่อน แล้วรัน `schema.sql` ใหม่
> `DROP TABLE IF EXISTS email_tokens; DROP TABLE IF EXISTS trial_links; DROP TABLE IF EXISTS sync_data; DROP TABLE IF EXISTS payments; DROP TABLE IF EXISTS sessions; DROP TABLE IF EXISTS rate_limits; DROP TABLE IF EXISTS users;`

### 3) ผูกฐานข้อมูลกับเว็บ
โปรเจกต์ Pages → **Settings → Bindings → Add → D1 database**
- Variable name: **`DB`** (ตัวพิมพ์ใหญ่)
- D1 database: `smarthomework-db`

### 4) ตัวแปรระบบ
โปรเจกต์ Pages → **Settings → Variables and secrets → Add**

| ชื่อ | ตัวอย่าง | หมายเหตุ |
|---|---|---|
| `PROMPTPAY_ID` | `0812345678` | เบอร์ที่ผูก PromptPay กับ K PLUS (หรือเลขบัตรประชาชน 13 หลัก) เลือกชนิด **Secret** |
| `PROMPTPAY_NAME` | `วิชัย ก.` | ชื่อที่ผู้โอนเห็น ควรตรงกับชื่อในแอปธนาคารให้ผู้ใช้มั่นใจ |
| `ADMIN_EMAILS` | `you@gmail.com` | อีเมลที่มีสิทธิ์อนุมัติ ถ้ามีหลายอีเมลให้คั่นด้วย `,` |
| `PRICE_THB` | `49` | ราคาต่อเดือน |
| `TRIAL_DAYS` | `14` | วันทดลองใช้ |
| `PAY_QR_MINUTES` | `10` | อายุ QR (นาที) ไม่ใส่ = 10 |

### 5) ตั้งค่าส่งอีเมลยืนยัน

ผู้ใช้ต้องกดลิงก์ `/verify/<token>` ในอีเมลก่อนจึงจะเข้าแอปได้ เลือกได้ 2 แบบ (ถ้าตั้งทั้งสองแบบ ระบบใช้ Gmail ก่อน)
ถ้ายังไม่ตั้งแบบไหนเลย หรือใส่ `REQUIRE_EMAIL_VERIFICATION` = `false` ระบบจะ**ข้ามการยืนยันอีเมล** (ยังต้องสมัคร/ล็อกอินก่อนใช้งานเหมือนเดิม)

#### แบบ A: Gmail บอต (ไม่ต้องมีโดเมน) ← แนะนำตอนนี้

ส่งจาก **Smart Homework &lt;smarthomeworkmail@gmail.com&gt;** ผ่าน Gmail API ส่งได้ประมาณหลายร้อยฉบับต่อวันตามโควตาของ Gmail

**ก. สร้างบัญชีบอต**
1. สมัคร Gmail ใหม่ `smarthomeworkmail@gmail.com` และเปิด **2-Step Verification** ให้บัญชีนี้

**ข. สร้างแอปใน Google Cloud** (ล็อกอินด้วยบัญชีบอต)
1. ไปที่ console.cloud.google.com → **New Project** ตั้งชื่อ `smart-homework-mail`
2. **APIs & Services → Library** → ค้นหา **Gmail API** → **Enable**
3. **APIs & Services → OAuth consent screen** (หรือ Google Auth Platform)
   - User type: **External**, App name: `Smart Homework`, support email: บัญชีบอต
   - Scopes: เพิ่ม `https://www.googleapis.com/auth/gmail.send`
   - **Audience / Publishing status → Publish app → In production** ⚠️ สำคัญมาก ถ้าค้างที่ "Testing" สิทธิ์จะหมดอายุทุก 7 วัน แล้วระบบจะส่งอีเมลไม่ได้
4. **Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: `https://developers.google.com/oauthplayground`
   - กด Create แล้วคัดลอก **Client ID** และ **Client secret**

**ค. ขอ Refresh token** (ทำครั้งเดียว ผ่านเว็บ ไม่ต้องใช้คำสั่ง)
1. เปิด developers.google.com/oauthplayground
2. กดรูปเฟือง ⚙️ มุมขวาบน → ติ๊ก **Use your own OAuth credentials** → วาง Client ID / Client secret
3. ช่อง "Input your own scopes" ด้านซ้าย พิมพ์ `https://www.googleapis.com/auth/gmail.send` → **Authorize APIs**
4. ล็อกอินด้วย **smarthomeworkmail@gmail.com** → ถ้าขึ้น "Google hasn't verified this app" กด **Advanced → Go to Smart Homework (unsafe)** (เป็นแอปของคุณเอง) → Allow
5. กด **Exchange authorization code for tokens** → คัดลอก **Refresh token** (ขึ้นต้นด้วย `1//`)

**ง. ใส่ตัวแปรใน Cloudflare Pages** (Settings → Variables and secrets)

| ชื่อ | ค่า | ชนิด |
|---|---|---|
| `GMAIL_USER` | `smarthomeworkmail@gmail.com` | Text |
| `GMAIL_CLIENT_ID` | `xxxx.apps.googleusercontent.com` | Text |
| `GMAIL_CLIENT_SECRET` | `GOCSPX-...` | **Secret** |
| `GMAIL_REFRESH_TOKEN` | `1//...` | **Secret** |
| `EMAIL_FROM_NAME` | `Smart Homework` (ไม่ใส่ก็ได้) | Text |
| `APP_URL` | `https://smarthomework.pages.dev` | Text |

ถ้าวันหนึ่งสมัครแล้วขึ้น "ส่งอีเมลไม่สำเร็จ" ส่วนใหญ่เพราะ refresh token หมดอายุ/ถูกยกเลิก (เช่น เปลี่ยนรหัสผ่านบัญชีบอต) ให้ทำข้อ ค. ใหม่แล้วอัปเดต `GMAIL_REFRESH_TOKEN`

#### แบบ B: Resend (เมื่อมีโดเมนของตัวเองแล้ว)

1. resend.com → **Domains → Add Domain** แล้วเพิ่มระเบียน DNS ที่ได้ใน Cloudflare (ตั้ง Proxy เป็น DNS only) จนขึ้น Verified
2. **API Keys → Create API Key** แล้วใส่ตัวแปร `RESEND_API_KEY` (Secret) และ `EMAIL_FROM` = `Smart Homework <no-reply@โดเมนของคุณ>`

### 6) Deploy ใหม่
Deployments → Retry deployment (binding และตัวแปรจะมีผลกับ deployment ใหม่เท่านั้น)

### 7) ตรวจสอบ
- เปิด `https://<โปรเจกต์>.pages.dev/api/health` ต้องได้ `"db":true`, `"billing":true`, `"email":true`
- สมัครสมาชิกด้วยอีเมลที่ใส่ใน `ADMIN_EMAILS` → กดปุ่มแพ็กเกจมุมขวาบน → **แอดมิน: ตรวจการโอน**
- ทดลองซื้อด้วยบัญชีทดสอบ โอนจริง 49.xx บาทเข้าบัญชีตัวเอง แล้วอนุมัติ

---

## เพิ่มภาษาใหม่

1. คัดลอก `src/i18n/locales/en.js` เป็นไฟล์ใหม่ เช่น `ja.js` แล้วแปลข้อความ
2. ใน `src/i18n/index.jsx` เพิ่ม `import ja from './locales/ja.js'` และบรรทัด `ja: { name: '日本語', locale: 'ja-JP', dict: ja }`

คีย์ที่ยังไม่ได้แปลจะแสดงภาษาไทยแทนอัตโนมัติ ระบบเลือกภาษาไทยให้ถ้าเบราว์เซอร์มีภาษาไทย ผู้ใช้เปลี่ยนภาษาเองได้ในหน้าตั้งค่า

## สูตรจัดลำดับความสำคัญ

```
Urgency    U = 100 · e^(−ชั่วโมงที่เหลือ / 48)
Importance I = (ความสำคัญ − 1) / 4 · 100
Pressure   P = min(เวลาที่ต้องใช้ ÷ เวลาว่างก่อนกำหนดส่ง, 1) · 100
score = 0.45·U + 0.30·I + 0.25·P      (งานที่เลยกำหนดอยู่บนสุดเสมอ)
```

ตัวจัดตารางใช้ Earliest-Deadline-First งานใหญ่และการเตรียมสอบถูกแบ่งทำหลายวัน (วันละไม่เกิน 60–90 นาที) และไม่จัดเกินเวลาว่างหรือขีดจำกัดต่อวัน ดูโค้ดที่ `src/lib/priority.js` และ `src/lib/scheduler.js`

## รันในเครื่อง

```bash
npm install
npm run dev
```

`npm run dev` ไม่มี API (ไม่มี D1) แอปจึงปลดล็อกทุกฟีเจอร์ในโหมดพัฒนาให้ทำ UI ได้ เวอร์ชันที่ build จริงจะไม่มีการปลดล็อกนี้

## โครงสร้าง

```
functions/api/[[path]].js   Pages Function → ส่งทุก /api/* ไปที่ server/api.js
server/api.js               บัญชี, trial, ชำระเงิน, แอดมิน, ซิงก์
server/promptpay.js         สร้าง payload QR PromptPay (EMVCo + CRC16)
server/security.js          PBKDF2 hash รหัสผ่าน, session token
schema.sql                  ตาราง D1
src/i18n/                   ระบบหลายภาษา + locales/th.js, en.js
src/account/                สถานะบัญชีและแพ็กเกจ (React context)
src/lib/                    priority, scheduler, storage, time, api
src/pages/                  หน้า /subscription, /trial, /pay, /receipt
src/lib/router.jsx          router ขนาดเล็ก (History API)
src/components/             UI (Account, Admin, AuthForm, QrCode, PlanBanner, ...)
```

## ข้อควรรู้

- **ขีดจำกัดของโหมดฟรีตรวจฝั่งเบราว์เซอร์** (เพราะงานเก็บในเครื่องผู้ใช้) คนที่รู้เทคนิคเลี่ยงได้ ส่วนการซิงก์คลาวด์ตรวจฝั่งเซิร์ฟเวอร์จริง ถ้าต้องการกั้นเข้มขึ้นให้ย้ายฟีเจอร์ไปทำงานฝั่งเซิร์ฟเวอร์
- ความปลอดภัย: รหัสผ่าน hash ด้วย PBKDF2-SHA256 (100,000 รอบ), session เป็น HttpOnly cookie, กัน CSRF ด้วยการตรวจ Origin + JSON, จำกัดการลองล็อกอิน 10 ครั้ง / 15 นาที
- เมื่อเริ่มรับเงินจริง ควรมีหน้านโยบายความเป็นส่วนตัว (PDPA) เพราะเก็บอีเมลผู้ใช้ ผู้ใช้ส่วนใหญ่เป็นนักเรียน การชำระเงินจึงมักผ่านผู้ปกครอง
