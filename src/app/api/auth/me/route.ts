// GET /api/auth/me — ข้อมูลผู้ใช้ที่กำลังเข้าสู่ระบบ
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  if (user.role === "student") {
    const student = await prisma.student.findUnique({
      where: { id: user.id },
      include: { faculty: true, major: true },
    });
    return NextResponse.json({ user, student });
  }

  return NextResponse.json({ user });
}
