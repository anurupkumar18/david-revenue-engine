import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  async rewrites() {
    return [
      {
        source: "/api/scrape",
        destination: "http://127.0.0.1:8000/api/scrape",
      },
      {
        source: "/api/profiles/:path*",
        destination: "http://127.0.0.1:8000/api/profiles/:path*",
      },
      {
        source: "/api/outreach/:path*",
        destination: "http://127.0.0.1:8000/api/outreach/:path*",
      },
      {
        source: "/api/health",
        destination: "http://127.0.0.1:8000/api/health",
      },
    ];
  },
};

export default nextConfig;
