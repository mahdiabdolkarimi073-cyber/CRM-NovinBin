'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { SuperAdminActions } from '@/components/dashboard/super-admin-actions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { formatJalali, formatJalaliDateTime, relativeTime, toLocalDateString } from '@/lib/format';
import type { Meeting, Profile, MeetingAssignment } from '@/lib/types';
import {
  Calendar,
  Plus,
  Video,
  MapPin,
  Clock,
  Users,
  AlertCircle,
  Bell,
  CalendarDays,
} from 'lucide-react';

interface MeetingWithAssignment extends Meeting {
  assigned_to_name?: string;
  contact_name?: string;
}

export default function MeetingsPage() {
  const { profile } = useAuth();
  const [meetings, setMeetings] = useState<MeetingWithAssignment[]>([]);
  const [personnel, setPersonnel] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    contact_name: '',
    date: '',
    time: '',
    assigned_to: 'none',
    topic: '',
    location: '',
    online_link: '',
    agenda: '',
  });
  const [viewMeeting, setViewMeeting] = useState<MeetingWithAssignment | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editMeeting, setEditMeeting] = useState<MeetingWithAssignment | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ topic: '', location: '', online_link: '', agenda: '' });

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

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
            role: { in: ['personnel', 'admin', 'super_admin'] },
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

      const meetingsWithAssign: MeetingWithAssignment[] = (mtgs as Meeting[] || []).map((m) => {
        const a = assignMap[m.id];
        return {
          ...m,
          assigned_to_name: a ? profileMap[a.assignedTo] || '—' : undefined,
          contact_name: a?.contactName || undefined,
        };
      });

      setMeetings(meetingsWithAssign);
      setPersonnel((pers as Profile[]) || []);
    } catch (error: any) {
      toast.error('بارگذاری جلسات ناموفق: ' + error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!form.contact_name || !form.date || !form.time) {
      toast.error('نام طرف مقابل، تاریخ و زمان جلسه را وارد کنید');
      return;
    }
    if (form.assigned_to === 'none') {
      toast.error('یک پرسنل برای تخصیص انتخاب کنید');
      return;
    }
    setCreating(true);

    const meetingDateTime = new Date(`${form.date}T${form.time}`);

    try {
      const meetingData = await createData('meetings', {
        title: form.contact_name,
        topic: form.topic || null,
        agenda: form.agenda || null,
        date: meetingDateTime.toISOString(),
        location: form.location || null,
        onlineLink: form.online_link || null,
        createdBy: profile.id,
      });

      await createData('meeting_assignments', {
        meetingId: meetingData.id,
        assignedTo: form.assigned_to,
        contactName: form.contact_name,
        createdBy: profile.id,
      });

      await createData('notifications', {
        profileId: form.assigned_to,
        title: 'جلسه جدید به شما تخصیص داده شد',
        body: `جلسه با ${form.contact_name} در ${formatJalaliDateTime(meetingDateTime)}`,
        type: 'meeting',
        priority: 'normal',
        link: '/dashboard/meetings',
      });

      toast.success('جلسه ایجاد و به پرسنل تخصیص داده شد');
    } catch (error: any) {
      toast.error('ایجاد ناموفق: ' + error.message);
    }
    setCreating(false);
    setDialogOpen(false);
    setForm({
      contact_name: '',
      date: '',
      time: '',
      assigned_to: 'none',
      topic: '',
      location: '',
      online_link: '',
      agenda: '',
    });
    load();
  };

  const openView = (m: MeetingWithAssignment) => {
    setViewMeeting(m);
    setViewDialogOpen(true);
  };

  const openEdit = (m: MeetingWithAssignment) => {
    setEditMeeting(m);
    setEditForm({
      topic: m.topic || '',
      location: m.location || '',
      online_link: m.onlineLink || '',
      agenda: m.agenda || '',
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editMeeting) return;
    try {
      await updateData('meetings', { id: editMeeting.id }, {
        topic: editForm.topic || null,
        location: editForm.location || null,
        onlineLink: editForm.online_link || null,
        agenda: editForm.agenda || null,
      });
      toast.success('جلسه ویرایش شد');
      setEditDialogOpen(false);
      setEditMeeting(null);
      load();
    } catch (e: any) {
      toast.error('ویرایش ناموفق: ' + e.message);
    }
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
  const urgentMeetings = useMemo(() => {
    return meetings.filter((m) => {
      const meetingDate = new Date(m.date);
      const diff = meetingDate.getTime() - now.getTime();
      return diff >= 0 && diff <= 24 * 60 * 60 * 1000;
    });
  }, [meetings]);

  const upcoming = meetings.filter((m) => new Date(m.date) >= now);
  const past = meetings.filter((m) => new Date(m.date) < now);

  const getMeetingUrgency = (m: Meeting) => {
    const meetingDate = new Date(m.date);
    const diff = meetingDate.getTime() - now.getTime();
    if (diff < 0) return null;
    if (diff <= 2 * 60 * 60 * 1000) return { level: 'urgent', label: 'کمتر از ۲ ساعت' };
    if (diff <= 24 * 60 * 60 * 1000) return { level: 'soon', label: 'کمتر از ۲۴ ساعت' };
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="جلسات"
        description="مدیریت و تخصیص جلسات به پرسنل"
        action={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4" /> جلسه جدید
          </Button>
        }
      />

      {/* Urgent Banner */}
      {urgentMeetings.length > 0 && (
        <div className="space-y-2 mb-6">
          {urgentMeetings.map((m) => {
            const urgency = getMeetingUrgency(m);
            if (!urgency) return null;
            const isUrgent = urgency.level === 'urgent';
            return (
              <div
                key={m.id}
                className={`flex items-center gap-3 p-4 rounded-xl border ${
                  isUrgent
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isUrgent ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                  }`}
                >
                  {isUrgent ? <Bell className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">
                    {isUrgent ? 'یادآوری فوری: ' : 'یادآوری: '} جلسه با {m.contact_name || m.title}
                  </div>
                  <div className="text-xs mt-0.5 opacity-80">
                    {urgency.label} دیگر — {formatJalaliDateTime(m.date)}
                    {m.assigned_to_name && ` • ${m.assigned_to_name}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {meetings.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Calendar className="w-8 h-8" />}
            title="جلسه‌ای یافت نشد"
            description="اولین جلسه را ایجاد و به پرسنل تخصیص دهید"
            action={
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4" /> ایجاد جلسه
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-sky-500" /> جلسات پیش‌رو (
                {upcoming.length.toLocaleString('fa-IR')})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcoming.map((m) => (
                  <MeetingCard
                    key={m.id}
                    meeting={m}
                    upcoming
                    isSuperAdmin={isSuperAdmin}
                    onView={() => openView(m)}
                    onEdit={() => openEdit(m)}
                    onDelete={() => handleDelete(m)}
                  />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" /> جلسات گذشته (
                {past.length.toLocaleString('fa-IR')})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {past.slice(0, 9).map((m) => (
                  <MeetingCard
                    key={m.id}
                    meeting={m}
                    isSuperAdmin={isSuperAdmin}
                    onView={() => openView(m)}
                    onEdit={() => openEdit(m)}
                    onDelete={() => handleDelete(m)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Meeting Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>ایجاد جلسه جدید</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>نام طرف مقابل / شرکت *</Label>
              <Input
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                placeholder="نام شخص یا شرکتی که با آن جلسه دارید"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>تخصیص به پرسنل *</Label>
              <Select
                value={form.assigned_to}
                onValueChange={(v) => setForm({ ...form, assigned_to: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب پرسنل" />
                </SelectTrigger>
                <SelectContent>
                  {personnel.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.firstName} {p.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {personnel.length === 0 && (
                <p className="text-xs text-amber-600">پرسنل فعالی وجود ندارد.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>تاریخ *</Label>
                <JalaliDatePicker
                  value={form.date ? new Date(form.date) : null}
                  onChange={(d) => setForm({ ...form, date: d ? toLocalDateString(d) : '' })}
                />
              </div>
              <div className="space-y-2">
                <Label>زمان *</Label>
                <Input
                  type="time"
                  dir="ltr"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>موضوع</Label>
              <Input
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>مکان</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>لینک آنلاین</Label>
                <Input
                  dir="ltr"
                  placeholder="https://..."
                  value={form.online_link}
                  onChange={(e) => setForm({ ...form, online_link: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>دستور جلسه</Label>
              <Textarea
                value={form.agenda}
                onChange={(e) => setForm({ ...form, agenda: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'در حال ایجاد...' : 'ایجاد و تخصیص جلسه'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>ویرایش جلسه</DialogTitle></DialogHeader>
          {editMeeting && (
            <div className="space-y-4">
              <div className="text-sm text-slate-500">جلسه: <span className="font-bold text-slate-900">{editMeeting.contact_name || editMeeting.title}</span></div>
              <div className="space-y-2">
                <Label>موضوع</Label>
                <Input value={editForm.topic} onChange={(e) => setEditForm({ ...editForm, topic: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>مکان</Label>
                <Input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>لینک آنلاین</Label>
                <Input dir="ltr" value={editForm.online_link} onChange={(e) => setEditForm({ ...editForm, online_link: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>دستور جلسه</Label>
                <Textarea value={editForm.agenda} onChange={(e) => setEditForm({ ...editForm, agenda: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>انصراف</Button>
                <Button onClick={handleEditSave}>ذخیره</Button>
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
  onEdit,
  onDelete,
}: {
  meeting: MeetingWithAssignment;
  upcoming?: boolean;
  isSuperAdmin: boolean;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const now = new Date();
  const meetingDate = new Date(meeting.date);
  const diff = meetingDate.getTime() - now.getTime();
  const isUrgent = upcoming && diff >= 0 && diff <= 2 * 60 * 60 * 1000;
  const isSoon = upcoming && diff > 2 * 60 * 60 * 1000 && diff <= 24 * 60 * 60 * 1000;

  return (
    <Card
      className={`hover:shadow-md transition-smooth ${
        isUrgent
          ? 'border-red-300 bg-red-50/30'
          : isSoon
          ? 'border-amber-300 bg-amber-50/30'
          : upcoming
          ? 'border-sky-200'
          : 'opacity-75'
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isUrgent
                  ? 'bg-red-100 text-red-600'
                  : isSoon
                  ? 'bg-amber-100 text-amber-600'
                  : upcoming
                  ? 'bg-sky-50 text-sky-600'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-slate-900">
                {meeting.contact_name || meeting.title}
              </div>
              {meeting.topic && <div className="text-xs text-slate-400">{meeting.topic}</div>}
            </div>
          </div>
          {isUrgent && <Badge className="bg-red-100 text-red-700">فوری</Badge>}
          {isSoon && <Badge className="bg-amber-100 text-amber-700">بزودی</Badge>}
          {upcoming && !isUrgent && !isSoon && <Badge className="bg-sky-100 text-sky-700">پیش‌رو</Badge>}
        </div>

        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {formatJalaliDateTime(meeting.date)}
          </div>
          {meeting.assigned_to_name && (
            <div className="flex items-center gap-2 text-slate-500">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs">تخصیص به: </span>
              <span className="font-medium text-slate-700">{meeting.assigned_to_name}</span>
            </div>
          )}
          {meeting.location && (
            <div className="flex items-center gap-2 text-slate-500">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {meeting.location}
            </div>
          )}
          {meeting.onlineLink && (
            <div className="flex items-center gap-2 text-sky-600">
              <Video className="w-3.5 h-3.5" />
              <a
                href={meeting.onlineLink}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline text-xs"
              >
                پیوستن به جلسه
              </a>
            </div>
          )}
        </div>

        {isSuperAdmin && (
          <div className="flex items-center justify-end pt-3 mt-3 border-t border-slate-100">
            <SuperAdminActions onView={onView} onEdit={onEdit} onDelete={onDelete} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
