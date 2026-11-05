'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { updateData, fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight, User, Building2, Mail, Phone, MapPin,
  Tag, Award, Briefcase, Lightbulb, Info, Loader2, Check, Plus, X, UserCog,
} from 'lucide-react';
import { CUSTOMER_LEVELS, SERVICE_TYPES, ACTIVITY_TYPES, fullName } from '@/lib/constants';
import { toast } from 'sonner';
import { PasswordInput } from '@/components/ui/password-input';
import { isValidMobile } from '@/lib/phone';
import type { Customer, Profile } from '@/lib/types';

const guideItems = [
  { icon: User, title: 'مشخصات مشتری', desc: 'نام و نام خانوادگی یا نام شرکت را اصلاح کنید.' },
  { icon: Briefcase, title: 'نوع فعالیت', desc: 'صنعت یا حوزه فعالیت تجاری مشتری را مشخص نمایید.' },
  { icon: Award, title: 'سطح مشتری در باشگاه', desc: 'سطح وفاداری مشتری را از برنزی تا VIP تعیین کنید.' },
  { icon: Tag, title: 'خدمات ارائه‌شده', desc: 'خدمات و ماژول‌های فعال برای مشتری را تیک بزنید.' },
  { icon: Phone, title: 'شماره‌های تماس', desc: 'شماره اصلی و شماره‌های فرعی مرتبط را اضافه یا ویرایش کنید.' },
];

export default function EditCustomerPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [staffList, setStaffList] = useState<Profile[]>([]);

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
  const [newPhoneInput, setNewPhoneInput] = useState('');
  const [changePassword, setChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [projectManagerId, setProjectManagerId] = useState<string>('none');

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [custs, staff] = await Promise.all([
        fetchData<Customer>('customers', { where: { id } }),
        fetchData<Profile>('profiles', {
          where: { userType: 'staff', role: { in: ['personnel', 'admin', 'super_admin', 'owner'] }, active: true },
          orderBy: { firstName: 'asc' },
        }),
      ]);

      setStaffList(staff || []);

      if (custs && custs.length > 0) {
        const c = custs[0];
        const computedName = c.fullName || (c.firstName || c.lastName ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : '');
        setForm({
          type: (c.type as 'individual' | 'company') || 'individual',
          fullName: computedName,
          companyName: c.companyName || '',
          email: c.email || '',
          mobile: c.mobile || '',
          phone: c.phone || '',
          city: c.city || '',
          address: c.address || '',
          activityType: c.activityType || '',
          level: c.level || 'basic',
          notes: c.notes || '',
        });
        setSelectedServices(c.serviceTypes || []);
        setAdditionalPhones(c.additionalPhones || []);
        setProjectManagerId(c.projectManagerId || 'none');
      } else {
        toast.error('مشتری مورد نظر یافت نشد');
        router.push('/dashboard/customers');
      }
    } catch (e: any) {
      toast.error('خطا در بارگذاری اطلاعات مشتری: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const addPhone = () => {
    if (!newPhoneInput.trim()) return;
    if (additionalPhones.includes(newPhoneInput.trim())) {
      toast.error('این شماره قبلاً اضافه شده است');
      return;
    }
    setAdditionalPhones([...additionalPhones, newPhoneInput.trim()]);
    setNewPhoneInput('');
  };

  const removePhone = (idx: number) => {
    setAdditionalPhones(additionalPhones.filter((_, i) => i !== idx));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (form.type === 'company' && !form.companyName.trim()) {
      errs.companyName = 'نام شرکت / سازمان الزامی است';
    }
    if (form.type === 'individual' && !form.fullName.trim()) {
      errs.fullName = 'نام کامل مشتری الزامی است';
    }
    if (form.mobile && !isValidMobile(form.mobile)) {
      errs.mobile = 'شماره موبایل وارد شده معتبر نیست (مثال: 09123456789)';
    }
    if (changePassword && newPassword.length < 6) {
      errs.newPassword = 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !id) return;

    setSubmitting(true);
    try {
      const parts = form.fullName.trim().split(/\s+/);
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';

      const updatePayload: Record<string, any> = {
        type: form.type,
        firstName: form.type === 'individual' ? firstName : null,
        lastName: form.type === 'individual' ? lastName : null,
        companyName: form.type === 'company' ? form.companyName.trim() : null,
        email: form.email.trim() || null,
        mobile: form.mobile.trim() || null,
        phone: form.phone.trim() || null,
        city: form.city.trim() || null,
        address: form.address.trim() || null,
        activityType: form.activityType || null,
        level: form.level,
        notes: form.notes.trim() || null,
        serviceTypes: selectedServices,
        additionalPhones,
        projectManagerId: projectManagerId === 'none' ? null : projectManagerId,
      };

      await updateData('customers', { id }, updatePayload);

      // If password changed, update user password via portal/customer-account API if needed
      if (changePassword && newPassword.trim()) {
        try {
          await fetch('/api/portal/customer-account', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId: id, newPassword: newPassword.trim() }),
          });
        } catch {
          // ignore portal password error if user does not have portal account
        }
      }

      toast.success('اطلاعات مشتری با موفقیت به‌روزرسانی شد');
      router.push('/dashboard/customers');
    } catch (err: any) {
      toast.error('ویرایش ناموفق: ' + err.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="nb-editor-loading" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        <p>در حال بارگذاری اطلاعات مشتری...</p>
      </div>
    );
  }

  return (
    <div className="nb-editor-page" dir="rtl">
      {/* Top Bar */}
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/customers" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به مشتریان
          </Link>
          <span className="nb-editor-breadcrumb">
            داشبورد <b>←</b> مشتریان <b>←</b> ویرایش ({form.type === 'company' ? form.companyName : form.fullName})
          </span>
        </div>
        <div className="nb-editor-topbar-right">
          <button
            type="button"
            className="nb-editor-discard"
            onClick={() => router.push('/dashboard/customers')}
            disabled={submitting}
          >
            انصراف
          </button>
          <button
            type="submit"
            form="edit-customer-form"
            className="nb-editor-save-btn"
            disabled={submitting}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="edit-customer-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-900/20">
                  {form.type === 'company' ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>
                    ویرایش مشخصات مشتری
                  </h2>
                  <p className="text-sm text-slate-400">
                    اطلاعات مشتری، سطوح دسترسی، خدمات و مشخصات تماس را اصلاح کنید.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Type selector */}
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">نوع مشتری</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'individual' })}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3.5 text-sm font-semibold transition ${
                      form.type === 'individual'
                        ? 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <User className="h-4 w-4" />
                    شخص حقیقی
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'company' })}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3.5 text-sm font-semibold transition ${
                      form.type === 'company'
                        ? 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Building2 className="h-4 w-4" />
                    شخص حقوقی (شرکت)
                  </button>
                </div>
              </div>

              {/* Names */}
              {form.type === 'company' ? (
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">نام شرکت / سازمان <span className="text-red-500">*</span></Label>
                  <input
                    type="text"
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    className={`nb-input ${errors.companyName ? 'border-red-300' : ''}`}
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                  />
                  {errors.companyName && <span className="nb-editor-error">{errors.companyName}</span>}
                </div>
              ) : (
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">نام و نام خانوادگی <span className="text-red-500">*</span></Label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className={`nb-input ${errors.fullName ? 'border-red-300' : ''}`}
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                  />
                  {errors.fullName && <span className="nb-editor-error">{errors.fullName}</span>}
                </div>
              )}

              {/* Contact info */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">شماره موبایل اصلی</Label>
                  <div className="relative">
                    <Phone className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      dir="ltr"
                      value={form.mobile}
                      onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                      className={`nb-input pr-10 text-left ${errors.mobile ? 'border-red-300' : ''}`}
                      style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', paddingRight: 38, paddingLeft: 14, fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                    />
                  </div>
                  {errors.mobile && <span className="nb-editor-error">{errors.mobile}</span>}
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">تلفن ثابت</Label>
                  <div className="relative">
                    <Phone className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      dir="ltr"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="nb-input pr-10 text-left"
                      style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', paddingRight: 38, paddingLeft: 14, fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                    />
                  </div>
                </div>
              </div>

              {/* Email & City */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">ایمیل</Label>
                  <div className="relative">
                    <Mail className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      dir="ltr"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="nb-input pr-10 text-left"
                      style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', paddingRight: 38, paddingLeft: 14, fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                    />
                  </div>
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">شهر</Label>
                  <div className="relative">
                    <MapPin className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="nb-input pr-10"
                      style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', paddingRight: 38, paddingLeft: 14, fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">نشانی</Label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="nb-input"
                  style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                />
              </div>

              {/* Level & Activity */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">سطح در باشگاه مشتریان</Label>
                  <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                    <SelectTrigger className="h-11">
                      <Award className="ml-1 h-4 w-4 text-slate-400" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOMER_LEVELS.map((lvl) => (
                        <SelectItem key={lvl.key} value={lvl.key}>
                          {lvl.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">حوزه فعالیت</Label>
                  <Select value={form.activityType} onValueChange={(v) => setForm({ ...form, activityType: v })}>
                    <SelectTrigger className="h-11">
                      <Briefcase className="ml-1 h-4 w-4 text-slate-400" />
                      <SelectValue placeholder="انتخاب حوزه فعالیت..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_TYPES.map((act) => (
                        <SelectItem key={act} value={act}>{act}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Project Manager */}
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">مدیر پروژه / مسئول ارتباط</Label>
                <Select value={projectManagerId} onValueChange={setProjectManagerId}>
                  <SelectTrigger className="h-11">
                    <UserCog className="ml-1 h-4 w-4 text-slate-400" />
                    <SelectValue placeholder="انتخاب مسئول..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون مسئول اختصاصی</SelectItem>
                    {staffList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {fullName(s.firstName, s.lastName)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Additional Phones */}
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">شماره‌های تماس اضافی</Label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    dir="ltr"
                    value={newPhoneInput}
                    onChange={(e) => setNewPhoneInput(e.target.value)}
                    placeholder="شماره جدید را وارد کنید..."
                    className="nb-input flex-1"
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, background: 'transparent', outline: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={addPhone}
                    className="rounded-xl bg-slate-100 hover:bg-slate-200 px-4 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200"
                  >
                    افزودن
                  </button>
                </div>
                {additionalPhones.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {additionalPhones.map((ph, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        dir="ltr"
                      >
                        {ph}
                        <button type="button" onClick={() => removePhone(idx)} className="text-slate-400 hover:text-red-500">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Service Types */}
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">خدمات دریافتی</Label>
                <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                  {SERVICE_TYPES.map((st) => {
                    const checked = selectedServices.includes(st);
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => toggleService(st)}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                          checked
                            ? 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {checked && <Check className="h-3 w-3" />}
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Password change option */}
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="nb-editor-label text-sm font-semibold">تغییر رمز عبور ورود مشتری به پورتال</Label>
                    <p className="text-xs text-slate-400">در صورت فراموشی مشتری یا درخواست بازنشانی رمز عبور</p>
                  </div>
                  <input
                    type="checkbox"
                    id="change-pw-chk"
                    checked={changePassword}
                    onChange={(e) => setChangePassword(e.target.checked)}
                    className="h-4 w-4 rounded text-sky-600"
                  />
                </div>
                {changePassword && (
                  <div className="pt-2">
                    <PasswordInput
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="رمز عبور جدید (حداقل ۶ کاراکتر)"
                    />
                    {errors.newPassword && <span className="nb-editor-error mt-1">{errors.newPassword}</span>}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">یادداشت و توضیحات تکمیلی</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="نکات مهم در خصوص این مشتری..."
                  className="min-h-[90px]"
                />
              </div>
            </div>
          </form>

          {/* Sidebar Guide */}
          <div className="space-y-6">
            <div className="nb-editor-card">
              <div className="nb-editor-card-header">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <h3>راهنمای اطلاعات مشتری</h3>
              </div>
              <div className="space-y-4">
                {guideItems.map((item, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4 dark:border-sky-900/30 dark:bg-sky-950/20">
              <div className="flex gap-2.5">
                <Info className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                <p className="text-xs text-sky-800 dark:text-sky-300 leading-relaxed">
                  تغییر سطح مشتری تأثیری بر فاکتورها و خریدهای گذشته ندارد و از این لحظه در محاسبه تخفیف‌ها و جوایز محاسبه می‌شود.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
