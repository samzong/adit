import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import Database from 'better-sqlite3'
import { app } from 'electron'
import schemaSql from './schema.sql?raw'

export type DatabaseConnection = Database.Database

const CURRENT_SCHEMA_VERSION = 2

export function defaultDatabasePath(): string {
  return join(app.getPath('userData'), 'sparks.db')
}

export function openDatabase(databasePath = defaultDatabasePath()): DatabaseConnection {
  mkdirSync(dirname(databasePath), { recursive: true })
  const database = new Database(databasePath)
  database.pragma('journal_mode = WAL')
  database.pragma('foreign_keys = ON')
  const userVersion = Number(database.pragma('user_version', { simple: true }))

  if (userVersion > CURRENT_SCHEMA_VERSION) {
    database.close()
    throw new Error(`Unsupported Adit database schema version ${userVersion}`)
  }

  database.exec(schemaSql)
  database.pragma(`user_version = ${CURRENT_SCHEMA_VERSION}`)
  return database
}
