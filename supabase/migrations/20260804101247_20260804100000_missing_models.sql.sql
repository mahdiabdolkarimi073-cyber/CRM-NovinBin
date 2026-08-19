CREATE TABLE "approval_requests" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" uuid NOT NULL REFERENCES "organizations"(id) ON DELETE CASCADE,
  type text NOT NULL,
  "entityId" uuid,
  "requesterId" uuid NOT NULL,
  "approverId" uuid,
  status text DEFAULT 'pending',
  amount bigint DEFAULT 0,
  reason text,
  "approvedAt" timestamptz,
  "rejectedAt" timestamptz,
  "createdAt" timestamptz DEFAULT now()
);

CREATE TABLE "documents" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" uuid NOT NULL REFERENCES "organizations"(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text,
  "fileUrl" text,
  "fileName" text,
  "fileSize" int DEFAULT 0,
  "uploadedBy" uuid NOT NULL,
  "accessLevel" text DEFAULT 'all',
  "createdAt" timestamptz DEFAULT now()
);

CREATE TABLE "knowledge_articles" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" uuid NOT NULL REFERENCES "organizations"(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  category text,
  "authorId" uuid NOT NULL,
  views int DEFAULT 0,
  published boolean DEFAULT true,
  "createdAt" timestamptz DEFAULT now()
);

CREATE TABLE "goals" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" uuid NOT NULL REFERENCES "organizations"(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  "ownerId" uuid,
  "employeeId" uuid,
  "startDate" timestamptz DEFAULT now(),
  "endDate" timestamptz,
  progress int DEFAULT 0,
  status text DEFAULT 'active',
  "keyResults" jsonb DEFAULT '[]',
  "createdAt" timestamptz DEFAULT now()
);
