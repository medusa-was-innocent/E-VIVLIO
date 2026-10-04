CREATE TABLE IF NOT EXISTS ecosystem_searches (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  app text NOT NULL CHECK (app IN ('lib', 'yard')),
  query text NOT NULL CHECK (length(query) BETWEEN 1 AND 300),
  searched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, app, query)
);
CREATE INDEX IF NOT EXISTS ecosystem_searches_user_date ON ecosystem_searches(user_id, searched_at DESC);
CREATE TABLE IF NOT EXISTS ecosystem_rooms (
  app text NOT NULL CHECK (app IN ('folio', 'yard', 'cove')),
  code text NOT NULL,
  created_by text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(app, code)
);
CREATE TABLE IF NOT EXISTS ecosystem_room_visits (
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  app text NOT NULL,
  code text NOT NULL,
  visited_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, app, code),
  FOREIGN KEY(app, code) REFERENCES ecosystem_rooms(app, code) ON DELETE CASCADE
);
