-- Add terms acceptance tracking to academy users
ALTER TABLE "academy_users" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "academy_users" ADD COLUMN "termsVersion" TEXT;
