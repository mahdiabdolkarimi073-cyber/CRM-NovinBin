/*
# Add personal customers table (my_customers)

## Purpose
Each staff member (personnel, admin, super_admin, owner) can add their own personal customers
that only they and super_admins can see. This is separate from the main `customers` table
(which is the "club customers" / باشگاه مشتریان page). Super admins can view every user's
personal customers, but regular users only see their own.

## New Table: my_customers
- `id` (uuid, primary key, default gen_random_uuid())
- `profile_id` (uuid, not null) — the staff member who owns this personal customer
- `type` (text, default 'individual') — individual | company
- `first_name` (text, nullable)
- `last_name` (text, nullable)
- `company_name` (text, nullable)
- `national_id` (text, nullable)
- `email` (text, nullable)
- `phone` (text, nullable)
- `mobile` (text, nullable)
- `address` (text, nullable)
- `city` (text, nullable)
- `province` (text, nullable)
- `postal_code` (text, nullable)
- `notes` (text, nullable)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

## Security (RLS)
- Enable RLS on `my_customers`.
- SELECT: authenticated users can only read their own rows. Super admins (role in raw_app_meta_data = 'super_admin' or 'owner') can read all rows.
- INSERT: authenticated users can only insert rows with their own profile_id.
- UPDATE: authenticated users can only update their own rows. Super admins can update any.
- DELETE: authenticated users can only delete their own rows. Super admins can delete any.

## Notes
1. The `profile_id` column links to `profiles.id` (which is the same as `auth.users.id`).
2. Super admin detection uses `raw_app_meta_data->>'role'` to check for 'super_admin' or 'owner'.
3. The app's API layer (Next.js route) also enforces filtering by profile.id for non-super-admins.
*/

CREATE TABLE IF NOT EXISTS my_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'individual',
  first_name text,
  last_name text,
  company_name text,
  national_id text,
  email text,
  phone text,
  mobile text,
  address text,
  city text,
  province text,
  postal_code text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_my_customers_profile_id ON my_customers(profile_id);

ALTER TABLE my_customers ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user a super_admin or owner?
CREATE OR REPLACE FUNCTION is_super_admin_role()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'raw_app_meta_data' ->> 'role') IN ('super_admin', 'owner'),
    false
  );
$$;

-- SELECT: users see only their own rows; super admins see all
DROP POLICY IF EXISTS "select_own_my_customers" ON my_customers;
CREATE POLICY "select_own_my_customers"
ON my_customers FOR SELECT
TO authenticated
USING (auth.uid() = profile_id OR is_super_admin_role());

-- INSERT: users can only insert rows with their own profile_id
DROP POLICY IF EXISTS "insert_own_my_customers" ON my_customers;
CREATE POLICY "insert_own_my_customers"
ON my_customers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = profile_id);

-- UPDATE: users can only update their own rows; super admins can update any
DROP POLICY IF EXISTS "update_own_my_customers" ON my_customers;
CREATE POLICY "update_own_my_customers"
ON my_customers FOR UPDATE
TO authenticated
USING (auth.uid() = profile_id OR is_super_admin_role())
WITH CHECK (auth.uid() = profile_id OR is_super_admin_role());

-- DELETE: users can only delete their own rows; super admins can delete any
DROP POLICY IF EXISTS "delete_own_my_customers" ON my_customers;
CREATE POLICY "delete_own_my_customers"
ON my_customers FOR DELETE
TO authenticated
USING (auth.uid() = profile_id OR is_super_admin_role());
