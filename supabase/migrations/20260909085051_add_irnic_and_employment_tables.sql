/*
# Add IRNIC Identity and Employment Application tables

1. New Tables
- `irnic_identities`: Stores IRNIC identity credentials for customer websites.
- `employment_applications`: Stores public employment application form submissions.

2. Security
- RLS enabled on both tables.
- irnic_identities: authenticated CRUD (access control in app API).
- employment_applications: anon can INSERT, authenticated can SELECT/UPDATE.
*/

CREATE TABLE IF NOT EXISTS irnic_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  site_name text NOT NULL,
  irnic_id text NOT NULL,
  password text NOT NULL,
  assigned_to uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS irnic_identities_irnic_id_key ON irnic_identities (irnic_id);

ALTER TABLE irnic_identities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_irnic" ON irnic_identities;
CREATE POLICY "authenticated_select_irnic" ON irnic_identities
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_irnic" ON irnic_identities;
CREATE POLICY "authenticated_insert_irnic" ON irnic_identities
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_irnic" ON irnic_identities;
CREATE POLICY "authenticated_update_irnic" ON irnic_identities
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_irnic" ON irnic_identities;
CREATE POLICY "authenticated_delete_irnic" ON irnic_identities
  FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS employment_applications (
  id text PRIMARY KEY,
  full_name text NOT NULL,
  form_data jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE employment_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_employment" ON employment_applications;
CREATE POLICY "anon_insert_employment" ON employment_applications
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_select_employment" ON employment_applications;
CREATE POLICY "authenticated_select_employment" ON employment_applications
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_update_employment" ON employment_applications;
CREATE POLICY "authenticated_update_employment" ON employment_applications
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
