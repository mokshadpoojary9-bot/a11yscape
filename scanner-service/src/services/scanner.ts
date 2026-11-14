import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import axe from 'axe-core'
import type { AxeResults } from 'axe-core'
import type { BrowserContext, Page } from 'playwright'
import { assertPublicRequestUrl } from '../utils/urlGuard.js'
import { countBySeverity, mapAxeResults } from '../utils/axeMapping.js'
import type { ScanIssue, ScanOutcome, ScanRequest } from '../types.js'

/** WCAG A/AA rules across WCAG 2.0, 2.1 and 2.2. */
export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa']

const MAX_DISCOVERED_LINKS = 50
const NAVIGATION_TIMEOUT_MS = 20_000

class ScanTimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ScanTimeoutError'
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.replace(/\s+/g, ' ').slice(0, 300)
  return String(error).slice(0, 300)
}

interface AxeWindow {
  axe: {
    run: (context: Document, options: unknown) => Promise<AxeResults>
  }
}

/** Inject axe-core into the page context and run only WCAG A/AA rules. */
async function runAxe(page: Page): Promise<AxeResults> {
  await page.evaluate(axe.source)
  return page.evaluate((tags: string[]) => {
    const runner = (window as unknown as AxeWindow).axe
    return runner.run(document, { runOnly: { type: 'tag', values: tags } })
  }, WCAG_TAGS)
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ScanTimeoutError(message)), timeoutMs)
  })
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer)
  }) as Promise<T>
}

/** Install a request guard so redirects and subresources cannot reach private hosts. */
async function guardRequests(context: BrowserContext): Promise<() => void> {
  const checks = new Map<string, Promise<void>>()

  await context.route('**/*', async (route) => {
    const requestUrl = route.request().url()
    let parsed: URL
    try {
      parsed = new URL(requestUrl)
    } catch {
      await route.abort('blockedbyclient')
      return
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      await route.continue()
      return
    }

    const key = parsed.hostname.toLowerCase()
    let check = checks.get(key)
    if (!check) {
      check = assertPublicRequestUrl(parsed.href).catch((error: unknown) => {
        checks.delete(key)
        throw error
      })
      checks.set(key, check)
    }

    try {
      await check
      await route.continue()
    } catch {
      await route.abort('blockedbyclient')
    }
  })

  return () => {
    void context.unrouteAll({ behavior: 'ignoreErrors' }).catch(() => undefined)
  }
}

function normaliseDiscoveredLink(raw: string, targetHostname: string): string | null {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (url.hostname.toLowerCase() !== targetHostname) return null
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

async function collectLinks(page: Page, targetHostname: string): Promise<string[]> {
  const hrefs = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]')).map((anchor) => anchor.href),
  )
  const links: string[] = []
  for (const href of hrefs) {
    const normalised = normaliseDiscoveredLink(href, targetHostname)
    if (normalised && !links.includes(normalised)) links.push(normalised)
    if (links.length >= MAX_DISCOVERED_LINKS) break
  }
  return links
}

/**
 * Render and audit a public website. Each page is a real Chromium navigation
 * followed by an axe-core run limited to WCAG A/AA rules. Results are only
 * ever what axe reported; nothing is seeded or synthesised.
 */
export async function scanWebsite(request: ScanRequest): Promise<ScanOutcome> {
  const { getBrowser } = await import('./browser.js')
  const startedAt = Date.now()
  const deadline = startedAt + request.timeoutMs
  const target = new URL(request.targetUrl)
  const targetHostname = target.hostname.toLowerCase()

  const issues: ScanIssue[] = []
  const errors: string[] = []
  const visited = new Set<string>()
  const queue: string[] = [target.toString()]
  let pagesScanned = 0
  let pageTitle: string | undefined
  let redirectNote: string | undefined

  const browser = await getBrowser(request.browserExecutablePath)
  const context = await browser.newContext({
    userAgent: request.userAgent,
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
  })
  const removeGuard = await guardRequests(context)

  try {
    if (request.includeScreenshots) {
      await mkdir(join(request.screenshotsDir, request.id), { recursive: true })
    }

    while (queue.length > 0 && pagesScanned < request.maxPages) {
      const remaining = deadline - Date.now()
      if (remaining <= 0) {
        errors.push(`The scan exceeded its ${request.timeoutMs} ms budget.`)
        break
      }

      const currentUrl = queue.shift() as string
      const normalised = new URL(currentUrl)
      normalised.hash = ''
      const visitKey = normalised.toString()
      if (visited.has(visitKey)) continue
      visited.add(visitKey)

      const page = await context.newPage()
      try {
        const navigationTimeout = Math.min(remaining, NAVIGATION_TIMEOUT_MS)
        const response = await page.goto(visitKey, {
          waitUntil: 'load',
          timeout: navigationTimeout,
        })
        if (response && response.status() >= 400) {
          throw new Error(`HTTP ${response.status()} response`)
        }

        // Client-rendered pages settle after load; wait briefly for network quiet.
        await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => undefined)

        const finalUrl = new URL(page.url())
        if (finalUrl.hostname.toLowerCase() !== targetHostname) {
          redirectNote = `Redirected to ${finalUrl.hostname}; off-host pages were not followed.`
        }

        if (!pageTitle) {
          const title = (await page.title()).trim()
          if (title) pageTitle = title
        }

        const axeRemaining = deadline - Date.now()
        if (axeRemaining <= 0) throw new ScanTimeoutError('The scan budget elapsed before evaluation.')
        const results = await withTimeout(
          runAxe(page),
          Math.max(5_000, axeRemaining),
          'axe-core evaluation exceeded the scan budget.',
        )

        issues.push(...mapAxeResults(results, finalUrl.toString()))
        pagesScanned += 1

        if (request.includeScreenshots) {
          const screenshotPath = join(
            request.screenshotsDir,
            request.id,
            `page-${String(pagesScanned).padStart(2, '0')}.png`,
          )
          await page
            .screenshot({ path: screenshotPath, fullPage: false })
            .catch(() => undefined)
        }

        if (finalUrl.hostname.toLowerCase() === targetHostname) {
          const links = await collectLinks(page, targetHostname)
          for (const link of links) {
            if (!visited.has(link) && !queue.includes(link)) queue.push(link)
          }
        }
      } catch (error) {
        errors.push(`${visitKey}: ${errorMessage(error)}`)
      } finally {
        await page.close().catch(() => undefined)
      }
    }
  } finally {
    removeGuard()
    await context.close().catch(() => undefined)
  }

  if (redirectNote) errors.push(redirectNote)

  const violationsBySeverity = countBySeverity(issues)
  const durationMs = Date.now() - startedAt
  const outcome: ScanOutcome = {
    status: 'completed',
    pagesScanned,
    issueCount: issues.length,
    violationsBySeverity,
    issues,
    durationMs,
    metadata: {
      engine: 'axe-core',
      axe_version: axe.version,
      wcag_tags: WCAG_TAGS.join(','),
      browser: 'chromium',
      browser_version: browser.version(),
      user_agent: request.userAgent,
      timeout_ms: String(request.timeoutMs),
      pages_requested: String(request.maxPages),
      screenshots: request.includeScreenshots ? 'enabled' : 'disabled',
    },
  }
  if (pageTitle) outcome.pageTitle = pageTitle

  if (pagesScanned === 0) {
    outcome.status = 'failed'
    outcome.errorMessage =
      errors.length > 0
        ? errors.join(' | ').slice(0, 1000)
        : 'No page could be evaluated during this scan.'
  } else if (errors.length > 0) {
    outcome.status = 'partial'
    outcome.errorMessage = errors.join(' | ').slice(0, 1000)
  }

  return outcome
}
