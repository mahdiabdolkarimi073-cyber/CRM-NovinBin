-- AlterTable: add archive, trash, and tags support to personal_notes
ALTER TABLE "personal_notes" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "personal_notes" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "personal_notes" ADD COLUMN "isTrashed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "personal_notes" ADD COLUMN "trashedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "personal_notes_profileId_isTrashed_idx" ON "personal_notes"("profileId", "isTrashed");
