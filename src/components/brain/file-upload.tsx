"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { parseTextFile, parseMarkdownFile, parseCsvFile } from "@/lib/ingestion/parser";
import { UploadCloudIcon, FileIcon, XIcon, AlertCircleIcon, CheckCircleIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UploadedFile {
  name: string;
  type: string;
  size: number;
  content: string;
  path: string;
}

interface FileUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPath?: string;
  onUploadComplete: (files: UploadedFile[]) => void;
}

type FileStatus = "pending" | "processing" | "done" | "error";

interface QueuedFile {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
  error?: string;
  content?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCEPTED_EXTENSIONS = [".pdf", ".md", ".txt", ".doc", ".docx", ".csv"];
const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "text/markdown",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf(".");
  return dotIndex >= 0 ? filename.slice(dotIndex).toLowerCase() : "";
}

function isTextExtension(ext: string): boolean {
  return ext === ".md" || ext === ".txt" || ext === ".csv";
}

let fileIdCounter = 0;
function nextId(): string {
  return `file-${++fileIdCounter}-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FileUpload({
  open,
  onOpenChange,
  targetPath = "/",
  onUploadComplete,
}: FileUploadProps) {
  const [queue, setQueue] = React.useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setQueue([]);
      setIsDragging(false);
      setValidationError(null);
      setIsProcessing(false);
    }
  }, [open]);

  // --------------------------------------------------
  // Validation & adding files
  // --------------------------------------------------

  const addFiles = React.useCallback(
    (incoming: FileList | File[]) => {
      const files = Array.from(incoming);
      setValidationError(null);

      // Check total count
      const totalAfter = queue.length + files.length;
      if (totalAfter > MAX_FILES) {
        setValidationError(
          `Maximum ${MAX_FILES} files allowed. You have ${queue.length} queued and tried to add ${files.length}.`
        );
        return;
      }

      const validFiles: QueuedFile[] = [];

      for (const file of files) {
        const ext = getExtension(file.name);

        if (!ACCEPTED_EXTENSIONS.includes(ext)) {
          setValidationError(
            `"${file.name}" is not a supported file type. Accepted: ${ACCEPTED_EXTENSIONS.join(", ")}`
          );
          return;
        }

        if (file.size > MAX_FILE_SIZE) {
          setValidationError(
            `"${file.name}" exceeds the 10 MB size limit (${formatFileSize(file.size)}).`
          );
          return;
        }

        // Avoid duplicate filenames
        const alreadyQueued = queue.some((q) => q.file.name === file.name);
        if (alreadyQueued) {
          continue;
        }

        validFiles.push({
          id: nextId(),
          file,
          status: "pending",
          progress: 0,
        });
      }

      if (validFiles.length > 0) {
        setQueue((prev) => [...prev, ...validFiles]);
      }
    },
    [queue]
  );

  // --------------------------------------------------
  // Drag and drop handlers
  // --------------------------------------------------

  const handleDragOver = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isProcessing) setIsDragging(true);
    },
    [isProcessing]
  );

  const handleDragLeave = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    },
    []
  );

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (!isProcessing && e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles, isProcessing]
  );

  // --------------------------------------------------
  // File input handler
  // --------------------------------------------------

  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
      }
      // Reset input so the same file can be re-added if removed
      if (inputRef.current) inputRef.current.value = "";
    },
    [addFiles]
  );

  // --------------------------------------------------
  // Remove a file from the queue
  // --------------------------------------------------

  const removeFile = React.useCallback((id: string) => {
    setQueue((prev) => prev.filter((f) => f.id !== id));
    setValidationError(null);
  }, []);

  // --------------------------------------------------
  // Process all files
  // --------------------------------------------------

  const processFiles = React.useCallback(async () => {
    if (queue.length === 0) return;

    setIsProcessing(true);
    setValidationError(null);

    const results: UploadedFile[] = [];

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      const ext = getExtension(item.file.name);

      // Mark as processing
      setQueue((prev) =>
        prev.map((f) =>
          f.id === item.id ? { ...f, status: "processing" as const, progress: 30 } : f
        )
      );

      try {
        let content: string;

        if (isTextExtension(ext)) {
          // Progress: reading
          setQueue((prev) =>
            prev.map((f) =>
              f.id === item.id ? { ...f, progress: 50 } : f
            )
          );

          if (ext === ".md") {
            const parsed = await parseMarkdownFile(item.file);
            content = parsed.content;
          } else if (ext === ".csv") {
            const parsed = await parseCsvFile(item.file);
            content = parsed.summary + "\n\n" + parsed.rows
              .map((row) =>
                row
                  .map((val, idx) =>
                    parsed.headers[idx] ? `${parsed.headers[idx]}: ${val}` : val
                  )
                  .join(", ")
              )
              .join("\n");
          } else {
            content = await parseTextFile(item.file);
          }
        } else {
          // PDF/doc/docx: placeholder until server-side parsing
          content = `[Pending server-side extraction] File: ${item.file.name} (${formatFileSize(item.file.size)})`;
        }

        // Progress: done
        setQueue((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? { ...f, status: "done" as const, progress: 100, content }
              : f
          )
        );

        const filePath = targetPath.endsWith("/")
          ? `${targetPath}${item.file.name}`
          : `${targetPath}/${item.file.name}`;

        results.push({
          name: item.file.name,
          type: item.file.type,
          size: item.file.size,
          content,
          path: filePath,
        });
      } catch (err) {
        setQueue((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? {
                  ...f,
                  status: "error" as const,
                  progress: 0,
                  error:
                    err instanceof Error
                      ? err.message
                      : "Failed to process file",
                }
              : f
          )
        );
      }
    }

    setIsProcessing(false);

    if (results.length > 0) {
      onUploadComplete(results);
    }
  }, [queue, targetPath, onUploadComplete]);

  // --------------------------------------------------
  // Derived state
  // --------------------------------------------------

  const allDone = queue.length > 0 && queue.every((f) => f.status === "done" || f.status === "error");
  const hasPending = queue.some((f) => f.status === "pending");
  const canProcess = queue.length > 0 && !isProcessing && (hasPending || queue.some((f) => f.status === "error"));

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Add files to your knowledge base. Accepted formats:{" "}
            {ACCEPTED_EXTENSIONS.join(", ")}
          </DialogDescription>
        </DialogHeader>

        {/* Drop zone */}
        <div
          role="button"
          tabIndex={0}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isProcessing && inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!isProcessing) inputRef.current?.click();
            }
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
            isProcessing && "pointer-events-none opacity-50"
          )}
        >
          <UploadCloudIcon className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            {isDragging ? "Drop files here" : "Drop files here or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground">
            Max {MAX_FILES} files, {formatFileSize(MAX_FILE_SIZE)} each
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_MIME_TYPES.join(",")}
          onChange={handleInputChange}
          className="hidden"
        />

        {/* Validation error */}
        {validationError && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* File queue */}
        {queue.length > 0 && (
          <div className="flex max-h-60 flex-col gap-2 overflow-y-auto">
            {queue.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-1.5 rounded-md border p-3"
              >
                <div className="flex items-center gap-2">
                  {/* Status icon */}
                  {item.status === "done" ? (
                    <CheckCircleIcon className="size-4 shrink-0 text-emerald-500" />
                  ) : item.status === "error" ? (
                    <AlertCircleIcon className="size-4 shrink-0 text-destructive" />
                  ) : item.status === "processing" ? (
                    <Loader2Icon className="size-4 shrink-0 animate-spin text-primary" />
                  ) : (
                    <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                  )}

                  {/* Name and size */}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{item.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(item.file.size)}
                      {item.status === "processing" && " - Processing..."}
                      {item.status === "error" && item.error
                        ? ` - ${item.error}`
                        : null}
                    </p>
                  </div>

                  {/* Remove button */}
                  {!isProcessing && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(item.id);
                      }}
                    >
                      <XIcon className="size-3" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  )}
                </div>

                {/* Progress bar */}
                {(item.status === "processing" || item.status === "done") && (
                  <Progress value={item.progress} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <DialogFooter>
          {allDone ? (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          ) : (
            <Button
              onClick={processFiles}
              disabled={!canProcess}
            >
              {isProcessing ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Upload & Process${queue.length > 0 ? ` (${queue.length})` : ""}`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
