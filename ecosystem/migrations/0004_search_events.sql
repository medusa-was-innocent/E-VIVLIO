-- Preserve every submitted search, including repeat searches. Existing recent
-- history is not backfilled: its earlier timestamps were overwritten by upserts.
CREATE TABLE IF NOT EXISTS ecosystem_search_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 app text NOT NULL CHECK (app IN ('lib','yard')),
 query text NOT NULL CHECK (length(query) BETWEEN 1 AND 300),
 searched_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ecosystem_search_events_user_date ON ecosystem_search_events(user_id,searched_at DESC);
