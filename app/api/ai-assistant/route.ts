import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import {
  ANALYZERS, SECTION_LABELS, detectIntent, type AnalysisResult,
} from '@/lib/ai-analyzers';
import { CREATE_SCHEMAS } from '@/lib/ai-create-schemas';
import { extractFieldsFromText, generateExtractionSummary } from '@/lib/ai-field-extractor';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

function getAuth(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
  } catch {
    return null;
  }
}

async function collectFinancialData() {
  const [
    accounts, journalEntries, bankAccounts, cashFunds, fundTransfers,
    cheques, payments, receipts, invoices, preInvoices, salesReturns,
    contactParties, contactSettlements, pettyCashCustodians, pettyCashExpenses,
    pettyCashExpenseStatements, pettyCashMergeStatements,
    documentIssuances, receivedCheques, chequeRefunds, chequeClearings,
    cardReaders, cardReaderTransactions, cardReaderSettlements,
    paymentAnnouncements, customers, costCenters, fiscalYears,
    leads, products, orders, opportunities, profiles, tickets,
    customerInteractions, stockMovements, demos,
  ] = await Promise.all([
    prisma.account.findMany({ orderBy: { code: 'asc' } }),
    prisma.journalEntry.findMany({ include: { lines: true }, orderBy: { createdAt: 'desc' }, take: 500 }),
    prisma.bankAccount.findMany(),
    prisma.cashFund.findMany(),
    prisma.fundTransfer.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.cheque.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 500 }),
    prisma.receipt.findMany({ orderBy: { createdAt: 'desc' }, take: 500 }),
    prisma.invoice.findMany({ orderBy: { createdAt: 'desc' }, take: 500 }),
    prisma.preInvoice.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.salesReturn.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.contactParty.findMany({ take: 500 }),
    prisma.contactSettlement.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.pettyCashCustodian.findMany(),
    prisma.pettyCashExpense.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.pettyCashExpenseStatement.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.pettyCashMergeStatement.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.documentIssuance.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.receivedCheque.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.chequeRefund.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.chequeClearing.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.cardReader.findMany(),
    prisma.cardReaderTransaction.findMany({ orderBy: { createdAt: 'desc' }, take: 300 }),
    prisma.cardReaderSettlement.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.paymentAnnouncement.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.customer.findMany({ take: 500 }),
    prisma.costCenter.findMany(),
    prisma.fiscalYear.findMany({ orderBy: { startDate: 'desc' } }),
    prisma.lead.findMany({ orderBy: { createdAt: 'desc' }, take: 500 }),
    prisma.product.findMany({ take: 500 }),
    prisma.order.findMany({ include: { items: true }, orderBy: { createdAt: 'desc' }, take: 500 }),
    prisma.opportunity.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.profile.findMany({ take: 200 }),
    prisma.ticket.findMany({ orderBy: { createdAt: 'desc' }, take: 500 }),
    prisma.customerInteraction.findMany({ orderBy: { createdAt: 'desc' }, take: 500 }),
    prisma.stockMovement.findMany({ orderBy: { createdAt: 'desc' }, take: 500 }),
    prisma.demo.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
  ]);

  return {
    accounts, journalEntries, bankAccounts, cashFunds, fundTransfers,
    cheques, payments, receipts, invoices, preInvoices, salesReturns,
    contactParties, contactSettlements, pettyCashCustodians, pettyCashExpenses,
    pettyCashExpenseStatements, pettyCashMergeStatements,
    documentIssuances, receivedCheques, chequeRefunds, chequeClearings,
    cardReaders, cardReaderTransactions, cardReaderSettlements,
    paymentAnnouncements, customers, costCenters, fiscalYears,
    leads, products, orders, opportunities, profiles, tickets,
    customerInteractions, stockMovements, demos,
  };
}

// ─── Chat / conversation engine ───

const GREETINGS = ['سلام', 'سلامت', 'hi', 'hello', 'hey', 'درود', 'صبح بخیر', 'عصر بخیر', 'شب بخیر', 'خوبی', 'چطوری'];
const THANKS = ['ممنون', 'مرسی', 'تشکر', 'thanks', 'thank you', 'خوبه', 'عالی', 'احسنت'];
const HELP_PHRASES = ['راهنما', 'کمک', 'help', 'چه کار', 'چیکار', 'چه کاری', 'بتونم', 'می‌تونم', 'امکانات', 'قابلیت'];

function isGreeting(msg: string): boolean {
  const lower = msg.toLowerCase().trim();
  return GREETINGS.some((g) => lower === g || lower.startsWith(g + ' ') || lower === g.replace(/\s/g, ''));
}

function isThanks(msg: string): boolean {
  const lower = msg.toLowerCase().trim();
  return THANKS.some((t) => lower.includes(t));
}

function isHelpRequest(msg: string): boolean {
  const lower = msg.toLowerCase().trim();
  return HELP_PHRASES.some((h) => lower.includes(h));
}

function generateHelpResponse(): AnalysisResult {
  return {
    summary: `راهنمای دستیار هوشمند مالی\n\nمن می‌توانم در دو حوزه به شما کمک کنم:\n\n۱. تحلیل داده‌ها — برای هر بخش مالی، آمار، هشدار و توصیه ارائه می‌دهم. کافیست نام بخش را بپرسید یا روی دکمه‌های سریع کلیک کنید.\n\n۲. ایجاد رکورد — می‌توانم با راهنمایی مرحله‌ای، رکوردهای جدید در دیتابیس ایجاد کنم. مثلاً بگویید «یک تنخواه‌دار ایجاد کن» یا «فاکتور جدید بساز».\n\nبخش‌های قابل تحلیل مالی:\n• نمای کلی مالی\n• فاکتورها و فروش\n• پرداخت‌ها و دریافت‌ها\n• چک‌های دریافتی\n• حساب‌های بانکی و خزانه‌داری\n• تنخواه‌دار\n• کارتخوان‌ها\n• مطالبات و بدهی‌ها\n• حسابداری و اسناد\n• طرف‌های حساب و تسویه\n• صدور اسناد\n• اعلامیه‌های پرداخت\n• پیش‌فاکتور و مرجوعی\n\nبخش‌های هوشمند CRM+ERP:\n• هشدارهای هوشمند (ریسک‌های فعال)\n• امتیازدهی لیدها\n• پیش‌بینی ریزش مشتری\n• پیشنهاد فروش متقاطع\n• تخصیص منابع فروش\n• مدیریت موجودی هوشمند\n• سودآوری مشتری\n• تقویم مالی\n• مسیر تبدیل (قیف فروش)\n\nرکوردهای قابل ایجاد:\n• تنخواه‌دار\n• حساب بانکی\n• فاکتور\n• پرداخت\n• رسید/دریافت\n• چک دریافتی\n• کارتخوان\n• طرف حساب\n• حساب حسابداری\n• مرکز هزینه\n• سال مالی\n• چک\n• پیش‌فاکتور\n• اعلامیه پرداخت`,
    details: [
      'مثال تحلیل: «وضعیت فاکتورها چطوره؟» یا «مطالبات را تحلیل کن»',
      'مثال ایجاد: «یک حساب بانکی ایجاد کن» یا «تنخواه‌دار جدید بساز»',
      'همچنین می‌توانید سلام کنید و گفتگو کنید!',
    ],
    alerts: [],
    recommendations: [
      'برای شروع، یکی از دکمه‌های سریع بالا را امتحان کنید.',
      'برای ایجاد رکورد، کلمه «ایجاد» یا «ساختن» + نام بخش را بگویید.',
    ],
    stats: [],
  };
}

function generateGreetingResponse(msg: string): AnalysisResult {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'صبح بخیر' : hour < 18 ? 'عصر بخیر' : 'شب بخیر';
  return {
    summary: `${timeOfDay}! خوش آمدید.\n\nمن دستیار هوشمند مالی شما هستم. می‌توانم داده‌های مالی سیستم شما را تحلیل کنم، گزارش بدهم و رکوردهای جدید ایجاد کنم.\n\nبرای شروع می‌توانید:\n• یکی از دکمه‌های تحلیل سریع را انتخاب کنید\n• بپرسید «راهنما» تا تمام امکانات را ببینید\n• بگویید «یک فاکتور ایجاد کن» تا با هم رکورد جدید بسازیم`,
    details: [],
    alerts: [],
    recommendations: ['برای دیدن امکانات کامل، «راهنما» را بپرسید.'],
    stats: [],
  };
}

function generateThanksResponse(): AnalysisResult {
  return {
    summary: 'خواهش می‌کنم! خوشحالم که تونستم کمکتون کنم.\n\nاگه سوال دیگه‌ای دارید یا می‌خواهید رکورد جدیدی ایجاد کنید، در خدمتم.',
    details: [],
    alerts: [],
    recommendations: [],
    stats: [],
  };
}

// ─── Create intent detection ───

const CREATE_KEYWORDS = ['ایجاد', 'ساختن', 'ساز', 'افزودن', 'اضافه', 'جدید', 'create', 'add', 'new', 'ثبت'];
const CREATE_SECTIONS_MAP: Record<string, string[]> = {
  pettyCash: ['تنخواه', 'petty cash', 'تنخواه‌دار', 'تنخواهدار'],
  bankAccount: ['حساب بانکی', 'بانک', 'bank account', 'حساب بانک'],
  invoice: ['فاکتور', 'invoice'],
  payment: ['پرداخت', 'payment'],
  receipt: ['رسید', 'دریافت', 'receipt'],
  receivedCheque: ['چک دریافتی', 'چک دریافتی', 'received cheque'],
  cardReader: ['کارتخوان', 'card reader', 'pos', 'ترمینال'],
  contactParty: ['طرف حساب', 'contact party', 'طرف حساب جدید'],
  account: ['حساب حسابداری', 'حساب جدید', 'account', 'چارت حساب', 'حساب'],
  costCenter: ['مرکز هزینه', 'cost center'],
  fiscalYear: ['سال مالی', 'fiscal year'],
  cheque: ['چک', 'cheque'],
  preInvoice: ['پیش‌فاکتور', 'پیش فاکتور', 'pre-invoice', 'pre invoice'],
  paymentAnnouncement: ['اعلامیه پرداخت', 'payment announcement', 'اعلامیه'],
};

function detectCreateIntent(message: string): string | null {
  const lower = message.toLowerCase();
  const hasCreateKeyword = CREATE_KEYWORDS.some((k) => lower.includes(k));
  if (!hasCreateKeyword) return null;

  let bestMatch: string | null = null;
  let bestScore = 0;
  for (const [section, keywords] of Object.entries(CREATE_SECTIONS_MAP)) {
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        if (kw.length > bestScore) {
          bestScore = kw.length;
          bestMatch = section;
        }
      }
    }
  }
  return bestMatch;
}

// ─── API handler ───

export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { message, section, mode, createSection, fieldValues, confirmCreate } = body as {
      message?: string;
      section?: string;
      mode?: 'analyze' | 'create' | 'help' | 'chat';
      createSection?: string;
      fieldValues?: Record<string, any>;
      confirmCreate?: boolean;
    };

    // ─── MODE: CREATE ───
    if (mode === 'create') {
      let schema = createSection ? CREATE_SCHEMAS[createSection] : null;
      // If not found by camelCase key, try reverse lookup by table name (schema.model)
      if (!schema && createSection) {
        schema = Object.values(CREATE_SCHEMAS).find((s) => s.model === createSection) || null;
      }
      if (!schema) {
        return NextResponse.json({
          error: 'بخش مورد نظر برای ایجاد یافت نشد.',
          availableSections: Object.keys(CREATE_SCHEMAS),
        }, { status: 400 });
      }

      // If confirmCreate, actually create the record
      if (confirmCreate && fieldValues) {
        const modelMap: Record<string, any> = {
          'petty_cash_custodians': prisma.pettyCashCustodian,
          'bank_accounts': prisma.bankAccount,
          'invoices': prisma.invoice,
          'payments': prisma.payment,
          'receipts': prisma.receipt,
          'received_cheques': prisma.receivedCheque,
          'card_readers': prisma.cardReader,
          'contact_parties': prisma.contactParty,
          'accounts': prisma.account,
          'cost_centers': prisma.costCenter,
          'fiscal_years': prisma.fiscalYear,
          'cheques': prisma.cheque,
          'pre_invoices': prisma.preInvoice,
          'payment_announcements': prisma.paymentAnnouncement,
        };

        const delegate = modelMap[schema.model];
        if (!delegate) {
          return NextResponse.json({ error: 'مدل دیتابیس برای این بخش پشتیبانی نمی‌شود.' }, { status: 400 });
        }

        // Convert types
        const BIGINT_FIELDS = ['amount', 'balance', 'ceiling', 'paid', 'finalAmount', 'totalAmount', 'chequeAmount', 'grossAmount', 'commissionAmount', 'deductions', 'netAmount', 'openingBalance', 'salary', 'supplierBalance', 'customerBalance', 'periodBalance', 'bankFee', 'clearedAmount', 'remainingAmount', 'settledAmount', 'discrepancyAmount'];
        const UUID_FIELDS = ['customerId', 'contactPartyId', 'profileId', 'accountId', 'bankAccountId', 'cashFundId', 'costCenterId', 'fiscalYearId', 'supplierId', 'employeeId', 'issuerPartyId', 'settlementAccountId', 'bankAccountTargetId', 'commissionAccountId', 'discrepancyAccountId'];
        const data: Record<string, any> = {};
        for (const field of schema.fields) {
          const val = fieldValues[field.key];
          if (val === undefined || val === '') continue;
          // Skip UUID fields that don't look like valid UUIDs
          if (UUID_FIELDS.includes(field.key)) {
            if (typeof val === 'string' && val.length === 36 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) {
              data[field.key] = val;
            }
            continue;
          }
          // BigInt fields
          if (BIGINT_FIELDS.includes(field.key) || field.type === 'number') {
            const n = Number(val);
            if (isNaN(n)) continue;
            data[field.key] = BigInt(Math.trunc(n));
          } else if (field.type === 'boolean') {
            data[field.key] = val === true || val === 'true' || val === 'on';
          } else if (field.type === 'date') {
            data[field.key] = new Date(val);
          } else {
            data[field.key] = val;
          }
        }

        // Add createdBy for models that require it (non-optional createdBy field in schema)
        if (['invoices', 'payments', 'receipts', 'received_cheques', 'pre_invoices', 'payment_announcements', 'petty_cash_custodians', 'card_readers'].includes(schema.model)) {
          data.createdBy = auth.userId;
        }

        try {
          const record = await delegate.create({ data });
          return NextResponse.json({
            type: 'create_success',
            section: schema.title,
            summary: `✓ ${schema.title} با موفقیت ایجاد شد!\n\nرکورد جدید در دیتابیس ذخیره شد.`,
            details: Object.entries(data).slice(0, 8).map(([k, v]) => `• ${k}: ${typeof v === 'bigint' ? v.toString() : typeof v === 'object' ? (v as Date)?.toISOString?.() || String(v) : String(v)}`),
            alerts: [],
            recommendations: ['برای مشاهده رکورد جدید، به صفحه مربوطه در منوی مالی مراجعه کنید.'],
            stats: [],
            recordId: (record as any).id,
          });
        } catch (e: any) {
          return NextResponse.json({
            type: 'create_error',
            section: schema.title,
            summary: `خطا در ایجاد ${schema.title}: ${e.message}`,
            details: [],
            alerts: ['ذخیره در دیتابیس ناموفق بود — لطفاً مقادیر ورودی را بررسی کنید.'],
            recommendations: [],
            stats: [],
          });
        }
      }

      // Return the schema for the frontend to render the form
      return NextResponse.json({
        type: 'create_form',
        section: schema.title,
        summary: `بیایید با هم یک ${schema.title} ایجاد کنیم!\n\n${schema.description}\n\nلطفاً اطلاعات زیر را وارد کنید:`,
        details: [],
        alerts: [],
        recommendations: [],
        stats: [],
        createSchema: {
          model: schema.model,
          title: schema.title,
          description: schema.description,
          fields: schema.fields,
        },
        extractedFields: null,
        confidence: 0,
      });
    }

    // ─── MODE: HELP ───
    if (mode === 'help' || (message && isHelpRequest(message))) {
      const result = generateHelpResponse();
      return NextResponse.json({ type: 'help', ...result, timestamp: new Date().toISOString() });
    }

    // ─── MODE: CHAT (greetings, thanks, conversation) ───
    if (message && isGreeting(message)) {
      const result = generateGreetingResponse(message);
      return NextResponse.json({ type: 'chat', ...result, timestamp: new Date().toISOString() });
    }

    if (message && isThanks(message)) {
      const result = generateThanksResponse();
      return NextResponse.json({ type: 'chat', ...result, timestamp: new Date().toISOString() });
    }

    // ─── DETECT CREATE INTENT from free text ───
    if (message && !section) {
      const createIntent = detectCreateIntent(message);
      if (createIntent) {
        const schema = CREATE_SCHEMAS[createIntent];
        const { fields, confidence } = extractFieldsFromText(message, schema);
        const summary = generateExtractionSummary(schema, fields, confidence);
        return NextResponse.json({
          type: 'create_form',
          section: schema.title,
          summary,
          details: [],
          alerts: [],
          recommendations: [],
          stats: [],
          createSchema: {
            model: schema.model,
            title: schema.title,
            description: schema.description,
            fields: schema.fields,
          },
          extractedFields: fields,
          confidence,
        });
      }
    }

    // ─── MODE: ANALYZE (default) ───
    const data = await collectFinancialData();
    const intent = section || detectIntent(message || '');
    const analyzer = ANALYZERS[intent] || ANALYZERS.overview;
    const result: AnalysisResult = analyzer(data);
    const sectionLabel = SECTION_LABELS[intent] || 'نمای کلی';

    return NextResponse.json({
      type: 'analysis',
      section: sectionLabel,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
