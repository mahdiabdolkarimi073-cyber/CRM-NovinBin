-- CreateTable customer_contracts
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
);

-- CreateTable customer_delivery_signoffs
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
);

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_contracts_customerId_fkey') THEN
        ALTER TABLE "customer_contracts" ADD CONSTRAINT "customer_contracts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_delivery_signoffs_customerId_fkey') THEN
        ALTER TABLE "customer_delivery_signoffs" ADD CONSTRAINT "customer_delivery_signoffs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
