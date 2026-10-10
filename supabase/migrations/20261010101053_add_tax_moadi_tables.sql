/*
# سامانه مؤدیان مالیاتی — جداول اصلی

1. جداول جدید:
- tax_moadi_settings: تنظیمات مؤدی (نوع، نام، کد اقتصادی، دوره مالیاتی، وضعیت اعتبارسنجی)
- tax_moadi_fiscal_memories: حافظه‌های مالیاتی (کلیدها، محیط، توکن، وضعیت اتصال)
- tax_moadi_invoices: صورتحساب‌های الکترونیکی (نوع، الگو، وضعیت داخلی و مالیاتی، ارجاعات)
- tax_moadi_invoice_items: اقلام صورتحساب (کالا، تعداد، قیمت، تخفیف، مالیات، عوارض)
- tax_moadi_send_logs: لاگ‌های ارسال به سامانه (درخواست، پاسخ، خطا)
- tax_moadi_audit_logs: سوابق حسابرسی (عملیات، کاربر، جزئیات)

2. روابط:
- تمام جداول به organizations متصل هستند (CASCADE)
- fiscal_memories به settings (SET NULL)
- invoices به fiscal_memories (SET NULL)
- invoice_items به invoices (CASCADE)
- send_logs به invoices (CASCADE)

3. ایندکس‌ها:
- tax_moadi_invoices: orgId, internalStatus, taxStatus, invoiceDate, sourceInvoiceId, referenceInvoiceId
- tax_moadi_invoice_items: invoiceId
- tax_moadi_send_logs: invoiceId, sentAt
- tax_moadi_audit_logs: orgId, entityId, createdAt

4. محدودیت‌های یکتا:
- tax_moadi_invoices.taxInvoiceNumber (UNIQUE)
- tax_moadi_invoices.idempotencyKey (UNIQUE)

Note: These tables are designed to work alongside the existing Prisma-managed schema.
*/

CREATE TABLE IF NOT EXISTS "tax_moadi_settings" (
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

CREATE TABLE IF NOT EXISTS "tax_moadi_fiscal_memories" (
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

CREATE TABLE IF NOT EXISTS "tax_moadi_invoices" (
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

CREATE TABLE IF NOT EXISTS "tax_moadi_invoice_items" (
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

CREATE TABLE IF NOT EXISTS "tax_moadi_send_logs" (
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

CREATE TABLE IF NOT EXISTS "tax_moadi_audit_logs" (
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

-- Unique indexes (use IF NOT EXISTS for idempotency)
CREATE UNIQUE INDEX IF NOT EXISTS "tax_moadi_invoices_taxInvoiceNumber_key" ON "tax_moadi_invoices"("taxInvoiceNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "tax_moadi_invoices_idempotencyKey_key" ON "tax_moadi_invoices"("idempotencyKey");

-- Regular indexes
CREATE INDEX IF NOT EXISTS "tax_moadi_invoices_orgId_idx" ON "tax_moadi_invoices"("orgId");
CREATE INDEX IF NOT EXISTS "tax_moadi_invoices_internalStatus_idx" ON "tax_moadi_invoices"("internalStatus");
CREATE INDEX IF NOT EXISTS "tax_moadi_invoices_taxStatus_idx" ON "tax_moadi_invoices"("taxStatus");
CREATE INDEX IF NOT EXISTS "tax_moadi_invoices_invoiceDate_idx" ON "tax_moadi_invoices"("invoiceDate");
CREATE INDEX IF NOT EXISTS "tax_moadi_invoices_sourceInvoiceId_idx" ON "tax_moadi_invoices"("sourceInvoiceId");
CREATE INDEX IF NOT EXISTS "tax_moadi_invoices_referenceInvoiceId_idx" ON "tax_moadi_invoices"("referenceInvoiceId");
CREATE INDEX IF NOT EXISTS "tax_moadi_invoice_items_invoiceId_idx" ON "tax_moadi_invoice_items"("invoiceId");
CREATE INDEX IF NOT EXISTS "tax_moadi_send_logs_invoiceId_idx" ON "tax_moadi_send_logs"("invoiceId");
CREATE INDEX IF NOT EXISTS "tax_moadi_send_logs_sentAt_idx" ON "tax_moadi_send_logs"("sentAt");
CREATE INDEX IF NOT EXISTS "tax_moadi_audit_logs_orgId_idx" ON "tax_moadi_audit_logs"("orgId");
CREATE INDEX IF NOT EXISTS "tax_moadi_audit_logs_entityId_idx" ON "tax_moadi_audit_logs"("entityId");
CREATE INDEX IF NOT EXISTS "tax_moadi_audit_logs_createdAt_idx" ON "tax_moadi_audit_logs"("createdAt");