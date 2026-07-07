// POST /api/admin/login — เข้าสู่ระบบผู้ดูแลระบบ
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { createUserSession } from "@/lib/session";

const schema = z.object({
  username: z.string().trim().min(1, "กรุณากรอกชื่อผู้ใช้").max(50),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน").max(200),
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

    const admin = await prisma.admin.findUnique({
      where: { username: parsed.data.username },
    });

    // ตรวจรหัสผ่านเสมอเพื่อกัน timing/username enumeration
    const ok =
      admin != null && verifyPassword(parsed.data.password, admin.password);
    if (!admin || !ok) {
      return NextResponse.json(
        { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 },
      );
    }

    await createUserSession({
      role: "admin",
      id: admin.id,
      identifier: admin.username,
      name: admin.name,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("admin login error", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่" },
      { status: 500 },
    );
  }
}
