'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData, fetchData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight, ArrowRightLeft, CreditCard, Calendar, Building2, Loader2, Plus,
  Lightbulb, Info, CheckSquare, AlertCircle, ShieldCheck, Hash, Receipt,
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

  // Load eligible transactions when reader changes
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
        // Filter to eligible: confirmed status, not already settled, not returned/cancelled/failed
        const eligible = all.filter((t) =>
          ELIGIBLE_STATUSES.includes(t.status) &&
          !t.settlementId
        );
        setAvailableTxns(eligible);

        // Also load existing pending settlements to prevent double-selection
        const sData = await fetchData<CardReaderSettlement>('card_reader_settlements', {
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

  // Auto-select bank account from reader if available
  useEffect(() => {
    if (selectedReader?.bankAccountId && !bankAccountId) {
      setBankAccountId(selectedReader.bankAccountId);
    }
  }, [selectedReader, bankAccountId]);

  // Filter by up-to-date
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

      // Final check: prevent double settlement
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

      // Create settlement items and link transactions
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

      // History
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
    <div className="w-full" dir="rtl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">ثبت تسویه کارتخوان</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> تسویه کارتخوان <span className="mx-1.5 text-[#CBD5E1]">←</span> ثبت</div>
        </div>
        <Link href="/dashboard/card-reader-settlements">
          <Button variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-white text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#FAFBFF]">
            <ArrowRight className="h-4 w-4" /> بازگشت
          </Button>
        </Link>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Reader selection */}
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><CreditCard className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-bold text-[#1D2939]">شناسایی کارتخوان</h2>
                    <p className="text-xs text-[#98A2B3]">کارتخوان موردنظر را انتخاب کنید. فقط تراکنش‌های متعلق به همان کارتخوان برای تسویه در نظر گرفته می‌شوند.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">کارتخوان <span className="text-rose-500">*</span></Label>
                  <Select value={cardReaderId} onValueChange={setCardReaderId}>
                    <SelectTrigger className="h-[42px] rounded-[10px] border-[#DCE3EE]">
                      <CreditCard className="h-4 w-4 text-[#98A2B3]" />
                      <SelectValue placeholder="انتخاب کارتخوان..." />
                    </SelectTrigger>
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
                  {errors.cardReaderId && <span className="text-xs text-rose-500">{errors.cardReaderId}</span>}
                </div>

                {selectedReader && (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-[10px] bg-[#EFF4FF] p-3"><div className="text-xs text-[#667085]">بانک</div><div className="mt-1 text-sm font-bold text-[#3155E7]">{selectedReader.bankName}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">TID</div><div className="mt-1 text-sm font-bold text-[#344054]">{selectedReader.tid}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">MID</div><div className="mt-1 text-sm font-bold text-[#344054]">{selectedReader.mid}</div></div>
                    {selectedReader.branchName && <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">شعبه</div><div className="mt-1 text-sm font-bold text-[#344054]">{selectedReader.branchName}</div></div>}
                    {selectedReader.owner && <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">مالک</div><div className="mt-1 text-sm font-bold text-[#344054]">{selectedReader.owner}</div></div>}
                    {bankAccountId && <div className="rounded-[10px] bg-[#DCFCE7] p-3"><div className="text-xs text-[#667085]">حساب متصل</div><div className="mt-1 text-sm font-bold text-[#16A34A]">{bankAccounts.find((b) => b.id === bankAccountId)?.bankName || '—'}</div></div>}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Settlement info */}
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3b82f6]/10 text-[#3b82f6]"><ArrowRightLeft className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-bold text-[#1D2939]">جزئیات تسویه</h2>
                    <p className="text-xs text-[#98A2B3]">تاریخ تسویه، بازه استخراج تراکنش‌ها و حساب بانکی مقصد را مشخص کنید.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">تاریخ تسویه <span className="text-rose-500">*</span></Label>
                    <Input type="date" value={settlementDate} onChange={(e) => setSettlementDate(e.target.value)} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                    {errors.settlementDate && <span className="text-xs text-rose-500">{errors.settlementDate}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">تا تاریخ (استخراج تراکنش‌ها)</Label>
                    <Input type="date" value={upToDate} onChange={(e) => setUpToDate(e.target.value)} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                    <p className="text-[10px] text-[#98A2B3]">تراکنش‌های تا این تاریخ استخراج می‌شوند. خالی = همه.</p>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-sm font-semibold text-[#344054]">حساب بانکی مقصد <span className="text-rose-500">*</span></Label>
                    <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      <option value="">انتخاب حساب...</option>
                      {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.bankName} - {b.accountNo}</option>)}
                    </select>
                    {errors.bankAccountId && <span className="text-xs text-rose-500">{errors.bankAccountId}</span>}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">توضیحات</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیحات اختیاری..." className="rounded-[10px] border-[#DCE3EE]" />
                </div>
              </CardContent>
            </Card>

            {/* Transaction selection */}
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#10b981]/10 text-[#10b981]"><CheckSquare className="h-5 w-5" /></span>
                    <div>
                      <h2 className="text-base font-bold text-[#1D2939]">تراکنش‌های قابل تسویه</h2>
                      <p className="text-xs text-[#98A2B3]">فقط تراکنش‌های تأییدشده و تسویه‌نشده قابل انتخاب هستند.</p>
                    </div>
                  </div>
                  {displayTxns.length > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                      {selectedTxns.size === displayTxns.filter((t) => !existingSettlementTxnIds.has(t.id)).length ? 'لغو همه' : 'انتخاب همه'}
                    </Button>
                  )}
                </div>

                {!cardReaderId ? (
                  <div className="rounded-[12px] border border-dashed border-[#DCE3EE] py-12 text-center text-sm text-[#CBD5E1]">ابتدا کارتخوان را انتخاب کنید تا تراکنش‌های قابل تسویه نمایش داده شوند.</div>
                ) : displayTxns.length === 0 ? (
                  <div className="rounded-[12px] border border-dashed border-[#DCE3EE] py-12 text-center text-sm text-[#CBD5E1]">تراکنش قابل تسویه‌ای برای این کارتخوان{upToDate ? ' تا تاریخ انتخاب‌شده' : ''} موجود نیست. فقط تراکنش‌های تأییدشده و تسویه‌نشده قابل انتخاب هستند.</div>
                ) : (
                  <>
                    {errors.txns && <div className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-600">{errors.txns}</div>}
                    <div className="max-h-96 space-y-1.5 overflow-y-auto rounded-lg border border-slate-100 p-2">
                      {displayTxns.map((t) => {
                        const isSelected = selectedTxns.has(t.id);
                        const isLocked = existingSettlementTxnIds.has(t.id);
                        return (
                          <label
                            key={t.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-[10px] border p-3 transition-colors ${
                              isLocked ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-50' :
                              isSelected ? 'border-[#3155E7] bg-[#EFF4FF]' : 'border-[#E6EBF2] bg-white hover:bg-[#F8FAFD]'
                            }`}
                          >
                            <Checkbox
                              checked={isSelected}
                              disabled={isLocked}
                              onCheckedChange={() => toggleTxn(t.id)}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-700">{t.number}</span>
                                <Badge variant="outline" className="text-[9px] text-[#667085]">{TXN_TYPE[t.transactionType] || t.transactionType}</Badge>
                                {isLocked && <Badge variant="outline" className="text-[9px] border-amber-200 text-amber-600">در تسویه دیگر</Badge>}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(t.transactionDate)}</span>
                                {t.trackingNumber && <span>پیگیری: {t.trackingNumber}</span>}
                                {t.referenceNumber && <span>مرجع: {t.referenceNumber}</span>}
                                <span className="flex items-center gap-1"><Hash className="h-3 w-3" />{TXN_STATUS[t.status]}</span>
                              </div>
                            </div>
                            <div className="text-left">
                              <div className="text-sm font-bold text-[#3155E7]">{formatToman(Number(t.amount))}</div>
                              {Number(t.commissionAmount) > 0 && <div className="text-[10px] text-slate-400">کارمزد: {formatToman(Number(t.commissionAmount))}</div>}
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    {/* Totals */}
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-[10px] bg-[#EFF4FF] p-3"><div className="text-xs text-[#667085]">تعداد انتخاب‌شده</div><div className="mt-1 text-sm font-bold text-[#3155E7]">{totals.count.toLocaleString('fa-IR')}</div></div>
                      <div className="rounded-[10px] bg-[#FEF3C7] p-3"><div className="text-xs text-[#667085]">ناخالص</div><div className="mt-1 text-sm font-bold text-[#92400E]">{formatToman(totals.gross)}</div></div>
                      <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">کسورات</div><div className="mt-1 text-sm font-bold text-[#344054]">{formatToman(totals.commission + totals.deductions)}</div></div>
                      <div className="rounded-[10px] bg-[#DCFCE7] p-3"><div className="text-xs text-[#667085]">خالص قابل واریز</div><div className="mt-1 text-sm font-bold text-[#16A34A]">{formatToman(totals.net)}</div></div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Link href="/dashboard/card-reader-settlements">
                <Button type="button" variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE]">انصراف</Button>
              </Link>
              <Button type="submit" disabled={submitting} className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</> : <><Plus className="h-4 w-4" /> ثبت تسویه</>}
              </Button>
            </div>
          </div>

          {/* Guide */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-500"><Lightbulb className="h-5 w-5" /></span>
                  <h2 className="text-base font-bold text-[#1D2939]">راهنمای ثبت تسویه</h2>
                </div>
                <div className="space-y-3">
                  {guideItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F1F5F9] text-[#3155E7]"><item.icon className="h-3.5 w-3.5" /></span>
                      <div>
                        <div className="text-sm font-semibold text-[#344054]">{item.title}</div>
                        <div className="mt-0.5 text-xs text-[#98A2B3]">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex items-start gap-3 rounded-[12px] border border-blue-100 bg-blue-50 p-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
              <p className="text-xs text-blue-700">چرخه کامل: ثبت تسویه (پیش‌نویس) ← ارسال برای تأیید ← تأیید ← ثبت نهایی و واریز (ثبت رسید و سند حسابداری) ← در صورت نیاز: ابطال. در مرحله ثبت نهایی، مبلغ واریزشده با خالص تسویه مقایسه می‌شود و مغایرت ثبت می‌شود.</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
