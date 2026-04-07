import { cookies } from "next/headers";
import { createHmac, randomBytes } from "crypto";

// ------------------------------------------------------------
// CSRF Protection via double-submit cookie with HMAC signing
// ------------------------------------------------------------

const CSRF_COOKIE = "hybrid-os-csrf";
const CSRF_SECRET = process.env.CSRF_SECRET || "hybrid-os-csrf-fallback-secret-change-me";

/**
 * Generates a signed CSRF token and stores it in a cookie.
 * Returns the token value for inclusion in forms / headers.
 */
export async function generateCsrfToken(): Promise<string> {
  const raw = randomBytes(32).toString("hex");
  const signature = createHmac("sha256", CSRF_SECRET).update(raw).digest("hex");
  const token = `${raw}.${signature}`;

  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1 hour
    secure: process.env.NODE_ENV === "production",
  });

  return token;
}

/**
 * Validates a CSRF token against the cookie value.
 * Returns true if valid, false otherwise.
 */
export async function validateCsrfToken(token: string): Promise<boolean> {
  if (!token) return false;

  // Verify the token's own signature
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [raw, signature] = parts;
  const expectedSignature = createHmac("sha256", CSRF_SECRET).update(raw).digest("hex");

  if (signature !== expectedSignature) return false;

  // Compare against the cookie value
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;

  if (!cookieToken) return false;

  return token === cookieToken;
}

/**
 * Reads the current CSRF token from the cookie.
 * Useful for server components to embed the token in rendered HTML.
 */
export async function getCsrfToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE)?.value ?? null;
}
