-- Add new columns to demos table for full demo management
ALTER TABLE "demos" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "demos" ADD COLUMN IF NOT EXISTS "durationDays" INTEGER DEFAULT 15;
ALTER TABLE "demos" ADD COLUMN IF NOT EXISTS "modules" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE "demos" ADD COLUMN IF NOT EXISTS "maxUsers" INTEGER DEFAULT 10;
ALTER TABLE "demos" ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMPTZ;
ALTER TABLE "demos" ADD COLUMN IF NOT EXISTS "resetCount" INTEGER DEFAULT 0;
ALTER TABLE "demos" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMPTZ;
ALTER TABLE "demos" ADD COLUMN IF NOT EXISTS "suspendedBy" UUID;
ALTER TABLE "demos" ADD COLUMN IF NOT EXISTS "demoUserId" UUID;
ALTER TABLE "demos" ADD COLUMN IF NOT EXISTS "demoPassword" TEXT;
ALTER TABLE "demos" ADD COLUMN IF NOT EXISTS "demoUsername" TEXT;

-- Create unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS "demos_slug_key" ON "demos"("slug") WHERE "slug" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "demos_demoUsername_key" ON "demos"("demoUsername") WHERE "demoUsername" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "demos_status_idx" ON "demos"("status");
