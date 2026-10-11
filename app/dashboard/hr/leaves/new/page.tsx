'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, CalendarDays, User, Calendar, Lightbulb, Info, Loader2, Check, Clock } from 'lucide-react';
import { toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';

const leaveTypeLabels: Record<string, string> = { annual: 'استحقاقی', sick: 'استعلاجی', personal: 'شخصی' };

const guideItems = [
  { icon: User, title: 'انتخاب کارمند', desc: 'کارمندی که مرخصی برای او ثبت می‌شود را انتخاب کنید.' },
  { icon: Calendar, title: 'بازه زمانی', desc: 'تاریخ شروع و پایان مرخصی را مشخص کنید.' },
  { icon: Clock, title: 'نوع مرخصی', desc: 'نوع مرخصی را بین استحقاقی، استعلاجی یا شخصی انتخاب کنید.' },
  { icon: Info, title: 'دلیل مرخصی', desc: 'در صورت نیاز دلیل مرخصی را توضیح دهید.' },
];

const inputStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: '1px solid #E2E8F0',
  padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none',
};

export default function NewLeavePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const reasonRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    employeeId: 'none', type: 'annual', startDate: '', endDate: '', reason: '',
  });

  const loadEmployees = useCallback(async () => {
    try {
      const data = await fetchData<any>('employees', {
        orderBy: { createdAt: 'desc' },
      });
      setEmployees(data || []);
    } catch {
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.employeeId === 'none') e.employeeId = 'انتخاب کارمند الزامی است';
    if (!form.startDate) e.startDate = 'تاریخ شروع الزامی است';
    if (!form.endDate) e.endDate = 'تاریخ پایان الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    try {
      await createData('leave_requests', {
        employeeId: form.employeeId,
        type: form.type,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        reason: form.reason || undefined,
      });
      toast.success('درخواست مرخصی با موفقیت ثبت شد');
      router.push('/dashboard/hr');
    } catch (error: any) {
      toast.error('ثبت مرخصی ناموفق: ' + (error?.message || 'خطا'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/hr" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به منابع انسانی
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> منابع انسانی <b>←</b> درخواست مرخصی</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/hr')} disabled={submitting}>
            انصراف
          </button>
          <button type="submit" form="leave-form" className="nb-editor-save-btn" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال ثبت...' : 'ثبت مرخصی'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="leave-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/20">
                  <CalendarDays className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>اطلاعات مرخصی</h2>
                  <p className="text-sm text-slate-400">لطفاً اطلاعات درخواست مرخصی را وارد کنید.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">کارمند <span className="text-red-500">*</span></Label>
                <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                  <SelectTrigger className={`h-11 ${errors.employeeId ? 'border-red-300' : ''}`}>
                    <User className="ml-1 h-4 w-4 text-slate-400" />
                    <SelectValue placeholder="انتخاب کارمند..." />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingEmployees ? (
                      <SelectItem value="none" disabled>در حال بارگذاری...</SelectItem>
                    ) : employees.length === 0 ? (
                      <SelectItem value="none" disabled>کارمندی یافت نشد</SelectItem>
                    ) : (
                      employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.employeeId && <span className="nb-editor-error">{errors.employeeId}</span>}
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">نوع مرخصی</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(leaveTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">از تاریخ <span className="text-red-500">*</span></Label>
                  <JalaliDatePicker
                    value={form.startDate ? new Date(form.startDate) : null}
                    onChange={(d) => setForm({ ...form, startDate: d ? toLocalDateString(d) : '' })}
                    placeholder="انتخاب تاریخ"
                    className={`h-11 ${errors.startDate ? 'border-red-300' : ''}`}
                  />
                  {errors.startDate && <span className="nb-editor-error">{errors.startDate}</span>}
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">تا تاریخ <span className="text-red-500">*</span></Label>
                  <JalaliDatePicker
                    value={form.endDate ? new Date(form.endDate) : null}
                    onChange={(d) => setForm({ ...form, endDate: d ? toLocalDateString(d) : '' })}
                    placeholder="انتخاب تاریخ"
                    className={`h-11 ${errors.endDate ? 'border-red-300' : ''}`}
                  />
                  {errors.endDate && <span className="nb-editor-error">{errors.endDate}</span>}
                </div>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">دلیل</Label>
                <input
                  ref={reasonRef}
                  type="text"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="دلیل مرخصی (اختیاری)"
                  className="nb-input"
                  style={inputStyle}
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
            <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-5 dark:border-amber-900/30 dark:bg-amber-900/10">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30">
                  <Info className="h-5 w-5" />
                </span>
                <h2 className="font-bold text-slate-900 dark:text-slate-100">اطلاعات مفید</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">پس از ثبت، درخواست مرخصی در تب «مرخصی» بخش منابع انسانی قابل مشاهده و تأیید/رد است.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
