import { redirect } from "next/navigation";
import {
  BookOpen,
  ClipboardList,
  Landmark,
  Users,
} from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegistrationStatus } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/admin/login");

  const [
    studentCount,
    courseCount,
    facultyCount,
    registrationCount,
    faculties,
    popular,
    registeredStudents,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.course.count(),
    prisma.faculty.count(),
    prisma.registration.count({
      where: { status: RegistrationStatus.CONFIRMED },
    }),
    prisma.faculty.findMany({
      include: { _count: { select: { students: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.registrationItem.groupBy({
      by: ["courseId"],
      _count: { courseId: true },
      orderBy: { _count: { courseId: "desc" } },
      take: 8,
    }),
    prisma.registration.groupBy({
      by: ["studentId"],
      where: { status: RegistrationStatus.CONFIRMED },
    }),
  ]);

  const popularCourses = await prisma.course.findMany({
    where: { id: { in: popular.map((p) => p.courseId) } },
  });
  const courseById = new Map(popularCourses.map((c) => [c.id, c]));
  const maxFaculty = Math.max(1, ...faculties.map((f) => f._count.students));
  const maxPopular = Math.max(1, ...popular.map((p) => p._count.courseId));

  return (
    <AdminShell adminName={user.name}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">ภาพรวมระบบ</h1>
          <p className="text-sm text-muted-foreground">
            สถิติจากฐานข้อมูล (นำเข้าจากไฟล์ Excel จริง)
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={Users}
            label="นักศึกษาทั้งหมด"
            value={studentCount.toLocaleString("th-TH")}
            hint={`ลงทะเบียนแล้ว ${registeredStudents.length.toLocaleString("th-TH")} คน`}
            tone="primary"
          />
          <StatCard
            icon={BookOpen}
            label="รายวิชา GE"
            value={courseCount}
            hint="ใน 5 กลุ่มทักษะ"
            tone="success"
          />
          <StatCard
            icon={Landmark}
            label="คณะ/โรงเรียน"
            value={facultyCount}
            tone="muted"
          />
          <StatCard
            icon={ClipboardList}
            label="การลงทะเบียน"
            value={registrationCount.toLocaleString("th-TH")}
            hint="รายการที่ยืนยันแล้ว"
            tone="warning"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* จำนวนนักศึกษาต่อคณะ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">นักศึกษาแยกตามคณะ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {faculties.map((f) => (
                <div key={f.id} className="space-y-1">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">{f.name}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {f._count.students.toLocaleString("th-TH")} คน
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${(f._count.students / maxFaculty) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* วิชายอดนิยม */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                รายวิชายอดนิยม (ตามจำนวนการลงทะเบียน)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {popular.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  ยังไม่มีข้อมูลการลงทะเบียน
                </p>
              ) : (
                popular.map((p) => {
                  const c = courseById.get(p.courseId);
                  if (!c) return null;
                  return (
                    <div key={p.courseId} className="space-y-1">
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate">
                          <span className="text-muted-foreground">{c.code}</span>{" "}
                          {c.name}
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {p._count.courseId} ครั้ง
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-success"
                          style={{
                            width: `${(p._count.courseId / maxPopular) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}
