import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function PanelSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('panel space-y-4 p-5', className)} aria-busy="true" aria-live="polite">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-6 w-16 rounded-md" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-3.5" />
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  )
}

export function StatSkeleton() {
  return (
    <div className="panel space-y-3 p-5" aria-hidden="true">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-20" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="panel overflow-hidden" aria-busy="true" aria-live="polite">
      <div className="border-b border-line px-5 py-3.5">
        <Skeleton className="h-3.5 w-40" />
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-5 py-3.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="ml-auto h-3.5 w-16" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading records</span>
    </div>
  )
}
