CREATE TABLE "kpi_records" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" uuid NOT NULL REFERENCES "organizations"(id) ON DELETE CASCADE,
  "employeeId" uuid NOT NULL REFERENCES "employees"(id) ON DELETE CASCADE,
  metric text NOT NULL,
  target float8 DEFAULT 100,
  achieved float8 DEFAULT 0,
  score int DEFAULT 0,
  period text,
  notes text,
  "createdAt" timestamptz DEFAULT now()
);
