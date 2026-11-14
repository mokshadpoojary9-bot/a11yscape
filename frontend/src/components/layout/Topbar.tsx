import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  Command,
  Menu,
  Search,
  SlidersHorizontal,
  WifiOff,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogoMark } from '@/components/brand/Logo'
import { ServiceStatusChip } from '@/components/feedback/StatusPill'
import { allNavItems } from '@/lib/navigation'
import { useAnalyticsHealth, useScannerHealth } from '@/services/queries'
import { cn } from '@/lib/utils'

interface TopbarProps {
  onOpenNav: () => void
}

type OpenPanel = 'search' | 'notifications' | 'profile' | null

export function Topbar({ onOpenNav }: TopbarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const scanner = useScannerHealth()
  const analytics = useAnalyticsHealth()
  const inputRef = useRef<HTMLInputElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const [panel, setPanel] = useState<OpenPanel>(null)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const current =
    allNavItems.find((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
    ) ?? allNavItems[0]

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return allNavItems
    return allNavItems.filter((item) =>
      `${item.label} ${item.description}`.toLowerCase().includes(needle),
    )
  }, [query])

  const scannerOffline = !scanner.isPending && scanner.isError
  const analyticsOffline = !analytics.isPending && analytics.isError
  const offlineCount = Number(scannerOffline) + Number(analyticsOffline)
  const checking = scanner.isPending || analytics.isPending

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setQuery('')
        setActiveIndex(0)
        setPanel((currentPanel) => (currentPanel === 'search' ? null : 'search'))
      }
      if (event.key === 'Escape') setPanel(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (panel !== 'search' && panel !== 'notifications' && panel !== 'profile') return
    const onPointerDown = (event: PointerEvent) => {
      if (!actionsRef.current?.contains(event.target as Node)) setPanel(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [panel])

  useEffect(() => {
    if (panel === 'search') {
      setQuery('')
      setActiveIndex(0)
      const timer = window.setTimeout(() => inputRef.current?.focus(), 30)
      return () => window.clearTimeout(timer)
    }
  }, [panel])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  function closeAndNavigate(to: string) {
    setPanel(null)
    navigate(to)
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(filteredItems.length - 1, index + 1))
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(0, index - 1))
    }
    if (event.key === 'Enter' && filteredItems[activeIndex]) {
      event.preventDefault()
      closeAndNavigate(filteredItems[activeIndex].to)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-[68px] items-center gap-3 border-b border-line bg-midnight-950/70 px-3 backdrop-blur-2xl sm:px-5 lg:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/35 to-transparent"
        />

        <button
          type="button"
          onClick={onOpenNav}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line text-ink-muted transition-all duration-200 hover:border-cyan/30 hover:bg-white/[0.04] hover:text-ink lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-4" />
        </button>

        <Link
          to="/"
          className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-85 lg:hidden"
          aria-label="A11YSCAPE overview"
        >
          <LogoMark size={30} />
          <span className="hidden font-display text-[12px] font-semibold tracking-[0.16em] text-ink sm:inline">
            A11YSCAPE
          </span>
        </Link>

        <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
          <Link
            to="/"
            className="text-[11.5px] uppercase tracking-[0.1em] text-ink-faint transition-colors hover:text-ink-muted"
          >
            Observatory
          </Link>
          <span className="text-ink-faint/40" aria-hidden="true">
            /
          </span>
          <span className="truncate text-[12.5px] font-medium text-ink-muted">{current.label}</span>
        </nav>
        <div className="min-w-0 flex-1 md:hidden" />

        <div ref={actionsRef} className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="hidden items-center gap-2 xl:flex">
            <ServiceStatusChip service="scanner" />
            <ServiceStatusChip service="analytics" />
          </div>

          <button
            type="button"
            onClick={() => setPanel((currentPanel) => (currentPanel === 'search' ? null : 'search'))}
            className="group flex h-9 items-center gap-2 rounded-lg border border-line bg-white/[0.02] px-2.5 text-ink-muted transition-all duration-200 hover:border-cyan/25 hover:bg-white/[0.04] hover:text-ink sm:min-w-[164px] xl:min-w-[188px]"
            aria-label="Search pages and instruments"
            aria-haspopup="dialog"
            aria-expanded={panel === 'search'}
          >
            <Search className="size-3.5 shrink-0 text-ink-faint transition-colors group-hover:text-cyan-soft" aria-hidden="true" />
            <span className="hidden flex-1 text-left text-[12px] sm:inline">Search</span>
            <kbd className="hidden items-center gap-0.5 rounded border border-line bg-midnight-950/60 px-1.5 py-0.5 font-mono text-[9.5px] text-ink-faint lg:inline-flex">
              <Command className="size-2.5" aria-hidden="true" />K
            </kbd>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setPanel((currentPanel) =>
                  currentPanel === 'notifications' ? null : 'notifications',
                )
              }
              className="relative flex size-9 items-center justify-center rounded-lg border border-transparent text-ink-muted transition-all duration-200 hover:border-line hover:bg-white/[0.04] hover:text-ink"
              aria-label={`System notifications${offlineCount > 0 ? `, ${offlineCount} instruments offline` : ''}`}
              aria-haspopup="dialog"
              aria-expanded={panel === 'notifications'}
            >
              <Bell className="size-4" aria-hidden="true" />
              {offlineCount > 0 ? (
                <span className="absolute right-1.5 top-1.5 flex size-3.5 items-center justify-center rounded-full bg-severity-critical font-mono text-[8px] font-bold text-midnight-950 ring-2 ring-midnight-950">
                  {offlineCount}
                </span>
              ) : null}
            </button>

            {panel === 'notifications' ? (
              <div
                role="dialog"
                aria-label="System notifications"
                className="absolute right-0 top-11 w-[min(340px,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-line-strong bg-midnight-900/95 shadow-lift backdrop-blur-2xl animate-fade-up"
              >
                <div className="border-b border-line px-4 py-3">
                  <p className="font-display text-[13px] font-medium text-ink">Instrument status</p>
                  <p className="mt-0.5 text-[11.5px] text-ink-faint">Live probes, not a message inbox.</p>
                </div>
                <div className="space-y-1 p-2">
                  {scannerOffline ? (
                    <NotificationRow
                      title="Scanner service unreachable"
                      detail="Collection and dataset endpoints are offline."
                    />
                  ) : null}
                  {analyticsOffline ? (
                    <NotificationRow
                      title="R analytics engine unreachable"
                      detail="Analysis, ML and report generation are offline."
                    />
                  ) : null}
                  {checking ? (
                    <NotificationRow title="Checking instruments" detail="Health probes are in flight." />
                  ) : null}
                  {!checking && offlineCount === 0 ? (
                    <div className="flex items-start gap-2.5 rounded-lg px-2.5 py-3">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden="true" />
                      <div>
                        <p className="text-[12.5px] text-ink">All instruments reachable</p>
                        <p className="mt-0.5 text-[11.5px] text-ink-faint">
                          Scanner and R engine answered their health probes.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="border-t border-line p-2">
                  <Link
                    to="/settings"
                    onClick={() => setPanel(null)}
                    className="flex items-center justify-between rounded-lg px-2.5 py-2 text-[12px] text-ink-muted transition-colors hover:bg-white/[0.04] hover:text-ink"
                  >
                    Configure endpoints
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

          <span className="mx-0.5 hidden h-6 w-px bg-line-strong sm:block" aria-hidden="true" />

          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setPanel((currentPanel) => (currentPanel === 'profile' ? null : 'profile'))
              }
              className="flex items-center gap-2 rounded-lg border border-transparent p-0.5 pr-1 transition-all duration-200 hover:border-line hover:bg-white/[0.035] sm:pr-2"
              aria-label="Open local research workspace menu"
              aria-haspopup="menu"
              aria-expanded={panel === 'profile'}
            >
              <span className="relative flex size-8 items-center justify-center rounded-lg bg-[linear-gradient(135deg,rgba(103,232,249,0.2),rgba(63,109,255,0.22),rgba(139,124,246,0.28))] font-display text-[12px] font-semibold text-cyan-soft shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] ring-1 ring-white/10">
                A
                <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-midnight-950 bg-emerald-400" />
              </span>
              <span className="hidden text-left leading-tight xl:block">
                <span className="block text-[11.5px] font-medium text-ink">Local workspace</span>
                <span className="block text-[10px] text-ink-faint">Research build</span>
              </span>
              <ChevronDown
                className={cn(
                  'hidden size-3 text-ink-faint transition-transform duration-200 sm:block',
                  panel === 'profile' && 'rotate-180',
                )}
                aria-hidden="true"
              />
            </button>

            {panel === 'profile' ? (
              <div
                role="menu"
                aria-label="Local research workspace"
                className="absolute right-0 top-11 w-[min(280px,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-line-strong bg-midnight-900/95 shadow-lift backdrop-blur-2xl animate-fade-up"
              >
                <div className="border-b border-line px-4 py-3.5">
                  <p className="text-[12.5px] font-medium text-ink">Local research workspace</p>
                  <p className="mt-0.5 text-[11.5px] leading-5 text-ink-faint">
                    No account is signed in. Preferences stay in this browser.
                  </p>
                </div>
                <div className="p-1.5">
                  <Link
                    to="/settings"
                    role="menuitem"
                    onClick={() => setPanel(null)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] text-ink-muted transition-colors hover:bg-white/[0.04] hover:text-ink"
                  >
                    <SlidersHorizontal className="size-3.5" aria-hidden="true" />
                    Workspace settings
                  </Link>
                  <Link
                    to="/reports"
                    role="menuitem"
                    onClick={() => setPanel(null)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] text-ink-muted transition-colors hover:bg-white/[0.04] hover:text-ink"
                  >
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    Research exports
                  </Link>
                </div>
                <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-faint">
                    A11YSCAPE v0.1
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded border border-violet/20 bg-violet-dim px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-violet-soft">
                    Phase 3
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {panel === 'search' ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh] sm:pt-[16vh]">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-midnight-950/75 backdrop-blur-md"
            onClick={() => setPanel(null)}
            aria-label="Close search"
            tabIndex={-1}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search pages and instruments"
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line-strong bg-midnight-900/95 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.95)] backdrop-blur-2xl animate-fade-up"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="size-4 shrink-0 text-cyan-soft" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="Search pages, instruments, outputs…"
                className="h-14 min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-faint"
                aria-label="Search pages and instruments"
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="rounded border border-line bg-midnight-950/60 px-1.5 py-0.5 font-mono text-[9.5px] text-ink-faint">
                ESC
              </kbd>
            </div>
            <div className="max-h-[52vh] overflow-y-auto p-2">
              {filteredItems.length === 0 ? (
                <div className="px-3 py-10 text-center">
                  <p className="text-[13px] text-ink-muted">No pages match “{query}”.</p>
                  <p className="mt-1 text-[11.5px] text-ink-faint">
                    Search covers navigation and instrument surfaces only.
                  </p>
                </div>
              ) : (
                <ul role="listbox" aria-label="Search results" className="space-y-0.5">
                  {filteredItems.map((item, index) => (
                    <li key={item.to} role="option" aria-selected={index === activeIndex}>
                      <button
                        type="button"
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => closeAndNavigate(item.to)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                          index === activeIndex ? 'bg-cyan/[0.08]' : 'hover:bg-white/[0.035]',
                        )}
                      >
                        <span
                          className={cn(
                            'flex size-8 shrink-0 items-center justify-center rounded-lg border',
                            index === activeIndex
                              ? 'border-cyan/25 bg-cyan-dim text-cyan-soft'
                              : 'border-line bg-white/[0.025] text-ink-muted',
                          )}
                        >
                          <item.icon className="size-3.5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12.5px] font-medium text-ink">{item.label}</span>
                          <span className="mt-0.5 block truncate text-[11px] text-ink-faint">
                            {item.description}
                          </span>
                        </span>
                        <ArrowUpRight
                          className={cn(
                            'size-3.5 shrink-0',
                            index === activeIndex ? 'text-cyan' : 'text-ink-faint/50',
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-faint">
              <span>↑ ↓ navigate · ↵ open</span>
              <span className="inline-flex items-center gap-1.5">
                <WifiOff className="size-3" aria-hidden="true" />
                Local data only
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function NotificationRow({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg px-2.5 py-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-severity-critical/20 bg-severity-critical/[0.07]">
        <WifiOff className="size-3.5 text-severity-critical" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[12.5px] text-ink">{title}</p>
        <p className="mt-0.5 text-[11.5px] leading-4 text-ink-faint">{detail}</p>
      </div>
    </div>
  )
}
