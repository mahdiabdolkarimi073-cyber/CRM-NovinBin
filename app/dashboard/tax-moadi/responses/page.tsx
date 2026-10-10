'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchData } from '@/lib/data-client';
import { Card, CardContent } from '@/components/ui/card';
import { FileCheck2, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { formatJalali, relativeTime } from '@/lib/format';
import { toast } from 'sonner';
import type { TaxMoadiInvoice } from '@/lib/types';

const TAX_STATUS: Record<string, string> = {
  accepted: 'پذیرفته شده', rejected: 'رد شده', pending: 'در انتظار',
  processing: 'در حال پردازش', voided: 'باطل شده', returned: 'برگشت خورده',
};

export default function TaxMoadiResponsesPage() {
  const [records, setRecords] = useState<TaxMoadiInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchData<TaxMoadiInvoice>('tax_moadi_invoices', {
        where: { taxStatus: { not: null } },
        orderBy: { lastCheckedAt: 'desc' },
        include: { sendLogs: { orderBy: { sentAt: 'desc' }, take: 1 } },
      });
      setRecords(data || []);
    } catch (error: any) {
      toast.error('بارگذاری ناموفق: ' + error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const stats = useMemo(() => ({
    accepted: records.filter((r) => r.taxStatus === 'accepted').length,
    rejected: records.filter((r) => r.taxStatus === 'rejected').length,
    pending: records.filter((r) => r.taxStatus === 'pending' || r.taxStatus === 'processing').length,
  }), [records]);

  return (
    <div className="w-full" dir="rtl">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
          <h1 className="text-[28px] font-bold text-[#101828]">وضعیت پاسخ‌های مالیاتی</h1>
        </div>
        <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> سامانه مؤدیان <span className="mx-1.5 text-[#CBD5E1]">←</span> پاسخ‌ها</div>
      </header>

      <div className="mb-5 grid grid-cols-3 gap-4">
        <div className="flex min-h-[100px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-4 shadow-sm">
          <CheckCircle className="h-6 w-6 text-[#10b981]" />
          <div><div className="text-[22px] font-bold text-[#101828]">{stats.accepted.toLocaleString('fa-IR')}</div><div className="text-xs text-[#344054]">پذیرفته شده</div></div>
        </div>
        <div className="flex min-h-[100px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-4 shadow-sm">
          <AlertCircle className="h-6 w-6 text-[#ef4444]" />
          <div><div className="text-[22px] font-bold text-[#101828]">{stats.rejected.toLocaleString('fa-IR')}</div><div className="text-xs text-[#344054]">رد شده</div></div>
        </div>
        <div className="flex min-h-[100px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-4 shadow-sm">
          <FileCheck2 className="h-6 w-6 text-[#f59e0b]" />
          <div><div className="text-[22px] font-bold text-[#101828]">{stats.pending.toLocaleString('fa-IR')}</div><div className="text-xs text-[#344054]">در انتظار</div></div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" /></div>
      ) : records.length === 0 ? (
        <Card><CardContent className="p-0">
          <div className="flex flex-col items-center justify-center py-16">
            <FileCheck2 className="h-10 w-10 text-[#CBD5E1]" />
            <p className="mt-3 text-sm font-medium text-[#667085]">پاسخ مالیاتی ثبت نشده است</p>
          </div>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="divide-y divide-[#F1F5F9]">
            {records.map((r) => {
              const isAccepted = r.taxStatus === 'accepted';
              return (
                <div key={r.id} className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-[#F8FAFD]" onClick={() => window.location.href = `/dashboard/tax-moadi/${r.id}`}>
                  {isAccepted ? <CheckCircle className="h-6 w-6 text-[#10b981]" /> : <AlertCircle className="h-6 w-6 text-[#ef4444]" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#1D2939]">{r.internalNumber}</span>
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: isAccepted ? '#10b98120' : '#ef444420', color: isAccepted ? '#10b981' : '#ef4444' }}>
                        {TAX_STATUS[r.taxStatus || ''] || r.taxStatus}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-[#667085]">
                      <span>{r.customerName || '—'}</span>
                      <span>مرجع: {r.taxReferenceId || '—'}</span>
                      {r.lastCheckedAt && <span>بررسی: {relativeTime(r.lastCheckedAt)}</span>}
                    </div>
                    {r.lastError && <div className="mt-1 text-xs text-rose-600">{r.lastError}</div>}
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
