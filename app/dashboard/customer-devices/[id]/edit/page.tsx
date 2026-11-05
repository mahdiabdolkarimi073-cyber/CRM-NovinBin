'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { updateData, fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  ArrowRight, Smartphone, Monitor, Globe, User,
  Lightbulb, Info, Loader2, Check,
} from 'lucide-react';
import { toast } from 'sonner';

const guideItems = [
  { icon: Smartphone, title: 'مشخصات دستگاه', desc: 'نام، برند و مدل ثبت‌شده دستگاه را ویرایش نمایید.' },
  { icon: Monitor, title: 'سیستم‌عامل', desc: 'نسخه نرم‌افزاری دستگاه را اصلاح کنید.' },
  { icon: Globe, title: 'آدرس IP', desc: 'آدرس شبکه یا موقعیت ثبت‌شده را به‌روزرسانی کنید.' },
];

export default function EditCustomerDevicePage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    deviceName: '',
    deviceBrand: '',
    deviceModel: '',
    osVersion: '',
    ipAddress: '',
    location: '',
    isActive: true,
  });

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchData<any>('customer_devices', { where: { id } });
      if (data && data.length > 0) {
        const d = data[0];
        setForm({
          deviceName: d.deviceName || '',
          deviceBrand: d.deviceBrand || '',
          deviceModel: d.deviceModel || '',
          osVersion: d.osVersion || '',
          ipAddress: d.ipAddress || '',
          location: d.location || '',
          isActive: d.isActive !== false,
        });
      } else {
        toast.error('دستگاه یافت نشد');
        router.push('/dashboard/customer-devices');
      }
    } catch (e: any) {
      toast.error('خطا در بارگذاری اطلاعات دستگاه: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.deviceName.trim()) errs.deviceName = 'نام دستگاه الزامی است';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !id || !validate()) return;

    setSubmitting(true);
    try {
      await updateData('customer_devices', { id }, {
        deviceName: form.deviceName.trim(),
        deviceBrand: form.deviceBrand.trim() || null,
        deviceModel: form.deviceModel.trim() || null,
        osVersion: form.osVersion.trim() || null,
        ipAddress: form.ipAddress.trim() || null,
        location: form.location.trim() || null,
        isActive: form.isActive,
      });

      toast.success('اطلاعات دستگاه با موفقیت به‌روزرسانی شد');
      router.push('/dashboard/customer-devices');
    } catch (err: any) {
      toast.error('ویرایش دستگاه ناموفق: ' + err.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="nb-editor-loading" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        <p>در حال بارگذاری اطلاعات دستگاه...</p>
      </div>
    );
  }

  return (
    <div className="nb-editor-page" dir="rtl">
      {/* Top Bar */}
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/customer-devices" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به دستگاه‌های فعال
          </Link>
          <span className="nb-editor-breadcrumb">
            داشبورد <b>←</b> دستگاه‌های فعال <b>←</b> ویرایش ({form.deviceName})
          </span>
        </div>
        <div className="nb-editor-topbar-right">
          <button
            type="button"
            className="nb-editor-discard"
            onClick={() => router.push('/dashboard/customer-devices')}
            disabled={submitting}
          >
            انصراف
          </button>
          <button
            type="submit"
            form="edit-device-form"
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
          <form id="edit-device-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-900/20">
                  <Smartphone className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>
                    ویرایش مشخصات دستگاه
                  </h2>
                  <p className="text-sm text-slate-400">
                    اطلاعات مدل، آدرس IP و وضعیت فعال بودن دستگاه را تنظیم کنید.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">نام یا عنوان دستگاه <span className="text-red-500">*</span></Label>
                  <input
                    type="text"
                    value={form.deviceName}
                    onChange={(e) => setForm({ ...form, deviceName: e.target.value })}
                    className={`nb-input ${errors.deviceName ? 'border-red-300' : ''}`}
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                  />
                  {errors.deviceName && <span className="nb-editor-error">{errors.deviceName}</span>}
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">برند دستگاه</Label>
                  <input
                    type="text"
                    value={form.deviceBrand}
                    onChange={(e) => setForm({ ...form, deviceBrand: e.target.value })}
                    className="nb-input"
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">مدل دستگاه</Label>
                  <input
                    type="text"
                    value={form.deviceModel}
                    onChange={(e) => setForm({ ...form, deviceModel: e.target.value })}
                    className="nb-input"
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                  />
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">سیستم‌عامل و نسخه</Label>
                  <input
                    type="text"
                    value={form.osVersion}
                    onChange={(e) => setForm({ ...form, osVersion: e.target.value })}
                    className="nb-input"
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">آدرس IP</Label>
                  <input
                    type="text"
                    dir="ltr"
                    value={form.ipAddress}
                    onChange={(e) => setForm({ ...form, ipAddress: e.target.value })}
                    className="nb-input text-left"
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                  />
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">موقعیت مکانی</Label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="nb-input"
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div>
                  <Label className="font-semibold text-sm">وضعیت دسترسی دستگاه</Label>
                  <p className="text-xs text-slate-400">امکان ورود و ارسال درخواست به پورتال فعال باشد</p>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                />
              </div>
            </div>
          </form>

          {/* Sidebar Guide */}
          <div className="space-y-6">
            <div className="nb-editor-card">
              <div className="nb-editor-card-header">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <h3>راهنمای ویرایش دستگاه</h3>
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
                  غیرفعال کردن دستگاه بلافاصله دسترسی مشتری از طریق این مرورگر یا دستگاه را مسدود می‌کند.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
