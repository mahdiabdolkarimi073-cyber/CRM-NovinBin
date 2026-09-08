'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight, UserPlus, User, Building2, Mail, Phone, MapPin,
  Tag, Award, Briefcase, Lightbulb, Info, Loader2, Check, Plus, X,
} from 'lucide-react';
import { CUSTOMER_LEVELS, SERVICE_TYPES, ACTIVITY_TYPES } from '@/lib/constants';
import { toast } from 'sonner';

const guideItems = [
  { icon: User, title: 'نام کامل مشتری', desc: 'نام و نام خانوادگی مشتری را در یک فیلد وارد کنید.' },
  { icon: Briefcase, title: 'نوع فعالیت', desc: 'حوزه فعالیت مشتری را مشخص کنید.' },
  { icon: Award, title: 'سطح مشتری', desc: 'سطح مشتری را از پایه تا ویژه انتخاب کنید.' },
  { icon: Tag, title: 'خدمات دریافتی', desc: 'خدماتی که مشتری دریافت کرده را با تیک انتخاب کنید.' },
  { icon: Phone, title: 'شماره تلفن‌های متعدد', desc: 'می‌توانید چند شماره تلفن برای مشتری ثبت کنید.' },
];

export default function NewCustomerPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: 'individual' as 'individual' | 'company',
    fullName: '',
    companyName: '',
    email: '',
    mobile: '',
    phone: '',
    city: '',
    address: '',
    activityType: '',
    level: 'basic',
    notes: '',
  });
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [additionalPhones, setAdditionalPhones] = useState<string[]>([]);

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const addPhone = () => {
    setAdditionalPhones((prev) => [...prev, '']);
  };

  const removePhone = (index: number) => {
    setAdditionalPhones((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePhone = (index: number, value: string) => {
    setAdditionalPhones((prev) => prev.map((p, i) => (i === index ? value : p)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      toast.error('اطلاعات کاربر بارگذاری نشده');
      return;
    }
    setSubmitting(true);
    try {
      const nameParts = form.fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || null;
      const lastName = nameParts.slice(1).join(' ') || null;
      const phones = additionalPhones.filter((p) => p.trim() !== '');

      await createData('customers', {
        type: form.type,
        firstName,
        lastName,
        companyName: form.companyName || null,
        email: form.email || null,
        mobile: form.mobile || null,
        phone: form.phone || null,
        address: form.address || null,
        city: form.city || null,
        activityType: form.activityType || null,
        serviceTypes: selectedServices,
        additionalPhones: phones,
        level: form.level,
        notes: form.notes || null,
        createdBy: profile.id,
      });
      toast.success('مشتری با موفقیت ایجاد شد');
      router.push('/dashboard/customers');
    } catch (error: any) {
      toast.error('ایجاد مشتری ناموفق: ' + error.message);
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
              <h1>ایجاد مشتری جدید</h1>
            </div>
            <div className="create-task-breadcrumb">
              داشبورد <b>←</b> مشتریان <b>←</b> ایجاد مشتری
            </div>
          </div>
          <Link href="/dashboard/customers" className="back-button">
            <ArrowRight className="h-4 w-4" />
            بازگشت به مشتریان
          </Link>
        </header>

        {/* Main grid */}
        <div className="create-task-grid">
          {/* Form card */}
          <form className="task-form-card" onSubmit={handleSubmit}>
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon">
                  <UserPlus className="h-5 w-5" />
                </span>
                <div>
                  <h2>اطلاعات مشتری</h2>
                  <p>جزئیات مشتری جدید را وارد کنید. هیچ فیلدی الزامی نیست.</p>
                </div>
              </div>
            </div>
            <div className="form-card-divider" />

            <div className="form-fields">
              {/* Customer type */}
              <div className="field-group">
                <Label className="field-label">نوع مشتری</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as 'individual' | 'company' })}
                >
                  <SelectTrigger className="task-select">
                    <span className="select-icon-right">
                      {form.type === 'individual' ? <User className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                    </span>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">حقیقی</SelectItem>
                    <SelectItem value="company">حقوقی</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Full name or company name */}
              {form.type === 'individual' ? (
                <div className="field-group">
                  <Label className="field-label">نام و نام خانوادگی</Label>
                  <Input
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="مثال: علی محمدی رضایی"
                    className="task-input"
                  />
                </div>
              ) : (
                <div className="field-group">
                  <Label className="field-label">نام شرکت</Label>
                  <Input
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    placeholder="نام شرکت را وارد کنید"
                    className="task-input"
                  />
                </div>
              )}

              {/* Activity type + Level */}
              <div className="management-row">
                <div className="field-group">
                  <Label className="field-label">نوع فعالیت</Label>
                  <Select
                    value={form.activityType || 'none'}
                    onValueChange={(v) => setForm({ ...form, activityType: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger className="task-select">
                      <span className="select-icon-right"><Briefcase className="h-4 w-4" /></span>
                      <SelectValue placeholder="انتخاب نوع فعالیت…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون انتخاب</SelectItem>
                      {ACTIVITY_TYPES.map((a) => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="field-group">
                  <Label className="field-label">سطح مشتری</Label>
                  <Select
                    value={form.level}
                    onValueChange={(v) => setForm({ ...form, level: v })}
                  >
                    <SelectTrigger className="task-select">
                      <span className="select-icon-right"><Award className="h-4 w-4" /></span>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOMER_LEVELS.map((l) => (
                        <SelectItem key={l.key} value={l.key}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Service types - multi-select checkboxes */}
              <div className="field-group">
                <Label className="field-label">خدمات دریافتی</Label>
                <div className="flex flex-wrap gap-2 rounded-lg border border-[#E2E8F0] bg-white p-3">
                  {SERVICE_TYPES.map((service) => {
                    const checked = selectedServices.includes(service);
                    return (
                      <button
                        key={service}
                        type="button"
                        onClick={() => toggleService(service)}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${checked ? 'border-[#2563EB] bg-[#EFF4FF] text-[#2563EB]' : 'border-[#E2E8F0] bg-white text-slate-600 hover:border-[#94A3B8]'}`}
                      >
                        {checked && <Check className="h-3 w-3" />}
                        {service}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile + Phone */}
              <div className="management-row">
                <div className="field-group">
                  <Label className="field-label">موبایل</Label>
                  <Input
                    dir="ltr"
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    placeholder="0912xxxxxxx"
                    className="task-input"
                  />
                </div>
                <div className="field-group">
                  <Label className="field-label">تلفن ثابت</Label>
                  <Input
                    dir="ltr"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="021xxxxxxxx"
                    className="task-input"
                  />
                </div>
              </div>

              {/* Additional phones */}
              <div className="field-group">
                <Label className="field-label">شماره تلفن‌های اضافی</Label>
                <div className="space-y-2">
                  {additionalPhones.map((phone, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        dir="ltr"
                        value={phone}
                        onChange={(e) => updatePhone(index, e.target.value)}
                        placeholder="شماره تلفن اضافی"
                        className="task-input flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => removePhone(index)}
                        className="flex items-center justify-center w-11 h-11 rounded-lg border border-[#E2E8F0] bg-white text-slate-400 hover:text-red-500 hover:border-red-300 transition-all shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addPhone}
                    className="flex items-center gap-1.5 text-sm font-medium text-[#2563EB] hover:text-[#1d4ed8] transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    افزودن شماره تلفن
                  </button>
                </div>
              </div>

              {/* Email + City */}
              <div className="management-row">
                <div className="field-group">
                  <Label className="field-label">ایمیل</Label>
                  <Input
                    type="email"
                    dir="ltr"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@example.com"
                    className="task-input"
                  />
                </div>
                <div className="field-group">
                  <Label className="field-label">شهر</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="نام شهر"
                    className="task-input"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="field-group">
                <Label className="field-label">آدرس</Label>
                <Textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="آدرس کامل مشتری..."
                  className="task-textarea"
                />
              </div>

              {/* Notes */}
              <div className="field-group">
                <Label className="field-label">یادداشت</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="یادداشت‌های داخلی درباره مشتری..."
                  className="task-textarea"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="form-actions-row">
              <button type="button" className="cancel-btn" onClick={() => router.push('/dashboard/customers')} disabled={submitting}>
                انصراف
              </button>
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ایجاد...</>) : 'ایجاد مشتری'}
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
              <p>مشتریان ایجاد شده در بخش «مشتریان» قابل مشاهده و مدیریت هستند. می‌توانید سطح مشتری را بعداً تغییر دهید و خدمات دریافتی را ویرایش کنید.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
