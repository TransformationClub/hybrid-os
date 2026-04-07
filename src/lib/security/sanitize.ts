// ---------------------------------------------------------------------------
// Dangerous HTML tags that should always be stripped
// ---------------------------------------------------------------------------
const DANGEROUS_TAGS =
  /<\s*\/?\s*(script|iframe|object|embed|form|input|textarea|button|link|meta|base|applet|style)\b[^>]*>/gi;

const SCRIPT_CONTENT = /<script\b[^>]*>[\s\S]*?<\/script>/gi;

const EVENT_HANDLERS = /\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;

const DATA_URLS = /\b(href|src|action)\s*=\s*["']?\s*(?:javascript|data):/gi;

// Control characters (C0 + C1 except common whitespace)
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;

// ---------------------------------------------------------------------------
// sanitizeHtml - strip dangerous HTML tags and attributes
// ---------------------------------------------------------------------------
export function sanitizeHtml(input: string): string {
  let result = input;
  // Remove full <script>...</script> blocks first
  result = result.replace(SCRIPT_CONTENT, "");
  // Remove remaining dangerous opening/closing tags
  result = result.replace(DANGEROUS_TAGS, "");
  // Remove event handler attributes
  result = result.replace(EVENT_HANDLERS, "");
  // Remove javascript: / data: URLs in href/src/action
  result = result.replace(DATA_URLS, "");
  return result;
}

// ---------------------------------------------------------------------------
// sanitizeUserInput - general-purpose text sanitization
// ---------------------------------------------------------------------------
const MAX_INPUT_LENGTH = 10_000;

export function sanitizeUserInput(
  input: string,
  maxLength: number = MAX_INPUT_LENGTH
): string {
  let result = input.trim();
  // Strip control characters (keep \n, \r, \t)
  result = result.replace(CONTROL_CHARS, "");
  // Enforce length limit
  if (result.length > maxLength) {
    result = result.slice(0, maxLength);
  }
  return result;
}

// ---------------------------------------------------------------------------
// sanitizeMarkdown - allow markdown formatting, strip script tags
// ---------------------------------------------------------------------------
export function sanitizeMarkdown(input: string): string {
  let result = input;
  // Remove script blocks
  result = result.replace(SCRIPT_CONTENT, "");
  // Remove standalone script tags
  result = result.replace(
    /<\s*\/?\s*script\b[^>]*>/gi,
    ""
  );
  // Remove event handlers
  result = result.replace(EVENT_HANDLERS, "");
  // Remove javascript: URLs
  result = result.replace(DATA_URLS, "");
  return result;
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function validateEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return EMAIL_RE.test(email);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-7][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateUuid(id: string): boolean {
  return UUID_RE.test(id);
}
