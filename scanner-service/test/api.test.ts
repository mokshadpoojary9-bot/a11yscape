import test from 'node:test'
import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { createApp } from '../src/app.js'
import { loadConfig } from '../src/config.js'
import { ScanStore } from '../src/services/store.js'
import { validateTargetUrl } from '../src/utils/urlGuard.js'

const config = loadConfig({
  DATABASE_PATH: ':memory:',
  PORT: '0',
  CORS_ORIGIN: 'http://localhost:5173',
  SCAN_MAX_PAGES: '5',
  ALLOWED_PORTS: '80,443',
} as NodeJS.ProcessEnv)

const validateUrl = (raw: unknown, options = {}) =>
  validateTargetUrl(raw, {
    ...options,
    resolver: async () => [{ address: '93.184.216.34', family: 4 }],
  })

test('scanner HTTP API validates input, exposes health and persists scan records', async () => {
  const store = new ScanStore(':memory:')
  const enqueued: string[] = []
  const runner = { enqueue: (id: string) => enqueued.push(id) }
  const server = createApp({
    store,
    runner,
    config,
    validateUrl,
    startedAt: new Date(Date.now() - 5000).toISOString(),
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  const base = `http://127.0.0.1:${port}`

  try {
    const health = await fetch(`${base}/health`)
    assert.equal(health.status, 200)
    const healthBody = (await health.json()) as Record<string, unknown>
    assert.equal(healthBody.status, 'ok')
    assert.equal(healthBody.service, 'A11YSCAPE scanner service')
    assert.equal(healthBody.queueDepth, 0)
    assert.equal(typeof healthBody.uptimeSeconds, 'number')

    const preflight = await fetch(`${base}/api/scans`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
      },
    })
    assert.equal(preflight.status, 204)
    assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:5173')

    const blockedOrigin = await fetch(`${base}/api/scans`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.example' },
    })
    assert.equal(blockedOrigin.status, 403)

    const missingUrl = await fetch(`${base}/api/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxPages: 1, includeScreenshots: false }),
    })
    assert.equal(missingUrl.status, 400)

    const unsafe = await fetch(`${base}/api/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://127.0.0.1/', maxPages: 1, includeScreenshots: false }),
    })
    assert.equal(unsafe.status, 400)
    assert.match(((await unsafe.json()) as { error: string }).error, /Local, private and reserved/)

    const tooManyPages = await fetch(`${base}/api/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/', maxPages: 11, includeScreenshots: false }),
    })
    assert.equal(tooManyPages.status, 400)

    const malformed = await fetch(`${base}/api/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    })
    assert.equal(malformed.status, 400)

    const created = await fetch(`${base}/api/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/', maxPages: 3, includeScreenshots: false }),
    })
    assert.equal(created.status, 202)
    const queued = (await created.json()) as { scanId: string; status: string; queuedAt: string }
    assert.equal(queued.status, 'queued')
    assert.equal(typeof queued.queuedAt, 'string')
    assert.equal(enqueued.includes(queued.scanId), true)

    const list = await fetch(`${base}/api/scans?page=1&pageSize=10`)
    assert.equal(list.status, 200)
    const page = (await list.json()) as { total: number; records: Array<{ id: string; status: string }> }
    assert.equal(page.total, 1)
    assert.equal(page.records[0].id, queued.scanId)
    assert.equal(page.records[0].status, 'queued')

    const detail = await fetch(`${base}/api/scans/${queued.scanId}`)
    assert.equal(detail.status, 200)
    assert.equal(((await detail.json()) as { domain: string }).domain, 'example.com')

    const stats = await fetch(`${base}/api/stats`)
    const statsBody = (await stats.json()) as Record<string, unknown>
    assert.equal(statsBody.totalScans, 1)
    assert.equal(statsBody.totalDomains, 1)
    assert.equal(statsBody.totalIssues, 0)

    const invalidSort = await fetch(`${base}/api/scans?sort=not-a-column`)
    assert.equal(invalidSort.status, 400)
    const invalidSeverity = await fetch(`${base}/api/scans?severity=catastrophic`)
    assert.equal(invalidSeverity.status, 400)

    const missing = await fetch(`${base}/api/scans/does-not-exist`)
    assert.equal(missing.status, 404)

    const csv = await fetch(`${base}/api/exports/scans.csv`)
    assert.equal(csv.status, 200)
    assert.match(csv.headers.get('content-type') ?? '', /text\/csv/)
    const body = await csv.text()
    assert.match(body, /^scan_id,target_url,domain/)
    assert.match(body, /https:\/\/example\.com\//)

    const notAllowed = await fetch(`${base}/api/scans`, { method: 'DELETE' })
    assert.equal(notAllowed.status, 405)
    assert.match(notAllowed.headers.get('allow') ?? '', /GET, POST/)
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    store.close()
  }
})
