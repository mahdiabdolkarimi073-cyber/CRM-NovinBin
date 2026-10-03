/*
# Create personal_notes table with reminder support

1. Purpose
   - Creates the personal_notes table for user-private notes with tags, colors,
     pinning, archiving, trashing, and reminder/alarm functionality.

2. New Tables
   - `personal_notes`
     - id (uuid, PK)
     - profile_id (uuid, NOT NULL) — owner
     - title (text, NOT NULL)
     - content (text, nullable)
     - color (text, default 'default')
     - tags (text[], default '{}')
     - pinned (boolean, default false)
     - is_archived (boolean, default false)
     - is_trashed (boolean, default false)
     - trashed_at (timestamptz, nullable)
     - reminder_at (timestamptz, nullable) — when to trigger reminder
     - reminder_enabled (boolean, default false)
     - reminder_dismissed (boolean, default false)
     - created_at (timestamptz)
     - updated_at (timestamptz)

3. Security
   - RLS enabled, owner-scoped CRUD via auth.uid() = profile_id.
   - Index on (profile_id, is_trashed) and (profile_id, reminder_at).
*/

CREATE TABLE IF NOT EXISTS personal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  title text NOT NULL,
  content text,
  color text NOT NULL DEFAULT 'default',
  tags text[] NOT NULL DEFAULT '{}',
  pinned boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  is_trashed boolean NOT NULL DEFAULT false,
  trashed_at timestamptz,
  reminder_at timestamptz,
  reminder_enabled boolean NOT NULL DEFAULT false,
  reminder_dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE personal_notes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_personal_notes_profile ON personal_notes(profile_id);
CREATE INDEX IF NOT EXISTS idx_personal_notes_profile_trashed ON personal_notes(profile_id, is_trashed);
CREATE INDEX IF NOT EXISTS idx_personal_notes_reminder ON personal_notes(profile_id, reminder_at) WHERE reminder_enabled = true;

DROP POLICY IF EXISTS "select_own_notes" ON personal_notes;
CREATE POLICY "select_own_notes" ON personal_notes FOR SELECT
  TO authenticated USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "insert_own_notes" ON personal_notes;
CREATE POLICY "insert_own_notes" ON personal_notes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "update_own_notes" ON personal_notes;
CREATE POLICY "update_own_notes" ON personal_notes FOR UPDATE
  TO authenticated USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "delete_own_notes" ON personal_notes;
CREATE POLICY "delete_own_notes" ON personal_notes FOR DELETE
  TO authenticated USING (auth.uid() = profile_id);
