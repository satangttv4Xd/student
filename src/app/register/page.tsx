import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getConfirmedCourses, getStudentById } from "@/server/student";
import { SKILL_GROUPS } from "@/lib/curriculum";
import { StudentShell } from "@/components/student-shell";
import { RegistrationClient, type GroupData } from "./registration-client";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") redirect("/login");

  const student = await getStudentById(user.id);
  if (!student) redirect("/login");

  const [groups, already] = await Promise.all([
    prisma.skillGroup.findMany({
      orderBy: { order: "asc" },
      include: { courses: { orderBy: { code: "asc" } } },
    }),
    getConfirmedCourses(user.id),
  ]);

  const ruleByCode = new Map(SKILL_GROUPS.map((g) => [g.code, g]));
  const groupData: GroupData[] = groups.map((g) => ({
    code: g.code,
    name: g.name,
    requiredCredits: g.requiredCredits,
    compulsoryCredits: g.compulsoryCredits,
    description: ruleByCode.get(g.code)?.description ?? "",
    courses: g.courses.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      credits: c.credits,
      creditDetail: c.creditDetail,
      type: c.type,
      skillGroupCode: g.code,
    })),
  }));

  return (
    <StudentShell
      student={{
        name: `${student.firstName} ${student.lastName}`,
        studentId: student.studentId,
        faculty: student.faculty.name,
        major: student.major.name,
      }}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">ลงทะเบียนเรียน</h1>
          <p className="text-sm text-muted-foreground">
            หมวดวิชาศึกษาทั่วไป (GE) · ปีการศึกษา {student.academicYear} ภาคเรียนที่{" "}
            {student.semester} · เป้าหมาย {student.major.geCredits} หน่วยกิต
          </p>
        </div>
        <RegistrationClient
          groups={groupData}
          already={already}
          targetCredits={student.major.geCredits}
          academicYear={student.academicYear}
          semester={student.semester}
          studentName={`${student.firstName} ${student.lastName}`}
          studentCode={student.studentId}
        />
      </div>
    </StudentShell>
  );
}
