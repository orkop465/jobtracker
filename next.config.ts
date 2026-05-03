import type { NextConfig } from "next";

// Baseline security headers applied to every response. Tuned to be safe for
// the current app surface (Next.js + Google Charts on /app/analytics +
// Google Fonts on every page) without being so loose that they're useless.
//
// If you add a new third-party script/style/image source, update the CSP
// directives below — don't reach for `unsafe-inline` outside of `style-src`
// (where Next.js / Tailwind currently require it).
const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Google Charts loader for the analytics Sankey diagram.
      "script-src 'self' 'unsafe-inline' https://www.gstatic.com https://www.google.com",
      // Tailwind / Next inject inline styles; Google Fonts stylesheet.
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Google Fonts files + Google Charts assets.
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      // Resume signed-URL fetches go to storage.googleapis.com.
      "connect-src 'self' https://storage.googleapis.com https://www.google.com",
      // pdfjs renders PDFs in a Web Worker shipped from /pdfjs/ — same-origin
      // covered by 'self', plus blob: which pdfjs uses for some sub-resources.
      "worker-src 'self' blob:",
      // Marketplace peek modal iframes a signed PDF on storage.googleapis.com.
      "frame-src 'self' https://storage.googleapis.com",
      // 'self' lets our same-origin PDF preview iframe load
      // /api/resumes/[id]/view/file. Third-party framing stays blocked.
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "lightningcss",
    "lightningcss-linux-x64-gnu",
    "@napi-rs/canvas",
    "pdfjs-dist",
    "pdf-lib",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
