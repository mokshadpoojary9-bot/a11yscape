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
    <header className={cn('animate-fade-up', className)}>
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl space-y-2.5">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="text-[26px] font-semibold leading-tight text-ink sm:text-[30px]">{title}</h1>
          <p className="max-w-2xl text-[14px] leading-6 text-ink-muted">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
      </div>
      <div className="hairline mt-7" />
    </header>
  )
}
