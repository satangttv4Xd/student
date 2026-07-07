/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // xlsx / prisma เป็น server-only ต้องไม่ถูก bundle เข้า client
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma", "xlsx"],
  },
};

export default nextConfig;
