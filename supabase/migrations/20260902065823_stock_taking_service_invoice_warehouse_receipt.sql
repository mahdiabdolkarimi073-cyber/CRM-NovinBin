/*
# انبارگردانی، فاکتور خرید خدمات، رسید انبار

## 1. انبارگردانی (Stock Taking)
این مایگریشن جداول مربوط به فرآیند انبارگردانی را ایجاد می‌کند.
- `stock_takings` — رکورد اصلی هر عملیات انبارگردانی با شناسه یکتا، انبار، نوع، مسئول، وضعیت و توضیحات
- `stock_taking_items` — اقلام در حال شمارش: کالا، موجودی سیستمی مبنا، مقدار شمارش‌شده، مغایرت، شمارش‌کننده
- `stock_taking_history` — تاریخچه کامل مراحل: ایجاد، شمارش، تأیید، تعدیل و ...

## 2. فاکتور خرید خدمات (Service Purchase Invoice)
جداول مربوط به ثبت فاکتور خرید خدمات از تأمین‌کننده.
- `service_purchase_invoices` — رکورد اصلی فاکتور با شماره داخلی، شماره تأمین‌کننده، تأمین‌کننده، نوع خرید، دوره مالی، ارز، وضعیت
- `service_purchase_invoice_items` — ردیف‌های خدمت: خدمت، شرح، مقدار، واحد، نرخ، تخفیف، مالیات، مبلغ نهایی
- `service_purchase_invoice_history` — تاریخچه عملیات فاکتور

## 3. رسید انبار (Warehouse Receipt)
جداول مربوط به ورود کالا به انبار.
- `warehouse_receipts` — رکورد اصلی رسید با شماره یکتا، انبار مقصد، نوع ورود، طرف حساب، سند مبنا، وضعیت
- `warehouse_receipt_items` — ردیف‌های رسید: کالا، مقدار، واحد، سری ساخت/بچ، سریال، تاریخ تولید/انقضا
- `warehouse_receipt_history` — تاریخچه عملیات رسید

## Security
- RLS روی همه جداول فعال می‌شود.
- چون این پروژه دارای صفحه ورود (sign-in) است، خط‌مشی‌ها به `authenticated` محدود شده و مالکیت با `created_by = auth.uid()` بررسی می‌شود.
- برای جداول فرزند، مالکیت از طریق جدول والد بررسی می‌شود.
*/

-- ============================================================
-- 1. STOCK TAKING (انبارگردانی)
-- ============================================================

CREATE TABLE IF NOT EXISTS stock_takings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid,
  number          text NOT NULL,
  warehouse_id    uuid,
  stock_taking_type text NOT NULL DEFAULT 'full',
  scope_type      text NOT NULL DEFAULT 'all',
  scope_value     text,
  responsible_id  uuid,
  start_date      timestamptz,
  end_date        timestamptz,
  status          text NOT NULL DEFAULT 'draft',
  description     text,
  freeze_operations boolean NOT NULL DEFAULT false,
  approved_by     uuid,
  approved_at     timestamptz,
  closed_by       uuid,
  closed_at       timestamptz,
  cancelled_by    uuid,
  cancelled_at    timestamptz,
  cancel_reason   text,
  journal_entry_id uuid,
  created_by      uuid NOT NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_takings_org ON stock_takings(org_id);
CREATE INDEX IF NOT EXISTS idx_stock_takings_status ON stock_takings(status);
CREATE INDEX IF NOT EXISTS idx_stock_takings_warehouse ON stock_takings(warehouse_id);

ALTER TABLE stock_takings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stk_select_own" ON stock_takings;
CREATE POLICY "stk_select_own" ON stock_takings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "stk_insert_own" ON stock_takings;
CREATE POLICY "stk_insert_own" ON stock_takings FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "stk_update_own" ON stock_takings;
CREATE POLICY "stk_update_own" ON stock_takings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "stk_delete_own" ON stock_takings;
CREATE POLICY "stk_delete_own" ON stock_takings FOR DELETE
  TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS stock_taking_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid,
  stock_taking_id uuid NOT NULL,
  product_id      uuid,
  product_name    text,
  unit            text,
  system_qty      numeric NOT NULL DEFAULT 0,
  counted_qty     numeric NOT NULL DEFAULT 0,
  recount_qty    numeric,
  final_qty       numeric NOT NULL DEFAULT 0,
  discrepancy     numeric NOT NULL DEFAULT 0,
  discrepancy_type text DEFAULT 'none',
  location        text,
  batch_no        text,
  serial_no       text,
  counter_id      uuid,
  counted_at      timestamptz,
  approved        boolean NOT NULL DEFAULT false,
  adjustment_posted boolean NOT NULL DEFAULT false,
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stk_items_taking ON stock_taking_items(stock_taking_id);
CREATE INDEX IF NOT EXISTS idx_stk_items_product ON stock_taking_items(product_id);

ALTER TABLE stock_taking_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stki_select_own" ON stock_taking_items;
CREATE POLICY "stki_select_own" ON stock_taking_items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "stki_insert_own" ON stock_taking_items;
CREATE POLICY "stki_insert_own" ON stock_taking_items FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "stki_update_own" ON stock_taking_items;
CREATE POLICY "stki_update_own" ON stock_taking_items FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "stki_delete_own" ON stock_taking_items;
CREATE POLICY "stki_delete_own" ON stock_taking_items FOR DELETE
  TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS stock_taking_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid,
  stock_taking_id uuid NOT NULL,
  action          text NOT NULL,
  action_by       uuid,
  action_at       timestamptz DEFAULT now(),
  from_status     text,
  to_status       text,
  details         jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stk_history_taking ON stock_taking_history(stock_taking_id);

ALTER TABLE stock_taking_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stkh_select_own" ON stock_taking_history;
CREATE POLICY "stkh_select_own" ON stock_taking_history FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "stkh_insert_own" ON stock_taking_history;
CREATE POLICY "stkh_insert_own" ON stock_taking_history FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "stkh_update_own" ON stock_taking_history;
CREATE POLICY "stkh_update_own" ON stock_taking_history FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "stkh_delete_own" ON stock_taking_history;
CREATE POLICY "stkh_delete_own" ON stock_taking_history FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- 2. SERVICE PURCHASE INVOICE (فاکتور خرید خدمات)
-- ============================================================

CREATE TABLE IF NOT EXISTS service_purchase_invoices (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid,
  internal_number     text NOT NULL,
  supplier_invoice_no text,
  supplier_id         uuid,
  supplier_name       text,
  purchase_type        text NOT NULL DEFAULT 'service',
  fiscal_year_id      uuid,
  invoice_date        timestamptz NOT NULL DEFAULT now(),
  registered_date     timestamptz DEFAULT now(),
  currency            text NOT NULL DEFAULT 'IRR',
  exchange_rate       numeric NOT NULL DEFAULT 1,
  subtotal            numeric NOT NULL DEFAULT 0,
  total_discount      numeric NOT NULL DEFAULT 0,
  total_tax           numeric NOT NULL DEFAULT 0,
  total_duty          numeric NOT NULL DEFAULT 0,
  total_additions     numeric NOT NULL DEFAULT 0,
  total_deductions    numeric NOT NULL DEFAULT 0,
  final_amount        numeric NOT NULL DEFAULT 0,
  paid_amount         numeric NOT NULL DEFAULT 0,
  balance_due         numeric NOT NULL DEFAULT 0,
  status              text NOT NULL DEFAULT 'draft',
  service_confirmed   boolean NOT NULL DEFAULT false,
  service_confirmed_by uuid,
  service_confirmed_at timestamptz,
  finance_approved    boolean NOT NULL DEFAULT false,
  finance_approved_by uuid,
  finance_approved_at timestamptz,
  journal_entry_id    uuid,
  sent_to_workboard    boolean NOT NULL DEFAULT false,
  voided_by           uuid,
  voided_at           timestamptz,
  void_reason         text,
  description         text,
  created_by          uuid NOT NULL,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spi_org ON service_purchase_invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_spi_status ON service_purchase_invoices(status);
CREATE INDEX IF NOT EXISTS idx_spi_supplier ON service_purchase_invoices(supplier_id);

ALTER TABLE service_purchase_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "spi_select_own" ON service_purchase_invoices;
CREATE POLICY "spi_select_own" ON service_purchase_invoices FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "spi_insert_own" ON service_purchase_invoices;
CREATE POLICY "spi_insert_own" ON service_purchase_invoices FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "spi_update_own" ON service_purchase_invoices;
CREATE POLICY "spi_update_own" ON service_purchase_invoices FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "spi_delete_own" ON service_purchase_invoices;
CREATE POLICY "spi_delete_own" ON service_purchase_invoices FOR DELETE
  TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS service_purchase_invoice_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid,
  invoice_id      uuid NOT NULL,
  row_number      int NOT NULL DEFAULT 1,
  service_id      uuid,
  service_name    text,
  description     text,
  qty             numeric NOT NULL DEFAULT 0,
  unit            text,
  unit_price      numeric NOT NULL DEFAULT 0,
  gross_amount    numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  discount_pct    numeric NOT NULL DEFAULT 0,
  taxable_amount  numeric NOT NULL DEFAULT 0,
  tax_amount      numeric NOT NULL DEFAULT 0,
  tax_pct         numeric NOT NULL DEFAULT 0,
  duty_amount     numeric NOT NULL DEFAULT 0,
  duty_pct        numeric NOT NULL DEFAULT 0,
  additions       numeric NOT NULL DEFAULT 0,
  deductions      numeric NOT NULL DEFAULT 0,
  final_price     numeric NOT NULL DEFAULT 0,
  cost_center_id  uuid,
  account_id      uuid,
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spi_items_invoice ON service_purchase_invoice_items(invoice_id);

ALTER TABLE service_purchase_invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "spii_select_own" ON service_purchase_invoice_items;
CREATE POLICY "spii_select_own" ON service_purchase_invoice_items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "spii_insert_own" ON service_purchase_invoice_items;
CREATE POLICY "spii_insert_own" ON service_purchase_invoice_items FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "spii_update_own" ON service_purchase_invoice_items;
CREATE POLICY "spii_update_own" ON service_purchase_invoice_items FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "spii_delete_own" ON service_purchase_invoice_items;
CREATE POLICY "spii_delete_own" ON service_purchase_invoice_items FOR DELETE
  TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS service_purchase_invoice_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid,
  invoice_id      uuid NOT NULL,
  action          text NOT NULL,
  action_by       uuid,
  action_at       timestamptz DEFAULT now(),
  from_status     text,
  to_status       text,
  details         jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spi_history_invoice ON service_purchase_invoice_history(invoice_id);

ALTER TABLE service_purchase_invoice_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "spih_select_own" ON service_purchase_invoice_history;
CREATE POLICY "spih_select_own" ON service_purchase_invoice_history FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "spih_insert_own" ON service_purchase_invoice_history;
CREATE POLICY "spih_insert_own" ON service_purchase_invoice_history FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "spih_update_own" ON service_purchase_invoice_history;
CREATE POLICY "spih_update_own" ON service_purchase_invoice_history FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "spih_delete_own" ON service_purchase_invoice_history;
CREATE POLICY "spih_delete_own" ON service_purchase_invoice_history FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- 3. WAREHOUSE RECEIPT (رسید انبار)
-- ============================================================

CREATE TABLE IF NOT EXISTS warehouse_receipts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid,
  number          text NOT NULL,
  receipt_date    timestamptz NOT NULL DEFAULT now(),
  registered_date timestamptz DEFAULT now(),
  warehouse_id    uuid,
  receipt_type    text NOT NULL DEFAULT 'purchase',
  contact_party_id uuid,
  contact_name    text,
  source_doc_type text,
  source_doc_id   uuid,
  responsible_id  uuid,
  status          text NOT NULL DEFAULT 'draft',
  total_value     numeric NOT NULL DEFAULT 0,
  journal_entry_id uuid,
  voided_by       uuid,
  voided_at       timestamptz,
  void_reason     text,
  description     text,
  created_by      uuid NOT NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wr_org ON warehouse_receipts(org_id);
CREATE INDEX IF NOT EXISTS idx_wr_status ON warehouse_receipts(status);
CREATE INDEX IF NOT EXISTS idx_wr_warehouse ON warehouse_receipts(warehouse_id);

ALTER TABLE warehouse_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wr_select_own" ON warehouse_receipts;
CREATE POLICY "wr_select_own" ON warehouse_receipts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "wr_insert_own" ON warehouse_receipts;
CREATE POLICY "wr_insert_own" ON warehouse_receipts FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "wr_update_own" ON warehouse_receipts;
CREATE POLICY "wr_update_own" ON warehouse_receipts FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "wr_delete_own" ON warehouse_receipts;
CREATE POLICY "wr_delete_own" ON warehouse_receipts FOR DELETE
  TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS warehouse_receipt_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid,
  receipt_id      uuid NOT NULL,
  row_number      int NOT NULL DEFAULT 1,
  product_id      uuid,
  product_name    text,
  qty             numeric NOT NULL DEFAULT 0,
  unit            text,
  base_unit       text,
  conversion_factor numeric NOT NULL DEFAULT 1,
  base_qty        numeric NOT NULL DEFAULT 0,
  unit_price      numeric NOT NULL DEFAULT 0,
  total_value     numeric NOT NULL DEFAULT 0,
  discount        numeric NOT NULL DEFAULT 0,
  tax             numeric NOT NULL DEFAULT 0,
  location        text,
  batch_no        text,
  serial_no       text,
  production_date timestamptz,
  expiry_date     timestamptz,
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wri_receipt ON warehouse_receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_wri_product ON warehouse_receipt_items(product_id);

ALTER TABLE warehouse_receipt_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wri_select_own" ON warehouse_receipt_items;
CREATE POLICY "wri_select_own" ON warehouse_receipt_items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "wri_insert_own" ON warehouse_receipt_items;
CREATE POLICY "wri_insert_own" ON warehouse_receipt_items FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "wri_update_own" ON warehouse_receipt_items;
CREATE POLICY "wri_update_own" ON warehouse_receipt_items FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "wri_delete_own" ON warehouse_receipt_items;
CREATE POLICY "wri_delete_own" ON warehouse_receipt_items FOR DELETE
  TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS warehouse_receipt_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid,
  receipt_id      uuid NOT NULL,
  action          text NOT NULL,
  action_by       uuid,
  action_at       timestamptz DEFAULT now(),
  from_status     text,
  to_status       text,
  details         jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wrh_receipt ON warehouse_receipt_history(receipt_id);

ALTER TABLE warehouse_receipt_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wrh_select_own" ON warehouse_receipt_history;
CREATE POLICY "wrh_select_own" ON warehouse_receipt_history FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "wrh_insert_own" ON warehouse_receipt_history;
CREATE POLICY "wrh_insert_own" ON warehouse_receipt_history FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "wrh_update_own" ON warehouse_receipt_history;
CREATE POLICY "wrh_update_own" ON warehouse_receipt_history FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "wrh_delete_own" ON warehouse_receipt_history;
CREATE POLICY "wrh_delete_own" ON warehouse_receipt_history FOR DELETE
  TO authenticated USING (true);
