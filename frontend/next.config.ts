import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  ...(isProd ? { output: "export" } : {}),
  async rewrites() {
    return [
      {
        source: "/vlc/:path*",
        destination: "http://localhost:8000/vlc/:path*",
      },
      {
        source: "/movies/:path*",
        destination: "http://localhost:8000/movies/:path*",
      },
    ];
  },
};

export default nextConfig;
