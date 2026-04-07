"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, Check, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import type { Workspace } from "@/types";
import {
  getWorkspaces,
  getCurrentWorkspace,
  switchWorkspace,
} from "@/lib/workspace/actions";

function getWorkspaceInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

export function WorkspaceSwitcher() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [current, setCurrent] = useState<Workspace | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function load() {
      const [wsResult, currentResult] = await Promise.all([
        getWorkspaces(),
        getCurrentWorkspace(),
      ]);
      if (wsResult.data) setWorkspaces(wsResult.data);
      if (currentResult.data) setCurrent(currentResult.data);
    }
    load();
  }, []);

  function handleSwitch(workspace: Workspace) {
    if (workspace.id === current?.id) return;
    startTransition(async () => {
      const result = await switchWorkspace(workspace.id);
      if (result.data) {
        setCurrent(workspace);
        router.refresh();
      }
    });
  }

  if (!current) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-accent/50">
        <span className="text-[10px] text-sidebar-foreground/50">...</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-foreground transition-colors hover:bg-sidebar-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Switch workspace"
          />
        }
      >
        <span className="text-xs font-semibold leading-none">
          {getWorkspaceInitial(current.name)}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" sideOffset={8} align="start" className="w-56">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {workspaces.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onSelect={() => handleSwitch(ws)}
            className="flex items-center gap-2"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-semibold">
              {getWorkspaceInitial(ws.name)}
            </span>
            <span className="flex-1 truncate text-sm">{ws.name}</span>
            {ws.id === current.id && (
              <Check className="h-4 w-4 shrink-0 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex items-center gap-2 text-muted-foreground">
          <Plus className="h-4 w-4" />
          <span className="text-sm">Create Workspace</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
