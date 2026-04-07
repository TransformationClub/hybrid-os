import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

type StatusColor = "green" | "gray" | "yellow" | "red" | "blue"

const STATUS_COLOR_MAP: Record<string, StatusColor> = {
  // Green statuses
  active: "green",
  running: "green",
  completed: "green",
  approved: "green",
  success: "green",
  published: "green",
  live: "green",

  // Gray statuses
  draft: "gray",
  idle: "gray",
  archived: "gray",
  inactive: "gray",
  closed: "gray",

  // Yellow statuses
  pending: "yellow",
  queued: "yellow",
  waiting: "yellow",
  scheduled: "yellow",

  // Red statuses
  paused: "red",
  blocked: "red",
  rejected: "red",
  failed: "red",
  error: "red",
  cancelled: "red",

  // Blue statuses
  planning: "blue",
  review: "blue",
  in_progress: "blue",
  in_review: "blue",
  open: "blue",
  processing: "blue",
}

const colorStyles: Record<StatusColor, { dot: string; badge: string }> = {
  green: {
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  },
  gray: {
    dot: "bg-muted-foreground",
    badge:
      "bg-muted text-muted-foreground",
  },
  yellow: {
    dot: "bg-amber-500",
    badge:
      "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  },
  red: {
    dot: "bg-red-500",
    badge:
      "bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  },
  blue: {
    dot: "bg-blue-500",
    badge:
      "bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  },
}

interface StatusBadgeProps {
  status: string
  size?: "sm" | "default"
  className?: string
}

function StatusBadge({ status, size = "default", className }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase().replace(/[\s-]/g, "_")
  const color = STATUS_COLOR_MAP[normalizedStatus] ?? "gray"
  const styles = colorStyles[color]

  const label = status
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <Badge
      className={cn(
        "gap-1.5 border-transparent font-medium",
        styles.badge,
        size === "sm" && "h-4 px-1.5 text-[0.65rem]",
        className
      )}
    >
      <span
        className={cn(
          "shrink-0 rounded-full",
          styles.dot,
          size === "sm" ? "size-1.5" : "size-2"
        )}
      />
      {label}
    </Badge>
  )
}

export { StatusBadge, STATUS_COLOR_MAP }
export type { StatusBadgeProps, StatusColor }
