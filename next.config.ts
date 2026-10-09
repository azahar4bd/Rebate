import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Arena's HTTPS preview hosts during development.
  allowedDevOrigins: ["*.e2b.app"],
  // Runtime secrets belong in the host environment, never in traced bundles.
  outputFileTracingExcludes: {
    "*": [".env", ".env.*"],
  },
};

export default nextConfig;
