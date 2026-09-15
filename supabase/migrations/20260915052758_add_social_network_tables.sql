/*
# Add Social Network (شبکه اجتماعی نوین بین) tables

1. Purpose
   - Adds a social network feature with direct messaging (DM) and Telegram-like groups.
   - All users registered in the CRM (profiles) can be added to groups.
   - Supports real-time chat, online/offline presence, read receipts, emoji, images, and files.

2. New Tables
   - `social_dm_messages` — 1:1 direct messages between any two users
   - `social_groups` — group chat (like Telegram groups)
   - `social_group_members` — group membership
   - `social_group_messages` — messages within a group
   - `social_group_message_reads` — read tracking for group messages

3. Security (RLS)
   - DM messages: users can only see messages they sent or received.
   - Groups: users can see groups they are a member of; owner can create/update/delete.
   - Group members: owner can add/remove; members can leave.
   - Group messages: members can see and send; sender can delete own.
   - Read receipts: members can mark messages as read.

4. Important Notes
   - These tables are NOT org-scoped; they are user-scoped for cross-org communication.
   - All authenticated CRM users have access (universal feature).
*/

-- ============ Create all tables first ============

CREATE TABLE IF NOT EXISTS social_dm_messages (
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

CREATE TABLE IF NOT EXISTS social_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  avatar_url text,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS social_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES social_groups(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, profile_id)
);

CREATE TABLE IF NOT EXISTS social_group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES social_groups(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text,
  attachment_url text,
  attachment_name text,
  attachment_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS social_group_message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES social_group_messages(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, profile_id)
);

-- ============ Enable RLS on all tables ============

ALTER TABLE social_dm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_group_message_reads ENABLE ROW LEVEL SECURITY;

-- ============ Indexes ============

CREATE INDEX IF NOT EXISTS idx_social_dm_sender ON social_dm_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_social_dm_receiver ON social_dm_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_social_dm_pair ON social_dm_messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_social_groups_owner ON social_groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_social_group_members_group ON social_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_social_group_members_profile ON social_group_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_social_group_messages_group ON social_group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_social_group_messages_sender ON social_group_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_social_group_messages_created ON social_group_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_social_group_msg_reads_message ON social_group_message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_social_group_msg_reads_profile ON social_group_message_reads(profile_id);

-- ============ Policies: social_dm_messages ============

DROP POLICY IF EXISTS "select_own_social_dm" ON social_dm_messages;
CREATE POLICY "select_own_social_dm" ON social_dm_messages FOR SELECT
  TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "insert_own_social_dm" ON social_dm_messages;
CREATE POLICY "insert_own_social_dm" ON social_dm_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "update_own_social_dm" ON social_dm_messages;
CREATE POLICY "update_own_social_dm" ON social_dm_messages FOR UPDATE
  TO authenticated USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "delete_own_social_dm" ON social_dm_messages;
CREATE POLICY "delete_own_social_dm" ON social_dm_messages FOR DELETE
  TO authenticated USING (auth.uid() = sender_id);

-- ============ Policies: social_groups ============

DROP POLICY IF EXISTS "select_member_social_groups" ON social_groups;
CREATE POLICY "select_member_social_groups" ON social_groups FOR SELECT
  TO authenticated USING (
    owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM social_group_members
      WHERE social_group_members.group_id = social_groups.id
      AND social_group_members.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_social_group" ON social_groups;
CREATE POLICY "insert_own_social_group" ON social_groups FOR INSERT
  TO authenticated WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "update_own_social_group" ON social_groups;
CREATE POLICY "update_own_social_group" ON social_groups FOR UPDATE
  TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_social_group" ON social_groups;
CREATE POLICY "delete_own_social_group" ON social_groups FOR DELETE
  TO authenticated USING (owner_id = auth.uid());

-- ============ Policies: social_group_members ============

DROP POLICY IF EXISTS "select_member_social_group_members" ON social_group_members;
CREATE POLICY "select_member_social_group_members" ON social_group_members FOR SELECT
  TO authenticated USING (
    profile_id = auth.uid() OR EXISTS (
      SELECT 1 FROM social_group_members gm2
      WHERE gm2.group_id = social_group_members.group_id
      AND gm2.profile_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM social_groups
      WHERE social_groups.id = social_group_members.group_id
      AND social_groups.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_social_group_members" ON social_group_members;
CREATE POLICY "insert_social_group_members" ON social_group_members FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM social_groups
      WHERE social_groups.id = social_group_members.group_id
      AND social_groups.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_social_group_members" ON social_group_members;
CREATE POLICY "delete_social_group_members" ON social_group_members FOR DELETE
  TO authenticated USING (
    profile_id = auth.uid() OR EXISTS (
      SELECT 1 FROM social_groups
      WHERE social_groups.id = social_group_members.group_id
      AND social_groups.owner_id = auth.uid()
    )
  );

-- ============ Policies: social_group_messages ============

DROP POLICY IF EXISTS "select_member_social_group_messages" ON social_group_messages;
CREATE POLICY "select_member_social_group_messages" ON social_group_messages FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM social_group_members
      WHERE social_group_members.group_id = social_group_messages.group_id
      AND social_group_members.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_member_social_group_messages" ON social_group_messages;
CREATE POLICY "insert_member_social_group_messages" ON social_group_messages FOR INSERT
  TO authenticated WITH CHECK (
    sender_id = auth.uid() AND EXISTS (
      SELECT 1 FROM social_group_members
      WHERE social_group_members.group_id = social_group_messages.group_id
      AND social_group_members.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_social_group_message" ON social_group_messages;
CREATE POLICY "delete_own_social_group_message" ON social_group_messages FOR DELETE
  TO authenticated USING (sender_id = auth.uid());

-- ============ Policies: social_group_message_reads ============

DROP POLICY IF EXISTS "select_own_social_group_msg_reads" ON social_group_message_reads;
CREATE POLICY "select_own_social_group_msg_reads" ON social_group_message_reads FOR SELECT
  TO authenticated USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "insert_own_social_group_msg_read" ON social_group_message_reads;
CREATE POLICY "insert_own_social_group_msg_read" ON social_group_message_reads FOR INSERT
  TO authenticated WITH CHECK (profile_id = auth.uid());
