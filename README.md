# ระบบลงทะเบียนเรียน GE — หลักสูตร พ.ศ. 2569

ระบบลงทะเบียนเรียนหมวดวิชาศึกษาทั่วไป (General Education) มหาวิทยาลัยสวนดุสิต

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, TailwindCSS, shadcn/ui, Framer Motion
- **Backend:** Next.js API Routes
- **Database:** SQLite (Demo) — เปลี่ยนเป็น MySQL/PostgreSQL ได้ผ่าน Prisma
- **ORM:** Prisma
- **Auth:** Session Login (iron-session, cookie เข้ารหัส)

## การติดตั้งและรัน

```bash
npm install          # ติดตั้ง dependencies
npm run setup        # generate + สร้าง DB + นำเข้าข้อมูลจาก Excel (ครั้งแรก)
npm run dev          # รันโหมดพัฒนา -> http://localhost:3000
```

คำสั่งฐานข้อมูลอื่น ๆ:

| คำสั่ง | หน้าที่ |
|--------|---------|
| `npm run db:push`   | สร้าง/อัปเดตตารางตาม schema |
| `npm run db:seed`   | นำเข้าข้อมูลจากไฟล์ Excel ในโฟลเดอร์ `data/` |
| `npm run db:reset`  | ล้าง DB แล้ว seed ใหม่ |
| `npm run db:studio` | เปิด Prisma Studio ดูข้อมูล |

## บัญชีเข้าสู่ระบบ (Demo)

- **นักศึกษา:** ใช้รหัสนักศึกษาจากไฟล์ เช่น `6911011340001` (`/login`)
- **ผู้ดูแลระบบ:** `admin` / `admin123` (`/admin/login`) — ตั้งค่าใน `.env`

## เปลี่ยนไปใช้ MySQL / PostgreSQL

1. แก้ `datasource.provider` ใน `prisma/schema.prisma`
2. แก้ `DATABASE_URL` ใน `.env`
3. รัน `npm run db:push && npm run db:seed`

## โครงสร้างโปรเจกต์

```
data/                     ไฟล์ Excel ต้นทาง (students.xlsx, ge-structure.xlsx)
prisma/
  schema.prisma           โครงสร้างฐานข้อมูล
  seed.ts                 นำเข้าข้อมูลจาก Excel
src/
  app/
    login/                หน้าเข้าสู่ระบบนักศึกษา
    admin/login/          หน้าเข้าสู่ระบบผู้ดูแล
    admin/                แผงผู้ดูแลระบบ
    dashboard/            หน้าหลักนักศึกษา
    api/
      auth/               login / logout / me
      admin/login/        เข้าสู่ระบบผู้ดูแล
  components/
    ui/                   shadcn/ui components
  lib/                    prisma, session, auth, curriculum, utils
  types/                  ค่าคงที่และ TypeScript types
  middleware.ts           ป้องกันเส้นทางที่ต้องเข้าสู่ระบบ
```

## สถานะการพัฒนา (แบ่งเป็น Part)

- [x] **Part 1** — Project Setup + Database + Prisma + Authentication
- [x] **Part 2** — Dashboard + Layout + เมนู + Progress engine + Progress circle/charts
- [x] **Part 3** — หน้าลงทะเบียนเรียน + Validation Engine + Summary Panel + ยืนยัน/พิมพ์ใบลงทะเบียน (ร่างการเลือกวิชาเก็บใน localStorage อัตโนมัติ)
- [x] **Part 4** — ประวัติ (timeline) + ข้อมูลนักศึกษา + Admin Panel (สถิติ/นักศึกษา/รายวิชา/การลงทะเบียน/Import Excel/Export CSV)

ทดสอบ end-to-end แล้ว: login นักศึกษา → ลงทะเบียน (ผ่าน validation, กันลงซ้ำ) → ประวัติ, login admin → ทุกหน้า + import/export ทำงานจริง
