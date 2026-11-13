import { Link } from 'react-router-dom'
import { ArrowUpRight, Lightbulb, ShieldCheck, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PanelSkeleton } from '@/components/feedback/LoadingState'
import { useRecommendations } from '@/services/queries'
import type { RecommendationPriority } from '@/types'

const priorityTone: Record<RecommendationPriority, 'critical' | 'moderate' | 'minor'> = {
  high: 'critical',
  medium: 'moderate',
  low: 'minor',
}

const priorityRail: Record<RecommendationPriority, string> = {
  high: 'bg-severity-critical/70',
  medium: 'bg-severity-moderate/70',
  low: 'bg-severity-minor/70',
}

export function RecommendationsPage() {
  const recommendations = useRecommendations()

  const grouped: Record<RecommendationPriority, typeof recommendations.data> = {
    high: recommendations.data?.filter((item) => item.priority === 'high') ?? [],
    medium: recommendations.data?.filter((item) => item.priority === 'medium') ?? [],
    low: recommendations.data?.filter((item) => item.priority === 'low') ?? [],
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Remediation"
        title="Recommendation Centre"
        description="Prioritised, evidence-linked guidance derived from the observed violations. Each recommendation states how many scans and domains are affected before suggesting a remediation path."
        actions={
          <Button variant="secondary" asChild>
            <Link to="/dataset">
              Inspect evidence
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <Alert tone="info" title="Phase 7 scope">
        Recommendations are generated from measured violation patterns in Phase 7. No guidance is
        displayed until it can be traced to recorded scans; generic advice is deliberately withheld.
      </Alert>

      {recommendations.isPending ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <PanelSkeleton rows={4} />
          <PanelSkeleton rows={4} />
        </div>
      ) : recommendations.isError ? (
        <ErrorState
          title="Recommendations could not be loaded"
          error={recommendations.error}
          onRetry={() => void recommendations.refetch()}
        />
      ) : recommendations.data.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="No recommendations can be derived yet"
          description="The recommendation engine needs recorded violations before it can rank remediation work. Once scans exist, priorities will be calculated from rule frequency, impact and the number of affected domains."
          action={
            <Button asChild>
              <Link to="/scanner">Collect evidence</Link>
            </Button>
          }
          footnote="GET /api/recommendations · R Plumber"
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {(['high', 'medium', 'low'] as RecommendationPriority[]).map((priority) => (
              <div key={priority} className="panel relative overflow-hidden p-4">
                <span
                  aria-hidden="true"
                  className={`severity-rail ${priorityRail[priority]}`}
                />
                <p className="eyebrow capitalize">{priority} priority</p>
                <p className="num mt-1.5 text-[20px] text-ink">{grouped[priority]?.length ?? 0}</p>
                <p className="mt-0.5 text-[11.5px] text-ink-faint">
                  {(grouped[priority]?.length ?? 0) === 1 ? 'recommendation' : 'recommendations'}
                </p>
              </div>
            ))}
          </div>

          {(['high', 'medium', 'low'] as RecommendationPriority[]).map((priority) => {
            const items = grouped[priority]
            if (!items || items.length === 0) return null
            return (
              <section key={priority} className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-[14px] font-medium capitalize text-ink">{priority} priority</h2>
                  <Badge tone={priorityTone[priority]}>{items.length}</Badge>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {items.map((item) => (
                    <Card key={item.id} className="relative overflow-hidden">
                      <span
                        aria-hidden="true"
                        className={`severity-rail ${priorityRail[item.priority]}`}
                      />
                      <CardContent className="pt-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-[14px] font-medium text-ink">{item.title}</h3>
                            <p className="mt-1 font-mono text-[11px] text-cyan-soft">{item.ruleId}</p>
                          </div>
                          <Badge tone={priorityTone[item.priority]}>{item.priority}</Badge>
                        </div>
                        <p className="mt-2.5 text-[12.5px] leading-5 text-ink-muted">{item.rationale}</p>
                        <div className="mt-3.5 flex flex-wrap gap-1.5">
                          {item.wcagCriteria.map((criterion) => (
                            <Badge key={criterion} tone="neutral">
                              {criterion}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3 text-[12px] text-ink-faint">
                          <p>
                            <span className="num text-ink-muted">{item.affectedScans}</span> affected scans
                          </p>
                          <p>
                            <span className="num text-ink-muted">{item.affectedDomains.length}</span> domains
                          </p>
                        </div>
                        {item.affectedDomains.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {item.affectedDomains.slice(0, 3).map((domain) => (
                              <span
                                key={domain}
                                className="max-w-[180px] truncate rounded-md border border-line bg-midnight-950/50 px-1.5 py-0.5 font-mono text-[10px] text-ink-faint"
                                title={domain}
                              >
                                {domain}
                              </span>
                            ))}
                            {item.affectedDomains.length > 3 ? (
                              <span
                                className="rounded-md border border-line bg-midnight-950/50 px-1.5 py-0.5 font-mono text-[10px] text-ink-faint"
                                title={item.affectedDomains.slice(3).join(', ')}
                              >
                                +{item.affectedDomains.length - 3}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                        <p className="mt-3 flex gap-2 text-[12.5px] leading-5 text-ink-muted">
                          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
                          {item.remediation}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <Card>
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line-strong bg-white/[0.025]">
              <Sparkles className="size-4 text-violet-soft" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[13px] font-medium text-ink">How prioritisation will work</p>
              <p className="mt-1 max-w-2xl text-[12.5px] leading-5 text-ink-muted">
                Priority combines axe-core impact, how frequently a rule occurs, and how widely it
                spreads across independent domains. Every figure remains linked to its source records.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
