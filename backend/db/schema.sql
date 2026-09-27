-- Healthcare facilities
CREATE TABLE IF NOT EXISTS facilities (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('clinic','hospital','pharmacy','practitioner')),
  address        TEXT,
  phone          TEXT,
  emergency_phone TEXT,
  latitude       DOUBLE PRECISION NOT NULL,
  longitude      DOUBLE PRECISION NOT NULL,
  operating_hours JSONB DEFAULT '{}'::jsonb,
  services       TEXT[] DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A composite index helps the bounding-box pre-filter before the haversine pass.
CREATE INDEX IF NOT EXISTS idx_facilities_lat_lng ON facilities (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_facilities_type ON facilities (type);

-- Community queue reports
CREATE TABLE IF NOT EXISTS queue_reports (
  id              BIGSERIAL PRIMARY KEY,
  facility_id     INTEGER NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  queue_length    INTEGER CHECK (queue_length >= 0),
  wait_minutes    INTEGER CHECK (wait_minutes >= 0),
  congestion      TEXT CHECK (congestion IN ('low','moderate','high')),
  service_type    TEXT,
  notes           TEXT,
  location_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_queue_reports_facility_created
  ON queue_reports (facility_id, created_at DESC);