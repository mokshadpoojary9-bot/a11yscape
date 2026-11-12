import { NavLink } from 'react-router-dom'
import { X } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { StatusDot } from '@/components/feedback/StatusPill'
import { useAnalyticsHealth, useScannerHealth } from '@/services/queries'
import { navGroups, settingsNav } from '@/lib/navigation'
import { cn } from '@/lib/utils'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    'group relative flex items-start gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-all duration-200 ease-refined',
    isActive
      ? 'bg-cyan/[0.075] text-ink'
      : 'text-ink-muted hover:bg-white/[0.035] hover:text-ink',
  )
}

function ServiceFooter() {
  const scanner = useScannerHealth()
  const analytics = useAnalyticsHealth()
  const scannerState = scanner.isPending ? 'checking' : scanner.isError ? 'offline' : 'online'
  const analyticsState = analytics.isPending ? 'checking' : analytics.isError ? 'offline' : 'online'

  return (
    <div className="rounded-xl border border-line bg-midnight-900/50 p-3.5">
      <p className="eyebrow mb-2.5">Instrument link</p>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-[12px] text-ink-muted">
            <StatusDot state={scannerState} />
            Scanner service
          </span>
          <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
            {scannerState === 'online' ? 'ready' : scannerState}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-[12px] text-ink-muted">
            <StatusDot state={analyticsState} />
            R engine
          </span>
          <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
            {analyticsState === 'online' ? 'ready' : analyticsState}
          </span>
        </div>
      </div>
    </div>
  )
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const content = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between px-5">
        <NavLink to="/" onClick={onClose} aria-label="A11YSCAPE overview">
          <Logo size={34} />
        </NavLink>
        <button
          type="button"
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-white/[0.05] hover:text-ink lg:hidden"
          aria-label="Close navigation"
        >
          <X className="size-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Main">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.16em] text-ink-faint/80">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} onClick={onClose} className={navLinkClass}>
                    {({ isActive }) => (
                      <>
                        {isActive ? (
                          <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-cyan" />
                        ) : null}
                        <item.icon
                          className={cn(
                            'mt-0.5 size-4 shrink-0 transition-colors',
                            isActive ? 'text-cyan' : 'text-ink-faint group-hover:text-ink-muted',
                          )}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1 leading-5">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 space-y-3 border-t border-line p-3">
        <NavLink to={settingsNav.to} onClick={onClose} className={navLinkClass}>
          {({ isActive }) => (
            <>
              <settingsNav.icon
                className={cn('mt-0.5 size-4 shrink-0', isActive ? 'text-cyan' : 'text-ink-faint')}
                aria-hidden="true"
              />
              <span>{settingsNav.label}</span>
            </>
          )}
        </NavLink>
        <ServiceFooter />
        <p className="px-1 font-mono text-[10px] leading-4 text-ink-faint/80">
          A11YSCAPE v0.1 — Phase 1
          <br />
          Research build · local services
        </p>
      </div>
    </div>
  )

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[268px] border-r border-line bg-midnight-900/60 backdrop-blur-xl lg:block">
        {content}
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden',
          open ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!open}
      >
        <div
          className={cn(
            'absolute inset-0 bg-midnight-950/70 backdrop-blur-sm transition-opacity duration-300',
            open ? 'opacity-100' : 'opacity-0',
          )}
          onClick={onClose}
        />
        <aside
          className={cn(
            'absolute inset-y-0 left-0 w-[290px] border-r border-line-strong bg-midnight-900 shadow-2xl transition-transform duration-300 ease-refined',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
          aria-label="Navigation drawer"
        >
          {content}
        </aside>
      </div>
    </>
  )
}
