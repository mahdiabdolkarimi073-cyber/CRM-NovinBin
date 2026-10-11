'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ReceiptText, Plus, Search, Eye, Send, CheckCircle, Clock,
  AlertCircle, FileText, TrendingUp, Settings2, ListChecks, History,
} from 'lucide-react';
import { formatJalali, formatToman, relativeTime } from '@/lib/format';
import { toast } from 'sonner';
import type { TaxMoadiInvoice, TaxMoadiSetting } from '@/lib/types';

const TM_STATUS: Record<string, string> = {
  draft: 'پیش‌نویس',
  ready: 'آماده ارسال',
  queued: 'در صف ارسال',
  sent: 'ارسال شده',
  accepted: 'پذیرفته شده',
  rejected: 'رد شده',
  needs_correction: 'نیازمند اصلاح',
  voided: 'باطل شده',
  returned: 'برگشت خورده',
  amended: 'اصلاحی',
};

const TM_STATUS_COLOR: Record<string, string> = {
  draft: '#94a3b8',
  ready: '#f59e0b',
  queued: '#a855f7',
  sent: '#3155E7',
  accepted: '#10b981',
  rejected: '#ef4444',
  needs_correction: '#f97316',
  voided: '#dc2626',
  returned: '#0ea5e9',
  amended: '#8b5cf6',
};

const INVOICE_TYPE: Record<string, string> = {
  type1: 'نوع یک (اقلام همراه با قیمت)',
  type2: 'نوع دو (اقلام بدون قیمت)',
  type3: 'نوع سه (صورتحساب جمعی)',
  special: 'نوع خاص',
};

const INVOICE_PATTERN: Record<string, string> = {
  general: 'عمومی',
  gold: 'طلایی',
  contractor: 'پیمانکاری',
  utility: 'آب و برق و گاز',
  ticket: 'بلیت',
  export: 'صادراتی',
};

export default function TaxMoadiDashboardPage() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<TaxMoadiInvoice[]>([]);
  const [settings, setSettings] = useState<TaxMoadiSetting | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invData, settingData] = await Promise.all([
        fetchData<TaxMoadiInvoice>('tax_moadi_invoices', {
          orderBy: { createdAt: 'desc' },
          include: { items: true, sendLogs: { orderBy: { sentAt: 'desc' }, take: 1 } },
        }),
        fetchData<TaxMoadiSetting>('tax_moadi_settings', { where: {} }),
      ]);
      setRecords(invData || []);
      setSettings(settingData?.[0] || null);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    return records.filter((r) => {
      const matches = !q || r.internalNumber?.toLocaleLowerCase().includes(q) || r.taxInvoiceNumber?.toLocaleLowerCase().includes(q) || r.customerName?.toLocaleLowerCase().includes(q);
      const st = filterStatus === 'all' || r.internalStatus === filterStatus;
      return matches && st;
    });
  }, [records, search, filterStatus]);

  const stats = useMemo(() => ({
    total: records.length,
    draft: records.filter((r) => r.internalStatus === 'draft').length,
    sent: records.filter((r) => r.internalStatus === 'sent' || r.internalStatus === 'queued').length,
    accepted: records.filter((r) => r.internalStatus === 'accepted').length,
    errors: records.filter((r) => r.internalStatus === 'rejected' || r.internalStatus === 'needs_correction').length,
    totalValue: records.filter((r) => r.internalStatus !== 'voided').reduce((sum, r) => sum + Number(r.finalAmount || 0), 0),
  }), [records]);

  return (
    <div className="w-full" dir="rtl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">سامانه مؤدیان</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> مالی <span className="mx-1.5 text-[#CBD5E1]">←</span> سامانه مؤدیان</div>
        </div>
        <Link href="/dashboard/tax-moadi/new">
          <Button className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
            <Plus className="h-4 w-4" /> صدور صورتحساب
          </Button>
        </Link>
      </header>

      {!settings && (
        <div className="mb-5 rounded-[14px] border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-800">تنظیمات مؤدی پیکربندی نشده است</p>
              <p className="text-xs text-amber-700 mt-1">برای ارسال صورتحساب به سامانه مؤدیان، ابتدا تنظیمات مؤدی و حافظه مالیاتی را پیکربندی کنید.</p>
            </div>
            <Link href="/dashboard/tax-moadi/settings" className="mr-auto">
              <Button variant="outline" className="h-[36px] rounded-[8px] border-amber-300 text-amber-700 hover:bg-amber-100">
                <Settings2 className="h-4 w-4" /> تنظیمات
              </Button>
            </Link>
          </div>
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#3155E7]/10 text-[#3155E7]"><ReceiptText className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.total.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">کل صورتحساب‌ها</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#f59e0b]/10 text-[#f59e0b]"><Clock className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.draft.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">پیش‌نویس</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#10b981]/10 text-[#10b981]"><CheckCircle className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.accepted.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">پذیرفته شده</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#ef4444]/10 text-[#ef4444]"><AlertCircle className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.errors.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">خطاها</div></div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#98A2B3]" />
          <input
            placeholder="جستجو بر اساس شماره یا مشتری..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white pr-9 text-sm outline-none focus:border-[#3155E7] sm:w-[320px]"
          />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-[42px] rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
          <option value="all">همه وضعیت‌ها</option>
          {Object.entries(TM_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" /></div>
      ) : records.length === 0 ? (
        <Card><CardContent className="p-0">
          <EmptyState
            icon={<ReceiptText className="h-8 w-8" />}
            title="صورتحسابی یافت نشد"
            description="برای شروع، اولین صورتحساب الکترونیکی خود را صادر کنید"
            action={<Link href="/dashboard/tax-moadi/new"><Button><Plus className="h-4 w-4" /> صدور صورتحساب</Button></Link>}
          />
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="divide-y divide-[#F1F5F9]">
            {filtered.map((r) => {
              const stColor = TM_STATUS_COLOR[r.internalStatus] || '#64748b';
              return (
                <div key={r.id} className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-[#F8FAFD]" onClick={() => window.location.href = `/dashboard/tax-moadi/${r.id}`}>
                  <div className="h-10 w-2 rounded-full" style={{ backgroundColor: stColor }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#1D2939]">{r.internalNumber}</span>
                      {r.taxInvoiceNumber && <span className="text-xs text-[#667085]">| {r.taxInvoiceNumber}</span>}
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: stColor + '20', color: stColor }}>
                        {TM_STATUS[r.internalStatus] || r.internalStatus}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-[#667085]">
                      <span>{r.customerName || '—'}</span>
                      <span>{INVOICE_TYPE[r.invoiceType] || r.invoiceType}</span>
                      <span>{formatJalali(r.invoiceDate)}</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-[#1D2939]">{formatToman(Number(r.finalAmount || 0))}</div>
                    <div className="text-[11px] text-[#98A2B3]">{r.items?.length || 0} قلم</div>
                  </div>
                  <Eye className="h-5 w-5 text-[#98A2B3]" />
                </div>
              );
            })}
          </div>
        </CardContent></Card>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Link href="/dashboard/tax-moadi/queue" className="rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)] transition-all hover:shadow-md">
          <ListChecks className="h-6 w-6 text-[#3155E7]" />
          <h3 className="mt-3 text-sm font-bold text-[#1D2939]">صف ارسال و خطاها</h3>
          <p className="mt-1 text-xs text-[#98A2B3]">مدیریت ارسال‌های ناموفق</p>
        </Link>
        <Link href="/dashboard/tax-moadi/corrections" className="rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)] transition-all hover:shadow-md">
          <FileText className="h-6 w-6 text-[#f59e0b]" />
          <h3 className="mt-3 text-sm font-bold text-[#1D2939]">اصلاحیه و ابطال</h3>
          <p className="mt-1 text-xs text-[#98A2B3]">اصلاحیه و برگشت از فروش</p>
        </Link>
        <Link href="/dashboard/tax-moadi/reports" className="rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)] transition-all hover:shadow-md">
          <TrendingUp className="h-6 w-6 text-[#10b981]" />
          <h3 className="mt-3 text-sm font-bold text-[#1D2939]">گزارش‌های مالیاتی</h3>
          <p className="mt-1 text-xs text-[#98A2B3]">آمار و گزارش‌ها</p>
        </Link>
        <Link href="/dashboard/tax-moadi/settings" className="rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)] transition-all hover:shadow-md">
          <Settings2 className="h-6 w-6 text-[#6366f1]" />
          <h3 className="mt-3 text-sm font-bold text-[#1D2939]">تنظیمات و حافظه</h3>
          <p className="mt-1 text-xs text-[#98A2B3]">پیکربندی اتصال</p>
        </Link>
      </div>
    </div>
  );
}
