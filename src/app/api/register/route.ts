// ---------------------------------------------------------------------------
// API ลงทะเบียนเรียน
//   GET  /api/register — โครงสร้างหลักสูตร (กลุ่ม→วิชา) + วิชาที่ลงแล้ว + เป้าหมาย
//   POST /api/register — ตรวจสอบ (validation ฝั่ง server) แล้วบันทึกแบบทรานแซกชัน
// ---------------------------------------------------------------------------
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getConfirmedCourses } from "@/server/student";
import { validateSelection } from "@/lib/validation";
import type { ProgressCourse } from "@/lib/progress";
import { RegistrationStatus } from "@/types";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  const [student, groups, already] = await Promise.all([
    prisma.student.findUnique({
      where: { id: user.id },
      include: { major: true },
    }),
    prisma.skillGroup.findMany({
      orderBy: { order: "asc" },
      include: { courses: { orderBy: { code: "asc" } } },
    }),
    getConfirmedCourses(user.id),
  ]);
  if (!student) {
    return NextResponse.json({ error: "ไม่พบนักศึกษา" }, { status: 404 });
  }

  return NextResponse.json({
    targetCredits: student.major.geCredits,
    academicYear: student.academicYear,
    semester: student.semester,
    already,
    groups: groups.map((g) => ({
      code: g.code,
      name: g.name,
      requiredCredits: g.requiredCredits,
      compulsoryCredits: g.compulsoryCredits,
      courses: g.courses.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        credits: c.credits,
        creditDetail: c.creditDetail,
        type: c.type,
        skillGroupCode: g.code,
      })),
    })),
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
  }

  let body: { courseIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const courseIds = Array.isArray(body.courseIds)
    ? body.courseIds.filter((n): n is number => Number.isInteger(n))
    : [];
  if (courseIds.length === 0) {
    return NextResponse.json(
      { error: "กรุณาเลือกอย่างน้อย 1 รายวิชา" },
      { status: 400 },
    );
  }

  const student = await prisma.student.findUnique({
    where: { id: user.id },
    include: { major: true },
  });
  if (!student) {
    return NextResponse.json({ error: "ไม่พบนักศึกษา" }, { status: 404 });
  }

  // โหลดวิชาที่เลือกจากฐานข้อมูล (ห้ามเชื่อหน่วยกิตจาก client)
  const courses = await prisma.course.findMany({
    where: { id: { in: courseIds } },
    include: { skillGroup: true },
  });
  if (courses.length !== courseIds.length) {
    return NextResponse.json(
      { error: "มีรายวิชาที่ไม่มีอยู่ในระบบ" },
      { status: 400 },
    );
  }
  const selected: ProgressCourse[] = courses.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    credits: c.credits,
    type: c.type,
    skillGroupCode: c.skillGroup.code,
  }));

  const already = await getConfirmedCourses(user.id);
  const result = validateSelection(selected, already, student.major.geCredits);
  if (!result.ok) {
    return NextResponse.json(
      {
        error: "การลงทะเบียนไม่ผ่านการตรวจสอบ",
        issues: result.issues.filter((i) => i.level === "error"),
      },
      { status: 422 },
    );
  }

  // บันทึกแบบทรานแซกชัน — ล้มเหลวจุดไหน rollback ทั้งหมด
  const registration = await prisma.$transaction(async (tx) => {
    const reg = await tx.registration.create({
      data: {
        studentId: student.id,
        academicYear: student.academicYear,
        semester: student.semester,
        status: RegistrationStatus.CONFIRMED,
        totalCredits: selected.reduce((s, c) => s + c.credits, 0),
      },
    });
    await tx.registrationItem.createMany({
      data: selected.map((c) => ({ registrationId: reg.id, courseId: c.id })),
    });
    return reg;
  });

  return NextResponse.json({
    ok: true,
    registrationId: registration.id,
    totalCredits: registration.totalCredits,
    issues: result.issues, // ส่ง warning/info กลับไปแสดงด้วย
  });
}
