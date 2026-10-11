/*
# کارتخوان (POS/Card Reader) — جداول کامل سیستم

این مایگریشن سیستم کامل مدیریت کارتخوان و چرخه تراکنش و تسویه را ایجاد می‌کند.

## جداول جدید

### 1. card_readers
موجودیت مستقل کارتخوان — هر ردیف یک کارتخوان فیزیکی.
- id, org_id, number (شناسه داخلی یکتا)
- tid (شماره ترمینال — یکتا), mid (شماره پذیرنده — یکتا)
- bank_name (بانک/شرکت پرداخت), branch_name (شعبه/محل استفاده)
- bank_account_id (حساب بانکی متصل), owner (مالک/واحد استفاده‌کننده)
- status: active | inactive | blocked
- start_date, end_date, description
- accounting links:
  - settlement_account_id (حساب در انتظار تسویه)
  - bank_account_target_id (حساب بانک مقصد تسویه)
  - commission_account_id (حساب کارمزد)
  - discrepancy_account_id (حساب اختلافات/مغایرت)
- created_by, created_at, updated_at

### 2. card_reader_transactions
تراکنش‌های هر کارتخوان.
- id, org_id, number (شناسه داخلی تراکنش)
- card_reader_id (FK)
- transaction_date, amount (مبلغ ناخالص)
- tid, mid (عکس‌برداری از کارتخوان برای کنترل تکراری)
- tracking_number, reference_number
- transaction_type: purchase | refund | reversal | adjustment
- status: registered | confirmed | pending_settlement | settled | failed | returned | discrepancy | cancelled
- bank_account_id (حساب مقصد)
- commission_amount, deductions, net_amount (مبلغ خالص تسویه)
- settlement_id (اتصال به تسویه)
- description, created_by, created_at, updated_at
- Unique constraint on (reference_number + tracking_number + tid + transaction_date + amount) برای جلوگیری از تراکنش تکراری

### 3. card_reader_settlements
سند تسویه کارتخوان — تطبیق تراکنش‌ها با واریز بانک.
- id, org_id, number
- card_reader_id (FK)
- settlement_date, bank_account_id (حساب مقصد واریز)
- gross_amount, commission_amount, deductions, net_amount (خالص تسویه)
- settled_amount (مبلغ واریزشده)
- discrepancy_amount, discrepancy_type, discrepancy_note
- status: draft | pending_approval | approved | finalized | cancelled | voided
- is_partial, remaining_amount
- fiscal_year_id, cost_center_id, journal_entry_id
- created_by, approved_by, approved_at, rejected_reason
- finalized_by, finalized_at, voided_by, voided_at, void_reason
- accounting_posted, closed_at (بستن روز/دوره)
- description, created_at, updated_at

### 4. card_reader_settlement_items
ردیف‌های تسویه — هر ردیف یک تراکنش داخل تسویه.
- id, settlement_id (FK), transaction_id (FK)
- gross_amount, commission_amount, deductions, net_amount
- settled_amount, discrepancy_amount, discrepancy_note
- item_status: open | partial | settled | discrepancy | voided

### 5. card_reader_settlement_history
تاریخچه کامل چرخه تسویه.
- id, settlement_id (FK), action, action_by, action_at
- from_status, to_status, reason, details (jsonb)

### 6. card_reader_history
تاریخچه کامل کارتخوان (تعریف → فعال‌سازی → تراکنش → تسویه → مغایرت → اصلاح → غیرفعال).
- id, card_reader_id (FK), action, action_by, action_at
- from_status, to_status, amount, journal_entry_id, reason, details (jsonb)

## امنیت
- RLS روی همه جداول فعال.
- خط‌مشی‌های anon + authenticated CRUD کامل (احراز هویت توسط JWT در مسیر API مدیریت می‌شود).

## نکات مهم
- شماره ترمینال (tid) و شماره پذیرنده (mid) یکتا هستند.
- Unique constraint روی تراکنش از ثبت تکراری جلوگیری می‌کند.
- کارتخوان غیرفعال برای تراکنش جدید قابل استفاده نیست (در فرانت کنترل می‌شود).
*/

-- 1. card_readers
CREATE TABLE IF NOT EXISTS card_readers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  number text NOT NULL,
  tid text NOT NULL,
  mid text NOT NULL,
  bank_name text NOT NULL,
  branch_name text,
  bank_account_id uuid,
  owner text,
  status text NOT NULL DEFAULT 'active',
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  description text,
  settlement_account_id uuid,
  bank_account_target_id uuid,
  commission_account_id uuid,
  discrepancy_account_id uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE card_readers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_card_readers" ON card_readers;
CREATE POLICY "anon_select_card_readers" ON card_readers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_card_readers" ON card_readers;
CREATE POLICY "anon_insert_card_readers" ON card_readers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_card_readers" ON card_readers;
CREATE POLICY "anon_update_card_readers" ON card_readers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_card_readers" ON card_readers;
CREATE POLICY "anon_delete_card_readers" ON card_readers FOR DELETE
  TO anon, authenticated USING (true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_card_readers_tid ON card_readers(tid);
CREATE UNIQUE INDEX IF NOT EXISTS idx_card_readers_mid ON card_readers(mid);
CREATE INDEX IF NOT EXISTS idx_card_readers_status ON card_readers(status);
CREATE INDEX IF NOT EXISTS idx_card_readers_number ON card_readers(number);

-- 2. card_reader_transactions
CREATE TABLE IF NOT EXISTS card_reader_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  number text NOT NULL,
  card_reader_id uuid NOT NULL REFERENCES card_readers(id) ON DELETE CASCADE,
  transaction_date timestamptz NOT NULL DEFAULT now(),
  amount bigint NOT NULL DEFAULT 0,
  tid text,
  mid text,
  tracking_number text,
  reference_number text,
  transaction_type text NOT NULL DEFAULT 'purchase',
  status text NOT NULL DEFAULT 'registered',
  bank_account_id uuid,
  commission_amount bigint NOT NULL DEFAULT 0,
  deductions bigint NOT NULL DEFAULT 0,
  net_amount bigint NOT NULL DEFAULT 0,
  settlement_id uuid,
  description text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE card_reader_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_card_reader_transactions" ON card_reader_transactions;
CREATE POLICY "anon_select_card_reader_transactions" ON card_reader_transactions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_card_reader_transactions" ON card_reader_transactions;
CREATE POLICY "anon_insert_card_reader_transactions" ON card_reader_transactions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_card_reader_transactions" ON card_reader_transactions;
CREATE POLICY "anon_update_card_reader_transactions" ON card_reader_transactions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_card_reader_transactions" ON card_reader_transactions;
CREATE POLICY "anon_delete_card_reader_transactions" ON card_reader_transactions FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_card_reader_transactions_reader ON card_reader_transactions(card_reader_id);
CREATE INDEX IF NOT EXISTS idx_card_reader_transactions_status ON card_reader_transactions(status);
CREATE INDEX IF NOT EXISTS idx_card_reader_transactions_number ON card_reader_transactions(number);
CREATE INDEX IF NOT EXISTS idx_card_reader_transactions_settlement ON card_reader_transactions(settlement_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_card_reader_transactions_unique
  ON card_reader_transactions(reference_number, tracking_number, tid, transaction_date, amount)
  WHERE reference_number IS NOT NULL AND tracking_number IS NOT NULL;

-- 3. card_reader_settlements
CREATE TABLE IF NOT EXISTS card_reader_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  number text NOT NULL,
  card_reader_id uuid NOT NULL REFERENCES card_readers(id) ON DELETE CASCADE,
  settlement_date timestamptz NOT NULL DEFAULT now(),
  bank_account_id uuid,
  gross_amount bigint NOT NULL DEFAULT 0,
  commission_amount bigint NOT NULL DEFAULT 0,
  deductions bigint NOT NULL DEFAULT 0,
  net_amount bigint NOT NULL DEFAULT 0,
  settled_amount bigint NOT NULL DEFAULT 0,
  discrepancy_amount bigint NOT NULL DEFAULT 0,
  discrepancy_type text,
  discrepancy_note text,
  status text NOT NULL DEFAULT 'draft',
  is_partial boolean NOT NULL DEFAULT false,
  remaining_amount bigint NOT NULL DEFAULT 0,
  fiscal_year_id uuid,
  cost_center_id uuid,
  journal_entry_id uuid,
  accounting_posted boolean NOT NULL DEFAULT false,
  closed_at timestamptz,
  description text,
  created_by uuid NOT NULL,
  approved_by uuid,
  approved_at timestamptz,
  rejected_reason text,
  finalized_by uuid,
  finalized_at timestamptz,
  voided_by uuid,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE card_reader_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_card_reader_settlements" ON card_reader_settlements;
CREATE POLICY "anon_select_card_reader_settlements" ON card_reader_settlements FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_card_reader_settlements" ON card_reader_settlements;
CREATE POLICY "anon_insert_card_reader_settlements" ON card_reader_settlements FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_card_reader_settlements" ON card_reader_settlements;
CREATE POLICY "anon_update_card_reader_settlements" ON card_reader_settlements FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_card_reader_settlements" ON card_reader_settlements;
CREATE POLICY "anon_delete_card_reader_settlements" ON card_reader_settlements FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_card_reader_settlements_reader ON card_reader_settlements(card_reader_id);
CREATE INDEX IF NOT EXISTS idx_card_reader_settlements_status ON card_reader_settlements(status);
CREATE INDEX IF NOT EXISTS idx_card_reader_settlements_number ON card_reader_settlements(number);

-- 4. card_reader_settlement_items
CREATE TABLE IF NOT EXISTS card_reader_settlement_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  settlement_id uuid NOT NULL REFERENCES card_reader_settlements(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL REFERENCES card_reader_transactions(id) ON DELETE CASCADE,
  gross_amount bigint NOT NULL DEFAULT 0,
  commission_amount bigint NOT NULL DEFAULT 0,
  deductions bigint NOT NULL DEFAULT 0,
  net_amount bigint NOT NULL DEFAULT 0,
  settled_amount bigint NOT NULL DEFAULT 0,
  discrepancy_amount bigint NOT NULL DEFAULT 0,
  discrepancy_note text,
  item_status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE card_reader_settlement_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_card_reader_settlement_items" ON card_reader_settlement_items;
CREATE POLICY "anon_select_card_reader_settlement_items" ON card_reader_settlement_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_card_reader_settlement_items" ON card_reader_settlement_items;
CREATE POLICY "anon_insert_card_reader_settlement_items" ON card_reader_settlement_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_card_reader_settlement_items" ON card_reader_settlement_items;
CREATE POLICY "anon_update_card_reader_settlement_items" ON card_reader_settlement_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_card_reader_settlement_items" ON card_reader_settlement_items;
CREATE POLICY "anon_delete_card_reader_settlement_items" ON card_reader_settlement_items FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_card_reader_settlement_items_settlement ON card_reader_settlement_items(settlement_id);
CREATE INDEX IF NOT EXISTS idx_card_reader_settlement_items_transaction ON card_reader_settlement_items(transaction_id);

-- 5. card_reader_settlement_history
CREATE TABLE IF NOT EXISTS card_reader_settlement_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  settlement_id uuid NOT NULL REFERENCES card_reader_settlements(id) ON DELETE CASCADE,
  action text NOT NULL,
  action_by uuid NOT NULL,
  action_at timestamptz NOT NULL DEFAULT now(),
  from_status text,
  to_status text,
  reason text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE card_reader_settlement_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_card_reader_settlement_history" ON card_reader_settlement_history;
CREATE POLICY "anon_select_card_reader_settlement_history" ON card_reader_settlement_history FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_card_reader_settlement_history" ON card_reader_settlement_history;
CREATE POLICY "anon_insert_card_reader_settlement_history" ON card_reader_settlement_history FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_card_reader_settlement_history" ON card_reader_settlement_history;
CREATE POLICY "anon_update_card_reader_settlement_history" ON card_reader_settlement_history FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_card_reader_settlement_history" ON card_reader_settlement_history;
CREATE POLICY "anon_delete_card_reader_settlement_history" ON card_reader_settlement_history FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_card_reader_settlement_history_settlement ON card_reader_settlement_history(settlement_id);

-- 6. card_reader_history
CREATE TABLE IF NOT EXISTS card_reader_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  card_reader_id uuid NOT NULL REFERENCES card_readers(id) ON DELETE CASCADE,
  action text NOT NULL,
  action_by uuid NOT NULL,
  action_at timestamptz NOT NULL DEFAULT now(),
  from_status text,
  to_status text,
  amount bigint,
  journal_entry_id uuid,
  reason text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE card_reader_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_card_reader_history" ON card_reader_history;
CREATE POLICY "anon_select_card_reader_history" ON card_reader_history FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_card_reader_history" ON card_reader_history;
CREATE POLICY "anon_insert_card_reader_history" ON card_reader_history FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_card_reader_history" ON card_reader_history;
CREATE POLICY "anon_update_card_reader_history" ON card_reader_history FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_card_reader_history" ON card_reader_history;
CREATE POLICY "anon_delete_card_reader_history" ON card_reader_history FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_card_reader_history_reader ON card_reader_history(card_reader_id);
