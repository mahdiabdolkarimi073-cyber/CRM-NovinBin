/*
# Add Personal Notes and Staff Private Chat tables

1. Purpose
   - Adds two new tables accessible by ALL authenticated users (not restricted to super-admin).
   - `personal_notes`: each user has private notes visible only to themselves.
   - `staff_chat_messages`: 1:1 private chat between any two users (staff, admin, super-admin).
     Supports text, image, and video attachments. Not a group chat — each conversation is between exactly two users.

2. New Tables
   - `personal_notes`
     - id (uuid, PK)
     - profile_id (uuid, NOT NULL) — owner of the note
     - title (text, NOT NULL)
     - content (text, nullable)
     - color (text, default 'default') — for visual categorization
     - pinned (boolean, default false)
     - created_at (timestamptz)
     - updated_at (timestamptz)
   - `staff_chat_messages`
     - id (uuid, PK)
     - sender_id (uuid, NOT NULL)
     - receiver_id (uuid, NOT NULL)
     - content (text, nullable) — text message body
     - attachment_url (text, nullable) — URL to image/video file
     - attachment_name (text, nullable) — original file name
     - attachment_type (text, nullable) — 'image' | 'video' | 'file'
     - read_at (timestamptz, nullable) — when receiver read the message
     - created_at (timestamptz)

3. Security (RLS)
   - `personal_notes`: owner-scoped CRUD — each user can only see/edit/delete their own notes.
   - `staff_chat_messages`: users can only see messages they sent or received.
     Users can insert messages where they are the sender. Users can mark messages they received as read.
     Users can delete messages they sent.

4. Important Notes
   - These tables are NOT org-scoped; they are user-scoped for cross-org communication (chat between all users).
   - No page permission check is enforced in the app layer for these — they are universally accessible.
   - Indexes added on profile_id, sender_id, receiver_id for query performance.
*/

-- ============ personal_notes ============
CREATE TABLE IF NOT EXISTS personal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  title text NOT NULL,
  content text,
  color text NOT NULL DEFAULT 'default',
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE personal_notes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_personal_notes_profile ON personal_notes(profile_id);

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

-- ============ staff_chat_messages ============
CREATE TABLE IF NOT EXISTS staff_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text,
  attachment_url text,
  attachment_name text,
  attachment_type text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE staff_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_staff_chat_sender ON staff_chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_staff_chat_receiver ON staff_chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_staff_chat_pair ON staff_chat_messages(sender_id, receiver_id);

DROP POLICY IF EXISTS "select_own_chat_messages" ON staff_chat_messages;
CREATE POLICY "select_own_chat_messages" ON staff_chat_messages FOR SELECT
  TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "insert_own_chat_messages" ON staff_chat_messages;
CREATE POLICY "insert_own_chat_messages" ON staff_chat_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "update_own_chat_messages" ON staff_chat_messages;
CREATE POLICY "update_own_chat_messages" ON staff_chat_messages FOR UPDATE
  TO authenticated USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "delete_own_chat_messages" ON staff_chat_messages;
CREATE POLICY "delete_own_chat_messages" ON staff_chat_messages FOR DELETE
  TO authenticated USING (auth.uid() = sender_id);
