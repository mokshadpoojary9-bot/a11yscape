/**
 * Shared API and domain types.
 *
 * These describe the contract that the Phase 2 scanner service and the Phase 4+
 * R Plumber API must implement. Nothing in this file produces data.
 */

export type Severity = 'critical' | 'serious' | 'moderate' | 'minor'

export const SEVERITY_ORDER: Severity[] = ['critical', 'serious', 'moderate', 'minor']

export type ServiceState = 'checking' | 'online' | 'offline' | 'degraded'

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error'
  service: string
  version?: string
  startedAt?: string
  uptimeSeconds?: number
  queueDepth?: number
}

/** A single axe-core rule violation aggregated for one scanned page. */
export interface ScanIssue {
  ruleId: string
  impact: Severity
  description: string
  helpUrl?: string
  wcagTags: string[]
  nodeCount: number
  pageUrl: string
}

export type ScanStatus = 'queued' | 'running' | 'completed' | 'partial' | 'failed'

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

export interface ScanFilters {
  query?: string
  severity?: Severity | 'all'
  status?: ScanStatus | 'all'
  page?: number
  pageSize?: number
}

/** Request payload for POST /api/scans */
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

/** ---------------------------------------------------------------- Analytics */

export interface SeverityDistribution {
  severity: Severity
  count: number
}

export interface WcagCriterionSummary {
  criterion: string
  title: string
  level: 'A' | 'AA' | 'AAA'
  violationCount: number
}

export interface DomainSummary {
  domain: string
  scans: number
  meanIssues: number
}

export interface AnalysisRun {
  id: string
  createdAt: string
  datasetRows: number
  method: string
  severityDistribution: SeverityDistribution[]
  wcagSummary: WcagCriterionSummary[]
  domainSummaries: DomainSummary[]
  /** Descriptive statistics emitted by R, keyed by metric. */
  descriptives: Array<{ metric: string; mean: number; median: number; sd: number; min: number; max: number }>
  /** Correlation matrix from R for issue-count variables. */
  correlation: { variables: string[]; matrix: number[][] } | null
  notes: string[]
}

export interface AnalysisRequest {
  datasetId?: string
  includeCorrelation: boolean
}

/** --------------------------------------------------------------- ML results */

export interface ClusterProfile {
  clusterId: number
  label: string
  size: number
  meanIssueCount: number
  dominantSeverity: Severity
  topRules: string[]
}

export interface OutlierRecord {
  scanId: string
  domain: string
  anomalyScore: number
  issueCount: number
}

export interface ModelRun {
  id: string
  createdAt: string
  algorithm: 'kmeans' | 'hierarchical' | 'isolation-forest'
  datasetRows: number
  status: 'completed' | 'failed' | 'insufficient-data'
  silhouette?: number | null
  clusters: ClusterProfile[]
  outliers: OutlierRecord[]
  notes: string[]
}

/** ------------------------------------------------------------ Recommendations */

export type RecommendationPriority = 'high' | 'medium' | 'low'

export interface Recommendation {
  id: string
  ruleId: string
  title: string
  rationale: string
  priority: RecommendationPriority
  affectedScans: number
  affectedDomains: string[]
  wcagCriteria: string[]
  remediation: string
}

/** -------------------------------------------------------------------- Reports */

export interface ReportRecord {
  id: string
  title: string
  format: 'csv' | 'json' | 'pdf' | 'html'
  createdAt: string
  sizeBytes: number
  downloadUrl: string
}

export interface DatasetStats {
  totalScans: number
  totalDomains: number
  totalIssues: number
  latestScanAt: string | null
  severityTotals: Record<Severity, number>
}
