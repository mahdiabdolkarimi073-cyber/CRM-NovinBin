export const SALES_STAGES = [
  { key: 'new_lead', label: 'سرنخ جدید', color: '#3b82f6' },
  { key: 'first_call', label: 'تماس اولیه', color: '#06b6d4' },
  { key: 'meeting', label: 'جلسه', color: '#8b5cf6' },
  { key: 'proposal', label: 'پیشنهاد قیمت', color: '#f59e0b' },
  { key: 'negotiation', label: 'مذاکره', color: '#f97316' },
  { key: 'won', label: 'برنده', color: '#10b981' },
  { key: 'lost', label: 'از دست رفته', color: '#ef4444' },
];

export const TASK_STATUSES = [
  { key: 'in_progress', label: 'در حال انجام', color: '#3b82f6' },
  { key: 'completed', label: 'تکمیل شده', color: '#10b981' },
  { key: 'postponed', label: 'به تعویق افتاده', color: '#8b5cf6' },
  { key: 'cancelled', label: 'لغو شده', color: '#ef4444' },
];

export const TASK_PRIORITIES = [
  { key: 'low', label: 'کم', color: '#64748b' },
  { key: 'medium', label: 'متوسط', color: '#3b82f6' },
  { key: 'high', label: 'زیاد', color: '#f59e0b' },
  { key: 'critical', label: 'بحرانی', color: '#ef4444' },
];

export const MEETING_STATUSES = [
  { key: 'scheduled', label: 'برنامه‌ریزی شده', color: '#3b82f6' },
  { key: 'in_progress', label: 'در حال برگزاری', color: '#f59e0b' },
  { key: 'completed', label: 'تکمیل شده', color: '#10b981' },
  { key: 'cancelled', label: 'لغو شده', color: '#ef4444' },
  { key: 'postponed', label: 'به تعویق افتاده', color: '#8b5cf6' },
];

export const ORDER_STATUSES = [
  { key: 'registered', label: 'ثبت شده', color: '#3b82f6' },
  { key: 'paid', label: 'پرداخت شده', color: '#06b6d4' },
  { key: 'shipped', label: 'ارسال', color: '#f59e0b' },
  { key: 'delivered', label: 'تحویل', color: '#10b981' },
  { key: 'cancelled', label: 'لغو', color: '#ef4444' },
];

export const INVOICE_STATUSES = [
  { key: 'unpaid', label: 'پرداخت نشده', color: '#ef4444' },
  { key: 'partial', label: 'پرداخت جزئی', color: '#f59e0b' },
  { key: 'paid', label: 'پرداخت شده', color: '#10b981' },
  { key: 'overdue', label: 'سررسید گذشته', color: '#dc2626' },
];

export const CUSTOMER_LEVELS = [
  { key: 'basic', label: 'پایه', color: '#94a3b8' },
  { key: 'bronze', label: 'برنزی', color: '#b45309' },
  { key: 'silver', label: 'نقره‌ای', color: '#64748b' },
  { key: 'gold', label: 'طلایی', color: '#f59e0b' },
  { key: 'vip', label: 'ویژه', color: '#8b5cf6' },
];

export const SERVICE_TYPES = [
  'طراحی سایت',
  'طراحی لوگو',
  'طراحی کاتالوگ/دیجیتال',
  'سئو',
  'سایت برنامه‌نویسی',
  'ERP',
  'طراحی بنر',
  'کارت ویزیت',
  'طراحی منو',
];

export const ACTIVITY_TYPES = [
  'فناوری اطلاعات',
  'خرده‌فروشی',
  'تولیدی',
  'خدمات',
  'آموزش',
  'بازرگانی',
  'صادرات و واردات',
  'ساخت‌وساز',
  'مشاوره',
  'سلامت و درمان',
  'رستوران و کافه',
  'سایر',
];

export const TICKET_STATUSES = [
  { key: 'open', label: 'باز', color: '#3b82f6' },
  { key: 'in_progress', label: 'در حال انجام', color: '#f59e0b' },
  { key: 'resolved', label: 'حل شده', color: '#10b981' },
  { key: 'closed', label: 'بسته شده', color: '#64748b' },
];

export const LEAD_STATUSES = [
  { key: 'new', label: 'جدید', color: '#1F2937' },
  { key: 'contacted', label: 'در حال پیگیری', color: '#F59E0B' },
  { key: 'serious', label: 'در حال پیگیری جدی', color: '#EF4444' },
  { key: 'converted', label: 'تبدیل به مشتری', color: '#16A34A' },
  { key: 'lost', label: 'مشتری نشد', color: '#94A3B8' },
];

export const LEAD_SOURCES = [
  'گوگل',
  'هوش مصنوعی',
  'شبکه اجتماعی',
  'معرفی دیگران',
  'سایر',
];

export const LEAD_SERVICE_TYPES = [
  'طراحی سایت',
  'طراحی لوگو',
  'طراحی کاتالوگ',
  'طراحی کاتالوگ دیجیتال',
  'سئو',
  'تولید محتوا',
  'CRM',
  'برنامه نویسی',
  'برنامه نویسی اپلیکیشن',
  'کارت ویزیت',
  'لیبل',
];

export const VERIFICATION_CATEGORIES = [
  { key: 'general', label: 'عمومی' },
  { key: 'identity', label: 'احراز هویت' },
  { key: 'contract', label: 'قرارداد' },
  { key: 'payment', label: 'پرداخت' },
  { key: 'technical', label: 'فنی' },
  { key: 'other', label: 'سایر' },
];

export const VERIFICATION_STATUSES = [
  { key: 'pending', label: 'در انتظار بررسی', color: '#F59E0B' },
  { key: 'reviewed', label: 'بررسی شده', color: '#3B82F6' },
  { key: 'approved', label: 'تایید شده', color: '#22C55E' },
  { key: 'rejected', label: 'رد شده', color: '#EF4444' },
];

export const HOST_TYPES = [
  { key: 'host', label: 'هاست' },
  { key: 'domain', label: 'دامنه' },
  { key: 'host_domain', label: 'هاست و دامنه' },
];

export const PLAN_LABELS: Record<string, string> = {
  starter: 'استارتر',
  business: 'بیزینس',
  enterprise: 'سازمانی',
};

export function fullName(first?: string | null, last?: string | null, fallback = 'بدون نام'): string {
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  return fallback;
}

export function tomanShort(n: number): string {
  if (n >= 1000000000) return (n / 1000000000).toLocaleString('fa-IR', { maximumFractionDigits: 1 }) + ' میلیارد';
  if (n >= 1000000) return (n / 1000000).toLocaleString('fa-IR', { maximumFractionDigits: 1 }) + ' میلیون';
  if (n >= 1000) return (n / 1000).toLocaleString('fa-IR', { maximumFractionDigits: 0 }) + ' هزار';
  return Number(n).toLocaleString('fa-IR');
}

// ============ INSURANCE MODULE ============

export const INSURANCE_TYPES = [
  { key: 'third_party', label: 'شخص ثالث', category: 'vehicle' },
  { key: 'vehicle_body', label: 'بدنه خودرو', category: 'vehicle' },
  { key: 'life', label: 'عمر و زندگی', category: 'life' },
  { key: 'health', label: 'درمان تکمیلی', category: 'health' },
  { key: 'accident', label: 'حوادث', category: 'general' },
  { key: 'fire', label: 'آتش‌سوزی', category: 'property' },
  { key: 'liability', label: 'مسئولیت', category: 'liability' },
  { key: 'cargo', label: 'باربری', category: 'transport' },
  { key: 'engineering', label: 'مهندسی', category: 'engineering' },
  { key: 'travel', label: 'مسافرتی', category: 'travel' },
  { key: 'other', label: 'سایر', category: 'other' },
];

export const INSURANCE_PAYMENT_STATUSES = [
  { key: 'unpaid', label: 'پرداخت‌نشده', color: '#ef4444' },
  { key: 'partial', label: 'پرداخت جزئی', color: '#f59e0b' },
  { key: 'paid', label: 'پرداخت کامل', color: '#10b981' },
  { key: 'overdue', label: 'سررسید گذشته', color: '#dc2626' },
  { key: 'cancelled', label: 'لغوشده', color: '#64748b' },
];

export const INSURANCE_ISSUE_STATUSES = [
  { key: 'pending', label: 'در انتظار صدور', color: '#f59e0b' },
  { key: 'issued', label: 'صادرشده', color: '#10b981' },
  { key: 'voided', label: 'ابطال‌شده', color: '#ef4444' },
];

export const INSURANCE_QUOTE_STATUSES = [
  { key: 'new', label: 'جدید', color: '#3b82f6' },
  { key: 'in_review', label: 'در حال بررسی', color: '#f59e0b' },
  { key: 'awaiting_customer', label: 'در انتظار اطلاعات مشتری', color: '#8b5cf6' },
  { key: 'ready', label: 'پیشنهاد آماده', color: '#06b6d4' },
  { key: 'presented', label: 'ارائه‌شده به مشتری', color: '#0ea5e9' },
  { key: 'awaiting_decision', label: 'در انتظار تصمیم مشتری', color: '#f97316' },
  { key: 'converted', label: 'تبدیل‌شده به بیمه‌نامه', color: '#10b981' },
  { key: 'rejected', label: 'ردشده', color: '#ef4444' },
  { key: 'cancelled', label: 'لغوشده', color: '#64748b' },
];

export const INSURANCE_CLAIM_STATUSES = [
  { key: 'registered', label: 'ثبت اولیه', color: '#3b82f6' },
  { key: 'awaiting_docs', label: 'در انتظار مدارک', color: '#f59e0b' },
  { key: 'docs_complete', label: 'مدارک تکمیل‌شده', color: '#06b6d4' },
  { key: 'sent_to_company', label: 'ارسال‌شده به بیمه‌گر', color: '#0ea5e9' },
  { key: 'under_review', label: 'در حال بررسی', color: '#8b5cf6' },
  { key: 'needs_followup', label: 'نیازمند پیگیری', color: '#f97316' },
  { key: 'approved', label: 'تأییدشده', color: '#10b981' },
  { key: 'rejected', label: 'ردشده', color: '#ef4444' },
  { key: 'partial_paid', label: 'پرداخت جزئی', color: '#f59e0b' },
  { key: 'fully_paid', label: 'پرداخت کامل', color: '#10b981' },
  { key: 'closed', label: 'مختومه', color: '#64748b' },
];

export const INSURANCE_COMMISSION_STATUSES = [
  { key: 'predicted', label: 'پیش‌بینی‌شده', color: '#3b82f6' },
  { key: 'pending_confirm', label: 'در انتظار تأیید', color: '#f59e0b' },
  { key: 'confirmed', label: 'تأییدشده', color: '#10b981' },
  { key: 'partial_paid', label: 'پرداخت جزئی', color: '#06b6d4' },
  { key: 'settled', label: 'تسویه‌شده', color: '#22c55e' },
  { key: 'disputed', label: 'مورد اختلاف', color: '#ef4444' },
  { key: 'cancelled', label: 'لغوشده', color: '#64748b' },
];

export const INSURANCE_RENEWAL_STATUSES = [
  { key: 'pending', label: 'در انتظار', color: '#f59e0b' },
  { key: 'contacted', label: 'تماس گرفته شد', color: '#3b82f6' },
  { key: 'negotiating', label: 'در حال مذاکره', color: '#8b5cf6' },
  { key: 'renewed', label: 'تمدید شد', color: '#10b981' },
  { key: 'not_renewed', label: 'تمدید نشد', color: '#ef4444' },
  { key: 'cancelled', label: 'لغوشده', color: '#64748b' },
];

export const INSURANCE_PAYMENT_METHODS = [
  { key: 'cash', label: 'نقدی' },
  { key: 'card', label: 'کارت بانکی' },
  { key: 'transfer', label: 'انتقال بانکی' },
  { key: 'cheque', label: 'چک' },
  { key: 'online', label: 'آنلاین' },
  { key: 'installment', label: 'اقساطی' },
];

export const INSURANCE_CLAIM_TYPES = [
  { key: 'accident', label: 'تصادف' },
  { key: 'theft', label: 'سرقت' },
  { key: 'fire', label: 'آتش‌سوزی' },
  { key: 'damage', label: 'خسارت مالی' },
  { key: 'bodily_injury', label: 'جراحت بدنی' },
  { key: 'death', label: 'فوت' },
  { key: 'medical', label: 'هزینه درمان' },
  { key: 'property_damage', label: 'خسارت اموال' },
  { key: 'other', label: 'سایر' },
];
