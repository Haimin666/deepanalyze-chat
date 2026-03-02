import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // 禁用开发环境指示器（悬浮球）
  devIndicators: false,
};

export default nextConfig;
