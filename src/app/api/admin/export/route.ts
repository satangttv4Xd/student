// ---------------------------------------------------------------------------
// GET /api/admin/export?type=students|registrations|courses — ส่งออกเป็น CSV
// (UTF-8 BOM เพื่อให้เปิดใน Excel แล้วภาษาไทยไม่เพี้ยน)
// ---------------------------------------------------------------------------
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

function toCsv(rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
}

function csvResponse(name: string, rows: (string | number)[][]) {
  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}.csv"`,
    },
  });
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }
  const type = new URL(req.url).searchParams.get("type") ?? "students";

  if (type === "students") {
    const students = await prisma.student.findMany({
      include: { faculty: true, major: true },
      orderBy: { studentId: "asc" },
    });
    return csvResponse("students", [
      [
        "รหัสนักศึกษา", "ชื่อ", "นามสกุล", "ระดับการศึกษา", "คณะ/โรงเรียน",
        "หลักสูตร/สาขาวิชา", "ศูนย์การศึกษา", "ประเภทนักศึกษา",
        "ปีการศึกษา", "เทอมการศึกษา",
      ],
      ...students.map((s) => [
        s.studentId, s.firstName, s.lastName, s.educationLevel,
        s.faculty.name, s.major.name, s.campus, s.studentType,
        s.academicYear, s.semester,
      ]),
    ]);
  }

  if (type === "registrations") {
    const items = await prisma.registrationItem.findMany({
      include: {
        registration: { include: { student: { include: { faculty: true } } } },
        course: { include: { skillGroup: true } },
      },
      orderBy: { registration: { createdAt: "desc" } },
    });
    return csvResponse("registrations", [
      [
        "เลขที่", "รหัสนักศึกษา", "ชื่อ-นามสกุล", "คณะ", "ปีการศึกษา", "เทอม",
        "รหัสวิชา", "ชื่อวิชา", "กลุ่มทักษะ", "หน่วยกิต", "สถานะ", "วันที่ลงทะเบียน",
      ],
      ...items.map((it) => [
        it.registration.id,
        it.registration.student.studentId,
        `${it.registration.student.firstName} ${it.registration.student.lastName}`,
        it.registration.student.faculty.name,
        it.registration.academicYear,
        it.registration.semester,
        it.course.code,
        it.course.name,
        it.course.skillGroup.name,
        it.course.credits,
        it.registration.status,
        it.registration.createdAt.toISOString().slice(0, 10),
      ]),
    ]);
  }

  if (type === "courses") {
    const courses = await prisma.course.findMany({
      include: { skillGroup: true },
      orderBy: [{ skillGroup: { order: "asc" } }, { code: "asc" }],
    });
    return csvResponse("courses", [
      ["กลุ่มทักษะ", "ประเภท", "รหัสวิชา", "ชื่อวิชา", "หน่วยกิต"],
      ...courses.map((c) => [
        c.skillGroup.name,
        c.type === "REQUIRED" ? "วิชาบังคับ" : "วิชาเลือก",
        c.code,
        c.name,
        c.creditDetail,
      ]),
    ]);
  }

  return NextResponse.json({ error: "type ไม่ถูกต้อง" }, { status: 400 });
}
