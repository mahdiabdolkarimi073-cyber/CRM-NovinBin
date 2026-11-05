'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Undo2, Plus, Search, X, Loader2 } from 'lucide-react';
import { formatToman, formatJalali } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';

const TYPE_LABEL: Record<string, string> = { sales: 'فروش', purchase: 'خرید' };

export default function ReturnsPage() {
  const { profile } = useAuth();
  const [returns, setReturns] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'sales' | 'purchase'>('sales');

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [rets, cust] = await Promise.all([
        fetchData('sales_returns', { where: {}, orderBy: { createdAt: 'desc' }, include: { items: true } }),
        fetchData('customers', { where: {} }),
      ]);
      setReturns(rets || []);
      setCustomers(cust || []);
    } catch (error: any) {
      toast.error('بارگذاری ناموفق: ' + error.message);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);

  const getCustomerName = (id: string | null) => {
    if (!id) return '—';
    const c = customers.find((c) => c.id === id);
    return c ? (c.type === 'company' ? c.companyName : fullName(c.firstName, c.lastName)) : '—';
  };

  const filtered = returns.filter((r) => r.type === activeTab);
  const filteredBySearch = search
    ? filtered.filter((r) => {
        const q = search.toLowerCase();
        return (r.number || '').toLowerCase().includes(q) || (r.supplierName || '').toLowerCase().includes(q);
      })
    : filtered;

  return (
    <div className="nb-page" dir="rtl">
      <header className="nb-hero">
        <div className="nb-hero-left">
          <div>
            <div className="nb-hero-title-row">
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#EF4444,#DC2626)', boxShadow: '0 0 12px rgba(239,68,68,.25)' }} />
              <h1>مرجوعی</h1>
            </div>
            <p>مدیریت مرجوعی فروش و خرید</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/returns/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            مرجوعی جدید
          </Link>
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(239,68,68,0.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}><Undo2 className="h-[22px] w-[22px] text-white" /></div>
          <div className="nb-stat-v2-body"><strong>{returns.filter(r => r.type === 'sales').length.toLocaleString('fa-IR')}</strong><span>مرجوعی فروش</span></div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }} />
        </div>
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(245,158,11,0.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}><Undo2 className="h-[22px] w-[22px] text-white" /></div>
          <div className="nb-stat-v2-body"><strong>{returns.filter(r => r.type === 'purchase').length.toLocaleString('fa-IR')}</strong><span>مرجوعی خرید</span></div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }} />
        </div>
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(37,99,235,0.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)' }}><Undo2 className="h-[22px] w-[22px] text-white" /></div>
          <div className="nb-stat-v2-body"><strong>{returns.length.toLocaleString('fa-IR')}</strong><span>کل مرجوعی‌ها</span></div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)' }} />
        </div>
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(34,197,94,0.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)' }}><Undo2 className="h-[22px] w-[22px] text-white" /></div>
          <div className="nb-stat-v2-body"><strong>{filteredBySearch.length.toLocaleString('fa-IR')}</strong><span>مورد نمایش</span></div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)' }} />
        </div>
      </section>

      <div className="nb-toolbar">
        <div className="nb-toolbar-left">
          <h2>مرجوعی {activeTab === 'sales' ? 'فروش' : 'خرید'}</h2>
          <span className="nb-count-badge">{filteredBySearch.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو بر اساس شماره / تأمین‌کننده..." />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'sales' | 'purchase')}>
        <TabsList className="mb-4">
          <TabsTrigger value="sales">مرجوعی فروش</TabsTrigger>
          <TabsTrigger value="purchase">مرجوعی خرید</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {loading ? (
            <div className="nb-empty">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
              <p>در حال بارگذاری مرجوعی‌ها...</p>
            </div>
          ) : filteredBySearch.length === 0 ? (
            <div className="nb-empty">
              <div className="sb-empty-icon"><Undo2 className="h-12 w-12 text-muted-foreground/30" /></div>
              <h3>مرجوعی یافت نشد</h3>
              <p>اولین مرجوعی را ثبت کنید</p>
              <Link href="/dashboard/returns/new" className="nb-empty-new-btn"><Plus className="h-4 w-4" /> مرجوعی جدید</Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
                    <tr>
                      <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">شماره</th>
                      <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">نوع</th>
                      <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">{activeTab === 'sales' ? 'مشتری' : 'تأمین‌کننده'}</th>
                      <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">تاریخ</th>
                      <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">علت</th>
                      <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">مبلغ نهایی</th>
                      <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredBySearch.map((r) => (
                      <tr key={r.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="p-3"><span className="font-mono text-xs text-slate-500 dark:text-slate-400">{r.number}</span></td>
                        <td className="p-3"><Badge variant="secondary">{TYPE_LABEL[r.type]}</Badge></td>
                        <td className="p-3 text-sm text-slate-600 dark:text-slate-300">{activeTab === 'sales' ? getCustomerName(r.customerId) : r.supplierName || '—'}</td>
                        <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{formatJalali(r.issueDate)}</td>
                        <td className="p-3 text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{r.returnReason || '—'}</td>
                        <td className="p-3"><span className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatToman(Number(r.finalAmount))} ت</span></td>
                        <td className="p-3"><Badge variant="outline">{r.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
