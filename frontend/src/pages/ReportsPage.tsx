import { useState, type FormEvent } from 'react'
import { Download, FileText, FileSpreadsheet, Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldError, Input, Label, Select } from '@/components/ui/input'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { TableSkeleton } from '@/components/feedback/LoadingState'
import { useAnalyticsHealth, useGenerateReport, useReports } from '@/services/queries'
import { formatDateTime } from '@/lib/format'
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
              <div>
                <Label htmlFor="report-format">Format</Label>
                <Select
                  id="report-format"
                  value={format}
                  onChange={(event) => setFormat(event.target.value as ReportRecord['format'])}
                >
                  <option value="csv">CSV — dataset extract</option>
                  <option value="json">JSON — full scan records</option>
                  <option value="html">HTML — analytical summary</option>
                  <option value="pdf">PDF — formatted report</option>
                </Select>
              </div>
              <Button type="submit" className="w-full" loading={generate.isPending}>
                <Plus aria-hidden="true" />
                {generate.isPending ? 'Generating' : 'Generate report'}
              </Button>
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
          <CardHeader>
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
