import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RegistrationStatus,
  registrationStatusLabel,
} from "@/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminRegistrationsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/admin/login");

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const [total, regs] = await Promise.all([
    prisma.registration.count(),
    prisma.registration.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        student: { include: { faculty: true } },
        _count: { select: { items: true } },
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminShell adminName={user.name}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">การลงทะเบียน</h1>
          <p className="text-sm text-muted-foreground">
            ทั้งหมด {total.toLocaleString("th-TH")} รายการ
          </p>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-secondary/50 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">เลขที่</th>
                    <th className="px-4 py-3 font-medium">นักศึกษา</th>
                    <th className="px-4 py-3 font-medium">คณะ</th>
                    <th className="px-4 py-3 font-medium">ปี/เทอม</th>
                    <th className="px-4 py-3 text-center font-medium">วิชา</th>
                    <th className="px-4 py-3 text-center font-medium">
                      หน่วยกิต
                    </th>
                    <th className="px-4 py-3 font-medium">สถานะ</th>
                    <th className="px-4 py-3 font-medium">วันที่</th>
                  </tr>
                </thead>
                <tbody>
                  {regs.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        ยังไม่มีการลงทะเบียน
                      </td>
                    </tr>
                  )}
                  {regs.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b last:border-0 hover:bg-accent/30"
                    >
                      <td className="px-4 py-2.5 tabular-nums">#{r.id}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium">
                          {r.student.firstName} {r.student.lastName}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {r.student.studentId}
                        </p>
                      </td>
                      <td className="max-w-44 truncate px-4 py-2.5">
                        {r.student.faculty.name}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">
                        {r.academicYear}/{r.semester}
                      </td>
                      <td className="px-4 py-2.5 text-center tabular-nums">
                        {r._count.items}
                      </td>
                      <td className="px-4 py-2.5 text-center tabular-nums">
                        {r.totalCredits}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          variant={
                            r.status === RegistrationStatus.CONFIRMED
                              ? "success"
                              : r.status === RegistrationStatus.CANCELLED
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {registrationStatusLabel[
                            r.status as RegistrationStatus
                          ] ?? r.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {r.createdAt.toLocaleDateString("th-TH")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            หน้า {page} จาก {totalPages}
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" disabled={page <= 1}>
              <Link href={`/admin/registrations?page=${Math.max(1, page - 1)}`}>
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
                href={`/admin/registrations?page=${Math.min(totalPages, page + 1)}`}
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
