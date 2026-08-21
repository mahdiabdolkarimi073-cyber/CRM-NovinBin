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
  ArrowRight, Calendar, Clock, MapPin, Video, Lightbulb, Info,
  UserCheck, FileText, Link2, ClipboardList, Loader2,
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
    assigned_to: 'none',
    date: '',
    time: '',
    topic: '',
    location: '',
    online_link: '',
    agenda: '',
  });

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
    if (form.assigned_to === 'none') e.assigned_to = 'تخصیص به پرسنل الزامی است';
    if (!form.date) e.date = 'تاریخ جلسه الزامی است';
    if (!form.time) e.time = 'زمان جلسه الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
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
        createdBy: profile.id,
      });

      await createData('meeting_assignments', {
        meetingId: meetingData.id,
        assignedTo: form.assigned_to,
        contactName: form.contact_name.trim(),
        createdBy: profile.id,
      });

      const myName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
      const notifPromises: Promise<any>[] = [];

      // Notify assigned person
      if (form.assigned_to !== profile.id) {
        notifPromises.push(
          createData('notifications', {
            profileId: form.assigned_to,
            title: 'جلسه جدید به شما تخصیص داده شد',
            body: `جلسه با ${form.contact_name} در ${formatJalaliDateTime(meetingDateTime)} توسط ${myName}`,
            type: 'meeting',
            priority: 'normal',
            link: '/dashboard/meetings',
          }).catch(() => {})
        );
      }

      // Notify all super_admins/owners
      const superAdmins = staff.filter((s) => s.role === 'super_admin' || s.role === 'owner');
      superAdmins.forEach((admin) => {
        if (admin.id !== profile.id && admin.id !== form.assigned_to) {
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
      toast.success('جلسه ایجاد و به پرسنل تخصیص داده شد');
      router.push('/dashboard/meetings');
    } catch (error: any) {
      toast.error('ایجاد جلسه ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="new-meeting-page" dir="rtl">
      <div className="new-meeting-container">
        {/* Header */}
        <header className="new-meeting-header">
          <div>
            <div className="new-meeting-title-row">
              <span className="new-meeting-title-accent" />
              <h1>ایجاد جلسه جدید</h1>
            </div>
            <div className="new-meeting-breadcrumb">
              داشبورد <b>←</b> جلسات <b>←</b> ایجاد جلسه
            </div>
          </div>
          <Link href="/dashboard/meetings" className="new-meeting-back-button">
            <ArrowRight className="h-4 w-4" />
            بازگشت به جلسات
          </Link>
        </header>

        {/* Main grid */}
        <div className="new-meeting-grid">
          {/* Form card */}
          <form className="meeting-form-card" onSubmit={handleSubmit}>
            <div className="meeting-form-header">
              <div className="meeting-form-title">
                <span className="meeting-form-icon">
                  <Calendar className="h-5 w-5" />
                </span>
                <div>
                  <h2>اطلاعات جلسه</h2>
                  <p>لطفاً اطلاعات مربوط به جلسه جدید را وارد کنید.</p>
                </div>
              </div>
            </div>
            <div className="meeting-form-divider" />

            <div className="meeting-form-fields">
              {/* Contact name */}
              <div className="meeting-field-group">
                <Label className="meeting-field-label">نام هدف/مشتری/شرکت <span className="meeting-required-star">*</span></Label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  placeholder="نام شخص یا سازمانی که این جلسه مربوط به آن است"
                  className={`meeting-input ${errors.contact_name ? 'meeting-input-error' : ''}`}
                />
                {errors.contact_name && <span className="meeting-field-error">{errors.contact_name}</span>}
              </div>

              {/* Assign to staff */}
              <div className="meeting-field-group">
                <Label className="meeting-field-label">تخصیص به پرسنل <span className="meeting-required-star">*</span></Label>
                <Select
                  value={form.assigned_to}
                  onValueChange={(v) => setForm({ ...form, assigned_to: v })}
                >
                  <SelectTrigger className={`meeting-select ${errors.assigned_to ? 'meeting-input-error' : ''}`}>
                    <SelectValue placeholder="انتخاب فرد مسئول..." />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {fullName(s.firstName, s.lastName)}{s.id === profile?.id ? ' (خودم)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {loadingStaff && <span className="meeting-field-hint">در حال بارگذاری پرسنل...</span>}
                {errors.assigned_to && <span className="meeting-field-error">{errors.assigned_to}</span>}
                {staff.length === 0 && !loadingStaff && <span className="meeting-field-hint">پرسنل فعالی وجود ندارد.</span>}
              </div>

              {/* Date & Time */}
              <div className="meeting-row-2">
                <div className="meeting-field-group">
                  <Label className="meeting-field-label">تاریخ <span className="meeting-required-star">*</span></Label>
                  <div className="meeting-date-wrap">
                    <span className="meeting-date-icon"><Calendar className="h-4 w-4" /></span>
                    <JalaliDatePicker
                      value={form.date ? new Date(form.date) : null}
                      onChange={(d) => setForm({ ...form, date: d ? toLocalDateString(d) : '' })}
                      placeholder="انتخاب تاریخ"
                      className={`meeting-date-input ${errors.date ? 'meeting-input-error' : ''}`}
                    />
                  </div>
                  {errors.date && <span className="meeting-field-error">{errors.date}</span>}
                </div>
                <div className="meeting-field-group">
                  <Label className="meeting-field-label">زمان <span className="meeting-required-star">*</span></Label>
                  <div className="meeting-date-wrap">
                    <span className="meeting-date-icon"><Clock className="h-4 w-4" /></span>
                    <input
                      type="time"
                      dir="ltr"
                      value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                      className={`meeting-time-input ${errors.time ? 'meeting-input-error' : ''}`}
                    />
                  </div>
                  {errors.time && <span className="meeting-field-error">{errors.time}</span>}
                </div>
              </div>

              {/* Topic */}
              <div className="meeting-field-group">
                <Label className="meeting-field-label">موضوع</Label>
                <input
                  type="text"
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  placeholder="موضوع جلسه را وارد کنید"
                  className="meeting-input"
                />
              </div>

              {/* Location & Online link */}
              <div className="meeting-row-2">
                <div className="meeting-field-group">
                  <Label className="meeting-field-label">مکان</Label>
                  <div className="meeting-date-wrap">
                    <span className="meeting-date-icon"><MapPin className="h-4 w-4" /></span>
                    <input
                      type="text"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="محل برگزاری جلسه"
                      className="meeting-date-input"
                    />
                  </div>
                </div>
                <div className="meeting-field-group">
                  <Label className="meeting-field-label">لینک آنلاین</Label>
                  <div className="meeting-date-wrap">
                    <span className="meeting-date-icon"><Video className="h-4 w-4" /></span>
                    <input
                      type="text"
                      dir="ltr"
                      value={form.online_link}
                      onChange={(e) => setForm({ ...form, online_link: e.target.value })}
                      placeholder="https://..."
                      className="meeting-date-input"
                    />
                  </div>
                </div>
              </div>

              {/* Agenda */}
              <div className="meeting-field-group">
                <Label className="meeting-field-label">دستور جلسه</Label>
                <textarea
                  value={form.agenda}
                  onChange={(e) => setForm({ ...form, agenda: e.target.value })}
                  placeholder="دستور جلسه را بنویسید..."
                  className="meeting-textarea"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="meeting-actions-row">
              <button type="button" className="meeting-cancel-btn" onClick={() => router.push('/dashboard/meetings')} disabled={submitting}>
                انصراف
              </button>
              <button type="submit" className="meeting-submit-btn" disabled={submitting}>
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ایجاد...</>) : 'ایجاد و تخصیص جلسه'}
              </button>
            </div>
          </form>

          {/* Sidebar */}
          <aside className="meeting-sidebar">
            <div className="meeting-guide-card">
              <div className="meeting-guide-header">
                <span className="meeting-guide-icon"><Lightbulb className="h-5 w-5" /></span>
                <h2>راهنما و نکات</h2>
              </div>
              <p className="meeting-guide-subtitle">برای ایجاد یک جلسه موثر، نکات زیر را در نظر داشته باشید:</p>
              <div className="meeting-guide-items">
                {guideItems.map((item, i) => (
                  <div key={i}>
                    <div className="meeting-guide-item">
                      <span className={`meeting-guide-item-icon meeting-guide-icon-${i}`}>
                        <item.icon className="h-5 w-5" />
                      </span>
                      <div className="meeting-guide-item-text">
                        <strong>{item.title}</strong>
                        <p>{item.desc}</p>
                      </div>
                    </div>
                    {i < guideItems.length - 1 && <div className="meeting-guide-divider" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="meeting-info-card">
              <div className="meeting-info-header">
                <span className="meeting-info-icon"><Info className="h-5 w-5" /></span>
                <h2>اطلاعات مفید</h2>
              </div>
              <p>پس از ایجاد جلسه می‌توانید جزئیات آن را ویرایش و برای پرسنل مرتبط ارسال کنید.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
