'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import {
  ArrowRight, Clipboard, Server, User, Phone, Globe,
  Hash, Calendar, Loader2, Lightbulb, Info,
} from 'lucide-react';
import { HOST_TYPES } from '@/lib/constants';
import { toLocalDateString } from '@/lib/format';
import { createData } from '@/lib/data-client';
import { toast } from 'sonner';

const guideItems = [
  { icon: Hash, title: 'شماره مشتری', desc: 'شماره مشتری را درست وارد کنید.' },
  { icon: User, title: 'نام و نام خانوادگی', desc: 'نام و نام خانوادگی مشتری را وارد کنید.' },
  { icon: Calendar, title: 'تاریخ انقضا', desc: 'تاریخ انقضای هاست/دامنه را مشخص کنید.' },
  { icon: Phone, title: 'شماره موبایل', desc: 'شماره موبایل مشتری برای ارسال پیامک تمدید.' },
];

export default function NewHostDomainPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    customerNumber: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    domainName: '',
    hostType: 'host',
    startDate: '',
    expiryDate: '',
    notes: '',
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.customerNumber.trim()) e.customerNumber = 'شماره مشتری الزامی است';
    if (!form.firstName.trim()) e.firstName = 'نام الزامی است';
    if (!form.lastName.trim()) e.lastName = 'نام خانوادگی الزامی است';
    if (!form.phoneNumber.trim()) e.phoneNumber = 'شماره موبایل الزامی است';
    else if (!/^09\d{9}$/.test(form.phoneNumber.replace(/\s+/g, ''))) e.phoneNumber = 'شماره موبایل نامعتبر است (مثال: 09121234567)';
    if (!form.expiryDate) e.expiryDate = 'تاریخ انقضا الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    try {
      await createData('host_domains', {
        customerNumber: form.customerNumber.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phoneNumber: form.phoneNumber.replace(/\s+/g, ''),
        domainName: form.domainName || null,
        hostType: form.hostType,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : new Date().toISOString(),
        expiryDate: new Date(form.expiryDate).toISOString(),
        notes: form.notes || null,
      });
      toast.success('هاست/دامنه با موفقیت ثبت شد');
      router.push('/dashboard/host-domains');
    } catch (error: any) {
      toast.error('ثبت ناموفق: ' + error.message);
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
              <h1>ثبت هاست/دامنه جدید</h1>
            </div>
            <div className="create-task-breadcrumb">
              داشبورد <b>←</b> هاست و دامنه <b>←</b> ثبت جدید
            </div>
          </div>
          <Link href="/dashboard/host-domains" className="back-button">
            <ArrowRight className="h-4 w-4" />
            بازگشت
          </Link>
        </header>

        <div className="create-task-grid">
          <form className="task-form-card" onSubmit={handleSubmit}>
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon">
                  <Server className="h-5 w-5" />
                </span>
                <div>
                  <h2>اطلاعات هاست/دامنه</h2>
                  <p>جزئیات هاست یا دامنه مشتری را وارد کنید. فیلدهای ستاره‌دار الزامی هستند.</p>
                </div>
              </div>
            </div>
            <div className="form-card-divider" />

            <div className="form-fields">
              {/* Customer number + Host type */}
              <div className="management-row">
                <div className="field-group">
                  <Label className="field-label">شماره مشتری <span className="required-star">*</span></Label>
                  <Input
                    value={form.customerNumber}
                    onChange={(e) => setForm({ ...form, customerNumber: e.target.value })}
                    placeholder="مثال: 10234"
                    className="task-input"
                  />
                  {errors.customerNumber && <span className="field-error">{errors.customerNumber}</span>}
                </div>
                <div className="field-group">
                  <Label className="field-label">نوع <span className="required-star">*</span></Label>
                  <Select value={form.hostType} onValueChange={(v) => setForm({ ...form, hostType: v })}>
                    <SelectTrigger className="task-select">
                      <span className="select-icon-right"><Server className="h-4 w-4" /></span>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOST_TYPES.map((t) => (
                        <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* First name + Last name */}
              <div className="management-row">
                <div className="field-group">
                  <Label className="field-label">نام <span className="required-star">*</span></Label>
                  <Input
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    placeholder="نام مشتری"
                    className="task-input"
                  />
                  {errors.firstName && <span className="field-error">{errors.firstName}</span>}
                </div>
                <div className="field-group">
                  <Label className="field-label">نام خانوادگی <span className="required-star">*</span></Label>
                  <Input
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    placeholder="نام خانوادگی مشتری"
                    className="task-input"
                  />
                  {errors.lastName && <span className="field-error">{errors.lastName}</span>}
                </div>
              </div>

              {/* Phone + Domain */}
              <div className="management-row">
                <div className="field-group">
                  <Label className="field-label">شماره موبایل <span className="required-star">*</span></Label>
                  <Input
                    value={form.phoneNumber}
                    onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                    placeholder="09121234567"
                    className="task-input"
                    dir="ltr"
                  />
                  {errors.phoneNumber && <span className="field-error">{errors.phoneNumber}</span>}
                </div>
                <div className="field-group">
                  <Label className="field-label">نام دامنه</Label>
                  <Input
                    value={form.domainName}
                    onChange={(e) => setForm({ ...form, domainName: e.target.value })}
                    placeholder="example.com"
                    className="task-input"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Start date + Expiry date */}
              <div className="management-row">
                <div className="field-group">
                  <Label className="field-label">تاریخ شروع</Label>
                  <div className="date-input-wrap">
                    <span className="date-icon"><Calendar className="h-4 w-4" /></span>
                    <JalaliDatePicker
                      value={form.startDate ? new Date(form.startDate) : null}
                      onChange={(d) => setForm({ ...form, startDate: d ? toLocalDateString(d) : '' })}
                      placeholder="انتخاب تاریخ"
                      className="task-date-input"
                    />
                  </div>
                </div>
                <div className="field-group">
                  <Label className="field-label">تاریخ انقضا <span className="required-star">*</span></Label>
                  <div className="date-input-wrap">
                    <span className="date-icon"><Calendar className="h-4 w-4" /></span>
                    <JalaliDatePicker
                      value={form.expiryDate ? new Date(form.expiryDate) : null}
                      onChange={(d) => setForm({ ...form, expiryDate: d ? toLocalDateString(d) : '' })}
                      placeholder="انتخاب تاریخ"
                      className="task-date-input"
                    />
                  </div>
                  {errors.expiryDate && <span className="field-error">{errors.expiryDate}</span>}
                </div>
              </div>

              {/* Notes */}
              <div className="field-group">
                <Label className="field-label">یادداشت</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="یادداشت‌های اختیاری..."
                  className="task-textarea"
                  maxLength={500}
                />
              </div>
            </div>

            <div className="form-actions-row">
              <button type="button" className="cancel-btn" onClick={() => router.push('/dashboard/host-domains')} disabled={submitting}>
                انصراف
              </button>
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</>) : 'ثبت هاست/دامنه'}
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
              <p>یک هفته قبل از انقضای هاست/دامنه، به‌صورت خودکار پیامک تمدید برای مشتری ارسال می‌شود. همچنین می‌توانید به‌صورت دستی نیز پیامک ارسال کنید.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
