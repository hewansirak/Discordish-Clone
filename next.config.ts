import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: process.env.NEXT_PUBLIC_CONVEX_URL
          ? new URL(process.env.NEXT_PUBLIC_CONVEX_URL).hostname
          : "*.convex.cloud",
      },
    ],
  },
};

export default nextConfig;
