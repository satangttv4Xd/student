// ---------------------------------------------------------------------------
// GE Progress Engine — คำนวณความก้าวหน้าตามโครงสร้างหลักสูตร GE พ.ศ.2569
//
// ใช้ร่วมกันทั้ง Dashboard, หน้าลงทะเบียน, Summary Panel และ Validation
// ตรรกะทั้งหมดอ้างอิงกติกาใน src/lib/curriculum.ts ซึ่งสรุปจากไฟล์ Excel จริง
// ---------------------------------------------------------------------------
import {
  COMPULSORY_COURSE_CODES,
  INTEREST_ELECTIVE_CREDITS,
  SKILL_GROUPS,
} from "./curriculum";
import { CourseType } from "@/types";

/** รายวิชาแบบย่อที่ engine ต้องใช้ */
export interface ProgressCourse {
  id: number;
  code: string;
  name: string;
  credits: number;
  type: string; // REQUIRED | ELECTIVE
  skillGroupCode: string;
}

/** ผลความก้าวหน้าของแต่ละกลุ่มทักษะ */
export interface GroupProgress {
  code: string;
  name: string;
  order: number;
  /** หน่วยกิตขั้นต่ำที่ต้องเรียนในกลุ่ม */
  requiredCredits: number;
  /** หน่วยกิตบังคับในกลุ่ม */
  compulsoryCredits: number;
  /** หน่วยกิตที่ลงแล้วในกลุ่ม */
  earnedCredits: number;
  /** หน่วยกิตที่นับเข้าโครงสร้างของกลุ่ม (ไม่เกิน requiredCredits) */
  countedCredits: number;
  /** หน่วยกิตส่วนเกิน -> นับเป็น "เลือกตามความสนใจ" */
  overflowCredits: number;
  /** หน่วยกิตที่ยังขาดในกลุ่ม */
  remainingCredits: number;
  /** ครบเงื่อนไขของกลุ่มแล้วหรือยัง */
  completed: boolean;
  /** จำนวนวิชาที่ลงในกลุ่ม */
  courseCount: number;
}

/** สถานะวิชาบังคับ (รายวิชาที่ทุกคนต้องลง) */
export interface CompulsoryStatus {
  code: string;
  name: string;
  taken: boolean;
}

export interface ProgressResult {
  /** เป้าหมายหน่วยกิตรวม (24 หรือ 30 ตามหลักสูตร) */
  targetCredits: number;
  /** หน่วยกิตที่ลงแล้วทั้งหมด */
  earnedCredits: number;
  /** หน่วยกิตที่ยังขาดเพื่อให้ครบเป้าหมาย */
  remainingCredits: number;
  /** เปอร์เซ็นต์ความก้าวหน้า (0–100) */
  percent: number;
  /** ความก้าวหน้ารายกลุ่มทักษะ */
  groups: GroupProgress[];
  /** สถานะวิชาบังคับ */
  compulsory: CompulsoryStatus[];
  /** จำนวนวิชาบังคับที่ลงครบแล้ว */
  compulsoryDone: number;
  /** หน่วยกิต "เลือกตามความสนใจ" ที่ต้องการ */
  interestRequired: number;
  /** หน่วยกิต "เลือกตามความสนใจ" ที่ทำได้ (มาจากส่วนเกินของทุกกลุ่ม) */
  interestEarned: number;
  /** เรียนครบตามเงื่อนไขจบหรือยัง */
  isComplete: boolean;
  /** สรุปหน่วยกิตวิชาบังคับ vs วิชาเลือก */
  requiredCredits: number;
  electiveCredits: number;
}

const compulsoryNames: Record<string, string> = {
  "1600201": "พลังสวนดุสิต",
  "1600301": "เทคโนโลยีและปัญญาประดิษฐ์เพื่อชีวิตดิจิทัล",
};

/**
 * คำนวณความก้าวหน้า GE จากรายวิชาที่ลงทะเบียนแล้ว
 * @param registered รายวิชาที่ลงทะเบียนแล้ว (สถานะ CONFIRMED)
 * @param targetCredits เป้าหมายหน่วยกิตรวมของหลักสูตร (major.geCredits)
 */
export function computeProgress(
  registered: ProgressCourse[],
  targetCredits: number,
): ProgressResult {
  // จัดกลุ่มวิชาที่ลงตาม skillGroupCode
  const byGroup = new Map<string, ProgressCourse[]>();
  for (const c of registered) {
    const arr = byGroup.get(c.skillGroupCode) ?? [];
    arr.push(c);
    byGroup.set(c.skillGroupCode, arr);
  }

  let interestEarned = 0;
  const groups: GroupProgress[] = SKILL_GROUPS.map((rule) => {
    const list = byGroup.get(rule.code) ?? [];
    const earnedCredits = list.reduce((s, c) => s + c.credits, 0);
    const countedCredits = Math.min(earnedCredits, rule.requiredCredits);
    const overflowCredits = earnedCredits - countedCredits;
    interestEarned += overflowCredits;
    const remainingCredits = Math.max(0, rule.requiredCredits - earnedCredits);

    // กลุ่มถือว่าครบเมื่อได้หน่วยกิตครบ และลงวิชาบังคับในกลุ่มแล้ว (ถ้ามี)
    const completed =
      remainingCredits === 0 && hasGroupCompulsory(rule.code, registered);

    return {
      code: rule.code,
      name: rule.name,
      order: rule.order,
      requiredCredits: rule.requiredCredits,
      compulsoryCredits: rule.compulsoryCredits,
      earnedCredits,
      countedCredits,
      overflowCredits,
      remainingCredits,
      completed,
      courseCount: list.length,
    };
  });

  // สถานะวิชาบังคับรายวิชา
  const compulsory: CompulsoryStatus[] = COMPULSORY_COURSE_CODES.map((code) => ({
    code,
    name: compulsoryNames[code] ?? code,
    taken: registered.some((c) => c.code === code),
  }));
  const compulsoryDone = compulsory.filter((c) => c.taken).length;

  const earnedCredits = registered.reduce((s, c) => s + c.credits, 0);
  const remainingCredits = Math.max(0, targetCredits - earnedCredits);
  const percent =
    targetCredits > 0
      ? Math.min(100, Math.round((earnedCredits / targetCredits) * 100))
      : 0;

  const requiredCredits = registered
    .filter((c) => c.type === CourseType.REQUIRED)
    .reduce((s, c) => s + c.credits, 0);
  const electiveCredits = earnedCredits - requiredCredits;

  const interestRequired = INTEREST_ELECTIVE_CREDITS;

  // เงื่อนไขจบ: ครบทุกกลุ่ม + วิชาบังคับครบ + หน่วยกิตรวมถึงเป้าหมาย + ความสนใจครบ
  const groupsComplete = groups.every((g) => g.remainingCredits === 0);
  const isComplete =
    earnedCredits >= targetCredits &&
    compulsoryDone === COMPULSORY_COURSE_CODES.length &&
    groupsComplete &&
    interestEarned >= interestRequired;

  return {
    targetCredits,
    earnedCredits,
    remainingCredits,
    percent,
    groups,
    compulsory,
    compulsoryDone,
    interestRequired,
    interestEarned: Math.min(interestEarned, interestRequired),
    isComplete,
    requiredCredits,
    electiveCredits,
  };
}

/** กลุ่มนี้มีวิชาบังคับที่ต้องลงหรือไม่ และลงแล้วหรือยัง */
function hasGroupCompulsory(
  groupCode: string,
  registered: ProgressCourse[],
): boolean {
  // แม็พกลุ่ม -> รหัสวิชาบังคับที่ต้องอยู่ในกลุ่มนั้น
  const map: Record<string, string> = {
    LIFE_SOCIETY: "1600201",
    DIGITAL: "1600301",
  };
  const code = map[groupCode];
  if (!code) return true; // กลุ่มนี้ไม่มีวิชาบังคับเฉพาะ
  return registered.some((c) => c.code === code);
}
