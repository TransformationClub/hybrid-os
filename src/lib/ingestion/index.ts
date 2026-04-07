import type { KnowledgeType } from "@/types";
import {
  parseTextFile,
  parseMarkdownFile,
  parseCsvFile,
  extractTitle,
  detectKnowledgeType,
} from "./parser";
import { chunkText, type TextChunk } from "./chunker";

export interface IngestionResult {
  knowledgeObjects: Array<{
    title: string;
    type: KnowledgeType;
    content: string;
    path: string;
    source: "user";
    metadata: Record<string, unknown>;
  }>;
  chunks: TextChunk[];
  errors: Array<{ filename: string; error: string }>;
}

const TEXT_EXTENSIONS = new Set([".txt", ".md", ".csv"]);
const SUPPORTED_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".csv",
  ".pdf",
  ".doc",
  ".docx",
]);

function getExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf(".");
  return dotIndex >= 0 ? filename.slice(dotIndex).toLowerCase() : "";
}

/**
 * Process an array of files through the ingestion pipeline.
 *
 * - Routes each file to the appropriate parser based on extension
 * - Generates knowledge objects from parsed content
 * - Chunks content for future embedding
 * - Continues processing if individual files fail
 */
export async function ingestFiles(
  files: File[],
  targetPath: string
): Promise<IngestionResult> {
  const knowledgeObjects: IngestionResult["knowledgeObjects"] = [];
  const allChunks: TextChunk[] = [];
  const errors: IngestionResult["errors"] = [];

  for (const file of files) {
    try {
      const ext = getExtension(file.name);

      if (!SUPPORTED_EXTENSIONS.has(ext)) {
        errors.push({
          filename: file.name,
          error: `Unsupported file type: ${ext}`,
        });
        continue;
      }

      const result = await processFile(file, ext, targetPath);
      knowledgeObjects.push(result.knowledgeObject);
      allChunks.push(...result.chunks);
    } catch (err) {
      errors.push({
        filename: file.name,
        error: err instanceof Error ? err.message : "Unknown error during processing",
      });
    }
  }

  return { knowledgeObjects, chunks: allChunks, errors };
}

async function processFile(
  file: File,
  ext: string,
  targetPath: string
): Promise<{
  knowledgeObject: IngestionResult["knowledgeObjects"][number];
  chunks: TextChunk[];
}> {
  const filePath = targetPath.endsWith("/")
    ? `${targetPath}${file.name}`
    : `${targetPath}/${file.name}`;

  let content: string;
  let title: string;
  let metadata: Record<string, unknown> = {};

  switch (ext) {
    case ".md": {
      const parsed = await parseMarkdownFile(file);
      content = parsed.content;
      title = parsed.title;
      metadata = { ...parsed.metadata, originalFormat: "markdown" };
      break;
    }
    case ".csv": {
      const parsed = await parseCsvFile(file);
      // Store the full text content for knowledge, plus structured data in metadata
      content = parsed.rows
        .map((row) =>
          row
            .map((val, i) =>
              parsed.headers[i] ? `${parsed.headers[i]}: ${val}` : val
            )
            .join(", ")
        )
        .join("\n");
      title = extractTitle(content, file.name);
      metadata = {
        originalFormat: "csv",
        headers: parsed.headers,
        rowCount: parsed.rows.length,
        summary: parsed.summary,
      };
      break;
    }
    case ".txt": {
      content = await parseTextFile(file);
      title = extractTitle(content, file.name);
      metadata = { originalFormat: "text" };
      break;
    }
    case ".pdf":
    case ".doc":
    case ".docx": {
      // Binary formats need server-side parsing.
      // For now, capture file metadata; content extraction will happen server-side.
      content = `[Pending server-side extraction] File: ${file.name} (${formatFileSize(file.size)})`;
      title = extractTitle("", file.name);
      metadata = {
        originalFormat: ext.replace(".", ""),
        pendingExtraction: true,
        fileSize: file.size,
      };
      break;
    }
    default: {
      throw new Error(`Unsupported file extension: ${ext}`);
    }
  }

  const type = detectKnowledgeType(content, file.name);

  const chunks = TEXT_EXTENSIONS.has(ext)
    ? chunkText(content)
    : [];

  return {
    knowledgeObject: {
      title,
      type,
      content,
      path: filePath,
      source: "user",
      metadata: {
        ...metadata,
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
      },
    },
    chunks,
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export { chunkText, type TextChunk, type ChunkOptions } from "./chunker";
export {
  parseTextFile,
  parseMarkdownFile,
  parseCsvFile,
  extractTitle,
  detectKnowledgeType,
} from "./parser";
