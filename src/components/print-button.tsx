"use client";

import { Printer } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

/** ปุ่มพิมพ์หน้า (window.print) — ใช้ได้ทุกหน้า */
export function PrintButton(props: ButtonProps) {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()} {...props}>
      <Printer /> พิมพ์
    </Button>
  );
}
