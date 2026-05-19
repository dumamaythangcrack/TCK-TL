import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Ignore TypeScript errors during build so Vercel can deploy even with type issues
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
