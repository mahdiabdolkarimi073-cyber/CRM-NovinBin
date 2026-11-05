-- CreateTable
CREATE TABLE "tax_moadi_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID,
    "taxpayerType" TEXT NOT NULL DEFAULT 'legal',
    "taxpayerName" TEXT,
    "tradeName" TEXT,
    "nationalId" TEXT,
    "economicCode" TEXT,
    "postalCode" TEXT,
    "legalAddress" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "registrationNo" TEXT,
    "vatStatus" TEXT NOT NULL DEFAULT 'included',
    "fiscalYearStart" TEXT,
    "fiscalYearEnd" TEXT,
    "taxPeriod" TEXT NOT NULL DEFAULT 'monthly',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "lastVerifiedAt" TIMESTAMP(3),
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_moadi_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_moadi_fiscal_memories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID,
    "settingId" UUID,
    "memoryId" TEXT,
    "label" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "publicKey" TEXT,
    "privateKeyEnc" TEXT,
    "clientId" TEXT,
    "clientSecretEnc" TEXT,
    "tokenUrl" TEXT,
    "apiBaseUrl" TEXT,
    "certificateData" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "lastTokenAt" TIMESTAMP(3),
    "lastConnectionAt" TIMESTAMP(3),
    "lastConnectionOk" BOOLEAN NOT NULL DEFAULT false,
    "lastError" TEXT,
    "credentialsChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_moadi_fiscal_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_moadi_invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID,
    "fiscalMemoryId" UUID,
    "internalNumber" TEXT NOT NULL,
    "taxInvoiceNumber" TEXT,
    "invoiceType" TEXT NOT NULL DEFAULT 'type1',
    "invoicePattern" TEXT NOT NULL DEFAULT 'general',
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" UUID,
    "customerName" TEXT,
    "customerNationalId" TEXT,
    "customerEconomicCode" TEXT,
    "customerPostalCode" TEXT,
    "customerAddress" TEXT,
    "customerType" TEXT,
    "saleType" TEXT NOT NULL DEFAULT 'cash',
    "paymentMethod" TEXT,
    "subject" TEXT,
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalDiscount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxableAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalTax" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalDuty" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalAdditions" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "finalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "internalStatus" TEXT NOT NULL DEFAULT 'draft',
    "taxStatus" TEXT,
    "taxReferenceId" TEXT,
    "idempotencyKey" TEXT,
    "sourceInvoiceId" UUID,
    "sourceDocType" TEXT,
    "sourceDocId" UUID,
    "referenceInvoiceId" UUID,
    "referenceType" TEXT,
    "referenceReason" TEXT,
    "sendQueuedAt" TIMESTAMP(3),
    "lastSentAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 5,
    "lastError" TEXT,
    "lastErrorCode" TEXT,
    "taxResponseRaw" JSONB,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_moadi_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_moadi_invoice_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID,
    "invoiceId" UUID NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "productId" UUID,
    "productCode" TEXT,
    "productName" TEXT,
    "productTaxId" TEXT,
    "unit" TEXT,
    "qty" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "unitPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "rowDiscount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "rowTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "dutyRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "dutyAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_moadi_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_moadi_send_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID,
    "invoiceId" UUID,
    "attemptNumber" INTEGER NOT NULL,
    "requestPayload" JSONB,
    "responseStatus" INTEGER,
    "responseOk" BOOLEAN NOT NULL DEFAULT false,
    "responseRaw" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "errorType" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER,

    CONSTRAINT "tax_moadi_send_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_moadi_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orgId" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL DEFAULT 'invoice',
    "entityId" UUID,
    "userId" UUID,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_moadi_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tax_moadi_invoices_taxInvoiceNumber_key" ON "tax_moadi_invoices"("taxInvoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "tax_moadi_invoices_idempotencyKey_key" ON "tax_moadi_invoices"("idempotencyKey");

-- CreateIndex
CREATE INDEX "tax_moadi_invoices_orgId_idx" ON "tax_moadi_invoices"("orgId");

-- CreateIndex
CREATE INDEX "tax_moadi_invoices_internalStatus_idx" ON "tax_moadi_invoices"("internalStatus");

-- CreateIndex
CREATE INDEX "tax_moadi_invoices_taxStatus_idx" ON "tax_moadi_invoices"("taxStatus");

-- CreateIndex
CREATE INDEX "tax_moadi_invoices_invoiceDate_idx" ON "tax_moadi_invoices"("invoiceDate");

-- CreateIndex
CREATE INDEX "tax_moadi_invoices_sourceInvoiceId_idx" ON "tax_moadi_invoices"("sourceInvoiceId");

-- CreateIndex
CREATE INDEX "tax_moadi_invoices_referenceInvoiceId_idx" ON "tax_moadi_invoices"("referenceInvoiceId");

-- CreateIndex
CREATE INDEX "tax_moadi_invoice_items_invoiceId_idx" ON "tax_moadi_invoice_items"("invoiceId");

-- CreateIndex
CREATE INDEX "tax_moadi_send_logs_invoiceId_idx" ON "tax_moadi_send_logs"("invoiceId");

-- CreateIndex
CREATE INDEX "tax_moadi_send_logs_sentAt_idx" ON "tax_moadi_send_logs"("sentAt");

-- CreateIndex
CREATE INDEX "tax_moadi_audit_logs_orgId_idx" ON "tax_moadi_audit_logs"("orgId");

-- CreateIndex
CREATE INDEX "tax_moadi_audit_logs_entityId_idx" ON "tax_moadi_audit_logs"("entityId");

-- CreateIndex
CREATE INDEX "tax_moadi_audit_logs_createdAt_idx" ON "tax_moadi_audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "tax_moadi_settings" ADD CONSTRAINT "tax_moadi_settings_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_moadi_fiscal_memories" ADD CONSTRAINT "tax_moadi_fiscal_memories_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_moadi_fiscal_memories" ADD CONSTRAINT "tax_moadi_fiscal_memories_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "tax_moadi_settings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_moadi_invoices" ADD CONSTRAINT "tax_moadi_invoices_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_moadi_invoices" ADD CONSTRAINT "tax_moadi_invoices_fiscalMemoryId_fkey" FOREIGN KEY ("fiscalMemoryId") REFERENCES "tax_moadi_fiscal_memories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_moadi_invoice_items" ADD CONSTRAINT "tax_moadi_invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "tax_moadi_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_moadi_send_logs" ADD CONSTRAINT "tax_moadi_send_logs_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "tax_moadi_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_moadi_audit_logs" ADD CONSTRAINT "tax_moadi_audit_logs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
