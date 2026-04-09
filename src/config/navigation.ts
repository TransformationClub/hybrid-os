import {
  Home,
  Rocket,
  Brain,
  Bot,
  Zap,
  Settings,
  BarChart3,
  ShieldCheck,
  Users2,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export const mainNavItems: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Collaborate", href: "/collaborate", icon: Users2 },
  { label: "Approvals", href: "/approvals", icon: ShieldCheck },
  { label: "Initiatives", href: "/initiatives", icon: Rocket },
  { label: "Second Brain", href: "/brain", icon: Brain },
  { label: "Agents", href: "/agents", icon: Bot },
  { label: "Skills", href: "/skills", icon: Zap },
  { label: "Reports", href: "/reports", icon: BarChart3 },
];

export const bottomNavItems: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
];
