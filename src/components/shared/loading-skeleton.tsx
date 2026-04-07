import { cn } from "@/lib/utils"

function SkeletonBar({
  className,
}: {
  className?: string
}) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
    />
  )
}

function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10",
        className
      )}
    >
      <div className="flex flex-col gap-2">
        <SkeletonBar className="h-4 w-3/5" />
        <SkeletonBar className="h-3 w-4/5" />
      </div>
      <div className="flex flex-col gap-2">
        <SkeletonBar className="h-3 w-full" />
        <SkeletonBar className="h-3 w-2/3" />
      </div>
      <div className="flex items-center gap-2 border-t pt-4">
        <SkeletonBar className="h-3 w-20" />
        <SkeletonBar className="h-3 w-16" />
      </div>
    </div>
  )
}

function TableRowSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 border-b px-4 py-3",
        className
      )}
    >
      <SkeletonBar className="h-3 w-1/4" />
      <SkeletonBar className="h-3 w-1/3" />
      <SkeletonBar className="h-3 w-1/6" />
      <SkeletonBar className="h-5 w-16 rounded-full" />
    </div>
  )
}

function PageSkeleton({
  count = 6,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <SkeletonBar className="h-7 w-48" />
          <SkeletonBar className="h-4 w-72" />
        </div>
        <SkeletonBar className="h-8 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

function ChatSkeleton({
  count = 4,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-4 p-4", className)}>
      {Array.from({ length: count }).map((_, i) => {
        const isUser = i % 2 === 0
        return (
          <div
            key={i}
            className={cn(
              "flex flex-col gap-1.5",
              isUser ? "items-end" : "items-start"
            )}
          >
            <SkeletonBar className="h-3 w-16" />
            <div
              className={cn(
                "flex flex-col gap-1.5 rounded-xl p-3",
                isUser
                  ? "bg-primary/10 items-end"
                  : "bg-muted items-start"
              )}
            >
              <SkeletonBar
                className={cn(
                  "h-3",
                  isUser ? "w-40" : "w-56"
                )}
              />
              <SkeletonBar
                className={cn(
                  "h-3",
                  isUser ? "w-24" : "w-44"
                )}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function KanbanSkeleton({
  columns = 3,
  count = 3,
  className,
}: {
  columns?: number
  count?: number
  className?: string
}) {
  return (
    <div className={cn("flex gap-4 overflow-x-auto", className)}>
      {Array.from({ length: columns }).map((_, colIndex) => (
        <div
          key={colIndex}
          className="flex w-72 shrink-0 flex-col gap-3 rounded-xl bg-muted/30 p-3"
        >
          <div className="flex items-center gap-2 px-1">
            <SkeletonBar className="h-4 w-24" />
            <SkeletonBar className="h-4 w-6 rounded-full" />
          </div>
          <div className="flex flex-col gap-2">
            {Array.from({ length: count }).map((_, cardIndex) => (
              <div
                key={cardIndex}
                className="flex flex-col gap-2 rounded-lg bg-card p-3 ring-1 ring-foreground/10"
              >
                <SkeletonBar className="h-3 w-4/5" />
                <SkeletonBar className="h-3 w-3/5" />
                <div className="flex items-center gap-2 pt-1">
                  <SkeletonBar className="h-5 w-14 rounded-full" />
                  <SkeletonBar className="h-5 w-5 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export {
  SkeletonBar,
  CardSkeleton,
  TableRowSkeleton,
  PageSkeleton,
  ChatSkeleton,
  KanbanSkeleton,
}
