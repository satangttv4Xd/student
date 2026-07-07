"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  LogOut,
  Menu,
  ShieldCheck,
  Upload,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/admin", label: "ภาพรวมและสถิติ", icon: BarChart3 },
  { href: "/admin/students", label: "นักศึกษา", icon: Users },
  { href: "/admin/courses", label: "รายวิชา GE", icon: BookOpen },
  { href: "/admin/registrations", label: "การลงทะเบียน", icon: ClipboardList },
  { href: "/admin/import", label: "นำเข้า / ส่งออก", icon: Upload },
];

export function AdminShell({
  adminName,
  children,
}: {
  adminName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("ออกจากระบบแล้ว");
    router.replace("/admin/login");
    router.refresh();
  }

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <nav className="space-y-1">
      {NAV.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-card lg:flex">
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">แผงผู้ดูแลระบบ</p>
            <p className="text-xs text-muted-foreground">ระบบลงทะเบียน GE</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks />
        </div>
        <div className="border-t p-3">
          <p className="mb-2 px-1 text-xs text-muted-foreground">
            เข้าสู่ระบบ: {adminName}
          </p>
          <Button variant="outline" size="sm" className="w-full" onClick={logout}>
            <LogOut /> ออกจากระบบ
          </Button>
        </div>
      </aside>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="absolute inset-y-0 left-0 flex w-72 flex-col border-r bg-card"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25 }}
            >
              <div className="flex items-center justify-between border-b px-5 py-4">
                <span className="text-sm font-semibold">แผงผู้ดูแลระบบ</span>
                <button onClick={() => setOpen(false)} aria-label="ปิดเมนู">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <NavLinks onClick={() => setOpen(false)} />
              </div>
              <div className="border-t p-3">
                <Button variant="outline" size="sm" className="w-full" onClick={logout}>
                  <LogOut /> ออกจากระบบ
                </Button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur lg:px-8">
          <button
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="เปิดเมนู"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="hidden text-sm text-muted-foreground lg:block">
            มหาวิทยาลัยสวนดุสิต · หลักสูตร GE พ.ศ. 2569
          </span>
          <ThemeToggle />
        </header>
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
