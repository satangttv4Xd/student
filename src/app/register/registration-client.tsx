"use client";

// ---------------------------------------------------------------------------
// หน้าลงทะเบียนเรียน (ฝั่ง client)
//   - เลือกวิชาแบบ checkbox จัดกลุ่มตามกลุ่มทักษะ
//   - ค้นหา (รหัส/ชื่อ/หน่วยกิต) + กรองประเภทวิชา
//   - Validation แบบสด + Summary Panel ติดขอบ
//   - Dialog ยืนยัน + บันทึกผ่าน API + พิมพ์ใบลงทะเบียน
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Info,
  Loader2,
  Lock,
  Printer,
  Search,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { validateSelection, type ValidationIssue } from "@/lib/validation";
import type { ProgressCourse } from "@/lib/progress";
import { CourseType, courseTypeLabel } from "@/types";
import { cn } from "@/lib/utils";

export interface GroupData {
  code: string;
  name: string;
  requiredCredits: number;
  compulsoryCredits: number;
  description: string;
  courses: (ProgressCourse & { creditDetail: string })[];
}

interface Props {
  groups: GroupData[];
  already: ProgressCourse[];
  targetCredits: number;
  academicYear: number;
  semester: number;
  studentName: string;
  studentCode: string;
}

type TypeFilter = "ALL" | "REQUIRED" | "ELECTIVE";

export function RegistrationClient({
  groups,
  already,
  targetCredits,
  academicYear,
  semester,
  studentName,
  studentCode,
}: Props) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ id: number; credits: number } | null>(
    null,
  );

  const allCourses = useMemo(
    () => groups.flatMap((g) => g.courses),
    [groups],
  );

  // ---------- ร่างการเลือกวิชา (localStorage) ----------
  // เก็บเฉพาะ "ร่างที่ยังไม่ยืนยัน" ต่อรหัสนักศึกษา — ข้อมูลจริงอยู่ในฐานข้อมูล
  const draftKey = `ge-draft:${studentCode}`;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const ids: number[] = JSON.parse(raw);
      const valid = new Set(allCourses.map((c) => c.id));
      const restored = ids.filter((id) => valid.has(id));
      if (restored.length > 0) {
        setSelectedIds(new Set(restored));
        toast.info(`กู้คืนร่างการเลือกวิชา ${restored.length} วิชา`);
      }
    } catch {
      /* ร่างเสียหาย — ข้าม */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      if (selectedIds.size > 0) {
        localStorage.setItem(draftKey, JSON.stringify(Array.from(selectedIds)));
      } else {
        localStorage.removeItem(draftKey);
      }
    } catch {
      /* storage เต็ม/ปิดใช้งาน — ข้าม */
    }
  }, [selectedIds, draftKey]);
  const alreadyCodes = useMemo(
    () => new Set(already.map((c) => c.code)),
    [already],
  );

  const selected = useMemo(
    () => allCourses.filter((c) => selectedIds.has(c.id)),
    [allCourses, selectedIds],
  );

  // Validation แบบสด — pure function ใช้ร่วมกับฝั่ง server
  const validation = useMemo(
    () => validateSelection(selected, already, targetCredits),
    [selected, already, targetCredits],
  );

  const alreadyCredits = already.reduce((s, c) => s + c.credits, 0);
  const selectedCredits = selected.reduce((s, c) => s + c.credits, 0);
  const totalAfter = alreadyCredits + selectedCredits;
  const percent = Math.min(100, Math.round((totalAfter / targetCredits) * 100));

  function toggle(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // กรองรายวิชาตามคำค้น + ประเภท
  const q = query.trim().toLowerCase();
  const filteredGroups = groups
    .map((g) => ({
      ...g,
      courses: g.courses.filter((c) => {
        if (typeFilter !== "ALL" && c.type !== typeFilter) return false;
        if (!q) return true;
        return (
          c.code.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          String(c.credits) === q ||
          g.name.toLowerCase().includes(q)
        );
      }),
    }))
    .filter((g) => g.courses.length > 0);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseIds: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          data.issues?.map((i: ValidationIssue) => i.message).join("\n") ??
          data.error ??
          "ลงทะเบียนไม่สำเร็จ";
        toast.error(msg);
        return;
      }
      setConfirmOpen(false);
      try {
        localStorage.removeItem(draftKey); // ยืนยันแล้ว ล้างร่างทิ้ง
      } catch {}
      setSuccess({ id: data.registrationId, credits: data.totalCredits });
      toast.success("ลงทะเบียนสำเร็จ");
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- หน้าจอสำเร็จ ----------
  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-lg"
      >
        <Card className="print:shadow-none">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10"
            >
              <CheckCircle2 className="h-10 w-10 text-success" />
            </motion.div>
            <div>
              <h2 className="text-xl font-bold">ลงทะเบียนสำเร็จ!</h2>
              <p className="text-sm text-muted-foreground">
                เลขที่การลงทะเบียน #{success.id} · {success.credits} หน่วยกิต ·
                ปีการศึกษา {academicYear}/{semester}
              </p>
            </div>
            {/* ใบลงทะเบียน (แสดงตอนพิมพ์ด้วย) */}
            <div className="w-full rounded-xl border p-4 text-left text-sm">
              <p className="mb-2 font-semibold">
                {studentName} ({studentCode})
              </p>
              <ul className="space-y-1">
                {selected.map((c) => (
                  <li key={c.id} className="flex justify-between gap-2">
                    <span>
                      {c.code} {c.name}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {c.credits} นก.
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
                <span>รวม</span>
                <span className="tabular-nums">{success.credits} นก.</span>
              </div>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer /> พิมพ์ใบลงทะเบียน
              </Button>
              <Button onClick={() => { router.push("/dashboard"); router.refresh(); }}>
                กลับหน้าภาพรวม
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // ---------- หน้าจอเลือกวิชา ----------
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-4">
        {/* ค้นหา + กรอง */}
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ค้นหา รหัสวิชา / ชื่อวิชา / หน่วยกิต / กลุ่มทักษะ"
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-1.5">
              {(
                [
                  ["ALL", "ทั้งหมด"],
                  ["REQUIRED", "วิชาบังคับ"],
                  ["ELECTIVE", "วิชาเลือก"],
                ] as [TypeFilter, string][]
              ).map(([val, label]) => (
                <Button
                  key={val}
                  size="sm"
                  variant={typeFilter === val ? "default" : "outline"}
                  onClick={() => setTypeFilter(val)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* กลุ่มทักษะ → รายวิชา */}
        {filteredGroups.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              ไม่พบรายวิชาที่ตรงกับคำค้น
            </CardContent>
          </Card>
        )}
        {filteredGroups.map((g) => {
          const groupSelected = g.courses.filter((c) => selectedIds.has(c.id));
          const groupAlready = already.filter((c) => c.skillGroupCode === g.code);
          const groupCredits =
            groupSelected.reduce((s, c) => s + c.credits, 0) +
            groupAlready.reduce((s, c) => s + c.credits, 0);
          return (
            <Card key={g.code}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{g.name}</CardTitle>
                  <Badge
                    variant={
                      groupCredits >= g.requiredCredits ? "success" : "secondary"
                    }
                  >
                    {groupCredits}/{g.requiredCredits} นก.
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{g.description}</p>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {g.courses.map((c) => {
                  const isTaken = alreadyCodes.has(c.code);
                  const isSelected = selectedIds.has(c.id);
                  const required = c.type === CourseType.REQUIRED;
                  return (
                    <motion.label
                      key={c.id}
                      whileHover={isTaken ? undefined : { y: -2 }}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                        isTaken
                          ? "cursor-not-allowed opacity-60"
                          : isSelected
                            ? "border-primary bg-accent/60 shadow-sm"
                            : "hover:border-primary/40 hover:bg-accent/30",
                      )}
                    >
                      {isTaken ? (
                        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                      ) : (
                        <Checkbox
                          className="mt-0.5"
                          checked={isSelected}
                          onCheckedChange={() => toggle(c.id)}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            {c.code}
                          </span>
                          <Badge
                            variant={required ? "default" : "outline"}
                            className="shrink-0"
                          >
                            {courseTypeLabel[c.type as CourseType]}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium leading-snug">
                          {c.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {c.creditDetail} หน่วยกิต
                          {isTaken && " · ลงทะเบียนแล้ว"}
                        </p>
                      </div>
                    </motion.label>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* -------- Summary Panel (sticky) -------- */}
      <div className="xl:sticky xl:top-20 xl:h-fit">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-5 w-5 text-primary" />
              สรุปการลงทะเบียน
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ความก้าวหน้ารวม</span>
                <span className="font-medium tabular-nums">
                  {totalAfter}/{targetCredits} นก. ({percent}%)
                </span>
              </div>
              <Progress
                value={percent}
                indicatorClassName={percent >= 100 ? "bg-success" : undefined}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <SummaryStat label="เลือกใหม่" value={`${selected.length} วิชา`} />
              <SummaryStat label="หน่วยกิตใหม่" value={`${selectedCredits} นก.`} />
              <SummaryStat label="ลงแล้วก่อนหน้า" value={`${alreadyCredits} นก.`} />
              <SummaryStat
                label="คงเหลือ"
                value={`${Math.max(0, targetCredits - totalAfter)} นก.`}
              />
            </div>

            {/* รายการวิชาที่เลือก */}
            <AnimatePresence initial={false}>
              {selected.length > 0 && (
                <motion.ul
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="max-h-44 space-y-1.5 overflow-y-auto rounded-lg border p-2 text-sm"
                >
                  {selected.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate">
                        <span className="text-muted-foreground">{c.code}</span>{" "}
                        {c.name}
                      </span>
                      <button
                        onClick={() => toggle(c.id)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label={`เอา ${c.name} ออก`}
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>

            {/* ผลการตรวจสอบ */}
            <div className="space-y-1.5">
              {validation.issues.slice(0, 6).map((issue, i) => (
                <IssueRow key={`${issue.code}-${i}`} issue={issue} />
              ))}
            </div>

            <Button
              className="w-full"
              disabled={!validation.ok || selected.length === 0}
              onClick={() => setConfirmOpen(true)}
            >
              ตรวจสอบและยืนยัน ({selectedCredits} นก.)
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* -------- Dialog ยืนยัน -------- */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลงทะเบียนเรียน</DialogTitle>
            <DialogDescription>
              ปีการศึกษา {academicYear} ภาคเรียนที่ {semester} ·{" "}
              {selected.length} วิชา รวม {selectedCredits} หน่วยกิต
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-60 space-y-1.5 overflow-y-auto rounded-lg border p-3 text-sm">
            {selected.map((c) => (
              <li key={c.id} className="flex justify-between gap-2">
                <span>
                  {c.code} {c.name}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {c.credits} นก.
                </span>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              ยืนยันการลงทะเบียน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/50 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function IssueRow({ issue }: { issue: ValidationIssue }) {
  const style = {
    error: { icon: XCircle, cls: "text-destructive" },
    warning: { icon: AlertTriangle, cls: "text-warning" },
    info: { icon: Info, cls: "text-muted-foreground" },
  }[issue.level];
  const Icon = style.icon;
  return (
    <p className={cn("flex items-start gap-1.5 text-xs", style.cls)}>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {issue.message}
    </p>
  );
}
