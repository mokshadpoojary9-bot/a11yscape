import type { IncomingMessage, ServerResponse } from 'node:http'

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  if (res.headersSent) return
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  res.end(body)
}

export function sendText(
  res: ServerResponse,
  status: number,
  body: string,
  contentType: string,
  extraHeaders: Record<string, string> = {},
): void {
  if (res.headersSent) return
  res.writeHead(status, {
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  })
  res.end(body)
}

/**
 * Apply CORS for the one configured frontend origin. Returns true when the
 * preflight request was fully handled.
 */
export function handleCors(
  req: IncomingMessage,
  res: ServerResponse,
  allowedOrigins: string[],
): boolean {
  const origin = req.headers.origin
  const allowed = typeof origin === 'string' && allowedOrigins.includes(origin)
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')
    res.setHeader('Access-Control-Max-Age', '600')
  }

  if (req.method === 'OPTIONS') {
    if (origin && !allowed) {
      sendJson(res, 403, { error: 'This origin is not allowed to call the scanner service.' })
      return true
    }
    res.writeHead(204)
    res.end()
    return true
  }

  return false
}

export async function readJsonBody(req: IncomingMessage, limitBytes: number): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string)
    size += buffer.byteLength
    if (size > limitBytes) {
      throw new HttpError(413, 'The request body is too large.')
    }
    chunks.push(buffer)
  }

  if (size === 0) {
    throw new HttpError(400, 'A JSON request body is required.')
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
  } catch {
    throw new HttpError(400, 'The request body must be valid JSON.')
  }
}
