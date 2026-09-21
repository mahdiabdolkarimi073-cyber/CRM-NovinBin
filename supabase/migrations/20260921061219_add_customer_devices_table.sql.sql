/*
# Add customer_devices table — active device tracking (like Telegram active sessions)

1. New Tables
- `customer_devices`: tracks each active device/session for a customer profile
  - `id` (uuid, primary key)
  - `profile_id` (uuid, FK to profiles, the customer who owns this device)
  - `device_model` (text, e.g. "iPhone 14 Pro", "Samsung Galaxy S23")
  - `device_brand` (text, e.g. "Apple", "Samsung")
  - `os_version` (text, e.g. "iOS 17.2", "Android 14")
  - `ip_address` (text, the last known IP address)
  - `user_agent` (text, the browser/app user agent string)
  - `app_version` (text, the app version if applicable)
  - `is_active` (boolean, default true — can be deactivated by admin)
  - `last_seen_at` (timestamptz, last time this device was online)
  - `first_seen_at` (timestamptz, when the device first connected)
  - `device_name` (text, a friendly nickname for the device)
  - `location` (text, approximate location based on IP, optional)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Security
- Enable RLS on `customer_devices`.
- This is a multi-tenant app with auth, so scope to `authenticated` role.
- All authenticated users can read device info (staff need to see customer devices).
- Only authenticated users can insert/update/delete (staff manage devices).
*/

CREATE TABLE IF NOT EXISTS customer_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  device_model text,
  device_brand text,
  os_version text,
  ip_address text,
  user_agent text,
  app_version text,
  is_active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz DEFAULT now(),
  first_seen_at timestamptz DEFAULT now(),
  device_name text,
  location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_devices_profile_id ON customer_devices(profile_id);
CREATE INDEX IF NOT EXISTS idx_customer_devices_is_active ON customer_devices(is_active);

ALTER TABLE customer_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_customer_devices" ON customer_devices;
CREATE POLICY "select_customer_devices"
  ON customer_devices FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_customer_devices" ON customer_devices;
CREATE POLICY "insert_customer_devices"
  ON customer_devices FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_customer_devices" ON customer_devices;
CREATE POLICY "update_customer_devices"
  ON customer_devices FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_customer_devices" ON customer_devices;
CREATE POLICY "delete_customer_devices"
  ON customer_devices FOR DELETE
  TO authenticated USING (true);
