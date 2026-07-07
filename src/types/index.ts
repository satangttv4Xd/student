// ---------------------------------------------------------------------------
// ค่าคงที่และ Type กลางของระบบ
// (ใช้แทน enum ของ Prisma เพื่อให้ย้ายฐานข้อมูลไป SQLite/MySQL/PostgreSQL ได้)
// ---------------------------------------------------------------------------

/** ประเภทวิชา */
export const CourseType = {
  REQUIRED: "REQUIRED", // วิชาบังคับ
  ELECTIVE: "ELECTIVE", // วิชาเลือก
} as const;
export type CourseType = (typeof CourseType)[keyof typeof CourseType];

/** สถานะการลงทะเบียน */
export const RegistrationStatus = {
  DRAFT: "DRAFT",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
} as const;
export type RegistrationStatus =
  (typeof RegistrationStatus)[keyof typeof RegistrationStatus];

/** บทบาทของ session */
export type SessionRole = "student" | "admin";

/** ข้อมูลที่เก็บใน session cookie */
export interface SessionUser {
  role: SessionRole;
  /** id ในตาราง (Student.id หรือ Admin.id) */
  id: number;
  /** รหัสนักศึกษา หรือ username ของ admin */
  identifier: string;
  name: string;
}

/** ป้ายกำกับภาษาไทยของประเภทวิชา */
export const courseTypeLabel: Record<CourseType, string> = {
  REQUIRED: "วิชาบังคับ",
  ELECTIVE: "วิชาเลือก",
};

/** ป้ายกำกับภาษาไทยของสถานะการลงทะเบียน */
export const registrationStatusLabel: Record<RegistrationStatus, string> = {
  DRAFT: "ฉบับร่าง",
  CONFIRMED: "ยืนยันแล้ว",
  CANCELLED: "ยกเลิก",
};
