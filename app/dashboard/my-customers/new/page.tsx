'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData, fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight, UserCheck, User, Phone, MapPin, Building,
  Lightbulb, Info, Loader2, Check,
} from 'lucide-react';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type { Profile } from '@/lib/types';

const guideItems = [
  { icon: User, title: 'مشخصات فردی', desc: 'نام و نام خانوادگی مشتری را به صورت دقیق وارد کنید.' },
  { icon: Phone, title: 'شماره تماس معتبر', desc: 'شماره موبایل جهت هماهنگی و پیگیری‌های بعدی استفاده می‌شود.' },
  { icon: MapPin, title: 'موقعیت مکانی', desc: 'استان و شهر مشتری را جهت دسته‌بندی منطقه‌ای مشخص کنید.' },
  { icon: UserCheck, title: 'اختصاص مالک', desc: 'در صورت نیاز به عنوان سوپرادمین می‌توانید این مشتری را به پرسنل دیگر اختصاص دهید.' },
];

export default function NewMyCustomerPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const firstNameRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    mobile: '',
    province: '',
    city: '',
    profile_id: '',
  });

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  useEffect(() => {
    firstNameRef.current?.focus();
    if (isSuperAdmin) {
      setLoadingStaff(true);
      fetchData<Profile>('profiles', {
        where: { userType: 'staff' },
        orderBy: { firstName: 'asc' },
      })
        .then((data) => setStaff(data || []))
        .catch(() => {})
        .finally(() => setLoadingStaff(false));
    }
  }, [isSuperAdmin]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.first_name.trim()) errs.first_name = 'نام مشتری الزامی است';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      await createData('my_customers', {
        type: 'individual',
        firstName: form.first_name.trim() || null,
        lastName: form.last_name.trim() || null,
        mobile: form.mobile.trim() || null,
        city: form.city.trim() || null,
        province: form.province.trim() || null,
        profileId: (isSuperAdmin && form.profile_id) ? form.profile_id : profile.id,
      });

      toast.success('مشتری شخصی با موفقیت ایجاد شد');
      router.push('/dashboard/my-customers');
    } catch (error: any) {
      toast.error('ایجاد مشتری ناموفق: ' + error.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="nb-editor-page" dir="rtl">
      {/* Top Bar */}
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/my-customers" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به مشتریان من
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> مشتریان من <b>←</b> افزودن مشتری جدید</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button
            type="button"
            className="nb-editor-discard"
            onClick={() => router.push('/dashboard/my-customers')}
            disabled={submitting}
          >
            انصراف
          </button>
          <button
            type="submit"
            form="my-customer-form"
            className="nb-editor-save-btn"
            disabled={submitting}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال ایجاد...' : 'ثبت مشتری'}
          </button>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="my-customer-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-900/20">
                  <UserCheck className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>
                    اطلاعات مشتری شخصی
                  </h2>
                  <p className="text-sm text-slate-400">
                    مشخصات مشتری جدید را وارد کنید. این مشتری فقط برای شما و مدیران مجاز قابل مشاهده خواهد بود.
                  </p>
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
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    placeholder="مثال: علی"
                    className={`nb-input ${errors.first_name ? 'border-red-300' : ''}`}
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                  />
                  {errors.first_name && <span className="nb-editor-error">{errors.first_name}</span>}
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">نام خانوادگی</Label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    placeholder="مثال: محمدی"
                    className="nb-input"
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                  />
                </div>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">شماره موبایل</Label>
                <div className="relative">
                  <Phone className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    dir="ltr"
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    className="nb-input pr-10 text-left"
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', paddingRight: 38, paddingLeft: 14, fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">استان</Label>
                  <input
                    type="text"
                    value={form.province}
                    onChange={(e) => setForm({ ...form, province: e.target.value })}
                    placeholder="مثال: تهران"
                    className="nb-input"
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                  />
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">شهر</Label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="مثال: تهران"
                    className="nb-input"
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                  />
                </div>
              </div>

              {isSuperAdmin && (
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">مالک مشتری (دسترسی سوپرادمین)</Label>
                  <Select
                    value={form.profile_id}
                    onValueChange={(v) => setForm({ ...form, profile_id: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="خودم (حساب جاری)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">خودم (حساب جاری)</SelectItem>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {fullName(s.firstName, s.lastName)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {loadingStaff && <span className="text-xs text-slate-400 mt-1 block">در حال بارگذاری پرسنل...</span>}
                </div>
              )}
            </div>
          </form>

          {/* Sidebar Guide */}
          <div className="space-y-6">
            <div className="nb-editor-card">
              <div className="nb-editor-card-header">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <h3>راهنمای ثبت مشتری شخصی</h3>
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
                  مشتریان شخصی در کارتابل اختصاصی شما ثبت می‌شوند و برای حفظ حریم کاری، سایر کاربران عادی به آن‌ها دسترسی ندارند.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
