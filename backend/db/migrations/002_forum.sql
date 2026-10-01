-- Location-based community forum: Location -> Forum -> Messages/Questions.
-- `facilities` is the location table; each facility gets at most one forum.

CREATE TABLE IF NOT EXISTS forums (
  id          BIGSERIAL PRIMARY KEY,
  location_id INTEGER NOT NULL UNIQUE REFERENCES facilities (id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updates and Questions share one table, split by channel.
CREATE TABLE IF NOT EXISTS messages (
  id                BIGSERIAL PRIMARY KEY,
  forum_id          BIGINT NOT NULL REFERENCES forums (id) ON DELETE CASCADE,
  user_id           BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  channel           TEXT NOT NULL CHECK (channel IN ('updates', 'questions')),
  content           TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  -- Only meaningful for updates: the poster was within the configured radius
  -- of the facility when they posted. Coordinates themselves are never stored.
  location_verified BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS messages_forum_channel_created_idx
  ON messages (forum_id, channel, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS replies (
  id         BIGSERIAL PRIMARY KEY,
  message_id BIGINT NOT NULL REFERENCES messages (id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  content    TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS replies_message_created_idx
  ON replies (message_id, created_at)
  WHERE deleted_at IS NULL;

-- Following a forum. Leaving deletes the row; the forum itself stays.
CREATE TABLE IF NOT EXISTS forum_members (
  forum_id              BIGINT NOT NULL REFERENCES forums (id) ON DELETE CASCADE,
  user_id               BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  joined_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (forum_id, user_id)
);

CREATE INDEX IF NOT EXISTS forum_members_user_idx ON forum_members (user_id);

CREATE TABLE IF NOT EXISTS forum_summaries (
  id              BIGSERIAL PRIMARY KEY,
  forum_id        BIGINT NOT NULL REFERENCES forums (id) ON DELETE CASCADE,
  channel         TEXT NOT NULL CHECK (channel IN ('updates', 'questions')),
  summary         TEXT NOT NULL,
  message_count   INTEGER NOT NULL,
  -- Newest message included, so the job can tell when enough new ones exist.
  last_message_id BIGINT NOT NULL,
  important       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS forum_summaries_forum_channel_created_idx
  ON forum_summaries (forum_id, channel, created_at DESC);

-- One row per browser/device.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  endpoint          TEXT NOT NULL UNIQUE,
  subscription_data JSONB NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id);

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id                     BIGINT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  ai_summary_enabled          BOOLEAN NOT NULL DEFAULT false,
  ai_summary_interval         INTEGER NOT NULL DEFAULT 90 CHECK (ai_summary_interval IN (60, 90, 120)),
  question_reply_enabled      BOOLEAN NOT NULL DEFAULT true,
  important_update_enabled    BOOLEAN NOT NULL DEFAULT true,
  last_ai_summary_notified_at TIMESTAMPTZ,
  last_important_notified_at  TIMESTAMPTZ,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
