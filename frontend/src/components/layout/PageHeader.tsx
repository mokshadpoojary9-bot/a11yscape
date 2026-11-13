import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('relative animate-fade-up', className)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-5 top-0 h-16 w-px bg-gradient-to-b from-cyan/40 to-transparent sm:-left-7"
      />
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2.5">
            <span className="h-px w-6 bg-gradient-to-r from-cyan to-transparent" aria-hidden="true" />
            <p className="eyebrow text-cyan-soft/75">{eyebrow}</p>
          </div>
          <h1 className="mt-3 font-display text-[30px] font-semibold leading-[1.06] tracking-[-0.035em] text-ink sm:text-[38px]">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-[13.5px] leading-6 text-ink-muted sm:text-[14px]">
            {description}
          </p>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2.5 md:justify-end">{actions}</div>
        ) : null}
      </div>
      <div className="hairline mt-6 opacity-80" />
    </header>
  )
}
