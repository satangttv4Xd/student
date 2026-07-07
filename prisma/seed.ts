// ---------------------------------------------------------------------------
// Seed Script — นำเข้าข้อมูลจากไฟล์ Excel ลงฐานข้อมูล
//   - data/students.xlsx      (นักศึกษารหัส69.xlsx)
//   - data/ge-structure.xlsx  (โครง Ge ใหม่V2.xlsx)
//
// รันด้วย: npm run db:seed
// ---------------------------------------------------------------------------
import path from "path";
import * as XLSX from "xlsx";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth";
import {
  CATEGORY_NAME,
  DEFAULT_TOTAL_CREDITS,
  SKILL_GROUPS,
  parseCredits,
} from "../src/lib/curriculum";
import { CourseType } from "../src/types";

const DATA_DIR = path.join(process.cwd(), "data");

type Row = (string | number | null)[];

/** อ่าน sheet เป็น array-of-arrays */
function readSheet(file: string, sheet?: string): Row[] {
  const wb = XLSX.readFile(path.join(DATA_DIR, file));
  const name = sheet ?? wb.SheetNames[0];
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`ไม่พบ sheet "${name}" ในไฟล์ ${file}`);
  return XLSX.utils.sheet_to_json<Row>(ws, { header: 1, defval: null });
}

/** ระบุกลุ่มทักษะจากข้อความหัวข้อ */
function detectGroupCode(text: string): string | null {
  if (text.includes("ผู้ประกอบการ")) return "ENTREPRENEUR";
  if (text.includes("สิ่งแวดล้อม")) return "ENVIRONMENT";
  if (text.includes("เทคโนโลยีดิจิทัล")) return "DIGITAL";
  if (text.includes("ชีวิตและสังคม")) return "LIFE_SOCIETY";
  if (text.includes("กลุ่มทักษะภาษา")) return "LANGUAGE";
  return null;
}

// ---------------------------------------------------------------------------
// 1) นำเข้าโครงสร้างรายวิชา GE
// ---------------------------------------------------------------------------
async function seedCurriculum() {
  console.log("📚 กำลังนำเข้าโครงสร้างรายวิชา GE ...");

  const category = await prisma.category.upsert({
    where: { name: CATEGORY_NAME },
    update: { totalCredits: DEFAULT_TOTAL_CREDITS },
    create: { name: CATEGORY_NAME, totalCredits: DEFAULT_TOTAL_CREDITS, order: 1 },
  });

  // สร้าง 5 กลุ่มทักษะ ตามกติกาใน curriculum.ts
  const groupIdByCode: Record<string, number> = {};
  for (const g of SKILL_GROUPS) {
    const grp = await prisma.skillGroup.upsert({
      where: { code: g.code },
      update: {
        name: g.name,
        categoryId: category.id,
        requiredCredits: g.requiredCredits,
        compulsoryCredits: g.compulsoryCredits,
        order: g.order,
      },
      create: {
        code: g.code,
        name: g.name,
        categoryId: category.id,
        requiredCredits: g.requiredCredits,
        compulsoryCredits: g.compulsoryCredits,
        order: g.order,
      },
    });
    groupIdByCode[g.code] = grp.id;
  }

  // อ่าน sheet รายวิชา แล้ว parse
  const rows = readSheet("ge-structure.xlsx", "รายวิชา");
  let currentGroup: string | null = null;
  const seen = new Set<string>();
  let count = 0;

  for (const row of rows) {
    const col0 = row[0] ? String(row[0]).trim() : "";
    const col1 = row[1] ? String(row[1]).trim() : "";
    const col2 = row[2];
    const col3 = row[3] ? String(row[3]).trim() : "";
    const col4 = row[4] ? String(row[4]).trim() : "";

    // เป็นแถวหัวข้อกลุ่ม (ไม่มีประเภทวิชาในคอลัมน์ที่ 2)
    if (col0 && !col1 && !col2) {
      const detected = detectGroupCode(col0);
      if (detected) currentGroup = detected;
      continue;
    }

    // เป็นแถวรายวิชา: ต้องมีประเภท + รหัส + ชื่อ
    const isCourseType = col1 === "วิชาบังคับ" || col1 === "วิชาเลือก";
    if (!isCourseType || col2 == null || !col3 || !currentGroup) continue;

    const code = String(col2).trim();
    if (seen.has(code)) continue; // กันวิชาซ้ำ (เช่นในส่วน "เลือกตามความสนใจ")
    seen.add(code);

    await prisma.course.upsert({
      where: { code },
      update: {
        name: col3,
        credits: parseCredits(col4),
        creditDetail: col4,
        type: col1 === "วิชาบังคับ" ? CourseType.REQUIRED : CourseType.ELECTIVE,
        skillGroupId: groupIdByCode[currentGroup],
      },
      create: {
        code,
        name: col3,
        credits: parseCredits(col4),
        creditDetail: col4,
        type: col1 === "วิชาบังคับ" ? CourseType.REQUIRED : CourseType.ELECTIVE,
        skillGroupId: groupIdByCode[currentGroup],
      },
    });
    count++;
  }

  console.log(`   ✓ นำเข้ารายวิชา ${count} วิชา ใน ${SKILL_GROUPS.length} กลุ่มทักษะ`);
}

// ---------------------------------------------------------------------------
// 2) นำเข้าข้อมูลนักศึกษา
// ---------------------------------------------------------------------------
async function seedStudents() {
  console.log("🎓 กำลังนำเข้าข้อมูลนักศึกษา ...");

  const rows = readSheet("students.xlsx");
  const [, ...body] = rows; // ตัดหัวตาราง

  // เก็บ faculty / major ที่ไม่ซ้ำ
  const facultyMap = new Map<string, number>();
  const majorMap = new Map<string, number>(); // key = faculty|major

  for (const row of body) {
    const facultyName = row[1] ? String(row[1]).trim() : "";
    const majorName = row[2] ? String(row[2]).trim() : "";
    if (!facultyName || !majorName) continue;

    if (!facultyMap.has(facultyName)) {
      const f = await prisma.faculty.upsert({
        where: { name: facultyName },
        update: {},
        create: { name: facultyName },
      });
      facultyMap.set(facultyName, f.id);
    }
    const facultyId = facultyMap.get(facultyName)!;
    const majorKey = `${facultyName}|${majorName}`;
    if (!majorMap.has(majorKey)) {
      const m = await prisma.major.upsert({
        where: { name_facultyId: { name: majorName, facultyId } },
        update: {},
        create: {
          name: majorName,
          facultyId,
          geCredits: DEFAULT_TOTAL_CREDITS,
        },
      });
      majorMap.set(majorKey, m.id);
    }
  }
  console.log(
    `   ✓ คณะ ${facultyMap.size} คณะ, หลักสูตร ${majorMap.size} หลักสูตร`,
  );

  // เตรียมข้อมูลนักศึกษา (กันรหัสซ้ำในไฟล์)
  const seen = new Set<string>();
  const students: {
    studentId: string;
    firstName: string;
    lastName: string;
    educationLevel: string;
    campus: string;
    studentType: string;
    academicYear: number;
    semester: number;
    facultyId: number;
    majorId: number;
  }[] = [];

  for (const row of body) {
    const studentId = row[5] != null ? String(row[5]).trim() : "";
    const facultyName = row[1] ? String(row[1]).trim() : "";
    const majorName = row[2] ? String(row[2]).trim() : "";
    if (!studentId || !facultyName || !majorName) continue;
    if (seen.has(studentId)) continue;
    seen.add(studentId);

    students.push({
      studentId,
      educationLevel: row[0] ? String(row[0]).trim() : "",
      campus: row[3] ? String(row[3]).trim() : "",
      studentType: row[4] ? String(row[4]).trim() : "",
      firstName: row[6] ? String(row[6]).trim() : "",
      lastName: row[7] ? String(row[7]).trim() : "",
      academicYear: Number(row[8]) || 2569,
      semester: Number(row[9]) || 1,
      facultyId: facultyMap.get(facultyName)!,
      majorId: majorMap.get(`${facultyName}|${majorName}`)!,
    });
  }

  // ลบของเก่าแล้ว insert ใหม่แบบเป็นชุด (เร็วกว่า upsert ทีละคน)
  await prisma.student.deleteMany({});
  const CHUNK = 500;
  for (let i = 0; i < students.length; i += CHUNK) {
    await prisma.student.createMany({ data: students.slice(i, i + CHUNK) });
  }
  console.log(`   ✓ นำเข้านักศึกษา ${students.length} คน`);
}

// ---------------------------------------------------------------------------
// 3) สร้างบัญชีผู้ดูแลระบบเริ่มต้น
// ---------------------------------------------------------------------------
async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  await prisma.admin.upsert({
    where: { username },
    update: {},
    create: {
      username,
      password: hashPassword(password),
      name: "ผู้ดูแลระบบ",
    },
  });
  console.log(`👤 บัญชีผู้ดูแลระบบ: username="${username}" password="${password}"`);
}

async function main() {
  console.log("=== เริ่ม Seed ฐานข้อมูล ===");
  await seedCurriculum();
  await seedStudents();
  await seedAdmin();
  console.log("=== เสร็จสิ้น ===");
}

main()
  .catch((e) => {
    console.error("❌ Seed ล้มเหลว:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
