/*
# Add page_href and club_active to modules table

1. New Columns
- `page_href` (text, nullable) — مسیر صفحه سایت که این ماژول نماینده آن است (مثل /dashboard/customers)
- `club_active` (boolean, default false) — وضعیت فعال/غیرفعال ماژول برای بخش باشگاه مشتریان

2. Notes
- All columns are nullable or have safe defaults so existing rows are unaffected.
- Uses IF NOT EXISTS to be idempotent.
*/

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modules') THEN
    ALTER TABLE modules ADD COLUMN IF NOT EXISTS page_href text;
    ALTER TABLE modules ADD COLUMN IF NOT EXISTS club_active boolean DEFAULT false;
  END IF;
END $$;