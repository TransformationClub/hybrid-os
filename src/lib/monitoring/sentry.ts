/**
 * Sentry helper utilities.
 *
 * All functions are safe to call even when Sentry is not configured --
 * they no-op gracefully so callers don't need to guard.
 */

let _sentry: typeof import("@sentry/nextjs") | null = null;

async function getSentry() {
  if (_sentry) return _sentry;
  try {
    const mod = await import("@sentry/nextjs");
    // Check if Sentry was actually initialized (DSN was set)
    const client = mod.getClient?.();
    if (!client) return null;
    _sentry = mod;
    return mod;
  } catch {
    return null;
  }
}

/**
 * Capture an error and send it to Sentry.
 * No-ops when Sentry is not configured.
 */
export async function captureError(
  error: unknown,
  context?: Record<string, unknown>,
) {
  const sentry = await getSentry();
  if (!sentry) return;

  if (context) {
    sentry.withScope((scope) => {
      scope.setExtras(context);
      sentry.captureException(error);
    });
  } else {
    sentry.captureException(error);
  }
}

/**
 * Set user context for all subsequent Sentry events.
 */
export async function setUser(user: {
  id: string;
  email?: string;
  username?: string;
}) {
  const sentry = await getSentry();
  if (!sentry) return;
  sentry.setUser(user);
}

/**
 * Add a breadcrumb for debugging context.
 */
export async function addBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
) {
  const sentry = await getSentry();
  if (!sentry) return;
  sentry.addBreadcrumb({ message, data, level: "info" });
}
