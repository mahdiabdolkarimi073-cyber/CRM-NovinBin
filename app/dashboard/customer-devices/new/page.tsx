'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData, fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight, Smartphone, Monitor, Globe, Wifi, User,
  Lightbulb, Info, Loader2, Check,
} from 'lucide-react';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';

interface Profile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  phone: string | null;
}

const guideItems = [
  { icon: User, title: 'انتخاب مشتری', desc: 'مشتری صاحب دستگاه را از فهرست انتخاب فرمایید.' },
  { icon: Smartphone, title: 'مدل و برند دستگاه', desc: 'مدل گوشی یا لپ‌تاپ (مثال: Galaxy S24 یا iPhone 15) را درج کنید.' },
  { icon: Monitor, title: 'سیستم‌عامل و نسخه', desc: 'نسخه اندروید، iOS یا ویندوز دستگاه را مشخص نمایید.' },
  { icon: Globe, title: 'آدرس IP و موقعیت', desc: 'آدرس IP مجاز یا موقعیت تقریبی دستگاه را ثبت نمایید.' },
];

export default function NewCustomerDevicePage() {
  const { profile } = useAuth();
  const router = useRouter();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    profileId: '',
    deviceName: '',
    deviceBrand: '',
    deviceModel: '',
    osVersion: '',
    ipAddress: '',
    location: '',
  });

  const loadProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    try {
      const data = await fetchData<Profile>('profiles', {
        where: { userType: 'customer' },
        orderBy: { createdAt: 'desc' },
      });
      setProfiles(data || []);
    } catch {
      setProfiles([]);
    } finally {
      setLoadingProfiles(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.profileId) errs.profileId = 'انتخاب مشتری الزامی است';
    if (!form.deviceName.trim()) errs.deviceName = 'نام دستگاه الزامی است';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !validate()) return;

    setSubmitting(true);
    try {
      await createData('customer_devices', {
        profileId: form.profileId,
        deviceName: form.deviceName.trim(),
        deviceBrand: form.deviceBrand.trim() || null,
        deviceModel: form.deviceModel.trim() || null,
        osVersion: form.osVersion.trim() || null,
        ipAddress: form.ipAddress.trim() || null,
        location: form.location.trim() || null,
        isActive: true,
        firstSeenAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      });

      toast.success('دستگاه مشتری با موفقیت ثبت شد');
      router.push('/dashboard/customer-devices');
    } catch (err: any) {
      toast.error('ثبت دستگاه ناموفق: ' + err.message);
      setSubmitting(false);
    }
  };

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
            داشبورد <b>←</b> دستگاه‌های فعال <b>←</b> ثبت دستگاه جدید
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
            form="customer-device-form"
            className="nb-editor-save-btn"
            disabled={submitting}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال ثبت...' : 'ثبت دستگاه'}
          </button>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="customer-device-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-900/20">
                  <Smartphone className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>
                    ثبت دستگاه مشتری
                  </h2>
                  <p className="text-sm text-slate-400">
                    اطلاعات دستگاه متصل به پورتال مشتریان را ثبت و مدیریت کنید.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">مشتری صاحب دستگاه <span className="text-red-500">*</span></Label>
                <Select
                  value={form.profileId}
                  onValueChange={(v) => setForm({ ...form, profileId: v })}
                >
                  <SelectTrigger className={`h-11 ${errors.profileId ? 'border-red-300' : ''}`}>
                    <User className="ml-1 h-4 w-4 text-slate-400" />
                    <SelectValue placeholder="یک مشتری را انتخاب کنید..." />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => {
                      const name = p.companyName || fullName(p.firstName, p.lastName);
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          {name} {p.phone ? `(${p.phone})` : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {loadingProfiles && <span className="text-xs text-slate-400 mt-1 block">در حال بارگذاری مشتریان...</span>}
                {errors.profileId && <span className="nb-editor-error">{errors.profileId}</span>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">نام یا عنوان دستگاه <span className="text-red-500">*</span></Label>
                  <input
                    type="text"
                    value={form.deviceName}
                    onChange={(e) => setForm({ ...form, deviceName: e.target.value })}
                    placeholder="مثال: گوشی شخصی مدیرعامل"
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
                    placeholder="مثال: Samsung, Apple, Xiaomi"
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
                    placeholder="مثال: Galaxy S24 Ultra"
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
                    placeholder="مثال: Android 14 یا iOS 17.5"
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
                    placeholder="192.168.1.1"
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
                    placeholder="مثال: تهران، ایران"
                    className="nb-input"
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                  />
                </div>
              </div>
            </div>
          </form>

          {/* Sidebar Guide */}
          <div className="space-y-6">
            <div className="nb-editor-card">
              <div className="nb-editor-card-header">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <h3>راهنمای امنیت دستگاه‌ها</h3>
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
                  مدیریت دستگاه‌های مجاز به شما امکان می‌دهد نشست‌های مشکوک را شناسایی و دسترسی به پورتال را محدود نمایید.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
