'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, updateData, deleteData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import {
  Calendar, Plus, Video, MapPin, Clock, UserRound, CalendarDays,
  Eye, CheckCircle2, FileText, TimerReset, Loader2, Search, LayoutGrid,
  List, Filter, Archive, Trash2, Forward, X, Paperclip, Upload,
} from 'lucide-react';
import { formatJalaliDateTime, formatJalali, toLocalDateString, formatFileSize } from '@/lib/format';
import { MEETING_STATUSES, fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type { Meeting, MeetingImage, Profile } from '@/lib/types';

interface ResultFile {
  url: string;
  name: string;
  type: string;
  size: number;
}

interface MeetingWithAssignment extends Meeting {
  assigned_to_name?: string;
  contact_name?: string;
  assigned_to_id?: string;
}

const statusInfo = (key: string) => MEETING_STATUSES.find((s) => s.key === key) || MEETING_STATUSES[0];

export default function MeetingsPage() {
  const { profile } = useAuth();
  const [meetings, setMeetings] = useState<MeetingWithAssignment[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [viewMeeting, setViewMeeting] = useState<MeetingWithAssignment | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [outcomeMeeting, setOutcomeMeeting] = useState<MeetingWithAssignment | null>(null);
  const [outcomeDialogOpen, setOutcomeDialogOpen] = useState(false);
  const [outcomeForm, setOutcomeForm] = useState({ outcome: '', minutes: '' });
  const [savingOutcome, setSavingOutcome] = useState(false);
  const [extendMeeting, setExtendMeeting] = useState<MeetingWithAssignment | null>(null);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [extendDate, setExtendDate] = useState<Date | null>(null);
  const [extendTime, setExtendTime] = useState('');
  const [extending, setExtending] = useState(false);
  const [extendError, setExtendError] = useState('');
  const [extendForm, setExtendForm] = useState({
    title: '', topic: '', location: '', onlineLink: '', agenda: '', staffPhone: '', customerPhone: '',
  });
  const [detailImages, setDetailImages] = useState<MeetingImage[]>([]);
  const [outcomeFiles, setOutcomeFiles] = useState<ResultFile[]>([]);
  const [uploadingOutcome, setUploadingOutcome] = useState(false);
  const [detailResultFiles, setDetailResultFiles] = useState<ResultFile[]>([]);
  const [referOpen, setReferOpen] = useState(false);
  const [referMeetingId, setReferMeetingId] = useState<string | null>(null);
  const [referTargetIds, setReferTargetIds] = useState<string[]>([]);
  const [referring, setReferring] = useState(false);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';
  const isAdmin = profile?.role === 'admin';

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [mtgs, assigns, pers] = await Promise.all([
        fetchData('meetings', { where: {}, orderBy: { date: 'desc' } }),
        fetchData('meeting_assignments', { where: {} }),
        fetchData('profiles', {
          where: {
            userType: 'staff',
            role: { in: ['personnel', 'admin', 'super_admin', 'owner'] },
            active: true,
          },
          orderBy: { firstName: 'asc' },
        }),
      ]);

      const assignMap: Record<string, any> = {};
      (assigns || []).forEach((a: any) => { assignMap[a.meetingId] = a; });

      const profileMap: Record<string, string> = {};
      (pers as Profile[] || []).forEach((p) => {
        profileMap[p.id] = `${p.firstName || ''} ${p.lastName || ''}`.trim();
      });

      let meetingsWithAssign: MeetingWithAssignment[] = (mtgs as Meeting[] || []).map((m) => {
        const a = assignMap[m.id];
        return {
          ...m,
          assigned_to_name: a ? profileMap[a.assignedTo] || '—' : undefined,
          contact_name: a?.contactName || undefined,
          assigned_to_id: a?.assignedTo || undefined,
        };
      });

      if (!isSuperAdmin && !isAdmin) {
        meetingsWithAssign = meetingsWithAssign.filter(
          (m) => m.assigned_to_id === profile.id || m.mainResponsibleId === profile.id
        );
      }

      setMeetings(meetingsWithAssign);
      setStaff(pers as Profile[] || []);
    } catch (error: any) {
      toast.error('بارگذاری جلسات ناموفق: ' + error.message);
    }
    setLoading(false);
  }, [profile, isSuperAdmin, isAdmin]);

  useEffect(() => {
    load();
    fetch('/api/meetings/check-sms', { method: 'POST' }).catch(() => {});
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    return meetings.filter((m) => {
      const title = (m.contact_name || m.title || '').toLocaleLowerCase();
      const topic = (m.topic || '').toLocaleLowerCase();
      const matchesQuery = !q || title.includes(q) || topic.includes(q);
      const matchesStatus = filterStatus === 'all' || m.status === filterStatus;
      const matchesAssignee = filterAssignee === 'all' || m.assigned_to_id === filterAssignee || m.mainResponsibleId === filterAssignee;
      return matchesQuery && matchesStatus && matchesAssignee;
    });
  }, [meetings, search, filterStatus, filterAssignee]);

  const now = new Date();
  const upcoming = filtered.filter((m) => new Date(m.date) >= now && m.status !== 'completed' && m.status !== 'cancelled');
  const past = filtered.filter((m) => new Date(m.date) < now || m.status === 'completed' || m.status === 'cancelled');

  const statusCounts = MEETING_STATUSES.map((s) => ({
    ...s,
    count: filtered.filter((m) => m.status === s.key).length,
  }));

  const stats = useMemo(() => [
    {
      label: 'کل جلسات', value: meetings.length, icon: Calendar,
      filter: 'all',
      gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
      glow: 'rgba(37,99,235,0.25)',
    },
    {
      label: 'برنامه‌ریزی شده', value: meetings.filter((m) => m.status === 'scheduled').length, icon: CalendarDays,
      filter: 'scheduled',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563EB 100%)',
      glow: 'rgba(59,130,246,0.25)',
    },
    {
      label: 'در حال برگزاری', value: meetings.filter((m) => m.status === 'in_progress').length, icon: Clock,
      filter: 'in_progress',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      glow: 'rgba(245,158,11,0.25)',
    },
    {
      label: 'تکمیل شده', value: meetings.filter((m) => m.status === 'completed').length, icon: CheckCircle2,
      filter: 'completed',
      gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      glow: 'rgba(34,197,94,0.25)',
    },
  ], [meetings]);

  const openView = async (m: MeetingWithAssignment) => {
    setViewMeeting(m);
    setViewDialogOpen(true);
    try {
      const imgs = await fetchData<MeetingImage>('meeting_images', {
        where: { meetingId: m.id },
        orderBy: { sortOrder: 'asc' },
      });
      setDetailImages(imgs || []);
    } catch { setDetailImages([]); }
    try {
      const imgs: ResultFile[] = Array.isArray(m.conclusionImages) ? m.conclusionImages : [];
      const docs: ResultFile[] = Array.isArray(m.conclusionAttachments) ? m.conclusionAttachments : [];
      setDetailResultFiles([...imgs, ...docs]);
    } catch { setDetailResultFiles([]); }
  };

  const openOutcome = (m: MeetingWithAssignment) => {
    setOutcomeMeeting(m);
    setOutcomeForm({ outcome: m.outcome || '', minutes: m.minutes || '' });
    setOutcomeFiles([]);
    setOutcomeDialogOpen(true);
    try {
      const existing: ResultFile[] = Array.isArray(m.conclusionAttachments) ? m.conclusionAttachments : [];
      const imgs: ResultFile[] = Array.isArray(m.conclusionImages) ? m.conclusionImages : [];
      setOutcomeFiles([...imgs, ...existing]);
    } catch { setOutcomeFiles([]); }
  };

  const handleOutcomeFileUpload = async (files: FileList) => {
    setUploadingOutcome(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload/meeting-result-file', { method: 'POST', body: formData, credentials: 'include' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'آپلود ناموفق');
        return { url: json.url, name: json.name, type: json.type, size: json.size } as ResultFile;
      });
      const uploaded = await Promise.all(uploadPromises);
      setOutcomeFiles((prev) => [...prev, ...uploaded]);
      toast.success('فایل‌ها آپلود شد');
    } catch (e: any) {
      toast.error('آپلود ناموفق: ' + e.message);
    }
    setUploadingOutcome(false);
  };

  const handleOutcomeSave = async () => {
    if (!outcomeMeeting) return;
    setSavingOutcome(true);
    try {
      const imageFiles = outcomeFiles.filter((f) => f.type.startsWith('image/'));
      const docFiles = outcomeFiles.filter((f) => !f.type.startsWith('image/'));
      await updateData('meetings', { id: outcomeMeeting.id }, {
        outcome: outcomeForm.outcome || null,
        minutes: outcomeForm.minutes || null,
        status: 'completed',
        conclusionImages: imageFiles,
        conclusionAttachments: docFiles,
      });
      toast.success('نتیجه جلسه ثبت شد');
      setOutcomeDialogOpen(false);
      setOutcomeMeeting(null);
      load();
    } catch (e: any) {
      toast.error('ثبت نتیجه ناموفق: ' + e.message);
    }
    setSavingOutcome(false);
  };

  const canExtendMeeting = (m: MeetingWithAssignment) => {
    return isSuperAdmin || m.assigned_to_id === profile?.id || m.mainResponsibleId === profile?.id;
  };

  const openExtend = (m: MeetingWithAssignment) => {
    setExtendMeeting(m);
    const currentEnd = m.endTime ? new Date(m.endTime) : new Date(m.date);
    setExtendDate(currentEnd);
    setExtendTime(currentEnd.toTimeString().slice(0, 5));
    setExtendForm({
      title: m.title || '',
      topic: m.topic || '',
      location: m.location || '',
      onlineLink: m.onlineLink || '',
      agenda: m.agenda || '',
      staffPhone: m.staffPhone || '',
      customerPhone: m.customerPhone || '',
    });
    setExtendError('');
    setExtendDialogOpen(true);
  };

  const handleExtend = async () => {
    if (!extendMeeting || !extendDate) return;
    setExtendError('');
    const originalDate = new Date(extendMeeting.date);
    const [hours, minutes] = extendTime.split(':').map(Number);
    const newEnd = new Date(extendDate);
    newEnd.setHours(hours || 23, minutes || 59, 0, 0);
    const currentEnd = extendMeeting.endTime ? new Date(extendMeeting.endTime) : new Date(extendMeeting.date);
    if (newEnd <= currentEnd) {
      setExtendError('زمان تمدید باید بیشتر از زمان فعلی پایان جلسه باشد');
      return;
    }
    if (newEnd < originalDate) {
      setExtendError('تاریخ تمدید نمی‌تواند قبل از تاریخ ثبت اولیه جلسه باشد');
      return;
    }
    setExtending(true);
    try {
      const res = await fetch(`/api/meetings/${extendMeeting.id}/extend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          newEndTime: newEnd.toISOString(),
          title: extendForm.title,
          topic: extendForm.topic,
          location: extendForm.location,
          onlineLink: extendForm.onlineLink,
          agenda: extendForm.agenda,
          staffPhone: extendForm.staffPhone,
          customerPhone: extendForm.customerPhone,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setExtendError(json.error || 'تمدید ناموفق بود');
      } else {
        toast.success('جلسه با موفقیت تمدید شد');
        setExtendDialogOpen(false);
        setExtendMeeting(null);
        load();
      }
    } catch {
      setExtendError('تمدید ناموفق بود');
    }
    setExtending(false);
  };

  const handleDelete = async (m: MeetingWithAssignment) => {
    if (!confirm(`حذف جلسه «${m.contact_name || m.title}»؟`)) return;
    try {
      await deleteData('meetings', { id: m.id });
      toast.success('جلسه حذف شد');
      load();
    } catch (e: any) {
      toast.error('حذف ناموفق: ' + e.message);
    }
  };

  const openRefer = (m: MeetingWithAssignment) => {
    setReferMeetingId(m.id);
    setReferTargetIds([]);
    setReferOpen(true);
  };

  const toggleReferTarget = (id: string) => {
    setReferTargetIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleRefer = async () => {
    if (!referMeetingId || referTargetIds.length === 0 || !profile) return;
    setReferring(true);
    try {
      const meeting = meetings.find((m) => m.id === referMeetingId);
      const myName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
      const notifPromises: Promise<any>[] = [];
      for (const targetId of referTargetIds) {
        await createData('meeting_assignments', {
          meetingId: referMeetingId,
          assignedTo: targetId,
          contactName: meeting?.contact_name || meeting?.title || '',
          createdBy: profile.id,
        });
        if (targetId !== profile.id) {
          notifPromises.push(
            createData('notifications', {
              profileId: targetId,
              title: 'جلسه‌ای به شما ارجاع داده شد',
              body: `${myName} یک جلسه${meeting ? ` «${meeting.contact_name || meeting.title}»` : ''} را به شما ارجاع داد`,
              type: 'meeting',
              priority: 'normal',
              link: '/dashboard/meetings',
            }).catch(() => {})
          );
        }
      }
      await Promise.all(notifPromises);
      toast.success('جلسه ارجاع داده شد');
      setReferOpen(false);
      setReferMeetingId(null);
      setReferTargetIds([]);
      load();
    } catch (e: any) {
      toast.error('ارجاع ناموفق: ' + e.message);
    }
    setReferring(false);
  };

  const handleArchive = async (m: MeetingWithAssignment) => {
    try {
      await updateData('meetings', { id: m.id }, { isArchived: true });
      toast.success('جلسه به آرشیو منتقل شد');
      load();
    } catch (e: any) {
      toast.error('آرشیو ناموفق: ' + e.message);
    }
  };

  const handleStatClick = (filter: string) => {
    setFilterStatus(filterStatus === filter ? 'all' : filter);
  };

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری جلسات...</p>
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
              <span className="nb-hero-marker" />
              <h1>جلسات</h1>
            </div>
            <p>مدیریت و تخصیص جلسات به پرسنل</p>
          </div>
        </div>
        <div className="nb-hero-right">
          {isSuperAdmin && (
            <Link href="/dashboard/meetings/archive" className="nb-editor-quick-btn">
              <Archive className="h-4 w-4" />
              آرشیو
            </Link>
          )}
          <Link href="/dashboard/meetings/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            جلسه جدید
          </Link>
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        {stats.map((stat) => (
          <button
            type="button"
            className={`nb-stat-card-v2 ${filterStatus === stat.filter ? 'is-active' : ''}`}
            key={stat.label}
            onClick={() => handleStatClick(stat.filter)}
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
          <h2>همه جلسات</h2>
          <span className="nb-count-badge">{filtered.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در جلسات..."
            />
            {search && (
              <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>
            )}
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="nb-select-filter h-10 w-[150px]">
              <Filter className="ml-1 h-4 w-4 text-slate-400" />
              <SelectValue placeholder="وضعیت" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              {MEETING_STATUSES.map((s) => (
                <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="nb-select-filter h-10 w-[150px]">
              <UserRound className="ml-1 h-4 w-4 text-slate-400" />
              <SelectValue placeholder="مسئول" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه مسئولین</SelectItem>
              {staff.map((s) => (
                <SelectItem key={s.id} value={s.id}>{fullName(s.firstName, s.lastName)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="nb-view-toggle">
            <button className={viewMode === 'board' ? 'is-active' : ''} onClick={() => setViewMode('board')} aria-label="تخته‌ای">
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button className={viewMode === 'list' ? 'is-active' : ''} onClick={() => setViewMode('list')} aria-label="لیستی">
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon">
            <Calendar className="h-12 w-12 text-muted-foreground/30" />
          </div>
          <h3>جلسه‌ای یافت نشد</h3>
          <p>اولین جلسه را ایجاد و به پرسنل تخصیص دهید</p>
          <Link href="/dashboard/meetings/new" className="nb-empty-new-btn">
            <Plus className="h-4 w-4" />
            ایجاد جلسه
          </Link>
        </div>
      ) : viewMode === 'board' ? (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section>
              <div className="nb-section-divider">
                <CalendarDays className="h-4 w-4 text-sky-500" />
                <span>جلسات پیشرو ({upcoming.length.toLocaleString('fa-IR')})</span>
              </div>
              <div className="nb-grid nb-grid-grid">
                {upcoming.map((m) => (
                  <MeetingCard
                    key={m.id}
                    meeting={m}
                    upcoming
                    isSuperAdmin={isSuperAdmin}
                    canExtend={canExtendMeeting(m)}
                    onView={() => openView(m)}
                    onDelete={() => handleDelete(m)}
                    onOutcome={() => openOutcome(m)}
                    onExtend={() => openExtend(m)}
                    onArchive={() => handleArchive(m)}
                    onRefer={() => openRefer(m)}
                  />
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <div className="nb-section-divider">
                <Clock className="h-4 w-4 text-slate-400" />
                <span>جلسات گذشته ({past.length.toLocaleString('fa-IR')})</span>
              </div>
              <div className="nb-grid nb-grid-grid">
                {past.map((m) => (
                  <MeetingCard
                    key={m.id}
                    meeting={m}
                    isSuperAdmin={isSuperAdmin}
                    canExtend={canExtendMeeting(m)}
                    onView={() => openView(m)}
                    onDelete={() => handleDelete(m)}
                    onOutcome={() => openOutcome(m)}
                    onExtend={() => openExtend(m)}
                    onArchive={() => handleArchive(m)}
                    onRefer={() => openRefer(m)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
                <tr>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">عنوان</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">تاریخ</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">مسئول</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">وضعیت</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map((m) => {
                  const st = statusInfo(m.status);
                  return (
                    <tr key={m.id} className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={() => openView(m)}>
                      <td className="p-3 font-medium text-slate-900 dark:text-slate-100">{m.contact_name || m.title}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{formatJalali(m.date)}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{m.assigned_to_name || '—'}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: `${st.color}15`, color: st.color }}>
                          {st.label}
                        </span>
                      </td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700" onClick={() => openView(m)}>
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="rounded p-1.5 text-amber-500 hover:bg-amber-50 hover:text-amber-600" onClick={() => openRefer(m)} title="ارجاع">
                            <Forward className="h-4 w-4" />
                          </button>
                          {isSuperAdmin && (
                            <button className="rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(m)}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Link href="/dashboard/meetings/new" className="nb-fab" aria-label="جلسه جدید">
        <Plus className="h-6 w-6" />
      </Link>

      {/* Extend Dialog */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تمدید جلسه</DialogTitle></DialogHeader>
          {extendMeeting && (
            <div className="space-y-4">
              <div className="text-sm text-slate-500">
                جلسه: <span className="font-bold text-slate-900">{extendMeeting.contact_name || extendMeeting.title}</span>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">
                <div className="mb-1 text-slate-400">زمان فعلی پایان جلسه:</div>
                <div className="font-medium">{formatJalaliDateTime(extendMeeting.endTime || extendMeeting.date)}</div>
                <div className="mt-1 text-xs text-amber-600">تاریخ تمدید نمی‌تواند قبل از تاریخ ثبت اولیه ({formatJalali(extendMeeting.date)}) باشد</div>
              </div>
              <div className="space-y-2">
                <Label>عنوان جلسه</Label>
                <Input value={extendForm.title} onChange={(e) => setExtendForm({ ...extendForm, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>موضوع</Label>
                <Input value={extendForm.topic} onChange={(e) => setExtendForm({ ...extendForm, topic: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>تاریخ پایان جدید</Label>
                  <JalaliDatePicker
                    value={extendDate}
                    onChange={(d) => setExtendDate(d || null)}
                    placeholder="انتخاب تاریخ"
                    minDate={new Date(extendMeeting.date)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ساعت پایان جدید</Label>
                  <input type="time" dir="ltr" value={extendTime} onChange={(e) => setExtendTime(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>مکان</Label>
                  <Input value={extendForm.location} onChange={(e) => setExtendForm({ ...extendForm, location: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>لینک آنلاین</Label>
                  <Input value={extendForm.onlineLink} onChange={(e) => setExtendForm({ ...extendForm, onlineLink: e.target.value })} dir="ltr" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>شماره پرسنل</Label>
                  <Input value={extendForm.staffPhone} onChange={(e) => setExtendForm({ ...extendForm, staffPhone: e.target.value })} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>شماره مشتری</Label>
                  <Input value={extendForm.customerPhone} onChange={(e) => setExtendForm({ ...extendForm, customerPhone: e.target.value })} dir="ltr" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>دستور جلسه</Label>
                <Textarea value={extendForm.agenda} onChange={(e) => setExtendForm({ ...extendForm, agenda: e.target.value })} className="min-h-[80px]" />
              </div>
              {extendError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">{extendError}</div>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setExtendDialogOpen(false)}>انصراف</Button>
                <Button onClick={handleExtend} disabled={extending || !extendDate || !extendTime}>
                  {extending ? <Loader2 className="h-4 w-4 animate-spin" /> : <TimerReset className="h-4 w-4" />}
                  تمدید
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>مشاهده جلسه</DialogTitle></DialogHeader>
          {viewMeeting && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-900/20">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">{viewMeeting.contact_name || viewMeeting.title}</div>
                  {viewMeeting.topic && <div className="text-xs text-slate-400">{viewMeeting.topic}</div>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-400">زمان:</span> <span className="font-medium">{formatJalaliDateTime(viewMeeting.date)}</span></div>
                {viewMeeting.endTime && (
                  <div>
                    <span className="text-slate-400">پایان:</span>{' '}
                    <span className="font-medium">{formatJalaliDateTime(viewMeeting.endTime)}</span>
                    {viewMeeting.isExtended && <span className="mr-1 text-xs text-amber-600">(تمدید شده)</span>}
                  </div>
                )}
                {viewMeeting.assigned_to_name && <div><span className="text-slate-400">تخصیص به:</span> <span className="font-medium">{viewMeeting.assigned_to_name}</span></div>}
                {viewMeeting.location && <div><span className="text-slate-400">مکان:</span> <span className="font-medium">{viewMeeting.location}</span></div>}
                {viewMeeting.staffPhone && <div><span className="text-slate-400">شماره پرسنل:</span> <span className="font-medium" dir="ltr">{viewMeeting.staffPhone}</span></div>}
                {viewMeeting.customerPhone && <div><span className="text-slate-400">شماره مشتری:</span> <span className="font-medium" dir="ltr">{viewMeeting.customerPhone}</span></div>}
                {viewMeeting.smsSent && <div><span className="text-slate-400">پیامک:</span> <span className="font-medium text-emerald-600">ارسال شد</span></div>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">وضعیت:</span>
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: `${statusInfo(viewMeeting.status).color}15`, color: statusInfo(viewMeeting.status).color }}>
                  {statusInfo(viewMeeting.status).label}
                </span>
              </div>
              {viewMeeting.onlineLink && (
                <a href={viewMeeting.onlineLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-sky-600 hover:underline">
                  <Video className="h-4 w-4" /> پیوستن به جلسه
                </a>
              )}
              {viewMeeting.agenda && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <span className="mb-1 block text-slate-400">دستور جلسه:</span>
                  {viewMeeting.agenda}
                </div>
              )}
              {viewMeeting.outcome && (
                <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                  <span className="mb-1 flex items-center gap-1 text-emerald-500"><CheckCircle2 className="h-4 w-4" /> نتیجه جلسه:</span>
                  {viewMeeting.outcome}
                </div>
              )}
              {viewMeeting.minutes && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <span className="mb-1 flex items-center gap-1 text-slate-400"><FileText className="h-4 w-4" /> صورت‌جلسه:</span>
                  {viewMeeting.minutes}
                </div>
              )}
              {detailImages.length > 0 && (
                <div>
                  <span className="mb-2 flex items-center gap-1 text-sm text-slate-400"><FileText className="h-4 w-4" /> تصاویر جلسه:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {detailImages.map((img) => (
                      <a key={img.id} href={img.imageUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                        <img src={img.imageUrl} alt={img.fileName || ''} className="h-20 w-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {detailResultFiles.length > 0 && (
                <div>
                  <span className="mb-2 flex items-center gap-1 text-sm text-slate-400"><Paperclip className="h-4 w-4" /> فایل‌های نتیجه جلسه:</span>
                  <div className="space-y-2">
                    {detailResultFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                        {f.type.startsWith('image/') ? (
                          <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                            <img src={f.url} alt={f.name} className="h-10 w-10 rounded object-cover" />
                            <span className="text-sm text-sky-600 hover:underline">{f.name}</span>
                          </a>
                        ) : (
                          <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-slate-400" />
                            <span className="text-sm text-sky-600 hover:underline">{f.name}</span>
                          </a>
                        )}
                        <span className="text-xs text-slate-400">{formatFileSize(f.size)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <Link href={`/dashboard/meetings/${viewMeeting.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-600 transition hover:bg-sky-100">
                  <Eye className="h-3.5 w-3.5" />
                  جزئیات کامل
                </Link>
                <Link href={`/dashboard/meetings/${viewMeeting.id}/edit`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <FileText className="h-3.5 w-3.5" />
                  ویرایش
                </Link>
                {canExtendMeeting(viewMeeting) && new Date(viewMeeting.date) >= new Date() && (
                  <Button type="button" variant="outline" size="sm" onClick={() => { setViewDialogOpen(false); openExtend(viewMeeting); }}>
                    <TimerReset className="h-4 w-4" /> تمدید
                  </Button>
                )}
                {!isSuperAdmin && (
                  <Button type="button" variant="outline" size="sm" onClick={() => { setViewDialogOpen(false); openOutcome(viewMeeting); }}>
                    <CheckCircle2 className="h-4 w-4" /> ثبت نتیجه
                  </Button>
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => { setViewDialogOpen(false); openRefer(viewMeeting); }}>
                  <Forward className="h-4 w-4" /> ارجاع
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Outcome Dialog */}
      <Dialog open={outcomeDialogOpen} onOpenChange={setOutcomeDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>ثبت نتیجه جلسه</DialogTitle></DialogHeader>
          {outcomeMeeting && (
            <div className="space-y-4">
              <div className="text-sm text-slate-500">جلسه: <span className="font-bold text-slate-900">{outcomeMeeting.contact_name || outcomeMeeting.title}</span></div>
              <div className="space-y-2">
                <Label>نتیجه جلسه</Label>
                <Textarea value={outcomeForm.outcome} onChange={(e) => setOutcomeForm({ ...outcomeForm, outcome: e.target.value })} placeholder="نتیجه و تصمیمات جلسه را وارد کنید..." className="min-h-[100px]" />
              </div>
              <div className="space-y-2">
                <Label>صورت‌جلسه (اختیاری)</Label>
                <Textarea value={outcomeForm.minutes} onChange={(e) => setOutcomeForm({ ...outcomeForm, minutes: e.target.value })} placeholder="خلاصه بحث‌ها و مباحث مطرح شده..." className="min-h-[80px]" />
              </div>
              <div className="space-y-2">
                <Label>فایل‌ها و تصاویر (اختیاری)</Label>
                <div className="rounded-lg border-2 border-dashed border-slate-200 p-4 dark:border-slate-700">
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                    multiple
                    className="hidden"
                    id="outcome-file-input"
                    onChange={(e) => e.target.files && handleOutcomeFileUpload(e.target.files)}
                  />
                  <label htmlFor="outcome-file-input" className="flex cursor-pointer flex-col items-center justify-center gap-1">
                    {uploadingOutcome ? (
                      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    ) : (
                      <Upload className="h-6 w-6 text-slate-300" />
                    )}
                    <span className="text-sm text-slate-400">برای آپلود فایل یا تصویر کلیک کنید</span>
                    <span className="text-xs text-slate-300">JPG, PNG, PDF, DOC و ...</span>
                  </label>
                </div>
                {outcomeFiles.length > 0 && (
                  <div className="space-y-2">
                    {outcomeFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                        {f.type.startsWith('image/') ? (
                          <img src={f.url} alt={f.name} className="h-10 w-10 rounded object-cover" />
                        ) : (
                          <FileText className="h-5 w-5 text-slate-400" />
                        )}
                        <span className="flex-1 truncate text-sm text-slate-700 dark:text-slate-300">{f.name}</span>
                        <span className="text-xs text-slate-400">{formatFileSize(f.size)}</span>
                        <button
                          type="button"
                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                          onClick={() => setOutcomeFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOutcomeDialogOpen(false)}>انصراف</Button>
                <Button onClick={handleOutcomeSave} disabled={savingOutcome || uploadingOutcome}>
                  {savingOutcome ? 'در حال ثبت...' : 'ثبت نتیجه'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Refer Dialog */}
      <Dialog open={referOpen} onOpenChange={setReferOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>ارجاع جلسه</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">جلسه را به پرسنل انتخاب‌شده ارجاع دهید. برای هر کدام اعلان درون‌سیستمی ارسال می‌شود.</p>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-700">
              {staff.map((s) => {
                const checked = referTargetIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleReferTarget(s.id)}
                    className={`flex w-full items-center gap-2 rounded-lg p-2 text-right transition ${checked ? 'bg-sky-50 dark:bg-sky-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-xs font-bold text-sky-600 dark:bg-sky-900/30">
                      {(s.firstName?.[0] || '') + (s.lastName?.[0] || '')}
                    </div>
                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{fullName(s.firstName, s.lastName)}</span>
                    {checked && <CheckCircle2 className="h-4 w-4 text-sky-500" />}
                  </button>
                );
              })}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReferOpen(false)}>انصراف</Button>
              <Button onClick={handleRefer} disabled={referring || referTargetIds.length === 0}>
                {referring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Forward className="h-4 w-4" />}
                ارجاع
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MeetingCard({
  meeting, upcoming, isSuperAdmin, canExtend, onView, onDelete, onOutcome, onExtend, onArchive, onRefer,
}: {
  meeting: MeetingWithAssignment;
  upcoming?: boolean;
  isSuperAdmin: boolean;
  canExtend: boolean;
  onView: () => void;
  onDelete: () => void;
  onOutcome: () => void;
  onExtend: () => void;
  onArchive: () => void;
  onRefer: () => void;
}) {
  const st = statusInfo(meeting.status);
  const hasOutcome = !!meeting.outcome;

  return (
    <article
      className="nb-card"
      onClick={onView}
      style={{ borderBottomColor: st.color, borderBottomWidth: 3 }}
    >
      <div className="nb-card-top">
        <div className="nb-card-tags">
          <span className="nb-card-tag" style={{ background: `${st.color}15`, color: st.color }}>
            {st.label}
          </span>
          {meeting.isExtended && (
            <span className="nb-card-tag" style={{ background: 'rgba(245,158,11,.12)', color: '#D97706' }}>
              <TimerReset className="h-2.5 w-2.5" /> تمدید شده
            </span>
          )}
          {!upcoming && hasOutcome && (
            <span className="nb-card-tag" style={{ background: 'rgba(34,197,94,.12)', color: '#22C55E' }}>
              <CheckCircle2 className="h-2.5 w-2.5" /> نتیجه ثبت شده
            </span>
          )}
        </div>
        <div className="nb-card-actions">
          <button className="nb-card-more" onClick={(e) => { e.stopPropagation(); onView(); }}>
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </div>

      <h3 className="nb-card-title">{meeting.contact_name || meeting.title}</h3>
      {meeting.topic && <p className="nb-card-excerpt" style={{ WebkitLineClamp: 1 }}>{meeting.topic}</p>}

      <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span>{formatJalaliDateTime(meeting.date)}</span>
        </div>
        {meeting.assigned_to_name && (
          <div className="flex items-center gap-1.5">
            <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>تخصیص به: <strong className="font-medium text-slate-600 dark:text-slate-300">{meeting.assigned_to_name}</strong></span>
          </div>
        )}
        {meeting.location && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>{meeting.location}</span>
          </div>
        )}
        {meeting.onlineLink && (
          <div className="flex items-center gap-1.5">
            <Video className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <a href={meeting.onlineLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-sky-600 hover:underline">
              پیوستن به جلسه
            </a>
          </div>
        )}
      </div>

      {hasOutcome && (
        <div className="mt-2 rounded-lg bg-emerald-50/50 p-2 text-xs text-emerald-700 dark:bg-emerald-900/10 dark:text-emerald-400" onClick={(e) => e.stopPropagation()}>
          <p className="line-clamp-2">{meeting.outcome}</p>
        </div>
      )}

      <div className="nb-card-footer">
        <div className="nb-card-quick">
          <button onClick={(e) => { e.stopPropagation(); onView(); }}>
            <Eye className="h-3.5 w-3.5" />
          </button>
          {!upcoming && (
            <button className={hasOutcome ? '' : 'is-active'} onClick={(e) => { e.stopPropagation(); onOutcome(); }}>
              <CheckCircle2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onRefer(); }}>
            <Forward className="h-3.5 w-3.5" />
          </button>
          {canExtend && upcoming && (
            <button onClick={(e) => { e.stopPropagation(); onExtend(); }}>
              <TimerReset className="h-3.5 w-3.5" />
            </button>
          )}
          {isSuperAdmin && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onArchive(); }}>
                <Archive className="h-3.5 w-3.5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
