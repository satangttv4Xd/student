import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ClipboardList } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getStudentById } from "@/server/student";
import { StudentShell } from "@/components/student-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RegistrationStatus,
  registrationStatusLabel,
} from "@/types";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") redirect("/login");

  const student = await getStudentById(user.id);
  if (!student) redirect("/login");

  const registrations = await prisma.registration.findMany({
    where: { studentId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { course: { include: { skillGroup: true } } } } },
  });

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
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            <h1 className="text-2xl font-bold">ประวัติการลงทะเบียน</h1>
            <p className="text-sm text-muted-foreground">
              รวม {registrations.length} รายการ ·{" "}
              {registrations.reduce((s, r) => s + r.totalCredits, 0)} หน่วยกิต
            </p>
          </div>
          {registrations.length > 0 && <PrintButton />}
        </div>

        {registrations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                ยังไม่มีประวัติการลงทะเบียน
              </p>
              <Button asChild size="sm">
                <Link href="/register">ไปลงทะเบียนเรียน</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          // Timeline
          <div className="relative space-y-6 before:absolute before:inset-y-0 before:left-[19px] before:w-px before:bg-border">
            {registrations.map((reg) => (
              <div key={reg.id} className="relative pl-12">
                <div className="absolute left-0 top-1 flex h-10 w-10 items-center justify-center rounded-full border bg-card">
                  <CalendarDays className="h-4 w-4 text-primary" />
                </div>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-base">
                        ปีการศึกษา {reg.academicYear} · ภาคเรียนที่ {reg.semester}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            reg.status === RegistrationStatus.CONFIRMED
                              ? "success"
                              : reg.status === RegistrationStatus.CANCELLED
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {registrationStatusLabel[
                            reg.status as RegistrationStatus
                          ] ?? reg.status}
                        </Badge>
                        <Badge variant="outline">{reg.totalCredits} นก.</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      เลขที่ #{reg.id} · ลงทะเบียนเมื่อ{" "}
                      {reg.createdAt.toLocaleDateString("th-TH", {
                        dateStyle: "long",
                      })}{" "}
                      {reg.createdAt.toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })} น.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ul className="divide-y text-sm">
                      {reg.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              <span className="text-muted-foreground">
                                {item.course.code}
                              </span>{" "}
                              {item.course.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.course.skillGroup.name}
                            </p>
                          </div>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {item.course.creditDetail} นก.
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </StudentShell>
  );
}
