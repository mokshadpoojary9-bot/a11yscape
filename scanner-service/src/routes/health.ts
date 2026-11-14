import type { ServerResponse } from 'node:http'
import type { DatasetStats, HealthResponse } from '../types.js'
import type { ScanStore } from '../services/store.js'
import { sendJson } from '../middleware/http.js'

export const SERVICE_NAME = 'A11YSCAPE scanner service'
export const SERVICE_VERSION = '0.1.0'

export function handleHealth(
  res: ServerResponse,
  store: ScanStore,
  startedAt: string,
): void {
  const queueDepth = store.queueDepth()
  const payload: HealthResponse = {
    status: 'ok',
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    startedAt,
    uptimeSeconds: Math.max(0, Math.round((Date.now() - Date.parse(startedAt)) / 1000)),
    queueDepth,
  }
  sendJson(res, 200, payload)
}

export function handleStats(res: ServerResponse, store: ScanStore): void {
  const payload: DatasetStats = store.stats()
  sendJson(res, 200, payload)
}
