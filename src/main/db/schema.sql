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
