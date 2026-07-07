import { redirect } from "next/navigation";
import { BadgeCheck, GraduationCap } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { getStudentProgress } from "@/server/student";
import { StudentShell } from "@/components/student-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressCircle } from "@/components/dashboard/progress-circle";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") redirect("/login");

  const data = await getStudentProgress(user.id);
  if (!data) redirect("/login");
  const { student, progress } = data;

  const fields: [string, string][] = [
    ["รหัสนักศึกษา", student.studentId],
    ["ชื่อ-นามสกุล", `${student.firstName} ${student.lastName}`],
    ["ระดับการศึกษา", student.educationLevel],
    ["คณะ/โรงเรียน", student.faculty.name],
    ["หลักสูตร/สาขาวิชา", student.major.name],
    ["ศูนย์การศึกษา", student.campus],
    ["ประเภทนักศึกษา", student.studentType],
    ["ปีการศึกษาแรกเข้า", String(student.academicYear)],
    ["ภาคเรียน", String(student.semester)],
    ["เป้าหมายหน่วยกิต GE", `${student.major.geCredits} หน่วยกิต`],
  ];

  return (
    <StudentShell
      student={{
        name: `${student.firstName} ${student.lastName}`,
        studentId: student.studentId,
        faculty: student.faculty.name,
        major: student.major.name,
      }}
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-2xl font-bold">ข้อมูลนักศึกษา</h1>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Avatar card */}
          <Card className="lg:col-span-1">
            <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-4xl font-bold text-primary">
                {student.firstName.charAt(0)}
              </div>
              <div>
                <p className="text-lg font-semibold">
                  {student.firstName} {student.lastName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {student.studentId}
                </p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <BadgeCheck className="h-3.5 w-3.5" />
                นักศึกษา{student.studentType} · {student.educationLevel}
              </Badge>
              <ProgressCircle
                value={progress.percent}
                size={120}
                strokeWidth={10}
                sublabel={`${progress.earnedCredits}/${progress.targetCredits} นก.`}
              />
            </CardContent>
          </Card>

          {/* Detail card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GraduationCap className="h-5 w-5 text-primary" />
                รายละเอียด (จากฐานข้อมูลทะเบียน)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y text-sm">
                {fields.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between gap-4 py-2.5"
                  >
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </StudentShell>
  );
}
