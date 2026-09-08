/*
# Add activity_type, service_types, and additional_phones to customers

1. New Columns
- `activity_type` (text, nullable) — نوع فعالیت مشتری
- `service_types` (jsonb, default '[]') — انواع خدمات دریافتی (آرایه‌ای از رشته‌ها)
- `additional_phones` (jsonb, default '[]') — شماره تلفن‌های اضافی مشتری (آرایه‌ای از رشته‌ها)

2. Notes
- All columns are nullable or have safe defaults so existing rows are unaffected.
- Uses IF NOT EXISTS to be idempotent.
*/

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS activity_type text;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS service_types jsonb DEFAULT '[]'::jsonb;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS additional_phones jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;