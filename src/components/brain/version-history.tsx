"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  History,
  GitCompare,
  RotateCcw,
  ChevronRight,
  User,
  Bot,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getKnowledgeVersions,
  getVersionDiff,
  restoreVersion,
  type KnowledgeVersion,
} from "@/lib/brain/actions";

// ------------------------------------------------------------
// Simple line diff
// ------------------------------------------------------------

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  text: string;
}

function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const result: DiffLine[] = [];

  // Simple LCS-based diff at the line level
  const m = oldLines.length;
  const n = newLines.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  const diff: DiffLine[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      diff.push({ type: "unchanged", text: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.push({ type: "added", text: newLines[j - 1] });
      j--;
    } else {
      diff.push({ type: "removed", text: oldLines[i - 1] });
      i--;
    }
  }

  diff.reverse();
  return diff;
}

// ------------------------------------------------------------
// Sub-components
// ------------------------------------------------------------

function DiffView({
  oldContent,
  newContent,
}: {
  oldContent: string;
  newContent: string;
}) {
  const lines = computeLineDiff(oldContent, newContent);

  return (
    <div className="rounded-md border bg-muted/20 text-xs font-mono overflow-x-auto">
      {lines.map((line, idx) => (
        <div
          key={idx}
          className={cn(
            "px-3 py-0.5 whitespace-pre-wrap break-all",
            line.type === "added" &&
              "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
            line.type === "removed" &&
              "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
            line.type === "unchanged" && "text-muted-foreground"
          )}
        >
          <span className="inline-block w-5 select-none text-right mr-2 opacity-50">
            {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
          </span>
          {line.text || "\u00A0"}
        </div>
      ))}
    </div>
  );
}

function VersionRow({
  version,
  isSelected,
  isCompareA,
  isCompareB,
  compareMode,
  onSelect,
  onCompareSelect,
  onRestore,
  isLatest,
}: {
  version: KnowledgeVersion;
  isSelected: boolean;
  isCompareA: boolean;
  isCompareB: boolean;
  compareMode: boolean;
  onSelect: () => void;
  onCompareSelect: () => void;
  onRestore: () => void;
  isLatest: boolean;
}) {
  const date = new Date(version.created_at);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const isAgent = version.changed_by.toLowerCase().includes("agent");

  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-lg border p-3 transition-colors cursor-pointer",
        isSelected && !compareMode && "border-primary bg-primary/5",
        (isCompareA || isCompareB) && "border-primary bg-primary/5",
        !isSelected && !isCompareA && !isCompareB && "hover:bg-muted/50"
      )}
      onClick={compareMode ? onCompareSelect : onSelect}
    >
      {/* Version indicator */}
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <div
          className={cn(
            "flex size-7 items-center justify-center rounded-full text-xs font-bold",
            isSelected || isCompareA || isCompareB
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {version.version_number}
        </div>
        {compareMode && (isCompareA || isCompareB) && (
          <span className="text-[9px] font-medium text-primary">
            {isCompareA ? "A" : "B"}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            v{version.version_number}
          </span>
          {isLatest && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Latest
            </Badge>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          {isAgent ? (
            <Bot className="size-3" />
          ) : (
            <User className="size-3" />
          )}
          <span>{version.changed_by}</span>
          <span>&middot;</span>
          <span>
            {formattedDate} at {formattedTime}
          </span>
        </div>
        {version.change_reason && (
          <p className="mt-1 text-xs text-muted-foreground/80 line-clamp-1">
            {version.change_reason}
          </p>
        )}
      </div>

      {/* Restore button (shown on hover, not for latest) */}
      {!isLatest && !compareMode && (
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onRestore();
          }}
        >
          <RotateCcw className="size-3.5 mr-1" />
          Restore
        </Button>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Main component
// ------------------------------------------------------------

interface VersionHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectId: string | null;
  objectTitle: string;
}

export function VersionHistory({
  open,
  onOpenChange,
  objectId,
  objectTitle,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<KnowledgeVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] =
    useState<KnowledgeVersion | null>(null);

  // Compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [compareA, setCompareA] = useState<KnowledgeVersion | null>(null);
  const [compareB, setCompareB] = useState<KnowledgeVersion | null>(null);

  // Restore feedback
  const [restoredId, setRestoredId] = useState<string | null>(null);

  // Fetch versions when opened
  useEffect(() => {
    if (!open || !objectId) return;

    let cancelled = false;
    setLoading(true);
    setSelectedVersion(null);
    setCompareMode(false);
    setCompareA(null);
    setCompareB(null);
    setRestoredId(null);

    getKnowledgeVersions(objectId).then((result) => {
      if (cancelled) return;
      if (result.data) {
        setVersions(result.data);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, objectId]);

  const handleCompareSelect = useCallback(
    (version: KnowledgeVersion) => {
      if (!compareA) {
        setCompareA(version);
      } else if (!compareB && version.id !== compareA.id) {
        // Ensure A is the older version
        if (version.version_number < compareA.version_number) {
          setCompareB(compareA);
          setCompareA(version);
        } else {
          setCompareB(version);
        }
      } else {
        // Reset and start over
        setCompareA(version);
        setCompareB(null);
      }
    },
    [compareA, compareB]
  );

  const handleRestore = useCallback(
    async (version: KnowledgeVersion) => {
      if (!objectId) return;
      const result = await restoreVersion(objectId, version.id);
      if (result.data?.success) {
        setRestoredId(version.id);
        // Re-fetch versions
        const refreshed = await getKnowledgeVersions(objectId);
        if (refreshed.data) {
          setVersions(refreshed.data);
        }
        setTimeout(() => setRestoredId(null), 2000);
      }
    },
    [objectId]
  );

  const toggleCompareMode = useCallback(() => {
    setCompareMode((prev) => {
      if (prev) {
        setCompareA(null);
        setCompareB(null);
      }
      return !prev;
    });
  }, []);

  if (!objectId) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-2xl w-full flex flex-col">
        <SheetHeader className="pr-10">
          <div className="flex items-center gap-2">
            <History className="size-4 text-muted-foreground" />
            <SheetTitle>Version History</SheetTitle>
          </div>
          <SheetDescription>
            {objectTitle}
          </SheetDescription>

          {/* Toolbar */}
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant={compareMode ? "default" : "outline"}
              size="sm"
              onClick={toggleCompareMode}
            >
              <GitCompare className="size-3.5 mr-1.5" />
              {compareMode ? "Exit Compare" : "Compare"}
            </Button>
            {compareMode && (
              <span className="text-xs text-muted-foreground">
                {!compareA
                  ? "Select first version"
                  : !compareB
                    ? "Select second version"
                    : "Showing diff"}
              </span>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 mt-2">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Loading versions...
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <History className="mb-3 size-8 opacity-40" />
              <p className="text-sm">No version history available</p>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {/* Diff view when two versions are selected */}
              {compareMode && compareA && compareB && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">
                      v{compareA.version_number}
                    </span>
                    <ChevronRight className="size-3" />
                    <span className="font-medium">
                      v{compareB.version_number}
                    </span>
                  </div>
                  <DiffView
                    oldContent={compareA.content}
                    newContent={compareB.content}
                  />
                </div>
              )}

              {/* Version content when a single version is selected */}
              {!compareMode && selectedVersion && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Content at v{selectedVersion.version_number}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedVersion(null)}
                      className="text-xs"
                    >
                      Close preview
                    </Button>
                  </div>
                  <div className="rounded-md border bg-muted/20 p-3 text-xs font-mono whitespace-pre-wrap">
                    {selectedVersion.content}
                  </div>
                </div>
              )}

              {/* Version list */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {versions.length} version{versions.length !== 1 ? "s" : ""}
                </p>
                {versions.map((version, idx) => (
                  <div key={version.id} className="relative">
                    {restoredId === version.id && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-green-50/90 dark:bg-green-900/30">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-green-700 dark:text-green-300">
                          <Check className="size-4" />
                          Restored
                        </div>
                      </div>
                    )}
                    <VersionRow
                      version={version}
                      isSelected={selectedVersion?.id === version.id}
                      isCompareA={compareA?.id === version.id}
                      isCompareB={compareB?.id === version.id}
                      compareMode={compareMode}
                      onSelect={() => setSelectedVersion(version)}
                      onCompareSelect={() => handleCompareSelect(version)}
                      onRestore={() => handleRestore(version)}
                      isLatest={idx === 0}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>

        <div className="border-t px-4 py-3 text-xs text-muted-foreground">
          {versions.length > 0 && (
            <span>
              Latest: v{versions[0]?.version_number} &middot; First: v
              {versions[versions.length - 1]?.version_number}
            </span>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
