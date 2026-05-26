import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// When Next runs on port 3000, proxy must target backend on another port (e.g. 3001)
const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      { source: '/api-proxy/:path*', destination: `${backendUrl}/:path*` },
    ];
  },
};

export default withNextIntl(nextConfig);
