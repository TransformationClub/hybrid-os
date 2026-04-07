"use client";

import { useState, useMemo, useCallback, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderPlus,
  FileText,
  Building2,
  Palette,
  Package,
  Users,
  BookOpen,
  Megaphone,
  TrendingUp,
  LayoutTemplate,
  FileCode,
  User,
  Bot,
  Monitor,
  History,
  X,
  MoreHorizontal,
  Pencil,
  FolderInput,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type KnowledgeItem, mockKnowledge as initialMockKnowledge } from "@/lib/mock-data";
import { KnowledgeEditor, type KnowledgeFormData } from "@/components/brain/knowledge-editor";
import { KnowledgeDetail } from "@/components/brain/knowledge-detail";
import { FolderManager } from "@/components/brain/folder-manager";
import { VersionHistory } from "@/components/brain/version-history";
import { ProposedUpdates } from "@/components/brain/proposed-updates";
import { searchBrain, type SearchResult } from "@/lib/brain/actions";
import type { KnowledgeObject } from "@/types";

// ---------- Types ----------

interface FolderNode {
  id: string;
  label: string;
  icon: React.ElementType;
  children?: FolderNode[];
  count?: number;
}

// ---------- Initial folder tree ----------

const initialFolderTree: FolderNode[] = [
  {
    id: "context",
    label: "Context",
    icon: Building2,
    children: [
      { id: "context/company", label: "Company", icon: Building2, count: 3 },
      { id: "context/brand", label: "Brand", icon: Palette, count: 2 },
      { id: "context/product", label: "Product", icon: Package, count: 4 },
      { id: "context/customers", label: "Customers", icon: Users, count: 3 },
    ],
  },
  { id: "library", label: "Library", icon: BookOpen, count: 12 },
  {
    id: "organization",
    label: "Organization",
    icon: Users,
    children: [
      { id: "organization/marketing", label: "Marketing", icon: Megaphone, count: 8 },
      { id: "organization/sales", label: "Sales", icon: TrendingUp, count: 5 },
    ],
  },
  { id: "templates", label: "Templates", icon: LayoutTemplate, count: 6 },
  { id: "documentation", label: "Documentation", icon: FileCode, count: 4 },
];

const sourceConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  user: { label: "User", icon: User, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  agent: { label: "Agent", icon: Bot, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  system: { label: "System", icon: Monitor, color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
};

const typeColors: Record<string, string> = {
  company: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  brand: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  customer: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  product: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  strategy: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  reference: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  team: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  skill: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  agent: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

// ---------- Helpers ----------

/** Convert a KnowledgeItem (mock display model) to a KnowledgeObject (domain model) */
function itemToKnowledgeObject(item: KnowledgeItem): KnowledgeObject {
  return {
    id: item.id,
    workspace_id: "ws-mock",
    path: item.folder,
    title: item.title,
    type: item.type as KnowledgeObject["type"],
    content: item.content,
    source: item.source,
    created_at: item.updatedAt,
    updated_at: item.updatedAt,
  };
}

/** Convert a SearchResult to a KnowledgeItem for display */
function searchResultToItem(result: SearchResult): KnowledgeItem {
  return {
    id: result.id,
    title: result.title,
    type: result.type,
    folder: result.path,
    source: result.source,
    updatedAt: result.updated_at,
    snippet: result.snippet,
    content: result.content,
  };
}

/** Collect all folder IDs from a tree */
function collectFolderIds(nodes: FolderNode[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    ids.push(node.id);
    if (node.children) ids.push(...collectFolderIds(node.children));
  }
  return ids;
}

// ---------- Sub-components ----------

function FolderTreeItem({
  node,
  level = 0,
  selectedFolder,
  onSelect,
  onRename,
}: {
  node: FolderNode;
  level?: number;
  selectedFolder: string;
  onSelect: (id: string) => void;
  onRename: (id: string, currentLabel: string) => void;
}) {
  const [expanded, setExpanded] = useState(node.id === "context");
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedFolder === node.id;
  const Icon = node.icon;

  return (
    <div>
      <div className="group/folder flex items-center">
        <button
          onClick={() => {
            if (hasChildren) setExpanded(!expanded);
            onSelect(node.id);
          }}
          className={cn(
            "flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted",
            isSelected && "bg-muted font-medium text-foreground",
            !isSelected && "text-muted-foreground"
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground/60" />
            ) : (
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
            )
          ) : (
            <FileText className="size-3.5 shrink-0 text-muted-foreground/60" />
          )}
          <Icon className="size-4 shrink-0" />
          <span className="truncate">{node.label}</span>
          {node.count !== undefined && (
            <span className="ml-auto shrink-0 rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
              {node.count}
            </span>
          )}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger className="mr-1 rounded p-0.5 opacity-0 group-hover/folder:opacity-100 hover:bg-muted transition-all">
            <MoreHorizontal className="size-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={() => onRename(node.id, node.label)}>
              <Pencil className="mr-2 size-3.5" />
              Rename
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children!.map((child) => (
            <FolderTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              selectedFolder={selectedFolder}
              onSelect={onSelect}
              onRename={onRename}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function KnowledgeCard({
  item,
  onClick,
  onHistory,
  onMove,
}: {
  item: KnowledgeItem;
  onClick: () => void;
  onHistory: () => void;
  onMove: () => void;
}) {
  const src = sourceConfig[item.source];
  const SrcIcon = src.icon;
  const typeColor = typeColors[item.type] || typeColors.reference;

  return (
    <Card
      className="group/knowledge cursor-pointer transition-shadow hover:shadow-md hover:ring-foreground/20"
      onClick={onClick}
    >
      <div className="flex flex-col gap-3 px-4 pt-4 pb-4">
        {/* Top row: badges */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
              typeColor
            )}
          >
            {item.type}
          </span>
          <span
            className={cn(
              "ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              src.color
            )}
          >
            <SrcIcon className="size-3" />
            {src.label}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold leading-snug text-foreground group-hover/knowledge:text-primary transition-colors">
          {item.title}
        </h3>

        {/* Snippet */}
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {item.snippet}
        </p>

        {/* Footer */}
        <div className="flex items-center pt-1 text-[11px] text-muted-foreground/70">
          <span>Updated {item.updatedAt}</span>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMove();
              }}
              className="rounded p-1 text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
              title="Move to..."
            >
              <FolderInput className="size-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onHistory();
              }}
              className="rounded p-1 text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
              title="Version history"
            >
              <History className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ---------- Page ----------

export default function BrainPage() {
  // Local state for mock data management
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>(initialMockKnowledge);
  const [folderTree, setFolderTree] = useState<FolderNode[]>(initialFolderTree);

  // UI state
  const [selectedFolder, setSelectedFolder] = useState("context");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<KnowledgeItem[] | null>(null);
  const [isSearching, startSearchTransition] = useTransition();
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dialog/sheet state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingKnowledge, setEditingKnowledge] = useState<KnowledgeObject | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedKnowledge, setSelectedKnowledge] = useState<KnowledgeObject | null>(null);
  const [folderManagerOpen, setFolderManagerOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [versionHistoryObjectId, setVersionHistoryObjectId] = useState<string | null>(null);
  const [versionHistoryObjectTitle, setVersionHistoryObjectTitle] = useState("");

  // Rename folder dialog
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState("");
  const [renameFolderValue, setRenameFolderValue] = useState("");

  // Move-to dialog
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [moveTargetFolder, setMoveTargetFolder] = useState("");

  // Derived data
  const filteredKnowledge = useMemo(() => {
    // If we have search results, use those instead
    if (searchResults !== null) return searchResults;

    return knowledgeItems.filter((k) => {
      const matchesFolder =
        selectedFolder === "" ||
        k.folder === selectedFolder ||
        k.folder.startsWith(selectedFolder + "/");
      return matchesFolder;
    });
  }, [knowledgeItems, selectedFolder, searchResults]);

  const selectedLabel = useMemo(() => {
    if (searchResults !== null) return "Search Results";
    return (
      folderTree.find((f) => f.id === selectedFolder)?.label ||
      folderTree
        .flatMap((f) => f.children || [])
        .find((f) => f.id === selectedFolder)?.label ||
      "All"
    );
  }, [folderTree, selectedFolder, searchResults]);

  const existingFolderIds = useMemo(() => collectFolderIds(folderTree), [folderTree]);

  // ---------- Search ----------

  const executeSearch = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setSearchResults(null);
        return;
      }

      startSearchTransition(async () => {
        const result = await searchBrain("ws-mock", query);
        if (result.data) {
          setSearchResults(result.data.map(searchResultToItem));
        } else {
          // Fallback: local filter
          const lowerQuery = query.toLowerCase();
          const localResults = knowledgeItems.filter(
            (k) =>
              k.title.toLowerCase().includes(lowerQuery) ||
              k.content.toLowerCase().includes(lowerQuery)
          );
          setSearchResults(localResults);
        }
      });
    },
    [knowledgeItems]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);

      // Debounce: wait 400ms after user stops typing
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (!value.trim()) {
        setSearchResults(null);
        return;
      }

      searchTimeoutRef.current = setTimeout(() => {
        executeSearch(value);
      }, 400);
    },
    [executeSearch]
  );

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
        executeSearch(searchQuery);
      }
    },
    [searchQuery, executeSearch]
  );

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults(null);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  }, []);

  // ---------- Card Handlers ----------

  const handleCardClick = useCallback((item: KnowledgeItem) => {
    setSelectedKnowledge(itemToKnowledgeObject(item));
    setDetailOpen(true);
  }, []);

  const handleOpenVersionHistory = useCallback((item: KnowledgeItem) => {
    setVersionHistoryObjectId(item.id);
    setVersionHistoryObjectTitle(item.title);
    setVersionHistoryOpen(true);
  }, []);

  const handleAddKnowledge = useCallback(() => {
    setEditingKnowledge(null);
    setEditorOpen(true);
  }, []);

  const handleEditFromDetail = useCallback(() => {
    setDetailOpen(false);
    setEditingKnowledge(selectedKnowledge);
    setEditorOpen(true);
  }, [selectedKnowledge]);

  const handleDeleteFromDetail = useCallback(() => {
    if (!selectedKnowledge) return;
    setKnowledgeItems((prev) => prev.filter((k) => k.id !== selectedKnowledge.id));
    setDetailOpen(false);
    setSelectedKnowledge(null);
  }, [selectedKnowledge]);

  const handleSave = useCallback(
    (data: KnowledgeFormData) => {
      const now = "just now";
      if (editingKnowledge) {
        // Update existing
        setKnowledgeItems((prev) =>
          prev.map((k) =>
            k.id === editingKnowledge.id
              ? {
                  ...k,
                  title: data.title,
                  type: data.type,
                  folder: data.path,
                  source: data.source,
                  content: data.content,
                  snippet: data.content.replace(/[#*\[\]`]/g, "").slice(0, 160),
                  updatedAt: now,
                }
              : k
          )
        );
      } else {
        // Create new
        const newItem: KnowledgeItem = {
          id: `k-${Date.now()}`,
          title: data.title,
          type: data.type,
          folder: data.path,
          source: data.source,
          content: data.content,
          snippet: data.content.replace(/[#*\[\]`]/g, "").slice(0, 160),
          updatedAt: now,
        };
        setKnowledgeItems((prev) => [newItem, ...prev]);
      }
      setEditingKnowledge(null);
    },
    [editingKnowledge]
  );

  // ---------- Folder Handlers ----------

  const handleCreateFolder = useCallback(
    (path: string) => {
      const segments = path.split("/");
      const label = segments[segments.length - 1]
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      const newNode: FolderNode = {
        id: path,
        label,
        icon: Folder,
        count: 0,
      };

      if (segments.length === 1) {
        // Top-level folder
        setFolderTree((prev) => [...prev, newNode]);
      } else {
        // Nested folder: find parent and add child
        const parentId = segments.slice(0, -1).join("/");
        setFolderTree((prev) =>
          prev.map((node) => {
            if (node.id === parentId) {
              return {
                ...node,
                children: [...(node.children || []), newNode],
              };
            }
            return node;
          })
        );
      }
    },
    []
  );

  const handleOpenRename = useCallback((folderId: string, currentLabel: string) => {
    setRenamingFolderId(folderId);
    setRenameFolderValue(currentLabel);
    setRenameDialogOpen(true);
  }, []);

  const handleRenameFolder = useCallback(() => {
    const newLabel = renameFolderValue.trim();
    if (!newLabel) return;

    const updateNodes = (nodes: FolderNode[]): FolderNode[] =>
      nodes.map((node) => {
        if (node.id === renamingFolderId) {
          return { ...node, label: newLabel };
        }
        if (node.children) {
          return { ...node, children: updateNodes(node.children) };
        }
        return node;
      });

    setFolderTree((prev) => updateNodes(prev));
    setRenameDialogOpen(false);
  }, [renamingFolderId, renameFolderValue]);

  // ---------- Move-to Handlers ----------

  const handleOpenMoveDialog = useCallback((itemId: string) => {
    setMovingItemId(itemId);
    setMoveTargetFolder("");
    setMoveDialogOpen(true);
  }, []);

  const handleMoveItem = useCallback(() => {
    if (!movingItemId || !moveTargetFolder) return;

    setKnowledgeItems((prev) =>
      prev.map((k) =>
        k.id === movingItemId ? { ...k, folder: moveTargetFolder } : k
      )
    );
    setMoveDialogOpen(false);
    setMovingItemId(null);
  }, [movingItemId, moveTargetFolder]);

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-lg font-semibold text-foreground">Second Brain</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search knowledge..."
              className="w-64 pl-8 pr-8"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <Button onClick={handleAddKnowledge}>
            <Plus className="size-4" data-icon="inline-start" />
            Add Knowledge
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar folder tree */}
        <aside className="w-[250px] shrink-0 border-r bg-muted/30">
          <ScrollArea className="h-full">
            <div className="p-3">
              <div className="mb-2 flex items-center justify-between px-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Folders
                </p>
                <button
                  onClick={() => setFolderManagerOpen(true)}
                  className="rounded-md p-0.5 text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-colors"
                  title="New Folder"
                >
                  <FolderPlus className="size-3.5" />
                </button>
              </div>
              <nav className="flex flex-col gap-0.5">
                {folderTree.map((node) => (
                  <FolderTreeItem
                    key={node.id}
                    node={node}
                    selectedFolder={selectedFolder}
                    onSelect={(id) => {
                      setSelectedFolder(id);
                      clearSearch();
                    }}
                    onRename={handleOpenRename}
                  />
                ))}
              </nav>
            </div>
          </ScrollArea>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {/* Proposed Updates from agents */}
            {searchResults === null && (
              <div className="mb-6">
                <ProposedUpdates />
              </div>
            )}

            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {searchResults !== null ? (
                  <Search className="size-4 text-muted-foreground" />
                ) : (
                  <Folder className="size-4 text-muted-foreground" />
                )}
                <h2 className="text-sm font-medium text-foreground">{selectedLabel}</h2>
                <Badge variant="secondary" className="text-[11px]">
                  {filteredKnowledge.length} items
                </Badge>
                {isSearching && (
                  <div className="ml-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                )}
              </div>
              {searchResults !== null && (
                <Button variant="ghost" size="sm" onClick={clearSearch}>
                  <X className="mr-1.5 size-3.5" />
                  Clear search
                </Button>
              )}
            </div>

            {filteredKnowledge.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <FileText className="mb-3 size-10 opacity-40" />
                <p className="text-sm">
                  {searchResults !== null
                    ? "No results found"
                    : "No knowledge objects found"}
                </p>
                <p className="text-xs">
                  {searchResults !== null
                    ? "Try a different search term"
                    : "Try selecting a different folder or adjusting your search"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredKnowledge.map((item) => (
                  <KnowledgeCard
                    key={item.id}
                    item={item}
                    onClick={() => handleCardClick(item)}
                    onHistory={() => handleOpenVersionHistory(item)}
                    onMove={() => handleOpenMoveDialog(item.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Knowledge Editor (create / edit) */}
      <KnowledgeEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        knowledge={editingKnowledge}
        defaultPath={selectedFolder}
        onSave={handleSave}
      />

      {/* Knowledge Detail (slide-over) */}
      <KnowledgeDetail
        open={detailOpen}
        onOpenChange={setDetailOpen}
        knowledge={selectedKnowledge}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteFromDetail}
      />

      {/* Folder Manager */}
      <FolderManager
        open={folderManagerOpen}
        onOpenChange={setFolderManagerOpen}
        currentPath={selectedFolder}
        existingFolders={existingFolderIds}
        onCreateFolder={handleCreateFolder}
      />

      {/* Version History */}
      <VersionHistory
        open={versionHistoryOpen}
        onOpenChange={setVersionHistoryOpen}
        objectId={versionHistoryObjectId}
        objectTitle={versionHistoryObjectTitle}
      />

      {/* Rename Folder Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              Enter a new name for this folder.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rename-input">New Name</Label>
              <Input
                id="rename-input"
                value={renameFolderValue}
                onChange={(e) => setRenameFolderValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameFolder();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameFolder} disabled={!renameFolderValue.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move-to Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move to Folder</DialogTitle>
            <DialogDescription>
              Select the destination folder for this knowledge object.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="move-folder">Destination</Label>
              <Select value={moveTargetFolder} onValueChange={(v) => setMoveTargetFolder(v ?? "")}>
                <SelectTrigger id="move-folder">
                  <SelectValue placeholder="Select a folder..." />
                </SelectTrigger>
                <SelectContent>
                  {existingFolderIds.map((folderId) => (
                    <SelectItem key={folderId} value={folderId}>
                      {folderId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMoveItem} disabled={!moveTargetFolder}>
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
