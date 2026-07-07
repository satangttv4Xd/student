// ---------------------------------------------------------------------------
// Middleware — ป้องกันการเข้าถึงหน้าโดยไม่ได้เข้าสู่ระบบ (ชั้นแรก)
// ตรวจแบบเบา ๆ จากการมีอยู่ของ session cookie เท่านั้น
// การตรวจสิทธิ์จริง (student/admin) ทำใน Server Component / Route Handler อีกชั้น
// ---------------------------------------------------------------------------
import { NextRequest, NextResponse } from "next/server";
import { sessionOptions } from "@/lib/session";

const PUBLIC_PATHS = ["/login", "/admin/login"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has(sessionOptions.cookieName);

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

  return NextResponse.next();
}

export const config = {
  // ครอบคลุมทุกหน้ายกเว้น static assets และ API (API ตรวจสิทธิ์เอง)
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
