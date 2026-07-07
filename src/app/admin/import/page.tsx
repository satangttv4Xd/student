import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { AdminShell } from "@/components/admin-shell";
import { ImportClient } from "./import-client";

export const dynamic = "force-dynamic";

export default async function AdminImportPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/admin/login");

  return (
    <AdminShell adminName={user.name}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">นำเข้า / ส่งออกข้อมูล</h1>
          <p className="text-sm text-muted-foreground">
            นำเข้านักศึกษาจาก Excel/CSV และส่งออกรายงานทั้งหมด
          </p>
        </div>
        <ImportClient />
      </div>
    </AdminShell>
  );
}
