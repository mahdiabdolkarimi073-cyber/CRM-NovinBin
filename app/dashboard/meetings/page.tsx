'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { SuperAdminActions } from '@/components/dashboard/super-admin-actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatJalaliDateTime } from '@/lib/format';
import type { Meeting, Profile } from '@/lib/types';
import {
  Calendar,
  Plus,
  Video,
  MapPin,
  Clock,
  UserRound,
  CalendarDays,
  Eye,
  CheckCircle2,
  FileText,
} from 'lucide-react';

interface MeetingWithAssignment extends Meeting {
  assigned_to_name?: string;
  contact_name?: string;
  assigned_to_id?: string;
}

export default function MeetingsPage() {
  const { profile } = useAuth();
  const [meetings, setMeetings] = useState<MeetingWithAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMeeting, setViewMeeting] = useState<MeetingWithAssignment | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [outcomeMeeting, setOutcomeMeeting] = useState<MeetingWithAssignment | null>(null);
  const [outcomeDialogOpen, setOutcomeDialogOpen] = useState(false);
  const [outcomeForm, setOutcomeForm] = useState({ outcome: '', minutes: '' });
  const [savingOutcome, setSavingOutcome] = useState(false);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';
  const isAdmin = profile?.role === 'admin';

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [mtgs, assigns, pers] = await Promise.all([
        fetchData('meetings', { where: {}, orderBy: { date: 'asc' } }),
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
      (assigns || []).forEach((a: any) => {
        assignMap[a.meetingId] = a;
      });

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
          (m) => m.assigned_to_id === profile.id
        );
      }

      setMeetings(meetingsWithAssign);
    } catch (error: any) {
      toast.error('بارگذاری جلسات ناموفق: ' + error.message);
    }
    setLoading(false);
  }, [profile, isSuperAdmin, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const openView = (m: MeetingWithAssignment) => {
    setViewMeeting(m);
    setViewDialogOpen(true);
  };

  const openOutcome = (m: MeetingWithAssignment) => {
    setOutcomeMeeting(m);
    setOutcomeForm({
      outcome: m.outcome || '',
      minutes: m.minutes || '',
    });
    setOutcomeDialogOpen(true);
  };

  const handleOutcomeSave = async () => {
    if (!outcomeMeeting) return;
    setSavingOutcome(true);
    try {
      await updateData('meetings', { id: outcomeMeeting.id }, {
        outcome: outcomeForm.outcome || null,
        minutes: outcomeForm.minutes || null,
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

  const now = new Date();
  const upcoming = meetings.filter((m) => new Date(m.date) >= now);
  const past = meetings.filter((m) => new Date(m.date) < now);

  if (loading) {
    return (
      <div className="meetings-loading" aria-label="در حال بارگذاری">
        <div className="meetings-spinner" />
      </div>
    );
  }

  return (
    <div className="meetings-page">
      <header className="meetings-header">
        <div className="meetings-heading">
          <div className="meetings-title-row">
            <span className="meetings-title-accent" />
            <h1>جلسات</h1>
          </div>
          <p>مدیریت و تخصیص جلسات به پرسنل</p>
        </div>
        <Link href="/dashboard/meetings/new" className="meetings-new-button">
          <Plus className="h-4 w-4" />
          جلسه جدید
        </Link>
      </header>

      <div className="meetings-list">
        {meetings.length === 0 ? (
            <div className="meetings-empty">
              <Calendar className="h-8 w-8" />
              <strong>جلسه‌ای یافت نشد</strong>
              <span>اولین جلسه را ایجاد و به پرسنل تخصیص دهید</span>
              <Link href="/dashboard/meetings/new" className="meetings-empty-button">
                <Plus className="h-4 w-4" /> ایجاد جلسه
              </Link>
            </div>
          ) : (
            <>
              {upcoming.length > 0 && (
                <section className="meetings-section">
                  <h2 className="meetings-section-title"><CalendarDays /> جلسات پیشرو ({upcoming.length.toLocaleString('fa-IR')})</h2>
                  <div className="meetings-cards">
                    {upcoming.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} upcoming isSuperAdmin={isSuperAdmin} onView={() => openView(meeting)} onDelete={() => handleDelete(meeting)} onOutcome={() => openOutcome(meeting)} />)}
                  </div>
                </section>
              )}
              {past.length > 0 && (
                <section className="meetings-section meetings-past-section">
                  <h2 className="meetings-section-title meetings-past-title"><Clock /> جلسات گذشته ({past.length.toLocaleString('fa-IR')})</h2>
                  <div className="meetings-cards">
                    {past.slice(0, 9).map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} isSuperAdmin={isSuperAdmin} onView={() => openView(meeting)} onDelete={() => handleDelete(meeting)} onOutcome={() => openOutcome(meeting)} />)}
                  </div>
                </section>
              )}
            </>
          )}
      </div>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>مشاهده جلسه</DialogTitle></DialogHeader>
          {viewMeeting && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">{viewMeeting.contact_name || viewMeeting.title}</div>
                  {viewMeeting.topic && <div className="text-xs text-slate-400">{viewMeeting.topic}</div>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-400">زمان:</span> <span className="font-medium">{formatJalaliDateTime(viewMeeting.date)}</span></div>
                {viewMeeting.assigned_to_name && <div><span className="text-slate-400">تخصیص به:</span> <span className="font-medium">{viewMeeting.assigned_to_name}</span></div>}
                {viewMeeting.location && <div><span className="text-slate-400">مکان:</span> <span className="font-medium">{viewMeeting.location}</span></div>}
              </div>
              {viewMeeting.onlineLink && (
                <a href={viewMeeting.onlineLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sky-600 text-sm hover:underline">
                  <Video className="w-4 h-4" /> پیوستن به جلسه
                </a>
              )}
              {viewMeeting.agenda && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  <span className="text-slate-400 block mb-1">دستور جلسه:</span>
                  {viewMeeting.agenda}
                </div>
              )}
              {viewMeeting.outcome && (
                <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                  <span className="text-emerald-500 block mb-1 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> نتیجه جلسه:</span>
                  {viewMeeting.outcome}
                </div>
              )}
              {viewMeeting.minutes && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  <span className="text-slate-400 block mb-1 flex items-center gap-1"><FileText className="w-4 h-4" /> صورت‌جلسه:</span>
                  {viewMeeting.minutes}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Outcome Dialog */}
      <Dialog open={outcomeDialogOpen} onOpenChange={setOutcomeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>ثبت نتیجه جلسه</DialogTitle></DialogHeader>
          {outcomeMeeting && (
            <div className="space-y-4">
              <div className="text-sm text-slate-500">جلسه: <span className="font-bold text-slate-900">{outcomeMeeting.contact_name || outcomeMeeting.title}</span></div>
              <div className="space-y-2">
                <Label>نتیجه جلسه</Label>
                <Textarea
                  value={outcomeForm.outcome}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, outcome: e.target.value })}
                  placeholder="نتیجه و تصمیمات جلسه را وارد کنید..."
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label>صورت‌جلسه (اختیاری)</Label>
                <Textarea
                  value={outcomeForm.minutes}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, minutes: e.target.value })}
                  placeholder="خلاصه بحث‌ها و مباحث مطرح شده..."
                  className="min-h-[80px]"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOutcomeDialogOpen(false)}>انصراف</Button>
                <Button onClick={handleOutcomeSave} disabled={savingOutcome}>
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
  meeting,
  upcoming,
  isSuperAdmin,
  onView,
  onDelete,
  onOutcome,
}: {
  meeting: MeetingWithAssignment;
  upcoming?: boolean;
  isSuperAdmin: boolean;
  onView?: () => void;
  onDelete?: () => void;
  onOutcome?: () => void;
}) {
  const hasOutcome = !!meeting.outcome;

  return (
    <article
      className={`meeting-card ${upcoming ? 'meeting-card-upcoming' : 'meeting-card-past'}`}
      onClick={onView}
      role="button"
      tabIndex={0}
      onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key === 'Enter' || event.key === ' ') onView?.();
      }}
    >
      <div className="meeting-card-main">
        <div className="meeting-card-title-wrap">
          <h3>{meeting.contact_name || meeting.title}</h3>
          {meeting.topic && <p>{meeting.topic}</p>}
        </div>
        {upcoming && <span className="meeting-status">پیشرو</span>}
      </div>

      {/* Outcome badge for past meetings */}
      {!upcoming && hasOutcome && (
        <div className="meeting-outcome-badge">
          <CheckCircle2 className="h-3 w-3" />
          <span>نتیجه ثبت شده</span>
        </div>
      )}

      <div className="meeting-card-meta">
        <div className="meeting-meta-row">
          <Clock className="h-3.5 w-3.5" />
          <span>{formatJalaliDateTime(meeting.date)}</span>
        </div>
        {meeting.assigned_to_name && (
          <div className="meeting-meta-row">
            <UserRound className="h-3.5 w-3.5" />
            <span>تخصیص به: <strong>{meeting.assigned_to_name}</strong></span>
          </div>
        )}
        {meeting.location && (
          <div className="meeting-meta-row">
            <MapPin className="h-3.5 w-3.5" />
            <span>{meeting.location}</span>
          </div>
        )}
        {meeting.onlineLink && (
          <div className="meeting-meta-row meeting-online-row">
            <Video className="h-3.5 w-3.5" />
            <a href={meeting.onlineLink} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>
              پیوستن به جلسه
            </a>
          </div>
        )}
      </div>

      {/* Outcome preview */}
      {hasOutcome && (
        <div className="meeting-outcome-preview" onClick={(event) => event.stopPropagation()}>
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <p>{meeting.outcome}</p>
        </div>
      )}

      <div className="meeting-card-icon"><Calendar className="h-5 w-5" /></div>

      {/* Action buttons */}
      <div className="meeting-card-footer" onClick={(event) => event.stopPropagation()}>
        <button className="meeting-view-btn" onClick={onView}>
          <Eye className="h-3.5 w-3.5" />
          مشاهده جزئیات
        </button>
        {!upcoming && (
          <button className={`meeting-outcome-btn ${hasOutcome ? 'meeting-outcome-btn-edit' : ''}`} onClick={onOutcome}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            {hasOutcome ? 'ویرایش نتیجه' : 'ثبت نتیجه'}
          </button>
        )}
        {isSuperAdmin && (
          <div className="meeting-card-admin-actions">
            <SuperAdminActions onView={onView} onDelete={onDelete} />
          </div>
        )}
      </div>
    </article>
  );
}
