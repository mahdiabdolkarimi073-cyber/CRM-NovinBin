'use client';

import { useEffect, useState, useCallback } from 'react';
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
  ArrowRight, Clipboard, Calendar, User, Flag, Activity, Lightbulb,
  Info, Type, AlignRight, Gauge, Clock, UserCheck, Loader2, Check,
} from 'lucide-react';
import { TASK_STATUSES, TASK_PRIORITIES, fullName } from '@/lib/constants';
import { toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';
import type { Profile, TaskAssignee } from '@/lib/types';

const MAX_DESC = 1000;

const guideItems = [
  { icon: Type, title: 'عنوان واضح و مشخص', desc: 'عنوانی کوتاه و گویا برای وظیفه بنویسید.' },
  { icon: AlignRight, title: 'توضیحات کامل', desc: 'جزئیات لازم را در بخش توضیحات وارد کنید.' },
  { icon: Gauge, title: 'انتخاب اولویت مناسب', desc: 'اولویت را متناسب با اهمیت و فوریت تنظیم کنید.' },
  { icon: Clock, title: 'موعد واقع‌بینانه', desc: 'تاریخ انجام را به‌صورت واقع‌بینانه مشخص کنید.' },
  { icon: UserCheck, title: 'تخصیص مسئول مناسب', desc: 'وظیفه را به فرد مناسب واگذار کنید.' },
];

export default function NewTaskPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    status: 'new',
    dueDate: '',
  });
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

  const loadStaff = useCallback(async () => {
    try {
      const data = await fetchData<Profile>('profiles', {
        where: { role: { in: ['admin', 'personnel', 'owner', 'super_admin'] } },
      });
      setStaff(data || []);
    } catch {
      setStaff([]);
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'عنوان وظیفه الزامی است';
    if (form.description.length > MAX_DESC) e.description = `حداکثر ${MAX_DESC} کاراکتر`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const toggleAssignee = (id: string) => {
    setAssigneeIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    try {
      const task = await createData<{ id: string }>('tasks', {
        title: form.title.trim(),
        description: form.description || null,
        assignedTo: form.assignedTo || (assigneeIds.length > 0 ? assigneeIds[0] : null),
        priority: form.priority,
        status: form.status,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        createdBy: profile.id,
      });
      const allAssignees = new Set<string>(assigneeIds);
      if (form.assignedTo) allAssignees.add(form.assignedTo);
      const assigneePromises = Array.from(allAssignees).map((aid) =>
        createData<TaskAssignee>('task_assignees', { taskId: task.id, profileId: aid }).catch(() => {})
      );
      await Promise.all(assigneePromises);
      const myName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
      const notifPromises: Promise<any>[] = [];
      allAssignees.forEach((aid) => {
        if (aid !== profile.id) {
          notifPromises.push(
            createData('notifications', {
              profileId: aid,
              title: 'وظیفه جدید به شما اختصاص داده شد',
              body: `یک تسک «${form.title}» توسط ${myName} به شما اختصاص داده شد`,
              type: 'task',
              priority: form.priority === 'critical' ? 'urgent' : 'normal',
              link: '/dashboard/tasks',
            }).catch(() => {})
          );
        }
      });
      const superAdmins = staff.filter((s) => s.role === 'super_admin' || s.role === 'owner');
      superAdmins.forEach((admin) => {
        if (admin.id !== profile.id && !allAssignees.has(admin.id)) {
          notifPromises.push(
            createData('notifications', {
              profileId: admin.id,
              title: 'وظیفه جدید ایجاد شد',
              body: `${myName} یک وظیفه جدید «${form.title}» ایجاد کرد${allAssignees.size > 0 ? ' و به افراد اختصاص داد' : ''}`,
              type: 'task',
              priority: 'normal',
              link: '/dashboard/tasks',
            }).catch(() => {})
          );
        }
      });
      await Promise.all(notifPromises);
      toast.success('وظیفه با موفقیت ایجاد شد');
      router.push('/dashboard/tasks');
    } catch (error: any) {
      toast.error('ایجاد وظیفه ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-task-page" dir="rtl">
      <div className="create-task-container">
        {/* Header */}
        <header className="create-task-header">
          <div>
            <div className="create-task-title">
              <span className="title-accent-bar" />
              <h1>ایجاد وظیفه جدید</h1>
            </div>
            <div className="create-task-breadcrumb">
              داشبورد <b>←</b> وظایف <b>←</b> ایجاد وظیفه
            </div>
          </div>
          <Link href="/dashboard/tasks" className="back-button">
            <ArrowRight className="h-4 w-4" />
            بازگشت به وظایف
          </Link>
        </header>

        {/* Main grid */}
        <div className="create-task-grid">
          {/* Form card */}
          <form className="task-form-card" onSubmit={handleSubmit}>
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon">
                  <Clipboard className="h-5 w-5" />
                </span>
                <div>
                  <h2>اطلاعات وظیفه</h2>
                  <p>جزئیات وظیفه جدید را وارد کنید. فیلدهای ستاره‌دار الزامی هستند.</p>
                </div>
              </div>
            </div>
            <div className="form-card-divider" />

            <div className="form-fields">
              {/* Title */}
              <div className="field-group">
                <Label className="field-label">عنوان وظیفه <span className="required-star">*</span></Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="مثال: تماس با مشتری برای پیگیری سفارش"
                  className="task-input"
                />
                {errors.title && <span className="field-error">{errors.title}</span>}
              </div>

              {/* Description */}
              <div className="field-group">
                <Label className="field-label">توضیحات</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="توضیحات کامل وظیفه، الزامات و نکات مهم را اینجا بنویسید..."
                  className="task-textarea"
                  maxLength={MAX_DESC}
                />
                <div className="char-counter">
                  <span>{form.description.length.toLocaleString('fa-IR')} / {MAX_DESC.toLocaleString('fa-IR')}</span>
                </div>
                {errors.description && <span className="field-error">{errors.description}</span>}
              </div>

              {/* Primary assignee */}
              <div className="field-group">
                <Label className="field-label">مسئول اصلی</Label>
                <Select
                  value={form.assignedTo || 'none'}
                  onValueChange={(v) => setForm({ ...form, assignedTo: v === 'none' ? '' : v })}
                >
                  <SelectTrigger className="task-select">
                    <span className="select-icon-right"><User className="h-4 w-4" /></span>
                    <SelectValue placeholder="انتخاب فرد مسئول اصلی…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون تخصیص</SelectItem>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {fullName(s.firstName, s.lastName)}{s.id === profile?.id ? ' (خودم)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Multi-assignee checkboxes */}
              <div className="field-group">
                <Label className="field-label">مسئولین بیشتر (اختیاری)</Label>
                <div className="flex flex-wrap gap-2 rounded-lg border border-[#E2E8F0] bg-white p-3">
                  {loadingStaff ? (
                    <span className="text-sm text-slate-400">در حال بارگذاری...</span>
                  ) : staff.length === 0 ? (
                    <span className="text-sm text-slate-400">کارمندی یافت نشد</span>
                  ) : staff.map((s) => {
                    const checked = assigneeIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleAssignee(s.id)}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${checked ? 'border-[#2563EB] bg-[#EFF4FF] text-[#2563EB]' : 'border-[#E2E8F0] bg-white text-slate-600 hover:border-[#94A3B8]'}`}
                      >
                        {checked && <Check className="h-3 w-3" />}
                        {fullName(s.firstName, s.lastName)}{s.id === profile?.id ? ' (خودم)' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Management row: 2 selects */}
              <div className="management-row">

                <div className="field-group">
                  <Label className="field-label">اولویت <span className="required-star">*</span></Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger className="task-select">
                      <span className="select-icon-right"><Flag className="h-4 w-4" /></span>
                      <SelectValue placeholder="انتخاب اولویت…" />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_PRIORITIES.map((p) => (
                        <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="field-group">
                  <Label className="field-label">وضعیت اولیه <span className="required-star">*</span></Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger className="task-select">
                      <span className="select-icon-right"><Activity className="h-4 w-4" /></span>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_STATUSES.map((s) => (
                        <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Due date */}
              <div className="field-group">
                <Label className="field-label">موعد انجام</Label>
                <div className="date-input-wrap">
                  <span className="date-icon"><Calendar className="h-4 w-4" /></span>
                  <JalaliDatePicker
                    value={form.dueDate ? new Date(form.dueDate) : null}
                    onChange={(d) => setForm({ ...form, dueDate: d ? toLocalDateString(d) : '' })}
                    placeholder="انتخاب تاریخ"
                    className="task-date-input"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="form-actions-row">
              <button type="button" className="cancel-btn" onClick={() => router.push('/dashboard/tasks')} disabled={submitting}>
                انصراف
              </button>
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ایجاد...</>) : 'ایجاد وظیفه'}
              </button>
            </div>
          </form>

          {/* Sidebar */}
          <aside className="task-sidebar">
            <div className="guide-card">
              <div className="guide-card-header">
                <span className="guide-card-icon"><Lightbulb className="h-5 w-5" /></span>
                <h2>راهنما و نکات</h2>
              </div>
              <div className="guide-items">
                {guideItems.map((item, i) => (
                  <div key={i}>
                    <div className="guide-item">
                      <span className="guide-item-icon"><item.icon className="h-5 w-5" /></span>
                      <div className="guide-item-text">
                        <strong>{item.title}</strong>
                        <p>{item.desc}</p>
                      </div>
                    </div>
                    {i < guideItems.length - 1 && <div className="guide-item-divider" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="info-card">
              <div className="info-card-header">
                <span className="info-card-icon"><Info className="h-5 w-5" /></span>
                <h2>اطلاعات مفید</h2>
              </div>
              <p>وظایف ایجاد شده در بخش «وظایف» قابل مشاهده و مدیریت هستند. می‌توانید آن‌ها را در برد کانبان یا حالت لیست ببینید و وضعیت را تغییر دهید.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
