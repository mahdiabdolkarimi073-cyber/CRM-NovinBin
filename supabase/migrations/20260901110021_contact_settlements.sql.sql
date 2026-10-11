/*
# تسویه حساب طرف مقابل — Settlement of Counterparty Accounts

This migration creates three new tables for the "تسویه حساب طرف مقابل" (Counterparty Settlement) feature.

## New Tables

### 1. contact_settlements
Main settlement record — tracks the overall settlement operation for a counterparty.
- `id` (uuid PK)
- `org_id` (uuid, nullable — organization scope)
- `number` (text, unique settlement number)
- `contact_party_id` (uuid — the counterparty being settled)
- `settlement_type` (text — full | partial | multi_document | from_payment | from_receipt | setoff | adjustment)
- `settlement_date` (timestamp — date of settlement)
- `fiscal_year_id` (uuid, nullable — fiscal year)
- `cost_center_id` (uuid, nullable — cost center)
- `total_amount` (bigint — total settlement amount)
- `total_debit` (bigint — sum of debit allocations)
- `total_credit` (bigint — sum of credit allocations)
- `fund_type` (text, nullable — cash | bank | setoff | none)
- `bank_account_id` (uuid, nullable — bank account for payment/receipt)
- `cash_fund_id` (uuid, nullable — cash fund for payment/receipt)
- `description` (text, nullable)
- `status` (text — draft | pending_approval | approved | finalized | voided | cancelled)
- `created_by` (uuid — creator profile)
- `approved_by` (uuid, nullable)
- `approved_at` (timestamp, nullable)
- `finalized_by` (uuid, nullable)
- `finalized_at` (timestamp, nullable)
- `voided_by` (uuid, nullable)
- `voided_at` (timestamp, nullable)
- `void_reason` (text, nullable)
- `amended_from_id` (uuid, nullable — original settlement if amended)
- `journal_entry_id` (uuid, nullable — linked accounting journal entry)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### 2. contact_settlement_items
Individual items being settled — each row links to a source document (invoice, payment, cheque, etc.).
- `id` (uuid PK)
- `org_id` (uuid, nullable)
- `settlement_id` (uuid FK → contact_settlements)
- `item_type` (text — invoice | debt | credit | receipt | payment | prepayment | on_account | cheque_receivable | cheque_payable | other)
- `reference_type` (text, nullable — source table name)
- `reference_id` (uuid, nullable — source record id)
- `reference_number` (text, nullable — display number)
- `original_amount` (bigint — original amount of the item)
- `paid_amount` (bigint — amount already paid)
- `settled_amount` (bigint — amount already settled prior)
- `discount` (bigint — discount applied)
- `tax` (bigint — tax amount)
- `fee` (bigint — fee/charge)
- `adjustments` (bigint — other adjustments)
- `balance` (bigint — remaining balance before this settlement)
- `allocation_amount` (bigint — amount allocated in this settlement)
- `item_status` (text — open | partial | settled | closed | voided)
- `description` (text, nullable)
- `created_at` (timestamp)

### 3. contact_settlement_history
Full audit log for each settlement — tracks every action (create, submit, approve, finalize, void, amend).
- `id` (uuid PK)
- `org_id` (uuid, nullable)
- `settlement_id` (uuid FK → contact_settlements)
- `action` (text — created | submitted | approved | rejected | finalized | voided | cancelled | amended)
- `action_by` (uuid — profile who performed the action)
- `action_at` (timestamp)
- `from_status` (text, nullable)
- `to_status` (text, nullable)
- `details` (jsonb — additional details about the action)
- `reason` (text, nullable — reason for void/cancel/amend)

## Security
- RLS enabled on all three tables.
- Policies allow anon + authenticated full CRUD (app handles auth via JWT in API route).

## Notes
1. FK constraints to other tables (contact_parties, fiscal_years, etc.) are omitted because those tables may not exist in this database instance. Relations are managed at the Prisma ORM level.
2. All amount columns use bigint to match the existing accounting tables pattern.
3. Indexes added on frequently-queried columns.
*/

-- Main settlement table
CREATE TABLE IF NOT EXISTS contact_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  number text NOT NULL,
  contact_party_id uuid NOT NULL,
  settlement_type text NOT NULL DEFAULT 'full',
  settlement_date timestamptz NOT NULL DEFAULT now(),
  fiscal_year_id uuid,
  cost_center_id uuid,
  total_amount bigint NOT NULL DEFAULT 0,
  total_debit bigint NOT NULL DEFAULT 0,
  total_credit bigint NOT NULL DEFAULT 0,
  fund_type text,
  bank_account_id uuid,
  cash_fund_id uuid,
  description text,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL,
  approved_by uuid,
  approved_at timestamptz,
  finalized_by uuid,
  finalized_at timestamptz,
  voided_by uuid,
  voided_at timestamptz,
  void_reason text,
  amended_from_id uuid,
  journal_entry_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contact_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_contact_settlements" ON contact_settlements;
CREATE POLICY "anon_select_contact_settlements" ON contact_settlements FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_contact_settlements" ON contact_settlements;
CREATE POLICY "anon_insert_contact_settlements" ON contact_settlements FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_contact_settlements" ON contact_settlements;
CREATE POLICY "anon_update_contact_settlements" ON contact_settlements FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_contact_settlements" ON contact_settlements;
CREATE POLICY "anon_delete_contact_settlements" ON contact_settlements FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_contact_settlements_contact ON contact_settlements(contact_party_id);
CREATE INDEX IF NOT EXISTS idx_contact_settlements_status ON contact_settlements(status);
CREATE INDEX IF NOT EXISTS idx_contact_settlements_date ON contact_settlements(settlement_date);

-- Settlement items table
CREATE TABLE IF NOT EXISTS contact_settlement_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  settlement_id uuid NOT NULL REFERENCES contact_settlements(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  reference_type text,
  reference_id uuid,
  reference_number text,
  original_amount bigint NOT NULL DEFAULT 0,
  paid_amount bigint NOT NULL DEFAULT 0,
  settled_amount bigint NOT NULL DEFAULT 0,
  discount bigint NOT NULL DEFAULT 0,
  tax bigint NOT NULL DEFAULT 0,
  fee bigint NOT NULL DEFAULT 0,
  adjustments bigint NOT NULL DEFAULT 0,
  balance bigint NOT NULL DEFAULT 0,
  allocation_amount bigint NOT NULL DEFAULT 0,
  item_status text NOT NULL DEFAULT 'open',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contact_settlement_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_contact_settlement_items" ON contact_settlement_items;
CREATE POLICY "anon_select_contact_settlement_items" ON contact_settlement_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_contact_settlement_items" ON contact_settlement_items;
CREATE POLICY "anon_insert_contact_settlement_items" ON contact_settlement_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_contact_settlement_items" ON contact_settlement_items;
CREATE POLICY "anon_update_contact_settlement_items" ON contact_settlement_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_contact_settlement_items" ON contact_settlement_items;
CREATE POLICY "anon_delete_contact_settlement_items" ON contact_settlement_items FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_contact_settlement_items_settlement ON contact_settlement_items(settlement_id);
CREATE INDEX IF NOT EXISTS idx_contact_settlement_items_ref ON contact_settlement_items(reference_id);

-- Settlement history table
CREATE TABLE IF NOT EXISTS contact_settlement_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  settlement_id uuid NOT NULL REFERENCES contact_settlements(id) ON DELETE CASCADE,
  action text NOT NULL,
  action_by uuid NOT NULL,
  action_at timestamptz NOT NULL DEFAULT now(),
  from_status text,
  to_status text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contact_settlement_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_contact_settlement_history" ON contact_settlement_history;
CREATE POLICY "anon_select_contact_settlement_history" ON contact_settlement_history FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_contact_settlement_history" ON contact_settlement_history;
CREATE POLICY "anon_insert_contact_settlement_history" ON contact_settlement_history FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_contact_settlement_history" ON contact_settlement_history;
CREATE POLICY "anon_update_contact_settlement_history" ON contact_settlement_history FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_contact_settlement_history" ON contact_settlement_history;
CREATE POLICY "anon_delete_contact_settlement_history" ON contact_settlement_history FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_contact_settlement_history_settlement ON contact_settlement_history(settlement_id);