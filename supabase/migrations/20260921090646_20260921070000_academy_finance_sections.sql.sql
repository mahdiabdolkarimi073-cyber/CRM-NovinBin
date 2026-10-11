/*
# Academy Finance — 6 sections: Expenses, Cheques, Accounts, Transfers, Payables

1. New Tables
- `academy_expenses` — ثبت هزینه‌ها و پرداخت‌ها (حقوق، اجاره، قبوض، تبلیغات، تجهیزات، متفرقه). شامل دسته، مبلغ، روش پرداخت (نقدی/کارت/چک)، گیرنده، تاریخ.
- `academy_cheques` — چک‌های دریافتی و پرداختی. شامل شماره چک، بانک، مبلغ، نوع (دریافتی/پرداختی)، وضعیت (در انتظار/وصول‌شده/برگشتی/در وصول)، صادرکنده/گیرنده، سررسید.
- `academy_accounts` — صندوق نقدی، حساب‌های بانکی، کارت‌خوان‌ها. شامل نام، نوع، شماره کارت/حساب، موجودی.
- `academy_account_transfers` — انتقال وجه بین حساب‌ها. شامل حساب مبدأ، مقصد، مبلغ، تاریخ.
- `academy_payables` — بدهکاران و طلبکاران. شامل نوع (بدهی/طلب)، طرف (هنرجو/مدرس/تأمین‌کننده)، مبلغ، پرداخت‌شده، سررسید، وضعیت (باز/تسویه).

2. Security
- RLS enabled on all new tables.
- Anon + authenticated CRUD allowed (academy app uses JWT cookie auth at the API layer, not Supabase auth).
*/

CREATE TABLE IF NOT EXISTS academy_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'misc',
  title text NOT NULL,
  amount bigint NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'cash',
  payee text,
  "chequeId" uuid,
  "dueDate" timestamptz,
  "paidAt" timestamptz DEFAULT now(),
  note text,
  "createdAt" timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_academy_expenses_category ON academy_expenses(category);
CREATE INDEX IF NOT EXISTS idx_academy_expenses_paidAt ON academy_expenses("paidAt");
ALTER TABLE academy_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_academy_expenses" ON academy_expenses;
CREATE POLICY "anon_crud_academy_expenses" ON academy_expenses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS academy_cheques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "chequeNumber" text NOT NULL,
  bank text,
  amount bigint NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'received',
  status text NOT NULL DEFAULT 'pending',
  issuer text,
  receiver text,
  "dueDate" timestamptz NOT NULL DEFAULT now(),
  "clearedDate" timestamptz,
  note text,
  "createdAt" timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_academy_cheques_type_status ON academy_cheques(type, status);
CREATE INDEX IF NOT EXISTS idx_academy_cheques_dueDate ON academy_cheques("dueDate");
ALTER TABLE academy_cheques ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_academy_cheques" ON academy_cheques;
CREATE POLICY "anon_crud_academy_cheques" ON academy_cheques FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS academy_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'cash',
  bank text,
  "cardNumber" text,
  "accountNumber" text,
  balance bigint NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_academy_accounts_type ON academy_accounts(type);
ALTER TABLE academy_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_academy_accounts" ON academy_accounts;
CREATE POLICY "anon_crud_academy_accounts" ON academy_accounts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS academy_account_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "fromAccountId" uuid NOT NULL REFERENCES academy_accounts(id) ON DELETE CASCADE,
  "toAccountId" uuid NOT NULL REFERENCES academy_accounts(id) ON DELETE CASCADE,
  amount bigint NOT NULL DEFAULT 0,
  date timestamptz DEFAULT now(),
  note text,
  "createdAt" timestamptz DEFAULT now()
);
ALTER TABLE academy_account_transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_academy_account_transfers" ON academy_account_transfers;
CREATE POLICY "anon_crud_academy_account_transfers" ON academy_account_transfers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS academy_payables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'payable',
  "partyType" text NOT NULL DEFAULT 'student',
  "partyId" uuid,
  "partyName" text NOT NULL,
  "courseId" uuid,
  amount bigint NOT NULL DEFAULT 0,
  "paidAmount" bigint NOT NULL DEFAULT 0,
  "dueDate" timestamptz,
  status text NOT NULL DEFAULT 'open',
  "settledAt" timestamptz,
  note text,
  "createdAt" timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_academy_payables_type_status ON academy_payables(type, status);
CREATE INDEX IF NOT EXISTS idx_academy_payables_partyType ON academy_payables("partyType");
ALTER TABLE academy_payables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_crud_academy_payables" ON academy_payables;
CREATE POLICY "anon_crud_academy_payables" ON academy_payables FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
