CREATE TABLE IF NOT EXISTS links (
  id          SERIAL PRIMARY KEY,
  short_code  VARCHAR(12) UNIQUE,
  original_url TEXT NOT NULL,
  creator_uuid UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- short_code already has an index from the UNIQUE constraint above
CREATE INDEX IF NOT EXISTS idx_links_creator_uuid ON links(creator_uuid);
