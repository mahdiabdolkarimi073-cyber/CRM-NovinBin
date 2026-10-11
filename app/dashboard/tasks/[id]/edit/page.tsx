'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchData, updateData, createData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight, Clipboard, Flag, Activity, Lightbulb,
  Info, Type, AlignRight, Gauge, Clock, UserCheck, Loader2, Check, Trash2,
  MessageSquare, Send,
} from 'lucide-react';
import { TASK_STATUSES, TASK_PRIORITIES, fullName } from '@/lib/constants';
import { toLocalDateString, relativeTime } from '@/lib/format';
import { toast } from 'sonner';
import type { Profile, TaskAssignee, Task } from '@/lib/types';

const MAX_DESC = 1000;

const guideItems = [
  { icon: Type, title: 'عنوان واضح و مشخص', desc: 'عنوانی کوتاه و گویا برای وظیفه بنویسید.' },
  { icon: AlignRight, title: 'توضیحات کامل', desc: 'جزئیات لازم را در بخش توضیحات وارد کنید.' },
  { icon: Gauge, title: 'انتخاب اولویت مناسب', desc: 'اولویت را متناسب با اهمیت و فوریت تنظیم کنید.' },
  { icon: Clock, title: 'موعد واقع‌بینانه', desc: 'تاریخ انجام را به‌صورت واقع‌بینانه مشخص کنید.' },
  { icon: UserCheck, title: 'تخصیص مسئول مناسب', desc: 'وظیفه را به فرد مناسب واگذار کنید.' },
];

const inputStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: '1px solid #E2E8F0',
  padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none',
};

export default function EditTaskPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const router = useRouter();
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingTask, setLoadingTask] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [existingAssignees, setExistingAssignees] = useState<string[]>([]);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    status: 'new',
    dueDate: '',
  });

  const loadTask = useCallback(async () => {
    if (!id) return;
    try {
      const [tasks, assignees] = await Promise.all([
        fetchData<Task>('tasks', { where: { id } }),
        fetchData<TaskAssignee>('task_assignees', { where: { taskId: id } }),
      ]);

      if (tasks && tasks.length > 0) {
        const t = tasks[0];
        setForm({
          title: t.title || '',
          description: t.description || '',
          assignedTo: t.assignedTo || '',
          priority: t.priority || 'medium',
          status: t.status || 'new',
          dueDate: t.dueDate ? t.dueDate.split('T')[0] : '',
        });
        const aIds = (assignees || []).map((a) => a.profileId);
        setExistingAssignees(aIds);
        setAssigneeIds(aIds);
      } else {
        toast.error('وظیفه یافت نشد');
        router.push('/dashboard/tasks');
      }
    } catch (error: any) {
      toast.error('بارگذاری وظیفه ناموفق: ' + error.message);
    } finally {
      setLoadingTask(false);
    }
  }, [id, router]);

  const loadStaff = useCallback(async () => {
    try {
      const data = await fetchData<Profile>('profiles', {
        where: {
          userType: 'staff',
          role: { in: ['admin', 'personnel', 'owner', 'super_admin'] },
        },
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
    loadTask();
  }, [loadStaff, loadTask]);

  const loadComments = useCallback(async () => {
    if (!id) return;
    try {
      const data = await fetchData<any>('task_comments', { where: { taskId: id }, orderBy: { createdAt: 'asc' } });
      setComments(data || []);
    } catch {
      setComments([]);
    }
  }, [id]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleAddComment = async () => {
    if (!id || !newComment.trim() || !profile) return;
    setCommentLoading(true);
    try {
      await createData('task_comments', { taskId: id, profileId: profile.id, content: newComment.trim() });
      const myName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
      const task = await fetchData<Task>('tasks', { where: { id } });
      const t = task?.[0];
      if (t) {
        const notifPromises: Promise<any>[] = [];
        const recipients = new Set<string>();
        if (t.assignedTo && t.assignedTo !== profile.id) recipients.add(t.assignedTo);
        if (t.createdBy && t.createdBy !== profile.id) recipients.add(t.createdBy);
        staff.filter((s) => s.role === 'super_admin').forEach((a) => { if (a.id !== profile.id) recipients.add(a.id); });
        recipients.forEach((rid) => {
          notifPromises.push(
            createData('notifications', {
              profileId: rid,
              title: 'نظر جدید روی وظیفه',
              body: `${myName} روی وظیفه «${t.title}» نظر جدیدی ثبت کرد: ${newComment.trim().slice(0, 80)}`,
              type: 'task',
              priority: 'normal',
              link: '/dashboard/tasks',
            }).catch(() => {})
          );
        });
        await Promise.all(notifPromises);
      }
      setNewComment('');
      loadComments();
    } catch (error: any) {
      toast.error('ثبت نظر ناموفق: ' + error.message);
    }
    setCommentLoading(false);
  };

  const getStaffName = (sid: string | null) => {
    if (!sid) return null;
    const s = staff.find((p) => p.id === sid);
    return s ? fullName(s.firstName, s.lastName) : null;
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'عنوان وظیفه الزامی است';
    if (form.description.length > MAX_DESC) e.description = `حداکثر ${MAX_DESC} کاراکتر`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const toggleAssignee = (aid: string) => {
    setAssigneeIds((prev) => prev.includes(aid) ? prev.filter((x) => x !== aid) : [...prev, aid]);
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('آیا از حذف این وظیفه مطمئن هستید؟')) return;
    try {
      await deleteData('tasks', { id });
      toast.success('وظیفه حذف شد');
      router.push('/dashboard/tasks');
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    try {
      await updateData('tasks', { id }, {
        title: form.title.trim(),
        description: form.description || null,
        assignedTo: form.assignedTo || (assigneeIds.length > 0 ? assigneeIds[0] : null),
        priority: form.priority,
        status: form.status,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      });

      const allAssignees = new Set<string>(assigneeIds);
      if (form.assignedTo) allAssignees.add(form.assignedTo);

      const toAdd = Array.from(allAssignees).filter((aid) => !existingAssignees.includes(aid));
      const toRemove = existingAssignees.filter((aid) => !allAssignees.has(aid));

      await Promise.all([
        ...toAdd.map((aid) =>
          createData('task_assignees', { taskId: id, profileId: aid }).catch(() => {})
        ),
        ...toRemove.map((aid) =>
          deleteData('task_assignees', { taskId: id, profileId: aid }).catch(() => {})
        ),
      ]);

      toast.success('وظیفه ویرایش شد');
      router.push('/dashboard/tasks');
    } catch (error: any) {
      toast.error('ویرایش وظیفه ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingTask) {
    return (
      <div className="nb-editor-loading" dir="rtl">
        <span />
        <p>در حال بارگذاری وظیفه...</p>
      </div>
    );
  }

  return (
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/tasks" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به وظایف
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> وظایف <b>←</b> ویرایش وظیفه</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/tasks')} disabled={submitting}>
            انصراف
          </button>
          <button type="button" onClick={handleDelete} className="nb-editor-discard" style={{ color: '#ef4444', borderColor: '#fca5a5' }} disabled={submitting}>
            <Trash2 className="h-4 w-4" />
            حذف وظیفه
          </button>
          <button type="submit" form="task-edit-form" className="nb-editor-save-btn" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="task-edit-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-900/20">
                  <Clipboard className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>ویرایش وظیفه</h2>
                  <p className="text-sm text-slate-400">اطلاعات وظیفه را ویرایش کنید.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">عنوان وظیفه <span className="text-red-500">*</span></Label>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="مثال: تماس با مشتری برای پیگیری سفارش"
                  className={`nb-input ${errors.title ? 'border-red-300' : ''}`}
                  style={{ ...inputStyle, borderColor: errors.title ? '#FCA5A5' : '#E2E8F0' }}
                />
                {errors.title && <span className="nb-editor-error">{errors.title}</span>}
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">توضیحات</Label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, MAX_DESC) })}
                  placeholder="توضیحات کامل وظیفه، الزامات و نکات مهم را اینجا بنویسید..."
                  className="nb-input"
                  style={{ minHeight: 120, borderRadius: 10, border: '1px solid #E2E8F0', padding: '12px 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none', resize: 'vertical' }}
                  rows={6}
                />
                <p className="text-xs text-slate-400 text-left">{form.description.length.toLocaleString('fa-IR')} / {MAX_DESC.toLocaleString('fa-IR')}</p>
                {errors.description && <span className="nb-editor-error">{errors.description}</span>}
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">مسئول اصلی</Label>
                <Select
                  value={form.assignedTo || 'none'}
                  onValueChange={(v) => setForm({ ...form, assignedTo: v === 'none' ? '' : v })}
                >
                  <SelectTrigger className="h-11">
                    <UserCheck className="ml-1 h-4 w-4 text-slate-400" />
                    <SelectValue placeholder="انتخاب فرد مسئول اصلی..." />
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

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">مسئولین بیشتر (اختیاری)</Label>
                <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
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
                  <Label className="nb-editor-label">اولویت <span className="text-red-500">*</span></Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger className="h-11">
                      <Flag className="ml-1 h-4 w-4 text-slate-400" />
                      <SelectValue placeholder="انتخاب اولویت..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_PRIORITIES.map((p) => (
                        <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">وضعیت <span className="text-red-500">*</span></Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger className="h-11">
                      <Activity className="ml-1 h-4 w-4 text-slate-400" />
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

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">موعد انجام</Label>
                <JalaliDatePicker
                  value={form.dueDate ? new Date(form.dueDate) : null}
                  onChange={(d) => setForm({ ...form, dueDate: d ? toLocalDateString(d) : '' })}
                  placeholder="انتخاب تاریخ"
                  className="h-11"
                />
              </div>
            </div>
          </form>

          <div className="lg:col-span-2 nb-editor-canvas" style={{ padding: 24 }}>
            <div className="mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-slate-400" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">نظرات و ارجاعات</h3>
              <Badge variant="secondary" className="text-xs">{comments.length.toLocaleString('fa-IR')}</Badge>
            </div>
            <div className="mb-4 max-h-64 space-y-2 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">هنوز نظری ثبت نشده است</p>
              ) : comments.map((c) => {
                const author = getStaffName(c.profileId);
                return (
                  <div key={c.id} className="flex items-start gap-2 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800">
                    <Avatar className="h-7 w-7 shrink-0"><AvatarFallback className="bg-slate-200 text-[10px] text-slate-600">{author?.[0] || '؟'}</AvatarFallback></Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{author || 'کاربر'}</span>
                        <span className="text-[10px] text-slate-400">{relativeTime(c.createdAt)}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{c.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="نظر یا ارجاع بنویسید..."
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
              />
              <Button size="sm" onClick={handleAddComment} disabled={commentLoading || !newComment.trim()}>
                {commentLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

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
              <p className="text-sm text-slate-500 dark:text-slate-400">پس از ویرایش وظیفه می‌توانید آن را در برد کانبان یا حالت لیست مشاهده و مدیریت کنید.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
