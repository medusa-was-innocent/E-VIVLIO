CREATE TABLE IF NOT EXISTS ecosystem_groups (
 id text PRIMARY KEY, name text NOT NULL, invite text UNIQUE NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ecosystem_group_members (
 user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
 group_id text NOT NULL REFERENCES ecosystem_groups(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ecosystem_group_members_group ON ecosystem_group_members(group_id);
CREATE TABLE IF NOT EXISTS ecosystem_group_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 group_id text NOT NULL REFERENCES ecosystem_groups(id) ON DELETE CASCADE,
 user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 body text NOT NULL DEFAULT '', app text, code text,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(group_id,app,code)
);
CREATE INDEX IF NOT EXISTS ecosystem_group_events_recent ON ecosystem_group_events(group_id,id DESC);
CREATE INDEX IF NOT EXISTS ecosystem_group_events_sender ON ecosystem_group_events(user_id,created_at DESC) WHERE app IS NULL;
