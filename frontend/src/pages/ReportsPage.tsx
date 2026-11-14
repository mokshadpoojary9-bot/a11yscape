import { useState, type FormEvent } from 'react'
import { Braces, Download, FileCode2, FileText, FileSpreadsheet, Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldError, Input, Label } from '@/components/ui/input'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { TableSkeleton } from '@/components/feedback/LoadingState'
import { useAnalyticsHealth, useGenerateReport, useReports } from '@/services/queries'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ReportRecord } from '@/types'

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

const formatTone: Record<ReportRecord['format'], 'cyan' | 'violet' | 'neutral' | 'success'> = {
  csv: 'success',
  json: 'cyan',
  html: 'violet',
  pdf: 'neutral',
}

const reportFormats: Array<{
  value: ReportRecord['format']
  label: string
  detail: string
  icon: typeof FileText
}> = [
  { value: 'csv', label: 'CSV', detail: 'Dataset extract', icon: FileSpreadsheet },
  { value: 'json', label: 'JSON', detail: 'Full scan records', icon: Braces },
  { value: 'html', label: 'HTML', detail: 'Analytical summary', icon: FileCode2 },
  { value: 'pdf', label: 'PDF', detail: 'Formatted report', icon: FileText },
]

export function ReportsPage() {
  const reports = useReports()
  const generate = useGenerateReport()
  const health = useAnalyticsHealth()

  const [title, setTitle] = useState('A11YSCAPE accessibility findings')
  const [format, setFormat] = useState<ReportRecord['format']>('csv')
  const [titleError, setTitleError] = useState<string | undefined>()
  const [created, setCreated] = useState<ReportRecord | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = title.trim()
    if (trimmed.length < 3) {
      setTitleError('Give the report a title of at least 3 characters.')
      return
    }
    if (trimmed.length > 120) {
      setTitleError('Keep the title under 120 characters.')
      return
    }
    setTitleError(undefined)
    setCreated(null)
    generate.mutate(
      { title: trimmed, format },
      { onSuccess: (report) => setCreated(report) },
    )
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Dissemination"
        title="Research Reports"
        description="Export the collected dataset and generated analytical output for supervision, appendices and reproducibility. Files are produced by the R engine and served locally."
      />

      {health.isError ? (
        <Alert tone="warning" title="R engine not reachable">
          Report generation and stored exports require the local analytics service. You can still
          request an export, and the failure will be reported precisely.
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <Card>
          <CardHeader>
            <CardTitle>Generate a report</CardTitle>
            <p className="text-[12.5px] text-ink-faint">
              The R engine writes the file and registers it below.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <Label htmlFor="report-title">Title</Label>
                <Input
                  id="report-title"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value)
                    if (titleError) setTitleError(undefined)
                  }}
                  maxLength={140}
                  aria-invalid={Boolean(titleError)}
                  aria-describedby={titleError ? 'report-title-error' : undefined}
                />
                <span id="report-title-error">
                  <FieldError>{titleError}</FieldError>
                </span>
              </div>
              <fieldset>
                <legend className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">
                  Format
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {reportFormats.map((option) => {
                    const selected = format === option.value
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          'flex cursor-pointer items-start gap-2.5 rounded-lg border px-2.5 py-2 transition-colors focus-within:shadow-focus',
                          selected
                            ? 'border-cyan/40 bg-cyan/[0.07]'
                            : 'border-line-strong bg-midnight-900/50 hover:bg-white/[0.03]',
                        )}
                      >
                        <input
                          type="radio"
                          name="report-format"
                          value={option.value}
                          checked={selected}
                          onChange={() => setFormat(option.value)}
                          className="sr-only"
                        />
                        <option.icon
                          className={cn(
                            'mt-0.5 size-4 shrink-0',
                            selected ? 'text-cyan-soft' : 'text-ink-faint',
                          )}
                          aria-hidden="true"
                        />
                        <span className="min-w-0">
                          <span className="block font-mono text-[11.5px] text-ink">{option.label}</span>
                          <span className="mt-0.5 block text-[10.5px] leading-4 text-ink-faint">
                            {option.detail}
                          </span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>
              <Button type="submit" className="w-full" loading={generate.isPending}>
                <Plus aria-hidden="true" />
                {generate.isPending ? 'Generating' : 'Generate report'}
              </Button>

              <div className="rounded-lg border border-line bg-midnight-950/40 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="eyebrow">Structure preview</p>
                  <Badge tone={formatTone[format]}>{format.toUpperCase()}</Badge>
                </div>
                <ul className="mt-2 space-y-1 text-[11px] leading-4 text-ink-faint">
                  <li>Executive summary</li>
                  <li>Dataset overview</li>
                  <li>Accessibility findings</li>
                  <li>Statistical analysis</li>
                  <li>PCA results</li>
                  <li>K-means cluster results</li>
                  <li>Recommendations and priorities</li>
                  <li>Limitations and methodology</li>
                </ul>
                <p className="mt-2 text-[10px] text-ink-faint/80">
                  Outline only — the content is written by the R engine.
                </p>
              </div>
            </form>

            {generate.isError ? (
              <div className="mt-4">
                <ErrorState
                  compact
                  title="Report generation failed"
                  error={generate.error}
                  onRetry={() => generate.reset()}
                />
              </div>
            ) : null}

            {created ? (
              <div className="mt-4">
                <Alert tone="success" title="Report registered">
                  <span className="font-mono text-[11.5px] text-ink">{created.title}</span> is available
                  in the list. {created.format.toUpperCase()} · {formatBytes(created.sizeBytes)}.
                </Alert>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            actions={reports.isSuccess && reports.data.length > 0 ? <Badge tone="neutral">{reports.data.length}</Badge> : undefined}
          >
            <CardTitle>Export archive</CardTitle>
            <p className="text-[12.5px] text-ink-faint">Files registered by the analytical engine.</p>
          </CardHeader>
          <CardContent className="pt-0">
            {reports.isPending ? (
              <TableSkeleton rows={5} />
            ) : reports.isError ? (
              <ErrorState
                title="Exports could not be loaded"
                error={reports.error}
                onRetry={() => void reports.refetch()}
              />
            ) : reports.data.length === 0 ? (
              <EmptyState
                icon={FileSpreadsheet}
                title="No exports yet"
                description="Generated datasets and reports are listed here with their format, size and download link. Nothing is pre-packaged."
                className="py-12"
                footnote="r-engine/reports · CSV · JSON · HTML"
              />
            ) : (
              <ul className="divide-y divide-line">
                {reports.data.map((report) => (
                  <li key={report.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line-strong bg-white/[0.025]">
                      <FileText className="size-4 text-cyan/80" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-ink">{report.title}</p>
                      <p className="mt-0.5 text-[11.5px] text-ink-faint">
                        {formatDateTime(report.createdAt)} · {formatBytes(report.sizeBytes)}
                      </p>
                    </div>
                    <Badge tone={formatTone[report.format]}>{report.format}</Badge>
                    <Button variant="ghost" size="icon-sm" asChild>
                      <a href={report.downloadUrl} download aria-label={`Download ${report.title}`}>
                        <Download aria-hidden="true" />
                      </a>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {created ? (
        <Card>
          <CardHeader>
            <CardTitle>Report preview</CardTitle>
            <p className="text-[12.5px] text-ink-faint">
              Generated {formatDateTime(created.createdAt)} · {created.format.toUpperCase()} ·{' '}
              {formatBytes(created.sizeBytes)}
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[13px] text-ink">{created.title}</p>
            <p className="mt-1 text-[12px] text-ink-muted">
              The file is written by the R engine and includes the executive summary, dataset overview,
              accessibility findings, statistical analysis, PCA and K-means results, recommendations,
              and limitations.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" asChild>
                <a href={created.downloadUrl} target="_blank" rel="noreferrer">
                  Preview
                </a>
              </Button>
              <Button asChild>
                <a href={created.downloadUrl} download>
                  <Download aria-hidden="true" />
                  Download
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Reproducibility note</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="max-w-3xl text-[12.5px] leading-6 text-ink-muted">
            Exports are reproducible: each scan record stores its target, timestamps, duration and the
            axe-core rules that fired. Analytical outputs are produced by the R engine from the same
            stored dataset, so a report can be regenerated after the corpus grows. No finding is typed
            by hand.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
