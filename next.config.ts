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
      // Phase 2 FastAPI endpoints. Rewrites run after filesystem routes, so the
      // Next brain routes (/api/replies/converse, /api/briefs/generate) still win.
      {
        source: "/api/auth/:path*",
        destination: "http://127.0.0.1:8000/api/auth/:path*",
      },
      {
        source: "/api/email/:path*",
        destination: "http://127.0.0.1:8000/api/email/:path*",
      },
      {
        source: "/api/threads/:path*",
        destination: "http://127.0.0.1:8000/api/threads/:path*",
      },
      {
        source: "/api/sequences/:path*",
        destination: "http://127.0.0.1:8000/api/sequences/:path*",
      },
      {
        source: "/api/send-jobs/:path*",
        destination: "http://127.0.0.1:8000/api/send-jobs/:path*",
      },
      {
        source: "/api/briefs/:path*",
        destination: "http://127.0.0.1:8000/api/briefs/:path*",
      },
      {
        source: "/api/unsubscribe",
        destination: "http://127.0.0.1:8000/api/unsubscribe",
      },
    ];
  },
};

export default nextConfig;
