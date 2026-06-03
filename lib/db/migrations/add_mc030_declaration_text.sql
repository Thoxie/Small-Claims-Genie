-- Migration: add mc030_declaration_text column to cases table
-- Adds persistent storage for the AI-generated MC-030 declaration body text
-- so the E-Filing page (Step 8) can download a pre-filled PDF without
-- requiring the user to re-generate from Step 6.
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS mc030_declaration_text text;
