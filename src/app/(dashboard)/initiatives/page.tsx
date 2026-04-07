"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, MoreHorizontal, Archive, Trash2 } from "lucide-react";
import { CardGridSkeleton } from "@/components/skeletons/page-skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CreateInitiativeDialog,
  type InitiativeFormData,
} from "@/components/initiatives/create-initiative-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
} from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { Initiative, InitiativeType, InitiativeStatus } from "@/types";
import { type InitiativeCardData, mockInitiativeCards } from "@/lib/mock-data";
import {
  getInitiatives,
  createInitiative,
  archiveInitiative,
  deleteInitiative,
} from "@/lib/initiatives/actions";

// ---------------------------------------------------------------------------
// Transform server data to display shape
// ---------------------------------------------------------------------------

function initiativeToCard(init: Initiative): InitiativeCardData {
  return {
    id: init.id,
    title: init.title,
    type: init.type,
    status: init.status,
    goal: init.goal ?? "",
    progress: init.status === "completed" ? 100 : init.status === "draft" ? 0 : 25,
    lastActivity: formatRelativeTime(init.updated_at),
    agents: [{ initials: "CO", color: "bg-indigo-500 text-white" }],
  };
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
}

/** Map form type (underscores) to DB type (hyphens) */
function mapFormType(formType: string): InitiativeType {
  const mapping: Record<string, InitiativeType> = {
    aeo_campaign: "aeo-campaign",
    abm_campaign: "abm-campaign",
    custom: "custom",
  };
  return mapping[formType] ?? "custom";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const typeLabel: Record<InitiativeType, string> = {
  "aeo-campaign": "AEO",
  "abm-campaign": "ABM",
  custom: "Custom",
};

const statusConfig: Record<
  InitiativeStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-muted text-muted-foreground",
  },
  planning: {
    label: "Planning",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  active: {
    label: "Active",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  paused: {
    label: "Paused",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  },
  completed: {
    label: "Completed",
    className: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
  },
  archived: {
    label: "Archived",
    className: "bg-muted text-muted-foreground",
  },
};

function filterByTab(tab: string, items: InitiativeCardData[]) {
  if (tab === "all") return items;
  if (tab === "active") return items.filter((i) => i.status === "active" || i.status === "planning");
  if (tab === "draft") return items.filter((i) => i.status === "draft");
  if (tab === "completed") return items.filter((i) => i.status === "completed");
  return items;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function InitiativeCardDataItem({
  item,
  onArchive,
  onDelete,
}: {
  item: InitiativeCardData;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const sc = statusConfig[item.status];

  return (
    <div className="group/link relative">
      <Link href={`/initiatives/${item.id}`}>
        <Card className="transition-shadow hover:ring-2 hover:ring-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-semibold">
                {typeLabel[item.type]}
              </Badge>
              <span
                className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium ${sc.className}`}
              >
                {sc.label}
              </span>
            </div>
            <CardTitle className="mt-1.5 line-clamp-1 group-hover/link:text-primary transition-colors">
              {item.title}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <p className="line-clamp-2 text-sm text-muted-foreground leading-relaxed">
              {item.goal}
            </p>
            <Progress value={item.progress}>
              <ProgressLabel className="text-xs text-muted-foreground">
                Progress
              </ProgressLabel>
              <ProgressValue className="text-xs" />
            </Progress>
          </CardContent>

          <CardFooter className="flex items-center justify-between">
            <AvatarGroup>
              {item.agents.map((a) => (
                <Avatar key={a.initials} size="sm">
                  <AvatarFallback className={`text-[9px] font-semibold ${a.color}`}>
                    {a.initials}
                  </AvatarFallback>
                </Avatar>
              ))}
            </AvatarGroup>
            <span className="text-xs text-muted-foreground">{item.lastActivity}</span>
          </CardFooter>
        </Card>
      </Link>

      {/* Actions dropdown */}
      <div className="absolute top-3 right-3 opacity-0 group-hover/link:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex size-7 items-center justify-center rounded-md bg-background/80 backdrop-blur hover:bg-muted"
            onClick={(e) => e.preventDefault()}
          >
            <MoreHorizontal className="size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                onArchive(item.id);
              }}
            >
              <Archive className="size-4" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                if (window.confirm("Are you sure you want to permanently delete this initiative? This cannot be undone.")) {
                  onDelete(item.id);
                }
              }}
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default function InitiativesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [initiatives, setInitiatives] = useState<InitiativeCardData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInitiatives = useCallback(async () => {
    try {
      const result = await getInitiatives("default");
      if (result.data && result.data.length > 0) {
        setInitiatives(result.data.map(initiativeToCard));
      } else {
        setInitiatives(mockInitiativeCards);
      }
    } catch {
      setInitiatives(mockInitiativeCards);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitiatives();
  }, [fetchInitiatives]);

  async function handleCreate(data: InitiativeFormData) {
    const result = await createInitiative({
      workspaceId: "default",
      name: data.name,
      type: mapFormType(data.type),
      goal: data.goal,
      brief: data.brief || undefined,
      successCriteria: data.successCriteria || undefined,
    });
    if (result.data) {
      await fetchInitiatives();
    }
  }

  const handleArchive = useCallback(async (id: string) => {
    const result = await archiveInitiative(id);
    if (result.data) {
      setInitiatives((prev) => prev.filter((i) => i.id !== id));
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const result = await deleteInitiative(id);
    if (result.data) {
      setInitiatives((prev) => prev.filter((i) => i.id !== id));
    }
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Initiatives</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Plan and execute campaigns with your hybrid team.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" data-icon="inline-start" />
          Create Initiative
        </Button>
      </div>

      <CreateInitiativeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />

      {/* Filter bar + grid */}
      <Tabs defaultValue="all">
        <div className="flex items-center justify-between gap-4">
          <TabsList variant="line">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search initiatives..." className="pl-8" />
          </div>
        </div>

        {["all", "active", "draft", "completed"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            {loading ? (
              <CardGridSkeleton />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
                {filterByTab(tab, initiatives).map((item) => (
                  <InitiativeCardDataItem key={item.id} item={item} onArchive={handleArchive} onDelete={handleDelete} />
                ))}
                {filterByTab(tab, initiatives).length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <p className="text-sm">No initiatives found in this view.</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
