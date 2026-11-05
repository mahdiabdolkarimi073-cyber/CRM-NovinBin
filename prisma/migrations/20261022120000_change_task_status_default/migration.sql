-- Change default task status from "new" to "in_progress"
ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'in_progress';

-- Migrate existing "new" tasks to "in_progress"
UPDATE "tasks" SET "status" = 'in_progress' WHERE "status" = 'new';
