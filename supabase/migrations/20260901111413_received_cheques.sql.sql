/*
# چک دریافتی — عملیاتی — Received Cheques (Operational)

This migration creates two new tables for the full lifecycle management of received cheques.

## New Tables

### 1. received_cheques
Main cheque record — stores all base + financial info and current status.
- `id` (uuid PK)
- `org_id` (uuid, nullable)
- `number` (text — unique operational number, auto-generated like RC-<timestamp>)
- `cheque_number` (text — actual cheque number on the paper)
- `sayadi_number` (text, nullable — صیادی ID)
- `bank_name` (text — issuing bank)
- `branch_name` (text, nullable — branch)
- `issuer_account_no` (text, nullable — issuer's account number at the bank)
- `amount` (bigint — cheque amount)
- `issue_date` (timestamp — cheque issue date)
- `due_date` (timestamp — cheque due/maturity date)
- `issuer_party_id` (uuid, nullable — contact party who issued the cheque)
- `issuer_name` (text, nullable — free-text issuer name if no contact party)
- `receiver_name` (text, nullable — who received the cheque on our side)
- `subject` (text, nullable — "بابت" / on account of)
- `bank_account_id` (uuid, nullable — linked bank account for deposit/clearing)
- `cash_fund_id` (uuid, nullable — cash fund where cheque is held)
- `storage_location` (text, nullable — free-text storage location: صندوق، خزانه، etc.)
- `status` (text — received | in_custody | pending_due | deposited | cleared | returned | refunded | voided | transferred)
- `description` (text, nullable)
- `created_by` (uuid — creator profile)
- `journal_entry_id` (uuid, nullable — linked accounting journal entry for the receipt)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### 2. received_cheque_operations
Full audit/operation log — one row per lifecycle action (receive, deposit, clear, return, refund, transfer, void, amend).
- `id` (uuid PK)
- `org_id` (uuid, nullable)
- `cheque_id` (uuid FK → received_cheques, cascade delete)
- `operation_type` (text — receive | deposit | clear | return | refund | transfer | void | amend | status_change)
- `from_status` (text, nullable)
- `to_status` (text, nullable)
- `operation_date` (timestamp — when the action happened)
- `operation_by` (uuid — profile who performed the action)
- `bank_account_id` (uuid, nullable — bank account involved in this operation)
- `cash_fund_id` (uuid, nullable — cash fund involved)
- `counterparty_id` (uuid, nullable — receiving party for transfer/refund)
- `counterparty_name` (text, nullable — free-text name)
- `previous_location` (text, nullable — where cheque was before this op)
- `new_location` (text, nullable — where cheque is after this op)
- `reason` (text, nullable — reason for return/void/refund)
- `journal_entry_id` (uuid, nullable — accounting entry for this operation)
- `details` (jsonb — extra details)
- `created_at` (timestamp)

## Security
- RLS enabled on both tables.
- Policies allow anon + authenticated full CRUD (app handles auth via JWT in API route).

## Notes
1. FK constraints to other tables (contact_parties, bank_accounts, etc.) are omitted because those tables may not exist in this database instance. Relations are managed at the Prisma ORM level.
2. All amount columns use bigint to match the existing accounting tables pattern.
3. Indexes added on frequently-queried columns.
*/

-- Main received cheques table
CREATE TABLE IF NOT EXISTS received_cheques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  number text NOT NULL,
  cheque_number text NOT NULL,
  sayadi_number text,
  bank_name text NOT NULL,
  branch_name text,
  issuer_account_no text,
  amount bigint NOT NULL DEFAULT 0,
  issue_date timestamptz NOT NULL DEFAULT now(),
  due_date timestamptz NOT NULL DEFAULT now(),
  issuer_party_id uuid,
  issuer_name text,
  receiver_name text,
  subject text,
  bank_account_id uuid,
  cash_fund_id uuid,
  storage_location text,
  status text NOT NULL DEFAULT 'received',
  description text,
  created_by uuid NOT NULL,
  journal_entry_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE received_cheques ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_received_cheques" ON received_cheques;
CREATE POLICY "anon_select_received_cheques" ON received_cheques FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_received_cheques" ON received_cheques;
CREATE POLICY "anon_insert_received_cheques" ON received_cheques FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_received_cheques" ON received_cheques;
CREATE POLICY "anon_update_received_cheques" ON received_cheques FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_received_cheques" ON received_cheques;
CREATE POLICY "anon_delete_received_cheques" ON received_cheques FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_received_cheques_status ON received_cheques(status);
CREATE INDEX IF NOT EXISTS idx_received_cheques_due_date ON received_cheques(due_date);
CREATE INDEX IF NOT EXISTS idx_received_cheques_issuer ON received_cheques(issuer_party_id);

-- Operations / history table
CREATE TABLE IF NOT EXISTS received_cheque_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  cheque_id uuid NOT NULL REFERENCES received_cheques(id) ON DELETE CASCADE,
  operation_type text NOT NULL,
  from_status text,
  to_status text,
  operation_date timestamptz NOT NULL DEFAULT now(),
  operation_by uuid NOT NULL,
  bank_account_id uuid,
  cash_fund_id uuid,
  counterparty_id uuid,
  counterparty_name text,
  previous_location text,
  new_location text,
  reason text,
  journal_entry_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE received_cheque_operations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_received_cheque_operations" ON received_cheque_operations;
CREATE POLICY "anon_select_received_cheque_operations" ON received_cheque_operations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_received_cheque_operations" ON received_cheque_operations;
CREATE POLICY "anon_insert_received_cheque_operations" ON received_cheque_operations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_received_cheque_operations" ON received_cheque_operations;
CREATE POLICY "anon_update_received_cheque_operations" ON received_cheque_operations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_received_cheque_operations" ON received_cheque_operations;
CREATE POLICY "anon_delete_received_cheque_operations" ON received_cheque_operations FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_received_cheque_operations_cheque ON received_cheque_operations(cheque_id);
CREATE INDEX IF NOT EXISTS idx_received_cheque_operations_type ON received_cheque_operations(operation_type);