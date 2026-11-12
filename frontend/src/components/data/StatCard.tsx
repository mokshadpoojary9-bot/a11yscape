import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: ReactNode
  hint?: string
  icon?: LucideIcon
  loading?: boolean
  tone?: 'cyan' | 'violet' | 'neutral'
  className?: string
}

const toneStyles = {
  cyan: 'border-cyan/20 bg-cyan-dim text-cyan-soft',
  violet: 'border-violet/20 bg-violet-dim text-violet-soft',
  neutral: 'border-line-strong bg-white/[0.03] text-ink-muted',
} as const

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  loading = false,
  tone = 'neutral',
  className,
}: StatCardProps) {
  return (
    <div className={cn('panel panel-hover group p-5', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow truncate">{label}</p>
          {loading ? (
            <Skeleton className="mt-3 h-7 w-20" />
          ) : (
            <p className="num mt-2.5 text-[24px] font-medium leading-none tracking-tight text-ink">
              {value}
            </p>
          )}
          {hint ? <p className="mt-2.5 text-[12.5px] leading-5 text-ink-faint">{hint}</p> : null}
        </div>
        {Icon ? (
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors duration-300',
              toneStyles[tone],
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </span>
        ) : null}
      </div>
    </div>
  )
}
