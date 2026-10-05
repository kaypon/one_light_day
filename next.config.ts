import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const onVercel = Boolean(process.env.VERCEL);

// Who may show this site in an iframe: itself and the portfolio's project page.
// Update this if kevdotnet moves to a custom domain.
const FRAME_ANCESTORS = [
  "'self'",
  "https://kevdotnet.vercel.app",
  ...(onVercel ? [] : ["http://localhost:3000"]),
];

// Static-page CSP (nonces would force every page to render dynamically).
// Vercel Analytics is served same-origin in production; dev loads its debug script.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval' https://va.vercel-scripts.com" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  `frame-ancestors ${FRAME_ANCESTORS.join(" ")}`,
  ...(onVercel ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
