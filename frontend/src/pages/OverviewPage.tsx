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
import { useDatasetStats, useScannerHealth } from '@/services/queries'
import { formatDateTime, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

type PhaseState = 'complete' | 'next' | 'planned'

const phases: Array<{ number: number; name: string; detail: string; state: PhaseState }> = [
  { number: 1, name: 'Foundation & interface', detail: 'Design system, navigation, all nine surfaces', state: 'complete' },
  { number: 2, name: 'Website scanner', detail: 'Playwright + axe-core collection pipeline', state: 'next' },
  { number: 3, name: 'Dataset explorer', detail: 'SQLite persistence and filtering', state: 'planned' },
  { number: 4, name: 'Statistical engine', detail: 'R Plumber descriptive analysis', state: 'planned' },
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
  next: { tone: 'cyan', label: 'In progress' },
  planned: { tone: 'neutral', label: 'Planned' },
}

export function OverviewPage() {
  const statsQuery = useDatasetStats()
  const scannerHealth = useScannerHealth()
  const stats = statsQuery.data
  const offline = statsQuery.isError
  const loading = statsQuery.isPending

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Mission control"
        title="Overview"
        description="A research observatory for detectable digital accessibility problems. Collect real evidence from public websites, analyse it in R, and visualise the findings without embellishment."
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link to="/dataset">
                <Database aria-hidden="true" />
                Dataset
              </Link>
            </Button>
            <Button asChild>
              <Link to="/scanner">
                <Radar aria-hidden="true" />
                New scan
              </Link>
            </Button>
          </>
        }
      />

      {/* Observatory status band */}
      <section className="panel relative overflow-hidden animate-fade-up animate-delay-1">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_300px_at_88%_-30%,rgba(34,211,238,0.12),transparent_65%)]"
        />
        <div className="relative grid gap-8 p-6 sm:p-7 lg:grid-cols-[1.6fr_1fr] lg:items-center">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="cyan">Phase 1 · Foundation</Badge>
              <Badge tone="neutral">Local research build</Badge>
            </div>
            <h2 className="max-w-xl text-[22px] font-semibold leading-snug text-ink sm:text-[25px]">
              The observatory is installed. Instruments arrive phase by phase.
            </h2>
            <p className="max-w-xl text-[13.5px] leading-6 text-ink-muted">
              This release establishes the interface, design system and service topology. Scan
              collection, the R analytical engine and the 3D universe are not yet connected — this
              dashboard reports that honestly rather than displaying invented measurements.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <ServiceStatusChip service="scanner" />
              <ServiceStatusChip service="analytics" />
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3">
            {[
              { label: 'Surfaces', value: '9' },
              { label: 'Phases', value: '8' },
              { label: 'Analytics', value: 'R' },
              { label: 'Standards', value: 'WCAG 2.2' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-line bg-midnight-950/40 px-4 py-3">
                <dt className="eyebrow">{item.label}</dt>
                <dd className="mt-1.5 font-mono text-[15px] text-ink">{item.value}</dd>
              </div>
            ))}
          </dl>
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
            hint={offline ? 'Scanner service unreachable' : 'Completed and partial scan records'}
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
            hint={offline ? 'Scanner service unreachable' : 'Most recent completed scan'}
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
                  {scannerHealth.data ? `v${scannerHealth.data.version ?? '0.1'} · ${scannerHealth.data.service}` : 'Awaiting Phase 2 provisioning'}
                </p>
              </div>
              <div className="rounded-lg border border-line bg-midnight-950/40 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12.5px] text-ink-muted">R analytics engine</p>
                  <ServiceStatusChip service="analytics" showLabel={false} />
                </div>
                <p className="mt-2 break-all font-mono text-[11px] text-ink-faint">
                  Awaiting Phase 4 · R Plumber API
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
