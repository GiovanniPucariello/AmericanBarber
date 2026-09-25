import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Browsers cache service workers aggressively by default, which is
        // exactly wrong for one - a stale sw.js means a stale offline
        // fallback (or worse, an old cache-clearing bug) sticks around
        // until a hard refresh. Force revalidation on every load instead.
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, must-revalidate" }],
      },
      {
        // App icons/manifest rarely change and aren't content-hashed -
        // a short cache still lets a rare update land within the hour
        // without every icon request round-tripping to the server.
        source: "/icons/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
      },
    ];
  },
};

export default nextConfig;
