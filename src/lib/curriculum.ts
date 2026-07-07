// ---------------------------------------------------------------------------
// กติกาโครงสร้างหลักสูตร GE พ.ศ.2569 (ใช้ทั้งตอน seed และตอน validate)
//
// สรุปจากไฟล์ "โครง Ge ใหม่V2.xlsx":
//   รวมทั้งหมด 24 หน่วยกิต (บางหลักสูตรกำหนด 30 หน่วยกิต)
//   บังคับเรียน 12 หน่วยกิต:
//     - กลุ่มทักษะภาษา 6 (เลือกจาก 1.1.1 และ 1.1.2)
//     - กลุ่มทักษะชีวิตและสังคม 3 (วิชา 1600201 พลังสวนดุสิต)
//     - กลุ่มทักษะเทคโนโลยีดิจิทัลและนวัตกรรม 3 (วิชา 1600301)
//   เลือกตามกลุ่มทักษะ 9 หน่วยกิต:
//     - กลุ่มทักษะการเป็นผู้ประกอบการ 3
//     - กลุ่มทักษะชีวิตและสังคม 3
//     - กลุ่มทักษะสิ่งแวดล้อมและความยั่งยืน 3
//   เลือกตามความสนใจจาก 5 กลุ่มทักษะ 3 หน่วยกิต
// ---------------------------------------------------------------------------

export const CATEGORY_NAME = "หมวดวิชาศึกษาทั่วไป";

/** รหัสวิชาบังคับที่นักศึกษาทุกคนต้องลง */
export const COMPULSORY_COURSE_CODES = ["1600201", "1600301"] as const;

/** จำนวนหน่วยกิตรวมมาตรฐาน / ทางเลือก */
export const DEFAULT_TOTAL_CREDITS = 24;
export const ALT_TOTAL_CREDITS = 30;

/** ต่อ 1 วิชา ลงได้ไม่เกินกี่หน่วยกิต (ใช้ตรวจความผิดปกติ) — ไม่จำกัดจำนวนวิชา */
export const MAX_CREDITS_PER_COURSE = 3;

export interface SkillGroupRule {
  code: string;
  name: string;
  /** จำนวนหน่วยกิตขั้นต่ำที่ต้องเรียนในกลุ่มนี้ */
  requiredCredits: number;
  /** จำนวนหน่วยกิตบังคับในกลุ่มนี้ */
  compulsoryCredits: number;
  order: number;
  /** คำอธิบายเงื่อนไข (แสดงใน UI) */
  description: string;
}

/** ลำดับและกติกาของ 5 กลุ่มทักษะ */
export const SKILL_GROUPS: SkillGroupRule[] = [
  {
    code: "LANGUAGE",
    name: "กลุ่มทักษะภาษา",
    requiredCredits: 6,
    compulsoryCredits: 6,
    order: 1,
    description: "บังคับเรียน 6 หน่วยกิต (เลือกจากภาษาอังกฤษ 1.1.1 และ 1.1.2)",
  },
  {
    code: "LIFE_SOCIETY",
    name: "กลุ่มทักษะชีวิตและสังคม",
    requiredCredits: 6,
    compulsoryCredits: 3,
    order: 2,
    description: "บังคับ 3 หน่วยกิต (พลังสวนดุสิต) และเลือกเรียน 3 หน่วยกิต",
  },
  {
    code: "DIGITAL",
    name: "กลุ่มทักษะเทคโนโลยีดิจิทัลและนวัตกรรม",
    requiredCredits: 3,
    compulsoryCredits: 3,
    order: 3,
    description: "บังคับเรียน 3 หน่วยกิต (เทคโนโลยีและปัญญาประดิษฐ์ฯ)",
  },
  {
    code: "ENTREPRENEUR",
    name: "กลุ่มทักษะการเป็นผู้ประกอบการ",
    requiredCredits: 3,
    compulsoryCredits: 0,
    order: 4,
    description: "เลือกเรียน 3 หน่วยกิต",
  },
  {
    code: "ENVIRONMENT",
    name: "กลุ่มทักษะสิ่งแวดล้อมและความยั่งยืน",
    requiredCredits: 3,
    compulsoryCredits: 0,
    order: 5,
    description: "เลือกเรียน 3 หน่วยกิต",
  },
];

/** จำนวนหน่วยกิต "เลือกตามความสนใจ" (จากกลุ่มใดก็ได้) */
export const INTEREST_ELECTIVE_CREDITS = 3;

/** แยกจำนวนหน่วยกิตออกจากสตริง เช่น "3 (3-0-6)" -> 3 */
export function parseCredits(raw: string | number | null | undefined): number {
  if (raw == null) return 0;
  const s = String(raw).trim();
  const m = s.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

/** map รหัส SkillGroup -> ชื่อ (ใช้เร็ว ๆ) */
export const skillGroupNameByCode: Record<string, string> = Object.fromEntries(
  SKILL_GROUPS.map((g) => [g.code, g.name]),
);
