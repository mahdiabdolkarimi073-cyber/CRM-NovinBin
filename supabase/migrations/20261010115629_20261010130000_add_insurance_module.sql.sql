/*
# Insurance Management Module

## Overview
Adds a comprehensive insurance management module to the CRM with tables for
insurance companies, policies, quotes, claims, commissions, payments,
renewals, documents, activities, and settings.

## New Tables
1. insurance_companies — Insurance company registry (name, code, contact, API info)
2. insurance_types — Configurable insurance categories (third-party, life, health, etc.)
3. insurance_policies — Main policy records with all core fields + type-specific JSON
4. insurance_policy_endorsements — Policy endorsements/amendments
5. insurance_policy_history — Change log for each policy
6. insurance_quote_requests — Quote inquiry requests from customers
7. insurance_quotes — Individual quote offers per request
8. insurance_claims — Claim/damage case files
9. insurance_claim_history — Status change log for claims
10. insurance_commissions — Commission records per policy
11. insurance_payments — Payment records per policy (supports partial/multiple)
12. insurance_renewals — Renewal tracking records
13. insurance_documents — Document/file attachments for any insurance entity
14. insurance_activities — Activity/follow-up log for any insurance entity
15. insurance_settings — Module-level configuration (reminder intervals, etc.)

## Security
- RLS enabled on all tables.
- Policies allow anon + authenticated CRUD (the app's API layer enforces auth via JWT).
- orgId scoping is handled at the application layer.

## Notes
- All monetary fields use BIGINT (consistent with existing schema pattern).
- Type-specific policy data stored as JSON in insurance_policies.details.
- All tables include orgId for multi-tenant isolation.
*/

-- 1. Insurance Companies
CREATE TABLE IF NOT EXISTS insurance_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  name text NOT NULL,
  code text,
  phone text,
  email text,
  website text,
  address text,
  branch_name text,
  contact_person text,
  contact_phone text,
  supported_types text[] DEFAULT '{}',
  active boolean DEFAULT true,
  api_url text,
  api_key text,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE insurance_companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insurance_companies_crud_select" ON insurance_companies;
CREATE POLICY "insurance_companies_crud_select" ON insurance_companies FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insurance_companies_crud_insert" ON insurance_companies;
CREATE POLICY "insurance_companies_crud_insert" ON insurance_companies FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_companies_crud_update" ON insurance_companies;
CREATE POLICY "insurance_companies_crud_update" ON insurance_companies FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_companies_crud_delete" ON insurance_companies;
CREATE POLICY "insurance_companies_crud_delete" ON insurance_companies FOR DELETE TO anon, authenticated USING (true);

-- 2. Insurance Types
CREATE TABLE IF NOT EXISTS insurance_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  name text NOT NULL,
  code text NOT NULL,
  category text,
  description text,
  active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE insurance_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insurance_types_crud_select" ON insurance_types;
CREATE POLICY "insurance_types_crud_select" ON insurance_types FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insurance_types_crud_insert" ON insurance_types;
CREATE POLICY "insurance_types_crud_insert" ON insurance_types FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_types_crud_update" ON insurance_types;
CREATE POLICY "insurance_types_crud_update" ON insurance_types FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_types_crud_delete" ON insurance_types;
CREATE POLICY "insurance_types_crud_delete" ON insurance_types FOR DELETE TO anon, authenticated USING (true);

-- 3. Insurance Policies
CREATE TABLE IF NOT EXISTS insurance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  policy_number text NOT NULL,
  request_number text,
  customer_id uuid,
  insurance_type_id uuid,
  insurance_type_code text,
  company_id uuid,
  branch_name text,
  assigned_to uuid,
  issue_date timestamptz,
  start_date timestamptz,
  end_date timestamptz,
  premium bigint DEFAULT 0,
  discount bigint DEFAULT 0,
  tax bigint DEFAULT 0,
  final_amount bigint DEFAULT 0,
  payment_method text,
  payment_status text DEFAULT 'unpaid',
  issue_status text DEFAULT 'pending',
  details jsonb DEFAULT '{}',
  notes text,
  file_url text,
  file_name text,
  previous_policy_id uuid,
  voided_at timestamptz,
  void_reason text,
  voided_by uuid,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insurance_policies_crud_select" ON insurance_policies;
CREATE POLICY "insurance_policies_crud_select" ON insurance_policies FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insurance_policies_crud_insert" ON insurance_policies;
CREATE POLICY "insurance_policies_crud_insert" ON insurance_policies FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_policies_crud_update" ON insurance_policies;
CREATE POLICY "insurance_policies_crud_update" ON insurance_policies FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_policies_crud_delete" ON insurance_policies;
CREATE POLICY "insurance_policies_crud_delete" ON insurance_policies FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_customer ON insurance_policies(customer_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_company ON insurance_policies(company_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_type ON insurance_policies(insurance_type_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_end_date ON insurance_policies(end_date);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_org ON insurance_policies(org_id);

-- 4. Insurance Policy Endorsements
CREATE TABLE IF NOT EXISTS insurance_policy_endorsements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  policy_id uuid NOT NULL,
  endorsement_number text,
  endorsement_date timestamptz DEFAULT now(),
  type text,
  description text,
  premium_change bigint DEFAULT 0,
  details jsonb DEFAULT '{}',
  file_url text,
  file_name text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE insurance_policy_endorsements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insurance_endorsements_crud_select" ON insurance_policy_endorsements;
CREATE POLICY "insurance_endorsements_crud_select" ON insurance_policy_endorsements FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insurance_endorsements_crud_insert" ON insurance_policy_endorsements;
CREATE POLICY "insurance_endorsements_crud_insert" ON insurance_policy_endorsements FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_endorsements_crud_update" ON insurance_policy_endorsements;
CREATE POLICY "insurance_endorsements_crud_update" ON insurance_policy_endorsements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_endorsements_crud_delete" ON insurance_policy_endorsements;
CREATE POLICY "insurance_endorsements_crud_delete" ON insurance_policy_endorsements FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_insurance_endorsements_policy ON insurance_policy_endorsements(policy_id);

-- 5. Insurance Policy History
CREATE TABLE IF NOT EXISTS insurance_policy_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  policy_id uuid NOT NULL,
  action text NOT NULL,
  from_status text,
  to_status text,
  description text,
  changed_by uuid,
  changed_at timestamptz DEFAULT now(),
  details jsonb DEFAULT '{}'
);
ALTER TABLE insurance_policy_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insurance_policy_history_crud_select" ON insurance_policy_history;
CREATE POLICY "insurance_policy_history_crud_select" ON insurance_policy_history FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insurance_policy_history_crud_insert" ON insurance_policy_history;
CREATE POLICY "insurance_policy_history_crud_insert" ON insurance_policy_history FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_policy_history_crud_update" ON insurance_policy_history;
CREATE POLICY "insurance_policy_history_crud_update" ON insurance_policy_history FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_policy_history_crud_delete" ON insurance_policy_history;
CREATE POLICY "insurance_policy_history_crud_delete" ON insurance_policy_history FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_insurance_policy_history_policy ON insurance_policy_history(policy_id);

-- 6. Insurance Quote Requests
CREATE TABLE IF NOT EXISTS insurance_quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  customer_id uuid,
  insurance_type_code text,
  insurance_type_id uuid,
  assigned_to uuid,
  request_date timestamptz DEFAULT now(),
  initial_info jsonb DEFAULT '{}',
  companies_checked text[] DEFAULT '{}',
  status text DEFAULT 'new',
  final_result text,
  reject_reason text,
  converted_policy_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE insurance_quote_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insurance_quote_requests_crud_select" ON insurance_quote_requests;
CREATE POLICY "insurance_quote_requests_crud_select" ON insurance_quote_requests FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insurance_quote_requests_crud_insert" ON insurance_quote_requests;
CREATE POLICY "insurance_quote_requests_crud_insert" ON insurance_quote_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_quote_requests_crud_update" ON insurance_quote_requests;
CREATE POLICY "insurance_quote_requests_crud_update" ON insurance_quote_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_quote_requests_crud_delete" ON insurance_quote_requests;
CREATE POLICY "insurance_quote_requests_crud_delete" ON insurance_quote_requests FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_insurance_quote_requests_customer ON insurance_quote_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_insurance_quote_requests_org ON insurance_quote_requests(org_id);

-- 7. Insurance Quotes (offers per request)
CREATE TABLE IF NOT EXISTS insurance_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  request_id uuid NOT NULL,
  company_id uuid,
  company_name text,
  amount bigint DEFAULT 0,
  coverage_details text,
  terms text,
  status text DEFAULT 'new',
  file_url text,
  file_name text,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE insurance_quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insurance_quotes_crud_select" ON insurance_quotes;
CREATE POLICY "insurance_quotes_crud_select" ON insurance_quotes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insurance_quotes_crud_insert" ON insurance_quotes;
CREATE POLICY "insurance_quotes_crud_insert" ON insurance_quotes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_quotes_crud_update" ON insurance_quotes;
CREATE POLICY "insurance_quotes_crud_update" ON insurance_quotes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_quotes_crud_delete" ON insurance_quotes;
CREATE POLICY "insurance_quotes_crud_delete" ON insurance_quotes FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_insurance_quotes_request ON insurance_quotes(request_id);

-- 8. Insurance Claims
CREATE TABLE IF NOT EXISTS insurance_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  claim_number text NOT NULL,
  policy_id uuid NOT NULL,
  customer_id uuid,
  company_id uuid,
  claim_type text,
  incident_date timestamptz,
  report_date timestamptz DEFAULT now(),
  incident_location text,
  incident_description text,
  estimated_amount bigint DEFAULT 0,
  claimed_amount bigint DEFAULT 0,
  approved_amount bigint DEFAULT 0,
  paid_amount bigint DEFAULT 0,
  assigned_to uuid,
  company_claim_number text,
  status text DEFAULT 'registered',
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insurance_claims_crud_select" ON insurance_claims;
CREATE POLICY "insurance_claims_crud_select" ON insurance_claims FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insurance_claims_crud_insert" ON insurance_claims;
CREATE POLICY "insurance_claims_crud_insert" ON insurance_claims FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_claims_crud_update" ON insurance_claims;
CREATE POLICY "insurance_claims_crud_update" ON insurance_claims FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_claims_crud_delete" ON insurance_claims;
CREATE POLICY "insurance_claims_crud_delete" ON insurance_claims FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_policy ON insurance_claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_customer ON insurance_claims(customer_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_org ON insurance_claims(org_id);

-- 9. Insurance Claim History
CREATE TABLE IF NOT EXISTS insurance_claim_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  claim_id uuid NOT NULL,
  action text NOT NULL,
  from_status text,
  to_status text,
  description text,
  changed_by uuid,
  changed_at timestamptz DEFAULT now(),
  details jsonb DEFAULT '{}'
);
ALTER TABLE insurance_claim_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insurance_claim_history_crud_select" ON insurance_claim_history;
CREATE POLICY "insurance_claim_history_crud_select" ON insurance_claim_history FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insurance_claim_history_crud_insert" ON insurance_claim_history;
CREATE POLICY "insurance_claim_history_crud_insert" ON insurance_claim_history FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_claim_history_crud_update" ON insurance_claim_history;
CREATE POLICY "insurance_claim_history_crud_update" ON insurance_claim_history FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_claim_history_crud_delete" ON insurance_claim_history;
CREATE POLICY "insurance_claim_history_crud_delete" ON insurance_claim_history FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_insurance_claim_history_claim ON insurance_claim_history(claim_id);

-- 10. Insurance Commissions
CREATE TABLE IF NOT EXISTS insurance_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  policy_id uuid NOT NULL,
  company_id uuid,
  profile_id uuid,
  calculation_basis text DEFAULT 'premium',
  rate decimal(5,2) DEFAULT 0,
  expected_amount bigint DEFAULT 0,
  confirmed_amount bigint DEFAULT 0,
  paid_amount bigint DEFAULT 0,
  remaining_amount bigint DEFAULT 0,
  due_date timestamptz,
  received_date timestamptz,
  status text DEFAULT 'predicted',
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE insurance_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insurance_commissions_crud_select" ON insurance_commissions;
CREATE POLICY "insurance_commissions_crud_select" ON insurance_commissions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insurance_commissions_crud_insert" ON insurance_commissions;
CREATE POLICY "insurance_commissions_crud_insert" ON insurance_commissions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_commissions_crud_update" ON insurance_commissions;
CREATE POLICY "insurance_commissions_crud_update" ON insurance_commissions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_commissions_crud_delete" ON insurance_commissions;
CREATE POLICY "insurance_commissions_crud_delete" ON insurance_commissions FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_insurance_commissions_policy ON insurance_commissions(policy_id);

-- 11. Insurance Payments
CREATE TABLE IF NOT EXISTS insurance_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  policy_id uuid NOT NULL,
  amount bigint DEFAULT 0,
  paid_amount bigint DEFAULT 0,
  payment_date timestamptz,
  payment_method text,
  tracking_number text,
  due_date timestamptz,
  status text DEFAULT 'unpaid',
  receipt_url text,
  receipt_name text,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE insurance_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insurance_payments_crud_select" ON insurance_payments;
CREATE POLICY "insurance_payments_crud_select" ON insurance_payments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insurance_payments_crud_insert" ON insurance_payments;
CREATE POLICY "insurance_payments_crud_insert" ON insurance_payments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_payments_crud_update" ON insurance_payments;
CREATE POLICY "insurance_payments_crud_update" ON insurance_payments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_payments_crud_delete" ON insurance_payments;
CREATE POLICY "insurance_payments_crud_delete" ON insurance_payments FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_insurance_payments_policy ON insurance_payments(policy_id);

-- 12. Insurance Renewals
CREATE TABLE IF NOT EXISTS insurance_renewals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  policy_id uuid NOT NULL,
  customer_id uuid,
  reminder_date timestamptz,
  contact_date timestamptz,
  contact_result text,
  next_follow_up timestamptz,
  negotiation_result text,
  non_renewal_reason text,
  renewed_policy_id uuid,
  status text DEFAULT 'pending',
  task_created boolean DEFAULT false,
  task_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE insurance_renewals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insurance_renewals_crud_select" ON insurance_renewals;
CREATE POLICY "insurance_renewals_crud_select" ON insurance_renewals FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insurance_renewals_crud_insert" ON insurance_renewals;
CREATE POLICY "insurance_renewals_crud_insert" ON insurance_renewals FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_renewals_crud_update" ON insurance_renewals;
CREATE POLICY "insurance_renewals_crud_update" ON insurance_renewals FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_renewals_crud_delete" ON insurance_renewals;
CREATE POLICY "insurance_renewals_crud_delete" ON insurance_renewals FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_insurance_renewals_policy ON insurance_renewals(policy_id);
CREATE INDEX IF NOT EXISTS idx_insurance_renewals_reminder ON insurance_renewals(reminder_date);

-- 13. Insurance Documents
CREATE TABLE IF NOT EXISTS insurance_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  document_type text,
  file_url text NOT NULL,
  file_name text,
  file_size int DEFAULT 0,
  uploaded_by uuid,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE insurance_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insurance_documents_crud_select" ON insurance_documents;
CREATE POLICY "insurance_documents_crud_select" ON insurance_documents FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insurance_documents_crud_insert" ON insurance_documents;
CREATE POLICY "insurance_documents_crud_insert" ON insurance_documents FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_documents_crud_update" ON insurance_documents;
CREATE POLICY "insurance_documents_crud_update" ON insurance_documents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_documents_crud_delete" ON insurance_documents;
CREATE POLICY "insurance_documents_crud_delete" ON insurance_documents FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_insurance_documents_entity ON insurance_documents(entity_type, entity_id);

-- 14. Insurance Activities
CREATE TABLE IF NOT EXISTS insurance_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  activity_type text NOT NULL,
  description text,
  performed_by uuid,
  performed_at timestamptz DEFAULT now(),
  next_follow_up timestamptz,
  details jsonb DEFAULT '{}'
);
ALTER TABLE insurance_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insurance_activities_crud_select" ON insurance_activities;
CREATE POLICY "insurance_activities_crud_select" ON insurance_activities FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insurance_activities_crud_insert" ON insurance_activities;
CREATE POLICY "insurance_activities_crud_insert" ON insurance_activities FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_activities_crud_update" ON insurance_activities;
CREATE POLICY "insurance_activities_crud_update" ON insurance_activities FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_activities_crud_delete" ON insurance_activities;
CREATE POLICY "insurance_activities_crud_delete" ON insurance_activities FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_insurance_activities_entity ON insurance_activities(entity_type, entity_id);

-- 15. Insurance Settings
CREATE TABLE IF NOT EXISTS insurance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  reminder_days int[] DEFAULT '{30,15,7,1}',
  auto_create_task boolean DEFAULT true,
  currency_unit text DEFAULT 'toman',
  default_commission_rate decimal(5,2) DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE insurance_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insurance_settings_crud_select" ON insurance_settings;
CREATE POLICY "insurance_settings_crud_select" ON insurance_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insurance_settings_crud_insert" ON insurance_settings;
CREATE POLICY "insurance_settings_crud_insert" ON insurance_settings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_settings_crud_update" ON insurance_settings;
CREATE POLICY "insurance_settings_crud_update" ON insurance_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "insurance_settings_crud_delete" ON insurance_settings;
CREATE POLICY "insurance_settings_crud_delete" ON insurance_settings FOR DELETE TO anon, authenticated USING (true);

-- Seed default insurance types
INSERT INTO insurance_types (name, code, category, sort_order)
SELECT * FROM (VALUES
  ('شخص ثالث', 'third_party', 'vehicle', 1),
  ('بدنه خودرو', 'vehicle_body', 'vehicle', 2),
  ('عمر و زندگی', 'life', 'life', 3),
  ('درمان تکمیلی', 'health', 'health', 4),
  ('حوادث', 'accident', 'general', 5),
  ('آتش‌سوزی', 'fire', 'property', 6),
  ('مسئولیت', 'liability', 'liability', 7),
  ('باربری', 'cargo', 'transport', 8),
  ('مهندسی', 'engineering', 'engineering', 9),
  ('مسافرتی', 'travel', 'travel', 10)
) AS t(name, code, category, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM insurance_types);
