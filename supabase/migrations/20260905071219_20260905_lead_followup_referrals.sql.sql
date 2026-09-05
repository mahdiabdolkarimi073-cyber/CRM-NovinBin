/*
# Create leads table and lead_referrals table

Creates the leads table (matching the Prisma schema) plus the new lead_referrals table,
follow_up_result column, and updated_at column with auto-update trigger.
*/

-- 1. Create leads table (base schema from Prisma)
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" uuid,
  name text NOT NULL,
  company text,
  phone text,
  email text,
  source text,
  score int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'new',
  "assignedTo" uuid,
  "customerId" uuid,
  notes text,
  "nextFollowUp" timestamptz,
  "createdBy" uuid NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  follow_up_result text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Add follow_up_result and updated_at if table already existed without them
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_result text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 3. Create lead_referrals table
CREATE TABLE IF NOT EXISTS lead_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  referred_to_profile_id uuid,
  referred_by_profile_id uuid,
  status text NOT NULL DEFAULT 'active',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_referrals_lead_id ON lead_referrals(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_referrals_referred_to ON lead_referrals(referred_to_profile_id);

-- 4. RLS
ALTER TABLE lead_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_lead_referrals" ON lead_referrals;
CREATE POLICY "select_lead_referrals" ON lead_referrals FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_lead_referrals" ON lead_referrals;
CREATE POLICY "insert_lead_referrals" ON lead_referrals FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_lead_referrals" ON lead_referrals;
CREATE POLICY "update_lead_referrals" ON lead_referrals FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_lead_referrals" ON lead_referrals;
CREATE POLICY "delete_lead_referrals" ON lead_referrals FOR DELETE
  TO anon, authenticated USING (true);

-- 5. Trigger to auto-update leads.updated_at
CREATE OR REPLACE FUNCTION set_leads_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_set_updated_at ON leads;
CREATE TRIGGER leads_set_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION set_leads_updated_at();
