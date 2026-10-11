'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchData } from '@/lib/data-client';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, ReceiptText, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { formatToman } from '@/lib/format';
import { toast } from 'sonner';
import type { TaxMoadiInvoice } from '@/lib/types';

export default function TaxMoadiReportsPage() {
  const [records, setRecords] = useState<TaxMoadiInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchData<TaxMoadiInvoice>('tax_moadi_invoices', {
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

  const stats = useMemo(() => {
    const nonVoided = records.filter((r) => r.internalStatus !== 'voided');
    return {
      total: records.length,
      accepted: records.filter((r) => r.internalStatus === 'accepted').length,
      rejected: records.filter((r) => r.internalStatus === 'rejected').length,
      pending: records.filter((r) => r.internalStatus === 'draft' || r.internalStatus === 'ready' || r.internalStatus === 'queued').length,
      totalTax: nonVoided.reduce((sum, r) => sum + Number(r.totalTax || 0), 0),
      totalDuty: nonVoided.reduce((sum, r) => sum + Number(r.totalDuty || 0), 0),
      totalValue: nonVoided.reduce((sum, r) => sum + Number(r.finalAmount || 0), 0),
      totalDiscount: nonVoided.reduce((sum, r) => sum + Number(r.totalDiscount || 0), 0),
    };
  }, [records]);

  const byType = useMemo(() => {
    const types: Record<string, number> = {};
    records.forEach((r) => {
      types[r.invoiceType] = (types[r.invoiceType] || 0) + 1;
    });
    return types;
  }, [records]);

  const byPattern = useMemo(() => {
    const patterns: Record<string, number> = {};
    records.forEach((r) => {
      patterns[r.invoicePattern] = (patterns[r.invoicePattern] || 0) + 1;
    });
    return patterns;
  }, [records]);

  return (
    <div className="w-full" dir="rtl">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
          <h1 className="text-[28px] font-bold text-[#101828]">گزارش‌های مالیاتی</h1>
        </div>
        <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> سامانه مؤدیان <span className="mx-1.5 text-[#CBD5E1]">←</span> گزارش‌ها</div>
      </header>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" /></div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
            <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-sm">
              <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#3155E7]/10 text-[#3155E7]"><ReceiptText className="h-5 w-5" /></span>
              <div><div className="text-[26px] font-bold text-[#101828]">{stats.total.toLocaleString('fa-IR')}</div><div className="mt-1 text-xs text-[#344054]">کل صورتحساب‌ها</div></div>
            </div>
            <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-sm">
              <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#10b981]/10 text-[#10b981]"><CheckCircle className="h-5 w-5" /></span>
              <div><div className="text-[26px] font-bold text-[#101828]">{stats.accepted.toLocaleString('fa-IR')}</div><div className="mt-1 text-xs text-[#344054]">پذیرفته شده</div></div>
            </div>
            <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-sm">
              <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#ef4444]/10 text-[#ef4444]"><AlertCircle className="h-5 w-5" /></span>
              <div><div className="text-[26px] font-bold text-[#101828]">{stats.rejected.toLocaleString('fa-IR')}</div><div className="mt-1 text-xs text-[#344054]">رد شده</div></div>
            </div>
            <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-sm">
              <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#f59e0b]/10 text-[#f59e0b]"><TrendingUp className="h-5 w-5" /></span>
              <div><div className="text-[20px] font-bold text-[#101828]">{stats.pending.toLocaleString('fa-IR')}</div><div className="mt-1 text-xs text-[#344054]">در انتظار</div></div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardContent className="p-5">
                <h2 className="mb-4 text-base font-bold text-[#1D2939]">خلاصه مالی</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-[#F1F5F9] pb-3"><span className="text-[#667085]">ارزش کل صورتحساب‌ها</span><span className="font-bold text-[#1D2939]">{formatToman(stats.totalValue)}</span></div>
                  <div className="flex justify-between border-b border-[#F1F5F9] pb-3"><span className="text-[#667085]">کل تخفیف</span><span className="font-bold text-rose-500">{formatToman(stats.totalDiscount)}</span></div>
                  <div className="flex justify-between border-b border-[#F1F5F9] pb-3"><span className="text-[#667085]">کل مالیات</span><span className="font-bold text-[#f59e0b]">{formatToman(stats.totalTax)}</span></div>
                  <div className="flex justify-between"><span className="text-[#667085]">کل عوارض</span><span className="font-bold text-[#f59e0b]">{formatToman(stats.totalDuty)}</span></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <h2 className="mb-4 text-base font-bold text-[#1D2939]">توزیع بر اساس نوع</h2>
                <div className="space-y-3 text-sm">
                  {Object.entries(byType).map(([type, count]) => (
                    <div key={type} className="flex justify-between"><span className="text-[#667085]">{type}</span><span className="font-bold text-[#1D2939]">{count.toLocaleString('fa-IR')}</span></div>
                  ))}
                  {Object.keys(byType).length === 0 && <p className="text-center text-[#667085]">داده‌ای موجود نیست</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <h2 className="mb-4 text-base font-bold text-[#1D2939]">توزیع بر اساس الگو</h2>
                <div className="space-y-3 text-sm">
                  {Object.entries(byPattern).map(([pattern, count]) => (
                    <div key={pattern} className="flex justify-between"><span className="text-[#667085]">{pattern}</span><span className="font-bold text-[#1D2939]">{count.toLocaleString('fa-IR')}</span></div>
                  ))}
                  {Object.keys(byPattern).length === 0 && <p className="text-center text-[#667085]">داده‌ای موجود نیست</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
