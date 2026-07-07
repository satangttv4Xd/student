"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ImportResult {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export function ImportClient() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "นำเข้าไม่สำเร็จ");
        if (data.errors?.length) setResult({ total: 0, inserted: 0, updated: 0, skipped: data.errors.length, errors: data.errors });
        return;
      }
      setResult(data);
      toast.success(
        `นำเข้าสำเร็จ ${data.total} คน (ใหม่ ${data.inserted} / อัปเดต ${data.updated})`,
      );
      router.refresh();
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-5 w-5 text-primary" />
            นำเข้าข้อมูลนักศึกษา (Excel / CSV)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            รูปแบบคอลัมน์ต้องตรงกับไฟล์ นักศึกษารหัส69.xlsx: ระดับการศึกษา,
            คณะ/โรงเรียน, หลักสูตร/สาขาวิชา, ศูนย์การศึกษา, ประเภทนักศึกษา,
            รหัสนักศึกษา, ชื่อ, นามสกุล, ปีการศึกษา, เทอมการศึกษา —
            รหัสที่มีอยู่แล้วจะถูก<b>อัปเดต</b> รหัสใหม่จะถูก<b>เพิ่ม</b>{" "}
            (ผิดพลาดจุดใด rollback ทั้งชุด)
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent/30"
          >
            <FileSpreadsheet className="h-8 w-8" />
            {file ? (
              <span className="font-medium text-foreground">{file.name}</span>
            ) : (
              "คลิกเพื่อเลือกไฟล์ .xlsx .xls หรือ .csv"
            )}
          </button>
          <Button className="w-full" disabled={!file || busy} onClick={upload}>
            {busy ? <Loader2 className="animate-spin" /> : <Upload />}
            นำเข้าข้อมูล
          </Button>

          {result && (
            <div className="space-y-2 rounded-xl border p-4 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-success" />
                ผลการนำเข้า
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">ทั้งหมด {result.total}</Badge>
                <Badge variant="success">เพิ่มใหม่ {result.inserted}</Badge>
                <Badge>อัปเดต {result.updated}</Badge>
                {result.skipped > 0 && (
                  <Badge variant="warning">ข้าม {result.skipped}</Badge>
                )}
              </div>
              {result.errors.length > 0 && (
                <ul className="space-y-1 pt-1 text-xs text-warning">
                  {result.errors.map((e, i) => (
                    <li key={i} className="flex gap-1.5">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      {e}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-5 w-5 text-primary" />
            ส่งออกข้อมูล (CSV เปิดใน Excel ได้)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(
            [
              ["students", "รายชื่อนักศึกษาทั้งหมด"],
              ["registrations", "รายงานการลงทะเบียน (รายวิชา)"],
              ["courses", "โครงสร้างรายวิชา GE"],
            ] as const
          ).map(([type, label]) => (
            <Button
              key={type}
              variant="outline"
              className="w-full justify-start"
              asChild
            >
              <a href={`/api/admin/export?type=${type}`} download>
                <Download /> {label}
              </a>
            </Button>
          ))}
          <p className="text-xs text-muted-foreground">
            ไฟล์ CSV มี UTF-8 BOM — เปิดใน Microsoft Excel แล้วภาษาไทยแสดงถูกต้อง
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
