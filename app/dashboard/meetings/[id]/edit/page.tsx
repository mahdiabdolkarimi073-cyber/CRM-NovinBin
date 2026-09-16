'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
  ArrowRight, Calendar, Clock, MapPin, Video, Lightbulb, Info,
  UserCheck, FileText, Link2, ClipboardList, Loader2, Phone, Check,
} from 'lucide-react';
import { fullName } from '@/lib/constants';
import { formatJalaliDateTime, toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';
import type { Profile, Meeting, MeetingAssignment } from '@/lib/types';

const guideItems = [
  { icon: ClipboardList, title: 'اطلاعات کامل وارد کنید', desc: 'تمام فیلدهای مربوطه را با دقت تکمیل کنید تا ابهام پیش نیاید.' },
  { icon: UserCheck, title: 'انتخاب مسئول مناسب', desc: 'فردی را انتخاب کنید که مسئول پیگیری و حضور در جلسه باشد.' },
  { icon: Clock, title: 'زمان و مکان دقیق', desc: 'تعیین زمان و مکان دقیق، حضور به‌موقع اعضا را تضمین می‌کند.' },
  { icon: FileText, title: 'دستور جلسه شفاف', desc: 'موضوعات بحث را از قبل مشخص کنید تا جلسه ساختارمندتر شود.' },
  { icon: Link2, title: 'لینک آنلاین (در صورت نیاز)', desc: 'برای جلسات آنلاین یک لینک معتبر و قابل دسترس وارد کنید.' },
];

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
            <span className="h-7 w-1.5 rounded-full bg-sky-500" />
            <h1 className="text-2xl font-bold text-slate-900">ویرایش جلسه</h1>
          </div>
          <div className="mt-1 text-sm text-slate-400">
            داشبورد <b>←</b> جلسات <b>←</b> ویرایش جلسه
          </div>
        </div>
        <Link href={`/dashboard/meetings/${id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
          <ArrowRight className="h-4 w-4" />
          بازگشت به جزئیات
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6" onSubmit={handleSubmit}>
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <Calendar className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-bold text-slate-900">اطلاعات جلسه</h2>
              <p className="text-sm text-slate-400">لطفاً اطلاعات مربوط به جلسه را ویرایش کنید.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-slate-700">نام هدف/مشتری/شرکت <span className="text-red-500">*</span></Label>
              <input
                type="text"
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                placeholder="نام شخص یا سازمانی که این جلسه مربوط به آن است"
                className={`flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm transition ${errors.contact_name ? 'border-red-300' : 'border-slate-200'} focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100`}
              />
              {errors.contact_name && <span className="mt-1 block text-xs text-red-500">{errors.contact_name}</span>}
            </div>

            <div>
              <Label className="mb-1.5 block text-sm font-medium text-slate-700">مسئول اصلی <span className="text-red-500">*</span></Label>
              <Select value={form.main_responsible} onValueChange={(v) => setForm({ ...form, main_responsible: v })}>
                <SelectTrigger className={`h-10 ${errors.main_responsible ? 'border-red-300' : ''}`}>
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
              {loadingStaff && <span className="mt-1 block text-xs text-slate-400">در حال بارگذاری پرسنل...</span>}
              {errors.main_responsible && <span className="mt-1 block text-xs text-red-500">{errors.main_responsible}</span>}
            </div>

            <div>
              <Label className="mb-1.5 block text-sm font-medium text-slate-700">شرکت‌کنندگان (اختیاری)</Label>
              <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-3">
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
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${checked ? 'border-sky-500 bg-sky-50 text-sky-600' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                    >
                      {checked && <Check className="h-3 w-3" />}
                      {fullName(s.firstName, s.lastName)}{s.id === profile?.id ? ' (خودم)' : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-slate-700">تاریخ <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><Calendar className="h-4 w-4" /></span>
                  <JalaliDatePicker
                    value={form.date ? new Date(form.date) : null}
                    onChange={(d) => setForm({ ...form, date: d ? toLocalDateString(d) : '' })}
                    placeholder="انتخاب تاریخ"
                    className={`h-10 ${errors.date ? 'border-red-300' : ''}`}
                  />
                </div>
                {errors.date && <span className="mt-1 block text-xs text-red-500">{errors.date}</span>}
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-slate-700">زمان <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><Clock className="h-4 w-4" /></span>
                  <input
                    type="time" dir="ltr"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className={`flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm transition ${errors.time ? 'border-red-300' : 'border-slate-200'} focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100`}
                  />
                </div>
                {errors.time && <span className="mt-1 block text-xs text-red-500">{errors.time}</span>}
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block text-sm font-medium text-slate-700">موضوع</Label>
              <input
                type="text"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                placeholder="موضوع جلسه را وارد کنید"
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-slate-700">مکان</Label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><MapPin className="h-4 w-4" /></span>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="محل برگزاری جلسه"
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-slate-700">لینک آنلاین</Label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><Video className="h-4 w-4" /></span>
                  <input
                    type="text" dir="ltr"
                    value={form.online_link}
                    onChange={(e) => setForm({ ...form, online_link: e.target.value })}
                    placeholder="https://..."
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-slate-700">شماره موبایل پرسنل (برای پیامک)</Label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><Phone className="h-4 w-4" /></span>
                  <input
                    type="tel" dir="ltr"
                    value={form.staff_phone}
                    onChange={(e) => setForm({ ...form, staff_phone: e.target.value })}
                    placeholder="09xxxxxxxxx"
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-slate-700">شماره موبایل مشتری (برای پیامک)</Label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><Phone className="h-4 w-4" /></span>
                  <input
                    type="tel" dir="ltr"
                    value={form.customer_phone}
                    onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                    placeholder="09xxxxxxxxx"
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block text-sm font-medium text-slate-700">دستور جلسه</Label>
              <textarea
                value={form.agenda}
                onChange={(e) => setForm({ ...form, agenda: e.target.value })}
                placeholder="دستور جلسه را بنویسید..."
                className="min-h-[100px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button type="button" className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50" onClick={() => router.push(`/dashboard/meetings/${id}`)} disabled={submitting}>
              انصراف
            </button>
            <button type="submit" className="flex-1 rounded-lg bg-sky-500 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-600 disabled:opacity-50" disabled={submitting}>
              {submitting ? (<span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> در حال ذخیره...</span>) : 'ذخیره تغییرات'}
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500"><Lightbulb className="h-5 w-5" /></span>
              <h2 className="font-bold text-slate-900">راهنما و نکات</h2>
            </div>
            <div className="space-y-3">
              {guideItems.map((item, i) => (
                <div key={i} className="flex gap-2.5">
                  <span className="mt-0.5 shrink-0 text-slate-300"><item.icon className="h-4 w-4" /></span>
                  <div>
                    <strong className="text-sm text-slate-700">{item.title}</strong>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600"><Info className="h-5 w-5" /></span>
              <h2 className="font-bold text-slate-900">اطلاعات مفید</h2>
            </div>
            <p className="text-sm text-slate-500">پس از ویرایش جلسه می‌توانید جزئیات آن را مشاهده، تصاویر آپلود و برای پرسنل مرتبط ارسال کنید.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
