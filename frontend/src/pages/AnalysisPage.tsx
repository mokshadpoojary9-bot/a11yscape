import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, FlaskConical, Play, Sigma } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PanelSkeleton } from '@/components/feedback/LoadingState'
import { ServiceStatusChip } from '@/components/feedback/StatusPill'
import { SeverityBar } from '@/charts/SeverityBar'
import { DomainIssueBar } from '@/charts/DomainIssueBar'
import { CorrelationMatrix } from '@/charts/CorrelationMatrix'
import { useAnalyticsHealth, useLatestAnalysis, useRunAnalysis } from '@/services/queries'
import { formatDateTime, formatDecimal, formatNumber } from '@/lib/format'

export function AnalysisPage() {
  const [includeCorrelation, setIncludeCorrelation] = useState(true)
  const health = useAnalyticsHealth()
  const analysis = useLatestAnalysis()
  const run = useRunAnalysis()
  const result = run.data ?? analysis.data ?? null
  const offline = health.isError
  const wcagMax = Math.max(1, ...(result?.wcagSummary.map((item) => item.violationCount) ?? [0]))

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="R analytical engine"
        title="Statistical Analysis"
        description="Descriptive statistics, severity distributions and WCAG criterion frequencies computed in R. The interface renders the model output; it does not recompute it in JavaScript."
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link to="/machine-learning">
                ML Lab
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </Button>
            <Button
              onClick={() => run.mutate({ includeCorrelation })}
              loading={run.isPending}
              disabled={offline || analysis.isPending}
            >
              <Play aria-hidden="true" />
              {run.isPending ? 'Computing' : 'Run analysis'}
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2.5">
        <ServiceStatusChip service="analytics" />
        <Badge tone="neutral">Plumber API</Badge>
        <Badge tone="neutral">dplyr · tidyr · ggplot2</Badge>
        <label className="ml-auto inline-flex cursor-pointer items-center gap-2 text-[12.5px] text-ink-muted">
          <input
            type="checkbox"
            checked={includeCorrelation}
            onChange={(event) => setIncludeCorrelation(event.target.checked)}
            className="size-3.5 rounded border-line-strong accent-cyan"
          />
          Include correlation matrix
        </label>
      </div>

      {offline ? (
        <Alert tone="warning" title="R engine not reachable">
          Analysis runs require the local Plumber service (Phase 4). Until it is running, no
          statistics can be produced. Configure its endpoint in{' '}
          <Link to="/settings" className="link-quiet">
            Settings
          </Link>
          .
        </Alert>
      ) : null}

      {run.isError ? (
        <ErrorState
          title="The analysis run failed"
          error={run.error}
          onRetry={() => run.mutate({ includeCorrelation })}
        />
      ) : null}

      {analysis.isPending || run.isPending ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <PanelSkeleton rows={5} />
          <PanelSkeleton rows={5} />
        </div>
      ) : analysis.isError ? (
        <ErrorState
          title="Stored analysis could not be loaded"
          error={analysis.error}
          onRetry={() => void analysis.refetch()}
        />
      ) : result?.status === 'insufficient_data' ? (
        <EmptyState
          icon={Sigma}
          title="Not enough data for analysis"
          description={
            result.message ?? 'Run at least one website scan first.'
          }
          action={
            <Button
              onClick={() => run.mutate({ includeCorrelation })}
              loading={run.isPending}
              disabled={offline}
            >
              <Play aria-hidden="true" />
              Run analysis
            </Button>
          }
          footnote="POST /api/analysis · R Plumber · SQLite dataset"
        />
      ) : !result ? (
        <EmptyState
          icon={Sigma}
          title="No analysis has been produced"
          description="The R engine has not returned an analysis run for this dataset. Start collection first, then run the statistical pipeline to generate severity distributions, WCAG frequencies and descriptive summaries."
          action={
            <Button
              onClick={() => run.mutate({ includeCorrelation })}
              loading={run.isPending}
              disabled={offline}
            >
              <Play aria-hidden="true" />
              Run analysis
            </Button>
          }
          footnote="POST /api/analysis · R Plumber · SQLite dataset"
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Dataset rows',
                value: formatNumber(result.datasetRows),
                hint: 'Rows supplied to the engine',
              },
              { label: 'Method', value: result.method, hint: 'Method declared by R' },
              {
                label: 'Computed at',
                value: formatDateTime(result.createdAt),
                hint: 'Timestamp emitted with the run',
              },
              {
                label: 'Correlation',
                value: result.correlation ? `${result.correlation.variables.length} variables` : 'Not requested',
                hint: 'Pairwise coefficient matrix',
              },
            ].map((item) => (
              <div key={item.label} className="panel relative overflow-hidden p-5">
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/45 to-transparent"
                />
                <p className="eyebrow">{item.label}</p>
                <p className="mt-2.5 truncate font-mono text-[14px] text-ink">{item.value}</p>
                <p className="mt-1.5 truncate text-[11px] text-ink-faint">{item.hint}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Violation severity distribution</CardTitle>
                <p className="text-[12.5px] text-ink-faint">Aggregated axe-core impact levels.</p>
              </CardHeader>
              <CardContent className="pt-0">
                {result.severityDistribution.length === 0 ? (
                  <p className="py-10 text-center text-[12.5px] text-ink-faint">No severity data returned.</p>
                ) : (
                  <SeverityBar data={result.severityDistribution} />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Mean issues by domain</CardTitle>
                <p className="text-[12.5px] text-ink-faint">Computed from recorded scans only.</p>
              </CardHeader>
              <CardContent className="pt-0">
                {result.domainSummaries.length === 0 ? (
                  <p className="py-10 text-center text-[12.5px] text-ink-faint">No domain data returned.</p>
                ) : (
                  <DomainIssueBar data={result.domainSummaries} />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Descriptive statistics</CardTitle>
                <p className="text-[12.5px] text-ink-faint">Values exactly as emitted by R.</p>
              </CardHeader>
              <CardContent className="overflow-x-auto px-0 pb-0">
                <table className="w-full min-w-[560px] text-left">
                  <thead>
                    <tr className="border-y border-line text-2xs uppercase tracking-[0.08em] text-ink-faint">
                      <th scope="col" className="px-5 py-2.5 font-medium">Metric</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">Mean</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">Median</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">SD</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">Min</th>
                      <th scope="col" className="px-5 py-2.5 text-right font-medium">Max</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {result.descriptives.map((row) => (
                      <tr key={row.metric} className="transition-colors hover:bg-white/[0.02]">
                        <td className="px-5 py-3 text-[12.5px] text-ink">{row.metric}</td>
                        <td className="num px-3 py-3 text-right text-[12px] text-ink-muted">{formatDecimal(row.mean)}</td>
                        <td className="num px-3 py-3 text-right text-[12px] text-ink-muted">{formatDecimal(row.median)}</td>
                        <td className="num px-3 py-3 text-right text-[12px] text-ink-muted">{formatDecimal(row.sd)}</td>
                        <td className="num px-3 py-3 text-right text-[12px] text-ink-muted">{formatDecimal(row.min)}</td>
                        <td className="num px-5 py-3 text-right text-[12px] text-ink-muted">{formatDecimal(row.max)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.descriptives.length === 0 ? (
                  <p className="px-5 py-8 text-center text-[12.5px] text-ink-faint">
                    R returned no descriptive rows.
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>WCAG criterion frequency</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {result.wcagSummary.length === 0 ? (
                  <p className="py-8 text-center text-[12.5px] text-ink-faint">No WCAG summary returned.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {result.wcagSummary.map((criterion) => (
                      <li
                        key={criterion.criterion}
                        className="rounded-lg border border-line bg-midnight-950/35 px-3 py-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-mono text-[11.5px] text-cyan-soft">{criterion.criterion}</p>
                            <p className="mt-0.5 truncate text-[12px] text-ink-muted">{criterion.title}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Badge tone="neutral">{criterion.level}</Badge>
                            <span className="num text-[12.5px] text-ink">{criterion.violationCount}</span>
                          </div>
                        </div>
                        <div className="meter mt-2.5 h-1">
                          <div
                            className="meter-fill"
                            style={{ width: `${Math.max(3, (criterion.violationCount / wcagMax) * 100)}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {result.correlation && result.correlation.variables.length > 0 && result.correlation.matrix.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Correlation matrix</CardTitle>
                <p className="text-[12.5px] text-ink-faint">
                  Pairwise coefficients emitted by the R run. Colour encodes magnitude and sign; the
                  values are not recomputed in the browser.
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <CorrelationMatrix
                  variables={result.correlation.variables}
                  matrix={result.correlation.matrix}
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Analyst notes</CardTitle>
              <p className="text-[12.5px] text-ink-faint">Diagnostics emitted with the run.</p>
            </CardHeader>
            <CardContent className="pt-0">
              {result.notes.length === 0 ? (
                <p className="text-[12.5px] text-ink-faint">No notes were returned.</p>
              ) : (
                <ul className="space-y-2">
                  {result.notes.map((note) => (
                    <li key={note} className="flex gap-2.5 text-[12.5px] leading-5 text-ink-muted">
                      <FlaskConical className="mt-0.5 size-3.5 shrink-0 text-violet-soft" aria-hidden="true" />
                      {note}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
