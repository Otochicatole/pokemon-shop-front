import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: { remotePatterns: [{ protocol: 'https', hostname: 'raw.githubusercontent.com' }] },
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? 'http://localhost:3000';
    return [{ source: '/api/v2/:path*', destination: `${backend}/api/v2/:path*` }, { source: '/media/:path*', destination: `${backend}/media/:path*` }];
  },
};

export default nextConfig;
