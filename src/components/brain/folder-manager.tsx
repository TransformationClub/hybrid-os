"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Folder } from "lucide-react";

// ---------- Types ----------

interface FolderManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPath: string;
  existingFolders: string[];
  onCreateFolder: (path: string) => void;
}

// ---------- Validation ----------

const INVALID_CHARS = /[^a-zA-Z0-9_\- ]/;

function validateFolderName(
  name: string,
  fullPath: string,
  existingFolders: string[]
): string | null {
  if (!name.trim()) return "Folder name is required.";
  if (INVALID_CHARS.test(name)) return "Only letters, numbers, hyphens, underscores, and spaces allowed.";
  if (existingFolders.includes(fullPath)) return "A folder with this name already exists here.";
  return null;
}

// ---------- Component ----------

export function FolderManager({
  open,
  onOpenChange,
  currentPath,
  existingFolders,
  onCreateFolder,
}: FolderManagerProps) {
  const [folderName, setFolderName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFolderName("");
      setError(null);
    }
  }, [open]);

  const fullPath = currentPath
    ? `${currentPath}/${folderName.trim().toLowerCase().replace(/\s+/g, "-")}`
    : folderName.trim().toLowerCase().replace(/\s+/g, "-");

  const displayPath = currentPath
    ? `${currentPath.split("/").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" / ")} / ${folderName || "..."}`
    : folderName || "...";

  function handleCreate() {
    const validationError = validateFolderName(
      folderName,
      fullPath,
      existingFolders
    );
    if (validationError) {
      setError(validationError);
      return;
    }
    onCreateFolder(fullPath);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Folder</DialogTitle>
          <DialogDescription>
            Create a new folder to organize your knowledge.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fm-name">Folder Name</Label>
            <Input
              id="fm-name"
              placeholder="e.g. Competitors"
              value={folderName}
              onChange={(e) => {
                setFolderName(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>

          {/* Path preview */}
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            <Folder className="size-4 shrink-0" />
            <span className="truncate">{displayPath}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!folderName.trim()}>
            Create Folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
