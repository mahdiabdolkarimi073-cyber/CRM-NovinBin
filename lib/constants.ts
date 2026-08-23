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
  { key: 'new', label: 'جدید', color: '#64748b' },
  { key: 'in_progress', label: 'در حال انجام', color: '#3b82f6' },
  { key: 'review', label: 'بررسی', color: '#f59e0b' },
  { key: 'completed', label: 'تکمیل شده', color: '#10b981' },
  { key: 'cancelled', label: 'لغو شده', color: '#ef4444' },
];

export const TASK_PRIORITIES = [
  { key: 'low', label: 'کم', color: '#64748b' },
  { key: 'medium', label: 'متوسط', color: '#3b82f6' },
  { key: 'high', label: 'زیاد', color: '#f59e0b' },
  { key: 'critical', label: 'بحرانی', color: '#ef4444' },
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
  { key: 'bronze', label: 'برنزی', color: '#b45309' },
  { key: 'silver', label: 'نقره‌ای', color: '#64748b' },
  { key: 'gold', label: 'طلایی', color: '#f59e0b' },
  { key: 'vip', label: 'ویژه', color: '#8b5cf6' },
];

export const TICKET_STATUSES = [
  { key: 'open', label: 'باز', color: '#3b82f6' },
  { key: 'in_progress', label: 'در حال انجام', color: '#f59e0b' },
  { key: 'resolved', label: 'حل شده', color: '#10b981' },
  { key: 'closed', label: 'بسته شده', color: '#64748b' },
];

export const LEAD_STATUSES = [
  { key: 'new', label: 'جدید', color: '#1F2937' },
  { key: 'contacted', label: 'تماس شده', color: '#F59E0B' },
  { key: 'qualified', label: 'تایید شده', color: '#2563EB' },
  { key: 'converted', label: 'تبدیل به مشتری', color: '#16A34A' },
  { key: 'lost', label: 'از دست رفته', color: '#EF4444' },
];

export const LEAD_SOURCES = [
  'گوگل',
  'هوش مصنوعی',
  'شبکه اجتماعی',
  'معرفی دیگران',
  'سایر',
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
