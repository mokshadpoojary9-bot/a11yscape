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
  cyan: 'border-cyan/20 bg-cyan-dim text-cyan-soft shadow-[0_0_26px_-14px_rgba(34,211,238,0.65)]',
  violet:
    'border-violet/20 bg-violet-dim text-violet-soft shadow-[0_0_26px_-14px_rgba(139,124,246,0.65)]',
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
    <div className={cn('panel panel-hover group relative overflow-hidden p-5', className)}>
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -right-10 -top-12 size-32 rounded-full blur-2xl transition-opacity duration-500 group-hover:opacity-100',
          tone === 'cyan' && 'bg-cyan/[0.07]',
          tone === 'violet' && 'bg-violet/[0.08]',
          tone === 'neutral' && 'bg-white/[0.025]',
        )}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="eyebrow truncate">{label}</p>
          {loading ? (
            <Skeleton className="mt-3.5 h-8 w-24" />
          ) : (
            <div className="mt-3 flex min-h-8 items-baseline gap-2">
              <p className="num text-[27px] font-medium leading-none tracking-[-0.045em] text-ink sm:text-[29px]">
                {value}
              </p>
            </div>
          )}
          {hint ? (
            <p className="mt-2.5 line-clamp-2 text-[11.5px] leading-5 text-ink-faint">{hint}</p>
          ) : null}
        </div>
        {Icon ? (
          <span
            className={cn(
              'relative flex size-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 group-hover:scale-[1.04]',
              toneStyles[tone],
            )}
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.07] to-transparent"
            />
            <Icon className="relative size-[17px]" aria-hidden="true" />
          </span>
        ) : null}
      </div>
    </div>
  )
}
