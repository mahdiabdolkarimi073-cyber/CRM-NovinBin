'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight, FolderTree, Type, Hash, ToggleLeft, Scale,
  Lightbulb, Info, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Account } from '@/lib/types';

const LEVEL_LABELS: Record<number, string> = {
  1: 'حساب اصلی',
  2: 'زیرمجموعه',
  3: 'حساب تفصیلی',
};

export default function NewSubAccountPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [parent, setParent] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: '', code: '', active: 'true', nature: 'either' });

  const childLevel = (parent?.level || 1) + 1;
  const isLeafLevel = childLevel === 3;

  const loadParent = useCallback(async () => {
    if (!id) return;
    try {
      const data = await fetchData<Account>('accounts', { where: { id } });
      setParent(data?.[0] || null);
    } catch (error: any) {
      toast.error('بارگذاری حساب والد ناموفق: ' + error.message);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadParent(); }, [loadParent]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'عنوان الزامی است';
    if (!form.code.trim()) e.code = 'کد الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parent || !validate()) return;
    setSubmitting(true);
    try {
      await createData('accounts', {
        name: form.name.trim(),
        code: form.code.trim(),
        type: parent.type,
        parentId: parent.id,
        level: childLevel,
        isGroup: !isLeafLevel,
        active: form.active === 'true',
        nature: isLeafLevel ? form.nature : 'either',
      });
      toast.success('زیرمجموعه ایجاد شد');
      router.push(`/dashboard/chart-of-accounts/${parent.id}`);
    } catch (error: any) {
      toast.error('ایجاد ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const guideItems = isLeafLevel
    ? [
        { icon: Type, title: 'عنوان حساب', desc: 'نام حساب تفصیلی را وارد کنید (مثل: صندوق).' },
        { icon: Hash, title: 'کد حساب', desc: 'کد ۴ رقمی مناسب وارد کنید (مثل: ۱۱۰۱).' },
        { icon: ToggleLeft, title: 'وضعیت فعال/غیرفعال', desc: 'می‌توانید حساب را از ابتدا غیرفعال تعریف کنید.' },
        { icon: Scale, title: 'ماهیت حساب', desc: 'بدهکار، بستانکار یا مهم نیست را انتخاب کنید.' },
      ]
    : [
        { icon: Type, title: 'عنوان زیرمجموعه', desc: 'نام دسته‌بندی زیرمجموعه را وارد کنید.' },
        { icon: Hash, title: 'کد زیرمجموعه', desc: 'کد ۲ رقمی مناسب وارد کنید (مثل: ۱۱).' },
      ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center" dir="rtl">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" />
      </div>
    );
  }

  if (!parent) {
    return (
      <div className="w-full" dir="rtl">
        <div className="rounded-[14px] border border-[#E7ECF3] bg-white p-8 text-center shadow-sm">
          <FolderTree className="mx-auto h-10 w-10 text-[#CBD5E1]" />
          <p className="mt-3 text-sm text-[#98A2B3]">حساب والد یافت نشد</p>
          <Link href="/dashboard/chart-of-accounts" className="mt-4 inline-block text-sm font-semibold text-[#3155E7]">بازگشت به حسابواره</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="create-task-page" dir="rtl">
      <div className="create-task-container">
        <header className="create-task-header">
          <div>
            <div className="create-task-title">
              <span className="title-accent-bar" />
              <h1>ایجاد زیرمجموعه جدید</h1>
            </div>
            <div className="create-task-breadcrumb">
              داشبورد <b>←</b> حسابواره <b>←</b> {parent.name} <b>←</b> ایجاد زیرمجموعه
            </div>
          </div>
          <Link href={`/dashboard/chart-of-accounts/${parent.id}`} className="back-button">
            <ArrowRight className="h-4 w-4" />
            بازگشت به {parent.name}
          </Link>
        </header>

        <div className="create-task-grid">
          <form className="task-form-card" onSubmit={handleSubmit}>
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon">
                  <FolderTree className="h-5 w-5" />
                </span>
                <div>
                  <h2>اطلاعات {LEVEL_LABELS[childLevel]}</h2>
                  <p>زیرمجموعه‌ی سطح {childLevel.toLocaleString('fa-IR')} برای «{parent.name}» (کد: {parent.code}) ایجاد کنید.</p>
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
                  placeholder={isLeafLevel ? 'مثال: صندوق' : 'مثال: دارایی‌های جاری'}
                  className="task-input"
                />
                {errors.name && <span className="field-error">{errors.name}</span>}
              </div>

              <div className="field-group">
                <Label className="field-label">کد <span className="required-star">*</span></Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder={isLeafLevel ? 'مثال: 1101' : 'مثال: 11'}
                  className="task-input"
                />
                {errors.code && <span className="field-error">{errors.code}</span>}
              </div>

              {isLeafLevel && (
                <div className="management-row">
                  <div className="field-group">
                    <Label className="field-label">وضعیت <span className="required-star">*</span></Label>
                    <Select value={form.active} onValueChange={(v) => setForm({ ...form, active: v })}>
                      <SelectTrigger className="task-select">
                        <span className="select-icon-right"><ToggleLeft className="h-4 w-4" /></span>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">فعال</SelectItem>
                        <SelectItem value="false">غیرفعال</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="field-group">
                    <Label className="field-label">ماهیت <span className="required-star">*</span></Label>
                    <Select value={form.nature} onValueChange={(v) => setForm({ ...form, nature: v })}>
                      <SelectTrigger className="task-select">
                        <span className="select-icon-right"><Scale className="h-4 w-4" /></span>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debit">۱ - بدهکار</SelectItem>
                        <SelectItem value="credit">۲ - بستانکار</SelectItem>
                        <SelectItem value="either">۳ - مهم نیست</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <div className="form-actions-row">
              <button type="button" className="cancel-btn" onClick={() => router.push(`/dashboard/chart-of-accounts/${parent.id}`)} disabled={submitting}>
                انصراف
              </button>
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ایجاد...</>) : 'ایجاد زیرمجموعه'}
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
              <p>
                {isLeafLevel
                  ? 'حساب‌های تفصیلی (سطح ۳) پایین‌ترین سطح سلسله‌مراتب هستند و ماهیت بدهکار/بستانکار دارند. این حساب‌ها در اسناد حسابداری استفاده می‌شوند.'
                  : 'زیرمجموعه‌های سطح ۲ دسته‌بندی میانی هستند و خود می‌توانند دارای زیرمجموعه‌های سطح ۳ باشند.'}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
