/**
 * Scanner service contract.
 *
 * These types intentionally mirror `frontend/src/types/index.ts`. The frontend
 * consumes the JSON shapes below without any translation layer, so a change
 * here must be made in the frontend types at the same time.
 */

export type Severity = 'critical' | 'serious' | 'moderate' | 'minor'

export const SEVERITY_ORDER: Severity[] = ['critical', 'serious', 'moderate', 'minor']

export type ScanStatus = 'queued' | 'running' | 'completed' | 'partial' | 'failed'

export interface ScanIssue {
  ruleId: string
  impact: Severity
  description: string
  helpUrl?: string
  wcagTags: string[]
  nodeCount: number
  /** A short sample of affected element selectors (never the full node list). */
  elements?: string[]
  pageUrl: string
}

export interface ScanRecord {
  id: string
  targetUrl: string
  domain: string
  pageTitle?: string
  status: ScanStatus
  startedAt: string
  finishedAt?: string
  durationMs?: number
  pagesScanned: number
  issueCount: number
  violationsBySeverity: Record<Severity, number>
  issues: ScanIssue[]
  errorMessage?: string
}

export interface PaginatedScans {
  total: number
  page: number
  pageSize: number
  records: ScanRecord[]
}

export type ScanSortKey =
  | 'target'
  | 'status'
  | 'pages'
  | 'issues'
  | 'severity'
  | 'duration'
  | 'captured'

export type SortDirection = 'asc' | 'desc'

export interface ScanFilters {
  query?: string
  severity?: Severity | 'all'
  status?: ScanStatus | 'all'
  page?: number
  pageSize?: number
  sort?: ScanSortKey
  direction?: SortDirection
}

export interface StartScanInput {
  url: string
  maxPages: number
  includeScreenshots: boolean
}

export interface StartScanResponse {
  scanId: string
  status: ScanStatus
  queuedAt: string
}

export interface DatasetStats {
  totalScans: number
  totalDomains: number
  totalIssues: number
  latestScanAt: string | null
  severityTotals: Record<Severity, number>
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error'
  service: string
  version: string
  startedAt: string
  uptimeSeconds: number
  queueDepth: number
}

/** Internal shapes ------------------------------------------------------- */

export interface ScanJob {
  id: string
  targetUrl: string
  maxPages: number
  includeScreenshots: boolean
}

export interface ScanOutcome {
  status: Extract<ScanStatus, 'completed' | 'partial' | 'failed'>
  pageTitle?: string
  pagesScanned: number
  issueCount: number
  violationsBySeverity: Record<Severity, number>
  issues: ScanIssue[]
  durationMs: number
  errorMessage?: string
  /** Scan provenance persisted in scan_metadata (engine versions, limits). */
  metadata?: Record<string, string>
}

export interface ScanRequest extends ScanJob {
  timeoutMs: number
  userAgent: string
  screenshotsDir: string
  browserExecutablePath?: string
}

export type ScanFunction = (request: ScanRequest) => Promise<ScanOutcome>

export function emptySeverityCounts(): Record<Severity, number> {
  return { critical: 0, serious: 0, moderate: 0, minor: 0 }
}
