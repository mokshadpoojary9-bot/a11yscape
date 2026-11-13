import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AmbientBackground } from '@/components/layout/AmbientBackground'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { LogoMark } from '@/components/brand/Logo'
import { useSettings } from '@/hooks/useSettings'

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()
  const { settings } = useSettings()

  useEffect(() => {
    setNavOpen(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  useEffect(() => {
    if (!navOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navOpen])

  return (
    <div
      className={settings.reduceMotion ? 'motion-reduce-root' : undefined}
      data-reduce-motion={settings.reduceMotion}
    >
      <AmbientBackground />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-cyan focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-midnight-950"
      >
        Skip to main content
      </a>

      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="relative min-h-screen lg:pl-[268px]">
        <Topbar onOpenNav={() => setNavOpen(true)} />

        <main id="main-content" className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(900px_300px_at_35%_0%,rgba(34,211,238,0.045),transparent_70%)]"
          />
          <div className="relative mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-9">
            <div key={location.pathname} className="animate-page-in">
              <Outlet />
            </div>
          </div>
        </main>

        <footer className="relative border-t border-line/80 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1320px] flex-col gap-4 text-[11px] leading-5 text-ink-faint sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <LogoMark size={22} />
              <div>
                <p className="font-display text-[11px] font-medium tracking-[0.12em] text-ink-muted">
                  A11YSCAPE
                </p>
                <p className="mt-0.5">Digital Accessibility Intelligence Observatory</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1 rounded-full bg-emerald-400/80" aria-hidden="true" />
                Local research build
              </span>
              <span className="hidden h-3 w-px bg-line-strong sm:block" aria-hidden="true" />
              <span className="font-mono text-[9.5px] uppercase tracking-[0.11em]">
                axe-core · WCAG 2.2 · R analytics
              </span>
              <span className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-ink-faint/80">
                v0.1
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
