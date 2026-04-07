export interface ChunkOptions {
  maxChunkSize?: number;
  overlap?: number;
  separator?: string;
}

export interface TextChunk {
  content: string;
  index: number;
  startOffset: number;
  endOffset: number;
}

const DEFAULT_MAX_CHUNK_SIZE = 1000;
const DEFAULT_OVERLAP = 200;

/**
 * Split text into overlapping chunks for future embedding.
 *
 * Strategy:
 * 1. Split on paragraph boundaries (\n\n)
 * 2. If a paragraph exceeds maxChunkSize, split on sentence boundaries
 * 3. If a sentence exceeds maxChunkSize, split on word boundaries
 * 4. Merge small segments up to maxChunkSize, with overlap between chunks
 */
export function chunkText(
  text: string,
  options?: ChunkOptions
): TextChunk[] {
  const maxChunkSize = options?.maxChunkSize ?? DEFAULT_MAX_CHUNK_SIZE;
  const overlap = options?.overlap ?? DEFAULT_OVERLAP;
  const separator = options?.separator ?? "\n\n";

  if (!text || text.trim().length === 0) {
    return [];
  }

  // Split into atomic segments that are each <= maxChunkSize
  const segments = splitIntoSegments(text, separator, maxChunkSize);

  if (segments.length === 0) {
    return [];
  }

  // Merge segments into chunks with overlap
  return mergeSegmentsIntoChunks(segments, maxChunkSize, overlap);
}

interface Segment {
  content: string;
  startOffset: number;
  endOffset: number;
}

/**
 * Recursively split text into segments that are each <= maxChunkSize.
 */
function splitIntoSegments(
  text: string,
  separator: string,
  maxChunkSize: number
): Segment[] {
  const parts = splitWithOffsets(text, separator);
  const segments: Segment[] = [];

  for (const part of parts) {
    if (part.content.length <= maxChunkSize) {
      segments.push(part);
    } else if (separator === "\n\n") {
      // Try sentence splitting
      segments.push(
        ...splitIntoSegments(part.content, "sentence", maxChunkSize).map(
          (seg) => ({
            ...seg,
            startOffset: seg.startOffset + part.startOffset,
            endOffset: seg.endOffset + part.startOffset,
          })
        )
      );
    } else if (separator === "sentence") {
      // Try word splitting
      segments.push(
        ...splitIntoSegments(part.content, " ", maxChunkSize).map((seg) => ({
          ...seg,
          startOffset: seg.startOffset + part.startOffset,
          endOffset: seg.endOffset + part.startOffset,
        }))
      );
    } else {
      // Last resort: hard split at maxChunkSize
      let offset = 0;
      while (offset < part.content.length) {
        const end = Math.min(offset + maxChunkSize, part.content.length);
        segments.push({
          content: part.content.slice(offset, end),
          startOffset: part.startOffset + offset,
          endOffset: part.startOffset + end,
        });
        offset = end;
      }
    }
  }

  return segments;
}

/**
 * Split text by a separator and track offsets.
 */
function splitWithOffsets(text: string, separator: string): Segment[] {
  if (separator === "sentence") {
    return splitSentencesWithOffsets(text);
  }

  const segments: Segment[] = [];
  const parts = text.split(separator);
  let offset = 0;

  for (let i = 0; i < parts.length; i++) {
    const content = parts[i];
    if (content.length > 0) {
      segments.push({
        content,
        startOffset: offset,
        endOffset: offset + content.length,
      });
    }
    offset += content.length + (i < parts.length - 1 ? separator.length : 0);
  }

  return segments;
}

/**
 * Split text into sentences, tracking offsets.
 */
function splitSentencesWithOffsets(text: string): Segment[] {
  const segments: Segment[] = [];
  // Split on sentence-ending punctuation followed by whitespace or end of string
  const regex = /[.!?]+[\s]+|[.!?]+$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const end = match.index + match[0].length;
    const content = text.slice(lastIndex, end).trim();
    if (content.length > 0) {
      segments.push({
        content,
        startOffset: lastIndex,
        endOffset: end,
      });
    }
    lastIndex = end;
  }

  // Remaining text after last sentence boundary
  if (lastIndex < text.length) {
    const content = text.slice(lastIndex).trim();
    if (content.length > 0) {
      segments.push({
        content,
        startOffset: lastIndex,
        endOffset: text.length,
      });
    }
  }

  return segments;
}

/**
 * Merge small segments into chunks up to maxChunkSize, with overlap.
 */
function mergeSegmentsIntoChunks(
  segments: Segment[],
  maxChunkSize: number,
  overlap: number
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let currentContent = "";
  let currentStart = segments[0].startOffset;
  let chunkIndex = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const separator = currentContent.length > 0 ? "\n\n" : "";
    const merged = currentContent + separator + seg.content;

    if (merged.length <= maxChunkSize) {
      currentContent = merged;
    } else {
      // Flush current chunk if it has content
      if (currentContent.length > 0) {
        chunks.push({
          content: currentContent,
          index: chunkIndex,
          startOffset: currentStart,
          endOffset: currentStart + currentContent.length,
        });
        chunkIndex++;

        // Calculate overlap: take the tail of currentContent
        if (overlap > 0 && currentContent.length > overlap) {
          const overlapText = currentContent.slice(-overlap);
          // Find a clean break point in the overlap (word boundary)
          const spaceIdx = overlapText.indexOf(" ");
          const cleanOverlap =
            spaceIdx > 0 ? overlapText.slice(spaceIdx + 1) : overlapText;
          currentContent = cleanOverlap + "\n\n" + seg.content;
          currentStart =
            seg.startOffset - cleanOverlap.length;
        } else {
          currentContent = seg.content;
          currentStart = seg.startOffset;
        }
      } else {
        currentContent = seg.content;
        currentStart = seg.startOffset;
      }

      // If a single segment still exceeds maxChunkSize after merge, flush it
      if (currentContent.length > maxChunkSize) {
        chunks.push({
          content: currentContent,
          index: chunkIndex,
          startOffset: currentStart,
          endOffset: currentStart + currentContent.length,
        });
        chunkIndex++;
        currentContent = "";
        currentStart = i + 1 < segments.length ? segments[i + 1].startOffset : 0;
      }
    }
  }

  // Flush remaining content
  if (currentContent.length > 0) {
    chunks.push({
      content: currentContent,
      index: chunkIndex,
      startOffset: currentStart,
      endOffset: currentStart + currentContent.length,
    });
  }

  return chunks;
}
