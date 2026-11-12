import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-cyan focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-midnight-950"
      >
        Skip to main content
      </a>
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="min-h-screen lg:pl-[268px]">
        <Topbar onOpenNav={() => setNavOpen(true)} />
        <main id="main-content" className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[420px] shell-grid opacity-60"
          />
          <div className="relative mx-auto w-full max-w-[1320px] px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
            <Outlet />
          </div>
        </main>
        <footer className="border-t border-line px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1320px] flex-col gap-2 text-[11.5px] leading-5 text-ink-faint sm:flex-row sm:items-center sm:justify-between">
            <p>
              A11YSCAPE — Digital Accessibility Intelligence Observatory · College research platform
            </p>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.1em]">
              ax-core · WCAG 2.2 · R analytics
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
