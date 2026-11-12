import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
  footnote?: string
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  footnote,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-midnight-900/40 px-6 py-14 text-center',
        className,
      )}
    >
      <div className="relative mb-5 flex size-12 items-center justify-center rounded-xl border border-line-strong bg-surface-overlay/80">
        <Icon className="size-5 text-cyan/80" aria-hidden="true" />
        <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/[0.02]" />
      </div>
      <h3 className="text-[15px] font-medium text-ink">{title}</h3>
      <p className="mt-2 max-w-md text-[13.5px] leading-6 text-ink-muted">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
      {footnote ? (
        <p className="mt-6 max-w-md font-mono text-[11px] leading-5 text-ink-faint">{footnote}</p>
      ) : null}
    </div>
  )
}
