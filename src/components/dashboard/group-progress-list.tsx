"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle } from "lucide-react";
import type { GroupProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";

/** รายการความก้าวหน้าแยกตามกลุ่มทักษะ พร้อมแถบสัดส่วน */
export function GroupProgressList({ groups }: { groups: GroupProgress[] }) {
  return (
    <div className="space-y-4">
      {groups.map((g, i) => {
        const pct =
          g.requiredCredits > 0
            ? Math.min(100, (g.countedCredits / g.requiredCredits) * 100)
            : 100;
        return (
          <div key={g.code} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 font-medium">
                {g.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                {g.name}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {g.earnedCredits}/{g.requiredCredits} นก.
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  g.completed ? "bg-success" : "bg-primary",
                )}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, delay: i * 0.08, ease: "easeOut" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
