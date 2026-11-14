import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  BrainCircuit,
  Database,
  FileText,
  Fingerprint,
  Globe2,
  Orbit,
  Radar,
  ScanSearch,
  ShieldCheck,
  Sigma,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/data/StatCard'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ServiceStatusChip } from '@/components/feedback/StatusPill'
import { ErrorState } from '@/components/feedback/ErrorState'
import { HeroInstrument } from '@/three/HeroInstrument'
import { useSettings } from '@/hooks/useSettings'
import { useDatasetStats, useScannerHealth } from '@/services/queries'
import { formatDateTime, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

type PhaseState = 'complete' | 'next' | 'planned'

const phases: Array<{ number: number; name: string; detail: string; state: PhaseState }> = [
  { number: 1, name: 'Foundation & interface', detail: 'Design system, navigation, all nine surfaces', state: 'complete' },
  { number: 2, name: 'Website scanner', detail: 'Playwright + axe-core collection pipeline', state: 'complete' },
  { number: 3, name: 'Dataset explorer', detail: 'SQLite persistence and filtering', state: 'complete' },
  { number: 4, name: 'Statistical engine', detail: 'R Plumber descriptive analysis', state: 'next' },
  { number: 5, name: 'Machine learning', detail: 'Clustering and anomaly detection in R', state: 'planned' },
  { number: 6, name: '3D universe', detail: 'Spatial visualisation of collected scans', state: 'planned' },
  { number: 7, name: 'Recommendation centre', detail: 'Evidence-backed remediation priorities', state: 'planned' },
  { number: 8, name: 'Integration & reporting', detail: 'Exports, documentation, verification', state: 'planned' },
]

const quickLinks = [
  { to: '/scanner', label: 'Run a scan', detail: 'Define a target and collection scope', icon: Radar },
  { to: '/dataset', label: 'Inspect data', detail: 'Filter the collected scan corpus', icon: Database },
  { to: '/analysis', label: 'Analyse in R', detail: 'Descriptive and WCAG statistics', icon: Sigma },
  { to: '/machine-learning', label: 'Model patterns', detail: 'Cluster domains and detect outliers', icon: BrainCircuit },
  { to: '/universe', label: 'Enter 3D universe', detail: 'Navigate the corpus spatially', icon: Orbit },
  { to: '/reports', label: 'Export research', detail: 'Datasets and generated reports', icon: FileText },
]

const phaseBadge: Record<PhaseState, { tone: 'success' | 'cyan' | 'neutral'; label: string }> = {
  complete: { tone: 'success', label: 'Complete' },
  next: { tone: 'cyan', label: 'Next' },
  planned: { tone: 'neutral', label: 'Planned' },
}

export function OverviewPage() {
  const statsQuery = useDatasetStats()
  const scannerHealth = useScannerHealth()
  const { settings } = useSettings()
  const stats = statsQuery.data
  const offline = statsQuery.isError
  const loading = statsQuery.isPending

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Mission control"
        title="Overview"
        description="A research observatory for detectable digital accessibility problems. Collect real evidence from public websites, analyse it in R, and visualise the findings without embellishment."
      />

      {/* Observatory hero */}
      <section className="hero-panel animate-fade-up animate-delay-1">
        <div aria-hidden="true" className="grain pointer-events-none absolute inset-0" />
        <div aria-hidden="true" className="holo-grid pointer-events-none absolute inset-0 opacity-50" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(720px_320px_at_88%_-20%,rgba(34,211,238,0.12),transparent_66%)]"
        />

        <div className="relative grid gap-6 p-6 sm:p-7 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-8 lg:p-9">
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-soft/90">
                <span className="size-1.5 animate-pulse-soft rounded-full bg-cyan shadow-glow-cyan" aria-hidden="true" />
                Research observatory
              </span>
              <span className="h-3 w-px bg-line-strong" aria-hidden="true" />
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                Phase 1 · Foundation
              </span>
            </div>

            <h2 className="hero-title mt-4 max-w-[19ch] text-ink">
              The observatory is installed.{' '}
              <span className="text-gradient-warm">Instruments arrive phase by phase.</span>
            </h2>

            <p className="mt-4 max-w-[48ch] text-[13.5px] leading-6 text-ink-muted">
              Scan collection and the dataset explorer are connected to real stored scans. The R
              analytical engine and the spatial universe are not connected yet — the observatory
              reports that honestly instead of displaying invented measurements.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <Button asChild>
                <Link to="/scanner">
                  <Radar aria-hidden="true" />
                  Begin a scan
                </Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link to="/dataset">
                  <Database aria-hidden="true" />
                  Inspect dataset
                </Link>
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <ServiceStatusChip service="scanner" />
              <ServiceStatusChip service="analytics" />
              <span className="instrument-chip">WCAG 2.2</span>
            </div>

            <dl className="mt-6 grid max-w-md grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line/40">
              {[
                { label: 'Surfaces', value: '9' },
                { label: 'Phases', value: '8' },
                { label: 'Analytics', value: 'R' },
              ].map((item) => (
                <div key={item.label} className="bg-midnight-950/55 px-3.5 py-2.5">
                  <dt className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-faint">
                    {item.label}
                  </dt>
                  <dd className="mt-1 font-mono text-[13px] text-ink">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="stage-vignette pointer-events-none absolute inset-0 rounded-2xl" aria-hidden="true" />
            <div className="relative mx-auto aspect-square w-full max-w-[420px] select-none sm:max-w-[460px] lg:max-w-none">
              <div
                aria-hidden="true"
                className="absolute inset-[14%] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.16),rgba(63,109,255,0.08)_45%,transparent_70%)] blur-2xl"
              />
              <div className="absolute inset-0" aria-hidden="true">
                <HeroInstrument reducedMotion={settings.reduceMotion} />
              </div>

              <span className="instrument-chip pointer-events-none absolute left-1 top-1">
                Calibration field 01
              </span>
              <span className="instrument-chip pointer-events-none absolute right-1 top-1 hidden sm:inline-flex">
                axe-core · R
              </span>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3">
                <span className="font-mono text-[9.5px] uppercase leading-4 tracking-[0.12em] text-ink-faint">
                  Instrument reference
                  <br />
                  Not a data projection
                </span>
                <span className="instrument-chip hidden sm:inline-flex">
                  <span className="size-1 rounded-full bg-violet-soft" aria-hidden="true" />
                  Standby
                </span>
              </div>

              {/* Corner calibration brackets */}
              <span aria-hidden="true" className="absolute left-0 top-0 size-4 border-l border-t border-cyan/30" />
              <span aria-hidden="true" className="absolute right-0 top-0 size-4 border-r border-t border-cyan/30" />
              <span aria-hidden="true" className="absolute bottom-0 left-0 size-4 border-b border-l border-cyan/30" />
              <span aria-hidden="true" className="absolute bottom-0 right-0 size-4 border-b border-r border-cyan/30" />
            </div>
          </div>
        </div>

        <div className="relative flex flex-wrap items-center justify-between gap-2 border-t border-line/70 px-6 py-3 sm:px-7 lg:px-9">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-faint">
            Collection → Storage → Statistics → Models → Visualisation
          </p>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-faint">
            Local research build · v0.1.0
          </p>
        </div>
      </section>

      {/* Measured dataset metrics */}
      <section aria-labelledby="dataset-metrics" className="space-y-3 animate-fade-up animate-delay-2">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="dataset-metrics" className="text-[15px] font-medium text-ink">
              Collected dataset
            </h2>
            <p className="mt-1 text-[12.5px] text-ink-faint">
              Values are read directly from the scanner service. No values are estimated.
            </p>
          </div>
          {offline ? <Badge tone="critical">Service offline</Badge> : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Scans captured"
            value={formatNumber(stats?.totalScans)}
            hint={offline ? 'Scanner service unreachable' : 'All stored scan records, including failures'}
            icon={ScanSearch}
            tone="cyan"
            loading={loading}
          />
          <StatCard
            label="Domains observed"
            value={formatNumber(stats?.totalDomains)}
            hint={offline ? 'Scanner service unreachable' : 'Distinct hostnames in the corpus'}
            icon={Globe2}
            loading={loading}
          />
          <StatCard
            label="Issues detected"
            value={formatNumber(stats?.totalIssues)}
            hint={offline ? 'Scanner service unreachable' : 'axe-core violations across all scans'}
            icon={Fingerprint}
            loading={loading}
          />
          <StatCard
            label="Latest capture"
            value={
              stats?.latestScanAt ? (
                <span className="text-[15px] leading-tight">{formatDateTime(stats.latestScanAt)}</span>
              ) : (
                '—'
              )
            }
            hint={offline ? 'Scanner service unreachable' : 'Most recent stored scan'}
            icon={ShieldCheck}
            loading={loading}
          />
        </div>
        {offline ? (
          <ErrorState
            compact
            title="Dataset metrics unavailable"
            error={statsQuery.error}
            onRetry={() => void statsQuery.refetch()}
          />
        ) : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        {/* Pipeline */}
        <Card className="animate-fade-up animate-delay-3">
          <CardHeader>
            <CardTitle>Research pipeline</CardTitle>
            <p className="text-[12.5px] text-ink-faint">
              Build status is tracked per phase; nothing is marked complete before verification.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <ol className="space-y-1">
              {phases.map((phase) => {
                const badge = phaseBadge[phase.state]
                return (
                  <li
                    key={phase.number}
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-white/[0.025]"
                  >
                    <span
                      className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-md border font-mono text-[10.5px]',
                        phase.state === 'complete' && 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
                        phase.state === 'next' && 'border-cyan/25 bg-cyan-dim text-cyan-soft',
                        phase.state === 'planned' && 'border-line-strong bg-white/[0.02] text-ink-faint',
                      )}
                    >
                      {String(phase.number).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-ink">{phase.name}</p>
                      <p className="truncate text-[11.5px] text-ink-faint">{phase.detail}</p>
                    </div>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </li>
                )
              })}
            </ol>
          </CardContent>
        </Card>

        <div className="space-y-4 animate-fade-up animate-delay-3">
          <Card>
            <CardHeader>
              <CardTitle>Instrument diagnostics</CardTitle>
              <p className="text-[12.5px] text-ink-faint">
                Live probes against configured endpoints.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="rounded-lg border border-line bg-midnight-950/40 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12.5px] text-ink-muted">Scanner service</p>
                  <ServiceStatusChip service="scanner" showLabel={false} />
                </div>
                <p className="mt-2 break-all font-mono text-[11px] text-ink-faint">
                  {scannerHealth.data ? `v${scannerHealth.data.version ?? '0.1'} · ${scannerHealth.data.service}` : 'Scanner service unavailable'}
                </p>
              </div>
              <div className="rounded-lg border border-line bg-midnight-950/40 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12.5px] text-ink-muted">R analytics engine</p>
                  <ServiceStatusChip service="analytics" showLabel={false} />
                </div>
                <p className="mt-2 break-all font-mono text-[11px] text-ink-faint">
                  R analytics engine unavailable
                </p>
              </div>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to="/settings">
                  Configure endpoints
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Alert tone="warning" title="Data integrity policy">
            Every number in A11YSCAPE originates from a recorded scan or an R computation. While a
            service is unavailable, the interface withholds values and explains why.
          </Alert>
        </div>
      </div>

      {/* Quick access */}
      <section aria-labelledby="quick-access" className="space-y-3 animate-fade-up animate-delay-4">
        <h2 id="quick-access" className="text-[15px] font-medium text-ink">
          Continue the investigation
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {quickLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="panel panel-hover group flex items-start gap-3.5 p-4 focus-visible:shadow-focus"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line-strong bg-white/[0.025] text-ink-muted transition-colors group-hover:border-cyan/25 group-hover:text-cyan-soft">
                <link.icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[13.5px] font-medium text-ink">{link.label}</span>
                  <ArrowUpRight
                    className="size-3.5 shrink-0 text-ink-faint transition-all duration-200 group-hover:-translate-y-0.5 group-hover:text-cyan"
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-1 block text-[12px] leading-5 text-ink-faint">{link.detail}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
