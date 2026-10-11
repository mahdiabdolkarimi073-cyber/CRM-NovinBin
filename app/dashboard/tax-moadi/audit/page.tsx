'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData } from '@/lib/data-client';
import { Card, CardContent } from '@/components/ui/card';
import { History, Eye } from 'lucide-react';
import { formatJalali, relativeTime } from '@/lib/format';
import { toast } from 'sonner';
import type { TaxMoadiAuditLog } from '@/lib/types';

const ACTION_LABEL: Record<string, string> = {
  create: 'ایجاد', update: 'ویرایش', send: 'ارسال', retry: 'تلاش مجدد',
  accept: 'پذیرش', reject: 'رد', void: 'ابطال', return: 'برگشت',
  correct: 'اصلاح', settings_change: 'تغییر تنظیمات', credentials_change: 'تغییر اعتبارنامه',
};

const ENTITY_LABEL: Record<string, string> = {
  invoice: 'صورتحساب', setting: 'تنظیمات', fiscal_memory: 'حافظه مالیاتی',
};

export default function TaxMoadiAuditPage() {
  const [records, setRecords] = useState<TaxMoadiAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchData<TaxMoadiAuditLog>('tax_moadi_audit_logs', {
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      setRecords(data || []);
    } catch (error: any) {
      toast.error('بارگذاری ناموفق: ' + error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="w-full" dir="rtl">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
          <h1 className="text-[28px] font-bold text-[#101828]">سوابق عملیات و حسابرسی</h1>
        </div>
        <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> سامانه مؤدیان <span className="mx-1.5 text-[#CBD5E1]">←</span> حسابرسی</div>
      </header>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" /></div>
      ) : records.length === 0 ? (
        <Card><CardContent className="p-0">
          <div className="flex flex-col items-center justify-center py-16">
            <History className="h-10 w-10 text-[#CBD5E1]" />
            <p className="mt-3 text-sm font-medium text-[#667085]">سابقه‌ای ثبت نشده است</p>
          </div>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="divide-y divide-[#F1F5F9]">
            {records.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3155E7]/10 text-[#3155E7]">
                  <History className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#1D2939]">{ACTION_LABEL[r.action] || r.action}</span>
                    <span className="rounded bg-[#F1F5F9] px-2 py-0.5 text-xs text-[#667085]">{ENTITY_LABEL[r.entity] || r.entity}</span>
                  </div>
                  <div className="mt-1 text-xs text-[#667085]">{formatJalali(r.createdAt)} - {relativeTime(r.createdAt)}</div>
                </div>
                {r.entityId && (
                  <Eye className="h-5 w-5 cursor-pointer text-[#98A2B3]" onClick={() => window.location.href = `/dashboard/tax-moadi/${r.entityId}`} />
                )}
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}
