import { chromium, type Browser } from 'playwright'

let browserPromise: Promise<Browser> | null = null

/**
 * One Chromium instance is reused across scans. A crashed or disconnected
 * browser is discarded so the next scan starts a fresh one.
 */
export async function getBrowser(executablePath?: string): Promise<Browser> {
  if (browserPromise) {
    const current = await browserPromise.catch(() => null)
    if (current?.isConnected()) return current
    browserPromise = null
  }

  browserPromise = chromium
    .launch({
      headless: true,
      executablePath,
      args: ['--disable-dev-shm-usage'],
    })
    .then((browser) => {
      browser.on('disconnected', () => {
        browserPromise = null
      })
      return browser
    })
    .catch((error: unknown) => {
      browserPromise = null
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(
        `Chromium could not be launched. Run "npx playwright install chromium" in scanner-service. ${message}`,
      )
    })

  return browserPromise
}

export async function closeBrowser(): Promise<void> {
  const active = browserPromise
  browserPromise = null
  if (!active) return
  const browser = await active.catch(() => null)
  if (browser?.isConnected()) await browser.close().catch(() => undefined)
}
