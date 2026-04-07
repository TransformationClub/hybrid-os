"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNavItems, bottomNavItems, type NavItem } from "@/config/navigation";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";

function NavIcon({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={item.href}
            className={cn(
              "group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          />
        }
      >
        <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 1.75} />
        {item.badge && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {item.badge}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={12}>
        {item.label}
      </TooltipContent>
    </Tooltip>
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

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside className="flex h-full w-16 flex-col items-center border-r border-sidebar-border bg-sidebar py-3">
      {/* Workspace switcher */}
      <WorkspaceSwitcher />

      {/* Divider */}
      <div className="mx-auto my-2 h-px w-8 bg-sidebar-border" />

      {/* Main nav */}
      <nav className="flex flex-1 flex-col items-center gap-1">
        {mainNavItems.map((item) => (
          <NavIcon key={item.href} item={item} isActive={isActive(item.href)} />
        ))}
      </nav>

      {/* Bottom section */}
      <div className="flex flex-col items-center gap-1">
        {/* Divider */}
        <div className="mx-auto mb-1 h-px w-8 bg-sidebar-border" />

        {bottomNavItems.map((item) => (
          <NavIcon key={item.href} item={item} isActive={isActive(item.href)} />
        ))}

        {/* User avatar */}
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                href="/profile"
                className="mt-1 flex items-center justify-center rounded-lg p-1 transition-colors hover:bg-sidebar-accent/50"
              />
            }
          >
            <Avatar size="sm">
              <AvatarFallback className="bg-sidebar-accent text-[11px] text-sidebar-foreground">
                {getUserInitials(user?.full_name)}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12}>
            Profile
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
