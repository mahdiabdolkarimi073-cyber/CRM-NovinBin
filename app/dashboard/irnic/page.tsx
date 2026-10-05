'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Trash2, Fingerprint, Search, X, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Identity = { id: string; customerName: string; siteName: string; irnicId: string; password: string; assignedTo: string | null };

export default function IrnicPage() {
  const [records, setRecords] = useState<Identity[]>([]);
  const [search, setSearch] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/irnic');
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'بارگذاری ناموفق بود');
      setRecords(json.data || []);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'بارگذاری ناموفق بود');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!window.confirm('آیا از حذف این شناسه مطمئن هستید؟')) return;
    const response = await fetch(`/api/irnic/${id}`, { method: 'DELETE' });
    const json = await response.json();
    if (!response.ok) { toast.error(json.error || 'حذف ناموفق بود'); return; }
    toast.success('شناسه حذف شد');
    setRecords((current) => current.filter((record) => record.id !== id));
  };

  const filtered = records.filter((record) => [record.customerName, record.siteName, record.irnicId].join(' ').toLocaleLowerCase().includes(search.toLocaleLowerCase()));

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری...</p>
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
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#8B5CF6,#7C3AED)', boxShadow: '0 0 12px rgba(139,92,246,.25)' }} />
              <h1>شناسه ایرنیک</h1>
            </div>
            <p>مدیریت شناسه‌های ایرنیک مشتریان</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/irnic/new" className="nb-new-btn"><Plus className="h-[18px] w-[18px]" /> افزودن شناسه</Link>
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(139,92,246,0.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}><Fingerprint className="h-[22px] w-[22px] text-white" /></div>
          <div className="nb-stat-v2-body"><strong>{records.length.toLocaleString('fa-IR')}</strong><span>کل شناسه‌ها</span></div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }} />
        </div>
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(37,99,235,0.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)' }}><Fingerprint className="h-[22px] w-[22px] text-white" /></div>
          <div className="nb-stat-v2-body"><strong>{filtered.length.toLocaleString('fa-IR')}</strong><span>مورد نمایش</span></div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)' }} />
        </div>
      </section>

      <div className="nb-toolbar">
        <div className="nb-toolbar-left">
          <h2>فهرست شناسه‌ها</h2>
          <span className="nb-count-badge">{filtered.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی مشتری، سایت یا شناسه..." />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><Fingerprint className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>شناسه‌ای یافت نشد</h3>
          <p>برای افزودن شناسه جدید روی دکمه بالا کلیک کنید</p>
          <Link href="/dashboard/irnic/new" className="nb-empty-new-btn"><Plus className="h-4 w-4" /> افزودن شناسه</Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
                <tr>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">نام مشتری</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">نام سایت</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">شناسه ایرنیک</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">رمز عبور</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map((record) => (
                  <tr key={record.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-100">{record.customerName}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{record.siteName}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300" dir="ltr">{record.irnicId}</td>
                    <td className="p-3">
                      <button type="button" className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300" onClick={() => setVisiblePasswords((c) => ({ ...c, [record.id]: !c[record.id] }))}>
                        <span dir="ltr">{visiblePasswords[record.id] ? record.password : '••••••••'}</span>
                        {visiblePasswords[record.id] ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Link href={`/dashboard/irnic/${record.id}/edit`} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-700" title="ویرایش"><Pencil className="h-4 w-4" /></Link>
                        <button onClick={() => remove(record.id)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500" title="حذف"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Link href="/dashboard/irnic/new" className="nb-fab" aria-label="افزودن شناسه"><Plus className="h-6 w-6" /></Link>
    </div>
  );
}
