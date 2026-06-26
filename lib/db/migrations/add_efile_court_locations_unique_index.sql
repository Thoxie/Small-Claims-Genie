-- Migration: add unique index on (cli_code, jurisdiction_state) in efile_court_locations
-- Required for ON CONFLICT upserts in the nightly Tyler court sync job.
-- Safe to run multiple times — uses CREATE UNIQUE INDEX IF NOT EXISTS.
CREATE UNIQUE INDEX IF NOT EXISTS efile_court_locations_cli_state_uidx
  ON efile_court_locations (cli_code, jurisdiction_state);
