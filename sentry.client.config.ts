import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,

    // Lower sample rate in production to control costs
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Filter common browser noise
    ignoreErrors: [
      // Network errors
      "Failed to fetch",
      "NetworkError",
      "Load failed",
      "AbortError",
      // Browser extensions
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
      // Resize observer (benign)
      "ResizeObserver loop",
      // User-cancelled navigations
      "cancelled",
    ],

    beforeSend(event) {
      // Drop events without a useful stack trace
      if (
        event.exception?.values?.length === 1 &&
        !event.exception.values[0].stacktrace?.frames?.length
      ) {
        return null;
      }
      return event;
    },
  });
}
