'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight, Network, Type, Hash, FolderTree, Lightbulb, Info, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

const ACCOUNT_TYPES = [
  { key: 'asset', label: 'دارایی' },
  { key: 'liability', label: 'بدهی' },
  { key: 'equity', label: 'حقوق صاحبان سهام' },
  { key: 'revenue', label: 'درآمد' },
  { key: 'expense', label: 'هزینه' },
];

const guideItems = [
  { icon: Type, title: 'عنوان واضح', desc: 'عنوانی کوتاه و گویا برای حساب اصلی بنویسید.' },
  { icon: Hash, title: 'کد یک رقمی', desc: 'کد حساب اصلی معمولاً یک رقمی است (مثل ۱ برای دارایی).' },
  { icon: FolderTree, title: 'ساختار سلسله‌مراتبی', desc: 'این حساب ریشه است و زیرمجموعه‌های آن بعداً اضافه می‌شوند.' },
];

export default function NewRootAccountPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: '', code: '', type: 'asset' });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'عنوان حساب الزامی است';
    if (!form.code.trim()) e.code = 'کد حساب الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    try {
      await createData('accounts', {
        name: form.name.trim(),
        code: form.code.trim(),
        type: form.type,
        parentId: null,
        level: 1,
        isGroup: true,
        active: true,
        nature: 'either',
      });
      toast.success('حساب اصلی ایجاد شد');
      router.push('/dashboard/chart-of-accounts');
    } catch (error: any) {
      toast.error('ایجاد ناموفق: ' + error.message);
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
              <h1>ایجاد حسابواره جدید</h1>
            </div>
            <div className="create-task-breadcrumb">
              داشبورد <b>←</b> حسابواره <b>←</b> ایجاد حساب اصلی
            </div>
          </div>
          <Link href="/dashboard/chart-of-accounts" className="back-button">
            <ArrowRight className="h-4 w-4" />
            بازگشت به حسابواره
          </Link>
        </header>

        <div className="create-task-grid">
          <form className="task-form-card" onSubmit={handleSubmit}>
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon">
                  <Network className="h-5 w-5" />
                </span>
                <div>
                  <h2>اطلاعات حساب اصلی</h2>
                  <p>یک حساب اصلی (ریشه) ایجاد کنید. زیرمجموعه‌ها بعداً اضافه می‌شوند.</p>
                </div>
              </div>
            </div>
            <div className="form-card-divider" />

            <div className="form-fields">
              <div className="field-group">
                <Label className="field-label">عنوان <span className="required-star">*</span></Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثال: دارایی‌ها"
                  className="task-input"
                />
                {errors.name && <span className="field-error">{errors.name}</span>}
              </div>

              <div className="field-group">
                <Label className="field-label">کد <span className="required-star">*</span></Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="مثال: 1"
                  className="task-input"
                />
                {errors.code && <span className="field-error">{errors.code}</span>}
              </div>

              <div className="field-group">
                <Label className="field-label">نوع حساب</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="task-select">
                    <SelectValue placeholder="انتخاب نوع..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="form-actions-row">
              <button type="button" className="cancel-btn" onClick={() => router.push('/dashboard/chart-of-accounts')} disabled={submitting}>
                انصراف
              </button>
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ایجاد...</>) : 'ایجاد حساب'}
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
              <p>حساب‌های اصلی ریشه‌ی سلسله‌مراتب حسابواره هستند. بعد از ایجاد، می‌توانید زیرمجموعه‌های سطح ۲ و ۳ را اضافه کنید.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
