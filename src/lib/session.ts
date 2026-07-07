// ---------------------------------------------------------------------------
// Session Login ด้วย iron-session (เก็บ session แบบเข้ารหัสใน cookie)
// ใช้ได้ทั้งใน Route Handler และ Server Component
// ---------------------------------------------------------------------------
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { SessionUser } from "@/types";

export interface AppSession {
  user?: SessionUser;
}

export const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ??
    "fallback_dev_secret_change_me_at_least_32_characters_long",
  cookieName: "ge_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 ชั่วโมง
  },
};

/** ดึง session ปัจจุบัน (อ่าน/เขียนได้) */
export async function getSession() {
  return getIronSession<AppSession>(cookies(), sessionOptions);
}

/** ดึงข้อมูลผู้ใช้ปัจจุบัน หรือ null ถ้ายังไม่ login */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  return session.user ?? null;
}

/** บันทึกผู้ใช้ลง session */
export async function createUserSession(user: SessionUser) {
  const session = await getSession();
  session.user = user;
  await session.save();
}

/** ล้าง session (logout) */
export async function destroySession() {
  const session = await getSession();
  session.destroy();
}
