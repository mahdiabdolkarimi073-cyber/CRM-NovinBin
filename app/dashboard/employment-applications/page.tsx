'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type Application = { id: string; fullName: string; formData: any; createdAt: string; step: number; status: string };

export default function EmploymentApplicationsPage() {
  const [records, setRecords] = useState<Application[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [canDelete, setCanDelete] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/data?model=employment_applications');
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'بارگذاری ناموفق بود');
      setRecords(json.data || []);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'بارگذاری ناموفق بود');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    fetch('/api/auth/me').then(r => r.json()).then(d => setCanDelete(d.role === 'owner' || d.role === 'super_admin')).catch(() => {});
  }, []);

  const remove = async (id: string) => {
    if (!window.confirm('آیا از حذف این درخواست مطمئن هستید؟')) return;
    const response = await fetch(`/api/employment-application/${id}`, { method: 'DELETE' });
    const json = await response.json();
    if (!response.ok) { toast.error(json.error || 'حذف ناموفق بود'); return; }
    toast.success('درخواست حذف شد');
    setRecords(current => current.filter(r => r.id !== id));
  };

  const filtered = records.filter(r => r.fullName.toLocaleLowerCase().includes(search.toLocaleLowerCase()));

  const formatDate = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleDateString('fa-IR'); } catch { return dateStr; }
  };

  return (
    <div className="create-task-page" dir="rtl"><div className="create-task-container">
      <header className="create-task-header"><div><div className="create-task-title"><span className="title-accent-bar" /><h1>درخواست‌های استخدام</h1></div><div className="create-task-breadcrumb">داشبورد <b>←</b> درخواست‌های استخدام</div></div></header>
      <Card className="border-[#E7ECF3] shadow-[0_3px_14px_rgba(20,40,80,.05)]"><CardContent className="p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-[#101828]">فهرست درخواست‌ها</h2><p className="mt-1 text-xs text-[#667085]">تمام درخواست‌های استخدام ثبت‌شده</p></div><Input className="h-10 max-w-xs" placeholder="جستجوی نام..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        {loading ? <div className="py-16 text-center text-sm text-slate-400">در حال بارگذاری...</div> : filtered.length === 0 ? <div className="py-16 text-center text-sm text-slate-400">درخواستی یافت نشد.</div> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-right"><thead><tr className="border-b border-slate-100 text-xs text-slate-500"><th className="px-4 py-4 font-semibold">نام و نام خانوادگی</th><th className="px-4 py-4 font-semibold">تاریخ تولد</th><th className="px-4 py-4 font-semibold">تلفن تماس</th><th className="px-4 py-4 font-semibold">تاریخ ثبت</th><th className="px-4 py-4 font-semibold">مرحله</th><th className="px-4 py-4 font-semibold">عملیات</th></tr></thead><tbody>{filtered.map(r => <tr key={r.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/70"><td className="px-4 py-4 text-sm font-semibold text-[#1D2939]">{r.fullName}</td><td className="px-4 py-4 text-sm text-[#475467]">{r.formData?.birthDate || '—'}</td><td className="px-4 py-4 text-sm text-[#475467]">{r.formData?.phone || '—'}</td><td className="px-4 py-4 text-sm text-[#475467]">{formatDate(r.createdAt)}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${r.step === 2 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{r.step === 2 ? 'تکمیل شده' : 'مرحله اول'}</span></td><td className="px-4 py-4"><div className="flex items-center gap-1"><Link href={`/dashboard/employment-applications/${r.id}`}><Button size="icon" variant="ghost" className="text-slate-400 hover:text-blue-600"><Eye className="h-4 w-4" /></Button></Link>{canDelete && <Button size="icon" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>}</div></td></tr>)}</tbody></table></div>
        )}
      </CardContent></Card>
    </div></div>
  );
}
