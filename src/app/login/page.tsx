"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { GraduationCap, LogIn, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: studentId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }
      toast.success(`ยินดีต้อนรับ ${data.user.name}`);
      router.replace("/dashboard");
      router.refresh();
    } catch {
      toast.error("เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/40 p-4">
      {/* วงกลมตกแต่งพื้นหลัง */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-accent blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="border-none shadow-2xl shadow-primary/10 backdrop-blur">
          <CardHeader className="items-center text-center">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
              className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg"
            >
              <GraduationCap className="h-9 w-9" />
            </motion.div>
            <CardTitle className="text-2xl">ระบบลงทะเบียนเรียน GE</CardTitle>
            <CardDescription>
              หมวดวิชาศึกษาทั่วไป หลักสูตร พ.ศ. 2569
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="studentId">รหัสนักศึกษา</Label>
                <Input
                  id="studentId"
                  inputMode="numeric"
                  autoComplete="username"
                  placeholder="เช่น 6911011340001"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" /> กำลังเข้าสู่ระบบ...
                  </>
                ) : (
                  <>
                    <LogIn /> เข้าสู่ระบบ
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-center">
              <Link
                href="/admin/login"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                <ShieldCheck className="h-4 w-4" />
                เข้าสู่ระบบสำหรับผู้ดูแลระบบ
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {2569} มหาวิทยาลัยสวนดุสิต · สำนักส่งเสริมวิชาการและงานทะเบียน
        </p>
      </motion.div>
    </div>
  );
}
