import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CourseType, courseTypeLabel } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/admin/login");

  const groups = await prisma.skillGroup.findMany({
    orderBy: { order: "asc" },
    include: {
      courses: {
        orderBy: { code: "asc" },
        include: { _count: { select: { registrationItems: true } } },
      },
    },
  });
  const totalCourses = groups.reduce((s, g) => s + g.courses.length, 0);

  return (
    <AdminShell adminName={user.name}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">รายวิชา GE</h1>
          <p className="text-sm text-muted-foreground">
            {totalCourses} วิชา ใน {groups.length} กลุ่มทักษะ (นำเข้าจาก
            โครง Ge ใหม่V2.xlsx)
          </p>
        </div>

        {groups.map((g) => (
          <Card key={g.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">{g.name}</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    ขั้นต่ำ {g.requiredCredits} นก.
                  </Badge>
                  {g.compulsoryCredits > 0 && (
                    <Badge>บังคับ {g.compulsoryCredits} นก.</Badge>
                  )}
                  <Badge variant="outline">{g.courses.length} วิชา</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y bg-secondary/50 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2.5 font-medium">รหัสวิชา</th>
                      <th className="px-4 py-2.5 font-medium">ชื่อวิชา</th>
                      <th className="px-4 py-2.5 font-medium">หน่วยกิต</th>
                      <th className="px-4 py-2.5 font-medium">ประเภท</th>
                      <th className="px-4 py-2.5 text-right font-medium">
                        ถูกลงทะเบียน
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.courses.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b last:border-0 hover:bg-accent/30"
                      >
                        <td className="px-4 py-2 font-mono text-xs">{c.code}</td>
                        <td className="px-4 py-2">{c.name}</td>
                        <td className="px-4 py-2 tabular-nums">
                          {c.creditDetail}
                        </td>
                        <td className="px-4 py-2">
                          <Badge
                            variant={
                              c.type === CourseType.REQUIRED
                                ? "default"
                                : "outline"
                            }
                          >
                            {courseTypeLabel[c.type as CourseType]}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                          {c._count.registrationItems.toLocaleString("th-TH")}{" "}
                          ครั้ง
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
