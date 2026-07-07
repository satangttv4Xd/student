import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

// หน้าแรก: ส่งต่อไปยังหน้าที่เหมาะสมตามสถานะการเข้าสู่ระบบ
export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/admin");
  redirect("/dashboard");
}
