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
        'panel relative flex flex-col items-center justify-center overflow-hidden px-6 py-14 text-center sm:py-16',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(460px_240px_at_50%_20%,rgba(34,211,238,0.065),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-grid-fade opacity-[0.22] [background-size:38px_38px] [mask-image:radial-gradient(circle_at_50%_38%,black,transparent_62%)]"
      />

      <div className="relative mb-6 flex size-[74px] items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-line/70" aria-hidden="true" />
        <span
          className="absolute inset-[9px] rounded-full border border-dashed border-line-strong/80 animate-scan-slow"
          aria-hidden="true"
        />
        <span
          className="absolute inset-[20px] rounded-full border border-cyan/15 bg-cyan/[0.025]"
          aria-hidden="true"
        />
        <span
          className="absolute inset-0 rounded-full border border-cyan/20 animate-pulse-ring"
          aria-hidden="true"
        />
        <span className="relative flex size-9 items-center justify-center rounded-xl border border-cyan/25 bg-[linear-gradient(135deg,rgba(34,211,238,0.14),rgba(63,109,255,0.07))] shadow-[0_0_28px_-10px_rgba(34,211,238,0.55)]">
          <Icon className="size-4 text-cyan-soft" aria-hidden="true" />
        </span>
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-0 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan shadow-[0_0_8px_rgba(34,211,238,0.8)]"
        />
      </div>

      <h3 className="relative font-display text-[16px] font-medium tracking-[-0.02em] text-ink">
        {title}
      </h3>
      <p className="relative mt-2 max-w-lg text-[13px] leading-6 text-ink-muted">{description}</p>
      {action ? <div className="relative mt-6">{action}</div> : null}
      {footnote ? (
        <p className="relative mt-6 max-w-md font-mono text-[10px] leading-5 tracking-[0.02em] text-ink-faint">
          {footnote}
        </p>
      ) : null}
    </div>
  )
}
