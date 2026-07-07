// POST /api/auth/login — เข้าสู่ระบบด้วยรหัสนักศึกษา
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createUserSession } from "@/lib/session";

const schema = z.object({
  studentId: z
    .string()
    .trim()
    .min(1, "กรุณากรอกรหัสนักศึกษา")
    .max(20, "รหัสนักศึกษาไม่ถูกต้อง")
    .regex(/^[0-9]+$/, "รหัสนักศึกษาต้องเป็นตัวเลขเท่านั้น"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "ข้อมูลไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    const student = await prisma.student.findUnique({
      where: { studentId: parsed.data.studentId },
      include: { faculty: true, major: true },
    });

    if (!student) {
      return NextResponse.json(
        { error: "ไม่พบรหัสนักศึกษานี้ในระบบ" },
        { status: 401 },
      );
    }

    await createUserSession({
      role: "student",
      id: student.id,
      identifier: student.studentId,
      name: `${student.firstName} ${student.lastName}`,
    });

    return NextResponse.json({
      success: true,
      user: {
        role: "student",
        studentId: student.studentId,
        name: `${student.firstName} ${student.lastName}`,
      },
    });
  } catch (err) {
    console.error("login error", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่" },
      { status: 500 },
    );
  }
}
