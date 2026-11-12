import { Suspense, useState } from 'react'
import { Link } from 'react-router-dom'
import { Compass, Orbit, Pause, Play, RotateCcw } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { UniverseScene } from '@/three/UniverseScene'
import { useSettings } from '@/hooks/useSettings'
import { useDatasetStats } from '@/services/queries'
import { formatNumber } from '@/lib/format'

export function UniversePage() {
  const [autoRotate, setAutoRotate] = useState(true)
  const [sceneKey, setSceneKey] = useState(0)
  const { settings } = useSettings()
  const stats = useDatasetStats()

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Spatial intelligence"
        title="3D Accessibility Universe"
        description="A navigable space for the collected corpus. Each scanned page will become a point, positioned by structural similarity and coloured by detected severity, so patterns are visible before a single chart is read."
        actions={
          <>
            <Button variant="secondary" size="md" onClick={() => setSceneKey((key) => key + 1)}>
              <RotateCcw aria-hidden="true" />
              Reset view
            </Button>
            <Button variant="outline" size="md" onClick={() => setAutoRotate((value) => !value)}>
              {autoRotate ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
              {autoRotate ? 'Pause orbit' : 'Resume orbit'}
            </Button>
          </>
        }
      />

      <Alert tone="info" title="Phase 6 scope">
        The renderer is installed but the universe is empty by design. Data points are generated only
        from recorded scans, and the spatial encoding is implemented in Phase 6. The mesh below is a
        calibration reference, not a visualisation of findings.
      </Alert>

      <div className="panel relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(760px_420px_at_50%_45%,rgba(34,211,238,0.09),transparent_70%),radial-gradient(620px_360px_at_78%_18%,rgba(139,124,246,0.10),transparent_72%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.35] bg-grid-fade [background-size:44px_44px] [mask-image:radial-gradient(circle_at_50%_50%,black,transparent_76%)]"
        />

        <div className="relative h-[440px] w-full sm:h-[540px]">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                  Initialising renderer
                </p>
              </div>
            }
          >
            <div className="h-full w-full" role="img" aria-label="Standby calibration mesh in three dimensions">
              <UniverseScene
                key={sceneKey}
                autoRotate={autoRotate}
                reducedMotion={settings.reduceMotion}
              />
            </div>
          </Suspense>
        </div>

        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <Badge tone="cyan" className="pointer-events-auto">
              Standby projection
            </Badge>
            <div className="pointer-events-auto rounded-lg border border-line bg-midnight-950/60 px-3 py-2 text-right backdrop-blur-sm">
              <p className="eyebrow">Corpus points</p>
              <p className="num mt-1 text-[13px] text-ink">
                {stats.isSuccess ? formatNumber(stats.data.totalScans) : '—'}
              </p>
            </div>
          </div>

          <div className="mx-auto max-w-md rounded-xl border border-line bg-midnight-950/70 px-5 py-4 text-center backdrop-blur-md">
            <p className="text-[13px] font-medium text-ink">No spatial data to render</p>
            <p className="mt-1.5 text-[12px] leading-5 text-ink-muted">
              Points appear after scans are collected and the Phase 6 encoding is active. Drag to
              orbit, scroll to zoom.
            </p>
            <Button variant="subtle" size="sm" className="mt-3.5" asChild>
              <Link to="/scanner">
                Collect first scan
                <Orbit aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
            <span>Orbit: drag · Zoom: scroll</span>
            <span>{autoRotate && !settings.reduceMotion ? 'Auto-orbit active' : 'Auto-orbit paused'}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          {
            title: 'Position',
            body: 'Pages with comparable violation profiles will occupy nearby space, using the cluster assignments produced by the R engine.',
            tag: 'Similarity',
          },
          {
            title: 'Colour',
            body: 'Points inherit the dominant impact severity recorded for that page, with the same palette used across every chart.',
            tag: 'Severity',
          },
          {
            title: 'Scale',
            body: 'Point size will reflect the number of affected nodes, so a single rule affecting many elements remains legible in the scene.',
            tag: 'Density',
          },
        ].map((item) => (
          <Card key={item.title}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[13.5px] font-medium text-ink">{item.title}</h3>
                <Badge tone="neutral">{item.tag}</Badge>
              </div>
              <p className="mt-2 text-[12.5px] leading-5 text-ink-muted">{item.body}</p>
              <p className="mt-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                <Compass className="size-3" aria-hidden="true" />
                Planned · Phase 6
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
