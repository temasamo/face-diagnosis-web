import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // 動的レンダリングを強制
    dynamicIO: true,
  },
  // 静的生成を無効化
  output: 'standalone',
};

export default nextConfig;
