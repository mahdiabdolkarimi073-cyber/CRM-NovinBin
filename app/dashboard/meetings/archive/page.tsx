'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Calendar, Archive, Loader2, Search, Trash2, RotateCcw, Eye,
  Clock, UserRound, MapPin,
} from 'lucide-react';
import { formatJalaliDateTime } from '@/lib/format';
import { MEETING_STATUSES } from '@/lib/constants';
import { toast } from 'sonner';
import type { Meeting, Profile } from '@/lib/types';

const statusInfo = (key: string) => MEETING_STATUSES.find((s) => s.key === key) || MEETING_STATUSES[0];

interface MeetingWithAssignment extends Meeting {
  assigned_to_name?: string;
  contact_name?: string;
}

export default function MeetingsArchivePage() {
  const { profile } = useAuth();
  const [meetings, setMeetings] = useState<MeetingWithAssignment[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [mtgs, assigns, pers] = await Promise.all([
        fetchData('meetings', { where: { isArchived: true }, orderBy: { date: 'desc' } }),
        fetchData('meeting_assignments', { where: {} }),
        fetchData('profiles', {
          where: { userType: 'staff', role: { in: ['personnel', 'admin', 'super_admin', 'owner'] }, active: true },
        }),
      ]);
      const assignMap: Record<string, any> = {};
      (assigns || []).forEach((a: any) => { assignMap[a.meetingId] = a; });
      const profileMap: Record<string, string> = {};
      (pers as Profile[] || []).forEach((p) => {
        profileMap[p.id] = `${p.firstName || ''} ${p.lastName || ''}`.trim();
      });
      const meetingsWithAssign: MeetingWithAssignment[] = (mtgs as Meeting[] || []).map((m) => {
        const a = assignMap[m.id];
        return {
          ...m,
          assigned_to_name: a ? profileMap[a.assignedTo] || '—' : undefined,
          contact_name: a?.contactName || undefined,
        };
      });
      setMeetings(meetingsWithAssign);
      setStaff(pers as Profile[] || []);
    } catch (error: any) {
      toast.error('بارگذاری آرشیو ناموفق: ' + error.message);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    return meetings.filter((m) => {
      const title = (m.contact_name || m.title || '').toLocaleLowerCase();
      const matchesQuery = !q || title.includes(q) || (m.topic || '').toLocaleLowerCase().includes(q);
      const matchesStatus = filterStatus === 'all' || m.status === filterStatus;
      return matchesQuery && matchesStatus;
    });
  }, [meetings, search, filterStatus]);

  const handleUnarchive = async (m: MeetingWithAssignment) => {
    try {
      await updateData('meetings', { id: m.id }, { isArchived: false });
      toast.success('جلسه از آرشیو خارج شد');
      load();
    } catch (e: any) {
      toast.error('خارج کردن از آرشیو ناموفق: ' + e.message);
    }
  };

  const handleDelete = async (m: MeetingWithAssignment) => {
    if (!confirm(`حذف قطعی جلسه «${m.contact_name || m.title}»؟`)) return;
    try {
      await deleteData('meetings', { id: m.id });
      toast.success('جلسه حذف شد');
      load();
    } catch (e: any) {
      toast.error('حذف ناموفق: ' + e.message);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center" dir="rtl">
        <Archive className="h-10 w-10 text-slate-300" />
        <strong className="mt-3 text-slate-700">دسترسی محدود</strong>
        <span className="text-sm text-slate-400">این صفحه فقط برای مدیران ارشد قابل دسترس است.</span>
        <Link href="/dashboard/meetings" className="mt-4 text-sm text-sky-600 hover:underline">بازگشت به جلسات</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6" dir="rtl">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-7 w-1.5 rounded-full bg-slate-400" />
            <h1 className="text-2xl font-bold text-slate-900">آرشیو جلسات</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">جلسات آرشیو شده ({meetings.length.toLocaleString('fa-IR')})</p>
        </div>
        <Link href="/dashboard/meetings" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
          <Calendar className="h-4 w-4" />
          بازگشت به جلسات
        </Link>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو در آرشیو..." className="pr-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="وضعیت" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه وضعیت‌ها</SelectItem>
            {MEETING_STATUSES.map((s) => (
              <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16">
          <Archive className="h-10 w-10 text-slate-300" />
          <strong className="mt-3 text-slate-700">جلسه‌ای در آرشیو وجود ندارد</strong>
          <span className="text-sm text-slate-400">جلسات آرشیو شده اینجا نمایش داده می‌شوند</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => {
            const st = statusInfo(m.status);
            return (
              <article key={m.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-slate-900">{m.contact_name || m.title}</h3>
                    {m.topic && <p className="mt-0.5 truncate text-xs text-slate-400">{m.topic}</p>}
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: `${st.color}15`, color: st.color }}>
                    {st.label}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>{formatJalaliDateTime(m.date)}</span>
                  </div>
                  {m.assigned_to_name && (
                    <div className="flex items-center gap-1.5">
                      <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span>{m.assigned_to_name}</span>
                    </div>
                  )}
                  {m.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span>{m.location}</span>
                    </div>
                  )}
                </div>
                {m.outcome && (
                  <div className="mt-2 rounded-lg bg-emerald-50/50 p-2 text-xs text-emerald-700">
                    <p className="line-clamp-2">{m.outcome}</p>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3">
                  <Link href={`/dashboard/meetings/${m.id}`} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100">
                    <Eye className="h-3.5 w-3.5" /> مشاهده
                  </Link>
                  <button className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-sky-600 transition hover:bg-sky-50" onClick={() => handleUnarchive(m)}>
                    <RotateCcw className="h-3.5 w-3.5" /> بازگردانی
                  </button>
                  <button className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(m)}>
                    <Trash2 className="h-3.5 w-3.5" /> حذف
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
