/**
 * Security headers applied to every response via next.config.ts.
 *
 * These mitigate common web vulnerabilities (XSS, clickjacking,
 * MIME sniffing, information leakage).
 */
export const securityHeaders: Record<string, string> = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.hubapi.com https://api.openai.com https://*.ingest.sentry.io https://inn.gs",
  ].join("; "),
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};
