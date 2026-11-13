import { useDeferredValue, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  FilterX,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { TableSkeleton } from '@/components/feedback/LoadingState'
import { useScans } from '@/services/queries'
import { useSettings } from '@/hooks/useSettings'
import { formatDateTime, formatDuration, formatNumber, hostnameOf } from '@/lib/format'
import { cn } from '@/lib/utils'
import { SEVERITY_ORDER, type ScanFilters, type ScanRecord, type ScanStatus, type Severity } from '@/types'

const severityLabel: Record<Severity, string> = {
  critical: 'Critical',
  serious: 'Serious',
  moderate: 'Moderate',
  minor: 'Minor',
}

const severityTone: Record<Severity, 'critical' | 'serious' | 'moderate' | 'minor'> = {
  critical: 'critical',
  serious: 'serious',
  moderate: 'moderate',
  minor: 'minor',
}

const statusTone: Record<ScanStatus, 'success' | 'cyan' | 'neutral' | 'critical' | 'moderate'> = {
  completed: 'success',
  running: 'cyan',
  queued: 'neutral',
  partial: 'moderate',
  failed: 'critical',
}

const PAGE_SIZES = [10, 20, 50]

type SortKey = 'target' | 'status' | 'pages' | 'issues' | 'severity' | 'duration' | 'captured'
type SortDirection = 'asc' | 'desc'

function severityTotal(scan: ScanRecord): number {
  return SEVERITY_ORDER.reduce((total, severity) => total + (scan.violationsBySeverity?.[severity] ?? 0), 0)
}

function SortHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  align = 'left',
}: {
  label: string
  sortKey: SortKey
  activeKey: SortKey | null
  direction: SortDirection
  onSort: (key: SortKey) => void
  align?: 'left' | 'right'
}) {
  const active = activeKey === sortKey
  return (
    <th
      scope="col"
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn('px-4 py-3 font-medium', align === 'right' && 'text-right')}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-sm uppercase tracking-[0.08em] transition-colors hover:text-ink',
          align === 'right' && 'flex-row-reverse',
          active ? 'text-ink' : 'text-ink-faint',
        )}
      >
        {label}
        {active ? (
          direction === 'asc' ? (
            <ArrowUp className="size-3 text-cyan-soft" aria-hidden="true" />
          ) : (
            <ArrowDown className="size-3 text-cyan-soft" aria-hidden="true" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-50" aria-hidden="true" />
        )}
      </button>
    </th>
  )
}

export function DatasetPage() {
  const [query, setQuery] = useState('')
  const [severity, setSeverity] = useState<Severity | 'all'>('all')
  const [status, setStatus] = useState<ScanStatus | 'all'>('all')
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const deferredQuery = useDeferredValue(query.trim())
  const { settings } = useSettings()

  const filters: ScanFilters = useMemo(
    () => ({
      query: deferredQuery || undefined,
      severity,
      status,
      page,
      pageSize,
    }),
    [deferredQuery, severity, status, page, pageSize],
  )

  const scans = useScans(filters)

  const records = useMemo(() => {
    const list = scans.data?.records ?? []
    if (!sortKey) return list
    const factor = sortDirection === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case 'target':
          return factor * (a.pageTitle ?? a.domain).localeCompare(b.pageTitle ?? b.domain)
        case 'status':
          return factor * a.status.localeCompare(b.status)
        case 'pages':
          return factor * (a.pagesScanned - b.pagesScanned)
        case 'issues':
          return factor * (a.issueCount - b.issueCount)
        case 'severity':
          return factor * (severityTotal(a) - severityTotal(b))
        case 'duration':
          return factor * ((a.durationMs ?? 0) - (b.durationMs ?? 0))
        case 'captured':
          return factor * a.startedAt.localeCompare(b.startedAt)
        default:
          return 0
      }
    })
  }, [scans.data, sortKey, sortDirection])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDirection(key === 'captured' ? 'desc' : 'asc')
  }

  const total = scans.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const hasActiveFilters = Boolean(deferredQuery) || severity !== 'all' || status !== 'all'

  function resetFilters() {
    setQuery('')
    setSeverity('all')
    setStatus('all')
    setPage(1)
  }

  const exportHref = useMemo(() => {
    const base = settings.scannerBaseUrl.replace(/\/+$/, '')
    const params = new URLSearchParams()
    if (deferredQuery) params.set('query', deferredQuery)
    if (severity !== 'all') params.set('severity', severity)
    if (status !== 'all') params.set('status', status)
    const search = params.toString()
    return `${base}/api/exports/scans.csv${search ? `?${search}` : ''}`
  }, [settings.scannerBaseUrl, deferredQuery, severity, status])

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Corpus"
        title="Dataset Explorer"
        description="The recorded scan corpus, exactly as stored. Filter by target, impact severity or collection status, then inspect the individual axe-core violations behind each record."
        actions={
          <Button variant="secondary" asChild>
            <a href={exportHref} download>
              <Download aria-hidden="true" />
              Export CSV
            </a>
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_170px_170px_130px] lg:items-end">
            <div>
              <Label htmlFor="dataset-search">Search target</Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
                  aria-hidden="true"
                />
                <Input
                  id="dataset-search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setPage(1)
                  }}
                  placeholder="Domain, URL or page title"
                  className="pl-9"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="dataset-severity">Minimum severity</Label>
              <Select
                id="dataset-severity"
                value={severity}
                onChange={(event) => {
                  setSeverity(event.target.value as Severity | 'all')
                  setPage(1)
                }}
              >
                <option value="all">All severities</option>
                {(Object.keys(severityLabel) as Severity[]).map((key) => (
                  <option key={key} value={key}>
                    {severityLabel[key]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="dataset-status">Status</Label>
              <Select
                id="dataset-status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as ScanStatus | 'all')
                  setPage(1)
                }}
              >
                <option value="all">All statuses</option>
                {(['completed', 'partial', 'running', 'queued', 'failed'] as ScanStatus[]).map((key) => (
                  <option key={key} value={key} className="capitalize">
                    {key}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="dataset-page-size">Rows</Label>
              <Select
                id="dataset-page-size"
                value={String(pageSize)}
                onChange={(event) => {
                  setPageSize(Number(event.target.value))
                  setPage(1)
                }}
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size} per page
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <div className="flex flex-wrap items-center gap-3 text-[12.5px] text-ink-faint">
              <span className="inline-flex items-center gap-1.5">
                <SlidersHorizontal className="size-3.5" aria-hidden="true" />
                {scans.isSuccess ? (
                  <>
                    <span className="num text-ink-muted">{formatNumber(total)}</span> records match
                  </>
                ) : (
                  'Dataset unavailable'
                )}
              </span>
              {sortKey ? (
                <span className="inline-flex items-center gap-1.5">
                  <ArrowUpDown className="size-3.5" aria-hidden="true" />
                  Sorted by{' '}
                  <span className="text-ink-muted capitalize">{sortKey}</span>
                  <button
                    type="button"
                    onClick={() => setSortKey(null)}
                    className="rounded-sm underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink"
                  >
                    Reset
                  </button>
                </span>
              ) : null}
              {hasActiveFilters ? (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  <FilterX aria-hidden="true" />
                  Clear filters
                </Button>
              ) : null}
            </div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-faint">
              WCAG 2.2 · axe-core
            </p>
          </div>
        </CardContent>
      </Card>

      {scans.isPending ? (
        <TableSkeleton rows={8} />
      ) : scans.isError ? (
        <ErrorState
          title="The dataset could not be read"
          error={scans.error}
          onRetry={() => void scans.refetch()}
        />
      ) : scans.data.records.length === 0 ? (
        <EmptyState
          icon={Database}
          title={hasActiveFilters ? 'No records match these filters' : 'The corpus is empty'}
          description={
            hasActiveFilters
              ? 'Adjust or clear the filters to widen the search. The dataset itself is unchanged.'
              : 'No website scans are stored yet. Once the collection service records a scan, every page and violation will be inspectable here.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="secondary" onClick={resetFilters}>
                <FilterX aria-hidden="true" />
                Clear filters
              </Button>
            ) : (
              <Button asChild>
                <Link to="/scanner">Start a scan</Link>
              </Button>
            )
          }
          footnote={hasActiveFilters ? undefined : 'Source: scanner-service → SQLite → /api/scans'}
        />
      ) : (
        <>
          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-line text-2xs uppercase tracking-[0.08em] text-ink-faint">
                  <th scope="col" className="w-10 px-4 py-3">
                    <span className="sr-only">Expand record</span>
                  </th>
                  <SortHeader label="Target" sortKey="target" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <SortHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <SortHeader label="Pages" sortKey="pages" activeKey={sortKey} direction={sortDirection} onSort={handleSort} align="right" />
                  <SortHeader label="Issues" sortKey="issues" activeKey={sortKey} direction={sortDirection} onSort={handleSort} align="right" />
                  <SortHeader label="Severity" sortKey="severity" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <SortHeader label="Duration" sortKey="duration" activeKey={sortKey} direction={sortDirection} onSort={handleSort} align="right" />
                  <SortHeader label="Captured" sortKey="captured" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {records.map((scan) => (
                  <ScanRows
                    key={scan.id}
                    scan={scan}
                    expanded={expandedId === scan.id}
                    onToggle={() => setExpandedId(expandedId === scan.id ? null : scan.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[12.5px] text-ink-faint">
              Page <span className="num text-ink-muted">{page}</span> of{' '}
              <span className="num text-ink-muted">{totalPages}</span> · showing{' '}
              <span className="num text-ink-muted">{records.length}</span> of{' '}
              <span className="num text-ink-muted">{total}</span>
              {sortKey ? (
                <span className="ml-1.5 text-ink-faint/80">
                  · sorting applies to this page only
                </span>
              ) : null}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft aria-hidden="true" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
              >
                Next
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ScanRows({
  scan,
  expanded,
  onToggle,
}: {
  scan: ScanRecord
  expanded: boolean
  onToggle: () => void
}) {
  const severities = (Object.keys(scan.violationsBySeverity ?? {}) as Severity[]).filter(
    (key) => (scan.violationsBySeverity?.[key] ?? 0) > 0,
  )

  return (
    <>
      <tr className={cn('transition-colors hover:bg-white/[0.02]', expanded && 'bg-white/[0.025]')}>
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} record for ${scan.domain}`}
            className="flex size-6 items-center justify-center rounded text-ink-faint transition-colors hover:bg-white/[0.06] hover:text-ink"
          >
            <ChevronDown
              className={cn('size-3.5 transition-transform duration-200', expanded && 'rotate-180')}
              aria-hidden="true"
            />
          </button>
        </td>
        <td className="px-4 py-3">
          <p className="text-[13px] text-ink">{scan.pageTitle ?? scan.domain}</p>
          <p className="mt-0.5 max-w-[280px] truncate font-mono text-[11px] text-ink-faint">
            {scan.targetUrl}
          </p>
        </td>
        <td className="px-4 py-3">
          <Badge tone={statusTone[scan.status] ?? 'neutral'}>{scan.status}</Badge>
        </td>
        <td className="num px-4 py-3 text-[12.5px] text-ink-muted">{scan.pagesScanned}</td>
        <td className="num px-4 py-3 text-[13px] text-ink">{formatNumber(scan.issueCount)}</td>
        <td className="px-4 py-3">
          {severities.length === 0 ? (
            <span className="text-[12px] text-ink-faint">—</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {severities.map((key) => (
                <Badge key={key} tone={severityTone[key]}>
                  {severityLabel[key]} {scan.violationsBySeverity[key]}
                </Badge>
              ))}
            </div>
          )}
        </td>
        <td className="num px-4 py-3 text-[12px] text-ink-muted">{formatDuration(scan.durationMs)}</td>
        <td className="px-4 py-3 font-mono text-[11.5px] text-ink-muted">
          {formatDateTime(scan.startedAt)}
        </td>
      </tr>
      {expanded ? (
        <tr className="bg-midnight-950/40">
          <td colSpan={8} className="px-4 py-4">
            <div className="rounded-xl border border-line bg-midnight-900/60 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-medium text-ink">Violation detail</p>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-faint">
                  {hostnameOf(scan.targetUrl)} · {scan.pagesScanned} page
                  {scan.pagesScanned === 1 ? '' : 's'}
                </p>
              </div>
              {scan.errorMessage ? (
                <p className="mb-3 rounded-md border border-severity-critical/20 bg-severity-critical/[0.06] px-3 py-2 text-[12px] text-severity-critical">
                  {scan.errorMessage}
                </p>
              ) : null}
              {scan.issues.length === 0 ? (
                <p className="text-[12.5px] text-ink-faint">
                  No axe-core violations are stored for this record.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {scan.issues.map((issue) => (
                    <li key={`${issue.ruleId}-${issue.pageUrl}`} className="flex flex-wrap items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                      <Badge tone={severityTone[issue.impact]}>{issue.impact}</Badge>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] text-ink">
                          <span className="font-mono text-[11.5px] text-cyan-soft">{issue.ruleId}</span>
                          <span className="mx-2 text-ink-faint" aria-hidden="true">·</span>
                          {issue.description}
                        </p>
                        <p className="mt-1 text-[11.5px] text-ink-faint">
                          {issue.nodeCount} node{issue.nodeCount === 1 ? '' : 's'} ·{' '}
                          {issue.wcagTags.join(', ') || 'no WCAG tags'}
                          {issue.helpUrl ? (
                            <>
                              {' · '}
                              <a
                                href={issue.helpUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="link-quiet"
                              >
                                rule reference
                              </a>
                            </>
                          ) : null}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  )
}
