'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchData, createData } from '@/lib/data-client';
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
import { formatJalaliDateTime, toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';
import type { Profile } from '@/lib/types';

const guideItems = [
  { icon: ClipboardList, title: 'اطلاعات کامل وارد کنید', desc: 'تمام فیلدهای مربوطه را با دقت تکمیل کنید تا ابهام پیش نیاید.' },
  { icon: UserCheck, title: 'انتخاب مسئول مناسب', desc: 'فردی را انتخاب کنید که مسئول پیگیری و حضور در جلسه باشد.' },
  { icon: Clock, title: 'زمان و مکان دقیق', desc: 'تعیین زمان و مکان دقیق، حضور به‌موقع اعضا را تضمین می‌کند.' },
  { icon: FileText, title: 'دستور جلسه شفاف', desc: 'موضوعات بحث را از قبل مشخص کنید تا جلسه ساختارمندتر شود.' },
  { icon: Link2, title: 'لینک آنلاین (در صورت نیاز)', desc: 'برای جلسات آنلاین یک لینک معتبر و قابل دسترس وارد کنید.' },
];

export default function NewMeetingPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nameInputRef = useRef<HTMLInputElement>(null);
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
  const [participantIds, setParticipantIds] = useState<string[]>([]);

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
    setTimeout(() => nameInputRef.current?.focus(), 100);
  }, [loadStaff]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.contact_name.trim()) e.contact_name = 'نام هدف/مشتری/شرکت الزامی است';
    if (form.main_responsible === 'none') e.main_responsible = 'انتخاب مسئول اصلی الزامی است';
    if (!form.date) e.date = 'تاریخ جلسه الزامی است';
    if (!form.time) e.time = 'زمان جلسه الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const toggleParticipant = (id: string) => {
    setParticipantIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);

    const meetingDateTime = new Date(`${form.date}T${form.time}`);

    try {
      const meetingData = await createData('meetings', {
        title: form.contact_name.trim(),
        topic: form.topic || null,
        agenda: form.agenda || null,
        date: meetingDateTime.toISOString(),
        location: form.location || null,
        onlineLink: form.online_link || null,
        staffPhone: form.staff_phone.trim() || null,
        customerPhone: form.customer_phone.trim() || null,
        mainResponsibleId: form.main_responsible,
        status: 'scheduled',
        createdBy: profile.id,
      });

      await createData('meeting_assignments', {
        meetingId: meetingData.id,
        assignedTo: form.main_responsible,
        contactName: form.contact_name.trim(),
        createdBy: profile.id,
      });

      const allParticipants = new Set<string>(participantIds);
      allParticipants.add(form.main_responsible);
      const participantPromises = Array.from(allParticipants).map((pid) =>
        createData('meeting_participants', { meetingId: meetingData.id, profileId: pid }).catch(() => {})
      );
      await Promise.all(participantPromises);

      const myName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
      const notifPromises: Promise<any>[] = [];

      if (form.main_responsible !== profile.id) {
        notifPromises.push(
          createData('notifications', {
            profileId: form.main_responsible,
            title: 'جلسه جدید به شما تخصیص داده شد',
            body: `جلسه با ${form.contact_name} در ${formatJalaliDateTime(meetingDateTime)} توسط ${myName}`,
            type: 'meeting',
            priority: 'normal',
            link: '/dashboard/meetings',
          }).catch(() => {})
        );
      }

      allParticipants.forEach((pid) => {
        if (pid !== profile.id && pid !== form.main_responsible) {
          notifPromises.push(
            createData('notifications', {
              profileId: pid,
              title: 'شما در جلسه جدید دعوت شده‌اید',
              body: `جلسه با ${form.contact_name} در ${formatJalaliDateTime(meetingDateTime)}`,
              type: 'meeting',
              priority: 'normal',
              link: '/dashboard/meetings',
            }).catch(() => {})
          );
        }
      });

      const superAdmins = staff.filter((s) => s.role === 'super_admin' || s.role === 'owner');
      superAdmins.forEach((admin) => {
        if (admin.id !== profile.id && admin.id !== form.main_responsible && !allParticipants.has(admin.id)) {
          notifPromises.push(
            createData('notifications', {
              profileId: admin.id,
              title: 'جلسه جدید ایجاد شد',
              body: `${myName} یک جلسه با ${form.contact_name} ایجاد کرد`,
              type: 'meeting',
              priority: 'normal',
              link: '/dashboard/meetings',
            }).catch(() => {})
          );
        }
      });

      await Promise.all(notifPromises);

      const msUntilMeeting = meetingDateTime.getTime() - Date.now();
      if (msUntilMeeting <= 2 * 60 * 60 * 1000) {
        fetch('/api/meetings/check-sms', { method: 'POST' }).catch(() => {});
      }

      toast.success('جلسه ایجاد شد');
      router.push('/dashboard/meetings');
    } catch (error: any) {
      toast.error('ایجاد جلسه ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/meetings" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به جلسات
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> جلسات <b>←</b> ایجاد جلسه</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/meetings')} disabled={submitting}>
            انصراف
          </button>
          <button type="submit" form="meeting-form" className="nb-editor-save-btn" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال ایجاد...' : 'ایجاد جلسه'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="meeting-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-900/20">
                  <Calendar className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>اطلاعات جلسه</h2>
                  <p className="text-sm text-slate-400">لطفاً اطلاعات مربوط به جلسه جدید را وارد کنید.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">نام هدف/مشتری/شرکت <span className="text-red-500">*</span></Label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  placeholder="نام شخص یا سازمانی که این جلسه مربوط به آن است"
                  className={`nb-input ${errors.contact_name ? 'border-red-300' : ''}`}
                  style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
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
                    className={`nb-input ${errors.time ? 'border-red-300' : ''}`}
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
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
                  style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
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
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
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
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
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
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
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
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
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
              <p className="text-sm text-slate-500 dark:text-slate-400">پس از ایجاد جلسه می‌توانید جزئیات آن را ویرایش، تصاویر آپلود و برای پرسنل مرتبط ارسال کنید.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
