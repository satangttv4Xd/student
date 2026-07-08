// ---------------------------------------------------------------------------
// Middleware — ป้องกันการเข้าถึงหน้าโดยไม่ได้เข้าสู่ระบบ (ชั้นแรก)
// ตรวจแบบเบา ๆ จากการมีอยู่ของ session cookie เท่านั้น
// การตรวจสิทธิ์จริง (student/admin) ทำใน Server Component / Route Handler อีกชั้น
// ---------------------------------------------------------------------------
import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type AppSession } from "@/lib/session";

const PUBLIC_PATHS = ["/login", "/admin/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ถอดรหัส session จริง — cookie เสีย/หมดอายุ/เข้ารหัสด้วย secret เก่า
  // จะได้ session ว่าง (ไม่มี user) จึงถือว่ายังไม่ login และไม่เกิด redirect loop
  const res = NextResponse.next();
  const session = await getIronSession<AppSession>(req, res, sessionOptions);
  const hasSession = Boolean(session.user);

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p);

  // ยังไม่ login แต่พยายามเข้าหน้าที่ต้อง login
  if (!hasSession && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.startsWith("/admin") ? "/admin/login" : "/login";
    return NextResponse.redirect(url);
  }

  // login แล้วแต่พยายามเข้าหน้า login อีก -> ส่งไปหน้าหลัก
  if (hasSession && isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/admin/login" ? "/admin" : "/dashboard";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  // ครอบคลุมทุกหน้ายกเว้น static assets และ API (API ตรวจสิทธิ์เอง)
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
