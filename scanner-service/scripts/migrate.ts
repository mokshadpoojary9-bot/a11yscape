/**
 * Apply pending schema migrations and report the resulting version.
 * Usage: npm run db:migrate --workspace scanner-service
 */
import { loadConfig } from '../src/config.js'
import { describeDatabase, openDatabase } from '../src/db/database.js'
import { migrate } from '../src/db/migrations.js'

const config = loadConfig()
const db = openDatabase(config.databasePath, { skipMigrations: true })

try {
  const result = migrate(db)
  const info = describeDatabase(db, config.databasePath)
  if (result.applied.length === 0) {
    console.log(`[db] already at schema version ${result.currentVersion}`)
  } else {
    console.log(`[db] applied migrations: ${result.applied.join(', ')}`)
    console.log(`[db] schema version: ${result.currentVersion}`)
  }
  for (const table of info.tables) {
    console.log(`[db] ${table.name}: ${table.rows} row${table.rows === 1 ? '' : 's'}`)
  }
} finally {
  db.close()
}
