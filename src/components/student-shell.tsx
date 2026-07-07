"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  LayoutDashboard,
  ClipboardList,
  History,
  User,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";

export interface StudentInfo {
  name: string;
  studentId: string;
  faculty: string;
  major: string;
}

const NAV = [
  { href: "/dashboard", label: "ภาพรวม", icon: LayoutDashboard },
  { href: "/register", label: "ลงทะเบียนเรียน", icon: ClipboardList },
  { href: "/history", label: "ประวัติการลงทะเบียน", icon: History },
  { href: "/profile", label: "ข้อมูลนักศึกษา", icon: User },
];

export function StudentShell({
  student,
  children,
}: {
  student: StudentInfo;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const initials = student.name.trim().charAt(0) || "น";

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <nav className="space-y-1">
      {NAV.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
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
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-card lg:flex">
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">ระบบลงทะเบียน GE</p>
            <p className="text-xs text-muted-foreground">หลักสูตร พ.ศ. 2569</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks />
        </div>
        <div className="border-t p-3">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-secondary/60 px-3 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{student.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {student.studentId}
              </p>
            </div>
          </div>
          <LogoutButton size="sm" className="w-full" />
        </div>
      </aside>

      {/* Mobile drawer */}
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
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <span className="text-sm font-semibold">ระบบลงทะเบียน GE</span>
                </div>
                <button onClick={() => setOpen(false)} aria-label="ปิดเมนู">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <NavLinks onClick={() => setOpen(false)} />
              </div>
              <div className="border-t p-3">
                <LogoutButton size="sm" className="w-full" />
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-2">
            <button
              className="lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="เปิดเมนู"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm text-muted-foreground">
              {student.faculty} · {student.major}
            </span>
          </div>
          <ThemeToggle />
        </header>
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
