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
  Clock, UserRound, MapPin, CheckCircle2, X,
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
      <div className="nb-empty" dir="rtl" style={{ minHeight: '60vh' }}>
        <div className="sb-empty-icon">
          <Archive className="h-12 w-12 text-muted-foreground/30" />
        </div>
        <h3>دسترسی محدود</h3>
        <p>این صفحه فقط برای مدیران ارشد قابل دسترس است.</p>
        <Link href="/dashboard/meetings" className="nb-editor-back" style={{ marginTop: 12 }}>بازگشت به جلسات</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری آرشیو...</p>
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
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#64748B,#475569)' }} />
              <h1>آرشیو جلسات</h1>
            </div>
            <p>جلسات آرشیو شده ({meetings.length.toLocaleString('fa-IR')})</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/meetings" className="nb-editor-back">
            <Calendar className="h-4 w-4" />
            بازگشت به جلسات
          </Link>
        </div>
      </header>

      <div className="nb-toolbar">
        <div className="nb-toolbar-left">
          <h2>جلسات آرشیو شده</h2>
          <span className="nb-count-badge">{filtered.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در آرشیو..."
            />
            {search && (
              <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>
            )}
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-10 w-[150px]">
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
      </div>

      {filtered.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon">
            <Archive className="h-12 w-12 text-muted-foreground/30" />
          </div>
          <h3>جلسه‌ای در آرشیو وجود ندارد</h3>
          <p>جلسات آرشیو شده اینجا نمایش داده می‌شوند</p>
        </div>
      ) : (
        <div className="nb-grid nb-grid-grid">
          {filtered.map((m) => {
            const st = statusInfo(m.status);
            return (
              <article
                key={m.id}
                className="nb-card"
                style={{ borderBottomColor: st.color, borderBottomWidth: 3, opacity: 0.85 }}
              >
                <div className="nb-card-top">
                  <div className="nb-card-tags">
                    <span className="nb-card-tag" style={{ background: `${st.color}15`, color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                  <div className="nb-card-actions">
                    <Link href={`/dashboard/meetings/${m.id}`} className="nb-card-more" onClick={(e) => e.stopPropagation()}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                <h3 className="nb-card-title">{m.contact_name || m.title}</h3>
                {m.topic && <p className="nb-card-excerpt" style={{ WebkitLineClamp: 1 }}>{m.topic}</p>}

                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
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
                  <div className="mt-2 rounded-lg bg-emerald-50/50 p-2 text-xs text-emerald-700 dark:bg-emerald-900/10 dark:text-emerald-400">
                    <p className="line-clamp-2">{m.outcome}</p>
                  </div>
                )}

                <div className="nb-card-footer">
                  <div className="nb-card-quick">
                    <Link href={`/dashboard/meetings/${m.id}`} onClick={(e) => e.stopPropagation()}>
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                    <button className="is-active" onClick={(e) => { e.stopPropagation(); handleUnarchive(m); }} title="بازگردانی">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(m); }} title="حذف قطعی">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
