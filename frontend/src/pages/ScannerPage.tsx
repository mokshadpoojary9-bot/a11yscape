import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Camera, Globe2, Radar, ShieldCheck, Waypoints } from 'lucide-react'
import { z } from 'zod'
import { PageHeader } from '@/components/layout/PageHeader'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldError, FieldHint, Input, Label, Select } from '@/components/ui/input'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { TableSkeleton } from '@/components/feedback/LoadingState'
import { useScannerHealth, useScans, useStartScan } from '@/services/queries'
import { formatDateTime, hostnameOf } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Severity } from '@/types'

const scanSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'Enter a website address.')
    .url('Enter a complete URL, for example https://example.com.')
    .refine((value) => {
      try {
        const protocol = new URL(value).protocol
        return protocol === 'http:' || protocol === 'https:'
      } catch {
        return false
      }
    }, 'Only http and https websites can be scanned.'),
  maxPages: z.coerce.number().int().min(1, 'Scan at least one page.').max(10, 'A maximum of 10 pages is supported.'),
  includeScreenshots: z.boolean(),
})

type FieldErrors = Partial<Record<'url' | 'maxPages', string>>

const statusTone: Record<string, 'success' | 'cyan' | 'neutral' | 'critical' | 'moderate'> = {
  completed: 'success',
  running: 'cyan',
  queued: 'neutral',
  partial: 'moderate',
  failed: 'critical',
}

function SeverityCell({ severity }: { severity: Record<Severity, number> }) {
  const order: Severity[] = ['critical', 'serious', 'moderate', 'minor']
  const entries = order.filter((key) => (severity?.[key] ?? 0) > 0)
  if (entries.length === 0) return <span className="text-ink-faint">—</span>
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {entries.map((key) => (
        <span key={key} className="font-mono text-[11px] text-ink-muted">
          <span
            className={cn(
              'mr-1 inline-block size-1.5 rounded-full',
              key === 'critical' && 'bg-severity-critical',
              key === 'serious' && 'bg-severity-serious',
              key === 'moderate' && 'bg-severity-moderate',
              key === 'minor' && 'bg-severity-minor',
            )}
            aria-hidden="true"
          />
          {severity[key]} {key.slice(0, 4)}
        </span>
      ))}
    </div>
  )
}

export function ScannerPage() {
  const [url, setUrl] = useState('')
  const [maxPages, setMaxPages] = useState('3')
  const [includeScreenshots, setIncludeScreenshots] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [queuedId, setQueuedId] = useState<string | null>(null)

  const health = useScannerHealth()
  const startScan = useStartScan()
  const recent = useScans({ page: 1, pageSize: 5 })

  const serviceOnline = health.isSuccess

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setQueuedId(null)
    const result = scanSchema.safeParse({ url, maxPages, includeScreenshots })
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors
      setErrors({
        url: flat.url?.[0],
        maxPages: flat.maxPages?.[0],
      })
      return
    }
    setErrors({})
    startScan.mutate(result.data, {
      onSuccess: (response) => setQueuedId(response.scanId),
    })
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Collection instrument"
        title="Website Scanner"
        description="Queue a public website for accessibility collection. The scanner renders pages with Playwright and evaluates the DOM with axe-core, recording every detected violation with its WCAG reference."
        actions={
          <Button variant="secondary" asChild>
            <Link to="/dataset">
              Open dataset
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      {!serviceOnline && !health.isPending ? (
        <Alert tone="warning" title="Scanner service not reachable">
          The collection endpoint is not responding, so scans cannot be queued yet. This is expected
          in Phase 1: the Node scanner service is provisioned in Phase 2. You can review or change the
          endpoint in{' '}
          <Link to="/settings" className="link-quiet">
            Settings
          </Link>
          .
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Card className="animate-fade-up">
          <CardHeader>
            <CardTitle>Define a target</CardTitle>
            <p className="text-[12.5px] text-ink-faint">
              Only publicly reachable pages are accepted. The crawler stays on the submitted host.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div>
                <Label htmlFor="scan-url">Website URL</Label>
                <div className="relative">
                  <Globe2
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
                    aria-hidden="true"
                  />
                  <Input
                    id="scan-url"
                    name="url"
                    type="url"
                    inputMode="url"
                    autoComplete="url"
                    placeholder="https://example.com"
                    className="pl-9 font-mono text-[13px]"
                    value={url}
                    onChange={(event) => {
                      setUrl(event.target.value)
                      if (errors.url) setErrors((current) => ({ ...current, url: undefined }))
                    }}
                    aria-invalid={Boolean(errors.url)}
                    aria-describedby={errors.url ? 'scan-url-error' : 'scan-url-hint'}
                    disabled={startScan.isPending}
                  />
                </div>
                <span id="scan-url-error">
                  <FieldError>{errors.url}</FieldError>
                </span>
                <span id="scan-url-hint">
                  <FieldHint>Include the protocol. Redirects to another host are recorded but not followed.</FieldHint>
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="scan-pages">Pages to collect</Label>
                  <Select
                    id="scan-pages"
                    value={maxPages}
                    onChange={(event) => setMaxPages(event.target.value)}
                    disabled={startScan.isPending}
                    aria-invalid={Boolean(errors.maxPages)}
                  >
                    <option value="1">Single page</option>
                    <option value="3">Up to 3 pages</option>
                    <option value="5">Up to 5 pages</option>
                    <option value="10">Up to 10 pages</option>
                  </Select>
                  <FieldError>{errors.maxPages}</FieldError>
                  <FieldHint>Each page is rendered and evaluated independently.</FieldHint>
                </div>

                <div>
                  <Label htmlFor="scan-screenshots">Capture evidence</Label>
                  <label
                    htmlFor="scan-screenshots"
                    className="flex h-10 cursor-pointer items-center gap-2.5 rounded-lg border border-line-strong bg-midnight-900/70 px-3.5 text-[13px] text-ink-muted transition-colors hover:border-line-strong"
                  >
                    <input
                      id="scan-screenshots"
                      type="checkbox"
                      checked={includeScreenshots}
                      onChange={(event) => setIncludeScreenshots(event.target.checked)}
                      disabled={startScan.isPending}
                      className="size-4 rounded border-line-strong bg-transparent accent-cyan"
                    />
                    <Camera className="size-4 text-ink-faint" aria-hidden="true" />
                    Store screenshots
                  </label>
                  <FieldHint>Stored locally beside the scan record for later review.</FieldHint>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
                <Button type="submit" loading={startScan.isPending} disabled={!url.trim()}>
                  <Radar aria-hidden="true" />
                  {startScan.isPending ? 'Queuing scan' : 'Queue scan'}
                </Button>
                <p className="text-[12px] text-ink-faint">
                  Collection is asynchronous; progress is recorded in the dataset.
                </p>
              </div>
            </form>

            {startScan.isError ? (
              <div className="mt-4">
                <ErrorState
                  title="The scan could not be queued"
                  error={startScan.error}
                  onRetry={() => startScan.reset()}
                />
              </div>
            ) : null}

            {queuedId ? (
              <div className="mt-4">
                <Alert tone="success" title="Scan queued">
                  Record <span className="font-mono text-ink">{queuedId}</span> was accepted by the
                  scanner service. It will appear in the dataset as collection progresses.{' '}
                  <Link to="/dataset" className="link-quiet">
                    View dataset
                  </Link>
                </Alert>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="animate-fade-up animate-delay-1">
            <CardHeader>
              <CardTitle>Collection protocol</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {[
                {
                  icon: Waypoints,
                  title: 'Rendered inspection',
                  body: 'Pages load in a real Chromium context, so client-rendered content is present in the DOM before evaluation.',
                },
                {
                  icon: ShieldCheck,
                  title: 'axe-core rules',
                  body: 'Violations are tagged with impact severity and WCAG success criteria. Every rule reference is stored with the record.',
                },
                {
                  icon: Globe2,
                  title: 'Scope discipline',
                  body: 'Collection remains on the submitted hostname. Off-site links are not followed.',
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-3">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-line-strong bg-white/[0.025]">
                    <item.icon className="size-3.5 text-cyan/80" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink">{item.title}</p>
                    <p className="mt-1 text-[12px] leading-5 text-ink-faint">{item.body}</p>
                  </div>
                </div>
              ))}
              <div className="rounded-lg border border-line bg-midnight-950/40 px-3.5 py-3">
                <p className="eyebrow mb-1.5">Configured endpoint</p>
                <p className="break-all font-mono text-[11px] text-ink-muted">
                  {health.isSuccess ? 'Connected' : 'Not connected'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Alert tone="info" title="Phase 2 scope">
            This form validates input and submits to the real collection API. Until that service is
            running, submissions fail and the error above states exactly why.
          </Alert>
        </div>
      </div>

      <section aria-labelledby="recent-scans" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="recent-scans" className="text-[15px] font-medium text-ink">
              Recent captures
            </h2>
            <p className="mt-1 text-[12.5px] text-ink-faint">Latest records in the collection queue.</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dataset">All records</Link>
          </Button>
        </div>

        {recent.isPending ? (
          <TableSkeleton rows={4} />
        ) : recent.isError ? (
          <ErrorState
            title="Scan records unavailable"
            error={recent.error}
            onRetry={() => void recent.refetch()}
          />
        ) : recent.data.records.length === 0 ? (
          <EmptyState
            icon={Radar}
            title="No scans have been recorded"
            description="Once the collection service accepts a scan, its record appears here with duration, severity totals and the individual axe-core violations."
            footnote="datasets/raw · database/a11yscape.sqlite"
          />
        ) : (
          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-line text-2xs uppercase tracking-[0.08em] text-ink-faint">
                  <th scope="col" className="px-5 py-3 font-medium">Target</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                  <th scope="col" className="px-5 py-3 font-medium">Issues</th>
                  <th scope="col" className="px-5 py-3 font-medium">Severity</th>
                  <th scope="col" className="px-5 py-3 font-medium">Captured</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recent.data.records.map((scan) => (
                  <tr key={scan.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5">
                      <p className="text-[13px] text-ink">{scan.pageTitle ?? hostnameOf(scan.targetUrl)}</p>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-ink-faint">
                        {scan.targetUrl}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={statusTone[scan.status] ?? 'neutral'}>{scan.status}</Badge>
                    </td>
                    <td className="num px-5 py-3.5 text-[13px] text-ink">{scan.issueCount}</td>
                    <td className="px-5 py-3.5">
                      <SeverityCell severity={scan.violationsBySeverity} />
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11.5px] text-ink-muted">
                      {formatDateTime(scan.startedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
