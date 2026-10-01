-- Community forum. A facility's forum is identified by its map id
-- (facilities.external_id, e.g. osm-node-123), stored as facility_id.
--
-- updates / questions / replies were created by hand in Neon; the CREATE
-- statements below mirror them (same columns and index names) so a fresh
-- database matches, and are no-ops where they already exist.

CREATE TABLE IF NOT EXISTS updates (
  id BIGSERIAL PRIMARY KEY,
  facility_id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS updates_facility_id_created_at_idx ON updates (facility_id, created_at DESC);

CREATE TABLE IF NOT EXISTS questions (
  id BIGSERIAL PRIMARY KEY,
  facility_id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS questions_facility_id_created_at_idx ON questions (facility_id, created_at DESC);

CREATE TABLE IF NOT EXISTS replies (
  id BIGSERIAL PRIMARY KEY,
  question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS replies_question_id_created_at_idx ON replies (question_id, created_at);

-- The poster was within the configured radius of the facility when posting.
-- Only this yes/no is stored, never coordinates.
ALTER TABLE updates ADD COLUMN IF NOT EXISTS location_verified BOOLEAN NOT NULL DEFAULT false;

-- Following a forum. Leaving deletes the row.
CREATE TABLE IF NOT EXISTS forum_members (
  facility_id           TEXT NOT NULL,
  user_id               BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (facility_id, user_id)
);
CREATE INDEX IF NOT EXISTS forum_members_user_idx ON forum_members (user_id);

-- AI summaries of a facility's recent updates.
CREATE TABLE IF NOT EXISTS forum_summaries (
  id             BIGSERIAL PRIMARY KEY,
  facility_id    TEXT NOT NULL,
  summary        TEXT NOT NULL,
  message_count  INTEGER NOT NULL,
  last_update_id BIGINT NOT NULL,
  important      BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS forum_summaries_facility_created_idx ON forum_summaries (facility_id, created_at DESC);

-- Browser push: one row per browser/device.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint          TEXT NOT NULL UNIQUE,
  subscription_data JSONB NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id                     BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  ai_summary_enabled          BOOLEAN NOT NULL DEFAULT false,
  ai_summary_interval         INTEGER NOT NULL DEFAULT 90 CHECK (ai_summary_interval IN (60, 90, 120)),
  question_reply_enabled      BOOLEAN NOT NULL DEFAULT true,
  important_update_enabled    BOOLEAN NOT NULL DEFAULT true,
  last_ai_summary_notified_at TIMESTAMPTZ,
  last_important_notified_at  TIMESTAMPTZ,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
