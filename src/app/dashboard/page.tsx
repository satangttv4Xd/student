import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Award,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  Layers,
  TrendingUp,
} from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { getStudentProgress } from "@/server/student";
import { StudentShell } from "@/components/student-shell";
import { ProgressCircle } from "@/components/dashboard/progress-circle";
import { StatCard } from "@/components/dashboard/stat-card";
import { GroupProgressList } from "@/components/dashboard/group-progress-list";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") redirect("/login");

  const data = await getStudentProgress(user.id);
  if (!data) redirect("/login");

  const { student, courses, progress } = data;

  return (
    <StudentShell
      student={{
        name: `${student.firstName} ${student.lastName}`,
        studentId: student.studentId,
        faculty: student.faculty.name,
        major: student.major.name,
      }}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              สวัสดี, {student.firstName} 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              ภาพรวมความก้าวหน้าหมวดวิชาศึกษาทั่วไป (GE)
            </p>
          </div>
          <Button asChild>
            <Link href="/register">
              <ClipboardCheck /> ลงทะเบียนเรียน
            </Link>
          </Button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={BookOpen}
            label="หน่วยกิตที่ลงแล้ว"
            value={progress.earnedCredits}
            hint={`จากเป้าหมาย ${progress.targetCredits} นก.`}
            tone="primary"
          />
          <StatCard
            icon={TrendingUp}
            label="หน่วยกิตคงเหลือ"
            value={progress.remainingCredits}
            hint="เพื่อให้ครบหลักสูตร"
            tone={progress.remainingCredits === 0 ? "success" : "warning"}
          />
          <StatCard
            icon={Award}
            label="วิชาบังคับ"
            value={`${progress.compulsoryDone}/${progress.compulsory.length}`}
            hint="ลงครบแล้ว"
            tone={
              progress.compulsoryDone === progress.compulsory.length
                ? "success"
                : "muted"
            }
          />
          <StatCard
            icon={Layers}
            label="วิชาที่ลงทั้งหมด"
            value={courses.length}
            hint={`${progress.electiveCredits} นก. วิชาเลือก`}
            tone="muted"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Progress circle */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GraduationCap className="h-5 w-5 text-primary" />
                ความก้าวหน้ารวม
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <ProgressCircle
                value={progress.percent}
                label="สำเร็จ"
                sublabel={`${progress.earnedCredits}/${progress.targetCredits} นก.`}
              />
              {progress.isComplete ? (
                <Badge variant="success">ครบตามเงื่อนไขหลักสูตรแล้ว</Badge>
              ) : (
                <Badge variant="secondary">
                  เหลืออีก {progress.remainingCredits} หน่วยกิต
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Group progress */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">
                ความก้าวหน้าตามกลุ่มทักษะ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GroupProgressList groups={progress.groups} />
              <div className="mt-4 flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm">
                <span className="font-medium">เลือกตามความสนใจ</span>
                <span className="tabular-nums text-muted-foreground">
                  {progress.interestEarned}/{progress.interestRequired} นก.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Compulsory + current courses */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">วิชาบังคับ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {progress.compulsory.map((c) => (
                <div
                  key={c.code}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.code}</p>
                  </div>
                  {c.taken ? (
                    <Badge variant="success">ลงแล้ว</Badge>
                  ) : (
                    <Badge variant="warning">ยังไม่ลง</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                วิชาที่ลงทะเบียนล่าสุด
              </CardTitle>
            </CardHeader>
            <CardContent>
              {courses.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    ยังไม่มีการลงทะเบียนเรียน
                  </p>
                  <Button asChild size="sm">
                    <Link href="/register">เริ่มลงทะเบียน</Link>
                  </Button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {courses.slice(0, 6).map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="min-w-0 truncate">
                        <span className="text-muted-foreground">{c.code}</span>{" "}
                        {c.name}
                      </span>
                      <Badge variant="outline">{c.credits} นก.</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </StudentShell>
  );
}
