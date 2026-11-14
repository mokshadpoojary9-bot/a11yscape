import type { AppConfig } from '../config.js'
import type { ScanFunction } from '../types.js'
import type { ScanStore } from './store.js'

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.replace(/\s+/g, ' ').slice(0, 1000)
  return String(error).slice(0, 1000)
}

/**
 * A single-process FIFO runner. Jobs are durable in SQLite: the queue array is
 * only an in-memory scheduling hint, and every transition is written down.
 */
export class ScanRunner {
  private readonly pending: string[] = []
  private draining = false
  private stopped = false

  constructor(
    private readonly store: ScanStore,
    private readonly scan: ScanFunction,
    private readonly config: AppConfig,
  ) {}

  enqueue(id: string): void {
    if (this.stopped) return
    if (!this.pending.includes(id)) this.pending.push(id)
    void this.drain()
  }

  /** Pick up scans queued before a restart and fail records stranded mid-scan. */
  recover(): void {
    const queued = this.store.recoverInterrupted()
    for (const id of queued) this.enqueue(id)
  }

  stop(): void {
    this.stopped = true
    this.pending.length = 0
  }

  get pendingCount(): number {
    return this.pending.length
  }

  private async drain(): Promise<void> {
    if (this.draining || this.stopped) return
    this.draining = true
    try {
      while (!this.stopped && this.pending.length > 0) {
        const id = this.pending.shift() as string
        await this.runOne(id)
      }
    } finally {
      this.draining = false
    }
  }

  private async runOne(id: string): Promise<void> {
    const job = this.store.getJob(id)
    if (!job) return
    if (!this.store.markRunning(id)) return

    try {
      const outcome = await this.scan({
        ...job,
        timeoutMs: this.config.scanTimeoutMs,
        userAgent: this.config.scanUserAgent,
        screenshotsDir: this.config.screenshotsDir,
        ...(this.config.browserExecutablePath
          ? { browserExecutablePath: this.config.browserExecutablePath }
          : {}),
      })
      this.store.complete(id, outcome)
    } catch (error) {
      this.store.fail(id, `Scan failed: ${errorMessage(error)}`)
    }
  }
}
