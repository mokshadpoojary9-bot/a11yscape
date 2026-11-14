import { randomUUID } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import { openDatabase } from '../db/database.js'
import type {
  DatasetStats,
  PaginatedScans,
  ScanFilters,
  ScanIssue,
  ScanJob,
  ScanOutcome,
  ScanRecord,
  ScanSortKey,
  ScanStatus,
  Severity,
} from '../types.js'

interface ScanRow {
  id: string
  website_id: number
  hostname: string
  target_url: string
  page_title: string | null
  status: string
  started_at: string
  finished_at: string | null
  duration_ms: number | null
  pages_scanned: number
  issue_count: number
  severity_critical: number
  severity_serious: number
  severity_moderate: number
  severity_minor: number
  error_message: string | null
  max_pages: number
  include_screenshots: number
  created_at: string
}

interface ViolationRow {
  scan_id: string
  page_url: string
  rule_id: string
  impact: string
  description: string
  help_url: string | null
  wcag_tags: string
  node_count: number
  elements: string
}

const SEVERITY_RANK = `CASE impact
  WHEN 'critical' THEN 0 WHEN 'serious' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END`

const SORT_COLUMNS: Record<ScanSortKey, string> = {
  target: 'COALESCE(s.page_title, w.hostname) COLLATE NOCASE',
  status: 's.status',
  pages: 's.pages_scanned',
  issues: 's.issue_count',
  severity:
    '(s.severity_critical + s.severity_serious + s.severity_moderate + s.severity_minor)',
  duration: 'COALESCE(s.duration_ms, 0)',
  captured: 's.started_at',
}

function nowIso(): string {
  return new Date().toISOString()
}

function parseJsonArray<T>(value: string): T[] {
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function toRecord(row: ScanRow, issues: ScanIssue[]): ScanRecord {
  const record: ScanRecord = {
    id: row.id,
    targetUrl: row.target_url,
    domain: row.hostname,
    status: row.status as ScanStatus,
    startedAt: row.started_at,
    pagesScanned: row.pages_scanned,
    issueCount: row.issue_count,
    violationsBySeverity: {
      critical: row.severity_critical,
      serious: row.severity_serious,
      moderate: row.severity_moderate,
      minor: row.severity_minor,
    },
    issues,
  }
  if (row.page_title) record.pageTitle = row.page_title
  if (row.finished_at) record.finishedAt = row.finished_at
  if (row.duration_ms !== null) record.durationMs = row.duration_ms
  if (row.error_message) record.errorMessage = row.error_message
  return record
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`)
}

interface WhereClause {
  sql: string
  params: Array<string | number>
}

function buildWhere(filters: ScanFilters): WhereClause {
  const clauses: string[] = []
  const params: Array<string | number> = []

  if (filters.query) {
    const pattern = `%${escapeLike(filters.query)}%`
    clauses.push(
      "(s.target_url LIKE ? ESCAPE '\\' OR w.hostname LIKE ? ESCAPE '\\' OR COALESCE(s.page_title, '') LIKE ? ESCAPE '\\')",
    )
    params.push(pattern, pattern, pattern)
  }

  if (filters.status && filters.status !== 'all') {
    clauses.push('s.status = ?')
    params.push(filters.status)
  }

  if (filters.severity && filters.severity !== 'all') {
    // "Minimum severity" means: at least one issue at this level or above.
    switch (filters.severity) {
      case 'critical':
        clauses.push('s.severity_critical > 0')
        break
      case 'serious':
        clauses.push('(s.severity_serious > 0 OR s.severity_critical > 0)')
        break
      case 'moderate':
        clauses.push(
          '(s.severity_moderate > 0 OR s.severity_serious > 0 OR s.severity_critical > 0)',
        )
        break
      case 'minor':
        clauses.push('s.issue_count > 0')
        break
    }
  }

  return {
    sql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  }
}

function buildOrderBy(filters: ScanFilters): string {
  const key: ScanSortKey = filters.sort ?? 'captured'
  const direction =
    filters.direction ?? (key === 'captured' ? 'desc' : 'asc')
  return `ORDER BY ${SORT_COLUMNS[key]} ${direction === 'desc' ? 'DESC' : 'ASC'}, s.id DESC`
}

/** Derived aggregates are always computed from the stored violations. */
function severityCounts(issues: ScanIssue[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { critical: 0, serious: 0, moderate: 0, minor: 0 }
  for (const issue of issues) counts[issue.impact] += 1
  return counts
}

export class ScanStore {
  private readonly db: DatabaseSync

  constructor(databasePath: string) {
    this.db = openDatabase(databasePath)
  }

  private transaction<T>(work: () => T): T {
    this.db.exec('BEGIN IMMEDIATE;')
    try {
      const result = work()
      this.db.exec('COMMIT;')
      return result
    } catch (error) {
      this.db.exec('ROLLBACK;')
      throw error
    }
  }

  private websiteIdFor(hostname: string, timestamp: string): number {
    this.db
      .prepare(
        `INSERT INTO websites (hostname, first_seen_at, last_seen_at) VALUES (?, ?, ?)
         ON CONFLICT(hostname) DO UPDATE SET last_seen_at = excluded.last_seen_at`,
      )
      .run(hostname, timestamp, timestamp)
    const row = this.db.prepare('SELECT id FROM websites WHERE hostname = ?').get(hostname) as unknown as {
      id: number
    }
    return Number(row.id)
  }

  createQueued(input: {
    targetUrl: string
    maxPages: number
    includeScreenshots: boolean
  }): ScanRecord {
    const id = randomUUID()
    const timestamp = nowIso()
    const url = new URL(input.targetUrl)
    const hostname = url.hostname.toLowerCase()

    this.transaction(() => {
      const websiteId = this.websiteIdFor(hostname, timestamp)
      this.db
        .prepare(
          `INSERT INTO scans (
             id, website_id, target_url, status, started_at, max_pages,
             include_screenshots, created_at
           ) VALUES (?, ?, ?, 'queued', ?, ?, ?, ?)`,
        )
        .run(
          id,
          websiteId,
          url.toString(),
          timestamp,
          input.maxPages,
          input.includeScreenshots ? 1 : 0,
          timestamp,
        )
    })

    const record = this.get(id)
    if (!record) throw new Error('Queued scan could not be read back from the database.')
    return record
  }

  get(id: string): ScanRecord | null {
    const row = this.scanRows('WHERE s.id = ?', [id], '')[0]
    if (!row) return null
    const issues = this.issuesFor([row.id]).get(row.id) ?? []
    return toRecord(row, issues)
  }

  getJob(id: string): ScanJob | null {
    const row = this.db
      .prepare('SELECT id, target_url, max_pages, include_screenshots FROM scans WHERE id = ?')
      .get(id) as unknown as
      | { id: string; target_url: string; max_pages: number; include_screenshots: number }
      | undefined
    if (!row) return null
    return {
      id: row.id,
      targetUrl: row.target_url,
      maxPages: row.max_pages,
      includeScreenshots: row.include_screenshots === 1,
    }
  }

  markRunning(id: string): boolean {
    const result = this.db
      .prepare("UPDATE scans SET status = 'running', started_at = ? WHERE id = ? AND status = 'queued'")
      .run(nowIso(), id)
    return Number(result.changes) > 0
  }

  complete(id: string, outcome: ScanOutcome): void {
    // One row per rule per page; axe can theoretically repeat a rule/page pair.
    const issues = Array.from(
      new Map(outcome.issues.map((issue) => [`${issue.pageUrl}\u0000${issue.ruleId}`, issue])).values(),
    )
    const counts = severityCounts(issues)
    const timestamp = nowIso()

    this.transaction(() => {
      this.db
        .prepare(
          `UPDATE scans SET
             status = ?, page_title = ?, finished_at = ?, duration_ms = ?,
             pages_scanned = ?, issue_count = ?, severity_critical = ?,
             severity_serious = ?, severity_moderate = ?, severity_minor = ?,
             error_message = ?
           WHERE id = ?`,
        )
        .run(
          outcome.status,
          outcome.pageTitle ?? null,
          timestamp,
          Math.max(0, Math.round(outcome.durationMs)),
          outcome.pagesScanned,
          issues.length,
          counts.critical,
          counts.serious,
          counts.moderate,
          counts.minor,
          outcome.errorMessage ?? null,
          id,
        )

      this.db.prepare('DELETE FROM violations WHERE scan_id = ?').run(id)
      const insertViolation = this.db.prepare(
        `INSERT OR IGNORE INTO violations (
           scan_id, page_url, rule_id, impact, description, help_url,
           wcag_tags, node_count, elements
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      for (const issue of issues) {
        insertViolation.run(
          id,
          issue.pageUrl,
          issue.ruleId,
          issue.impact,
          issue.description,
          issue.helpUrl ?? null,
          JSON.stringify(issue.wcagTags ?? []),
          issue.nodeCount ?? 0,
          JSON.stringify(issue.elements ?? []),
        )
      }

      const insertMetadata = this.db.prepare(
        `INSERT INTO scan_metadata (scan_id, key, value) VALUES (?, ?, ?)
         ON CONFLICT(scan_id, key) DO UPDATE SET value = excluded.value`,
      )
      for (const [key, value] of Object.entries(outcome.metadata ?? {})) {
        insertMetadata.run(id, key.slice(0, 100), String(value).slice(0, 2000))
      }

      this.touchWebsite(id, timestamp)
    })
  }

  fail(id: string, message: string): void {
    const timestamp = nowIso()
    this.transaction(() => {
      this.db
        .prepare(
          "UPDATE scans SET status = 'failed', finished_at = ?, error_message = ?, pages_scanned = 0, issue_count = 0 WHERE id = ?",
        )
        .run(timestamp, message.slice(0, 1000), id)
      this.touchWebsite(id, timestamp)
    })
  }

  private touchWebsite(scanId: string, timestamp: string): void {
    this.db
      .prepare(
        `UPDATE websites SET last_seen_at = ?
         WHERE id = (SELECT website_id FROM scans WHERE id = ?)`,
      )
      .run(timestamp, scanId)
  }

  list(filters: ScanFilters): PaginatedScans {
    const page = Math.max(1, Math.trunc(filters.page ?? 1))
    const pageSize = Math.min(100, Math.max(1, Math.trunc(filters.pageSize ?? 20)))
    const where = buildWhere(filters)

    const totalRow = this.db
      .prepare(
        `SELECT COUNT(*) AS total FROM scans s
         JOIN websites w ON w.id = s.website_id ${where.sql}`,
      )
      .get(...where.params) as unknown as { total: number }

    const rows = this.scanRows(
      where.sql,
      where.params,
      `${buildOrderBy(filters)} LIMIT ? OFFSET ?`,
      [pageSize, (page - 1) * pageSize],
    )
    const issues = this.issuesFor(rows.map((row) => row.id))

    return {
      total: Number(totalRow.total),
      page,
      pageSize,
      records: rows.map((row) => toRecord(row, issues.get(row.id) ?? [])),
    }
  }

  exportRows(filters: ScanFilters): ScanRecord[] {
    const where = buildWhere(filters)
    const rows = this.scanRows(where.sql, where.params, buildOrderBy(filters))
    const issues = this.issuesFor(rows.map((row) => row.id))
    return rows.map((row) => toRecord(row, issues.get(row.id) ?? []))
  }

  private scanRows(
    whereSql: string,
    params: Array<string | number>,
    tail: string,
    extraParams: Array<string | number> = [],
  ): ScanRow[] {
    return this.db
      .prepare(
        `SELECT s.*, w.hostname AS hostname FROM scans s
         JOIN websites w ON w.id = s.website_id ${whereSql} ${tail}`,
      )
      .all(...params, ...extraParams) as unknown as ScanRow[]
  }

  private issuesFor(scanIds: string[]): Map<string, ScanIssue[]> {
    const result = new Map<string, ScanIssue[]>()
    if (scanIds.length === 0) return result
    const placeholders = scanIds.map(() => '?').join(', ')
    const rows = this.db
      .prepare(
        `SELECT scan_id, page_url, rule_id, impact, description, help_url,
                wcag_tags, node_count, elements
         FROM violations
         WHERE scan_id IN (${placeholders})
         ORDER BY scan_id, ${SEVERITY_RANK}, rule_id, page_url`,
      )
      .all(...scanIds) as unknown as ViolationRow[]

    for (const row of rows) {
      const issue: ScanIssue = {
        ruleId: row.rule_id,
        impact: row.impact as Severity,
        description: row.description,
        wcagTags: parseJsonArray<string>(row.wcag_tags),
        nodeCount: row.node_count,
        pageUrl: row.page_url,
      }
      if (row.help_url) issue.helpUrl = row.help_url
      const elements = parseJsonArray<string>(row.elements)
      if (elements.length > 0) issue.elements = elements
      const list = result.get(row.scan_id) ?? []
      list.push(issue)
      result.set(row.scan_id, list)
    }
    return result
  }

  metadataFor(id: string): Record<string, string> {
    const rows = this.db
      .prepare('SELECT key, value FROM scan_metadata WHERE scan_id = ? ORDER BY key')
      .all(id) as unknown as Array<{ key: string; value: string }>
    return Object.fromEntries(rows.map((row) => [row.key, row.value]))
  }

  stats(): DatasetStats {
    const row = this.db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM scans) AS total_scans,
           (SELECT COUNT(*) FROM websites) AS total_domains,
           (SELECT COALESCE(SUM(issue_count), 0) FROM scans) AS total_issues,
           (SELECT MAX(started_at) FROM scans) AS latest_scan_at,
           (SELECT COALESCE(SUM(severity_critical), 0) FROM scans) AS critical,
           (SELECT COALESCE(SUM(severity_serious), 0) FROM scans) AS serious,
           (SELECT COALESCE(SUM(severity_moderate), 0) FROM scans) AS moderate,
           (SELECT COALESCE(SUM(severity_minor), 0) FROM scans) AS minor`,
      )
      .get() as unknown as {
      total_scans: number
      total_domains: number
      total_issues: number
      latest_scan_at: string | null
      critical: number
      serious: number
      moderate: number
      minor: number
    }

    return {
      totalScans: Number(row.total_scans),
      totalDomains: Number(row.total_domains),
      totalIssues: Number(row.total_issues),
      latestScanAt: row.latest_scan_at || null,
      severityTotals: {
        critical: Number(row.critical),
        serious: Number(row.serious),
        moderate: Number(row.moderate),
        minor: Number(row.minor),
      },
    }
  }

  queueDepth(): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS depth FROM scans WHERE status = 'queued'")
      .get() as unknown as { depth: number }
    return Number(row.depth)
  }

  /**
   * A process restart cannot resume a browser mid-scan. In-flight records are
   * marked failed honestly; queued records are returned so the runner can pick
   * them up again.
   */
  recoverInterrupted(): string[] {
    this.db
      .prepare(
        "UPDATE scans SET status = 'failed', finished_at = ?, error_message = ? WHERE status = 'running'",
      )
      .run(nowIso(), 'The scanner service restarted before this scan finished.')
    const rows = this.db
      .prepare("SELECT id FROM scans WHERE status = 'queued' ORDER BY created_at ASC")
      .all() as unknown as Array<{ id: string }>
    return rows.map((row) => row.id)
  }

  close(): void {
    this.db.close()
  }
}
