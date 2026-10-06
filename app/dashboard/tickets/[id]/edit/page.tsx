'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight, MessageCircle, Loader2, User, Flag,
  Lightbulb, Info, Type, AlignRight, Gauge, UserCheck, Headset, Check,
} from 'lucide-react';
import { TASK_PRIORITIES, fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type { Profile, Customer, TicketDepartment, Ticket } from '@/lib/types';

const MAX_DESC = 2000;

const guideItems = [
  { icon: Type, title: 'عنوان واضح', desc: 'عنوانی کوتاه و گویا برای تیکت بنویسید.' },
  { icon: AlignRight, title: 'شرح کامل', desc: 'جزئیات مشکل یا درخواست را کامل توضیح دهید.' },
  { icon: Gauge, title: 'اولویت مناسب', desc: 'اولویت را متناسب با اهمیت و فوریت تنظیم کنید.' },
  { icon: UserCheck, title: 'تخصیص مسئول', desc: 'تیکت را به فرد مناسب واگذار کنید.' },
];

const inputStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: '1px solid #E2E8F0',
  padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none',
};

const TICKET_STATUSES = [
  { key: 'open', label: 'باز' },
  { key: 'in_progress', label: 'در حال انجام' },
  { key: 'pending', label: 'در انتظار پاسخ' },
  { key: 'resolved', label: 'حل شده' },
  { key: 'closed', label: 'بسته شده' },
];

export default function EditTicketPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<TicketDepartment[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingTicket, setLoadingTicket] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    subject: '',
    description: '',
    customerId: '',
    priority: 'medium',
    departmentId: '',
    status: 'open',
    assignedTo: '',
  });

  const loadData = useCallback(async () => {
    try {
      const [custData, staffData, deptData] = await Promise.all([
        fetchData<Customer>('customers', { where: {} }),
        fetchData<Profile>('profiles', { where: { userType: 'staff', role: { in: ['personnel', 'admin', 'super_admin'] } } }),
        fetchData<TicketDepartment>('ticket_departments', { where: { active: true }, orderBy: { name: 'asc' } }),
      ]);
      setCustomers(custData || []);
      setStaff(staffData || []);
      setDepartments(deptData || []);
    } catch {
      setCustomers([]);
      setStaff([]);
    } finally {
      setLoadingData(false);
    }
  }, []);

  const loadTicket = useCallback(async () => {
    if (!id) return;
    try {
      const tickets = await fetchData<Ticket>('tickets', { where: { id } });
      if (tickets && tickets.length > 0) {
        const t = tickets[0];
        setForm({
          subject: t.subject || '',
          description: t.description || '',
          customerId: t.customerId || '',
          priority: t.priority || 'medium',
          departmentId: t.departmentId || '',
          status: t.status || 'open',
          assignedTo: t.assignedTo || '',
        });
        setTimeout(() => subjectInputRef.current?.focus(), 100);
      } else {
        toast.error('تیکت یافت نشد');
        router.push('/dashboard/tickets');
      }
    } catch (error: any) {
      toast.error('بارگذاری تیکت ناموفق: ' + error.message);
    } finally {
      setLoadingTicket(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadData();
    loadTicket();
  }, [loadData, loadTicket]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.subject.trim()) e.subject = 'عنوان تیکت الزامی است';
    if (!form.description.trim()) e.description = 'شرح درخواست الزامی است';
    if (!form.customerId) e.customerId = 'مشتری / درخواست‌کننده الزامی است';
    if (form.description.length > MAX_DESC) e.description = `حداکثر ${MAX_DESC} کاراکتر`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    try {
      await updateData('tickets', { id }, {
        subject: form.subject.trim(),
        description: form.description.trim(),
        customerId: form.customerId || null,
        departmentId: form.departmentId || null,
        priority: form.priority,
        status: form.status,
        assignedTo: form.assignedTo || null,
        updatedAt: new Date().toISOString(),
      });
      toast.success('تیکت با موفقیت ویرایش شد');
      router.push('/dashboard/tickets');
    } catch (error: any) {
      toast.error('ویرایش تیکت ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingTicket) {
    return (
      <div className="nb-editor-loading" dir="rtl">
        <span />
        <p>در حال بارگذاری تیکت...</p>
      </div>
    );
  }

  return (
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/tickets" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به تیکت‌ها
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> تیکت‌ها <b>←</b> ویرایش تیکت</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/tickets')} disabled={submitting}>
            انصراف
          </button>
          <button type="submit" form="ticket-edit-form" className="nb-editor-save-btn" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="ticket-edit-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-900/20">
                  <MessageCircle className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>ویرایش تیکت</h2>
                  <p className="text-sm text-slate-400">اطلاعات تیکت را ویرایش کنید.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">عنوان تیکت <span className="text-red-500">*</span></Label>
                <input
                  ref={subjectInputRef}
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="موضوع کوتاه و گویای درخواست را وارد کنید..."
                  className={`nb-input ${errors.subject ? 'border-red-300' : ''}`}
                  style={{ ...inputStyle, borderColor: errors.subject ? '#FCA5A5' : '#E2E8F0' }}
                  maxLength={200}
                />
                {errors.subject && <span className="nb-editor-error">{errors.subject}</span>}
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">شرح درخواست <span className="text-red-500">*</span></Label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, MAX_DESC) })}
                  placeholder="شرح کامل مشکل یا درخواست خود را بنویسید..."
                  className="nb-input"
                  style={{ minHeight: 120, borderRadius: 10, border: `1px solid ${errors.description ? '#FCA5A5' : '#E2E8F0'}`, padding: '12px 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none', resize: 'vertical' }}
                  rows={6}
                />
                <p className="text-xs text-slate-400 text-left">{form.description.length.toLocaleString('fa-IR')} / {MAX_DESC.toLocaleString('fa-IR')}</p>
                {errors.description && <span className="nb-editor-error">{errors.description}</span>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">مشتری <span className="text-red-500">*</span></Label>
                  <Select
                    value={form.customerId || 'none'}
                    onValueChange={(v) => setForm({ ...form, customerId: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger className={`h-11 ${errors.customerId ? 'border-red-300' : ''}`}>
                      <User className="ml-1 h-4 w-4 text-slate-400" />
                      <SelectValue placeholder="انتخاب مشتری..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون مشتری</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.type === 'company' ? c.companyName : fullName(c.firstName, c.lastName)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.customerId && <span className="nb-editor-error">{errors.customerId}</span>}
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">اولویت</Label>
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
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">دپارتمان</Label>
                  <Select
                    value={form.departmentId || 'none'}
                    onValueChange={(v) => setForm({ ...form, departmentId: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger className="h-11">
                      <Headset className="ml-1 h-4 w-4 text-slate-400" />
                      <SelectValue placeholder="انتخاب دپارتمان..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون دپارتمان</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">وضعیت</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="انتخاب وضعیت..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_STATUSES.map((s) => (
                        <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">مسئول تیکت</Label>
                <Select
                  value={form.assignedTo || 'none'}
                  onValueChange={(v) => setForm({ ...form, assignedTo: v === 'none' ? '' : v })}
                >
                  <SelectTrigger className="h-11">
                    <UserCheck className="ml-1 h-4 w-4 text-slate-400" />
                    <SelectValue placeholder="انتخاب مسئول..." />
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
              <p className="text-sm text-slate-500 dark:text-slate-400">پس از ویرایش تیکت می‌توانید وضعیت آن را تغییر دهید و پاسخ‌گویی به درخواست‌ها را پیگیری کنید.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
