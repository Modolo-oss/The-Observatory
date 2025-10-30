import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("p-6 rounded-lg border border-border bg-card space-y-3", className)}>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full rounded-lg" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  );
}

function MetricCardSkeleton() {
  return (
    <div className="p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm space-y-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm space-y-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-64 w-full rounded-lg" />
      <div className="flex gap-4 justify-center">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

export { Skeleton, CardSkeleton, TableSkeleton, MetricCardSkeleton, ChartSkeleton }
