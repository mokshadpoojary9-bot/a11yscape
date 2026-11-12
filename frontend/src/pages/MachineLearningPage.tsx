import { Link } from 'react-router-dom'
import { ArrowUpRight, BrainCircuit, Boxes, CircleDot, Waypoints } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PanelSkeleton } from '@/components/feedback/LoadingState'
import { ServiceStatusChip } from '@/components/feedback/StatusPill'
import { useAnalyticsHealth, useModelRuns } from '@/services/queries'
import { formatDateTime, formatDecimal, formatNumber } from '@/lib/format'
import type { ModelRun } from '@/types'

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

function RunCard({ run }: { run: ModelRun }) {
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
            <p className="eyebrow">Silhouette</p>
            <p className="num mt-1.5 text-[16px] text-ink">{formatDecimal(run.silhouette)}</p>
          </div>
          <div className="rounded-lg border border-line bg-midnight-950/40 px-3.5 py-3">
            <p className="eyebrow">Outliers</p>
            <p className="num mt-1.5 text-[16px] text-ink">{run.outliers.length}</p>
          </div>
        </div>

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
                      <Badge tone={cluster.dominantSeverity}>{cluster.dominantSeverity}</Badge>
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

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Pattern discovery"
        title="Machine Learning Lab"
        description="Unsupervised analysis of the scan corpus in R: cluster domains with comparable accessibility profiles and surface anomalous captures. Model output is reported with its diagnostics, never as a claim of prediction accuracy."
        actions={
          <Button variant="secondary" asChild>
            <Link to="/analysis">
              Statistical analysis
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2.5">
        <ServiceStatusChip service="analytics" />
        <Badge tone="neutral">stats · cluster · factoextra</Badge>
        <Badge tone="neutral">isolation forest when compatible</Badge>
      </div>

      <Alert tone="info" title="Phase 5 scope">
        The modelling pipeline is implemented in R in Phase 5. No model has been trained or evaluated
        yet, so no clusters, silhouette scores or outliers are shown. Once a run is registered with the
        R engine, it will appear here with its full diagnostics.
      </Alert>

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
          description="Cluster profiles and anomaly scores appear only after the R engine evaluates a dataset and registers the run. Nothing here is simulated."
          footnote="GET /api/ml/runs · R Plumber"
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
            body: 'Domains are grouped by their observed violation profile, exposing structural similarity rather than ranking sites.',
          },
          {
            icon: Waypoints,
            title: 'Anomaly detection',
            body: 'Unusually dense or sparse captures are flagged for manual review, with the anomaly score retained.',
          },
          {
            icon: BrainCircuit,
            title: 'Reporting discipline',
            body: 'Cluster quality is reported through silhouette values and cluster sizes. No accuracy figure is claimed for unsupervised work.',
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
