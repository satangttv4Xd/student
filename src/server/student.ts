// ---------------------------------------------------------------------------
// Server data-access — โหลดข้อมูลนักศึกษา + คำนวณความก้าวหน้า GE
// เรียกจาก Server Component เท่านั้น (แตะฐานข้อมูลโดยตรง)
// ---------------------------------------------------------------------------
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { computeProgress, type ProgressCourse } from "@/lib/progress";
import { RegistrationStatus } from "@/types";

/** โหลดนักศึกษาพร้อมคณะ/หลักสูตร (cache ต่อ 1 request) */
export const getStudentById = cache(async (id: number) => {
  return prisma.student.findUnique({
    where: { id },
    include: { faculty: true, major: true },
  });
});

/** รายวิชาที่นักศึกษายืนยันการลงทะเบียนแล้วทั้งหมด (แปลงเป็น ProgressCourse) */
export const getConfirmedCourses = cache(
  async (studentId: number): Promise<ProgressCourse[]> => {
    const regs = await prisma.registration.findMany({
      where: { studentId, status: RegistrationStatus.CONFIRMED },
      include: {
        items: { include: { course: { include: { skillGroup: true } } } },
      },
    });

    // กันวิชาซ้ำข้ามภาคเรียน (นับหน่วยกิตครั้งเดียว)
    const seen = new Set<number>();
    const out: ProgressCourse[] = [];
    for (const reg of regs) {
      for (const item of reg.items) {
        if (seen.has(item.courseId)) continue;
        seen.add(item.courseId);
        out.push({
          id: item.course.id,
          code: item.course.code,
          name: item.course.name,
          credits: item.course.credits,
          type: item.course.type,
          skillGroupCode: item.course.skillGroup.code,
        });
      }
    }
    return out;
  },
);

/** โหลดข้อมูลนักศึกษา + ความก้าวหน้าแบบครบชุด (ใช้ใน Dashboard) */
export const getStudentProgress = cache(async (studentId: number) => {
  const student = await getStudentById(studentId);
  if (!student) return null;
  const courses = await getConfirmedCourses(studentId);
  const progress = computeProgress(courses, student.major.geCredits);
  return { student, courses, progress };
});
