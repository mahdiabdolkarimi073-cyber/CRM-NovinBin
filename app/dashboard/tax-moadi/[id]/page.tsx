'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchData } from '@/lib/data-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, ReceiptText, Send, AlertCircle, CheckCircle,
  Ban, History,
} from 'lucide-react';
import { formatJalali, formatToman, relativeTime } from '@/lib/format';
import { toast } from 'sonner';
import type { TaxMoadiInvoice, TaxMoadiInvoiceItem, TaxMoadiSendLog } from '@/lib/types';

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

export default function TaxMoadiInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<TaxMoadiInvoice | null>(null);
  const [items, setItems] = useState<TaxMoadiInvoiceItem[]>([]);
  const [sendLogs, setSendLogs] = useState<TaxMoadiSendLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchData<TaxMoadiInvoice>('tax_moadi_invoices', {
        where: { id },
        include: { items: true, sendLogs: { orderBy: { sentAt: 'desc' } } },
      });
      if (data?.[0]) {
        setInvoice(data[0]);
        setItems(data[0].items || []);
        setSendLogs(data[0].sendLogs || []);
      }
    } catch (error: any) {
      toast.error('بارگذاری ناموفق: ' + error.message);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleQueue = async () => {
    if (!invoice) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/tax-moadi/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا');
      toast.success('صورتحساب به صف ارسال اضافه شد');
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVoid = async () => {
    if (!invoice) return;
    if (!confirm('آیا از ابطال این صورتحساب اطمینان دارید؟')) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/tax-moadi/void', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا');
      toast.success('صورتحساب باطل شد');
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" /></div>;
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-20" dir="rtl">
        <ReceiptText className="h-12 w-12 text-[#CBD5E1]" />
        <p className="mt-4 text-sm text-[#667085]">صورتحساب یافت نشد</p>
        <Link href="/dashboard/tax-moadi" className="mt-4"><Button variant="outline">بازگشت به فهرست</Button></Link>
      </div>
    );
  }

  const stColor = TM_STATUS_COLOR[invoice.internalStatus] || '#64748b';

  return (
    <div className="w-full" dir="rtl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">جزئیات صورتحساب</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> سامانه مؤدیان <span className="mx-1.5 text-[#CBD5E1]">←</span> {invoice.internalNumber}</div>
        </div>
        <Link href="/dashboard/tax-moadi">
          <Button variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-white text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#FAFBFF]">
            <ArrowRight className="h-4 w-4" /> بازگشت
          </Button>
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-[#1D2939]">اطلاعات صورتحساب</h2>
                <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: stColor + '20', color: stColor }}>
                  {TM_STATUS[invoice.internalStatus] || invoice.internalStatus}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-[#98A2B3]">شماره داخلی: </span><span className="font-semibold text-[#1D2939]">{invoice.internalNumber}</span></div>
                <div><span className="text-[#98A2B3]">شماره مالیاتی: </span><span className="font-semibold text-[#1D2939]">{invoice.taxInvoiceNumber || '—'}</span></div>
                <div><span className="text-[#98A2B3]">تاریخ: </span><span className="font-semibold text-[#1D2939]">{formatJalali(invoice.invoiceDate)}</span></div>
                <div><span className="text-[#98A2B3]">نوع: </span><span className="font-semibold text-[#1D2939]">{invoice.invoiceType}</span></div>
                <div><span className="text-[#98A2B3]">مشتری: </span><span className="font-semibold text-[#1D2939]">{invoice.customerName || '—'}</span></div>
                <div><span className="text-[#98A2B3]">نوع فروش: </span><span className="font-semibold text-[#1D2939]">{invoice.saleType}</span></div>
                {invoice.subject && <div className="col-span-2"><span className="text-[#98A2B3]">موضوع: </span><span className="font-semibold text-[#1D2939]">{invoice.subject}</span></div>}
                {invoice.lastError && <div className="col-span-2 rounded-[8px] bg-rose-50 p-3"><span className="text-xs font-semibold text-rose-700">خطای آخرین ارسال: </span><span className="text-xs text-rose-600">{invoice.lastError}</span></div>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="mb-4 text-base font-bold text-[#1D2939]">اقلام صورتحساب</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E7ECF3] text-xs text-[#98A2B3]">
                      <th className="py-2 pr-2 text-right">ردیف</th>
                      <th className="py-2 text-right">نام قلم</th>
                      <th className="py-2 text-right">تعداد</th>
                      <th className="py-2 text-right">قیمت واحد</th>
                      <th className="py-2 text-right">تخفیف</th>
                      <th className="py-2 text-right">مالیات</th>
                      <th className="py-2 text-left">مبلغ کل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={item.id} className="border-b border-[#F1F5F9]">
                        <td className="py-3 pr-2 text-[#667085]">{(i + 1).toLocaleString('fa-IR')}</td>
                        <td className="py-3 font-semibold text-[#1D2939]">{item.productName || '—'}</td>
                        <td className="py-3 text-[#667085]">{Number(item.qty).toLocaleString('fa-IR')}</td>
                        <td className="py-3 text-[#667085]">{formatToman(Number(item.unitPrice))}</td>
                        <td className="py-3 text-rose-500">{formatToman(Number(item.rowDiscount))}</td>
                        <td className="py-3 text-[#f59e0b]">{formatToman(Number(item.taxAmount))}</td>
                        <td className="py-3 text-left font-bold text-[#1D2939]">{formatToman(Number(item.rowTotal))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {sendLogs.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-[#1D2939]"><History className="h-5 w-5 text-[#98A2B3]" /> تاریخچه ارسال</h2>
                <div className="space-y-3">
                  {sendLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 rounded-[8px] border border-[#E7ECF3] p-3">
                      {log.responseOk ? <CheckCircle className="h-5 w-5 text-[#10b981]" /> : <AlertCircle className="h-5 w-5 text-[#ef4444]" />}
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-[#1D2939]">تلاش {log.attemptNumber.toLocaleString('fa-IR')}</div>
                        <div className="text-xs text-[#667085]">{formatJalali(log.sentAt)} - {log.errorMessage || 'موفق'}</div>
                      </div>
                      {log.errorCode && <span className="rounded bg-rose-50 px-2 py-0.5 text-xs text-rose-600">{log.errorCode}</span>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-4 text-base font-bold text-[#1D2939]">خلاصه مبالغ</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-[#667085]">مبلغ کل</span><span className="font-bold text-[#1D2939]">{formatToman(Number(invoice.subtotal))}</span></div>
                <div className="flex justify-between"><span className="text-[#667085]">تخفیف</span><span className="font-bold text-rose-500">{formatToman(Number(invoice.totalDiscount))}</span></div>
                <div className="flex justify-between"><span className="text-[#667085]">مشمول مالیات</span><span className="font-bold text-[#1D2939]">{formatToman(Number(invoice.taxableAmount))}</span></div>
                <div className="flex justify-between"><span className="text-[#667085]">مالیات</span><span className="font-bold text-[#f59e0b]">{formatToman(Number(invoice.totalTax))}</span></div>
                <div className="flex justify-between"><span className="text-[#667085]">عوارض</span><span className="font-bold text-[#f59e0b]">{formatToman(Number(invoice.totalDuty))}</span></div>
                <div className="border-t border-[#E7ECF3] pt-3 flex justify-between"><span className="font-bold text-[#344054]">مبلغ نهایی</span><span className="text-lg font-bold text-[#3155E7]">{formatToman(Number(invoice.finalAmount))}</span></div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {(invoice.internalStatus === 'draft' || invoice.internalStatus === 'needs_correction') && (
              <Button onClick={handleQueue} disabled={actionLoading} className="h-[42px] w-full rounded-[10px] bg-[#3155E7] text-sm font-semibold text-white hover:bg-[#2445C7]">
                <Send className="h-4 w-4" /> ارسال به صف
              </Button>
            )}
            {invoice.internalStatus !== 'voided' && invoice.internalStatus !== 'accepted' && (
              <Button onClick={handleVoid} disabled={actionLoading} variant="outline" className="h-[42px] w-full rounded-[10px] border-rose-300 text-rose-600 hover:bg-rose-50">
                <Ban className="h-4 w-4" /> ابطال صورتحساب
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
