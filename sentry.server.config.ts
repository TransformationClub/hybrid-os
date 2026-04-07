import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,

    // Lower sample rate in production
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Filter noise on the server side
    ignoreErrors: [
      "NEXT_NOT_FOUND",
      "NEXT_REDIRECT",
      "AbortError",
    ],
  });
}
