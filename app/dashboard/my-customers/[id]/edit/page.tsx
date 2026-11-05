'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { updateData, fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight, UserCheck, User, Phone, MapPin,
  Lightbulb, Info, Loader2, Check,
} from 'lucide-react';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type { MyCustomer, Profile } from '@/lib/types';

const guideItems = [
  { icon: User, title: 'ویرایش مشخصات فردی', desc: 'نام و نام خانوادگی را در صورت نیاز اصلاح نمایید.' },
  { icon: Phone, title: 'به‌روزرسانی شماره تماس', desc: 'شماره تلفن همراه معتبر را ثبت نمایید.' },
  { icon: MapPin, title: 'تغییر شهر و استان', desc: 'در صورت تغییر محل سکونت یا کار مشتری، این بخش را به‌روز کنید.' },
  { icon: UserCheck, title: 'تغییر مالک', desc: 'سوپرادمین می‌تواند مشتری را بین اعضای تیم جابجا کند.' },
];

export default function EditMyCustomerPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [staff, setStaff] = useState<Profile[]>([]);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    mobile: '',
    province: '',
    city: '',
    profile_id: '',
  });

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const customers = await fetchData<MyCustomer>('my_customers', { where: { id } });
      if (customers && customers.length > 0) {
        const c = customers[0];
        setForm({
          first_name: c.firstName || '',
          last_name: c.lastName || '',
          mobile: c.mobile || '',
          province: c.province || '',
          city: c.city || '',
          profile_id: c.profileId || '',
        });
      } else {
        toast.error('مشتری یافت نشد');
        router.push('/dashboard/my-customers');
      }

      if (isSuperAdmin) {
        const staffData = await fetchData<Profile>('profiles', {
          where: { userType: 'staff' },
          orderBy: { firstName: 'asc' },
        });
        setStaff(staffData || []);
      }
    } catch (e: any) {
      toast.error('خطا در بارگذاری مشتری: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [id, isSuperAdmin, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.first_name.trim()) errs.first_name = 'نام مشتری الزامی است';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !id) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      const updatePayload: Record<string, any> = {
        firstName: form.first_name.trim() || null,
        lastName: form.last_name.trim() || null,
        mobile: form.mobile.trim() || null,
        city: form.city.trim() || null,
        province: form.province.trim() || null,
      };

      if (isSuperAdmin && form.profile_id) {
        updatePayload.profileId = form.profile_id;
      }

      await updateData('my_customers', { id }, updatePayload);

      toast.success('اطلاعات مشتری با موفقیت به‌روزرسانی شد');
      router.push('/dashboard/my-customers');
    } catch (error: any) {
      toast.error('ویرایش ناموفق: ' + error.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="nb-editor-loading" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <p>در حال بارگذاری اطلاعات مشتری...</p>
      </div>
    );
  }

  return (
    <div className="nb-editor-page" dir="rtl">
      {/* Top Bar */}
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/my-customers" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به مشتریان من
          </Link>
          <span className="nb-editor-breadcrumb">
            داشبورد <b>←</b> مشتریان من <b>←</b> ویرایش ({form.first_name} {form.last_name})
          </span>
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
            form="edit-my-customer-form"
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
          <form id="edit-my-customer-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-900/20">
                  <UserCheck className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>
                    ویرایش مشخصات مشتری شخصی
                  </h2>
                  <p className="text-sm text-slate-400">
                    اطلاعات موجود را اصلاح کرده و دکمه ذخیره تغییرات را بزنید.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">نام <span className="text-red-500">*</span></Label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
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
                      <SelectValue placeholder="انتخاب مالک..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون تغییر</SelectItem>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {fullName(s.firstName, s.lastName)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </form>

          {/* Sidebar Guide */}
          <div className="space-y-6">
            <div className="nb-editor-card">
              <div className="nb-editor-card-header">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <h3>راهنمای ویرایش</h3>
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
                  تغییرات شما به صورت آنی در فهرست مشتریان اعمال می‌شود و سوابق پیشین حفظ می‌گردد.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
