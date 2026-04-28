import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Asegura que los CSVs de /data viajan con el bundle serverless en Vercel.
  outputFileTracingIncludes: {
    "/api/analyze": [path.join(process.cwd(), "data/**/*")],
    "/api/chat": [path.join(process.cwd(), "data/**/*")],
  },
};

export default nextConfig;
