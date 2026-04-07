// ============================================================
// Simple markdown-to-HTML renderer (no external dependencies)
// ============================================================

/**
 * Convert a markdown string to sanitized HTML.
 * Supports: headings, bold, italic, inline code, links, unordered lists,
 * and paragraph breaks. Strips `<script>` tags for safety.
 */
export function renderMarkdown(content: string): string {
  if (!content) return "";

  // Strip script tags first
  let html = content.replace(/<script[\s\S]*?<\/script>/gi, "");

  // Escape HTML entities (except markdown we'll convert)
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Split into blocks by double newline
  const blocks = html.split(/\n\n+/);

  const rendered = blocks.map((block) => {
    const trimmed = block.trim();
    if (!trimmed) return "";

    // Headings
    if (trimmed.startsWith("### ")) {
      return `<h3 class="text-base font-semibold mt-4 mb-2">${processInline(trimmed.slice(4))}</h3>`;
    }
    if (trimmed.startsWith("## ")) {
      return `<h2 class="text-lg font-semibold mt-5 mb-2">${processInline(trimmed.slice(3))}</h2>`;
    }
    if (trimmed.startsWith("# ")) {
      return `<h1 class="text-xl font-bold mt-6 mb-3">${processInline(trimmed.slice(2))}</h1>`;
    }

    // Unordered list block (all lines start with "- ")
    const lines = trimmed.split("\n");
    const isListBlock = lines.every((l) => l.trimStart().startsWith("- "));
    if (isListBlock) {
      const items = lines
        .map((l) => `<li class="ml-4 list-disc">${processInline(l.trimStart().slice(2))}</li>`)
        .join("");
      return `<ul class="my-2 space-y-1">${items}</ul>`;
    }

    // Regular paragraph (may contain single-line list items mixed with text)
    const paragraphLines = lines.map((line) => {
      const t = line.trimStart();
      if (t.startsWith("- ")) {
        return `<li class="ml-4 list-disc">${processInline(t.slice(2))}</li>`;
      }
      // Headings inside a paragraph block
      if (t.startsWith("### ")) {
        return `<h3 class="text-base font-semibold mt-4 mb-2">${processInline(t.slice(4))}</h3>`;
      }
      if (t.startsWith("## ")) {
        return `<h2 class="text-lg font-semibold mt-5 mb-2">${processInline(t.slice(3))}</h2>`;
      }
      if (t.startsWith("# ")) {
        return `<h1 class="text-xl font-bold mt-6 mb-3">${processInline(t.slice(2))}</h1>`;
      }
      return processInline(line);
    });

    // Wrap non-heading, non-list content in <p>
    const hasBlockElements = paragraphLines.some(
      (l) => l.startsWith("<h") || l.startsWith("<li") || l.startsWith("<ul")
    );
    if (hasBlockElements) {
      return paragraphLines.join("\n");
    }
    return `<p class="my-2 leading-relaxed">${paragraphLines.join("<br/>")}</p>`;
  });

  return rendered.filter(Boolean).join("\n");
}

/** Process inline markdown: bold, italic, code, links */
function processInline(text: string): string {
  let result = text;

  // Inline code: `code`
  result = result.replace(
    /`([^`]+)`/g,
    '<code class="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">$1</code>'
  );

  // Bold: **text**
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Italic: *text*
  result = result.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  // Links: [text](url)
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-primary underline underline-offset-2 hover:text-primary/80" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  return result;
}
