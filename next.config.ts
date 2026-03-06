import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/reports/[id]/generate": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
