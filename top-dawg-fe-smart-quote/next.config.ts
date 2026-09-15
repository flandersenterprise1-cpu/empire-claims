import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['postgres', 'bcryptjs'],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
