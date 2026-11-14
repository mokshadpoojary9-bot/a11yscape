import { Link } from 'react-router-dom'
import { ArrowUpRight, BrainCircuit, Boxes, CircleDot, Play, Waypoints } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PanelSkeleton } from '@/components/feedback/LoadingState'
import { ServiceStatusChip } from '@/components/feedback/StatusPill'
import { useAnalyticsHealth, useModelRuns, useRunModels } from '@/services/queries'
import { PcaScatter, pcaClusterPalette } from '@/charts/PcaScatter'
import { formatDateTime, formatDecimal, formatNumber, formatPercent } from '@/lib/format'
import type { KSelection, ModelRun, PcaSummary } from '@/types'

const algorithmLabel: Record<ModelRun['algorithm'], string> = {
  kmeans: 'k-means clustering',
  hierarchical: 'hierarchical clustering',
  'isolation-forest': 'isolation forest',
}

const algorithmTone: Record<ModelRun['algorithm'], 'cyan' | 'violet' | 'neutral'> = {
  kmeans: 'cyan',
  hierarchical: 'violet',
  'isolation-forest': 'neutral',
}

const severityColor: Record<ModelRun['clusters'][number]['dominantSeverity'], string> = {
  critical: '#f0567a',
  serious: '#f59e6a',
  moderate: '#e7c15a',
  minor: '#5ec8b0',
  none: '#5b6b82',
}

function VarianceBars({ pca }: { pca: PcaSummary }) {
  return (
    <div className="space-y-2">
      {pca.explainedVariance.map((value, index) => (
        <div
          key={`pc-${index}`}
          className="grid grid-cols-[40px_1fr_48px] items-center gap-2"
        >
          <span className="font-mono text-[10px] text-ink-faint">PC{index + 1}</span>
          <div className="meter h-1.5 overflow-hidden rounded-full">
            <div
              className="meter-fill"
              style={{ width: `${Math.max(1.5, Math.min(1, value) * 100)}%` }}
            />
          </div>
          <span className="num text-right font-mono text-[10px] text-ink-muted">
            {formatPercent(value * 100)}
          </span>
        </div>
      ))}
      <p className="pt-1 font-mono text-[10px] text-ink-faint">
        Cumulative:{' '}
        {pca.cumulativeVariance.map((value) => formatPercent(value * 100)).join(' · ')}
      </p>
    </div>
  )
}

function KSelectionBars({ selection }: { selection: KSelection }) {
  const maximum = Math.max(
    0.0001,
    ...selection.candidates.map((candidate) => Math.max(0, candidate.silhouette)),
  )
  return (
    <div className="space-y-1.5">
      {selection.candidates.map((candidate) => {
        const selected = candidate.k === selection.selectedK
        return (
          <div
            key={candidate.k}
            className="grid grid-cols-[32px_1fr_58px] items-center gap-2"
          >
            <span
              className={`font-mono text-[10px] ${selected ? 'text-cyan-soft' : 'text-ink-faint'}`}
            >
              k={candidate.k}
            </span>
            <div className="meter h-1.5 overflow-hidden rounded-full">
              <div
                className="meter-fill"
                style={{
                  width: `${Math.max(2, (Math.max(0, candidate.silhouette) / maximum) * 100)}%`,
                  opacity: selected ? 1 : 0.45,
                }}
              />
            </div>
            <span
              className={`num text-right font-mono text-[10px] ${
                selected ? 'text-ink' : 'text-ink-faint'
              }`}
            >
              {formatDecimal(candidate.silhouette, 3)}
            </span>
          </div>
        )
      })}
      <p className="pt-1 text-[10.5px] text-ink-faint">
        Highest mean silhouette selected k={selection.selectedK}. The browser only renders R's values.
      </p>
    </div>
  )
}

function RunCard({ run }: { run: ModelRun }) {
  const clusteredRows = run.clusters.reduce((total, cluster) => total + cluster.size, 0)
  const pca = run.pca ?? null
  const centroidFeatures =
    pca?.features ?? Array.from(new Set(run.clusters.flatMap((cluster) => Object.keys(cluster.centroid ?? {}))))

  return (
    <Card>
      <CardHeader
        actions={
          <>
            <Badge tone={algorithmTone[run.algorithm]}>{algorithmLabel[run.algorithm]}</Badge>
            <Badge tone={run.status === 'completed' ? 'success' : run.status === 'failed' ? 'critical' : 'moderate'}>
              {run.status}
            </Badge>
          </>
        }
      >
        <CardTitle className="font-mono text-[13px]">{run.id}</CardTitle>
        <p className="text-[12px] text-ink-faint">
          {formatNumber(run.datasetRows)} rows · computed {formatDateTime(run.createdAt)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-line bg-midnight-950/40 px-3.5 py-3">
            <p className="eyebrow">Clusters</p>
            <p className="num mt-1.5 text-[16px] text-ink">{run.clusters.length}</p>
          </div>
          <div className="rounded-lg border border-line bg-midnight-950/40 px-3.5 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="eyebrow">Silhouette</p>
              <span className="font-mono text-[9px] text-ink-faint">−1…1</span>
            </div>
            <p className="num mt-1.5 text-[16px] text-ink">{formatDecimal(run.silhouette)}</p>
            {typeof run.silhouette === 'number' && Number.isFinite(run.silhouette) ? (
              <div className="meter mt-2 h-1">
                <div
                  className="meter-fill"
                  style={{ width: `${Math.max(2, Math.min(1, run.silhouette) * 100)}%` }}
                />
              </div>
            ) : null}
          </div>
          <div className="rounded-lg border border-line bg-midnight-950/40 px-3.5 py-3">
            <p className="eyebrow">Outliers</p>
            <p className="num mt-1.5 text-[16px] text-ink">{run.outliers.length}</p>
          </div>
        </div>

        {run.kSelection && run.kSelection.candidates.length > 0 ? (
          <div className="rounded-lg border border-line bg-midnight-950/40 px-3.5 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="eyebrow">Cluster-count selection</p>
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                mean silhouette
              </span>
            </div>
            <div className="mt-2.5">
              <KSelectionBars selection={run.kSelection} />
            </div>
          </div>
        ) : null}

        {pca ? (
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-lg border border-line bg-midnight-950/40 p-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="eyebrow">PCA projection</p>
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                  {pca.features.length} standardized features
                </span>
              </div>
              <div className="mt-2">
                <PcaScatter
                  scores={pca.scores}
                  explainedVariance={pca.explainedVariance}
                />
              </div>
            </div>
            <div className="space-y-4 rounded-lg border border-line bg-midnight-950/40 p-3.5">
              <div>
                <p className="eyebrow">Explained variance</p>
                <div className="mt-2">
                  <VarianceBars pca={pca} />
                </div>
              </div>
              <div>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="eyebrow">Component loadings</p>
                  <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-faint">
                    PC1 / PC2
                  </span>
                </div>
                <div className="mt-1.5 overflow-x-auto">
                  <table className="w-full min-w-[260px] text-left text-[11.5px]">
                    <thead>
                      <tr className="border-b border-line text-2xs uppercase tracking-[0.08em] text-ink-faint">
                        <th scope="col" className="py-1.5 pr-3 font-medium">Feature</th>
                        <th scope="col" className="py-1.5 pr-3 text-right font-medium">PC1</th>
                        <th scope="col" className="py-1.5 text-right font-medium">PC2</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {[...pca.loadings]
                        .sort((left, right) => Math.abs(right.pc1) - Math.abs(left.pc1))
                        .map((loading) => (
                          <tr key={loading.feature}>
                            <td className="py-1.5 pr-3 font-mono text-[10.5px] text-ink-muted">
                              {loading.feature}
                            </td>
                            <td className="num py-1.5 pr-3 text-right text-ink">
                              {formatDecimal(loading.pc1, 3)}
                            </td>
                            <td className="num py-1.5 text-right text-ink-muted">
                              {formatDecimal(loading.pc2, 3)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {run.clusters.length > 0 ? (
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="eyebrow">Cluster composition</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                {formatNumber(clusteredRows)} clustered rows
              </p>
            </div>
            <div
              role="img"
              aria-label={`Cluster composition: ${run.clusters
                .map((cluster) => `${cluster.label}, ${cluster.size} rows, ${cluster.dominantSeverity}`)
                .join('; ')}`}
              className="mt-2 flex h-2.5 gap-0.5 overflow-hidden rounded-full border border-line/60"
            >
              {run.clusters.map((cluster) => (
                <div
                  key={cluster.clusterId}
                  title={`${cluster.label} · ${cluster.size} rows`}
                  style={{
                    flexGrow: Math.max(1, cluster.size),
                    flexBasis: 0,
                    backgroundColor: severityColor[cluster.dominantSeverity],
                    opacity: 0.8,
                  }}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {run.clusters.map((cluster) => (
                <span
                  key={cluster.clusterId}
                  className="inline-flex items-center gap-1.5 font-mono text-[10px] text-ink-faint"
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: severityColor[cluster.dominantSeverity] }}
                    aria-hidden="true"
                  />
                  {cluster.label}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {run.clusters.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[12px]">
              <thead>
                <tr className="border-b border-line text-2xs uppercase tracking-[0.08em] text-ink-faint">
                  <th scope="col" className="py-2 pr-3 font-medium">Cluster</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">Size</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">Mean issues</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Dominant severity</th>
                  <th scope="col" className="py-2 font-medium">Frequent rules</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {run.clusters.map((cluster) => (
                  <tr key={cluster.clusterId}>
                    <td className="py-2.5 pr-3 text-ink">{cluster.label}</td>
                    <td className="num py-2.5 pr-3 text-right text-ink-muted">{cluster.size}</td>
                    <td className="num py-2.5 pr-3 text-right text-ink-muted">{formatDecimal(cluster.meanIssueCount)}</td>
                    <td className="py-2.5 pr-3">
                      <Badge tone={cluster.dominantSeverity === 'none' ? 'neutral' : cluster.dominantSeverity}>
                        {cluster.dominantSeverity}
                      </Badge>
                    </td>
                    <td className="py-2.5 font-mono text-[11px] text-ink-faint">
                      {cluster.topRules.join(', ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {centroidFeatures.length > 0 ? (
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="eyebrow">Cluster centroids</p>
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                original feature units
              </span>
            </div>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[11.5px]">
                <thead>
                  <tr className="border-b border-line text-2xs uppercase tracking-[0.08em] text-ink-faint">
                    <th scope="col" className="py-1.5 pr-3 font-medium">Cluster</th>
                    {centroidFeatures.map((feature) => (
                      <th
                        key={feature}
                        scope="col"
                        title={feature}
                        className="py-1.5 pr-3 text-right font-medium"
                      >
                        {feature}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {run.clusters.map((cluster) => (
                    <tr key={cluster.clusterId}>
                      <td className="py-1.5 pr-3 text-ink">{cluster.label}</td>
                      {centroidFeatures.map((feature) => (
                        <td
                          key={feature}
                          className="num py-1.5 pr-3 text-right text-ink-muted"
                        >
                          {formatDecimal(cluster.centroid?.[feature], 2)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {run.assignments && run.assignments.length > 0 ? (
          <div>
            <p className="eyebrow">Scan assignments</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {run.assignments.map((assignment) => (
                <span
                  key={assignment.scanId}
                  title={`${assignment.scanId} · ${assignment.domain}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white/[0.025] px-2 py-1 font-mono text-[10px] text-ink-muted"
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{
                      backgroundColor:
                        pcaClusterPalette[
                          Math.max(0, assignment.clusterId - 1) % pcaClusterPalette.length
                        ],
                    }}
                    aria-hidden="true"
                  />
                  {assignment.domain}
                  <span className="text-ink-faint">· C{assignment.clusterId}</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {run.outliers.length > 0 ? (
          <div>
            <p className="text-[12px] font-medium text-ink">Flagged outliers</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[380px] text-left text-[12px]">
                <thead>
                  <tr className="border-b border-line text-2xs uppercase tracking-[0.08em] text-ink-faint">
                    <th scope="col" className="py-1.5 pr-3 font-medium">Domain</th>
                    <th scope="col" className="py-1.5 pr-3 text-right font-medium">Anomaly score</th>
                    <th scope="col" className="py-1.5 text-right font-medium">Issues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {run.outliers.map((outlier) => (
                    <tr key={outlier.scanId}>
                      <td className="py-2 pr-3 text-ink-muted">{outlier.domain}</td>
                      <td className="num py-2 pr-3 text-right text-ink">{formatDecimal(outlier.anomalyScore)}</td>
                      <td className="num py-2 text-right text-ink-muted">{formatNumber(outlier.issueCount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {run.notes.length > 0 ? (
          <ul className="space-y-1.5">
            {run.notes.map((note) => (
              <li key={note} className="flex gap-2 text-[12px] leading-5 text-ink-faint">
                <CircleDot className="mt-1 size-3 shrink-0 text-ink-faint" aria-hidden="true" />
                {note}
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function MachineLearningPage() {
  const health = useAnalyticsHealth()
  const runs = useModelRuns()
  const runModels = useRunModels()

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Pattern discovery"
        title="Machine Learning Lab"
        description="Unsupervised analysis of the scan corpus in R: reduce numeric scan features with PCA, then cluster scans with comparable accessibility profiles. Model output is reported with its diagnostics, never as a claim of prediction accuracy."
        actions={
          <>
            <Button
              onClick={() => runModels.mutate(undefined)}
              loading={runModels.isPending}
              disabled={health.isError}
            >
              <Play aria-hidden="true" />
              Run PCA + K-means
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/analysis">
                Statistical analysis
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2.5">
        <ServiceStatusChip service="analytics" />
        <Badge tone="neutral">PCA · k-means · silhouette</Badge>
        <Badge tone="neutral">completed + partial scans</Badge>
      </div>

      <Alert tone="info" title="Models run on demand">
        PCA and K-means are computed by R from stored completed and partial scans, then persisted
        with the run. If the corpus has too few complete rows or too few non-constant features, the
        engine rejects the request with an explicit error instead of inventing a result.
      </Alert>

      {runModels.isError ? (
        <ErrorState
          title="Model run failed"
          error={runModels.error}
          onRetry={() => runModels.mutate(undefined)}
        />
      ) : null}

      {health.isError ? (
        <ErrorState
          title="R engine not reachable"
          error={health.error}
          onRetry={() => void health.refetch()}
        />
      ) : null}

      {runs.isPending ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <PanelSkeleton rows={6} />
          <PanelSkeleton rows={6} />
        </div>
      ) : runs.isError ? (
        <ErrorState
          title="Model runs could not be loaded"
          error={runs.error}
          onRetry={() => void runs.refetch()}
        />
      ) : runs.data.length === 0 ? (
        <EmptyState
          icon={BrainCircuit}
          title="No model runs recorded"
          description="Run PCA and K-means on the current scanner corpus. Cluster profiles, component scores and diagnostics appear only after R evaluates real rows and registers the run. Nothing here is simulated."
          footnote="GET /api/ml/runs · POST /api/ml/runs · R Plumber"
          action={
            <Button
              onClick={() => runModels.mutate(undefined)}
              loading={runModels.isPending}
              disabled={health.isError}
            >
              <Play aria-hidden="true" />
              Run PCA + K-means
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <p className="text-[12.5px] text-ink-faint">
            {runs.data.length} registered model run{runs.data.length === 1 ? '' : 's'}.
          </p>
          {runs.data.map((run) => (
            <RunCard key={run.id} run={run} />
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          {
            icon: Boxes,
            title: 'Segmentation',
            body: 'Scans are grouped by their observed violation profile, exposing structural similarity rather than ranking sites.',
          },
          {
            icon: Waypoints,
            title: 'Anomaly detection',
            body: 'Anomaly detection is reserved for a later run; this milestone reports PCA structure and K-means clusters without claiming outlier scores.',
          },
          {
            icon: BrainCircuit,
            title: 'Reporting discipline',
            body: 'Component variance, loadings, silhouette values and cluster sizes are reported together. No accuracy figure is claimed for unsupervised work.',
          },
        ].map((item) => (
          <Card key={item.title}>
            <CardContent className="pt-5">
              <span className="flex size-9 items-center justify-center rounded-lg border border-line-strong bg-white/[0.025]">
                <item.icon className="size-4 text-violet-soft" aria-hidden="true" />
              </span>
              <h3 className="mt-3.5 text-[13.5px] font-medium text-ink">{item.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-5 text-ink-muted">{item.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
