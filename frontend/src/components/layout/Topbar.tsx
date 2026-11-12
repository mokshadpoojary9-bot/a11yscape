import { Menu } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { ServiceStatusChip } from '@/components/feedback/StatusPill'
import { allNavItems } from '@/lib/navigation'

interface TopbarProps {
  onOpenNav: () => void
}

export function Topbar({ onOpenNav }: TopbarProps) {
  const location = useLocation()
  const current =
    allNavItems.find((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
    ) ?? allNavItems[0]

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-midnight-950/75 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onOpenNav}
        className="flex size-9 items-center justify-center rounded-lg border border-line text-ink-muted transition-colors hover:border-line-strong hover:text-ink lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-4" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[12px] text-ink-faint">
          <Link to="/" className="hidden transition-colors hover:text-ink-muted sm:inline">
            Observatory
          </Link>
          <span className="hidden text-ink-faint/50 sm:inline" aria-hidden="true">
            /
          </span>
          <span className="truncate text-ink-muted">{current.label}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ServiceStatusChip service="scanner" className="hidden md:inline-flex" />
        <ServiceStatusChip service="analytics" className="hidden md:inline-flex" />
        <span className="hidden h-6 w-px bg-line-strong md:block" aria-hidden="true" />
        <span className="rounded-md border border-violet/20 bg-violet-dim px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-violet-soft">
          Phase 1
        </span>
      </div>
    </header>
  )
}
