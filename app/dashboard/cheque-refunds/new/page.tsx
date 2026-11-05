'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData, fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
    <div className="create-task-page" dir="rtl">
      <div className="create-task-container">
        <header className="create-task-header">
          <div>
            <div className="create-task-title">
              <span className="title-accent-bar" />
              <h1>ثبت درخواست استرداد چک</h1>
            </div>
            <div className="create-task-breadcrumb">داشبورد <b>←</b> استرداد چک <b>←</b> ثبت</div>
          </div>
          <Link href="/dashboard/cheque-refunds" className="back-button">
            <ArrowRight className="h-4 w-4" /> بازگشت به استرداد چک
          </Link>
        </header>

        <div className="create-task-grid">
          <form className="task-form-card" onSubmit={handleSubmit}>
            {/* Cheque selection */}
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><WalletCards className="h-5 w-5" /></span>
                <div>
                  <h2>انتخاب چک</h2>
                  <p>چکی که می‌خواهید مسترد کنید را انتخاب نمایید. فقط چک‌های قابل استرداد نمایش داده می‌شوند.</p>
                </div>
              </div>
            </div>
            <div className="form-card-divider" />

            <div className="form-fields">
              <div className="field-group">
                <Label className="field-label">چک مورد استرداد <span className="required-star">*</span></Label>
                <Select value={chequeId} onValueChange={setChequeId}>
                  <SelectTrigger className="task-select"><WalletCards className="ml-1 h-4 w-4 text-slate-400" /><SelectValue placeholder="انتخاب چک..." /></SelectTrigger>
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
                {errors.chequeId && <span className="field-error">{errors.chequeId}</span>}
              </div>

              {selectedCheque && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-[10px] bg-sky-50 p-3 dark:bg-sky-900/20"><div className="text-xs text-slate-400">شماره چک</div><div className="mt-1 text-sm font-bold text-sky-600 dark:text-sky-400">{selectedCheque.chequeNumber}</div></div>
                  <div className="rounded-[10px] bg-amber-50 p-3 dark:bg-amber-900/20"><div className="text-xs text-slate-400">مبلغ</div><div className="mt-1 text-sm font-bold text-amber-600 dark:text-amber-400">{formatToman(Number(selectedCheque.amount))} تومان</div></div>
                  <div className="rounded-[10px] bg-green-50 p-3 dark:bg-green-900/20"><div className="text-xs text-slate-400">بانک</div><div className="mt-1 text-sm font-bold text-green-600 dark:text-green-400">{selectedCheque.bankName}</div></div>
                  <div className="rounded-[10px] bg-slate-100 p-3 dark:bg-slate-800"><div className="text-xs text-slate-400">سررسید</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-300">{formatJalali(selectedCheque.dueDate)}</div></div>
                  <div className="rounded-[10px] bg-slate-100 p-3 dark:bg-slate-800"><div className="text-xs text-slate-400">وضعیت</div><div className="mt-1"><Badge variant="outline" style={{ color: CHEQUE_STATUS_COLOR[selectedCheque.status], borderColor: `${CHEQUE_STATUS_COLOR[selectedCheque.status]}35` }}>{CHEQUE_STATUS[selectedCheque.status]}</Badge></div></div>
                  <div className="rounded-[10px] bg-slate-100 p-3 dark:bg-slate-800"><div className="text-xs text-slate-400">صادرکننده</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-300">{selectedCheque.issuerName || '—'}</div></div>
                </div>
              )}

              {refundableCheques.length === 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                  چک قابل استردادی موجود نیست. چک‌های وصول‌شده، باطل‌شده، استردادشده یا منتقل‌شده قابل استرداد مجدد نیستند.
                </div>
              )}
            </div>

            {/* Recipient section */}
            <div className="form-card-divider" />
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><User className="h-5 w-5" /></span>
                <div>
                  <h2>گیرنده استرداد</h2>
                  <p>شخص یا طرف حسابی که چک به او مسترد می‌شود را مشخص کنید.</p>
                </div>
              </div>
            </div>

            <div className="form-fields">
              <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
                <div className="field-group">
                  <Label className="field-label">طرف حساب دریافت‌کننده</Label>
                  <Select value={recipientPartyId || '__none__'} onValueChange={(v) => setRecipientPartyId(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="task-select"><User className="ml-1 h-4 w-4 text-slate-400" /><SelectValue placeholder="انتخاب طرف حساب..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">بدون طرف حساب</SelectItem>
                      {contactParties.map((p) => <SelectItem key={p.id} value={p.id}>{partyName(p)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="field-group">
                  <Label className="field-label">نام دریافت‌کننده (دستی)</Label>
                  <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="اگر طرف حساب انتخاب نشده..." className="task-input" />
                </div>
              </div>
              {errors.recipient && <span className="field-error">{errors.recipient}</span>}
            </div>

            {/* Refund details */}
            <div className="form-card-divider" />
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><RotateCcw className="h-5 w-5" /></span>
                <div>
                  <h2>جزئیات استرداد</h2>
                  <p>تاریخ، علت و توضیحات استرداد را وارد کنید.</p>
                </div>
              </div>
            </div>

            <div className="form-fields">
              <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
                <div className="field-group">
                  <Label className="field-label">تاریخ استرداد <span className="required-star">*</span></Label>
                  <div className="date-input-wrap">
                    <span className="date-icon"><Calendar className="h-4 w-4" /></span>
                    <JalaliDatePicker value={refundDate ? new Date(refundDate) : null} onChange={(d) => setRefundDate(d ? toLocalDateString(d) : '')} placeholder="انتخاب تاریخ" className="task-date-input" />
                  </div>
                  {errors.refundDate && <span className="field-error">{errors.refundDate}</span>}
                </div>

                <div className="field-group">
                  <Label className="field-label">مبلغ چک</Label>
                  <Input value={selectedCheque ? formatToman(Number(selectedCheque.amount)) : '—'} readOnly className="task-input bg-slate-50 dark:bg-slate-800" />
                  <span className="text-[10px] text-slate-400">مبلغ به‌صورت خودکار از چک انتخاب شده</span>
                </div>
              </div>

              <div className="field-group">
                <Label className="field-label">علت استرداد <span className="required-star">*</span></Label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="علت استرداد چک..." className="task-textarea" />
                {errors.reason && <span className="field-error">{errors.reason}</span>}
              </div>

              <div className="field-group">
                <Label className="field-label">توضیحات</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیحات اضافی..." className="task-textarea" />
              </div>
            </div>

            <div className="form-actions-row">
              <button type="button" className="cancel-btn" onClick={() => router.push('/dashboard/cheque-refunds')} disabled={submitting}>انصراف</button>
              <button type="submit" className="submit-btn" disabled={submitting || refundableCheques.length === 0}>
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</>) : (<><Plus className="h-4 w-4" /> ثبت درخواست استرداد</>)}
              </button>
            </div>
          </form>

          <aside className="task-sidebar">
            <div className="guide-card">
              <div className="guide-card-header">
                <span className="guide-card-icon"><Lightbulb className="h-5 w-5" /></span>
                <h2>راهنما و نکات</h2>
              </div>
              <div className="guide-items">
                {guideItems.map((item, i) => (
                  <div key={i}>
                    <div className="guide-item">
                      <span className="guide-item-icon"><item.icon className="h-5 w-5" /></span>
                      <div className="guide-item-text"><strong>{item.title}</strong><p>{item.desc}</p></div>
                    </div>
                    {i < guideItems.length - 1 && <div className="guide-item-divider" />}
                  </div>
                ))}
              </div>
            </div>
            <div className="info-card">
              <div className="info-card-header">
                <span className="info-card-icon"><Info className="h-5 w-5" /></span>
                <h2>اطلاعات مفید</h2>
              </div>
              <p>درخواست استرداد پس از ثبت در وضعیت «پیش‌نویس» قرار می‌گیرد. پس از ارسال برای تأیید و تأیید توسط مسئول، ثبت نهایی انجام می‌شود و وضعیت چک به «استردادشده» تغییر می‌کند. چک مستردشده از چک‌های دریافتی فعال خارج می‌شود اما سابقه آن حفظ می‌گردد. در صورت اشتباه، می‌توان استرداد را ابطال کرد تا چک به وضعیت قبلی برگردد.</p>
            </div>

            <div className="guide-card">
              <div className="guide-card-header">
                <span className="guide-card-icon"><AlertCircle className="h-5 w-5" /></span>
                <h2>چک‌های غیرقابل استرداد</h2>
              </div>
              <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-green-500" />وصول‌شده</div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-orange-500" />استردادشده</div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-400" />باطل‌شده</div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-sky-500" />منتقل‌شده</div>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-slate-400">این چک‌ها قابل استرداد مجدد نیستند.</p>
            </div>

            {selectedCheque && (
              <div className="guide-card">
                <div className="guide-card-header">
                  <span className="guide-card-icon"><CheckSquare className="h-5 w-5" /></span>
                  <h2>خلاصه</h2>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-400">شماره چک</span><span className="font-bold text-slate-700 dark:text-slate-300">{selectedCheque.chequeNumber}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">بانک</span><span className="font-bold text-slate-700 dark:text-slate-300">{selectedCheque.bankName}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">مبلغ</span><span className="font-bold text-sky-600 dark:text-sky-400">{formatToman(Number(selectedCheque.amount))} تومان</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">گیرنده</span><span className="font-bold text-slate-700 dark:text-slate-300">{recipientName || '—'}</span></div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
