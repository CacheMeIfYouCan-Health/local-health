-- Core tables the backend already queries (users, facilities, queue).
-- Mirrors the schema that was created by hand in Neon before migrations
-- existed; every statement is IF NOT EXISTS so it is a no-op there.

CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS facilities (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('clinic', 'hospital', 'pharmacy', 'practitioner')),
  address         TEXT,
  phone           TEXT,
  emergency_phone TEXT,
  latitude        DOUBLE PRECISION NOT NULL,
  longitude       DOUBLE PRECISION NOT NULL,
  operating_hours JSONB DEFAULT '{}'::jsonb,
  services        TEXT[] DEFAULT '{}'::text[],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  external_id     TEXT,
  cached_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- upsertFacility() relies on ON CONFLICT (external_id).
CREATE UNIQUE INDEX IF NOT EXISTS facilities_external_id_key ON facilities (external_id);
CREATE INDEX IF NOT EXISTS facilities_lat_lng_idx ON facilities (latitude, longitude);

CREATE TABLE IF NOT EXISTS nearby_cache (
  bbox_key   TEXT PRIMARY KEY,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS queue_reports (
  id                BIGSERIAL PRIMARY KEY,
  facility_id       INTEGER NOT NULL REFERENCES facilities (id) ON DELETE CASCADE,
  queue_length      INTEGER CHECK (queue_length >= 0),
  wait_minutes      INTEGER CHECK (wait_minutes >= 0),
  congestion        TEXT CHECK (congestion IN ('low', 'moderate', 'high')),
  service_type      TEXT,
  notes             TEXT,
  location_verified BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS queue_reports_facility_created_idx
  ON queue_reports (facility_id, created_at DESC);

CREATE TABLE IF NOT EXISTS queue_sessions (
  id                  SERIAL PRIMARY KEY,
  session_id          TEXT NOT NULL UNIQUE,
  facility_id         INTEGER REFERENCES facilities (id) ON DELETE CASCADE,
  queue_type          TEXT,
  people_ahead        INTEGER,
  people_ahead_bucket TEXT,
  location_verified   BOOLEAN DEFAULT false,
  check_in_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out_at        TIMESTAMPTZ,
  wait_minutes        INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS queue_sessions_facility_checkout_idx
  ON queue_sessions (facility_id, check_out_at DESC);
