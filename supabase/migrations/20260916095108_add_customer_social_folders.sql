/*
# Customer Social Network — Folder-Based Contact Management

## Purpose
Adds a folder-based social network for the customer portal ("باشگاه مشتریان").
Super admins create folders, assign staff (personnel/managers) to each folder,
and customers can see only the staff in their assigned folders — then chat and call them.
Staff see a "customer contacts" folder listing every customer they've interacted with.
Phone numbers are never exposed in this social network.

## New Tables
1. customer_social_folders — Folders created by super admins
2. customer_social_folder_members — Staff assigned to folders
3. customer_social_folder_customers — Customers who can see each folder
4. customer_social_messages — DM messages between customers and staff
5. customer_social_call_sessions — WebRTC call sessions
6. customer_social_call_signals — WebRTC signaling relay

## Security
RLS is enabled on all tables with permissive policies since auth is handled
server-side via JWT cookies in the /api/data route. The API layer enforces
ownership and role checks.
*/

-- 1. Folders
CREATE TABLE IF NOT EXISTS customer_social_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE customer_social_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cs_folders_all" ON customer_social_folders;
CREATE POLICY "cs_folders_all" ON customer_social_folders FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- 2. Folder Members (staff assigned to folders)
CREATE TABLE IF NOT EXISTS customer_social_folder_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES customer_social_folders(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL,
  assigned_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(folder_id, profile_id)
);
ALTER TABLE customer_social_folder_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cs_folder_members_all" ON customer_social_folder_members;
CREATE POLICY "cs_folder_members_all" ON customer_social_folder_members FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. Folder Customers (which customers can see which folders)
CREATE TABLE IF NOT EXISTS customer_social_folder_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES customer_social_folders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  assigned_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(folder_id, customer_id)
);
ALTER TABLE customer_social_folder_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cs_folder_customers_all" ON customer_social_folder_customers;
CREATE POLICY "cs_folder_customers_all" ON customer_social_folder_customers FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. Customer-Social Messages (customer ↔ staff DMs)
CREATE TABLE IF NOT EXISTS customer_social_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text,
  attachment_url text,
  attachment_name text,
  attachment_type text,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE customer_social_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cs_messages_all" ON customer_social_messages;
CREATE POLICY "cs_messages_all" ON customer_social_messages FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. Call Sessions
CREATE TABLE IF NOT EXISTS customer_social_call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  call_type text NOT NULL,
  status text NOT NULL DEFAULT 'calling',
  offer_sdp text,
  answer_sdp text,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds int,
  end_reason text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE customer_social_call_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cs_calls_all" ON customer_social_call_sessions;
CREATE POLICY "cs_calls_all" ON customer_social_call_sessions FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- 6. Call Signals
CREATE TABLE IF NOT EXISTS customer_social_call_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id uuid NOT NULL REFERENCES customer_social_call_sessions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  signal_type text NOT NULL,
  signal_data text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE customer_social_call_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cs_signals_all" ON customer_social_call_signals;
CREATE POLICY "cs_signals_all" ON customer_social_call_signals FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cs_msg_sender ON customer_social_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_cs_msg_receiver ON customer_social_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_cs_msg_created ON customer_social_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_cs_calls_receiver ON customer_social_call_sessions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_cs_calls_caller ON customer_social_call_sessions(caller_id);
CREATE INDEX IF NOT EXISTS idx_cs_signals_receiver ON customer_social_call_signals(receiver_id);
CREATE INDEX IF NOT EXISTS idx_cs_folder_members_profile ON customer_social_folder_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_cs_folder_customers_customer ON customer_social_folder_customers(customer_id);
