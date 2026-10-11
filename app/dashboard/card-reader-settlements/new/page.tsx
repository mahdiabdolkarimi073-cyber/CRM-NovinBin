'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData, fetchData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight, ArrowRightLeft, CreditCard, Calendar, Loader2, Plus,
  Lightbulb, Info, CheckSquare, ShieldCheck, Hash, Receipt,
  Wallet, TrendingUp,
} from 'lucide-react';
import { formatToman, formatJalali } from '@/lib/format';
import { toast } from 'sonner';
import type {
  CardReader, CardReaderTransaction, BankAccount,
} from '@/lib/types';

const TXN_STATUS: Record<string, string> = {
  registered: 'ثبت‌شده',
  confirmed: 'تأیید شده',
  pending_settlement: 'در انتظار تسویه',
  settled: 'تسویه‌شده',
  failed: 'ناموفق',
  returned: 'برگشتی',
  discrepancy: 'مغایر',
  cancelled: 'لغو شده',
};

const TXN_TYPE: Record<string, string> = {
  purchase: 'خرید',
  refund: 'بازگشت',
  reversal: 'برگشت تراکنش',
  adjustment: 'تعدیل',
};

const ELIGIBLE_STATUSES = ['confirmed'];

const guideItems = [
  { icon: CreditCard, title: 'انتخاب کارتخوان', desc: 'کارتخوان موردنظر را انتخاب کنید. فقط تراکنش‌های همان کارتخوان نمایش داده می‌شوند.' },
  { icon: Calendar, title: 'بازه تسویه', desc: 'تاریخ تسویه را تعیین کنید. تراکنش‌های تا این تاریخ استخراج می‌شوند.' },
  { icon: CheckSquare, title: 'تراکنش‌های واجد شرایط', desc: 'فقط تراکنش‌های تأییدشده، تسویه‌نشده و برگشت‌نخورده قابل انتخاب هستند.' },
  { icon: ShieldCheck, title: 'کنترل تسویه مجدد', desc: 'سیستم هنگام ثبت نهایی دوباره کنترل می‌کند که تراکنش قبلاً تسویه نشده باشد.' },
  { icon: Receipt, title: 'ثبت رسید و سند', desc: 'پس از تأیید واریز بانکی، رسید دریافت و سند حسابداری به‌صورت خودکار ایجاد می‌شوند.' },
];

export default function NewCardReaderSettlementPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [readers, setReaders] = useState<CardReader[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [availableTxns, setAvailableTxns] = useState<CardReaderTransaction[]>([]);
  const [existingSettlementTxnIds, setExistingSettlementTxnIds] = useState<Set<string>>(new Set());

  const [cardReaderId, setCardReaderId] = useState('');
  const [settlementDate, setSettlementDate] = useState('');
  const [upToDate, setUpToDate] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTxns, setSelectedTxns] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    try {
      const [rData, baData] = await Promise.all([
        fetchData<CardReader>('card_readers', { where: { status: 'active' } }),
        fetchData<BankAccount>('bank_accounts', { where: { active: true } }),
      ]);
      setReaders(rData || []);
      setBankAccounts(baData || []);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!cardReaderId) { setAvailableTxns([]); setSelectedTxns(new Set()); return; }
    setSelectedTxns(new Set());

    const loadTxns = async () => {
      try {
        const tData = await fetchData<CardReaderTransaction>('card_reader_transactions', {
          where: { cardReaderId },
          orderBy: { transactionDate: 'desc' },
        });
        const all = tData || [];
        const eligible = all.filter((t) =>
          ELIGIBLE_STATUSES.includes(t.status) &&
          !t.settlementId
        );
        setAvailableTxns(eligible);

        const sData = await fetchData<any>('card_reader_settlements', {
          where: { cardReaderId, status: { in: ['draft', 'pending_approval', 'approved'] } },
          include: { items: true },
        });
        const usedTxnIds = new Set<string>();
        for (const s of (sData || [])) {
          for (const item of (s.items || [])) {
            usedTxnIds.add(item.transactionId);
          }
        }
        setExistingSettlementTxnIds(usedTxnIds);
      } catch (error: any) {
        toast.error('بارگذاری تراکنش‌ها ناموفق: ' + error.message);
      }
    };
    loadTxns();
  }, [cardReaderId]);

  const selectedReader = useMemo(() => readers.find((r) => r.id === cardReaderId), [readers, cardReaderId]);

  useEffect(() => {
    if (selectedReader?.bankAccountId && !bankAccountId) {
      setBankAccountId(selectedReader.bankAccountId);
    }
  }, [selectedReader, bankAccountId]);

  const displayTxns = useMemo(() => {
    if (!upToDate) return availableTxns;
    const limit = new Date(upToDate);
    limit.setHours(23, 59, 59, 999);
    return availableTxns.filter((t) => new Date(t.transactionDate) <= limit);
  }, [availableTxns, upToDate]);

  const toggleTxn = (id: string) => {
    if (existingSettlementTxnIds.has(id)) return;
    setSelectedTxns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const selectable = displayTxns.filter((t) => !existingSettlementTxnIds.has(t.id));
    if (selectedTxns.size === selectable.length) {
      setSelectedTxns(new Set());
    } else {
      setSelectedTxns(new Set(selectable.map((t) => t.id)));
    }
  };

  const totals = useMemo(() => {
    const selected = displayTxns.filter((t) => selectedTxns.has(t.id));
    const gross = selected.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const commission = selected.reduce((sum, t) => sum + Number(t.commissionAmount || 0), 0);
    const deductions = selected.reduce((sum, t) => sum + Number(t.deductions || 0), 0);
    const net = gross - commission - deductions;
    return { gross, commission, deductions, net, count: selected.length };
  }, [displayTxns, selectedTxns]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!cardReaderId) e.cardReaderId = 'انتخاب کارتخوان الزامی است';
    if (!settlementDate) e.settlementDate = 'تاریخ تسویه الزامی است';
    if (!bankAccountId) e.bankAccountId = 'حساب بانکی مقصد الزامی است';
    if (selectedTxns.size === 0) e.txns = 'حداقل یک تراکنش باید انتخاب شود';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;

    setSubmitting(true);
    try {
      const selected = displayTxns.filter((t) => selectedTxns.has(t.id));

      for (const txn of selected) {
        if (txn.settlementId) {
          toast.error(`تراکنش ${txn.number} قبلاً تسویه شده است`);
          setSubmitting(false);
          return;
        }
        if (existingSettlementTxnIds.has(txn.id)) {
          toast.error(`تراکنش ${txn.number} در تسویه دیگری در جریان است`);
          setSubmitting(false);
          return;
        }
      }

      const settlement = await createData('card_reader_settlements', {
        number: `CRS-${Date.now()}`,
        cardReaderId,
        settlementDate: settlementDate ? new Date(settlementDate).toISOString() : new Date().toISOString(),
        bankAccountId: bankAccountId || null,
        grossAmount: totals.gross,
        commissionAmount: totals.commission,
        deductions: totals.deductions,
        netAmount: totals.net,
        settledAmount: 0,
        discrepancyAmount: 0,
        status: 'draft',
        isPartial: false,
        remainingAmount: 0,
        accountingPosted: false,
        description: description || null,
        createdBy: profile.id,
      }) as any;

      for (const txn of selected) {
        await createData('card_reader_settlement_items', {
          settlementId: settlement.id,
          transactionId: txn.id,
          grossAmount: Number(txn.amount),
          commissionAmount: Number(txn.commissionAmount || 0),
          deductions: Number(txn.deductions || 0),
          netAmount: Number(txn.amount) - Number(txn.commissionAmount || 0) - Number(txn.deductions || 0),
          settledAmount: 0,
          discrepancyAmount: 0,
          itemStatus: 'open',
        });

        await updateData('card_reader_transactions', { id: txn.id }, {
          status: 'pending_settlement',
          settlementId: settlement.id,
          updatedAt: new Date().toISOString(),
        });
      }

      try {
        await createData('card_reader_settlement_history', {
          settlementId: settlement.id,
          action: 'created',
          actionBy: profile.id,
          actionAt: new Date().toISOString(),
          toStatus: 'draft',
          details: {
            txnCount: selected.length,
            grossAmount: totals.gross,
            commissionAmount: totals.commission,
            deductions: totals.deductions,
            netAmount: totals.net,
          },
        });
      } catch {}

      toast.success('سند تسویه کارتخوان ثبت شد');
      router.push('/dashboard/card-reader-settlements');
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
              <h1>ثبت تسویه کارتخوان</h1>
            </div>
            <div className="create-task-breadcrumb">داشبورد <b>←</b> تسویه کارتخوان <b>←</b> ثبت</div>
          </div>
          <Link href="/dashboard/card-reader-settlements" className="back-button">
            <ArrowRight className="h-4 w-4" /> بازگشت
          </Link>
        </header>

        <div className="create-task-grid">
          <form className="task-form-card" onSubmit={handleSubmit}>
            {/* شناسایی کارتخوان */}
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><CreditCard className="h-5 w-5" /></span>
                <div>
                  <h2>شناسایی کارتخوان</h2>
                  <p>کارتخوان موردنظر را انتخاب کنید. فقط تراکنش‌های متعلق به همان کارتخوان برای تسویه در نظر گرفته می‌شوند.</p>
                </div>
              </div>
            </div>
            <div className="form-card-divider" />

            <div className="form-fields">
              <div className="field-group">
                <Label className="field-label">کارتخوان <span className="required-star">*</span></Label>
                <Select value={cardReaderId} onValueChange={setCardReaderId}>
                  <SelectTrigger className="task-select"><SelectValue placeholder="انتخاب کارتخوان..." /></SelectTrigger>
                  <SelectContent>
                    {readers.length === 0 ? (
                      <SelectItem value="__none__" disabled>کارتخوان فعالی موجود نیست</SelectItem>
                    ) : (
                      readers.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.bankName} - TID: {r.tid} - MID: {r.mid}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.cardReaderId && <span className="field-error">{errors.cardReaderId}</span>}
              </div>

              {selectedReader && (
                <div className="grid grid-cols-2 gap-3 tablet:grid-cols-3">
                  <div className="rounded-[10px] bg-sky-50 p-3 dark:bg-sky-900/20"><div className="text-xs text-slate-500 dark:text-slate-400">بانک</div><div className="mt-1 text-sm font-bold text-sky-600 dark:text-sky-400">{selectedReader.bankName}</div></div>
                  <div className="rounded-[10px] bg-slate-100 p-3 dark:bg-slate-800"><div className="text-xs text-slate-500 dark:text-slate-400">TID</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-300">{selectedReader.tid}</div></div>
                  <div className="rounded-[10px] bg-slate-100 p-3 dark:bg-slate-800"><div className="text-xs text-slate-500 dark:text-slate-400">MID</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-300">{selectedReader.mid}</div></div>
                  {selectedReader.branchName && <div className="rounded-[10px] bg-slate-100 p-3 dark:bg-slate-800"><div className="text-xs text-slate-500 dark:text-slate-400">شعبه</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-300">{selectedReader.branchName}</div></div>}
                  {selectedReader.owner && <div className="rounded-[10px] bg-slate-100 p-3 dark:bg-slate-800"><div className="text-xs text-slate-500 dark:text-slate-400">مالک</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-300">{selectedReader.owner}</div></div>}
                  {bankAccountId && <div className="rounded-[10px] bg-emerald-50 p-3 dark:bg-emerald-900/20"><div className="text-xs text-slate-500 dark:text-slate-400">حساب متصل</div><div className="mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">{bankAccounts.find((b) => b.id === bankAccountId)?.bankName || '—'}</div></div>}
                </div>
              )}
            </div>

            {/* جزئیات تسویه */}
            <div className="form-card-divider" />
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><ArrowRightLeft className="h-5 w-5" /></span>
                <div>
                  <h2>جزئیات تسویه</h2>
                  <p>تاریخ تسویه، بازه استخراج تراکنش‌ها و حساب بانکی مقصد را مشخص کنید.</p>
                </div>
              </div>
            </div>

            <div className="form-fields">
              <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
                <div className="field-group">
                  <Label className="field-label">تاریخ تسویه <span className="required-star">*</span></Label>
                  <Input type="date" value={settlementDate} onChange={(e) => setSettlementDate(e.target.value)} className="task-input" />
                  {errors.settlementDate && <span className="field-error">{errors.settlementDate}</span>}
                </div>
                <div className="field-group">
                  <Label className="field-label">تا تاریخ (استخراج تراکنش‌ها)</Label>
                  <Input type="date" value={upToDate} onChange={(e) => setUpToDate(e.target.value)} className="task-input" />
                  <span className="text-[10px] text-slate-400">تراکنش‌های تا این تاریخ استخراج می‌شوند. خالی = همه.</span>
                </div>
                <div className="field-group tablet:col-span-2">
                  <Label className="field-label">حساب بانکی مقصد <span className="required-star">*</span></Label>
                  <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} className="task-input">
                    <option value="">انتخاب حساب...</option>
                    {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.bankName} - {b.accountNo}</option>)}
                  </select>
                  {errors.bankAccountId && <span className="field-error">{errors.bankAccountId}</span>}
                </div>
              </div>

              <div className="field-group">
                <Label className="field-label">توضیحات</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیحات اختیاری..." className="task-textarea" />
              </div>
            </div>

            {/* تراکنش‌های قابل تسویه */}
            <div className="form-card-divider" />
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><CheckSquare className="h-5 w-5" /></span>
                <div>
                  <h2>تراکنش‌های قابل تسویه</h2>
                  <p>فقط تراکنش‌های تأییدشده و تسویه‌نشده قابل انتخاب هستند.</p>
                </div>
              </div>
              {displayTxns.length > 0 && (
                <button type="button" onClick={selectAll} className="cancel-btn">
                  {selectedTxns.size === displayTxns.filter((t) => !existingSettlementTxnIds.has(t.id)).length ? 'لغو همه' : 'انتخاب همه'}
                </button>
              )}
            </div>

            <div className="form-fields">
              {!cardReaderId ? (
                <div className="rounded-[12px] border border-dashed border-slate-300 py-12 text-center text-sm text-slate-400 dark:border-slate-600 dark:text-slate-500">ابتدا کارتخوان را انتخاب کنید تا تراکنش‌های قابل تسویه نمایش داده شوند.</div>
              ) : displayTxns.length === 0 ? (
                <div className="rounded-[12px] border border-dashed border-slate-300 py-12 text-center text-sm text-slate-400 dark:border-slate-600 dark:text-slate-500">تراکنش قابل تسویه‌ای برای این کارتخوان{upToDate ? ' تا تاریخ انتخاب‌شده' : ''} موجود نیست. فقط تراکنش‌های تأییدشده و تسویه‌نشده قابل انتخاب هستند.</div>
              ) : (
                <>
                  {errors.txns && <span className="field-error">{errors.txns}</span>}
                  <div className="max-h-96 space-y-1.5 overflow-y-auto rounded-lg border border-slate-100 p-2 dark:border-slate-700">
                    {displayTxns.map((t) => {
                      const isSelected = selectedTxns.has(t.id);
                      const isLocked = existingSettlementTxnIds.has(t.id);
                      return (
                        <label
                          key={t.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-[10px] border p-3 transition-colors ${
                            isLocked ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-50 dark:border-slate-700 dark:bg-slate-800/50' :
                            isSelected ? 'border-sky-500 bg-sky-50 dark:border-sky-600 dark:bg-sky-900/30' : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            disabled={isLocked}
                            onCheckedChange={() => toggleTxn(t.id)}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.number}</span>
                              <Badge variant="outline" className="text-[9px] text-slate-500 dark:text-slate-400">{TXN_TYPE[t.transactionType] || t.transactionType}</Badge>
                              {isLocked && <Badge variant="outline" className="text-[9px] border-amber-200 text-amber-600 dark:border-amber-700 dark:text-amber-400">در تسویه دیگر</Badge>}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
                              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(t.transactionDate)}</span>
                              {t.trackingNumber && <span>پیگیری: {t.trackingNumber}</span>}
                              {t.referenceNumber && <span>مرجع: {t.referenceNumber}</span>}
                              <span className="flex items-center gap-1"><Hash className="h-3 w-3" />{TXN_STATUS[t.status]}</span>
                            </div>
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-bold text-sky-600 dark:text-sky-400">{formatToman(Number(t.amount))}</div>
                            {Number(t.commissionAmount) > 0 && <div className="text-[10px] text-slate-400">کارمزد: {formatToman(Number(t.commissionAmount))}</div>}
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {/* Totals */}
                  <div className="grid grid-cols-2 gap-3 tablet:grid-cols-4">
                    <div className="rounded-[10px] bg-sky-50 p-3 dark:bg-sky-900/20"><div className="text-xs text-slate-500 dark:text-slate-400">تعداد انتخاب‌شده</div><div className="mt-1 text-sm font-bold text-sky-600 dark:text-sky-400">{totals.count.toLocaleString('fa-IR')}</div></div>
                    <div className="rounded-[10px] bg-amber-50 p-3 dark:bg-amber-900/20"><div className="text-xs text-slate-500 dark:text-slate-400">ناخالص</div><div className="mt-1 text-sm font-bold text-amber-700 dark:text-amber-400">{formatToman(totals.gross)}</div></div>
                    <div className="rounded-[10px] bg-slate-100 p-3 dark:bg-slate-800"><div className="text-xs text-slate-500 dark:text-slate-400">کسورات</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-300">{formatToman(totals.commission + totals.deductions)}</div></div>
                    <div className="rounded-[10px] bg-emerald-50 p-3 dark:bg-emerald-900/20"><div className="text-xs text-slate-500 dark:text-slate-400">خالص قابل واریز</div><div className="mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatToman(totals.net)}</div></div>
                  </div>
                </>
              )}
            </div>

            <div className="form-actions-row">
              <button type="button" className="cancel-btn" onClick={() => router.push('/dashboard/card-reader-settlements')} disabled={submitting}>انصراف</button>
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</> : <><Plus className="h-4 w-4" /> ثبت تسویه</>}
              </button>
            </div>
          </form>

          <aside className="task-sidebar">
            <div className="guide-card">
              <div className="guide-card-header">
                <span className="guide-card-icon"><Lightbulb className="h-5 w-5" /></span>
                <h2>راهنمای ثبت تسویه</h2>
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
              <p>چرخه کامل: ثبت تسویه (پیش‌نویس) ← ارسال برای تأیید ← تأیید ← ثبت نهایی و واریز (ثبت رسید و سند حسابداری) ← در صورت نیاز: ابطال. در مرحله ثبت نهایی، مبلغ واریزشده با خالص تسویه مقایسه می‌شود و مغایرت ثبت می‌شود.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
