import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import Database from 'better-sqlite3'
import { app } from 'electron'
import schemaSql from './schema.sql?raw'

export type DatabaseConnection = Database.Database

export function defaultDatabasePath(): string {
  return join(app.getPath('userData'), 'notes.db')
}

export function openDatabase(databasePath = defaultDatabasePath()): DatabaseConnection {
  mkdirSync(dirname(databasePath), { recursive: true })
  const database = new Database(databasePath)
  database.pragma('journal_mode = WAL')
  database.pragma('foreign_keys = ON')
  database.exec(schemaSql)
  return database
}
