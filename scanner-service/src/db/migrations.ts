import type { DatabaseSync } from 'node:sqlite'
import type { ScanIssue } from '../types.js'

export interface Migration {
  version: number
  name: string
  up: (db: DatabaseSync) => void
}

interface LegacyScanRow {
  id: string
  target_url: string
  domain: string
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
  issues_json: string
  error_message: string | null
  max_pages: number
  include_screenshots: number
  created_at: string
}

const CORE_SCHEMA = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS websites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hostname TEXT NOT NULL UNIQUE,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scans (
  id TEXT PRIMARY KEY,
  website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE RESTRICT,
  target_url TEXT NOT NULL,
  page_title TEXT,
  status TEXT NOT NULL CHECK (status IN ('queued','running','completed','partial','failed')),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  duration_ms INTEGER,
  pages_scanned INTEGER NOT NULL DEFAULT 0,
  issue_count INTEGER NOT NULL DEFAULT 0,
  severity_critical INTEGER NOT NULL DEFAULT 0,
  severity_serious INTEGER NOT NULL DEFAULT 0,
  severity_moderate INTEGER NOT NULL DEFAULT 0,
  severity_minor INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  max_pages INTEGER NOT NULL DEFAULT 1,
  include_screenshots INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS violations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  impact TEXT NOT NULL CHECK (impact IN ('critical','serious','moderate','minor')),
  description TEXT NOT NULL,
  help_url TEXT,
  wcag_tags TEXT NOT NULL DEFAULT '[]',
  node_count INTEGER NOT NULL DEFAULT 0,
  elements TEXT NOT NULL DEFAULT '[]',
  UNIQUE (scan_id, page_url, rule_id)
);

CREATE TABLE IF NOT EXISTS scan_metadata (
  scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (scan_id, key)
);

CREATE INDEX IF NOT EXISTS idx_scans_started_at ON scans (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_website ON scans (website_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans (status);
CREATE INDEX IF NOT EXISTS idx_scans_issue_count ON scans (issue_count DESC);
CREATE INDEX IF NOT EXISTS idx_violations_scan ON violations (scan_id);
CREATE INDEX IF NOT EXISTS idx_violations_rule ON violations (rule_id);
`

function tableExists(db: DatabaseSync, table: string): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table) as unknown as { name: string } | undefined
  return Boolean(row)
}

function hasColumn(db: DatabaseSync, table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as unknown as Array<{
    name: string
  }>
  return rows.some((row) => row.name === column)
}

function websiteIdFor(db: DatabaseSync, hostname: string, timestamp: string): number {
  db.prepare(
    `INSERT INTO websites (hostname, first_seen_at, last_seen_at) VALUES (?, ?, ?)
     ON CONFLICT(hostname) DO NOTHING`,
  ).run(hostname, timestamp, timestamp)
  const row = db.prepare('SELECT id FROM websites WHERE hostname = ?').get(hostname) as unknown as {
    id: number
  }
  return Number(row.id)
}

/**
 * Older builds kept every violation in a JSON column on `scans`. If that shape
 * is detected it is copied into the normalized tables before being dropped.
 */
function migrateLegacyScanTable(db: DatabaseSync): void {
  const legacy = tableExists(db, 'scans') && !hasColumn(db, 'scans', 'website_id')
  if (!legacy) return

  db.exec('ALTER TABLE scans RENAME TO scans_legacy;')
  db.exec(CORE_SCHEMA)

  const rows = db
    .prepare('SELECT * FROM scans_legacy ORDER BY created_at ASC')
    .all() as unknown as LegacyScanRow[]

  const insertScan = db.prepare(
    `INSERT OR IGNORE INTO scans (
       id, website_id, target_url, page_title, status, started_at, finished_at,
       duration_ms, pages_scanned, issue_count, severity_critical, severity_serious,
       severity_moderate, severity_minor, error_message, max_pages, include_screenshots, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const insertViolation = db.prepare(
    `INSERT OR IGNORE INTO violations (
       scan_id, page_url, rule_id, impact, description, help_url, wcag_tags, node_count, elements
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const insertMetadata = db.prepare(
    `INSERT OR IGNORE INTO scan_metadata (scan_id, key, value) VALUES (?, ?, ?)`,
  )

  for (const row of rows) {
    const hostname = row.domain.toLowerCase()
    const websiteId = websiteIdFor(db, hostname, row.created_at)
    insertScan.run(
      row.id,
      websiteId,
      row.target_url,
      row.page_title,
      row.status,
      row.started_at,
      row.finished_at,
      row.duration_ms,
      row.pages_scanned,
      row.issue_count,
      row.severity_critical,
      row.severity_serious,
      row.severity_moderate,
      row.severity_minor,
      row.error_message,
      row.max_pages,
      row.include_screenshots,
      row.created_at,
    )

    let issues: ScanIssue[] = []
    try {
      issues = JSON.parse(row.issues_json) as ScanIssue[]
    } catch {
      issues = []
    }
    for (const issue of issues) {
      insertViolation.run(
        row.id,
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

    insertMetadata.run(row.id, 'migrated_from', 'legacy-json-column')
    insertMetadata.run(row.id, 'max_pages', String(row.max_pages))
    insertMetadata.run(row.id, 'include_screenshots', String(row.include_screenshots))
  }

  db.exec('DROP TABLE scans_legacy;')
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'normalised_schema',
    up(db) {
      migrateLegacyScanTable(db)
      db.exec(CORE_SCHEMA)
    },
  },
  {
    version: 2,
    name: 'dataset_query_indexes',
    up(db) {
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_scans_severity ON scans (
          severity_critical DESC, severity_serious DESC,
          severity_moderate DESC, severity_minor DESC
        );
        CREATE INDEX IF NOT EXISTS idx_violations_impact ON violations (impact);
        CREATE INDEX IF NOT EXISTS idx_violations_page ON violations (scan_id, page_url);
      `)
    },
  },
]

function ensureMigrationTable(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `)
}

export interface MigrationResult {
  applied: number[]
  currentVersion: number
}

export function migrate(db: DatabaseSync): MigrationResult {
  ensureMigrationTable(db)
  const appliedRows = db.prepare('SELECT version FROM schema_migrations').all() as unknown as Array<{
    version: number
  }>
  const appliedVersions = new Set(appliedRows.map((row) => Number(row.version)))
  const applied: number[] = []

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) continue
    db.exec('BEGIN IMMEDIATE;')
    try {
      migration.up(db)
      db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)').run(
        migration.version,
        migration.name,
        new Date().toISOString(),
      )
      db.exec('COMMIT;')
      applied.push(migration.version)
    } catch (error) {
      db.exec('ROLLBACK;')
      throw error
    }
  }

  const current = db.prepare('SELECT MAX(version) AS version FROM schema_migrations').get() as unknown as {
    version: number | null
  }
  const currentVersion = Number(current.version ?? 0)
  db.exec(`PRAGMA user_version = ${currentVersion};`)

  return { applied, currentVersion }
}
