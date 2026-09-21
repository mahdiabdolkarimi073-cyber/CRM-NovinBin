/*
# Add Secretariat (دبیرخانه) Tables

1. New Tables
- `secretariat_letters`: Main letters table with type (incoming/outgoing/internal), subject, number, dates, urgency, confidentiality, sender, receiver, CC, body, file number, status state machine, tracking code, registration number, issue info, send info, signature info
- `secretariat_referrals`: Letter circulation between users — from/to, referral type (review/action/inform/approve/sign/reply/archive), deadline, priority, status, return flag
- `secretariat_signatures`: Signature records — signer, status (approved/rejected/correction_requested), notes, content snapshot, digital signature
- `secretariat_attachments`: File attachments for letters — file name, URL, type, size, uploader
- `secretariat_timeline`: Full audit trail — action, actor, timestamp, details

2. Security
- RLS enabled on all tables with permissive policies for anon+authenticated (actual access control enforced in Next.js API layer via JWT)

3. Important Notes
- Status state machine: DRAFT → IN_REVIEW → PENDING_APPROVAL → PENDING_SIGNATURE → SIGNED → REGISTERED → ISSUED → SENT → DELIVERED → ARCHIVED (or REJECTED/CANCELLED at any point)
- After final signature, letter body becomes immutable (signedContent stores the snapshot)
- Each letter tracks currentHolderId to know who currently has the letter
*/

-- Letters table
CREATE TABLE IF NOT EXISTS secretariat_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" uuid,
  "letterType" text NOT NULL DEFAULT 'internal',
  subject text NOT NULL,
  "letterNumber" text,
  "letterDate" date,
  "registeredAt" timestamptz DEFAULT now(),
  urgency text NOT NULL DEFAULT 'normal',
  confidentiality text NOT NULL DEFAULT 'normal',
  "senderName" text,
  "receiverName" text,
  cc text,
  body text,
  "fileNumber" text,
  notes text,
  status text NOT NULL DEFAULT 'DRAFT',
  "trackingCode" text,
  "registrationNumber" text,
  "issuedNumber" text,
  "issuedDate" date,
  "sendMethod" text,
  "sendStatus" text,
  "sentAt" timestamptz,
  "sendTrackingCode" text,
  "signedContent" text,
  "isSigned" boolean NOT NULL DEFAULT false,
  "signedAt" timestamptz,
  "signedById" uuid,
  "createdById" uuid NOT NULL,
  "currentHolderId" uuid,
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);

ALTER TABLE secretariat_letters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_secretariat_letters" ON secretariat_letters;
CREATE POLICY "anon_all_secretariat_letters" ON secretariat_letters FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_all_secretariat_letters_i" ON secretariat_letters;
CREATE POLICY "anon_all_secretariat_letters_i" ON secretariat_letters FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_all_secretariat_letters_u" ON secretariat_letters;
CREATE POLICY "anon_all_secretariat_letters_u" ON secretariat_letters FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_all_secretariat_letters_d" ON secretariat_letters;
CREATE POLICY "anon_all_secretariat_letters_d" ON secretariat_letters FOR DELETE TO anon, authenticated USING (true);

-- Referrals (circulation) table
CREATE TABLE IF NOT EXISTS secretariat_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "letterId" uuid NOT NULL,
  "fromUserId" uuid NOT NULL,
  "toUserId" uuid NOT NULL,
  "referredAt" timestamptz DEFAULT now(),
  "referralType" text NOT NULL DEFAULT 'review',
  notes text,
  deadline timestamptz,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'pending',
  "isReturn" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz DEFAULT now()
);

ALTER TABLE secretariat_referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_secretariat_referrals" ON secretariat_referrals;
CREATE POLICY "anon_all_secretariat_referrals" ON secretariat_referrals FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_all_secretariat_referrals_i" ON secretariat_referrals;
CREATE POLICY "anon_all_secretariat_referrals_i" ON secretariat_referrals FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_all_secretariat_referrals_u" ON secretariat_referrals;
CREATE POLICY "anon_all_secretariat_referrals_u" ON secretariat_referrals FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_all_secretariat_referrals_d" ON secretariat_referrals;
CREATE POLICY "anon_all_secretariat_referrals_d" ON secretariat_referrals FOR DELETE TO anon, authenticated USING (true);

-- Signatures table
CREATE TABLE IF NOT EXISTS secretariat_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "letterId" uuid NOT NULL,
  "signerId" uuid NOT NULL,
  "signedAt" timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  notes text,
  "contentSnapshot" text,
  "digitalSignature" text,
  "createdAt" timestamptz DEFAULT now()
);

ALTER TABLE secretariat_signatures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_secretariat_signatures" ON secretariat_signatures;
CREATE POLICY "anon_all_secretariat_signatures" ON secretariat_signatures FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_all_secretariat_signatures_i" ON secretariat_signatures;
CREATE POLICY "anon_all_secretariat_signatures_i" ON secretariat_signatures FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_all_secretariat_signatures_u" ON secretariat_signatures;
CREATE POLICY "anon_all_secretariat_signatures_u" ON secretariat_signatures FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_all_secretariat_signatures_d" ON secretariat_signatures;
CREATE POLICY "anon_all_secretariat_signatures_d" ON secretariat_signatures FOR DELETE TO anon, authenticated USING (true);

-- Attachments table
CREATE TABLE IF NOT EXISTS secretariat_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "letterId" uuid NOT NULL,
  "fileName" text NOT NULL,
  "fileUrl" text NOT NULL,
  "fileType" text,
  "fileSize" integer,
  "uploadedBy" uuid NOT NULL,
  "createdAt" timestamptz DEFAULT now()
);

ALTER TABLE secretariat_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_secretariat_attachments" ON secretariat_attachments;
CREATE POLICY "anon_all_secretariat_attachments" ON secretariat_attachments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_all_secretariat_attachments_i" ON secretariat_attachments;
CREATE POLICY "anon_all_secretariat_attachments_i" ON secretariat_attachments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_all_secretariat_attachments_u" ON secretariat_attachments;
CREATE POLICY "anon_all_secretariat_attachments_u" ON secretariat_attachments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_all_secretariat_attachments_d" ON secretariat_attachments;
CREATE POLICY "anon_all_secretariat_attachments_d" ON secretariat_attachments FOR DELETE TO anon, authenticated USING (true);

-- Timeline table
CREATE TABLE IF NOT EXISTS secretariat_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "letterId" uuid NOT NULL,
  action text NOT NULL,
  "actionBy" uuid NOT NULL,
  "actionAt" timestamptz DEFAULT now(),
  details text,
  "createdAt" timestamptz DEFAULT now()
);

ALTER TABLE secretariat_timeline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_secretariat_timeline" ON secretariat_timeline;
CREATE POLICY "anon_all_secretariat_timeline" ON secretariat_timeline FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_all_secretariat_timeline_i" ON secretariat_timeline;
CREATE POLICY "anon_all_secretariat_timeline_i" ON secretariat_timeline FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_all_secretariat_timeline_u" ON secretariat_timeline;
CREATE POLICY "anon_all_secretariat_timeline_u" ON secretariat_timeline FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_all_secretariat_timeline_d" ON secretariat_timeline;
CREATE POLICY "anon_all_secretariat_timeline_d" ON secretariat_timeline FOR DELETE TO anon, authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_secretariat_letters_status ON secretariat_letters(status);
CREATE INDEX IF NOT EXISTS idx_secretariat_letters_createdById ON secretariat_letters("createdById");
CREATE INDEX IF NOT EXISTS idx_secretariat_letters_currentHolderId ON secretariat_letters("currentHolderId");
CREATE INDEX IF NOT EXISTS idx_secretariat_referrals_letterId ON secretariat_referrals("letterId");
CREATE INDEX IF NOT EXISTS idx_secretariat_referrals_toUserId ON secretariat_referrals("toUserId");
CREATE INDEX IF NOT EXISTS idx_secretariat_signatures_letterId ON secretariat_signatures("letterId");
CREATE INDEX IF NOT EXISTS idx_secretariat_attachments_letterId ON secretariat_attachments("letterId");
CREATE INDEX IF NOT EXISTS idx_secretariat_timeline_letterId ON secretariat_timeline("letterId");
