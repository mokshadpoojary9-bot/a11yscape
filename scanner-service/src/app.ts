import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AppConfig } from './config.js'
import { HttpError, handleCors, sendJson } from './middleware/http.js'
import { handleScanExport } from './routes/exports.js'
import { handleHealth, handleStats } from './routes/health.js'
import { handleScanDetail, handleScans } from './routes/scans.js'
import type { ScanStore } from './services/store.js'
import { UrlValidationError, validateTargetUrl } from './utils/urlGuard.js'
import type { UrlGuardOptions } from './utils/urlGuard.js'

export interface AppDependencies {
  store: ScanStore
  runner: { enqueue: (id: string) => void }
  config: AppConfig
  validateUrl?: (raw: unknown, options?: UrlGuardOptions) => Promise<URL>
  startedAt?: string
}

function methodNotAllowed(res: ServerResponse, allowed: string): never {
  res.setHeader('Allow', `${allowed}, OPTIONS`)
  throw new HttpError(405, 'Method not allowed for this endpoint.')
}

async function dispatch(
  req: IncomingMessage,
  res: ServerResponse,
  deps: AppDependencies,
  startedAt: string,
): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://scanner.local')
  const path = url.pathname
  const method = req.method ?? 'GET'

  if (path === '/health') {
    if (method !== 'GET') methodNotAllowed(res, 'GET')
    handleHealth(res, deps.store, startedAt)
    return
  }

  if (path === '/api/stats') {
    if (method !== 'GET') methodNotAllowed(res, 'GET')
    handleStats(res, deps.store)
    return
  }

  if (path === '/api/scans') {
    await handleScans(req, res, url, {
      store: deps.store,
      runner: deps.runner,
      config: deps.config,
      validateUrl: deps.validateUrl ?? validateTargetUrl,
    })
    return
  }

  if (path === '/api/exports/scans.csv') {
    if (method !== 'GET') methodNotAllowed(res, 'GET')
    handleScanExport(url, res, deps.store)
    return
  }

  const detailMatch = /^\/api\/scans\/([^/]+)$/.exec(path)
  if (detailMatch) {
    if (method !== 'GET') methodNotAllowed(res, 'GET')
    let id: string
    try {
      id = decodeURIComponent(detailMatch[1])
    } catch {
      throw new HttpError(400, 'The scan id is malformed.')
    }
    handleScanDetail(res, id, deps.store)
    return
  }

  throw new HttpError(404, 'Endpoint not found.')
}

export function createApp(deps: AppDependencies): Server {
  const startedAt = deps.startedAt ?? new Date().toISOString()

  return createServer((req, res) => {
    void (async () => {
      try {
        if (handleCors(req, res, deps.config.corsOrigins)) return
        await dispatch(req, res, deps, startedAt)
      } catch (error) {
        if (res.writableEnded) return
        if (error instanceof HttpError) {
          sendJson(res, error.status, { error: error.message })
          return
        }
        if (error instanceof UrlValidationError) {
          sendJson(res, error.statusCode, { error: error.message })
          return
        }
        console.error('[scanner] Unhandled request error:', error)
        sendJson(res, 500, { error: 'The scanner service could not complete this request.' })
      }
    })()
  })
}
