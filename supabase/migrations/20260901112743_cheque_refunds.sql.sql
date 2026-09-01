/*
# استرداد چک — Cheque Refunds (عملیاتی)

This migration creates two new tables for the full lifecycle management of cheque refunds (استرداد چک).
A cheque refund is NOT a simple status change — it is a reversible, auditable financial operation
that manages the cheque's status, the counterparty's balance, related settlements, and the
accounting journal entry linked to the original receipt.

## New Tables

### 1. cheque_refunds
Main refund record — stores all info about a single cheque refund request and its lifecycle.
- `id` (uuid PK)
- `org_id` (uuid, nullable)
- `number` (text — unique operational number, auto-generated like RF-<timestamp>)
- `cheque_id` (uuid NOT NULL — FK → received_cheques, the cheque being refunded)
- `recipient_party_id` (uuid, nullable — contact party receiving the cheque back)
- `recipient_name` (text, nullable — free-text recipient name if no contact party)
- `refund_date` (timestamp — date of refund)
- `amount` (bigint — cheque amount at time of refund, copied for history)
- `reason` (text, nullable — reason for refund)
- `description` (text, nullable — additional notes)
- `status` (text — draft | pending_approval | approved | rejected | finalized | cancelled | voided)
  - draft: request created, not yet submitted
  - pending_approval: submitted for approval
  - approved: approved by approver
  - rejected: rejected by approver
  - finalized: refund finalized — cheque status changed to refunded, accounting posted
  - cancelled: refund cancelled before finalization
  - voided: refund voided after finalization (reversal, cheque restored to previous status)
- `created_by` (uuid — profile who created the request)
- `approved_by` (uuid, nullable — profile who approved)
- `approved_at` (timestamp, nullable)
- `rejected_reason` (text, nullable — reason if rejected)
- `finalized_by` (uuid, nullable — profile who finalized)
- `finalized_at` (timestamp, nullable)
- `journal_entry_id` (uuid, nullable — accounting entry for the refund, linked to original receipt entry)
- `original_journal_entry_id` (uuid, nullable — the original receipt's journal entry, for linking)
- `previous_cheque_status` (text, nullable — cheque status before refund, for restoration on void)
- `voided_by` (uuid, nullable — profile who voided the refund)
- `voided_at` (timestamp, nullable)
- `void_reason` (text, nullable — reason for voiding)
- `accounting_posted` (boolean — whether accounting effect has been posted)
- `balance_adjusted` (boolean — whether counterparty balance has been adjusted)
- `settlements_checked` (boolean — whether related settlements were checked)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### 2. cheque_refund_history
Full audit log — one row per lifecycle action (created, submitted, approved, rejected, finalized, cancelled, voided).
- `id` (uuid PK)
- `org_id` (uuid, nullable)
- `refund_id` (uuid FK → cheque_refunds, cascade delete)
- `action` (text — created | submitted | approved | rejected | finalized | cancelled | voided | status_changed)
- `action_by` (uuid — profile who performed the action)
- `action_at` (timestamp — when the action happened)
- `from_status` (text, nullable)
- `to_status` (text, nullable)
- `reason` (text, nullable — reason if applicable)
- `details` (jsonb — extra details)
- `created_at` (timestamp)

## Security
- RLS enabled on both tables.
- Policies allow anon + authenticated full CRUD (app handles auth via JWT in API route).

## Notes
1. FK constraints to other tables (received_cheques, contact_parties, etc.) are omitted at the DB level
   because those tables may not exist in this database instance. Relations are managed at the Prisma ORM level.
2. All amount columns use bigint to match the existing accounting tables pattern.
3. Indexes added on frequently-queried columns.
4. The `previous_cheque_status` field enables void/restoration — if a refund is voided, the cheque
   can be restored to its prior status.
*/

-- Main cheque refunds table
CREATE TABLE IF NOT EXISTS cheque_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  number text NOT NULL,
  cheque_id uuid NOT NULL,
  recipient_party_id uuid,
  recipient_name text,
  refund_date timestamptz NOT NULL DEFAULT now(),
  amount bigint NOT NULL DEFAULT 0,
  reason text,
  description text,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL,
  approved_by uuid,
  approved_at timestamptz,
  rejected_reason text,
  finalized_by uuid,
  finalized_at timestamptz,
  journal_entry_id uuid,
  original_journal_entry_id uuid,
  previous_cheque_status text,
  voided_by uuid,
  voided_at timestamptz,
  void_reason text,
  accounting_posted boolean NOT NULL DEFAULT false,
  balance_adjusted boolean NOT NULL DEFAULT false,
  settlements_checked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cheque_refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_cheque_refunds" ON cheque_refunds;
CREATE POLICY "anon_select_cheque_refunds" ON cheque_refunds FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_cheque_refunds" ON cheque_refunds;
CREATE POLICY "anon_insert_cheque_refunds" ON cheque_refunds FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_cheque_refunds" ON cheque_refunds;
CREATE POLICY "anon_update_cheque_refunds" ON cheque_refunds FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_cheque_refunds" ON cheque_refunds;
CREATE POLICY "anon_delete_cheque_refunds" ON cheque_refunds FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_cheque_refunds_status ON cheque_refunds(status);
CREATE INDEX IF NOT EXISTS idx_cheque_refunds_cheque ON cheque_refunds(cheque_id);
CREATE INDEX IF NOT EXISTS idx_cheque_refunds_recipient ON cheque_refunds(recipient_party_id);
CREATE INDEX IF NOT EXISTS idx_cheque_refunds_number ON cheque_refunds(number);

-- History / audit log table
CREATE TABLE IF NOT EXISTS cheque_refund_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  refund_id uuid NOT NULL REFERENCES cheque_refunds(id) ON DELETE CASCADE,
  action text NOT NULL,
  action_by uuid NOT NULL,
  action_at timestamptz NOT NULL DEFAULT now(),
  from_status text,
  to_status text,
  reason text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cheque_refund_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_cheque_refund_history" ON cheque_refund_history;
CREATE POLICY "anon_select_cheque_refund_history" ON cheque_refund_history FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_cheque_refund_history" ON cheque_refund_history;
CREATE POLICY "anon_insert_cheque_refund_history" ON cheque_refund_history FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_cheque_refund_history" ON cheque_refund_history;
CREATE POLICY "anon_update_cheque_refund_history" ON cheque_refund_history FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_cheque_refund_history" ON cheque_refund_history;
CREATE POLICY "anon_delete_cheque_refund_history" ON cheque_refund_history FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_cheque_refund_history_refund ON cheque_refund_history(refund_id);
