import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 動的レンダリングを強制
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

export default nextConfig;
