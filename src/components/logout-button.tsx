"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";

export function LogoutButton(props: ButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("ออกจากระบบแล้ว");
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("ออกจากระบบไม่สำเร็จ");
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleLogout}
      disabled={loading}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" /> : <LogOut />}
      ออกจากระบบ
    </Button>
  );
}
