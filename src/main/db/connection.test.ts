import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import { openDatabase } from './connection'
import { LibraryStore } from './library'

const markdownOnlyV2Schema = `
CREATE TABLE library_items (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind = 'markdown_doc'),
  title TEXT NOT NULL,
  preview_text TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_opened_at INTEGER
);

CREATE TABLE library_item_contents (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role = 'primary'),
  format TEXT NOT NULL CHECK (format = 'markdown'),
  body_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE library_item_sources (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
  spark_id TEXT,
  provider TEXT,
  source_url TEXT,
  source_title TEXT,
  captured_at INTEGER NOT NULL,
  metadata_json TEXT
);

INSERT INTO library_items
  (id, kind, title, preview_text, archived, pinned, created_at, updated_at, last_opened_at)
VALUES
  ('item-1', 'markdown_doc', 'Existing', 'Old body', 0, 0, 10, 10, NULL);

INSERT INTO library_item_contents
  (id, item_id, role, format, body_text, sort_order, created_at, updated_at)
VALUES
  ('content-1', 'item-1', 'primary', 'markdown', 'Old body', 0, 10, 10);

INSERT INTO library_item_sources
  (id, item_id, spark_id, provider, source_url, source_title, captured_at, metadata_json)
VALUES
  ('source-1', 'item-1', NULL, 'grok', 'https://grok.com/c/example', 'Grok result', 10, NULL);

PRAGMA user_version = 2;
`

describe('openDatabase', () => {
  let tempDir: string | null = null

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true })
      tempDir = null
    }
  })

  it('migrates markdown-only v2 library tables before writes', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'adit-db-'))
    const databasePath = join(tempDir, 'sparks.db')
    const oldDatabase = new Database(databasePath)
    oldDatabase.pragma('foreign_keys = ON')
    oldDatabase.exec(markdownOnlyV2Schema)
    oldDatabase.close()

    const database = openDatabase(databasePath)
    const store = new LibraryStore(database)

    expect(database.pragma('user_version', { simple: true })).toBe(3)
    expect(columnNames(database, 'library_item_contents')).toEqual([
      'id',
      'item_id',
      'role',
      'format',
      'body_text',
      'attachment_id',
      'language',
      'sort_order',
      'metadata_json',
      'created_at',
      'updated_at'
    ])
    expect(tableSql(database, 'library_items')).toContain('image_asset')
    expect(store.getItem('item-1')?.sources[0]).toMatchObject({
      provider: 'grok',
      source_title: 'Grok result'
    })

    expect(store.createMarkdownItem({ title: 'Next', markdown: 'New body' }, 20).contents[0]).toMatchObject({
      role: 'primary',
      format: 'markdown',
      body_text: 'New body',
      attachment_id: null,
      language: null,
      metadata_json: null
    })
    database
      .prepare(
        `INSERT INTO library_items
         (id, kind, title, preview_text, archived, pinned, created_at, updated_at, last_opened_at)
         VALUES ('item-2', 'image_asset', 'Image', NULL, 0, 0, 30, 30, NULL)`
      )
      .run()

    database.close()
  })
})

function columnNames(database: Database.Database, table: string): string[] {
  return (database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map((row) => row.name)
}

function tableSql(database: Database.Database, table: string): string {
  const row = database.prepare("SELECT sql FROM sqlite_schema WHERE type = 'table' AND name = ?").get(table) as
    | { sql: string }
    | undefined

  return row?.sql ?? ''
}
