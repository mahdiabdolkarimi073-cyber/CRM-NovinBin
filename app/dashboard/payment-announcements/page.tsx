'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Megaphone, Plus, Search, Trash2, Eye, Calendar, Wallet,
  Landmark, ArrowDownToLine, FileText, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { formatJalali, formatToman, relativeTime } from '@/lib/format';
import { toast } from 'sonner';
import type { PaymentAnnouncement, BankAccount } from '@/lib/types';

const COUNTERPARTY_LABELS: Record<string, string> = {
  super_admin: 'سوپرادمین',
  admin: 'ادمین',
  personnel: 'پرسنل',
  customer: 'مشتری',
  contact_party: 'طرف حساب',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'پیش‌نویس',
  confirmed: 'تأیید شده',
  cancelled: 'لغو شده',
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#64748b',
  confirmed: '#10b981',
  cancelled: '#ef4444',
};

export default function PaymentAnnouncementsPage() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<PaymentAnnouncement[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [page, setPage] = useState(1);
  const [detailItem, setDetailItem] = useState<PaymentAnnouncement | null>(null);
  const pageSize = 10;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [annData, bankData] = await Promise.all([
        fetchData<PaymentAnnouncement>('payment_announcements', {
          where: {},
          orderBy: { createdAt: 'desc' },
          include: { bankAccount: true, withdrawals: true, cheques: true },
        }),
        fetchData<BankAccount>('bank_accounts', { where: {} }),
      ]);
      setAnnouncements(annData || []);
      setBankAccounts(bankData || []);
    } catch (error: any) {
      toast.error('بارگذاری اعلامیه‌ها ناموفق: ' + error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const bankName = (id: string | null) => {
    if (!id) return null;
    const b = bankAccounts.find((a) => a.id === id);
    return b ? `${b.bankName} - ${b.accountNo}` : null;
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return announcements.filter((a) => {
      const matchesQuery = !query
        || (a.type || '').toLocaleLowerCase().includes(query)
        || (a.description || '').toLocaleLowerCase().includes(query)
        || (COUNTERPARTY_LABELS[a.counterparty] || '').toLocaleLowerCase().includes(query);
      const matchesStatus = filterStatus === 'all' || a.status === filterStatus;
      const matchesType = filterType === 'all' || a.type === filterType;
      return matchesQuery && matchesStatus && matchesType;
    });
  }, [announcements, search, filterStatus, filterType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = useMemo(() => ({
    total: announcements.length,
    totalAmount: announcements.reduce((sum, a) => sum + Number(a.amount || 0), 0),
    confirmed: announcements.filter((a) => a.status === 'confirmed').length,
    draft: announcements.filter((a) => a.status === 'draft').length,
  }), [announcements]);

  const handleDelete = async (id: string) => {
    if (!confirm('حذف این اعلامیه پرداخت؟')) return;
    try {
      await deleteData('payment_announcements', { id });
      toast.success('اعلامیه حذف شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  return (
    <div className="w-full" dir="rtl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">اعلامیه‌های پرداخت</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> مالی <span className="mx-1.5 text-[#CBD5E1]">←</span> اعلامیه‌های پرداخت</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/payment-announcements/new">
            <Button className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
              <Plus className="h-4 w-4" /> اعلامیه جدید
            </Button>
          </Link>
        </div>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#3155E7]/10 text-[#3155E7]"><Megaphone className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.total.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">کل اعلامیه‌ها</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#10b981]/10 text-[#10b981]"><Wallet className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{formatToman(stats.totalAmount)}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">مجموع مبالغ (تومان)</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#f59e0b]/10 text-[#f59e0b]"><FileText className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.draft.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">پیش‌نویس</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#06b6d4]/10 text-[#06b6d4]"><ArrowDownToLine className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.confirmed.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">تأیید شده</div></div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#98A2B3]" />
          <Input placeholder="جستجوی اعلامیه..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-[42px] w-full rounded-[10px] border-[#DCE3EE] bg-white pr-9 text-sm sm:w-[300px]" />
        </div>
        <div className="flex items-center gap-2">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-[42px] rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
            <option value="all">همه وضعیت‌ها</option>
            <option value="draft">پیش‌نویس</option>
            <option value="confirmed">تأیید شده</option>
            <option value="cancelled">لغو شده</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" /></div>
      ) : announcements.length === 0 ? (
        <Card><EmptyState icon={<Megaphone className="h-8 w-8" />} title="اعلامیه‌ای یافت نشد" description="برای شروع، اولین اعلامیه پرداخت را ایجاد کنید" action={<Link href="/dashboard/payment-announcements/new"><Button><Plus className="h-4 w-4" /> افزودن اعلامیه</Button></Link>} /></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="divide-y divide-[#F1F5F9]">
            {pageItems.map((a) => {
              const stColor = STATUS_COLORS[a.status] || '#64748b';
              return (
                <div key={a.id} className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-[#F8FAFD]" onClick={() => setDetailItem(a)}>
                  <div className="h-10 w-2 rounded-full" style={{ backgroundColor: stColor }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-bold text-[#1D2939]">{a.type || 'بدون نوع'}</div>
                      <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: stColor, borderColor: `${stColor}35`, backgroundColor: `${stColor}10` }}>{STATUS_LABELS[a.status] || a.status}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#98A2B3]">
                      <span>طرف مقابل: {COUNTERPARTY_LABELS[a.counterparty] || a.counterparty}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(a.date)}</span>
                      {bankName(a.bankAccountId) && <span className="flex items-center gap-1"><Landmark className="h-3 w-3" />{bankName(a.bankAccountId)}</span>}
                      <span>{relativeTime(a.createdAt)}</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-[#1D2939]">{formatToman(Number(a.amount || 0))}</div>
                    <div className="text-[10px] text-[#98A2B3]">تومان</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setDetailItem(a); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-[#EFF4FF] hover:text-[#2563EB]" title="جزئیات">
                    <Eye className="h-4 w-4" />
                  </button>
                  {isSuperAdmin && (
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(a.id); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-rose-50 hover:text-rose-500" title="حذف">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
            {pageItems.length === 0 && <div className="py-12 text-center text-sm text-[#CBD5E1]">نتیجه‌ای یافت نشد</div>}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#F1F5F9] px-4 py-3">
              <span className="text-xs text-[#667085]">صفحه {currentPage.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCE3EE] text-[#667085] transition-colors hover:bg-[#F1F5F9] disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCE3EE] text-[#667085] transition-colors hover:bg-[#F1F5F9] disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </CardContent></Card>
      )}

      <Dialog open={!!detailItem} onOpenChange={(o) => !o && setDetailItem(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {detailItem && (() => {
            const stColor = STATUS_COLORS[detailItem.status] || '#64748b';
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-3">
                    <DialogTitle className="text-lg">جزئیات اعلامیه پرداخت</DialogTitle>
                    {isSuperAdmin && (
                      <Button size="sm" variant="ghost" className="h-8 shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(detailItem.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge style={{ backgroundColor: `${stColor}20`, color: stColor }}>{STATUS_LABELS[detailItem.status] || detailItem.status}</Badge>
                    <span className="flex items-center gap-1 text-xs text-[#667085]"><Calendar className="h-3.5 w-3.5" />{formatJalali(detailItem.date)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-lg border border-[#E6EBF2] bg-[#FAFBFC] p-4 text-sm">
                    <div><div className="text-xs text-[#98A2B3]">نوع</div><div className="font-semibold text-[#1D2939]">{detailItem.type || '—'}</div></div>
                    <div><div className="text-xs text-[#98A2B3]">طرف مقابل</div><div className="font-semibold text-[#1D2939]">{COUNTERPARTY_LABELS[detailItem.counterparty] || detailItem.counterparty}</div></div>
                    <div><div className="text-xs text-[#98A2B3]">حساب بانکی</div><div className="font-semibold text-[#1D2939]">{bankName(detailItem.bankAccountId) || '—'}</div></div>
                    <div><div className="text-xs text-[#98A2B3]">کارمزد بانکی</div><div className="font-semibold text-[#1D2939]">{formatToman(Number(detailItem.bankFee || 0))} تومان</div></div>
                    <div><div className="text-xs text-[#98A2B3]">مبلغ پرداخت</div><div className="font-bold text-[#3155E7]">{formatToman(Number(detailItem.amount || 0))} تومان</div></div>
                  </div>

                  {detailItem.description && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="whitespace-pre-wrap text-sm text-slate-600">{detailItem.description}</p>
                    </div>
                  )}

                  {/* Withdrawals */}
                  <div className="border-t border-slate-200 pt-4">
                    <div className="mb-3 flex items-center gap-2"><ArrowDownToLine className="h-4 w-4 text-slate-400" /><h4 className="text-sm font-semibold text-slate-700">اعلامیه‌های برداشت</h4><Badge variant="secondary" className="text-xs">{(detailItem.withdrawals || []).length.toLocaleString('fa-IR')}</Badge></div>
                    {(detailItem.withdrawals || []).length === 0 ? (
                      <p className="py-3 text-center text-xs text-slate-400">اعلامیه برداشتی ثبت نشده است</p>
                    ) : (
                      <div className="space-y-2">
                        {(detailItem.withdrawals || []).map((w) => (
                          <div key={w.id} className="rounded-lg border border-[#E6EBF2] bg-white p-3">
                            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                              <div><span className="text-[#98A2B3]">شماره حواله: </span><span className="font-semibold text-[#1D2939]">{w.transferNumber}</span></div>
                              <div><span className="text-[#98A2B3]">تاریخ: </span><span className="font-semibold text-[#1D2939]">{formatJalali(w.date)}</span></div>
                              <div><span className="text-[#98A2B3]">مبلغ: </span><span className="font-semibold text-[#1D2939]">{formatToman(Number(w.amount || 0))}</span></div>
                              <div><span className="text-[#98A2B3]">حساب: </span><span className="font-semibold text-[#1D2939]">{bankName(w.bankAccountId) || '—'}</span></div>
                              <div><span className="text-[#98A2B3]">کارمزد: </span><span className="font-semibold text-[#1D2939]">{formatToman(Number(w.bankFee || 0))}</span></div>
                              {w.description && <div className="col-span-2 sm:col-span-3"><span className="text-[#98A2B3]">توضیحات: </span><span className="text-[#344054]">{w.description}</span></div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cheques */}
                  <div className="border-t border-slate-200 pt-4">
                    <div className="mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-slate-400" /><h4 className="text-sm font-semibold text-slate-700">چک‌های من</h4><Badge variant="secondary" className="text-xs">{(detailItem.cheques || []).length.toLocaleString('fa-IR')}</Badge></div>
                    {(detailItem.cheques || []).length === 0 ? (
                      <p className="py-3 text-center text-xs text-slate-400">چکی ثبت نشده است</p>
                    ) : (
                      <div className="space-y-2">
                        {(detailItem.cheques || []).map((c) => (
                          <div key={c.id} className="rounded-lg border border-[#E6EBF2] bg-white p-3">
                            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                              <div><span className="text-[#98A2B3]">حساب: </span><span className="font-semibold text-[#1D2939]">{bankName(c.bankAccountId) || '—'}</span></div>
                              <div><span className="text-[#98A2B3]">شماره چک: </span><span className="font-semibold text-[#1D2939]">{c.chequeNumber}</span></div>
                              <div><span className="text-[#98A2B3]">شماره صیادی: </span><span className="font-semibold text-[#1D2939]">{c.sayadiNumber || '—'}</span></div>
                              <div><span className="text-[#98A2B3]">مبلغ: </span><span className="font-semibold text-[#1D2939]">{formatToman(Number(c.amount || 0))}</span></div>
                              <div><span className="text-[#98A2B3]">تاریخ: </span><span className="font-semibold text-[#1D2939]">{formatJalali(c.date)}</span></div>
                              <div><span className="text-[#98A2B3]">نوع: </span><span className="font-semibold text-[#1D2939]">{c.type === 'received' ? 'دریافتی' : 'صادری'}</span></div>
                              {c.description && <div className="col-span-2 sm:col-span-4"><span className="text-[#98A2B3]">شرح: </span><span className="text-[#344054]">{c.description}</span></div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
