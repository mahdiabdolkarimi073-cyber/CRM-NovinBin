'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import {
  ArrowRight, Warehouse, Loader2, Check, Lightbulb, Info,
  ClipboardList, MapPin, UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';

const inputStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: '1px solid #E2E8F0',
  padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none',
};

const guideItems = [
  { icon: ClipboardList, title: 'نام انبار را دقیق وارد کنید', desc: 'نام انبار باید واضح و قابل تشخیص باشد تا در جستجوها سریع پیدا شود.' },
  { icon: MapPin, title: 'آدرس دقیق', desc: 'ثبت آدرس دقیق به مدیریت بهتر ارسال‌ها و دریافت‌ها کمک می‌کند.' },
  { icon: UserCheck, title: 'تعیین مدیر انبار', desc: 'تعیین فرد مسئول انبار باعث نظم در پیگیری‌ها می‌شود.' },
];

export default function NewWarehousePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: '', address: '', manager: '' });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'نام انبار الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    try {
      await createData('warehouses', {
        name: form.name.trim(),
        address: form.address.trim() || null,
        manager: form.manager.trim() || null,
      });
      toast.success('انبار ایجاد شد');
      router.push('/dashboard/inventory');
    } catch (error: any) {
      toast.error('ایجاد انبار ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/inventory" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به انبار
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> انبار و لجستیک <b>←</b> ایجاد انبار</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/inventory')} disabled={submitting}>
            انصراف
          </button>
          <button type="submit" form="warehouse-form" className="nb-editor-save-btn" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال ایجاد...' : 'ایجاد انبار'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="warehouse-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20">
                  <Warehouse className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>اطلاعات انبار</h2>
                  <p className="text-sm text-slate-400">لطفاً اطلاعات مربوط به انبار جدید را وارد کنید.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">نام انبار <span className="text-red-500">*</span></Label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="نام انبار را وارد کنید"
                  className="nb-input"
                  style={{ ...inputStyle, borderColor: errors.name ? '#FCA5A5' : '#E2E8F0' }}
                />
                {errors.name && <span className="nb-editor-error">{errors.name}</span>}
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">آدرس</Label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="آدرس انبار (اختیاری)"
                  className="nb-input"
                  style={inputStyle}
                />
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">مدیر انبار</Label>
                <input
                  type="text"
                  value={form.manager}
                  onChange={(e) => setForm({ ...form, manager: e.target.value })}
                  placeholder="نام مدیر انبار (اختیاری)"
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
              <p className="text-sm text-slate-500 dark:text-slate-400">پس از ایجاد انبار می‌توانید حرکات ورود و خروج کالا را برای آن ثبت کنید.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
