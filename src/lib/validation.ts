// ---------------------------------------------------------------------------
// Validation Engine — ตรวจสอบการลงทะเบียน GE ตามกติกาหลักสูตร พ.ศ.2569
//
// ใช้ทั้งฝั่ง client (แสดงคำเตือนแบบสด) และฝั่ง server (ตรวจก่อนบันทึกจริง)
// กติกาทั้งหมดมาจาก src/lib/curriculum.ts ซึ่งสรุปจากไฟล์ Excel จริง
// ---------------------------------------------------------------------------
import {
  COMPULSORY_COURSE_CODES,
  SKILL_GROUPS,
} from "./curriculum";
import type { ProgressCourse } from "./progress";
import { computeProgress } from "./progress";

export type IssueLevel = "error" | "warning" | "info";

export interface ValidationIssue {
  level: IssueLevel;
  code: string; // รหัสกติกา เช่น DUPLICATE, OVER_TARGET
  message: string; // ข้อความภาษาไทยแสดงต่อผู้ใช้
}

export interface ValidationResult {
  /** ลงทะเบียนได้หรือไม่ (ไม่มี error) */
  ok: boolean;
  issues: ValidationIssue[];
  /** หน่วยกิตรวมหลังลงชุดนี้ */
  totalAfter: number;
}

/**
 * ตรวจสอบชุดวิชาที่เลือกใหม่ เทียบกับวิชาที่เคยลงแล้ว
 * @param selected  วิชาที่เลือกจะลงในรอบนี้
 * @param already   วิชาที่ยืนยันการลงไปแล้ว (ทุกภาคเรียน)
 * @param targetCredits เป้าหมายหน่วยกิต GE ของหลักสูตร (24/30)
 */
export function validateSelection(
  selected: ProgressCourse[],
  already: ProgressCourse[],
  targetCredits: number,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // 1) ต้องเลือกอย่างน้อย 1 วิชา
  if (selected.length === 0) {
    issues.push({
      level: "error",
      code: "EMPTY",
      message: "กรุณาเลือกอย่างน้อย 1 รายวิชา",
    });
  }

  // 2) วิชาซ้ำภายในชุดที่เลือก
  const codes = selected.map((c) => c.code);
  const dupInSelection = codes.filter((c, i) => codes.indexOf(c) !== i);
  for (const code of Array.from(new Set(dupInSelection))) {
    issues.push({
      level: "error",
      code: "DUPLICATE",
      message: `เลือกวิชา ${code} ซ้ำกันมากกว่า 1 ครั้ง`,
    });
  }

  // 3) วิชาที่เคยลงไปแล้ว (ห้ามลงซ้ำ)
  const alreadyCodes = new Set(already.map((c) => c.code));
  for (const c of selected) {
    if (alreadyCodes.has(c.code)) {
      issues.push({
        level: "error",
        code: "ALREADY_REGISTERED",
        message: `วิชา ${c.code} ${c.name} เคยลงทะเบียนไปแล้ว`,
      });
    }
  }

  // 4) หน่วยกิตรวมห้ามเกินเป้าหมายหลักสูตร
  const alreadyCredits = already.reduce((s, c) => s + c.credits, 0);
  const selectedCredits = selected.reduce((s, c) => s + c.credits, 0);
  const totalAfter = alreadyCredits + selectedCredits;
  if (totalAfter > targetCredits) {
    issues.push({
      level: "error",
      code: "OVER_TARGET",
      message: `หน่วยกิตรวมหลังลง ${totalAfter} นก. เกินเป้าหมายหลักสูตร ${targetCredits} นก. (เกิน ${totalAfter - targetCredits} นก.)`,
    });
  }

  // ----- คำเตือน / ข้อมูลแนะนำ (ไม่ขวางการลงทะเบียน) -----
  const combined = dedupe([...already, ...selected]);
  const progress = computeProgress(combined, targetCredits);

  // 5) วิชาบังคับที่ยังไม่ลง
  for (const comp of progress.compulsory) {
    if (!comp.taken) {
      issues.push({
        level: "warning",
        code: "COMPULSORY_MISSING",
        message: `ยังไม่ได้ลงวิชาบังคับ ${comp.code} ${comp.name}`,
      });
    }
  }

  // 6) กลุ่มทักษะที่ยังไม่ครบหน่วยกิตขั้นต่ำ
  for (const g of progress.groups) {
    if (g.remainingCredits > 0) {
      issues.push({
        level: "info",
        code: "GROUP_INCOMPLETE",
        message: `${g.name} ยังขาดอีก ${g.remainingCredits} นก. (ต้องครบ ${g.requiredCredits} นก.)`,
      });
    }
  }

  // 7) เลือกตามความสนใจยังไม่ครบ
  if (
    progress.groups.every((g) => g.remainingCredits === 0) &&
    progress.interestEarned < progress.interestRequired
  ) {
    issues.push({
      level: "info",
      code: "INTEREST_INCOMPLETE",
      message: `เลือกตามความสนใจยังขาดอีก ${progress.interestRequired - progress.interestEarned} นก.`,
    });
  }

  // 8) ครบเป้าหมายพอดี → แจ้งสถานะสำเร็จ
  if (progress.isComplete) {
    issues.push({
      level: "info",
      code: "COMPLETE",
      message: "🎉 ลงครบตามโครงสร้างหลักสูตร GE แล้ว",
    });
  }

  return {
    ok: !issues.some((i) => i.level === "error"),
    issues,
    totalAfter,
  };
}

/** กันวิชาซ้ำ (นับรหัสวิชาเดียวครั้งเดียว) */
function dedupe(list: ProgressCourse[]): ProgressCourse[] {
  const seen = new Set<string>();
  return list.filter((c) => {
    if (seen.has(c.code)) return false;
    seen.add(c.code);
    return true;
  });
}

/** ตรวจว่ารหัสวิชาเป็นวิชาบังคับหรือไม่ */
export function isCompulsory(code: string): boolean {
  return (COMPULSORY_COURSE_CODES as readonly string[]).includes(code);
}

export { SKILL_GROUPS };
