import { prisma } from '@/lib/prisma';

let initialized = false;

export async function ensureContractAndSignoffTables() {
  if (initialized) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "customer_contracts" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "orgId" UUID,
        "customerId" UUID NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "fileUrl" TEXT NOT NULL,
        "fileName" TEXT NOT NULL,
        "fileSize" BIGINT NOT NULL DEFAULT 0,
        "uploadedBy" UUID NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "adminSignature" TEXT,
        "adminSignedAt" TIMESTAMP(3),
        "adminSignerName" TEXT,
        "customerSignature" TEXT,
        "customerSignedAt" TIMESTAMP(3),
        "customerSignerName" TEXT,
        "legalDisclaimerAccepted" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "customer_contracts_pkey" PRIMARY KEY ("id")
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "customer_delivery_signoffs" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "orgId" UUID,
        "customerId" UUID NOT NULL,
        "messageId" UUID,
        "fileName" TEXT NOT NULL,
        "fileUrl" TEXT NOT NULL,
        "fileSize" BIGINT NOT NULL DEFAULT 0,
        "confirmedBy" UUID NOT NULL,
        "signerName" TEXT NOT NULL,
        "signerPhone" TEXT,
        "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "customer_delivery_signoffs_pkey" PRIMARY KEY ("id")
      )
    `);
    initialized = true;
  } catch (err) {
    console.error('[DB-INIT] Warning ensuring customer contracts and delivery tables:', err);
  }
}
