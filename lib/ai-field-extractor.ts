import { toEnglishDigits } from '@/lib/format';
import type { CreateSchema, CreateField } from '@/lib/ai-create-schemas';

// ─── Persian number parsing ───

function extractAmount(text: string): number | null {
  const normalized = toEnglishDigits(text);
  // Match numbers with optional thousand separators (spaces, commas, or Persian thousands)
  const matches = normalized.match(/(\d[\d,.\s]*\d|\d)/g);
  if (!matches || matches.length === 0) return null;
  // Find the largest plausible monetary amount (skip tiny numbers like 1-digit IDs)
  let best: number | null = null;
  for (const m of matches) {
    const cleaned = m.replace(/[,\s]/g, '').replace(/\.(?=\d{3})/g, '');
    const n = Number(cleaned);
    if (isNaN(n) || n < 0) continue;
    // Heuristic: amounts are usually >= 1000 (toman). But accept any number >= 100
    if (n >= 100) {
      if (best === null || n > best) best = n;
    }
  }
  // If no large number found, take the first number we see
  if (best === null) {
    for (const m of matches) {
      const cleaned = m.replace(/[,\s]/g, '');
      const n = Number(cleaned);
      if (!isNaN(n) && n > 0) return n;
    }
  }
  return best;
}

// ─── Persian date parsing (Jalali) ───

const JALALI_MONTHS: Record<string, number> = {
  'فروردین': 1, 'اردیبهشت': 2, 'خرداد': 3, 'تیر': 4, 'مرداد': 5, 'شهریور': 6,
  'مهر': 7, 'آبان': 8, 'آذر': 9, 'دی': 10, 'بهمن': 11, 'اسفند': 12,
};

// Also match common abbreviations / variations
const JALALI_MONTH_ALIASES: Record<string, string> = {
  'فروردین': 'فروردین', 'اردیبهشت': 'اردیبهشت', 'خرداد': 'خرداد',
  'تیر': 'تیر', 'مرداد': 'مرداد', 'شهریور': 'شهریور',
  'مهر': 'مهر', 'آبان': 'آبان', 'آذر': 'آذر',
  'دی': 'دی', 'بهمن': 'بهمن', 'اسفند': 'اسفند',
};

function extractJalaliDate(text: string): string | null {
  const normalized = toEnglishDigits(text);
  // Pattern 1: "15 مهر 1403" or "۱۵ مهر ۱۴۰۳" or "15/7/1403"
  // Try named month first: DD MonthName YYYY
  for (const [alias, monthName] of Object.entries(JALALI_MONTH_ALIASES)) {
    const re = new RegExp(`(\\d{1,2})\\s*${alias}\\s*(\\d{2,4})`, 'i');
    const m = normalized.match(re);
    if (m) {
      const day = Number(m[1]);
      const month = JALALI_MONTHS[monthName];
      let year = Number(m[2]);
      if (year < 100) year += 1400;
      return jalaliToISO(year, month, day);
    }
  }
  // Pattern 2: YYYY/MM/DD or DD/MM/YYYY (Jalali)
  const slashMatch = normalized.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (slashMatch) {
    const y = Number(slashMatch[1]);
    const mo = Number(slashMatch[2]);
    const d = Number(slashMatch[3]);
    if (y > 1300 && y < 1500) return jalaliToISO(y, mo, d);
  }
  const slashMatch2 = normalized.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch2) {
    const d = Number(slashMatch2[1]);
    const mo = Number(slashMatch2[2]);
    const y = Number(slashMatch2[3]);
    if (y > 1300 && y < 1500) return jalaliToISO(y, mo, d);
  }
  // Pattern 3: "امروز" = today
  if (text.includes('امروز')) {
    return new Date().toISOString().slice(0, 10);
  }
  return null;
}

// ─── Jalali → Gregorian conversion (algorithm) ───

function jalaliToISO(jy: number, jm: number, jd: number): string {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
}

function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  // Convert Jalali to Julian Day Number, then to Gregorian
  const jp = jy - 979;
  const jalaliMonthDays = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
  let epbase = -14;
  let epgy = jp + 4716;
  if (jp <= 0) epgy -= 1;
  let rd = 365 * epgy + Math.floor(epgy / 4) - Math.floor(epgy / 100) + Math.floor(epgy / 400) - 11;
  for (let i = 0; i < jm - 1; i++) rd += jalaliMonthDays[i];
  rd += jd;
  epbase = rd - 1;
  epgy = 4716 + Math.floor((4 * epbase + 3) / 1461);
  let E = 365 * epgy + Math.floor(epgy / 4) - Math.floor(epgy / 100) + Math.floor(epgy / 400) - 11;
  let E2 = rd - E;
  const daynyear = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gyy = epgy - 4716;
  let leap = 0;
  if (E2 < 0) {
    gyy -= 1;
    E2 += 365;
  }
  if ((gyy % 4 === 0 && gyy % 100 !== 0) || gyy % 400 === 0) leap = 1;
  let gm2 = 0;
  while (E2 >= daynyear[gm2] + (gm2 === 1 ? leap : 0)) {
    E2 -= daynyear[gm2] + (gm2 === 1 ? leap : 0);
    gm2++;
  }
  const gd2 = E2 + 1;
  return [gyy, gm2 + 1, gd2];
}

// ─── Field-specific extractors ───

function extractName(text: string): string | null {
  // Match "برای [name]" or "به نام [name]" or "نام: [name]"
  const patterns = [
    /برای\s+([\u0600-\u06FF\s]{2,30}?)(?:\s+(?:فاکتور|پرداخت|چک|رسید|بساز|ایجاد|ثبت)|$)/i,
    /به\s+نام\s+([\u0600-\u06FF\s]{2,30}?)(?:\s+(?:فاکتور|پرداخت|چک|رسید|بساز|ایجاد|ثبت)|$)/i,
    /نام[:\s]+([\u0600-\u06FF\s]{2,30}?)(?:\s+(?:با|به|مبلغ|شماره)|$)/i,
  /مشتری[:\s]+([\u0600-\u06FF\s]{2,30}?)(?:\s+(?:با|به|مبلغ|شماره)|$)/i,
  /طرف\s*حساب[:\s]+([\u0600-\u06FF\s]{2,30}?)(?:\s+(?:با|به|مبلغ|شماره)|$)/i,
  /صادرکننده[:\s]+([\u0600-\u06FF\s]{2,30}?)(?:\s+(?:با|به|مبلغ|شماره)|$)/i,
  /بانک[:\s]+([\u0600-\u06FF\s]{2,30}?)(?:\s+(?:با|به|مبلغ|شماره|شعبه)|$)/i,
  /کد[:\s]+([A-Za-z0-9\-]{2,20})/i,
    /شماره[:\s]+([A-Za-z0-9\-]{2,20})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) {
      const name = m[1].trim();
      if (name.length >= 2) return name;
    }
  }
  return null;
}

function extractBankName(text: string): string | null {
  const banks = ['ملت', 'ملی', 'سپه', 'تجارت', 'صادرات', 'رفاه', 'کشاورزی', 'مسکن', 'توسعه تعاون', 'صنعت و معدن', 'پاسارگاد', 'پارسیان', 'کارآفرین', 'سامان', 'سینا', 'سرمایه', 'شهر', 'آینده', 'دی', 'مهر ایران', 'گردشگری', 'حکمت', 'ایران زمین', 'پست بانک', 'مهر اقتصاد'];
  for (const b of banks) {
    if (text.includes(b)) return b;
  }
  return null;
}

function extractStatus(text: string, options?: { value: string; label: string }[]): string | null {
  if (!options) return null;
  const lower = text.toLowerCase();
  for (const opt of options) {
    if (text.includes(opt.label) || lower.includes(opt.value)) return opt.value;
  }
  return null;
}

function extractType(text: string, options?: { value: string; label: string }[]): string | null {
  if (!options) return null;
  for (const opt of options) {
    if (text.includes(opt.label)) return opt.value;
  }
  // Common Persian type words
  if (text.includes('نقدی') || text.includes('نقد')) {
    const cashOpt = options.find((o) => o.value === 'cash' || o.value === 'current');
    if (cashOpt) return cashOpt.value;
  }
  if (text.includes('بانکی') || text.includes('انتقال')) {
    const bankOpt = options.find((o) => o.value === 'bank' || o.value === 'bank_transfer' || o.value === 'savings');
    if (bankOpt) return bankOpt.value;
  }
  if (text.includes('چک')) {
    const chequeOpt = options.find((o) => o.value === 'cheque');
    if (chequeOpt) return chequeOpt.value;
  }
  if (text.includes('کارت')) {
    const cardOpt = options.find((o) => o.value === 'card');
    if (cardOpt) return cardOpt.value;
  }
  if (text.includes('حقیقی')) {
    const indOpt = options.find((o) => o.value === 'individual');
    if (indOpt) return indOpt.value;
  }
  if (text.includes('حقوقی') || text.includes('شرکت')) {
    const coOpt = options.find((o) => o.value === 'company');
    if (coOpt) return coOpt.value;
  }
  if (text.includes('دریافتی')) {
    const rOpt = options.find((o) => o.value === 'received');
    if (rOpt) return rOpt.value;
  }
  if (text.includes('صادری') || text.includes('صادری')) {
    const iOpt = options.find((o) => o.value === 'issued');
    if (iOpt) return iOpt.value;
  }
  return null;
}

function extractBoolean(text: string, fieldKey: string): boolean | null {
  if (fieldKey === 'active') {
    if (text.includes('فعال') || text.includes('روشن')) return true;
    if (text.includes('غیرفعال') || text.includes('غیر فعال') || text.includes('خاموش')) return false;
  }
  if (fieldKey === 'isGroup') {
    if (text.includes('گروهی') || text.includes('گروه')) return true;
  }
  return null;
}

function extractCode(text: string): string | null {
  // Match patterns like "INV-001", "PC-001", "کد: 1234"
  const codeMatch = text.match(/([A-Z]{2,5}[-]?\d{2,6})/i);
  if (codeMatch) return codeMatch[1].toUpperCase();
  // Match "کد 1234" or "کد: 1234"
  const persianCodeMatch = text.match(/کد[:\s]+([A-Za-z0-9\-]{2,20})/);
  if (persianCodeMatch) return persianCodeMatch[1];
  return null;
}

function extractChequeNumber(text: string): string | null {
  // "چک شماره 123456" or "شماره چک 123456"
  const m = text.match(/(?:شماره\s*(?:چک|سند))[:\s]*([0-9]{3,20})/);
  if (m) return m[1];
  const m2 = text.match(/چک\s*(?:شماره)?\s*#?\s*([0-9]{3,20})/);
  if (m2) return m2[1];
  return null;
}

function extractTID(text: string): string | null {
  const m = text.match(/TID[:\s]*([0-9]{6,12})/i);
  if (m) return m[1];
  return null;
}

function extractMID(text: string): string | null {
  const m = text.match(/MID[:\s]*([0-9]{6,12})/i);
  if (m) return m[1];
  return null;
}

function extractAccountNo(text: string): string | null {
  const m = text.match(/(?:شماره\s*حساب|حساب\s*شماره)[:\s]*([0-9]{4,20})/);
  if (m) return m[1];
  return null;
}

function extractCardNumber(text: string): string | null {
  const m = text.match(/(?:شماره\s*کارت|کارت)[:\s]*([0-9]{16,19})/);
  if (m) return m[1];
  return null;
}

function extractIBAN(text: string): string | null {
  const m = text.match(/(?:شبا|IR)\s*([0-9]{20,24})/i);
  if (m) return 'IR' + m[1];
  return null;
}

function extractDescription(text: string): string | null {
  // Match "توضیحات: ..." or "توضیح: ..." or "شرح: ..."
  const m = text.match(/(?:توضیحات|توضیح|شرح|یادداشت)[:\s]+(.+?)(?:\.|$)/i);
  if (m) return m[1].trim();
  // Match text in quotes
  const qMatch = text.match(/["«»""](.+?)["«»""]/);
  if (qMatch) return qMatch[1].trim();
  return null;
}

// ─── Main extraction function ───

export interface ExtractedField {
  key: string;
  label: string;
  value: any;
  source: 'extracted' | 'default' | 'missing';
}

export function extractFieldsFromText(
  text: string,
  schema: CreateSchema,
): { fields: ExtractedField[]; confidence: number } {
  const fields: ExtractedField[] = [];
  let extractedCount = 0;

  for (const field of schema.fields) {
    let value: any = undefined;
    let source: 'extracted' | 'default' | 'missing' = 'missing';

    // Try field-specific extraction
    value = extractFieldByType(text, field);

    if (value !== undefined && value !== null && value !== '') {
      source = 'extracted';
      extractedCount++;
    } else if (field.default !== undefined) {
      value = field.default;
      source = 'default';
    } else {
      value = '';
    }

    fields.push({ key: field.key, label: field.label, value, source });
  }

  // Confidence = ratio of extracted fields to total required fields
  const requiredFields = schema.fields.filter((f) => f.required);
  const requiredExtracted = fields.filter((f) => f.source === 'extracted' && requiredFields.some((rf) => rf.key === f.key)).length;
  const confidence = requiredFields.length > 0 ? requiredExtracted / requiredFields.length : extractedCount / Math.max(schema.fields.length, 1);

  return { fields, confidence };
}

function extractFieldByType(text: string, field: CreateField): any {
  // Field-specific extraction based on key
  switch (field.key) {
    case 'amount':
    case 'balance':
    case 'ceiling':
    case 'finalAmount':
    case 'paid':
      return extractAmount(text);
    case 'dueDate':
    case 'issueDate':
    case 'startDate':
    case 'endDate':
    case 'date':
      return extractJalaliDate(text);
    case 'number':
      // For invoice/payment/receipt numbers, try code pattern
      if (field.placeholder && field.placeholder.includes('-')) return extractCode(text);
      return null;
    case 'code':
      return extractCode(text);
    case 'chequeNumber':
      return extractChequeNumber(text);
    case 'tid':
      return extractTID(text);
    case 'mid':
      return extractMID(text);
    case 'bankName':
      return extractBankName(text);
    case 'accountNo':
      return extractAccountNo(text);
    case 'cardNumber':
      return extractCardNumber(text);
    case 'iban':
      return extractIBAN(text);
    case 'name':
      // For bank account, try extracting name
      return extractName(text);
    case 'firstName':
    case 'lastName':
    case 'companyName':
    case 'payerName':
    case 'issuerName':
    case 'counterparty':
      return extractName(text);
    case 'description':
    case 'notes':
      return extractDescription(text);
    case 'status':
      return extractStatus(text, field.options);
    case 'type':
    case 'method':
    case 'accountType':
    case 'detailType':
      return extractType(text, field.options);
    case 'active':
    case 'isGroup':
      return extractBoolean(text, field.key);
    case 'customerId':
      // Can't reliably extract UUID from text
      return null;
    default:
      return null;
  }
}

// ─── Generate a human-readable summary of extracted fields ───

export function generateExtractionSummary(
  schema: CreateSchema,
  fields: ExtractedField[],
  confidence: number,
): string {
  const extracted = fields.filter((f) => f.source === 'extracted');
  const missing = fields.filter((f) => f.source === 'missing' && schema.fields.find((sf) => sf.key === f.key)?.required);

  let summary = `اطلاعات استخراج‌شده از پیام شما:\n\n`;

  if (extracted.length > 0) {
    summary += `✓ فیلدهای شناسایی‌شده:\n`;
    for (const f of extracted) {
      let displayValue = f.value;
      if (typeof f.value === 'number') displayValue = f.value.toLocaleString('fa-IR');
      summary += `  • ${f.label}: ${displayValue}\n`;
    }
  }

  if (missing.length > 0) {
    summary += `\n⚠ فیلدهای نیازمند تکمیل:\n`;
    for (const f of missing) {
      summary += `  • ${f.label}\n`;
    }
  }

  const confPercent = Math.round(confidence * 100);
  if (confPercent >= 80) {
    summary += `\nنرخ دقت: ${confPercent}٪ — اطلاعات تقریباً کامل است. لطفاً بررسی و تأیید کنید.`;
  } else if (confPercent >= 40) {
    summary += `\nنرخ دقت: ${confPercent}٪ — بخشی از اطلاعات استخراج شد. لطفاً فیلدهای ناقص را تکمیل کنید.`;
  } else {
    summary += `\nنرخ دقت: ${confPercent}٪ — اطلاعات کافی استخراج نشد. لطفاً فیلدها را به‌صورت دستی وارد کنید.`;
  }

  return summary;
}
