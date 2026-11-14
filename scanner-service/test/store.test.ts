import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { ScanStore } from '../src/services/store.js'
import { countBySeverity } from '../src/utils/axeMapping.js'
import type { ScanIssue, ScanOutcome, Severity } from '../src/types.js'

function temporaryDatabase(): { directory: string; path: string } {
  const directory = mkdtempSync(join(tmpdir(), 'a11yscape-store-'))
  return { directory, path: join(directory, 'test.sqlite') }
}

function issue(ruleId: string, impact: Severity, pageUrl = 'https://example.com/'): ScanIssue {
  return {
    ruleId,
    impact,
    description: `Description for ${ruleId}`,
    helpUrl: `https://dequeuniversity.com/rules/axe/4.14/${ruleId}`,
    wcagTags: ['wcag2a'],
    nodeCount: 2,
    elements: ['main p'],
    pageUrl,
  }
}

function outcome(issues: ScanIssue[], overrides: Partial<ScanOutcome> = {}): ScanOutcome {
  return {
    status: 'completed',
    pageTitle: 'Example Domain',
    pagesScanned: 1,
    issueCount: issues.length,
    violationsBySeverity: countBySeverity(issues),
    issues,
    durationMs: 1234,
    metadata: {
      engine: 'axe-core',
      axe_version: '4.14.0',
      wcag_tags: 'wcag2a,wcag2aa',
    },
    ...overrides,
  }
}

test('stores normalized websites, scans, violations and metadata', () => {
  const { directory, path } = temporaryDatabase()
  const store = new ScanStore(path)

  try {
    const first = store.createQueued({
      targetUrl: 'https://example.com/',
      maxPages: 2,
      includeScreenshots: false,
    })
    const second = store.createQueued({
      targetUrl: 'https://example.com/about',
      maxPages: 1,
      includeScreenshots: true,
    })

    assert.equal(first.domain, 'example.com')
    assert.equal(second.domain, 'example.com')
    assert.equal(store.stats().totalDomains, 1, 'duplicate hostnames share one website row')
    assert.equal(store.stats().totalScans, 2)

    store.complete(
      first.id,
      outcome([issue('image-alt', 'critical'), issue('color-contrast', 'serious')]),
    )
    assert.equal(store.markRunning(second.id), true)
    store.fail(second.id, 'Navigation timed out')

    const record = store.get(first.id)
    assert.ok(record)
    assert.equal(record.status, 'completed')
    assert.equal(record.issueCount, 2)
    assert.deepEqual(record.violationsBySeverity, {
      critical: 1,
      serious: 1,
      moderate: 0,
      minor: 0,
    })
    assert.equal(record.issues.length, 2)
    assert.equal(record.issues[0].impact, 'critical')
    assert.deepEqual(record.issues[0].elements, ['main p'])

    const metadata = store.metadataFor(first.id)
    assert.equal(metadata.axe_version, '4.14.0')
    assert.equal(metadata.engine, 'axe-core')

    const failed = store.get(second.id)
    assert.ok(failed)
    assert.equal(failed.status, 'failed')
    assert.equal(failed.errorMessage, 'Navigation timed out')
    assert.equal(failed.issueCount, 0)
    assert.deepEqual(failed.issues, [])

    const stats = store.stats()
    assert.equal(stats.totalScans, 2)
    assert.equal(stats.totalDomains, 1)
    assert.equal(stats.totalIssues, 2)
    assert.ok(stats.latestScanAt)
    assert.deepEqual(stats.severityTotals, { critical: 1, serious: 1, moderate: 0, minor: 0 })

    store.close()

    const raw = new DatabaseSync(path, { readOnly: true })
    try {
      const websiteCount = raw.prepare('SELECT COUNT(*) AS count FROM websites').get() as unknown as {
        count: number
      }
      const violationCount = raw
        .prepare('SELECT COUNT(*) AS count FROM violations')
        .get() as unknown as { count: number }
      const metadataCount = raw
        .prepare('SELECT COUNT(*) AS count FROM scan_metadata')
        .get() as unknown as { count: number }

      assert.equal(websiteCount.count, 1)
      assert.equal(violationCount.count, 2)
      assert.ok(metadataCount.count >= 3)
    } finally {
      raw.close()
    }

    // Reopening the file is the same persistence path as restarting the service.
    const reopened = new ScanStore(path)
    try {
      const persisted = reopened.get(first.id)
      assert.ok(persisted)
      assert.equal(persisted.issues.length, 2)
      assert.equal(reopened.stats().totalScans, 2)
      assert.equal(reopened.stats().totalDomains, 1)
    } finally {
      reopened.close()
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('deduplicates the same rule and page before persisting violations', () => {
  const store = new ScanStore(':memory:')
  try {
    const queued = store.createQueued({
      targetUrl: 'https://duplicate.example/',
      maxPages: 1,
      includeScreenshots: false,
    })
    store.complete(queued.id, outcome([issue('image-alt', 'critical'), issue('image-alt', 'critical')]))
    const record = store.get(queued.id)
    assert.ok(record)
    assert.equal(record.issueCount, 1)
    assert.equal(record.violationsBySeverity.critical, 1)
  } finally {
    store.close()
  }
})

test('supports search, status/severity filters, server-side sorting and pagination', () => {
  const store = new ScanStore(':memory:')
  try {
    const specs = [
      { url: 'https://alpha.example/', title: 'Alpha', issues: [issue('image-alt', 'moderate')] },
      {
        url: 'https://beta.example/docs',
        title: 'Beta documentation',
        issues: [
          issue('image-alt', 'critical'),
          issue('color-contrast', 'serious'),
          issue('label', 'serious'),
          issue('region', 'moderate'),
          issue('heading-order', 'minor'),
        ],
      },
      {
        url: 'https://gamma.example/',
        title: 'Gamma',
        issues: [issue('image-alt', 'critical'), issue('color-contrast', 'serious')],
      },
    ]

    for (const spec of specs) {
      const queued = store.createQueued({
        targetUrl: spec.url,
        maxPages: 1,
        includeScreenshots: false,
      })
      store.complete(queued.id, outcome(spec.issues, { pageTitle: spec.title }))
    }

    const byIssues = store.list({ sort: 'issues', direction: 'desc' })
    assert.deepEqual(
      byIssues.records.map((record) => record.domain),
      ['beta.example', 'gamma.example', 'alpha.example'],
    )
    assert.equal(byIssues.records[0].issueCount, 5)

    const byTarget = store.list({ sort: 'target', direction: 'asc' })
    assert.deepEqual(
      byTarget.records.map((record) => record.pageTitle),
      ['Alpha', 'Beta documentation', 'Gamma'],
    )

    assert.equal(store.list({ query: 'beta' }).total, 1)
    assert.equal(store.list({ query: 'does-not-exist' }).total, 0)
    assert.equal(store.list({ severity: 'critical' }).total, 2)
    assert.equal(store.list({ severity: 'minor' }).total, 3)

    const paged = store.list({ page: 1, pageSize: 2, sort: 'issues', direction: 'desc' })
    assert.equal(paged.total, 3)
    assert.equal(paged.records.length, 2)
    assert.equal(paged.pageSize, 2)
    assert.equal(store.list({ page: 2, pageSize: 2 }).records.length, 1)

    assert.equal(store.exportRows({ severity: 'critical' }).length, 2)
  } finally {
    store.close()
  }
})

test('migrates a legacy JSON-column database without losing violations', () => {
  const { directory, path } = temporaryDatabase()
  const legacy = new DatabaseSync(path)
  legacy.exec(`
    CREATE TABLE scans (
      id TEXT PRIMARY KEY,
      target_url TEXT NOT NULL,
      domain TEXT NOT NULL,
      page_title TEXT,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      duration_ms INTEGER,
      pages_scanned INTEGER NOT NULL DEFAULT 0,
      issue_count INTEGER NOT NULL DEFAULT 0,
      severity_critical INTEGER NOT NULL DEFAULT 0,
      severity_serious INTEGER NOT NULL DEFAULT 0,
      severity_moderate INTEGER NOT NULL DEFAULT 0,
      severity_minor INTEGER NOT NULL DEFAULT 0,
      issues_json TEXT NOT NULL DEFAULT '[]',
      error_message TEXT,
      max_pages INTEGER NOT NULL DEFAULT 1,
      include_screenshots INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX scans_started_at_idx ON scans (started_at DESC);
  `)
  legacy
    .prepare(
      `INSERT INTO scans (
        id, target_url, domain, page_title, status, started_at, finished_at, duration_ms,
        pages_scanned, issue_count, severity_critical, severity_serious, severity_moderate,
        severity_minor, issues_json, max_pages, include_screenshots, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      'legacy-scan',
      'https://legacy.example/',
      'legacy.example',
      'Legacy page',
      'completed',
      '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:00:01.000Z',
      1000,
      1,
      2,
      1,
      1,
      0,
      0,
      JSON.stringify([issue('image-alt', 'critical', 'https://legacy.example/'), issue('label', 'serious', 'https://legacy.example/')]),
      3,
      0,
      '2026-01-01T00:00:00.000Z',
    )
  legacy.close()

  const store = new ScanStore(path)
  try {
    const record = store.get('legacy-scan')
    assert.ok(record)
    assert.equal(record.domain, 'legacy.example')
    assert.equal(record.issues.length, 2)
    assert.equal(record.issueCount, 2)
    assert.equal(store.metadataFor('legacy-scan').migrated_from, 'legacy-json-column')
    assert.equal(store.stats().totalDomains, 1)
  } finally {
    store.close()
  }

  const raw = new DatabaseSync(path, { readOnly: true })
  try {
    const violations = raw
      .prepare('SELECT COUNT(*) AS count FROM violations')
      .get() as unknown as { count: number }
    const version = raw.prepare('PRAGMA user_version').get() as unknown as { user_version: number }
    assert.equal(violations.count, 2)
    assert.equal(version.user_version, 2)
  } finally {
    raw.close()
    rmSync(directory, { recursive: true, force: true })
  }
})
