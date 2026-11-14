import { dirname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface AppConfig {
  port: number
  databasePath: string
  scanTimeoutMs: number
  scanMaxPages: number
  scanUserAgent: string
  corsOrigins: string[]
  allowedPorts: number[]
  screenshotsDir: string
  browserExecutablePath?: string
  bodyLimitBytes: number
}

/** Absolute path to `scanner-service/`, both from `src/` and `dist/`. */
export const serviceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Absolute path to the repository root. */
export const repoRoot = resolve(serviceRoot, '..')

function integer(value: string | undefined, fallback: number, min: number, max: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

function portList(value: string | undefined): number[] {
  const fallback = [80, 443]
  if (!value) return fallback
  const ports = value
    .split(',')
    .map((entry) => Number.parseInt(entry.trim(), 10))
    .filter((entry) => Number.isInteger(entry) && entry > 0 && entry <= 65535)
  return ports.length > 0 ? Array.from(new Set(ports)) : fallback
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const databaseEnv = env.DATABASE_PATH?.trim() || './database/a11yscape.sqlite'
  const screenshotsEnv = env.SCREENSHOTS_DIR?.trim() || resolve(serviceRoot, 'screenshots')

  return {
    port: integer(env.PORT, 4000, 1, 65535),
    databasePath:
      databaseEnv === ':memory:'
        ? ':memory:'
        : isAbsolute(databaseEnv)
          ? databaseEnv
          : resolve(repoRoot, databaseEnv),
    scanTimeoutMs: integer(env.SCAN_TIMEOUT_MS, 45_000, 5_000, 120_000),
    scanMaxPages: integer(env.SCAN_MAX_PAGES, 5, 1, 10),
    scanUserAgent: env.SCAN_USER_AGENT?.trim() || 'A11YSCAPE-Research-Bot/0.1',
    corsOrigins: (env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
      .split(',')
      .map((origin) => origin.trim().replace(/\/+$/, ''))
      .filter(Boolean),
    allowedPorts: portList(env.ALLOWED_PORTS),
    screenshotsDir: isAbsolute(screenshotsEnv) ? screenshotsEnv : resolve(repoRoot, screenshotsEnv),
    browserExecutablePath: env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?.trim() || undefined,
    bodyLimitBytes: 256 * 1024,
  }
}
