import type { ServerResponse } from 'node:http'
import { sendText } from '../middleware/http.js'
import type { ScanStore } from '../services/store.js'
import type { ScanRecord } from '../types.js'
import { parseScanFilters } from './scans.js'

const COLUMNS = [
  'scan_id',
  'target_url',
  'domain',
  'page_title',
  'status',
  'started_at',
  'finished_at',
  'duration_ms',
  'pages_scanned',
  'issue_count',
  'critical',
  'serious',
  'moderate',
  'minor',
  'error_message',
] as const

function cell(value: string | number | undefined): string {
  if (value === undefined) return ''
  const raw = String(value)
  // Prevent spreadsheet formula injection in free-text columns.
  const guarded = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
  return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded
}

function rowFor(record: ScanRecord): string {
  return [
    record.id,
    record.targetUrl,
    record.domain,
    record.pageTitle,
    record.status,
    record.startedAt,
    record.finishedAt,
    record.durationMs,
    record.pagesScanned,
    record.issueCount,
    record.violationsBySeverity.critical,
    record.violationsBySeverity.serious,
    record.violationsBySeverity.moderate,
    record.violationsBySeverity.minor,
    record.errorMessage,
  ]
    .map((value) => cell(value))
    .join(',')
}

export function handleScanExport(url: URL, res: ServerResponse, store: ScanStore): void {
  const records = store.exportRows(parseScanFilters(url))
  const csv = [COLUMNS.join(','), ...records.map(rowFor)].join('\r\n')
  sendText(res, 200, `${csv}\r\n`, 'text/csv; charset=utf-8', {
    'Content-Disposition': 'attachment; filename="a11yscape-scans.csv"',
  })
}
