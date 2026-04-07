import { describe, it, expect } from "vitest";
import {
  sanitizeHtml,
  sanitizeUserInput,
  sanitizeMarkdown,
  validateEmail,
  validateUuid,
} from "@/lib/security/sanitize";

// ---------------------------------------------------------------------------
// sanitizeHtml
// ---------------------------------------------------------------------------
describe("sanitizeHtml", () => {
  it("strips script tags and their content", () => {
    const input = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<script");
    expect(result).not.toContain("alert");
    expect(result).toContain("<p>Hello</p>");
    expect(result).toContain("<p>World</p>");
  });

  it("strips self-closing and malformed script tags", () => {
    expect(sanitizeHtml("<script src=x></script>")).toBe("");
    expect(sanitizeHtml("< script >bad</ script >")).not.toContain("script");
  });

  it("strips event handler attributes", () => {
    const input = '<img src="pic.jpg" onerror="alert(1)">';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("onerror");
    expect(result).toContain("src=");
  });

  it("strips onclick handlers", () => {
    const input = '<div onclick="doEvil()">Click me</div>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("onclick");
    expect(result).toContain("Click me");
  });

  it("preserves safe HTML content", () => {
    const input = "<p>This is <strong>safe</strong> content</p>";
    expect(sanitizeHtml(input)).toBe(input);
  });
});

// ---------------------------------------------------------------------------
// sanitizeUserInput
// ---------------------------------------------------------------------------
describe("sanitizeUserInput", () => {
  it("trims leading and trailing whitespace", () => {
    expect(sanitizeUserInput("  hello  ")).toBe("hello");
  });

  it("limits length to default max", () => {
    const long = "a".repeat(20_000);
    expect(sanitizeUserInput(long).length).toBe(10_000);
  });

  it("limits length to custom max", () => {
    const input = "abcdefghij";
    expect(sanitizeUserInput(input, 5)).toBe("abcde");
  });

  it("strips control characters but keeps newlines and tabs", () => {
    const input = "hello\x00\x01\nworld\ttab";
    const result = sanitizeUserInput(input);
    expect(result).toBe("hello\nworld\ttab");
  });
});

// ---------------------------------------------------------------------------
// sanitizeMarkdown
// ---------------------------------------------------------------------------
describe("sanitizeMarkdown", () => {
  it("preserves standard markdown formatting", () => {
    const md = "# Heading\n\n**bold** and *italic*\n\n- list item\n\n[link](http://example.com)";
    expect(sanitizeMarkdown(md)).toBe(md);
  });

  it("strips script tags from markdown", () => {
    const md = '# Title\n<script>alert("xss")</script>\nParagraph';
    const result = sanitizeMarkdown(md);
    expect(result).not.toContain("<script");
    expect(result).toContain("# Title");
    expect(result).toContain("Paragraph");
  });

  it("strips event handlers from markdown with inline HTML", () => {
    const md = '<div onmouseover="evil()">content</div>';
    const result = sanitizeMarkdown(md);
    expect(result).not.toContain("onmouseover");
    expect(result).toContain("content");
  });
});

// ---------------------------------------------------------------------------
// validateEmail
// ---------------------------------------------------------------------------
describe("validateEmail", () => {
  it("accepts valid email addresses", () => {
    expect(validateEmail("user@example.com")).toBe(true);
    expect(validateEmail("first.last@domain.co")).toBe(true);
    expect(validateEmail("tag+filter@gmail.com")).toBe(true);
  });

  it("rejects invalid email addresses", () => {
    expect(validateEmail("")).toBe(false);
    expect(validateEmail("not-an-email")).toBe(false);
    expect(validateEmail("@missing-local.com")).toBe(false);
    expect(validateEmail("missing-at-sign.com")).toBe(false);
    expect(validateEmail("a".repeat(255) + "@example.com")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateUuid
// ---------------------------------------------------------------------------
describe("validateUuid", () => {
  it("accepts valid UUIDs", () => {
    expect(validateUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(validateUuid("6ba7b810-9dad-11d1-80b4-00c04fd430c8")).toBe(true);
    expect(validateUuid("F47AC10B-58CC-4372-A567-0E02B2C3D479")).toBe(true);
  });

  it("rejects invalid UUIDs", () => {
    expect(validateUuid("")).toBe(false);
    expect(validateUuid("not-a-uuid")).toBe(false);
    expect(validateUuid("550e8400-e29b-41d4-a716")).toBe(false);
    expect(validateUuid("550e8400e29b41d4a716446655440000")).toBe(false);
  });
});
