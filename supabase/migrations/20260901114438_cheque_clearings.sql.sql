/*
# وصول چک پرداختی — Cheque Clearings + my_cheques table

Creates the my_cheques table (if not exists) and the clearing system for issued cheques.

## 1. my_cheques table
Stores cheques linked to payment announcements (both received and issued types).
- id, org_id, payment_announcement_id, bank_account_id, cheque_number, sayadi_number
- amount, date, type (received|issued), description, created_by, created_at
- status (issued|in_clearing|cleared|returned|voided|reversed) — default 'issued'
- due_date, payee, cleared_amount, cleared_date, previous_status, updated_at

## 2. cheque_clearings table
Main clearing record — each row = one clearing attempt for an issued cheque.

## 3. cheque_clearing_history table
Full audit log — one row per lifecycle action.

## Security
- RLS enabled on all tables.
- Policies allow anon + authenticated full CRUD (app handles auth via JWT in API route).
*/

-- my_cheques table
CREATE TABLE IF NOT EXISTS my_cheques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  payment_announcement_id uuid NOT NULL,
  bank_account_id uuid,
  cheque_number text NOT NULL,
  sayadi_number text,
  amount bigint NOT NULL DEFAULT 0,
  date timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL DEFAULT 'received',
  description text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'issued',
  due_date timestamptz,
  payee text,
  cleared_amount bigint NOT NULL DEFAULT 0,
  cleared_date timestamptz,
  previous_status text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE my_cheques ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_my_cheques" ON my_cheques;
CREATE POLICY "anon_select_my_cheques" ON my_cheques FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_my_cheques" ON my_cheques;
CREATE POLICY "anon_insert_my_cheques" ON my_cheques FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_my_cheques" ON my_cheques;
CREATE POLICY "anon_update_my_cheques" ON my_cheques FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_my_cheques" ON my_cheques;
CREATE POLICY "anon_delete_my_cheques" ON my_cheques FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_my_cheques_status ON my_cheques(status);
CREATE INDEX IF NOT EXISTS idx_my_cheques_type ON my_cheques(type);

-- Main cheque clearings table
CREATE TABLE IF NOT EXISTS cheque_clearings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  number text NOT NULL,
  cheque_id uuid NOT NULL,
  cheque_number text,
  bank_name text,
  cheque_amount bigint NOT NULL DEFAULT 0,
  clearing_date timestamptz NOT NULL DEFAULT now(),
  bank_account_id uuid,
  bank_account_name text,
  amount bigint NOT NULL DEFAULT 0,
  is_partial boolean NOT NULL DEFAULT false,
  remaining_amount bigint NOT NULL DEFAULT 0,
  payee text,
  counterparty_id uuid,
  counterparty_name text,
  description text,
  reason text,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL,
  approved_by uuid,
  approved_at timestamptz,
  rejected_reason text,
  finalized_by uuid,
  finalized_at timestamptz,
  journal_entry_id uuid,
  previous_cheque_status text,
  reversed_by uuid,
  reversed_at timestamptz,
  reverse_reason text,
  reverse_journal_entry_id uuid,
  accounting_posted boolean NOT NULL DEFAULT false,
  obligation_closed boolean NOT NULL DEFAULT false,
  fiscal_period_checked boolean NOT NULL DEFAULT false,
  bank_account_active_checked boolean NOT NULL DEFAULT false,
  due_date_checked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cheque_clearings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_cheque_clearings" ON cheque_clearings;
CREATE POLICY "anon_select_cheque_clearings" ON cheque_clearings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_cheque_clearings" ON cheque_clearings;
CREATE POLICY "anon_insert_cheque_clearings" ON cheque_clearings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_cheque_clearings" ON cheque_clearings;
CREATE POLICY "anon_update_cheque_clearings" ON cheque_clearings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_cheque_clearings" ON cheque_clearings;
CREATE POLICY "anon_delete_cheque_clearings" ON cheque_clearings FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_cheque_clearings_status ON cheque_clearings(status);
CREATE INDEX IF NOT EXISTS idx_cheque_clearings_cheque ON cheque_clearings(cheque_id);
CREATE INDEX IF NOT EXISTS idx_cheque_clearings_number ON cheque_clearings(number);

-- History table
CREATE TABLE IF NOT EXISTS cheque_clearing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  clearing_id uuid NOT NULL REFERENCES cheque_clearings(id) ON DELETE CASCADE,
  action text NOT NULL,
  action_by uuid NOT NULL,
  action_at timestamptz NOT NULL DEFAULT now(),
  from_status text,
  to_status text,
  reason text,
  amount bigint,
  journal_entry_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cheque_clearing_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_cheque_clearing_history" ON cheque_clearing_history;
CREATE POLICY "anon_select_cheque_clearing_history" ON cheque_clearing_history FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_cheque_clearing_history" ON cheque_clearing_history;
CREATE POLICY "anon_insert_cheque_clearing_history" ON cheque_clearing_history FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_cheque_clearing_history" ON cheque_clearing_history;
CREATE POLICY "anon_update_cheque_clearing_history" ON cheque_clearing_history FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_cheque_clearing_history" ON cheque_clearing_history;
CREATE POLICY "anon_delete_cheque_clearing_history" ON cheque_clearing_history FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_cheque_clearing_history_clearing ON cheque_clearing_history(clearing_id);
