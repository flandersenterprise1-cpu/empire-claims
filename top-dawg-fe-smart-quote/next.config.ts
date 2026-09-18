import path from 'node:path';
import type { NextConfig } from 'next';

/**
 * Headers applied to every response.
 *
 * The quote wizard collects health answers, so the browser is told not to
 * leak the URL to third parties, not to sniff content types, and not to let
 * the page be framed by anyone else -- a framed quote form is the usual shape
 * of a credential or data-harvesting overlay.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Emits .next/standalone, a self-contained server the Docker image runs
  // without node_modules. Ignored by Vercel, which builds its own bundle.
  output: 'standalone',
  // This app is a subdirectory of a repository whose root holds a different,
  // unrelated project. Left to itself Next.js infers the repository root as
  // the tracing root and nests the standalone server one level deep, which
  // silently breaks the Dockerfile's COPY paths. Pin it to this app.
  outputFileTracingRoot: path.join(import.meta.dirname),
  serverExternalPackages: ['postgres', 'bcryptjs'],
  eslint: { ignoreDuringBuilds: true },
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
