"use client";

import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, LogOut, User, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/stores/auth-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CommandMenu } from "@/components/layout/command-menu";

function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return <span className="text-sm font-medium text-foreground">Home</span>;
  }

  return (
    <nav className="flex items-center gap-1 text-sm">
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const label = segment
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

        return (
          <span key={segment} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            )}
            <span
              className={cn(
                isLast
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {label}
            </span>
          </span>
        );
      })}
    </nav>
  );
}

function getUserInitials(name?: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Topbar() {
  const { user } = useAuth();
  const clear = useAuthStore((s) => s.clear);
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    clear();
    router.push("/login");
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background px-6">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center">
        <Breadcrumbs />
      </div>

      {/* Center: Search — opens command menu on click */}
      <div className="ml-auto flex w-full max-w-sm items-center">
        <button
          type="button"
          className="relative w-full"
          onClick={() => {
            document.dispatchEvent(
              new KeyboardEvent("keydown", {
                key: "k",
                metaKey: true,
                bubbles: true,
              })
            );
          }}
        >
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <div className="flex h-8 w-full items-center rounded-md border border-border bg-muted/40 pl-8 pr-16 text-sm text-muted-foreground/60">
            Search...
          </div>
          <kbd className="pointer-events-none absolute right-2 top-1/2 flex h-5 -translate-y-1/2 items-center gap-0.5 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">&#8984;</span>K
          </kbd>
        </button>
      </div>

      {/* Command Menu (Cmd+K) */}
      <CommandMenu />

      {/* Right: Notifications + User */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <button className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
        </button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center rounded-md p-1 transition-colors hover:bg-accent focus-visible:outline-none">
            <Avatar size="sm">
              <AvatarFallback className="text-[11px]">
                {getUserInitials(user?.full_name)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">
                {user?.full_name ?? "Account"}
              </span>
              {user?.email && (
                <span className="text-xs font-normal text-muted-foreground">
                  {user.email}
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
