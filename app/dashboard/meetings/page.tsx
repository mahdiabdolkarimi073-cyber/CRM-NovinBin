'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, updateData, deleteData } from '@/lib/data-client';
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
  List, Filter, Archive, Trash2, Forward, Check,
} from 'lucide-react';
import { formatJalaliDateTime, formatJalali, toLocalDateString, formatFileSize } from '@/lib/format';
import { MEETING_STATUSES, fullName } from '@/lib/constants';
import { createData } from '@/lib/data-client';
import { toast } from 'sonner';
import type { Meeting, MeetingImage, Profile } from '@/lib/types';
import { Upload, Paperclip, X, Image as ImageIcon } from 'lucide-react';

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

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6" dir="rtl">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-7 w-1.5 rounded-full bg-sky-500" />
            <h1 className="text-2xl font-bold text-slate-900">جلسات</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">مدیریت و تخصیص جلسات به پرسنل</p>
        </div>
        <div className="flex gap-2">
          {isSuperAdmin && (
            <Link href="/dashboard/meetings/archive" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
              <Archive className="h-4 w-4" />
              آرشیو
            </Link>
          )}
          <Link href="/dashboard/meetings/new" className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-600">
            <Plus className="h-4 w-4" />
            جلسه جدید
          </Link>
        </div>
      </header>

      {/* Status summary cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        {statusCounts.map((s) => (
          <div
            key={s.key}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:shadow-sm"
            onClick={() => setFilterStatus(filterStatus === s.key ? 'all' : s.key)}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">{s.label}</span>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            </div>
            <div className="mt-1 text-xl font-bold text-slate-900">
              {s.count.toLocaleString('fa-IR')}
            </div>
          </div>
        ))}
      </div>

      {/* Filters bar */}
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو در جلسات..."
            className="pr-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
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
          <SelectTrigger className="w-[160px]">
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
        <div className="flex rounded-lg border border-slate-200">
          <button
            className={`flex items-center gap-1 px-3 py-2 text-sm transition ${viewMode === 'board' ? 'bg-sky-50 text-sky-600' : 'text-slate-500 hover:bg-slate-50'}`}
            onClick={() => setViewMode('board')}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            className={`flex items-center gap-1 px-3 py-2 text-sm transition ${viewMode === 'list' ? 'bg-sky-50 text-sky-600' : 'text-slate-500 hover:bg-slate-50'}`}
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Meeting cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16">
          <Calendar className="h-10 w-10 text-slate-300" />
          <strong className="mt-3 text-slate-700">جلسه‌ای یافت نشد</strong>
          <span className="text-sm text-slate-400">اولین جلسه را ایجاد و به پرسنل تخصیص دهید</span>
          <Link href="/dashboard/meetings/new" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-600">
            <Plus className="h-4 w-4" /> ایجاد جلسه
          </Link>
        </div>
      ) : viewMode === 'board' ? (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                <CalendarDays className="h-4 w-4 text-sky-500" />
                جلسات پیشرو ({upcoming.length.toLocaleString('fa-IR')})
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                <Clock className="h-4 w-4 text-slate-400" />
                جلسات گذشته ({past.length.toLocaleString('fa-IR')})
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="p-3 text-right font-medium text-slate-500">عنوان</th>
                <th className="p-3 text-right font-medium text-slate-500">تاریخ</th>
                <th className="p-3 text-right font-medium text-slate-500">مسئول</th>
                <th className="p-3 text-right font-medium text-slate-500">وضعیت</th>
                <th className="p-3 text-right font-medium text-slate-500">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((m) => {
                const st = statusInfo(m.status);
                return (
                  <tr key={m.id} className="cursor-pointer transition hover:bg-slate-50" onClick={() => openView(m)}>
                    <td className="p-3 font-medium text-slate-900">{m.contact_name || m.title}</td>
                    <td className="p-3 text-slate-600">{formatJalali(m.date)}</td>
                    <td className="p-3 text-slate-600">{m.assigned_to_name || '—'}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: `${st.color}15`, color: st.color }}>
                        {st.label}
                      </span>
                    </td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" onClick={() => openView(m)}>
                          <Eye className="h-4 w-4" />
                        </button>
                        {!isSuperAdmin && canExtendMeeting(m) && new Date(m.date) >= now && (
                          <button className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" onClick={() => openExtend(m)}>
                            <TimerReset className="h-4 w-4" />
                          </button>
                        )}
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
      )}

      {/* Extend Dialog */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تمدید جلسه</DialogTitle></DialogHeader>
          {extendMeeting && (
            <div className="space-y-4">
              <div className="text-sm text-slate-500">
                جلسه: <span className="font-bold text-slate-900">{extendMeeting.contact_name || extendMeeting.title}</span>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-sm">
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
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>مکان</Label>
                  <Input value={extendForm.location} onChange={(e) => setExtendForm({ ...extendForm, location: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>لینک آنلاین</Label>
                  <Input value={extendForm.onlineLink} onChange={(e) => setExtendForm({ ...extendForm, onlineLink: e.target.value })} dir="ltr" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
              {extendError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{extendError}</div>}
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>مشاهده جلسه</DialogTitle></DialogHeader>
          {viewMeeting && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">{viewMeeting.contact_name || viewMeeting.title}</div>
                  {viewMeeting.topic && <div className="text-xs text-slate-400">{viewMeeting.topic}</div>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
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
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  <span className="mb-1 block text-slate-400">دستور جلسه:</span>
                  {viewMeeting.agenda}
                </div>
              )}
              {viewMeeting.outcome && (
                <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                  <span className="mb-1 flex items-center gap-1 text-emerald-500"><CheckCircle2 className="h-4 w-4" /> نتیجه جلسه:</span>
                  {viewMeeting.outcome}
                </div>
              )}
              {viewMeeting.minutes && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  <span className="mb-1 flex items-center gap-1 text-slate-400"><FileText className="h-4 w-4" /> صورت‌جلسه:</span>
                  {viewMeeting.minutes}
                </div>
              )}
              {detailImages.length > 0 && (
                <div>
                  <span className="mb-2 flex items-center gap-1 text-sm text-slate-400"><FileText className="h-4 w-4" /> تصاویر جلسه:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {detailImages.map((img) => (
                      <a key={img.id} href={img.imageUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-slate-200">
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
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2">
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
                <div className="rounded-lg border-2 border-dashed border-slate-200 p-4">
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
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2">
                        {f.type.startsWith('image/') ? (
                          <img src={f.url} alt={f.name} className="h-10 w-10 rounded object-cover" />
                        ) : (
                          <FileText className="h-5 w-5 text-slate-400" />
                        )}
                        <span className="flex-1 truncate text-sm text-slate-700">{f.name}</span>
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
      className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
      onClick={onView}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-slate-900">{meeting.contact_name || meeting.title}</h3>
          {meeting.topic && <p className="mt-0.5 truncate text-xs text-slate-400">{meeting.topic}</p>}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: `${st.color}15`, color: st.color }}>
          {st.label}
        </span>
      </div>

      {meeting.isExtended && (
        <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
          <TimerReset className="h-3 w-3" /> تمدید شده
        </span>
      )}

      {!upcoming && hasOutcome && (
        <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
          <CheckCircle2 className="h-3 w-3" /> نتیجه ثبت شده
        </div>
      )}

      <div className="space-y-1.5 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span>{formatJalaliDateTime(meeting.date)}</span>
        </div>
        {meeting.assigned_to_name && (
          <div className="flex items-center gap-1.5">
            <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>تخصیص به: <strong className="font-medium text-slate-600">{meeting.assigned_to_name}</strong></span>
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
        <div className="mt-2 rounded-lg bg-emerald-50/50 p-2 text-xs text-emerald-700" onClick={(e) => e.stopPropagation()}>
          <p className="line-clamp-2">{meeting.outcome}</p>
        </div>
      )}

      <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3" onClick={(e) => e.stopPropagation()}>
        <button className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100" onClick={onView}>
          <Eye className="h-3.5 w-3.5" /> مشاهده
        </button>
        {!upcoming && (
          <button className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${hasOutcome ? 'text-slate-500 hover:bg-slate-100' : 'text-emerald-600 hover:bg-emerald-50'}`} onClick={onOutcome}>
            <CheckCircle2 className="h-3.5 w-3.5" /> {hasOutcome ? 'ویرایش نتیجه' : 'ثبت نتیجه'}
          </button>
        )}
        <button className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-amber-600 transition hover:bg-amber-50" onClick={onRefer}>
          <Forward className="h-3.5 w-3.5" /> ارجاع
        </button>
        {canExtend && upcoming && (
          <button className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-amber-600 transition hover:bg-amber-50" onClick={onExtend}>
            <TimerReset className="h-3.5 w-3.5" /> تمدید
          </button>
        )}
        {isSuperAdmin && (
          <>
            <button className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-slate-100" onClick={onArchive}>
              <Archive className="h-3.5 w-3.5" />
            </button>
            <button className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-50 hover:text-red-600" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </article>
  );
}
