/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production logging
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development',
    },
  },

  images: {
    qualities: [75, 80],
    // Optimize device sizes for common breakpoints
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    // Serve modern formats first
    formats: ['image/avif', 'image/webp'],
    // Limit concurrent image optimizations to prevent memory spikes
    minimumCacheTTL: 60,
    // Allow static assets and internal proxy route
    localPatterns: [
      {
        pathname: '/**',
      },
      {
        pathname: '/api/image/proxy',
      },
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'fgfvuckrafohyjiuidnw.supabase.co',
        port: '',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**.fbcdn.net',
      },
      {
        protocol: 'https',
        hostname: 'cse.neu.ac.bd',
      },
      {
        protocol: 'https',
        hostname: 'robohash.org',
      },
    ],
  },

  // Compress responses (Vercel CDN handles this, but useful for local prod)
  compress: true,

  // Enable React strict mode for catching potential issues
  reactStrictMode: true,

  // ── Security Headers ──────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Enable XSS filter in older browsers
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Control referrer information
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restrict browser features/APIs
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
          // Force HTTPS (1 year, include subdomains)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://giscus.app",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://fgfvuckrafohyjiuidnw.supabase.co https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
              "connect-src 'self' https://fgfvuckrafohyjiuidnw.supabase.co https://accounts.google.com",
              "frame-src 'self' https://giscus.app https://accounts.google.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // Disable the X-Powered-By header (hides Next.js fingerprint)
  poweredByHeader: false,

  // ── Server External Packages ────────────────────────────────────────────
  // Keep heavy server-only packages out of the client bundle
  serverExternalPackages: ['nodemailer', 'sanitize-html'],

  // ── Experimental ──────────────────────────────────────────────────────────
  experimental: {
    // Server actions body size limit (unlimited storage — allow large uploads)
    serverActions: {
      bodySizeLimit: '100mb',
    },
    // Proxy request body size limit
    proxyClientMaxBodySize: '100mb',
  },
};

export default nextConfig;
