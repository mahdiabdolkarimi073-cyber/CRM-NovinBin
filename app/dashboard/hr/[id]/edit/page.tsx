'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import { ArrowRight, UserCog, User, Briefcase, Phone, Mail, DollarSign, Lightbulb, Info, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

const guideItems = [
  { icon: User, title: 'نام و نام خانوادگی', desc: 'نام و نام خانوادگی کارمند را دقیق وارد کنید.' },
  { icon: Briefcase, title: 'سمت و دپارتمان', desc: 'سمت و دپارتمان کارمند را مشخص کنید.' },
  { icon: Phone, title: 'اطلاعات تماس', desc: 'تلفن و ایمیل کارمند را وارد کنید.' },
  { icon: DollarSign, title: 'حقوق', desc: 'مبلغ حقوق کارمند را به تومان وارد کنید.' },
];

const inputStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: '1px solid #E2E8F0',
  padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none',
};

export default function EditEmployeePage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const firstNameRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    firstName: '', lastName: '', position: '', department: '', phone: '', email: '', salary: '',
  });

  const loadEmployee = useCallback(async () => {
    if (!id) return;
    try {
      const data = await fetchData<any>('employees', { where: { id } });
      if (data && data.length > 0) {
        const emp = data[0];
        setForm({
          firstName: emp.firstName || '',
          lastName: emp.lastName || '',
          position: emp.position || '',
          department: emp.department || '',
          phone: emp.phone || '',
          email: emp.email || '',
          salary: String(Number(emp.salary)),
        });
        setTimeout(() => firstNameRef.current?.focus(), 100);
      } else {
        toast.error('کارمند یافت نشد');
        router.push('/dashboard/hr');
      }
    } catch (error: any) {
      toast.error('بارگذاری کارمند ناموفق: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadEmployee();
  }, [loadEmployee]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'نام الزامی است';
    if (!form.lastName.trim()) e.lastName = 'نام خانوادگی الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    try {
      await updateData('employees', { id }, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        position: form.position || undefined,
        department: form.department || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        salary: Number(form.salary.replace(/[^0-9]/g, '')) || 0,
      });
      toast.success('کارمند با موفقیت ویرایش شد');
      router.push('/dashboard/hr');
    } catch (error: any) {
      toast.error('ویرایش کارمند ناموفق: ' + (error?.message || 'خطا'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="nb-editor-loading" dir="rtl">
        <span />
        <p>در حال بارگذاری کارمند...</p>
      </div>
    );
  }

  return (
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/hr" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به منابع انسانی
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> منابع انسانی <b>←</b> ویرایش کارمند</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/hr')} disabled={submitting}>
            انصراف
          </button>
          <button type="submit" form="employee-edit-form" className="nb-editor-save-btn" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="employee-edit-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-900/20">
                  <UserCog className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>اطلاعات کارمند</h2>
                  <p className="text-sm text-slate-400">لطفاً اطلاعات کارمند را ویرایش کنید.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">نام <span className="text-red-500">*</span></Label>
                  <input
                    ref={firstNameRef}
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    placeholder="نام"
                    className="nb-input"
                    style={{ ...inputStyle, borderColor: errors.firstName ? '#FCA5A5' : '#E2E8F0' }}
                  />
                  {errors.firstName && <span className="nb-editor-error">{errors.firstName}</span>}
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">نام خانوادگی <span className="text-red-500">*</span></Label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    placeholder="نام خانوادگی"
                    className="nb-input"
                    style={{ ...inputStyle, borderColor: errors.lastName ? '#FCA5A5' : '#E2E8F0' }}
                  />
                  {errors.lastName && <span className="nb-editor-error">{errors.lastName}</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">سمت</Label>
                  <input
                    type="text"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    placeholder="سمت کارمند"
                    className="nb-input"
                    style={inputStyle}
                  />
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">دپارتمان</Label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    placeholder="دپارتمان"
                    className="nb-input"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">تلفن</Label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="09xxxxxxxxx"
                    className="nb-input"
                    style={inputStyle}
                  />
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">ایمیل</Label>
                  <input
                    type="email"
                    dir="ltr"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@example.com"
                    className="nb-input"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">حقوق (تومان)</Label>
                <input
                  type="text"
                  dir="ltr"
                  value={form.salary}
                  onChange={(e) => setForm({ ...form, salary: e.target.value })}
                  placeholder="0"
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
            <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-5 dark:border-sky-900/30 dark:bg-sky-900/10">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-900/30">
                  <Info className="h-5 w-5" />
                </span>
                <h2 className="font-bold text-slate-900 dark:text-slate-100">اطلاعات مفید</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">پس از ویرایش، اطلاعات کارمند در بخش «منابع انسانی» به‌روزرسانی می‌شود.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
