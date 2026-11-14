/**
 * Initialize (or upgrade) the scanner database.
 *
 * Safe to run repeatedly: schema migrations only apply once and never drop
 * real scan data. Usage: npm run db:init --workspace scanner-service
 */
import { loadConfig } from '../src/config.js'
import { describeDatabase, openDatabase } from '../src/db/database.js'

const config = loadConfig()
const db = openDatabase(config.databasePath)

try {
  const info = describeDatabase(db, config.databasePath)
  console.log(`[db] ready: ${info.path}`)
  console.log(`[db] schema version: ${info.schemaVersion}`)
  for (const table of info.tables) {
    console.log(`[db] ${table.name}: ${table.rows} row${table.rows === 1 ? '' : 's'}`)
  }
} finally {
  db.close()
}
