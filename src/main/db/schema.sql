CREATE TABLE IF NOT EXISTS sparks (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('chatgpt', 'grok')),
  session_url TEXT,
  title TEXT NOT NULL,
  is_title_manual INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_opened_at INTEGER,
  archived INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sparks_main ON sparks(archived, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sparks_session_url
  ON sparks(provider, session_url) WHERE session_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sparks_title ON sparks(title);

CREATE TABLE IF NOT EXISTS library_items (
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

CREATE INDEX IF NOT EXISTS idx_library_items_main
  ON library_items(archived, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_library_items_title
  ON library_items(title);

CREATE TABLE IF NOT EXISTS library_item_contents (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role = 'primary'),
  format TEXT NOT NULL CHECK (format = 'markdown'),
  body_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_library_item_contents_item
  ON library_item_contents(item_id, sort_order);

CREATE TABLE IF NOT EXISTS library_item_sources (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES library_items(id) ON DELETE CASCADE,
  spark_id TEXT REFERENCES sparks(id) ON DELETE SET NULL,
  provider TEXT,
  source_url TEXT,
  source_title TEXT,
  captured_at INTEGER NOT NULL,
  metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_library_item_sources_item
  ON library_item_sources(item_id);
CREATE INDEX IF NOT EXISTS idx_library_item_sources_spark
  ON library_item_sources(spark_id);
