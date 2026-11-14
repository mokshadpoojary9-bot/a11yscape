import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AppConfig } from '../config.js'
import { HttpError, readJsonBody, sendJson } from '../middleware/http.js'
import type { ScanStore } from '../services/store.js'
import type {
  ScanFilters,
  ScanSortKey,
  Severity,
  SortDirection,
  StartScanResponse,
} from '../types.js'
import type { UrlGuardOptions } from '../utils/urlGuard.js'

const SEVERITIES: Severity[] = ['critical', 'serious', 'moderate', 'minor']
const STATUSES = ['queued', 'running', 'completed', 'partial', 'failed'] as const
const SORT_KEYS: ScanSortKey[] = [
  'target',
  'status',
  'pages',
  'issues',
  'severity',
  'duration',
  'captured',
]

export interface ScanRouteDependencies {
  store: ScanStore
  runner: { enqueue: (id: string) => void }
  config: AppConfig
  validateUrl: (raw: unknown, options?: UrlGuardOptions) => Promise<URL>
}

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return parsed
}

export function parseScanFilters(url: URL): ScanFilters {
  const params = url.searchParams
  const filters: ScanFilters = {
    page: parsePositiveInteger(params.get('page'), 1),
    pageSize: Math.min(100, parsePositiveInteger(params.get('pageSize'), 20)),
  }

  const query = params.get('query')?.trim()
  if (query) filters.query = query.slice(0, 200)

  const severity = params.get('severity')
  if (severity && severity !== 'all') {
    if (!SEVERITIES.includes(severity as Severity)) {
      throw new HttpError(400, 'Unknown severity filter.')
    }
    filters.severity = severity as Severity
  }

  const status = params.get('status')
  if (status && status !== 'all') {
    if (!(STATUSES as readonly string[]).includes(status)) {
      throw new HttpError(400, 'Unknown scan status filter.')
    }
    filters.status = status as ScanFilters['status']
  }

  const sort = params.get('sort')
  if (sort) {
    if (!SORT_KEYS.includes(sort as ScanSortKey)) {
      throw new HttpError(400, 'Unknown sort key.')
    }
    filters.sort = sort as ScanSortKey
  }

  const direction = params.get('direction')
  if (direction) {
    if (direction !== 'asc' && direction !== 'desc') {
      throw new HttpError(400, 'Sort direction must be asc or desc.')
    }
    filters.direction = direction as SortDirection
  }

  return filters
}

export async function handleScans(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  deps: ScanRouteDependencies,
): Promise<void> {
  if (req.method === 'GET') {
    sendJson(res, 200, deps.store.list(parseScanFilters(url)))
    return
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS')
    throw new HttpError(405, 'Method not allowed for this endpoint.')
  }

  const body = await readJsonBody(req, deps.config.bodyLimitBytes)
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new HttpError(400, 'The request body must be a JSON object.')
  }
  const input = body as Record<string, unknown>

  if (typeof input.url !== 'string' || input.url.trim() === '') {
    throw new HttpError(400, 'A target URL is required.')
  }

  const requestedPages = input.maxPages ?? 1
  if (
    typeof requestedPages !== 'number' ||
    !Number.isInteger(requestedPages) ||
    requestedPages < 1 ||
    requestedPages > 10
  ) {
    throw new HttpError(400, 'maxPages must be an integer between 1 and 10.')
  }

  const includeScreenshots = input.includeScreenshots ?? false
  if (typeof includeScreenshots !== 'boolean') {
    throw new HttpError(400, 'includeScreenshots must be a boolean.')
  }

  const target = await deps.validateUrl(input.url, {
    allowedPorts: deps.config.allowedPorts,
  })

  const record = deps.store.createQueued({
    targetUrl: target.toString(),
    maxPages: Math.min(requestedPages, deps.config.scanMaxPages),
    includeScreenshots,
  })
  deps.runner.enqueue(record.id)

  const payload: StartScanResponse = {
    scanId: record.id,
    status: 'queued',
    queuedAt: record.startedAt,
  }
  sendJson(res, 202, payload)
}

export function handleScanDetail(
  res: ServerResponse,
  id: string,
  store: ScanStore,
): void {
  const record = store.get(id)
  if (!record) throw new HttpError(404, 'Scan not found.')
  sendJson(res, 200, record)
}
