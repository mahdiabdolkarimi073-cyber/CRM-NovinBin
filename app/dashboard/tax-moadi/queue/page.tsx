'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchData } from '@/lib/data-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ListChecks, Send, RotateCcw, AlertCircle, Eye } from 'lucide-react';
import { formatJalali, relativeTime } from '@/lib/format';
import { toast } from 'sonner';
import type { TaxMoadiInvoice, TaxMoadiSendLog } from '@/lib/types';

const TM_STATUS: Record<string, string> = {
  queued: 'در صف ارسال', sent: 'ارسال شده', rejected: 'رد شده',
  needs_correction: 'نیازمند اصلاح', draft: 'پیش‌نویس', ready: 'آماده ارسال',
  accepted: 'پذیرفته شده', voided: 'باطل شده', returned: 'برگشت خورده', amended: 'اصلاحی',
};

const ERROR_TYPE: Record<string, string> = {
  validation: 'اعتبارسنجی', connection: 'اتصال', server: 'سرور',
  auth: 'احراز هویت', rate_limit: 'محدودیت نرخ', unknown: 'نامشخص',
};

export default function TaxMoadiQueuePage() {
  const [records, setRecords] = useState<TaxMoadiInvoice[]>([]);
  const [logs, setLogs] = useState<TaxMoadiSendLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invData, logData] = await Promise.all([
        fetchData<TaxMoadiInvoice>('tax_moadi_invoices', {
          where: { internalStatus: { in: ['queued', 'sent', 'rejected', 'needs_correction'] } },
          orderBy: { sendQueuedAt: 'desc' },
          include: { items: true },
        }),
        fetchData<TaxMoadiSendLog>('tax_moadi_send_logs', {
          orderBy: { sentAt: 'desc' },
          take: 50,
        }),
      ]);
      setRecords(invData || []);
      setLogs(logData || []);
    } catch (error: any) {
      toast.error('بارگذاری ناموفق: ' + error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRetry = async (invoiceId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/tax-moadi/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا');
      toast.success('صورتحساب دوباره به صف اضافه شد');
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const stats = useMemo(() => ({
    queued: records.filter((r) => r.internalStatus === 'queued').length,
    failed: records.filter((r) => r.internalStatus === 'rejected' || r.internalStatus === 'needs_correction').length,
    sent: records.filter((r) => r.internalStatus === 'sent').length,
  }), [records]);

  return (
    <div className="w-full" dir="rtl">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
          <h1 className="text-[28px] font-bold text-[#101828]">صف ارسال و خطاها</h1>
        </div>
        <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> سامانه مؤدیان <span className="mx-1.5 text-[#CBD5E1]">←</span> صف ارسال</div>
      </header>

      <div className="mb-5 grid grid-cols-3 gap-4">
        <div className="flex min-h-[100px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-4 shadow-sm">
          <ListChecks className="h-6 w-6 text-[#a855f7]" />
          <div><div className="text-[22px] font-bold text-[#101828]">{stats.queued.toLocaleString('fa-IR')}</div><div className="text-xs text-[#344054]">در صف</div></div>
        </div>
        <div className="flex min-h-[100px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-4 shadow-sm">
          <Send className="h-6 w-6 text-[#3155E7]" />
          <div><div className="text-[22px] font-bold text-[#101828]">{stats.sent.toLocaleString('fa-IR')}</div><div className="text-xs text-[#344054]">ارسال شده</div></div>
        </div>
        <div className="flex min-h-[100px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-4 shadow-sm">
          <AlertCircle className="h-6 w-6 text-[#ef4444]" />
          <div><div className="text-[22px] font-bold text-[#101828]">{stats.failed.toLocaleString('fa-IR')}</div><div className="text-xs text-[#344054]">خطا</div></div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-4 text-base font-bold text-[#1D2939]">صورتحساب‌های در صف و خطا</h2>
            {loading ? (
              <div className="flex h-32 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" /></div>
            ) : records.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#667085]">موردی در صف وجود ندارد</p>
            ) : (
              <div className="space-y-3">
                {records.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-[8px] border border-[#E7ECF3] p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#1D2939]">{r.internalNumber}</span>
                        <span className="text-xs text-[#667085]">{TM_STATUS[r.internalStatus] || r.internalStatus}</span>
                      </div>
                      <div className="mt-1 text-xs text-[#667085]">{r.customerName || '—'} | {formatJalali(r.invoiceDate)}</div>
                      {r.lastError && <div className="mt-1 text-xs text-rose-600">{r.lastError}</div>}
                    </div>
                    {(r.internalStatus === 'rejected' || r.internalStatus === 'needs_correction') && (
                      <Button size="sm" variant="outline" onClick={() => handleRetry(r.id)} disabled={actionLoading} className="h-[32px] rounded-[6px]">
                        <RotateCcw className="h-3.5 w-3.5" /> تلاش مجدد
                      </Button>
                    )}
                    <Eye className="h-5 w-5 cursor-pointer text-[#98A2B3]" onClick={() => window.location.href = `/dashboard/tax-moadi/${r.id}`} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="mb-4 text-base font-bold text-[#1D2939]">لاگ‌های ارسال اخیر</h2>
            {logs.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#667085]">لاگ ارسالی وجود ندارد</p>
            ) : (
              <div className="space-y-3">
                {logs.slice(0, 20).map((log) => (
                  <div key={log.id} className="flex items-center gap-3 rounded-[8px] border border-[#E7ECF3] p-3">
                    {log.responseOk ? <Send className="h-5 w-5 text-[#10b981]" /> : <AlertCircle className="h-5 w-5 text-[#ef4444]" />}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-[#1D2939]">تلاش {log.attemptNumber.toLocaleString('fa-IR')}</div>
                      <div className="text-xs text-[#667085]">{relativeTime(log.sentAt)}</div>
                      {log.errorMessage && <div className="mt-1 text-xs text-rose-600">{log.errorMessage}</div>}
                    </div>
                    {log.errorType && <span className="rounded bg-rose-50 px-2 py-0.5 text-xs text-rose-600">{ERROR_TYPE[log.errorType] || log.errorType}</span>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
