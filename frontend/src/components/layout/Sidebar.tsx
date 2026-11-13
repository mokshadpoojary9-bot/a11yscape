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
    'group relative flex items-center gap-3 overflow-hidden rounded-lg px-3 py-2 text-[13px] transition-all duration-200 ease-refined',
    isActive
      ? 'bg-[linear-gradient(90deg,rgba(34,211,238,0.12),rgba(63,109,255,0.07)_55%,transparent)] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
      : 'text-ink-muted hover:bg-white/[0.035] hover:text-ink',
  )
}

function ServiceFooter() {
  const scanner = useScannerHealth()
  const analytics = useAnalyticsHealth()
  const scannerState = scanner.isPending ? 'checking' : scanner.isError ? 'offline' : 'online'
  const analyticsState = analytics.isPending ? 'checking' : analytics.isError ? 'offline' : 'online'
  const bothOnline = scannerState === 'online' && analyticsState === 'online'
  const anyChecking = scannerState === 'checking' || analyticsState === 'checking'

  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-midnight-950/45 p-3.5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-10 size-24 rounded-full bg-cyan/[0.06] blur-2xl"
      />
      <div className="relative flex items-center justify-between gap-3">
        <p className="eyebrow">Instrument link</p>
        <span
          className={cn(
            'size-1.5 rounded-full',
            bothOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]' : anyChecking ? 'bg-ink-faint' : 'bg-severity-critical',
          )}
          aria-hidden="true"
        />
      </div>
      <div className="relative mt-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-[11.5px] text-ink-muted">
            <StatusDot state={scannerState} />
            Scanner service
          </span>
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-ink-faint">
            {scannerState === 'online' ? 'ready' : scannerState}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-[11.5px] text-ink-muted">
            <StatusDot state={analyticsState} />
            R engine
          </span>
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-ink-faint">
            {analyticsState === 'online' ? 'ready' : analyticsState}
          </span>
        </div>
      </div>
    </div>
  )
}

function PhaseProgress() {
  return (
    <div className="rounded-xl border border-line bg-midnight-950/35 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">Mission pipeline</p>
        <span className="font-mono text-[10px] text-cyan-soft/80">1 / 8</span>
      </div>
      <div
        className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.055]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={8}
        aria-valuenow={1}
        aria-label="Research phases complete"
      >
        <div className="h-full w-[12.5%] rounded-full bg-gradient-to-r from-cyan to-electric shadow-[0_0_12px_rgba(34,211,238,0.55)]" />
      </div>
      <p className="mt-2 text-[10.5px] leading-4 text-ink-faint">Foundation complete · Scanner next</p>
    </div>
  )
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const content = (
    <div className="relative flex h-full flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(280px_180px_at_25%_0%,rgba(34,211,238,0.09),transparent_72%)]"
      />
      <div className="relative flex h-[68px] shrink-0 items-center justify-between px-5">
        <NavLink
          to="/"
          onClick={onClose}
          aria-label="A11YSCAPE overview"
          className="rounded-lg transition-opacity hover:opacity-90"
        >
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

      <nav className="relative flex-1 overflow-y-auto px-3 pb-4" aria-label="Main">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-2 px-3 text-[9.5px] font-medium uppercase tracking-[0.18em] text-ink-faint/70">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} onClick={onClose} className={navLinkClass}>
                    {({ isActive }) => (
                      <>
                        {isActive ? (
                          <>
                            <span className="absolute inset-y-1 left-0 w-px rounded-full bg-gradient-to-b from-cyan/10 via-cyan to-violet/30 shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-0 bg-[radial-gradient(180px_80px_at_0%_50%,rgba(34,211,238,0.06),transparent_75%)]"
                            />
                          </>
                        ) : null}
                        <item.icon
                          className={cn(
                            'relative size-4 shrink-0 transition-colors',
                            isActive
                              ? 'text-cyan-soft drop-shadow-[0_0_5px_rgba(34,211,238,0.35)]'
                              : 'text-ink-faint group-hover:text-ink-muted',
                          )}
                          aria-hidden="true"
                        />
                        <span className="relative min-w-0 flex-1 truncate leading-5">{item.label}</span>
                        {isActive ? (
                          <span className="relative size-1 rounded-full bg-cyan shadow-[0_0_7px_rgba(34,211,238,0.8)]" aria-hidden="true" />
                        ) : null}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="relative shrink-0 space-y-3 border-t border-line p-3">
        <NavLink to={settingsNav.to} onClick={onClose} className={navLinkClass}>
          {({ isActive }) => (
            <>
              <settingsNav.icon
                className={cn('size-4 shrink-0', isActive ? 'text-cyan-soft' : 'text-ink-faint')}
                aria-hidden="true"
              />
              <span>{settingsNav.label}</span>
            </>
          )}
        </NavLink>
        <ServiceFooter />
        <PhaseProgress />
        <p className="px-1 pb-1 font-mono text-[9.5px] leading-4 text-ink-faint/75">
          A11YSCAPE v0.1 · Research build
        </p>
      </div>
    </div>
  )

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[268px] border-r border-line bg-[linear-gradient(180deg,rgba(10,16,31,0.92),rgba(6,10,20,0.88))] backdrop-blur-2xl lg:block">
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan/15 to-transparent" />
        {content}
      </aside>

      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden',
          open ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!open}
      >
        <div
          className={cn(
            'absolute inset-0 bg-midnight-950/75 backdrop-blur-sm transition-opacity duration-300',
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
