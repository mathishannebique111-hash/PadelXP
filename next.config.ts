import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: { domains: [] },
  outputFileTracingRoot: path.join(process.cwd()),
};

export default nextConfig;
