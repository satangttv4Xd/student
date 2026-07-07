import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** รวม className อย่างปลอดภัย (ใช้กับ Tailwind + shadcn/ui) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** จัดรูปแบบวันที่เป็นภาษาไทย เช่น 7 ก.ค. 2569 14:30 */
export function formatThaiDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}
