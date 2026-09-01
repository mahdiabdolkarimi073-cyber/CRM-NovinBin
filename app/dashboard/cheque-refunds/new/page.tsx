'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData, fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import {
  ArrowRight, RotateCcw, Calendar, Loader2, Plus,
  Lightbulb, Info, Hash, User, AlertCircle, CheckSquare,
  Building2, Banknote, WalletCards, ShieldCheck,
} from 'lucide-react';
import { toLocalDateString, formatToman, formatJalali } from '@/lib/format';
import { toast } from 'sonner';
import type {
  ReceivedCheque, ContactParty,
} from '@/lib/types';

const CHEQUE_STATUS: Record<string, string> = {
  received: 'دریافت‌شده',
  in_custody: 'نزد صندوق',
  pending_due: 'در انتظار سررسید',
  deposited: 'واگذار‌شده به بانک',
  cleared: 'وصول‌شده',
  returned: 'برگشتی',
  refunded: 'استردادشده',
  voided: 'باطل‌شده',
  transferred: 'منتقل‌شده',
};

const CHEQUE_STATUS_COLOR: Record<string, string> = {
  received: '#3b82f6',
  in_custody: '#6366f1',
  pending_due: '#f59e0b',
  deposited: '#8b5cf6',
  cleared: '#10b981',
  returned: '#ef4444',
  refunded: '#f97316',
  voided: '#64748b',
  transferred: '#0ea5e9',
};

// Only cheques in these statuses can be refunded
const REFUNDABLE_STATUSES = ['received', 'in_custody', 'pending_due', 'deposited', 'returned'];

const guideItems = [
  { icon: CheckSquare, title: 'انتخاب چک قابل استرداد', desc: 'فقط چک‌هایی که در وضعیت دریافت‌شده، نزد صندوق، در انتظار سررسید، واگذار‌شده یا برگشتی هستند قابل استرداد می‌باشند.' },
  { icon: User, title: 'طرف دریافت‌کننده', desc: 'شخص یا طرف حسابی که چک به او مسترد می‌شود را مشخص کنید.' },
  { icon: Calendar, title: 'تاریخ استرداد', desc: 'تاریخ واقعی استرداد چک را ثبت کنید.' },
  { icon: ShieldCheck, title: 'کنترل حسابداری', desc: 'پس از ثبت نهایی، اثر حسابداری و مانده طرف حساب به‌صورت خودکار اصلاح می‌شود.' },
];

export default function NewChequeRefundPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [cheques, setCheques] = useState<ReceivedCheque[]>([]);
  const [contactParties, setContactParties] = useState<ContactParty[]>([]);
  const [existingRefunds, setExistingRefunds] = useState<any[]>([]);

  const [chequeId, setChequeId] = useState('');
  const [recipientPartyId, setRecipientPartyId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [refundDate, setRefundDate] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [chqData, partyData, refundData] = await Promise.all([
        fetchData<ReceivedCheque>('received_cheques', {
          orderBy: { createdAt: 'desc' },
        }),
        fetchData<ContactParty>('contact_parties', { where: {} }),
        fetchData<any>('cheque_refunds', { where: {} }),
      ]);
      setCheques(chqData || []);
      setContactParties(partyData || []);
      setExistingRefunds(refundData || []);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const partyName = (p: ContactParty) => {
    if (p.type === 'individual') return `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'بدون نام';
    return p.companyName || 'بدون نام';
  };

  // Filter cheques: only refundable ones AND no pending refund
  const refundableCheques = useMemo(() => {
    const pendingChequeIds = new Set(
      existingRefunds
        .filter((r) => ['draft', 'pending_approval', 'approved'].includes(r.status))
        .map((r) => r.chequeId)
    );
    return cheques.filter((c) => REFUNDABLE_STATUSES.includes(c.status) && !pendingChequeIds.has(c.id));
  }, [cheques, existingRefunds]);

  const selectedCheque = useMemo(() => cheques.find((c) => c.id === chequeId), [cheques, chequeId]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!chequeId) e.chequeId = 'انتخاب چک الزامی است';
    if (!refundDate) e.refundDate = 'تاریخ استرداد الزامی است';
    if (!recipientPartyId && !recipientName) e.recipient = 'گیرنده استرداد الزامی است (طرف حساب یا نام)';
    if (!reason) e.reason = 'علت استرداد الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;

    // Double-check cheque is refundable
    if (!selectedCheque) { toast.error('چک یافت نشد'); return; }
    if (!REFUNDABLE_STATUSES.includes(selectedCheque.status)) {
      toast.error(`چک در وضعیت «${CHEQUE_STATUS[selectedCheque.status]}» قابل استرداد نیست`);
      return;
    }

    setSubmitting(true);
    try {
      const refund = await createData('cheque_refunds', {
        number: `RF-${Date.now()}`,
        chequeId,
        recipientPartyId: recipientPartyId || null,
        recipientName: recipientName || null,
        refundDate: refundDate ? new Date(refundDate).toISOString() : new Date().toISOString(),
        amount: Number(selectedCheque.amount),
        reason: reason || null,
        description: description || null,
        status: 'draft',
        createdBy: profile.id,
        originalJournalEntryId: selectedCheque.journalEntryId || null,
        accountingPosted: false,
        balanceAdjusted: false,
        settlementsChecked: false,
      }) as any;

      try {
        await createData('cheque_refund_history', {
          refundId: refund.id,
          action: 'created',
          actionBy: profile.id,
          actionAt: new Date().toISOString(),
          toStatus: 'draft',
          details: { chequeId, chequeNumber: selectedCheque.chequeNumber, amount: Number(selectedCheque.amount) },
        });
      } catch {}

      toast.success('درخواست استرداد چک ثبت شد');
      router.push('/dashboard/cheque-refunds');
    } catch (error: any) {
      toast.error('ایجاد ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full" dir="rtl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">ثبت درخواست استرداد چک</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> استرداد چک <span className="mx-1.5 text-[#CBD5E1]">←</span> ثبت</div>
        </div>
        <Link href="/dashboard/cheque-refunds">
          <Button variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-white text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#FAFBFF]">
            <ArrowRight className="h-4 w-4" /> بازگشت
          </Button>
        </Link>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cheque selection */}
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><WalletCards className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-bold text-[#1D2939]">انتخاب چک</h2>
                    <p className="text-xs text-[#98A2B3]">چکی که می‌خواهید مسترد کنید را انتخاب نمایید. فقط چک‌های قابل استرداد نمایش داده می‌شوند.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">چک مورد استرداد <span className="text-rose-500">*</span></Label>
                  <Select value={chequeId} onValueChange={setChequeId}>
                    <SelectTrigger className="h-[42px] rounded-[10px] border-[#DCE3EE]"><WalletCards className="h-4 w-4 text-[#98A2B3]" /><SelectValue placeholder="انتخاب چک..." /></SelectTrigger>
                    <SelectContent>
                      {refundableCheques.length === 0 ? (
                        <SelectItem value="__none__" disabled>چک قابل استردادی موجود نیست</SelectItem>
                      ) : (
                        refundableCheques.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.chequeNumber} - {c.bankName} - {formatToman(Number(c.amount))} تومان ({CHEQUE_STATUS[c.status]})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.chequeId && <span className="text-xs text-rose-500">{errors.chequeId}</span>}
                </div>

                {/* Selected cheque details */}
                {selectedCheque && (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-[10px] bg-[#EFF4FF] p-3"><div className="text-xs text-[#667085]">شماره چک</div><div className="mt-1 text-sm font-bold text-[#3155E7]">{selectedCheque.chequeNumber}</div></div>
                    <div className="rounded-[10px] bg-[#FEF3C7] p-3"><div className="text-xs text-[#667085]">مبلغ</div><div className="mt-1 text-sm font-bold text-[#92400E]">{formatToman(Number(selectedCheque.amount))} تومان</div></div>
                    <div className="rounded-[10px] bg-[#DCFCE7] p-3"><div className="text-xs text-[#667085]">بانک</div><div className="mt-1 text-sm font-bold text-[#16A34A]">{selectedCheque.bankName}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">سررسید</div><div className="mt-1 text-sm font-bold text-[#344054]">{formatJalali(selectedCheque.dueDate)}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">وضعیت</div><div className="mt-1"><Badge variant="outline" style={{ color: CHEQUE_STATUS_COLOR[selectedCheque.status], borderColor: `${CHEQUE_STATUS_COLOR[selectedCheque.status]}35` }}>{CHEQUE_STATUS[selectedCheque.status]}</Badge></div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">صادرکننده</div><div className="mt-1 text-sm font-bold text-[#344054]">{selectedCheque.issuerName || '—'}</div></div>
                  </div>
                )}

                {refundableCheques.length === 0 && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                    <AlertCircle className="h-4 w-4" />
                    چک قابل استردادی موجود نیست. چک‌های وصول‌شده، باطل‌شده، استردادشده یا منتقل‌شده قابل استرداد مجدد نیستند.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recipient info */}
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#10b981]/10 text-[#10b981]"><User className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-bold text-[#1D2939]">گیرنده استرداد</h2>
                    <p className="text-xs text-[#98A2B3]">شخص یا طرف حسابی که چک به او مسترد می‌شود را مشخص کنید.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">طرف حساب دریافت‌کننده</Label>
                    <Select value={recipientPartyId || '__none__'} onValueChange={(v) => setRecipientPartyId(v === '__none__' ? '' : v)}>
                      <SelectTrigger className="h-[42px] rounded-[10px] border-[#DCE3EE]"><User className="h-4 w-4 text-[#98A2B3]" /><SelectValue placeholder="انتخاب طرف حساب..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">بدون طرف حساب</SelectItem>
                        {contactParties.map((p) => <SelectItem key={p.id} value={p.id}>{partyName(p)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">نام دریافت‌کننده (دستی)</Label>
                    <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="اگر طرف حساب انتخاب نشده..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                </div>
                {errors.recipient && <span className="mt-2 block text-xs text-rose-500">{errors.recipient}</span>}
              </CardContent>
            </Card>

            {/* Refund details */}
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f97316]/10 text-[#f97316]"><RotateCcw className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-bold text-[#1D2939]">جزئیات استرداد</h2>
                    <p className="text-xs text-[#98A2B3]">تاریخ، علت و توضیحات استرداد را وارد کنید.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">تاریخ استرداد <span className="text-rose-500">*</span></Label>
                    <div className="date-input-wrap">
                      <span className="flex h-[42px] items-center gap-2 rounded-[10px] border border-[#DCE3EE] bg-white px-3">
                        <Calendar className="h-4 w-4 text-[#98A2B3]" />
                        <JalaliDatePicker value={refundDate ? new Date(refundDate) : null} onChange={(d) => setRefundDate(d ? toLocalDateString(d) : '')} placeholder="انتخاب تاریخ" className="h-[42px] flex-1 border-0 p-0 focus:ring-0" />
                      </span>
                    </div>
                    {errors.refundDate && <span className="text-xs text-rose-500">{errors.refundDate}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">مبلغ چک</Label>
                    <div className="relative">
                      <Banknote className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
                      <Input value={selectedCheque ? formatToman(Number(selectedCheque.amount)) : '—'} readOnly className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-[#F8FAFD] pr-9" />
                    </div>
                    <span className="text-[10px] text-[#98A2B3]">مبلغ به‌صورت خودکار از چک انتخاب شده</span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">علت استرداد <span className="text-rose-500">*</span></Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="علت استرداد چک..." className="rounded-[10px] border-[#DCE3EE]" />
                  {errors.reason && <span className="text-xs text-rose-500">{errors.reason}</span>}
                </div>

                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">توضیحات</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیحات اضافی..." className="rounded-[10px] border-[#DCE3EE]" />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <Link href="/dashboard/cheque-refunds"><Button type="button" variant="outline" className="h-[42px] rounded-[10px]">انصراف</Button></Link>
              <Button type="submit" disabled={submitting || refundableCheques.length === 0} className="h-[42px] rounded-[10px] bg-[#3155E7] px-6 text-sm font-semibold text-white hover:bg-[#2445C7]">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</> : <><Plus className="h-4 w-4" /> ثبت درخواست استرداد</>}
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="rounded-[14px] border border-[#E6EBF2] bg-white p-4 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f59e0b]/10 text-[#f59e0b]"><Lightbulb className="h-5 w-5" /></span>
                <h2 className="text-sm font-bold text-[#101828]">راهنما و نکات</h2>
              </div>
              <div className="space-y-3">
                {guideItems.map((item, i) => (
                  <div key={i}>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#F1F5F9] text-[#667085]"><item.icon className="h-4 w-4" /></span>
                      <div>
                        <strong className="text-xs text-[#344054]">{item.title}</strong>
                        <p className="mt-0.5 text-[11px] leading-5 text-[#98A2B3]">{item.desc}</p>
                      </div>
                    </div>
                    {i < guideItems.length - 1 && <div className="my-2 border-t border-[#F1F5F9]" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[14px] border border-[#BFD0FF] bg-[#EFF4FF] p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><Info className="h-5 w-5" /></span>
                <h2 className="text-sm font-bold text-[#101828]">اطلاعات مفید</h2>
              </div>
              <p className="text-xs leading-6 text-[#344054]">درخواست استرداد پس از ثبت در وضعیت «پیش‌نویس» قرار می‌گیرد. پس از ارسال برای تأیید و تأیید توسط مسئول، ثبت نهایی انجام می‌شود و وضعیت چک به «استردادشده» تغییر می‌کند. چک مستردشده از چک‌های دریافتی فعال خارج می‌شود اما سابقه آن حفظ می‌گردد. در صورت اشتباه، می‌توان استرداد را ابطال کرد تا چک به وضعیت قبلی برگردد.</p>
            </div>

            {/* Blocked cheques info */}
            <div className="rounded-[14px] border border-[#E6EBF2] bg-white p-4 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
              <h2 className="mb-3 text-sm font-bold text-[#101828]">چک‌های غیرقابل استرداد</h2>
              <div className="space-y-2 text-xs text-[#667085]">
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#10b981]" />وصول‌شده</div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#f97316]" />استردادشده</div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#64748b]" />باطل‌شده</div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#0ea5e9]" />منتقل‌شده</div>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-[#98A2B3]">این چک‌ها قابل استرداد مجدد نیستند.</p>
            </div>

            {/* Summary */}
            {selectedCheque && (
              <div className="rounded-[14px] border border-[#E6EBF2] bg-white p-4 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
                <h2 className="mb-3 text-sm font-bold text-[#101828]">خلاصه</h2>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-[#98A2B3]">شماره چک</span><span className="font-bold text-[#344054]">{selectedCheque.chequeNumber}</span></div>
                  <div className="flex justify-between"><span className="text-[#98A2B3]">بانک</span><span className="font-bold text-[#344054]">{selectedCheque.bankName}</span></div>
                  <div className="flex justify-between"><span className="text-[#98A2B3]">مبلغ</span><span className="font-bold text-[#3155E7]">{formatToman(Number(selectedCheque.amount))} تومان</span></div>
                  <div className="flex justify-between"><span className="text-[#98A2B3]">گیرنده</span><span className="font-bold text-[#344054]">{recipientName || '—'}</span></div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </form>
    </div>
  );
}
