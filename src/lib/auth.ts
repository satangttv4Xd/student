// ---------------------------------------------------------------------------
// การจัดการรหัสผ่านผู้ดูแลระบบ ด้วย scrypt (built-in ของ Node — ไม่ต้องพึ่ง lib นอก)
// ---------------------------------------------------------------------------
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

/** สร้าง hash รูปแบบ "salt:hash" */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** ตรวจสอบรหัสผ่านกับ hash ที่เก็บไว้ (กัน timing attack) */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const hashed = scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, "hex");
  if (keyBuffer.length !== hashed.length) return false;
  return timingSafeEqual(hashed, keyBuffer);
}
