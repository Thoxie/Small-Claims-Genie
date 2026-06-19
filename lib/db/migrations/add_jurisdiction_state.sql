-- Migration: add jurisdiction_state column to cases table
-- Adds the state (CA or FL) to each case for multi-state support.
-- Existing rows default to "CA" (California) — the only state previously supported.
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS jurisdiction_state text NOT NULL DEFAULT 'CA';
