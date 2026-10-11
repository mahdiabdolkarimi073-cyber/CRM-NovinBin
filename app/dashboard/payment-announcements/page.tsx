'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Megaphone, Plus, Search, Trash2, Eye, Calendar, Wallet,
  Landmark, ArrowDownToLine, FileText, ChevronLeft, ChevronRight, X,
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

  const statsArr = useMemo(() => [
    { label: 'کل اعلامیه‌ها', value: stats.total.toLocaleString('fa-IR'), icon: Megaphone, gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)', glow: 'rgba(37,99,235,0.25)' },
    { label: 'مجموع مبالغ (تومان)', value: formatToman(stats.totalAmount), icon: Wallet, gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)', glow: 'rgba(34,197,94,0.25)' },
    { label: 'پیش‌نویس', value: stats.draft.toLocaleString('fa-IR'), icon: FileText, gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', glow: 'rgba(245,158,11,0.25)' },
    { label: 'تأیید شده', value: stats.confirmed.toLocaleString('fa-IR'), icon: ArrowDownToLine, gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', glow: 'rgba(6,182,212,0.25)' },
  ], [stats]);

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
    <div className="nb-page" dir="rtl">
      <header className="nb-hero">
        <div className="nb-hero-left">
          <div>
            <div className="nb-hero-title-row">
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#FF7A00,#E65100)', boxShadow: '0 0 12px rgba(255,122,0,.25)' }} />
              <h1>اعلامیه‌های پرداخت</h1>
            </div>
            <p>مدیریت اعلامیه‌های پرداخت و برداشت‌های مالی</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/payment-announcements/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            اعلامیه جدید
          </Link>
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        {statsArr.map((stat) => (
          <div className="nb-stat-card-v2" key={stat.label} style={{ '--stat-glow': stat.glow } as React.CSSProperties}>
            <div className="nb-stat-v2-icon" style={{ background: stat.gradient }}>
              <stat.icon className="h-[22px] w-[22px] text-white" />
            </div>
            <div className="nb-stat-v2-body">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
            <div className="nb-stat-v2-spark" style={{ background: stat.gradient }} />
          </div>
        ))}
      </section>

      <div className="nb-toolbar">
        <div className="nb-toolbar-left">
          <h2>همه اعلامیه‌ها</h2>
          <span className="nb-count-badge">{filtered.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجوی اعلامیه..."
            />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="nb-select-filter h-10 w-[140px] rounded-[10px] border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <option value="all">همه وضعیت‌ها</option>
            <option value="draft">پیش‌نویس</option>
            <option value="confirmed">تأیید شده</option>
            <option value="cancelled">لغو شده</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="nb-empty">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-[#2563EB] dark:border-slate-700 dark:border-t-[#2563EB]" />
          <p>در حال بارگذاری...</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><Megaphone className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>اعلامیه‌ای یافت نشد</h3>
          <p>برای شروع، اولین اعلامیه پرداخت را ایجاد کنید</p>
          <Link href="/dashboard/payment-announcements/new" className="nb-empty-new-btn"><Plus className="h-4 w-4" /> افزودن اعلامیه</Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {pageItems.map((a) => {
              const stColor = STATUS_COLORS[a.status] || '#64748b';
              return (
                <div key={a.id} className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={() => setDetailItem(a)}>
                  <div className="h-10 w-2 shrink-0 rounded-full" style={{ backgroundColor: stColor }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{a.type || 'بدون نوع'}</div>
                      <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: stColor, borderColor: `${stColor}35`, backgroundColor: `${stColor}10` }}>{STATUS_LABELS[a.status] || a.status}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>طرف مقابل: {COUNTERPARTY_LABELS[a.counterparty] || a.counterparty}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(a.date)}</span>
                      {bankName(a.bankAccountId) && <span className="flex items-center gap-1"><Landmark className="h-3 w-3" />{bankName(a.bankAccountId)}</span>}
                      <span>{relativeTime(a.createdAt)}</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatToman(Number(a.amount || 0))}</div>
                    <div className="text-[10px] text-slate-400">تومان</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setDetailItem(a); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700" title="جزئیات">
                    <Eye className="h-4 w-4" />
                  </button>
                  {isSuperAdmin && (
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(a.id); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20" title="حذف">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
            {pageItems.length === 0 && <div className="py-12 text-center text-sm text-slate-400 dark:text-slate-500">نتیجه‌ای یافت نشد</div>}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-700">
              <span className="text-xs text-slate-500 dark:text-slate-400">صفحه {currentPage.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/50"><ChevronRight className="h-4 w-4" /></button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/50"><ChevronLeft className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </div>
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
                      <button onClick={() => handleDelete(detailItem.id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20" title="حذف">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge style={{ backgroundColor: `${stColor}20`, color: stColor }}>{STATUS_LABELS[detailItem.status] || detailItem.status}</Badge>
                    <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"><Calendar className="h-3.5 w-3.5" />{formatJalali(detailItem.date)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/50">
                    <div><div className="text-xs text-slate-400">نوع</div><div className="font-semibold text-slate-800 dark:text-slate-100">{detailItem.type || '—'}</div></div>
                    <div><div className="text-xs text-slate-400">طرف مقابل</div><div className="font-semibold text-slate-800 dark:text-slate-100">{COUNTERPARTY_LABELS[detailItem.counterparty] || detailItem.counterparty}</div></div>
                    <div><div className="text-xs text-slate-400">حساب بانکی</div><div className="font-semibold text-slate-800 dark:text-slate-100">{bankName(detailItem.bankAccountId) || '—'}</div></div>
                    <div><div className="text-xs text-slate-400">کارمزد بانکی</div><div className="font-semibold text-slate-800 dark:text-slate-100">{formatToman(Number(detailItem.bankFee || 0))} تومان</div></div>
                    <div><div className="text-xs text-slate-400">مبلغ پرداخت</div><div className="font-bold text-blue-600 dark:text-blue-400">{formatToman(Number(detailItem.amount || 0))} تومان</div></div>
                  </div>

                  {detailItem.description && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                      <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{detailItem.description}</p>
                    </div>
                  )}

                  {/* Withdrawals */}
                  <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                    <div className="mb-3 flex items-center gap-2"><ArrowDownToLine className="h-4 w-4 text-slate-400" /><h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">اعلامیه‌های برداشت</h4><Badge variant="secondary" className="text-xs">{(detailItem.withdrawals || []).length.toLocaleString('fa-IR')}</Badge></div>
                    {(detailItem.withdrawals || []).length === 0 ? (
                      <p className="py-3 text-center text-xs text-slate-400">اعلامیه برداشتی ثبت نشده است</p>
                    ) : (
                      <div className="space-y-2">
                        {(detailItem.withdrawals || []).map((w) => (
                          <div key={w.id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                              <div><span className="text-slate-400">شماره حواله: </span><span className="font-semibold text-slate-700 dark:text-slate-200">{w.transferNumber}</span></div>
                              <div><span className="text-slate-400">تاریخ: </span><span className="font-semibold text-slate-700 dark:text-slate-200">{formatJalali(w.date)}</span></div>
                              <div><span className="text-slate-400">مبلغ: </span><span className="font-semibold text-slate-700 dark:text-slate-200">{formatToman(Number(w.amount || 0))}</span></div>
                              <div><span className="text-slate-400">حساب: </span><span className="font-semibold text-slate-700 dark:text-slate-200">{bankName(w.bankAccountId) || '—'}</span></div>
                              <div><span className="text-slate-400">کارمزد: </span><span className="font-semibold text-slate-700 dark:text-slate-200">{formatToman(Number(w.bankFee || 0))}</span></div>
                              {w.description && <div className="col-span-2 sm:col-span-3"><span className="text-slate-400">توضیحات: </span><span className="text-slate-600 dark:text-slate-300">{w.description}</span></div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cheques */}
                  <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                    <div className="mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-slate-400" /><h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">چک‌های من</h4><Badge variant="secondary" className="text-xs">{(detailItem.cheques || []).length.toLocaleString('fa-IR')}</Badge></div>
                    {(detailItem.cheques || []).length === 0 ? (
                      <p className="py-3 text-center text-xs text-slate-400">چکی ثبت نشده است</p>
                    ) : (
                      <div className="space-y-2">
                        {(detailItem.cheques || []).map((c) => (
                          <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                              <div><span className="text-slate-400">حساب: </span><span className="font-semibold text-slate-700 dark:text-slate-200">{bankName(c.bankAccountId) || '—'}</span></div>
                              <div><span className="text-slate-400">شماره چک: </span><span className="font-semibold text-slate-700 dark:text-slate-200">{c.chequeNumber}</span></div>
                              <div><span className="text-slate-400">شماره صیادی: </span><span className="font-semibold text-slate-700 dark:text-slate-200">{c.sayadiNumber || '—'}</span></div>
                              <div><span className="text-slate-400">مبلغ: </span><span className="font-semibold text-slate-700 dark:text-slate-200">{formatToman(Number(c.amount || 0))}</span></div>
                              <div><span className="text-slate-400">تاریخ: </span><span className="font-semibold text-slate-700 dark:text-slate-200">{formatJalali(c.date)}</span></div>
                              <div><span className="text-slate-400">نوع: </span><span className="font-semibold text-slate-700 dark:text-slate-200">{c.type === 'received' ? 'دریافتی' : 'صادری'}</span></div>
                              {c.description && <div className="col-span-2 sm:col-span-4"><span className="text-slate-400">شرح: </span><span className="text-slate-600 dark:text-slate-300">{c.description}</span></div>}
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
