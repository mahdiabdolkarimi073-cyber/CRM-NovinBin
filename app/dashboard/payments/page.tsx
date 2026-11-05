'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Plus, CreditCard, Clock, Search, X, Loader2, LayoutGrid, List, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import Link from 'next/link';
import { relativeTime, formatJalali, toLocalDateString } from '@/lib/format';
import { tomanShort } from '@/lib/constants';
import { toast } from 'sonner';

const PAYMENT_STATUSES = [
  { key: 'pending', label: 'در انتظار', color: '#f59e0b' },
  { key: 'completed', label: 'تکمیل شده', color: '#10b981' },
  { key: 'cancelled', label: 'لغو شده', color: '#ef4444' },
];

const PAYMENT_METHODS = [
  { key: 'cash', label: 'نقدی' },
  { key: 'cheque', label: 'چک' },
  { key: 'transfer', label: 'انتقال بانکی' },
  { key: 'card', label: 'کارت' },
  { key: 'online', label: 'آنلاین' },
];

const METHOD_LABEL: Record<string, string> = {
  cash: 'نقدی', cheque: 'چک', transfer: 'انتقال بانکی', card: 'کارت', online: 'آنلاین',
};

const statusInfo = (key: string) => PAYMENT_STATUSES.find((s) => s.key === key) || PAYMENT_STATUSES[0];

export default function PaymentsPage() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [filterStatus, setFilterStatus] = useState('all');

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const where = {};
    const pay = await fetchData('payments', { where, orderBy: { createdAt: 'desc' } });
    setPayments(pay || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateStatus = async (id: string, status: string) => {
    try { await updateData('payments', { id }, { status }); loadData(); }
    catch (e: any) { toast.error('تغییر وضعیت ناموفق: ' + e.message); }
  };

  const filtered = payments.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || (p.number || '').toLowerCase().includes(q) || (p.payerName || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const columns = PAYMENT_STATUSES.map((s) => ({ ...s, items: filtered.filter((p) => p.status === s.key) }));

  const stats = [
    {
      label: 'کل پرداخت‌ها', value: payments.length, icon: CreditCard,
      filter: 'all',
      gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
      glow: 'rgba(37,99,235,0.25)',
    },
    {
      label: 'تکمیل شده', value: payments.filter((p) => p.status === 'completed').length, icon: CheckCircle2,
      filter: 'completed',
      gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      glow: 'rgba(34,197,94,0.25)',
    },
    {
      label: 'در انتظار', value: payments.filter((p) => p.status === 'pending').length, icon: Clock3,
      filter: 'pending',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      glow: 'rgba(245,158,11,0.25)',
    },
    {
      label: 'لغو شده', value: payments.filter((p) => p.status === 'cancelled').length, icon: XCircle,
      filter: 'cancelled',
      gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      glow: 'rgba(239,68,68,0.25)',
    },
  ];

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری پرداخت‌ها...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="nb-page" dir="rtl">
      <header className="nb-hero">
        <div className="nb-hero-left">
          <div>
            <div className="nb-hero-title-row">
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#EF4444,#DC2626)', boxShadow: '0 0 12px rgba(239,68,68,.25)' }} />
              <h1>پرداخت‌ها</h1>
            </div>
            <p>ثبت و مدیریت پرداخت‌ها</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/payments/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            پرداخت جدید
          </Link>
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        {stats.map((stat) => (
          <button
            type="button"
            className={`nb-stat-card-v2 ${filterStatus === stat.filter ? 'is-active' : ''}`}
            key={stat.label}
            onClick={() => setFilterStatus(filterStatus === stat.filter ? 'all' : stat.filter)}
            style={{ '--stat-glow': stat.glow } as React.CSSProperties}
          >
            <div className="nb-stat-v2-icon" style={{ background: stat.gradient }}>
              <stat.icon className="h-[22px] w-[22px] text-white" />
            </div>
            <div className="nb-stat-v2-body">
              <strong>{stat.value.toLocaleString('fa-IR')}</strong>
              <span>{stat.label}</span>
            </div>
            <div className="nb-stat-v2-spark" style={{ background: stat.gradient }} />
          </button>
        ))}
      </section>

      <div className="nb-toolbar">
        <div className="nb-toolbar-left">
          <h2>همه پرداخت‌ها</h2>
          <span className="nb-count-badge">{filtered.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی پرداخت..." />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
          </div>
          <div className="nb-view-toggle">
            <button className={viewMode === 'board' ? 'is-active' : ''} onClick={() => setViewMode('board')} aria-label="تخته‌ای"><LayoutGrid className="h-4 w-4" /></button>
            <button className={viewMode === 'list' ? 'is-active' : ''} onClick={() => setViewMode('list')} aria-label="لیستی"><List className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><CreditCard className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>پرداختی ثبت نشده</h3>
          <p>پرداخت‌های ثبت شده در اینجا نمایش داده می‌شوند</p>
          <Link href="/dashboard/payments/new" className="nb-empty-new-btn"><Plus className="h-4 w-4" /> ثبت پرداخت</Link>
        </div>
      ) : viewMode === 'board' ? (
        <div className="grid grid-cols-1 gap-3 mobile:gap-4 tablet:grid-cols-3 desktop:grid-cols-3 pb-4">
          {columns.map((col) => (
            <div key={col.key} className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="flex items-center justify-between border-b-[3px] px-4 py-3" style={{ borderColor: col.color }}>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{col.label}</span>
                </div>
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-md bg-slate-100 px-1.5 text-xs font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-400">{col.items.length.toLocaleString('fa-IR')}</span>
              </div>
              <div className="flex-1 space-y-2.5 overflow-y-auto p-3" style={{ maxHeight: 'calc(100vh - 420px)' }}>
                {col.items.length === 0 && <div className="flex flex-col items-center gap-2 py-8 text-center"><CreditCard className="h-5 w-5 text-slate-300" /><p className="text-xs text-slate-400">موردی وجود ندارد</p></div>}
                {col.items.map((p) => (
                  <div key={p.id} className="nb-card" style={{ borderBottomColor: col.color, borderBottomWidth: 3 }}>
                    <div className="nb-card-top">
                      <span className="text-xs font-mono text-slate-400">{p.number}</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{tomanShort(Number(p.amount))}</span>
                    </div>
                    <p className="nb-card-excerpt">{p.payerName || '—'}</p>
                    <div className="nb-card-footer">
                      <div className="nb-card-date"><Clock className="h-3 w-3" />{relativeTime(p.date)}</div>
                      <span className="text-[11px] text-slate-400">{METHOD_LABEL[p.method] || p.method}</span>
                    </div>
                    <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-700">
                      <Select value={p.status} onValueChange={(v) => updateStatus(p.id, v)}>
                        <SelectTrigger className="h-8 w-full text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{PAYMENT_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
                <tr>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">شماره</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">پرداخت‌کننده</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">مبلغ</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">روش</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">تاریخ</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map((p) => {
                  const st = statusInfo(p.status);
                  return (
                    <tr key={p.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="p-3"><span className="font-mono text-xs text-slate-500 dark:text-slate-400">{p.number}</span></td>
                      <td className="p-3 text-sm text-slate-700 dark:text-slate-200">{p.payerName || '—'}</td>
                      <td className="p-3"><span className="text-sm font-bold text-slate-800 dark:text-slate-100">{tomanShort(Number(p.amount))}</span></td>
                      <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{METHOD_LABEL[p.method] || p.method}</td>
                      <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{formatJalali(p.date)}</td>
                      <td className="p-3">
                        <Select value={p.status} onValueChange={(v) => updateStatus(p.id, v)}>
                          <SelectTrigger className="h-8 text-xs" style={{ color: st.color }}><SelectValue /></SelectTrigger>
                          <SelectContent>{PAYMENT_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Link href="/dashboard/payments/new" className="nb-fab" aria-label="پرداخت جدید"><Plus className="h-6 w-6" /></Link>
    </div>
  );
}
