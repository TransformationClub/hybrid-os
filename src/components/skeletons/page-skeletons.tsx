import { Skeleton } from "@/components/ui/skeleton";

// ---------------------------------------------------------------------------
// CardGridSkeleton -- 6 card placeholders in a 3-column grid
// Used for: Initiatives, Agents, Skills pages
// ---------------------------------------------------------------------------

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border bg-card p-5 space-y-4"
        >
          {/* Header: icon + title area */}
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          {/* Body lines */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
          {/* Footer: badges / avatars */}
          <div className="flex items-center gap-2 pt-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-12 rounded-full" />
            <div className="ml-auto flex -space-x-1">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ApprovalListSkeleton -- 4 approval card placeholders in a list
// Used for: Approvals page
// ---------------------------------------------------------------------------

export function ApprovalListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border bg-card p-4 flex items-start gap-4"
        >
          {/* Status dot */}
          <Skeleton className="mt-1 h-3 w-3 rounded-full shrink-0" />
          {/* Content */}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex items-center gap-3 pt-1">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          {/* Action buttons area */}
          <div className="flex gap-2 shrink-0">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KanbanSkeleton -- 4 column placeholders with 2-3 card skeletons each
// Used for: Kanban / board views
// ---------------------------------------------------------------------------

export function KanbanSkeleton({ columns = 4 }: { columns?: number }) {
  const cardsPerColumn = [3, 2, 2, 3];

  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: columns }).map((_, col) => (
        <div
          key={col}
          className="flex w-72 shrink-0 flex-col gap-3 rounded-xl border bg-muted/30 p-3"
        >
          {/* Column header */}
          <div className="flex items-center justify-between px-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-5 rounded" />
          </div>
          {/* Cards */}
          {Array.from({
            length: cardsPerColumn[col % cardsPerColumn.length],
          }).map((_, card) => (
            <div
              key={card}
              className="rounded-lg border bg-card p-3 space-y-2"
            >
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-3 w-2/3" />
              <div className="flex items-center gap-2 pt-1">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-5 rounded-full ml-auto" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DashboardSkeleton -- Home page layout: stat cards + approval list
// Used for: Command Center / Dashboard home
// ---------------------------------------------------------------------------

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8 p-6 pb-12 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border bg-card p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Approval queue skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
        <ApprovalListSkeleton count={3} />
      </div>

      {/* Two-column: activity + continue working */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* Activity feed */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
          <div className="rounded-xl border bg-card divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-3 w-12 shrink-0" />
              </div>
            ))}
          </div>
        </div>
        {/* Continue working */}
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-5 w-36" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border bg-card p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-12 rounded-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
