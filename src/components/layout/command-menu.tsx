"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  Rocket,
  Brain,
  Bot,
  Zap,
  Settings,
  BarChart3,
  ShieldCheck,
  Plus,
  Clock,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

const navigationItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Approvals", href: "/approvals", icon: ShieldCheck },
  { label: "Initiatives", href: "/initiatives", icon: Rocket },
  { label: "Second Brain", href: "/brain", icon: Brain },
  { label: "Agents", href: "/agents", icon: Bot },
  { label: "Skills", href: "/skills", icon: Zap },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

const quickActions = [
  { label: "Create Initiative", href: "/initiatives/new", icon: Plus },
  { label: "Create Agent", href: "/agents/new", icon: Plus },
  { label: "Create Skill", href: "/skills/new", icon: Plus },
];

const recentPages = [
  { label: "Home", href: "/", icon: Clock },
  { label: "Initiatives", href: "/initiatives", icon: Clock },
  { label: "Agents", href: "/agents", icon: Clock },
];

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Navigation">
            {navigationItems.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => handleSelect(item.href)}
              >
                <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Quick Actions">
            {quickActions.map((item) => (
              <CommandItem
                key={item.label}
                onSelect={() => handleSelect(item.href)}
              >
                <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Recent">
            {recentPages.map((item) => (
              <CommandItem
                key={`recent-${item.href}`}
                onSelect={() => handleSelect(item.href)}
              >
                <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
