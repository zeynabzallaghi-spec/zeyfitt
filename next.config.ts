import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // اجازه دسترسی دامنه‌های پیش‌نمایش به منابع dev سرور
  allowedDevOrigins: [
    "*.space-z.ai",
    "space-z.ai",
    "preview-chat-96567af2-f12c-4ffa-84a1-caee3c08eb6c.space-z.ai",
  ],
};

export default nextConfig;
