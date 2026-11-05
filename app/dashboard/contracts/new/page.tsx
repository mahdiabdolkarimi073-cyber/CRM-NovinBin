'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, FileSignature, User, Calendar, DollarSign, AlignRight, Lightbulb, Info, Loader2, Briefcase } from 'lucide-react';
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

export default function NewContractPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    fullName: '', contractType: 'monthly', startDate: '', endDate: '', salary: '', notes: '',
  });

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
      await createData('staff_contracts', {
        profileId: profile.id,
        fullName: form.fullName.trim(),
        contractType: form.contractType,
        startDate: new Date(form.startDate),
        endDate: form.endDate ? new Date(form.endDate) : null,
        salary: Number(form.salary) || 0,
        notes: form.notes.trim() || null,
        createdBy: profile.id,
      });
      toast.success('قرارداد با موفقیت ثبت شد');
      router.push('/dashboard/contracts');
    } catch (error: any) {
      toast.error('ایجاد قرارداد ناموفق: ' + (error?.message || 'خطا'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-task-page" dir="rtl">
      <div className="create-task-container">
        <header className="create-task-header">
          <div>
            <div className="create-task-title">
              <span className="title-accent-bar" />
              <h1>ثبت قرارداد جدید</h1>
            </div>
            <div className="create-task-breadcrumb">
              داشبورد <b>←</b> قراردادهای پرسنلی <b>←</b> ایجاد قرارداد
            </div>
          </div>
          <Link href="/dashboard/contracts" className="back-button">
            <ArrowRight className="h-4 w-4" />
            بازگشت به قراردادها
          </Link>
        </header>

        <div className="create-task-grid">
          <form className="task-form-card" onSubmit={handleSubmit}>
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon">
                  <FileSignature className="h-5 w-5" />
                </span>
                <div>
                  <h2>اطلاعات قرارداد</h2>
                  <p>جزئیات قرارداد پرسنلی را وارد کنید. فیلدهای ستاره‌دار الزامی هستند.</p>
                </div>
              </div>
            </div>
            <div className="form-card-divider" />

            <div className="form-fields">
              <div className="field-group">
                <Label className="field-label">نام و نام خانوادگی <span className="required-star">*</span></Label>
                <Input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="نام کامل پرسنل"
                  className="task-input"
                />
                {errors.fullName && <span className="field-error">{errors.fullName}</span>}
              </div>

              <div className="management-row">
                <div className="field-group">
                  <Label className="field-label">نوع قرارداد <span className="required-star">*</span></Label>
                  <Select value={form.contractType} onValueChange={(v) => setForm({ ...form, contractType: v })}>
                    <SelectTrigger className="task-select">
                      <span className="select-icon-right"><Briefcase className="h-4 w-4" /></span>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTRACT_TYPES.map((t) => (
                        <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="field-group">
                  <Label className="field-label">حقوق (تومان)</Label>
                  <Input
                    type="number"
                    dir="ltr"
                    value={form.salary}
                    onChange={(e) => setForm({ ...form, salary: e.target.value })}
                    placeholder="0"
                    className="task-input"
                  />
                </div>

                <div className="field-group">
                  <Label className="field-label">تاریخ شروع <span className="required-star">*</span></Label>
                  <div className="date-input-wrap">
                    <span className="date-icon"><Calendar className="h-4 w-4" /></span>
                    <JalaliDatePicker
                      value={form.startDate ? new Date(form.startDate) : null}
                      onChange={(d) => setForm({ ...form, startDate: d ? toLocalDateString(d) : '' })}
                      placeholder="انتخاب تاریخ"
                      className="task-date-input"
                    />
                  </div>
                  {errors.startDate && <span className="field-error">{errors.startDate}</span>}
                </div>
              </div>

              <div className="field-group">
                <Label className="field-label">تاریخ پایان</Label>
                <div className="date-input-wrap">
                  <span className="date-icon"><Calendar className="h-4 w-4" /></span>
                  <JalaliDatePicker
                    value={form.endDate ? new Date(form.endDate) : null}
                    onChange={(d) => setForm({ ...form, endDate: d ? toLocalDateString(d) : '' })}
                    placeholder="اختیاری"
                    className="task-date-input"
                  />
                </div>
              </div>

              <div className="field-group">
                <Label className="field-label">یادداشت</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="توضیحات اختیاری..."
                  className="task-textarea"
                />
              </div>
            </div>

            <div className="form-actions-row">
              <button type="button" className="cancel-btn" onClick={() => router.push('/dashboard/contracts')} disabled={submitting}>
                انصراف
              </button>
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</>) : 'ثبت قرارداد'}
              </button>
            </div>
          </form>

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
              <p>قراردادهای ثبت شده در بخش «قراردادهای پرسنلی» قابل مشاهده و مدیریت هستند. می‌توانید آن‌ها را ویرایش یا حذف کنید.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
