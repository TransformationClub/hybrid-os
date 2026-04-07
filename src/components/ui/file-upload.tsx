"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UploadedFile {
  file: File;
  id: string;
}

export interface FileUploadProps {
  /** Callback when files are selected or dropped */
  onUpload: (files: File[]) => void;
  /** Accepted file types (e.g. "image/*,.pdf") */
  accept?: string;
  /** Max file size in bytes (default: 10 MB) */
  maxSize?: number;
  /** Allow multiple files (default: true) */
  multiple?: boolean;
  /** Additional class names for the container */
  className?: string;
  /** Whether the upload is disabled */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10 MB

// ---------------------------------------------------------------------------
// FileUpload
// ---------------------------------------------------------------------------

export function FileUpload({
  onUpload,
  accept,
  maxSize = DEFAULT_MAX_SIZE,
  multiple = true,
  className,
  disabled = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateFiles = useCallback(
    (incoming: File[]): { valid: File[]; errorMsg: string | null } => {
      const valid: File[] = [];
      const errors: string[] = [];

      for (const file of incoming) {
        if (file.size > maxSize) {
          errors.push(`"${file.name}" exceeds ${formatSize(maxSize)} limit`);
          continue;
        }

        // Basic type check against the accept string
        if (accept) {
          const acceptTypes = accept.split(",").map((t) => t.trim());
          const matches = acceptTypes.some((t) => {
            if (t.startsWith(".")) {
              return file.name.toLowerCase().endsWith(t.toLowerCase());
            }
            if (t.endsWith("/*")) {
              return file.type.startsWith(t.replace("/*", "/"));
            }
            return file.type === t;
          });
          if (!matches) {
            errors.push(`"${file.name}" is not an accepted file type`);
            continue;
          }
        }

        valid.push(file);
      }

      return {
        valid,
        errorMsg: errors.length > 0 ? errors.join(". ") : null,
      };
    },
    [accept, maxSize]
  );

  const processFiles = useCallback(
    (incoming: File[]) => {
      setError(null);
      const { valid, errorMsg } = validateFiles(incoming);

      if (errorMsg) {
        setError(errorMsg);
      }

      if (valid.length === 0) return;

      // Simulate upload progress
      setProgress(0);
      const steps = [10, 30, 50, 70, 90, 100];
      let step = 0;
      const interval = setInterval(() => {
        if (step < steps.length) {
          setProgress(steps[step]);
          step++;
        } else {
          clearInterval(interval);
          setProgress(null);

          const newFiles = valid.map((f) => ({
            file: f,
            id: `${f.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          }));
          setFiles((prev) => (multiple ? [...prev, ...newFiles] : newFiles));
          onUpload(valid);
        }
      }, 120);
    },
    [validateFiles, multiple, onUpload]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragOver(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (disabled) return;

      const droppedFiles = Array.from(e.dataTransfer.files);
      processFiles(droppedFiles);
    },
    [disabled, processFiles]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      processFiles(Array.from(e.target.files));
      // Reset input so the same file can be re-selected
      e.target.value = "";
    },
    [processFiles]
  );

  const handleRemove = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/40",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
          <Upload className="size-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">
            Drag & drop files here, or{" "}
            <button
              type="button"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
            >
              browse files
            </button>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {accept ? `Accepted: ${accept}` : "All file types accepted"}
            {" \u00B7 "}Max {formatSize(maxSize)}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* Progress bar */}
      {progress !== null && (
        <div className="flex flex-col gap-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">Uploading... {progress}%</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {/* Uploaded files */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f) => (
            <Badge
              key={f.id}
              variant="secondary"
              className="gap-1 pr-1"
            >
              <span className="max-w-[160px] truncate text-xs">
                {f.file.name}
              </span>
              <span className="text-[10px] text-muted-foreground">
                ({formatSize(f.file.size)})
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="size-4 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemove(f.id)}
              >
                <X className="size-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
