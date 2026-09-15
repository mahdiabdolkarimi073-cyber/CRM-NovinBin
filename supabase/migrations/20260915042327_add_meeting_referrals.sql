/*
# Create meeting_referrals table

1. New Tables
- `meeting_referrals`
  - id (uuid, primary key)
  - meeting_id (uuid, NOT NULL — links to meetings table managed by Prisma)
  - referred_to_profile_id (uuid, nullable — who the meeting is referred to)
  - referred_by_profile_id (uuid, nullable — who made the referral)
  - status (text, default 'active')
  - note (text, nullable)
  - created_at (timestamptz, default now())
2. Security
- Enable RLS on meeting_referrals.
- Allow anon + authenticated CRUD (shared model, access control handled in app layer).
3. Indexes
- Index on meeting_id for fast lookups.
- Index on referred_to_profile_id.
*/

CREATE TABLE IF NOT EXISTS meeting_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL,
  referred_to_profile_id uuid,
  referred_by_profile_id uuid,
  status text NOT NULL DEFAULT 'active',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_referrals_meeting_id ON meeting_referrals(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_referrals_referred_to ON meeting_referrals(referred_to_profile_id);

ALTER TABLE meeting_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_meeting_referrals" ON meeting_referrals;
CREATE POLICY "select_meeting_referrals" ON meeting_referrals FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_meeting_referrals" ON meeting_referrals;
CREATE POLICY "insert_meeting_referrals" ON meeting_referrals FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_meeting_referrals" ON meeting_referrals;
CREATE POLICY "update_meeting_referrals" ON meeting_referrals FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_meeting_referrals" ON meeting_referrals;
CREATE POLICY "delete_meeting_referrals" ON meeting_referrals FOR DELETE
  TO anon, authenticated USING (true);
