import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { migrate, type MigrationResult } from './migrations.js'

export interface OpenDatabaseOptions {
  /** Disable only for migration tooling that manages its own lifecycle. */
  skipMigrations?: boolean
}

/**
 * Open the A11YSCAPE database with the pragmas every connection relies on.
 * Migrations are idempotent and run before the connection is handed out.
 */
export function openDatabase(
  databasePath: string,
  options: OpenDatabaseOptions = {},
): DatabaseSync {
  if (databasePath !== ':memory:') {
    mkdirSync(dirname(databasePath), { recursive: true })
  }

  const db = new DatabaseSync(databasePath)
  db.exec('PRAGMA foreign_keys = ON;')
  db.exec('PRAGMA busy_timeout = 5000;')
  if (databasePath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;')
  }

  if (!options.skipMigrations) migrate(db)
  return db
}

export interface DatabaseInfo {
  path: string
  schemaVersion: number
  tables: Array<{ name: string; rows: number }>
}

const EXPECTED_TABLES = ['websites', 'scans', 'violations', 'scan_metadata', 'schema_migrations']

export function describeDatabase(db: DatabaseSync, databasePath: string): DatabaseInfo {
  const versionRow = db.prepare('PRAGMA user_version').get() as unknown as { user_version: number }
  const tables = EXPECTED_TABLES.map((name) => {
    const row = db.prepare(`SELECT COUNT(*) AS count FROM ${name}`).get() as unknown as {
      count: number
    }
    return { name, rows: Number(row.count) }
  })
  return { path: databasePath, schemaVersion: Number(versionRow.user_version ?? 0), tables }
}

export type { MigrationResult }
