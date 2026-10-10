'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData } from '@/lib/data-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Eye, FileText, Send } from 'lucide-react';
import { formatJalali, formatToman } from '@/lib/format';
import { toast } from 'sonner';
import type { TaxMoadiInvoice } from '@/lib/types';

const TM_STATUS: Record<string, string> = {
  draft: 'پیش‌نویس', ready: 'آماده ارسال', queued: 'در صف ارسال',
  sent: 'ارسال شده', accepted: 'پذیرفته شده', rejected: 'رد شده',
  needs_correction: 'نیازمند اصلاح', voided: 'باطل شده', returned: 'برگشت خورده', amended: 'اصلاحی',
};

const TM_STATUS_COLOR: Record<string, string> = {
  draft: '#94a3b8', ready: '#f59e0b', queued: '#a855f7', sent: '#3155E7',
  accepted: '#10b981', rejected: '#ef4444', needs_correction: '#f97316',
  voided: '#dc2626', returned: '#0ea5e9', amended: '#8b5cf6',
};

export default function TaxMoadiSalesInvoicesPage() {
  const [records, setRecords] = useState<TaxMoadiInvoice[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchData<TaxMoadiInvoice>('tax_moadi_invoices', {
        where: { referenceType: null },
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      });
      setRecords(data || []);
    } catch (error: any) {
      toast.error('بارگذاری ناموفق: ' + error.message);
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

  return (
    <div className="w-full" dir="rtl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">صورتحساب‌های فروش</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> سامانه مؤدیان <span className="mx-1.5 text-[#CBD5E1]">←</span> صورتحساب‌های فروش</div>
        </div>
        <Link href="/dashboard/tax-moadi/new">
          <Button className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
            <FileText className="h-4 w-4" /> صدور صورتحساب
          </Button>
        </Link>
      </header>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#98A2B3]" />
          <input
            placeholder="جستجو..."
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
          <div className="flex flex-col items-center justify-center py-16">
            <FileText className="h-10 w-10 text-[#CBD5E1]" />
            <p className="mt-3 text-sm font-medium text-[#667085]">صورتحساب فروشی یافت نشد</p>
            <Link href="/dashboard/tax-moadi/new" className="mt-4"><Button><FileText className="h-4 w-4" /> صدور صورتحساب</Button></Link>
          </div>
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
                      <span>{formatJalali(r.invoiceDate)}</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-[#1D2939]">{formatToman(Number(r.finalAmount || 0))}</div>
                  </div>
                  <Eye className="h-5 w-5 text-[#98A2B3]" />
                </div>
              );
            })}
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}
