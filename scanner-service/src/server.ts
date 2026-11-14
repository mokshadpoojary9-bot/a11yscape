import { createApp } from './app.js'
import { loadConfig } from './config.js'
import { closeBrowser } from './services/browser.js'
import { ScanRunner } from './services/queue.js'
import { scanWebsite } from './services/scanner.js'
import { ScanStore } from './services/store.js'

const config = loadConfig()
const store = new ScanStore(config.databasePath)
const runner = new ScanRunner(store, scanWebsite, config)

// Fail scans stranded by a restart honestly, then resume anything still queued.
runner.recover()

const server = createApp({ store, runner, config })

server.on('error', (error) => {
  console.error('[scanner] Server error:', error)
  process.exitCode = 1
})

server.listen(config.port, () => {
  console.log(`[scanner] ${new URL(`http://localhost:${config.port}`).origin}`)
  console.log(`[scanner] database: ${config.databasePath}`)
  console.log(
    `[scanner] limits: ${config.scanMaxPages} pages max, ${config.scanTimeoutMs} ms timeout`,
  )
  console.log(`[scanner] CORS origins: ${config.corsOrigins.join(', ')}`)
})

let shuttingDown = false

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`[scanner] ${signal} received, shutting down.`)
  runner.stop()
  server.close()
  await closeBrowser()
  try {
    store.close()
  } catch {
    /* already closed */
  }
  process.exit(0)
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
