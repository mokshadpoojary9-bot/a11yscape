import type {
  AnalysisRequest,
  AnalysisRun,
  DatasetStats,
  HealthResponse,
  ModelRun,
  PaginatedScans,
  Recommendation,
  ReportRecord,
  ScanFilters,
  ScanRecord,
  StartScanInput,
  StartScanResponse,
} from '@/types'

export type ApiErrorKind = 'config' | 'network' | 'timeout' | 'http' | 'parse'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status?: number
  readonly service: string

  constructor(kind: ApiErrorKind, message: string, service: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.service = service
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
  timeoutMs?: number
}

function normaliseBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '')
}

/**
 * Perform a JSON request against one of the local services.
 * Every failure is surfaced as an ApiError so the UI can report the real cause.
 */
export async function apiRequest<T>(
  baseUrl: string,
  path: string,
  service: string,
  options: RequestOptions = {},
): Promise<T> {
  const base = normaliseBaseUrl(baseUrl)
  if (!base) {
    throw new ApiError('config', `No base URL configured for the ${service}.`, service)
  }

  const controller = new AbortController()
  const timeoutMs = options.timeoutMs ?? 10_000
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)

  const abortFromCaller = () => controller.abort()
  options.signal?.addEventListener('abort', abortFromCaller)

  try {
    const response = await fetch(`${base}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    })

    if (!response.ok) {
      let detail = ''
      try {
        const payload = (await response.json()) as { error?: string; message?: string }
        detail = payload.error ?? payload.message ?? ''
      } catch {
        /* non-JSON error body */
      }
      throw new ApiError(
        'http',
        detail || `${service} responded with HTTP ${response.status}.`,
        service,
        response.status,
      )
    }

    if (response.status === 204) {
      return undefined as T
    }

    try {
      return (await response.json()) as T
    } catch {
      throw new ApiError('parse', `${service} returned a response that was not valid JSON.`, service)
    }
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      if (options.signal?.aborted) {
        throw new ApiError('network', 'Request cancelled.', service)
      }
      throw new ApiError(
        'timeout',
        `${service} did not answer within ${Math.round(timeoutMs / 1000)} seconds.`,
        service,
      )
    }
    throw new ApiError(
      'network',
      `${service} is unreachable at ${base}. Start it locally and check the base URL in Settings.`,
      service,
    )
  } finally {
    window.clearTimeout(timer)
    options.signal?.removeEventListener('abort', abortFromCaller)
  }
}

/* ------------------------------------------------------------------ scanner */

export interface ScannerClient {
  health(signal?: AbortSignal): Promise<HealthResponse>
  stats(signal?: AbortSignal): Promise<DatasetStats>
  scans(filters: ScanFilters, signal?: AbortSignal): Promise<PaginatedScans>
  scan(id: string, signal?: AbortSignal): Promise<ScanRecord>
  startScan(input: StartScanInput): Promise<StartScanResponse>
}

export function createScannerClient(baseUrl: string): ScannerClient {
  const service = 'Scanner service'
  return {
    health: (signal) => apiRequest<HealthResponse>(baseUrl, '/health', service, { signal, timeoutMs: 5000 }),
    stats: (signal) => apiRequest<DatasetStats>(baseUrl, '/api/stats', service, { signal }),
    scans: (filters, signal) => {
      const params = new URLSearchParams()
      if (filters.query) params.set('query', filters.query)
      if (filters.severity && filters.severity !== 'all') params.set('severity', filters.severity)
      if (filters.status && filters.status !== 'all') params.set('status', filters.status)
      if (filters.sort) params.set('sort', filters.sort)
      if (filters.direction) params.set('direction', filters.direction)
      params.set('page', String(filters.page ?? 1))
      params.set('pageSize', String(filters.pageSize ?? 20))
      return apiRequest<PaginatedScans>(baseUrl, `/api/scans?${params.toString()}`, service, { signal })
    },
    scan: (id, signal) =>
      apiRequest<ScanRecord>(baseUrl, `/api/scans/${encodeURIComponent(id)}`, service, { signal }),
    startScan: (input) =>
      apiRequest<StartScanResponse>(baseUrl, '/api/scans', service, {
        method: 'POST',
        body: input,
        timeoutMs: 15_000,
      }),
  }
}

/* ---------------------------------------------------------------- R engine */

export interface AnalyticsClient {
  health(signal?: AbortSignal): Promise<HealthResponse>
  latestAnalysis(signal?: AbortSignal): Promise<AnalysisRun | null>
  runAnalysis(request: AnalysisRequest): Promise<AnalysisRun>
  modelRuns(signal?: AbortSignal): Promise<ModelRun[]>
  runModels(k?: number): Promise<ModelRun>
  recommendations(signal?: AbortSignal): Promise<Recommendation[]>
  reports(signal?: AbortSignal): Promise<ReportRecord[]>
  generateReport(title: string, format: ReportRecord['format']): Promise<ReportRecord>
}

export function createAnalyticsClient(baseUrl: string): AnalyticsClient {
  const service = 'R analytics engine'
  return {
    health: (signal) => apiRequest<HealthResponse>(baseUrl, '/health', service, { signal, timeoutMs: 5000 }),
    latestAnalysis: async (signal) => {
      try {
        return await apiRequest<AnalysisRun>(baseUrl, '/api/analysis/latest', service, { signal })
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null
        throw error
      }
    },
    runAnalysis: (request) =>
      apiRequest<AnalysisRun>(baseUrl, '/api/analysis', service, {
        method: 'POST',
        body: request,
        timeoutMs: 120_000,
      }),
    modelRuns: (signal) => apiRequest<ModelRun[]>(baseUrl, '/api/ml/runs', service, { signal }),
    runModels: (k) =>
      apiRequest<ModelRun>(baseUrl, '/api/ml/runs', service, {
        method: 'POST',
        body: k === undefined ? {} : { k },
        timeoutMs: 120_000,
      }),
    recommendations: (signal) =>
      apiRequest<Recommendation[]>(baseUrl, '/api/recommendations', service, { signal }),
    reports: (signal) => apiRequest<ReportRecord[]>(baseUrl, '/api/reports', service, { signal }),
    generateReport: (title, format) =>
      apiRequest<ReportRecord>(baseUrl, '/api/reports', service, {
        method: 'POST',
        body: { title, format },
        timeoutMs: 60_000,
      }),
  }
}

export const envScannerUrl: string = import.meta.env.VITE_SCANNER_API_URL ?? 'http://localhost:4000'
export const envAnalyticsUrl: string = import.meta.env.VITE_R_API_URL ?? 'http://localhost:8000'
