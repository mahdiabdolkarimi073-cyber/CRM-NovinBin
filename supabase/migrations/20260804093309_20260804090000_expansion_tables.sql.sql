-- New tables for 5 expansion modules

-- Stock Transfers (inter-warehouse)
CREATE TABLE "stock_transfers" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" uuid NOT NULL REFERENCES "organizations"(id) ON DELETE CASCADE,
  number text NOT NULL,
  "productId" uuid NOT NULL,
  "fromWarehouseId" uuid NOT NULL,
  "toWarehouseId" uuid NOT NULL,
  qty int DEFAULT 0,
  status text DEFAULT 'pending',
  "shippedBy" uuid,
  "receivedBy" uuid,
  "shippedAt" timestamptz,
  "receivedAt" timestamptz,
  notes text,
  "createdBy" uuid NOT NULL,
  "createdAt" timestamptz DEFAULT now()
);

-- Customer Interactions (communication history)
CREATE TABLE "customer_interactions" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" uuid NOT NULL REFERENCES "organizations"(id) ON DELETE CASCADE,
  "customerId" uuid NOT NULL REFERENCES "customers"(id) ON DELETE CASCADE,
  type text NOT NULL,
  direction text DEFAULT 'outbound',
  subject text,
  content text,
  outcome text,
  "durationMin" int DEFAULT 0,
  "handledBy" uuid,
  "interactionDate" timestamptz DEFAULT now(),
  "nextFollowUp" timestamptz,
  attachments jsonb DEFAULT '[]',
  "createdAt" timestamptz DEFAULT now()
);

-- Customer Segments
CREATE TABLE "customer_segments" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" uuid NOT NULL REFERENCES "organizations"(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT '#3b82f6',
  criteria jsonb DEFAULT '{}',
  active boolean DEFAULT true,
  "createdAt" timestamptz DEFAULT now()
);

CREATE TABLE "customer_segment_members" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" uuid NOT NULL,
  "segmentId" uuid NOT NULL REFERENCES "customer_segments"(id) ON DELETE CASCADE,
  "customerId" uuid NOT NULL REFERENCES "customers"(id) ON DELETE CASCADE,
  "addedAt" timestamptz DEFAULT now(),
  UNIQUE("segmentId", "customerId")
);

-- Loyalty Rewards (catalog)
CREATE TABLE "loyalty_rewards" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" uuid NOT NULL REFERENCES "organizations"(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  type text NOT NULL,
  "pointsCost" int DEFAULT 0,
  "monetaryValue" bigint DEFAULT 0,
  stock int DEFAULT -1,
  "imageUrl" text,
  active boolean DEFAULT true,
  "createdAt" timestamptz DEFAULT now()
);

-- Loyalty Redemptions
CREATE TABLE "loyalty_redemptions" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" uuid NOT NULL REFERENCES "organizations"(id) ON DELETE CASCADE,
  "customerId" uuid NOT NULL REFERENCES "customers"(id) ON DELETE CASCADE,
  "rewardId" uuid NOT NULL REFERENCES "loyalty_rewards"(id) ON DELETE CASCADE,
  "pointsSpent" int DEFAULT 0,
  status text DEFAULT 'pending',
  "fulfilledAt" timestamptz,
  notes text,
  "createdBy" uuid NOT NULL,
  "createdAt" timestamptz DEFAULT now()
);

-- Demo Activities (tracking)
CREATE TABLE "demo_activities" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" uuid NOT NULL REFERENCES "organizations"(id) ON DELETE CASCADE,
  "demoId" uuid NOT NULL,
  "pagePath" text NOT NULL,
  action text NOT NULL,
  "duration" int DEFAULT 0,
  "metadata" jsonb DEFAULT '{}',
  "createdAt" timestamptz DEFAULT now()
);
