'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, FileSignature, User, Calendar, DollarSign, AlignRight, Lightbulb, Info, Loader2, Briefcase, Check } from 'lucide-react';
import { toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';

const CONTRACT_TYPES = [
  { key: 'monthly', label: 'ماهانه' },
  { key: 'project', label: 'پروژه‌ای' },
  { key: 'hourly', label: 'ساعتی' },
];

const guideItems = [
  { icon: User, title: 'نام کامل پرسنل', desc: 'نام و نام خانوادگی فرد را دقیق وارد کنید.' },
  { icon: Briefcase, title: 'نوع قرارداد', desc: 'نوع قرارداد را بر اساس ماهانه، پروژه‌ای یا ساعتی انتخاب کنید.' },
  { icon: Calendar, title: 'تاریخ شروع و پایان', desc: 'تاریخ شروع الزامی است و تاریخ پایان اختیاری.' },
  { icon: DollarSign, title: 'حقوق', desc: 'مبلغ حقوق را به تومان وارد کنید.' },
];

const inputStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: '1px solid #E2E8F0',
  padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none',
};

export default function EditContractPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    fullName: '', contractType: 'monthly', startDate: '', endDate: '', salary: '', notes: '',
  });

  const loadContract = useCallback(async () => {
    if (!id) return;
    try {
      const data = await fetchData<any>('staff_contracts', { where: { id } });
      if (data && data.length > 0) {
        const c = data[0];
        setForm({
          fullName: c.fullName || '',
          contractType: c.contractType || 'monthly',
          startDate: c.startDate ? toLocalDateString(new Date(c.startDate)) : '',
          endDate: c.endDate ? toLocalDateString(new Date(c.endDate)) : '',
          salary: String(Number(c.salary)),
          notes: c.notes || '',
        });
        setTimeout(() => nameInputRef.current?.focus(), 100);
      } else {
        toast.error('قرارداد یافت نشد');
        router.push('/dashboard/contracts');
      }
    } catch (error: any) {
      toast.error('بارگذاری قرارداد ناموفق: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadContract();
  }, [loadContract]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'نام و نام خانوادگی الزامی است';
    if (!form.startDate) e.startDate = 'تاریخ شروع الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    try {
      await updateData('staff_contracts', { id }, {
        fullName: form.fullName.trim(),
        contractType: form.contractType,
        startDate: form.startDate ? new Date(form.startDate) : undefined,
        endDate: form.endDate ? new Date(form.endDate) : null,
        salary: Number(form.salary) || 0,
        notes: form.notes.trim() || null,
      });
      toast.success('قرارداد با موفقیت ویرایش شد');
      router.push('/dashboard/contracts');
    } catch (error: any) {
      toast.error('ویرایش قرارداد ناموفق: ' + (error?.message || 'خطا'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="nb-editor-loading" dir="rtl">
        <span />
        <p>در حال بارگذاری قرارداد...</p>
      </div>
    );
  }

  return (
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/contracts" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به قراردادها
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> قراردادهای پرسنلی <b>←</b> ویرایش قرارداد</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/contracts')} disabled={submitting}>
            انصراف
          </button>
          <button type="submit" form="contract-edit-form" className="nb-editor-save-btn" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="contract-edit-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-900/20">
                  <FileSignature className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>اطلاعات قرارداد</h2>
                  <p className="text-sm text-slate-400">لطفاً اطلاعات مربوط به قرارداد را ویرایش کنید.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">نام و نام خانوادگی <span className="text-red-500">*</span></Label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="نام کامل پرسنل"
                  className="nb-input"
                  style={{ ...inputStyle, borderColor: errors.fullName ? '#FCA5A5' : '#E2E8F0' }}
                />
                {errors.fullName && <span className="nb-editor-error">{errors.fullName}</span>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">نوع قرارداد <span className="text-red-500">*</span></Label>
                  <Select value={form.contractType} onValueChange={(v) => setForm({ ...form, contractType: v })}>
                    <SelectTrigger className="h-11">
                      <Briefcase className="ml-1 h-4 w-4 text-slate-400" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTRACT_TYPES.map((t) => (
                        <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">حقوق (تومان)</Label>
                  <input
                    type="number"
                    dir="ltr"
                    value={form.salary}
                    onChange={(e) => setForm({ ...form, salary: e.target.value })}
                    placeholder="0"
                    className="nb-input"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">تاریخ شروع <span className="text-red-500">*</span></Label>
                  <JalaliDatePicker
                    value={form.startDate ? new Date(form.startDate) : null}
                    onChange={(d) => setForm({ ...form, startDate: d ? toLocalDateString(d) : '' })}
                    placeholder="انتخاب تاریخ"
                    className={`h-11 ${errors.startDate ? 'border-red-300' : ''}`}
                  />
                  {errors.startDate && <span className="nb-editor-error">{errors.startDate}</span>}
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">تاریخ پایان</Label>
                  <JalaliDatePicker
                    value={form.endDate ? new Date(form.endDate) : null}
                    onChange={(d) => setForm({ ...form, endDate: d ? toLocalDateString(d) : '' })}
                    placeholder="اختیاری"
                    className="h-11"
                  />
                </div>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">یادداشت</Label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="توضیحات اختیاری..."
                  className="min-h-[100px] w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm transition focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 dark:border-slate-700"
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
            <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-5 dark:border-violet-900/30 dark:bg-violet-900/10">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30">
                  <Info className="h-5 w-5" />
                </span>
                <h2 className="font-bold text-slate-900 dark:text-slate-100">اطلاعات مفید</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">پس از ویرایش قرارداد، تغییرات در بخش «قراردادهای پرسنلی» قابل مشاهده است.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
