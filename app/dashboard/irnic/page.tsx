'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

  return (
    <div className="create-task-page" dir="rtl">
      <div className="create-task-container">
        <header className="create-task-header">
          <div><div className="create-task-title"><span className="title-accent-bar" /><h1>مدیریت شناسه ایرنیک</h1></div><div className="create-task-breadcrumb">داشبورد <b>←</b> مدیریت شناسه ایرنیک</div></div>
          <Link href="/dashboard/irnic/new"><Button className="bg-[#3155E7] text-white hover:bg-[#2445C7]"><Plus className="h-4 w-4" /> افزودن شناسه جدید</Button></Link>
        </header>
        <Card className="border-[#E7ECF3] shadow-[0_3px_14px_rgba(20,40,80,.05)]"><CardContent className="p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-[#101828]">فهرست شناسه‌ها</h2><p className="mt-1 text-xs text-[#667085]">اطلاعات دسترسی سایت‌های مشتریان را مدیریت کنید.</p></div><Input className="h-10 max-w-xs" placeholder="جستجوی مشتری، سایت یا شناسه..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          {loading ? <div className="py-16 text-center text-sm text-slate-400">در حال بارگذاری...</div> : filtered.length === 0 ? <div className="py-16 text-center text-sm text-slate-400">شناسه‌ای یافت نشد.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-right"><thead><tr className="border-b border-slate-100 text-xs text-slate-500"><th className="px-4 py-4 font-semibold">نام مشتری</th><th className="px-4 py-4 font-semibold">نام سایت</th><th className="px-4 py-4 font-semibold">شناسه ایرنیک</th><th className="px-4 py-4 font-semibold">رمز عبور</th><th className="px-4 py-4 font-semibold">عملیات</th></tr></thead><tbody>{filtered.map((record) => <tr key={record.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/70"><td className="px-4 py-4 text-sm font-semibold text-[#1D2939]">{record.customerName}</td><td className="px-4 py-4 text-sm text-[#475467]">{record.siteName}</td><td className="px-4 py-4 text-sm text-[#475467]" dir="ltr">{record.irnicId}</td><td className="px-4 py-4"><button type="button" className="flex items-center gap-2 text-sm text-[#475467]" onClick={() => setVisiblePasswords((current) => ({ ...current, [record.id]: !current[record.id] }))}><span dir="ltr">{visiblePasswords[record.id] ? record.password : '••••••••'}</span>{visiblePasswords[record.id] ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}</button></td><td className="px-4 py-4"><div className="flex items-center gap-1"><Link href={`/dashboard/irnic/${record.id}/edit`}><Button size="icon" variant="ghost" className="text-slate-400 hover:text-blue-600"><Pencil className="h-4 w-4" /></Button></Link><Button size="icon" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={() => remove(record.id)}><Trash2 className="h-4 w-4" /></Button></div></td></tr>)}</tbody></table></div>}
        </CardContent></Card>
      </div>
    </div>
  );
}
