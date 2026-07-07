// ---------------------------------------------------------------------------
// POST /api/admin/import — นำเข้าข้อมูลนักศึกษาจากไฟล์ Excel/CSV
//
// รูปแบบคอลัมน์ยึดตามไฟล์ "นักศึกษารหัส69.xlsx":
//   ระดับการศึกษา | คณะ/โรงเรียน | หลักสูตร/สาขาวิชา | ศูนย์การศึกษา |
//   ประเภทนักศึกษา | รหัสนักศึกษา | ชื่อ | นามสกุล | ปีการศึกษา | เทอมการศึกษา
//
// พฤติกรรม: ตรวจสอบทุกแถวก่อน → insert คนใหม่ / update คนเดิม ในทรานแซกชันเดียว
// (ล้มเหลวแถวไหน rollback ทั้งหมด)
// ---------------------------------------------------------------------------
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { DEFAULT_TOTAL_CREDITS } from "@/lib/curriculum";

export const runtime = "nodejs";

interface ParsedStudent {
  studentId: string;
  educationLevel: string;
  campus: string;
  studentType: string;
  firstName: string;
  lastName: string;
  academicYear: number;
  semester: number;
  facultyName: string;
  majorName: string;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ไม่พบไฟล์" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: "ไฟล์ใหญ่เกิน 10 MB" },
      { status: 400 },
    );
  }

  let rows: (string | number | null)[][];
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  } catch {
    return NextResponse.json(
      { error: "อ่านไฟล์ไม่ได้ — รองรับ .xlsx .xls .csv" },
      { status: 400 },
    );
  }

  // ข้ามแถวหัวตาราง (ตรวจจากคำว่า "รหัสนักศึกษา")
  const headerIdx = rows.findIndex((r) =>
    r.some((c) => typeof c === "string" && c.includes("รหัสนักศึกษา")),
  );
  const body = rows.slice(headerIdx >= 0 ? headerIdx + 1 : 0);

  // ตรวจสอบและแปลงทุกแถว
  const errors: string[] = [];
  const parsed: ParsedStudent[] = [];
  const seen = new Set<string>();

  body.forEach((row, i) => {
    const line = (headerIdx >= 0 ? headerIdx + 1 : 0) + i + 2; // เลขแถวใน Excel
    const isEmpty = row.every((c) => c == null || String(c).trim() === "");
    if (isEmpty) return;

    const s = (v: unknown) => (v == null ? "" : String(v).trim());
    const studentId = s(row[5]);
    const facultyName = s(row[1]);
    const majorName = s(row[2]);

    if (!studentId || !/^\d{8,15}$/.test(studentId)) {
      errors.push(`แถว ${line}: รหัสนักศึกษาไม่ถูกต้อง "${studentId}"`);
      return;
    }
    if (!facultyName || !majorName) {
      errors.push(`แถว ${line}: ขาดชื่อคณะหรือสาขาวิชา`);
      return;
    }
    if (seen.has(studentId)) {
      errors.push(`แถว ${line}: รหัส ${studentId} ซ้ำในไฟล์ (ใช้แถวแรก)`);
      return;
    }
    seen.add(studentId);

    parsed.push({
      studentId,
      educationLevel: s(row[0]),
      facultyName,
      majorName,
      campus: s(row[3]),
      studentType: s(row[4]),
      firstName: s(row[6]),
      lastName: s(row[7]),
      academicYear: Number(row[8]) || 2569,
      semester: Number(row[9]) || 1,
    });
  });

  if (parsed.length === 0) {
    return NextResponse.json(
      { error: "ไม่พบข้อมูลนักศึกษาที่นำเข้าได้", errors },
      { status: 422 },
    );
  }

  // นำเข้าในทรานแซกชันเดียว — ผิดพลาดจุดไหน rollback ทั้งหมด
  let inserted = 0;
  let updated = 0;
  await prisma.$transaction(
    async (tx) => {
      // เตรียม faculty / major
      const facultyIds = new Map<string, number>();
      const majorIds = new Map<string, number>();
      for (const p of parsed) {
        if (!facultyIds.has(p.facultyName)) {
          const f = await tx.faculty.upsert({
            where: { name: p.facultyName },
            update: {},
            create: { name: p.facultyName },
          });
          facultyIds.set(p.facultyName, f.id);
        }
        const facultyId = facultyIds.get(p.facultyName)!;
        const key = `${p.facultyName}|${p.majorName}`;
        if (!majorIds.has(key)) {
          const m = await tx.major.upsert({
            where: { name_facultyId: { name: p.majorName, facultyId } },
            update: {},
            create: {
              name: p.majorName,
              facultyId,
              geCredits: DEFAULT_TOTAL_CREDITS,
            },
          });
          majorIds.set(key, m.id);
        }
      }

      // แยกคนใหม่ / คนเดิม
      const existing = await tx.student.findMany({
        where: { studentId: { in: parsed.map((p) => p.studentId) } },
        select: { studentId: true },
      });
      const existingSet = new Set(existing.map((e) => e.studentId));

      for (const p of parsed) {
        const data = {
          educationLevel: p.educationLevel,
          campus: p.campus,
          studentType: p.studentType,
          firstName: p.firstName,
          lastName: p.lastName,
          academicYear: p.academicYear,
          semester: p.semester,
          facultyId: facultyIds.get(p.facultyName)!,
          majorId: majorIds.get(`${p.facultyName}|${p.majorName}`)!,
        };
        if (existingSet.has(p.studentId)) {
          await tx.student.update({
            where: { studentId: p.studentId },
            data,
          });
          updated++;
        } else {
          await tx.student.create({
            data: { studentId: p.studentId, ...data },
          });
          inserted++;
        }
      }
    },
    { timeout: 120_000 },
  );

  return NextResponse.json({
    ok: true,
    total: parsed.length,
    inserted,
    updated,
    skipped: errors.length,
    errors: errors.slice(0, 20), // แสดงสูงสุด 20 ข้อ
  });
}
