"use client";

import { useState, useEffect } from "react";

/**
 * Client-side hook that reads the CSRF token from a meta tag or fetches it.
 * The token is set server-side and embedded in the page layout.
 * For simplicity, we read it from the cookie directly (non-httpOnly portion)
 * or from a dedicated API endpoint.
 */
export function useCsrf(): { csrfToken: string | null; isLoading: boolean } {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchToken() {
      try {
        const res = await fetch("/api/csrf", { method: "GET", credentials: "same-origin" });
        if (res.ok) {
          const data = await res.json();
          setCsrfToken(data.token ?? null);
        }
      } catch {
        // CSRF not available, proceed without
      }
      setIsLoading(false);
    }

    fetchToken();
  }, []);

  return { csrfToken, isLoading };
}
