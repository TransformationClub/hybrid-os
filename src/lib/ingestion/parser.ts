import type { KnowledgeType } from "@/types";

/**
 * Read plain text content from a File object.
 */
export async function parseTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsText(file);
  });
}

/**
 * Parse a markdown file, extracting frontmatter and content.
 */
export async function parseMarkdownFile(
  file: File
): Promise<{ content: string; title: string; metadata: Record<string, string> }> {
  const raw = await parseTextFile(file);
  const metadata: Record<string, string> = {};
  let content = raw;

  // Extract YAML frontmatter delimited by ---
  const frontmatterMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (frontmatterMatch) {
    const frontmatterBlock = frontmatterMatch[1];
    content = frontmatterMatch[2];

    for (const line of frontmatterBlock.split(/\r?\n/)) {
      const colonIdx = line.indexOf(":");
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (key && value) {
          metadata[key] = value;
        }
      }
    }
  }

  const title = metadata["title"] || extractTitle(content, file.name);

  return { content, title, metadata };
}

/**
 * Parse a CSV file into headers, rows, and a human-readable summary.
 */
export async function parseCsvFile(
  file: File
): Promise<{ headers: string[]; rows: string[][]; summary: string }> {
  const raw = await parseTextFile(file);
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [], summary: "Empty CSV file." };
  }

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(parseCsvLine);

  const summary = [
    `CSV with ${headers.length} columns and ${rows.length} rows.`,
    `Columns: ${headers.join(", ")}.`,
    rows.length > 3
      ? `First 3 rows shown of ${rows.length} total.`
      : `All ${rows.length} rows included.`,
  ].join(" ");

  return { headers, rows, summary };
}

/**
 * Parse a single CSV line, handling quoted fields.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Extract a title from content (first markdown heading) or fall back to filename.
 */
export function extractTitle(content: string, filename: string): string {
  // Look for the first markdown heading
  const headingMatch = content.match(/^#{1,6}\s+(.+)$/m);
  if (headingMatch) {
    return headingMatch[1].trim();
  }

  // Fall back to filename without extension
  return filename.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
}

/**
 * Heuristically detect the knowledge type from content and filename.
 */
export function detectKnowledgeType(
  content: string,
  filename: string
): KnowledgeType {
  const lower = (content + " " + filename).toLowerCase();

  const patterns: Array<{ type: KnowledgeType; keywords: string[] }> = [
    {
      type: "brand",
      keywords: [
        "brand", "tone of voice", "style guide", "brand guidelines",
        "logo", "color palette", "messaging",
      ],
    },
    {
      type: "strategy",
      keywords: [
        "strategy", "okr", "roadmap", "north star", "objective",
        "initiative", "quarterly plan", "annual plan",
      ],
    },
    {
      type: "customer",
      keywords: [
        "customer", "persona", "icp", "ideal customer", "buyer",
        "audience", "segment", "account",
      ],
    },
    {
      type: "product",
      keywords: [
        "product", "feature", "pricing", "release notes",
        "changelog", "specification", "requirements",
      ],
    },
    {
      type: "skill",
      keywords: [
        "skill", "workflow", "playbook", "process", "sop",
        "how to", "procedure", "runbook",
      ],
    },
    {
      type: "agent",
      keywords: [
        "agent", "bot", "assistant", "prompt", "system prompt",
        "soul", "persona definition",
      ],
    },
    {
      type: "team",
      keywords: [
        "team", "department", "org chart", "roster",
        "onboarding", "handbook",
      ],
    },
    {
      type: "individual",
      keywords: [
        "individual", "personal", "1:1", "one-on-one",
        "performance review", "career",
      ],
    },
    {
      type: "company",
      keywords: [
        "company", "organization", "mission", "vision",
        "values", "culture", "about us",
      ],
    },
  ];

  for (const { type, keywords } of patterns) {
    const matchCount = keywords.filter((kw) => lower.includes(kw)).length;
    if (matchCount >= 2) return type;
  }

  // Single keyword fallback with priority
  for (const { type, keywords } of patterns) {
    if (keywords.some((kw) => lower.includes(kw))) return type;
  }

  return "reference";
}
