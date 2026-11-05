'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchData, updateData, createData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight, Calendar, Clock, MapPin, Video,
  UserCheck, FileText, Link2, ClipboardList, Loader2, Phone, Check,
  Lightbulb, Info,
} from 'lucide-react';
import { fullName } from '@/lib/constants';
import { toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';
import type { Profile, Meeting, MeetingAssignment } from '@/lib/types';

const guideItems = [
  { icon: ClipboardList, title: 'اطلاعات کامل وارد کنید', desc: 'تمام فیلدهای مربوطه را با دقت تکمیل کنید تا ابهام پیش نیاید.' },
  { icon: UserCheck, title: 'انتخاب مسئول مناسب', desc: 'فردی را انتخاب کنید که مسئول پیگیری و حضور در جلسه باشد.' },
  { icon: Clock, title: 'زمان و مکان دقیق', desc: 'تعیین زمان و مکان دقیق، حضور به‌موقع اعضا را تضمین می‌کند.' },
  { icon: FileText, title: 'دستور جلسه شفاف', desc: 'موضوعات بحث را از قبل مشخص کنید تا جلسه ساختارمندتر شود.' },
  { icon: Link2, title: 'لینک آنلاین (در صورت نیاز)', desc: 'برای جلسات آنلاین یک لینک معتبر و قابل دسترس وارد کنید.' },
];

const inputStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: '1px solid #E2E8F0',
  padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none',
};

export default function EditMeetingPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const router = useRouter();
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingMeeting, setLoadingMeeting] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [existingParticipants, setExistingParticipants] = useState<string[]>([]);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [existingAssignment, setExistingAssignment] = useState<MeetingAssignment | null>(null);
  const [form, setForm] = useState({
    contact_name: '',
    main_responsible: 'none',
    date: '',
    time: '',
    topic: '',
    location: '',
    online_link: '',
    agenda: '',
    staff_phone: '',
    customer_phone: '',
  });

  const loadMeeting = useCallback(async () => {
    if (!id) return;
    try {
      const [meetings, assignments, participants] = await Promise.all([
        fetchData<Meeting>('meetings', { where: { id } }),
        fetchData<MeetingAssignment>('meeting_assignments', { where: { meetingId: id } }),
        fetchData<{ id: string; meetingId: string; profileId: string }>('meeting_participants', { where: { meetingId: id } }),
      ]);

      if (meetings && meetings.length > 0) {
        const m = meetings[0];
        const d = new Date(m.date);
        setForm({
          contact_name: assignments?.[0]?.contactName || m.title || '',
          main_responsible: m.mainResponsibleId || assignments?.[0]?.assignedTo || 'none',
          date: toLocalDateString(d),
          time: d.toTimeString().slice(0, 5),
          topic: m.topic || '',
          location: m.location || '',
          online_link: m.onlineLink || '',
          agenda: m.agenda || '',
          staff_phone: m.staffPhone || '',
          customer_phone: m.customerPhone || '',
        });
        setExistingAssignment(assignments?.[0] || null);
        const pIds = (participants || []).map((p) => p.profileId);
        setExistingParticipants(pIds);
        setParticipantIds(pIds);
      }
    } catch (error: any) {
      toast.error('بارگذاری جلسه ناموفق: ' + error.message);
    } finally {
      setLoadingMeeting(false);
    }
  }, [id]);

  const loadStaff = useCallback(async () => {
    try {
      const data = await fetchData<Profile>('profiles', {
        where: {
          userType: 'staff',
          role: { in: ['personnel', 'admin', 'super_admin', 'owner'] },
          active: true,
        },
        orderBy: { firstName: 'asc' },
      });
      setStaff(data || []);
    } catch {
      setStaff([]);
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
    loadMeeting();
  }, [loadStaff, loadMeeting]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.contact_name.trim()) e.contact_name = 'نام هدف/مشتری/شرکت الزامی است';
    if (form.main_responsible === 'none') e.main_responsible = 'انتخاب مسئول اصلی الزامی است';
    if (!form.date) e.date = 'تاریخ جلسه الزامی است';
    if (!form.time) e.time = 'زمان جلسه الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const toggleParticipant = (pid: string) => {
    setParticipantIds((prev) => prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);

    const meetingDateTime = new Date(`${form.date}T${form.time}`);

    try {
      await updateData('meetings', { id }, {
        title: form.contact_name.trim(),
        topic: form.topic || null,
        agenda: form.agenda || null,
        date: meetingDateTime.toISOString(),
        location: form.location || null,
        onlineLink: form.online_link || null,
        staffPhone: form.staff_phone.trim() || null,
        customerPhone: form.customer_phone.trim() || null,
        mainResponsibleId: form.main_responsible,
      });

      if (existingAssignment) {
        await updateData('meeting_assignments', { id: existingAssignment.id }, {
          assignedTo: form.main_responsible,
          contactName: form.contact_name.trim(),
        });
      } else {
        await createData('meeting_assignments', {
          meetingId: id,
          assignedTo: form.main_responsible,
          contactName: form.contact_name.trim(),
          createdBy: profile.id,
        });
      }

      const allParticipants = new Set<string>(participantIds);
      allParticipants.add(form.main_responsible);

      const toAdd = Array.from(allParticipants).filter((pid) => !existingParticipants.includes(pid));
      const toRemove = existingParticipants.filter((pid) => !allParticipants.has(pid));

      await Promise.all([
        ...toAdd.map((pid) =>
          createData('meeting_participants', { meetingId: id, profileId: pid }).catch(() => {})
        ),
        ...toRemove.map((pid) =>
          deleteData('meeting_participants', { meetingId: id, profileId: pid }).catch(() => {})
        ),
      ]);

      toast.success('جلسه ویرایش شد');
      router.push('/dashboard/meetings');
    } catch (error: any) {
      toast.error('ویرایش جلسه ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingMeeting) {
    return (
      <div className="nb-editor-loading" dir="rtl">
        <span />
        <p>در حال بارگذاری جلسه...</p>
      </div>
    );
  }

  return (
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href={`/dashboard/meetings/${id}`} className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به جزئیات
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> جلسات <b>←</b> ویرایش جلسه</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push(`/dashboard/meetings/${id}`)} disabled={submitting}>
            انصراف
          </button>
          <button type="submit" form="meeting-edit-form" className="nb-editor-save-btn" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="meeting-edit-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-900/20">
                  <Calendar className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>اطلاعات جلسه</h2>
                  <p className="text-sm text-slate-400">لطفاً اطلاعات مربوط به جلسه را ویرایش کنید.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">نام هدف/مشتری/شرکت <span className="text-red-500">*</span></Label>
                <input
                  type="text"
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  placeholder="نام شخص یا سازمانی که این جلسه مربوط به آن است"
                  className="nb-input"
                  style={{ ...inputStyle, borderColor: errors.contact_name ? '#FCA5A5' : '#E2E8F0' }}
                />
                {errors.contact_name && <span className="nb-editor-error">{errors.contact_name}</span>}
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">مسئول اصلی <span className="text-red-500">*</span></Label>
                <Select value={form.main_responsible} onValueChange={(v) => setForm({ ...form, main_responsible: v })}>
                  <SelectTrigger className={`h-11 ${errors.main_responsible ? 'border-red-300' : ''}`}>
                    <UserCheck className="ml-1 h-4 w-4 text-slate-400" />
                    <SelectValue placeholder="انتخاب فرد مسئول اصلی..." />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {fullName(s.firstName, s.lastName)}{s.id === profile?.id ? ' (خودم)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {loadingStaff && <span className="text-xs text-slate-400">در حال بارگذاری پرسنل...</span>}
                {errors.main_responsible && <span className="nb-editor-error">{errors.main_responsible}</span>}
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">شرکت‌کنندگان (اختیاری)</Label>
                <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                  {loadingStaff ? (
                    <span className="text-sm text-slate-400">در حال بارگذاری...</span>
                  ) : staff.length === 0 ? (
                    <span className="text-sm text-slate-400">کارمندی یافت نشد</span>
                  ) : staff.map((s) => {
                    const checked = participantIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleParticipant(s.id)}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${checked ? 'border-sky-500 bg-sky-50 text-sky-600 dark:bg-sky-900/20' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
                      >
                        {checked && <Check className="h-3 w-3" />}
                        {fullName(s.firstName, s.lastName)}{s.id === profile?.id ? ' (خودم)' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">تاریخ <span className="text-red-500">*</span></Label>
                  <JalaliDatePicker
                    value={form.date ? new Date(form.date) : null}
                    onChange={(d) => setForm({ ...form, date: d ? toLocalDateString(d) : '' })}
                    placeholder="انتخاب تاریخ"
                    className={`h-11 ${errors.date ? 'border-red-300' : ''}`}
                  />
                  {errors.date && <span className="nb-editor-error">{errors.date}</span>}
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">زمان <span className="text-red-500">*</span></Label>
                  <input
                    type="time" dir="ltr"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="nb-input"
                    style={{ ...inputStyle, borderColor: errors.time ? '#FCA5A5' : '#E2E8F0' }}
                  />
                  {errors.time && <span className="nb-editor-error">{errors.time}</span>}
                </div>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">موضوع</Label>
                <input
                  type="text"
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  placeholder="موضوع جلسه را وارد کنید"
                  className="nb-input"
                  style={inputStyle}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">مکان</Label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="محل برگزاری جلسه"
                    className="nb-input"
                    style={inputStyle}
                  />
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">لینک آنلاین</Label>
                  <input
                    type="text" dir="ltr"
                    value={form.online_link}
                    onChange={(e) => setForm({ ...form, online_link: e.target.value })}
                    placeholder="https://..."
                    className="nb-input"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">شماره موبایل پرسنل (برای پیامک)</Label>
                  <input
                    type="tel" dir="ltr"
                    value={form.staff_phone}
                    onChange={(e) => setForm({ ...form, staff_phone: e.target.value })}
                    placeholder="09xxxxxxxxx"
                    className="nb-input"
                    style={inputStyle}
                  />
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">شماره موبایل مشتری (برای پیامک)</Label>
                  <input
                    type="tel" dir="ltr"
                    value={form.customer_phone}
                    onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                    placeholder="09xxxxxxxxx"
                    className="nb-input"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">دستور جلسه</Label>
                <textarea
                  value={form.agenda}
                  onChange={(e) => setForm({ ...form, agenda: e.target.value })}
                  placeholder="دستور جلسه را بنویسید..."
                  className="min-h-[100px] w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-slate-700"
                />
              </div>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="nb-editor-canvas" style={{ padding: 20 }}>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-900/20">
                  <Lightbulb className="h-5 w-5" />
                </span>
                <h2 className="font-bold text-slate-900 dark:text-slate-100">راهنما و نکات</h2>
              </div>
              <div className="space-y-3">
                {guideItems.map((item, i) => (
                  <div key={i} className="flex gap-2.5">
                    <span className="mt-0.5 shrink-0 text-slate-300"><item.icon className="h-4 w-4" /></span>
                    <div>
                      <strong className="text-sm text-slate-700 dark:text-slate-300">{item.title}</strong>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-5 dark:border-sky-900/30 dark:bg-sky-900/10">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-900/30">
                  <Info className="h-5 w-5" />
                </span>
                <h2 className="font-bold text-slate-900 dark:text-slate-100">اطلاعات مفید</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">پس از ویرایش جلسه می‌توانید جزئیات آن را مشاهده، تصاویر آپلود و برای پرسنل مرتبط ارسال کنید.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
