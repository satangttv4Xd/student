import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/admin/login");

  const q = (searchParams.q ?? "").trim();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const where = q
    ? {
        OR: [
          { studentId: { contains: q } },
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { faculty: { name: { contains: q } } },
          { major: { name: { contains: q } } },
        ],
      }
    : {};

  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      include: {
        faculty: true,
        major: true,
        _count: { select: { registrations: true } },
      },
      orderBy: { studentId: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (p: number) =>
    `/admin/students?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <AdminShell adminName={user.name}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">นักศึกษา</h1>
            <p className="text-sm text-muted-foreground">
              พบ {total.toLocaleString("th-TH")} คน
              {q && ` จากคำค้น "${q}"`}
            </p>
          </div>
          {/* ค้นหาแบบ GET form — ทำงานได้โดยไม่ต้องมี JS */}
          <form action="/admin/students" className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="รหัส / ชื่อ / คณะ / สาขา"
                className="w-64 pl-9"
              />
            </div>
            <Button type="submit" variant="secondary">
              ค้นหา
            </Button>
          </form>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-secondary/50 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">รหัสนักศึกษา</th>
                    <th className="px-4 py-3 font-medium">ชื่อ-นามสกุล</th>
                    <th className="px-4 py-3 font-medium">คณะ</th>
                    <th className="px-4 py-3 font-medium">สาขาวิชา</th>
                    <th className="px-4 py-3 font-medium">ศูนย์</th>
                    <th className="px-4 py-3 text-center font-medium">
                      ลงทะเบียน
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        ไม่พบข้อมูลนักศึกษา
                      </td>
                    </tr>
                  )}
                  {students.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-accent/30">
                      <td className="px-4 py-2.5 font-mono text-xs">
                        {s.studentId}
                      </td>
                      <td className="px-4 py-2.5 font-medium">
                        {s.firstName} {s.lastName}
                      </td>
                      <td className="max-w-44 truncate px-4 py-2.5">
                        {s.faculty.name}
                      </td>
                      <td className="max-w-52 truncate px-4 py-2.5">
                        {s.major.name}
                      </td>
                      <td className="max-w-40 truncate px-4 py-2.5 text-muted-foreground">
                        {s.campus}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {s._count.registrations > 0 ? (
                          <Badge variant="success">
                            {s._count.registrations} ครั้ง
                          </Badge>
                        ) : (
                          <Badge variant="outline">ยังไม่ลง</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            หน้า {page} จาก {totalPages}
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" disabled={page <= 1}>
              <Link href={pageHref(Math.max(1, page - 1))} aria-disabled={page <= 1}>
                <ChevronLeft /> ก่อนหน้า
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
            >
              <Link
                href={pageHref(Math.min(totalPages, page + 1))}
                aria-disabled={page >= totalPages}
              >
                ถัดไป <ChevronRight />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
