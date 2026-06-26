import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import Database from 'better-sqlite3'
import { app } from 'electron'
import schemaSql from './schema.sql?raw'

export type DatabaseConnection = Database.Database

const CURRENT_SCHEMA_VERSION = 3

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
  migrateDatabase(database, userVersion)
  database.exec(schemaSql)
  database.pragma(`user_version = ${CURRENT_SCHEMA_VERSION}`)
  return database
}

function migrateDatabase(database: DatabaseConnection, userVersion: number): void {
  if (userVersion >= 3) {
    return
  }

  const rebuildItems = tableSql(database, 'library_items')?.includes("CHECK (kind = 'markdown_doc')") === true
  const contentSql = tableSql(database, 'library_item_contents') ?? ''
  const contentColumns = tableColumns(database, 'library_item_contents')
  const rebuildContents =
    contentSql.includes("CHECK (role = 'primary')") ||
    contentSql.includes("CHECK (format = 'markdown')") ||
    !contentColumns.has('attachment_id') ||
    !contentColumns.has('language') ||
    !contentColumns.has('metadata_json')

  if (!rebuildItems && !rebuildContents) {
    return
  }

  database.pragma('foreign_keys = OFF')
  database.pragma('legacy_alter_table = ON')
  try {
    database.transaction(() => {
      if (rebuildItems) {
        rebuildLibraryItems(database)
      }

      if (rebuildContents) {
        rebuildLibraryItemContents(database, contentColumns)
      }
    })()
  } finally {
    database.pragma('legacy_alter_table = OFF')
    database.pragma('foreign_keys = ON')
  }

  const foreignKeyFailures = database.pragma('foreign_key_check') as unknown[]
  if (foreignKeyFailures.length > 0) {
    throw new Error('Database migration failed foreign key validation')
  }
}

function rebuildLibraryItems(database: DatabaseConnection): void {
  database.exec(`
    DROP INDEX IF EXISTS idx_library_items_main;
    DROP INDEX IF EXISTS idx_library_items_kind;
    DROP INDEX IF EXISTS idx_library_items_title;
    ALTER TABLE library_items RENAME TO library_items_v2;
    CREATE TABLE library_items (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL CHECK (kind IN ('markdown_doc', 'image_asset', 'file_asset', 'code_asset', 'web_capture')),
      title TEXT NOT NULL,
      preview_text TEXT,
      archived INTEGER NOT NULL DEFAULT 0,
      pinned INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_opened_at INTEGER
    );
    INSERT INTO library_items
      (id, kind, title, preview_text, archived, pinned, created_at, updated_at, last_opened_at)
    SELECT id, kind, title, preview_text, archived, pinned, created_at, updated_at, last_opened_at
    FROM library_items_v2;
    DROP TABLE library_items_v2;
  `)
}

function rebuildLibraryItemContents(database: DatabaseConnection, columns: Set<string>): void {
  const attachmentId = columns.has('attachment_id') ? 'attachment_id' : 'NULL'
  const language = columns.has('language') ? 'language' : 'NULL'
  const metadataJson = columns.has('metadata_json') ? 'metadata_json' : 'NULL'

  database.exec(`
    DROP INDEX IF EXISTS idx_library_item_contents_item;
    ALTER TABLE library_item_contents RENAME TO library_item_contents_v2;
    CREATE TABLE library_item_contents (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('primary', 'body', 'preview', 'source_snapshot')),
      format TEXT NOT NULL CHECK (format IN ('markdown', 'plain_text', 'html', 'code', 'image', 'file')),
      body_text TEXT,
      attachment_id TEXT REFERENCES library_attachments(id) ON DELETE SET NULL,
      language TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      metadata_json TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    INSERT INTO library_item_contents
      (id, item_id, role, format, body_text, attachment_id, language, sort_order, metadata_json, created_at, updated_at)
    SELECT id, item_id, role, format, body_text, ${attachmentId}, ${language}, sort_order, ${metadataJson}, created_at, updated_at
    FROM library_item_contents_v2;
    DROP TABLE library_item_contents_v2;
  `)
}

function tableSql(database: DatabaseConnection, table: string): string | null {
  const row = database.prepare("SELECT sql FROM sqlite_schema WHERE type = 'table' AND name = ?").get(table) as
    | { sql: string | null }
    | undefined

  return row?.sql ?? null
}

function tableColumns(database: DatabaseConnection, table: string): Set<string> {
  const rows = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  return new Set(rows.map((row) => row.name))
}
