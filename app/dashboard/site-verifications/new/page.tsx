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
import {
  ArrowRight, Clipboard, FileText, Upload, Loader2, Check, X,
  Lightbulb, Info,
} from 'lucide-react';
import { VERIFICATION_CATEGORIES } from '@/lib/constants';
import { formatFileSize } from '@/lib/format';
import { createData } from '@/lib/data-client';
import { toast } from 'sonner';

const MAX_DESC = 1000;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const guideItems = [
  { icon: FileText, title: 'عنوان واضح', desc: 'عنوانی کوتاه و گویا برای تاییدیه بنویسید.' },
  { icon: Upload, title: 'فایل مرتبط', desc: 'فایل مورد نظر برای تاییدیه را آپلود کنید.' },
  { icon: Clipboard, title: 'توضیحات کامل', desc: 'جزئیات لازم را در بخش توضیحات وارد کنید.' },
];

export default function NewVerificationPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'general',
  });
  const [file, setFile] = useState<{ url: string; name: string; type: string; size: number } | null>(null);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'عنوان تاییدیه الزامی است';
    if (!file) e.file = 'آپلود فایل الزامی است';
    if (form.description.length > MAX_DESC) e.description = `حداکثر ${MAX_DESC} کاراکتر`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > MAX_FILE_SIZE) {
      toast.error('حجم فایل نباید بیشتر از ۱۰ مگابایت باشد');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selected);
      const res = await fetch('/api/upload/verification-file', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'آپلود ناموفق');
      setFile({ url: json.url, name: json.name, type: json.type, size: json.size });
      toast.success('فایل با موفقیت آپلود شد');
    } catch (error: any) {
      toast.error('آپلود فایل ناموفق: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => setFile(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    try {
      await createData('site_verifications', {
        title: form.title.trim(),
        description: form.description || null,
        category: form.category,
        fileUrl: file!.url,
        fileName: file!.name,
        fileType: file!.type,
        fileSize: file!.size,
      });
      toast.success('تاییدیه با موفقیت ارسال شد');
      router.push('/dashboard/site-verifications');
    } catch (error: any) {
      toast.error('ارسال تاییدیه ناموفق: ' + error.message);
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
              <h1>ارسال تاییدیه جدید</h1>
            </div>
            <div className="create-task-breadcrumb">
              داشبورد <b>←</b> تاییدیه‌های سایت <b>←</b> تاییدیه جدید
            </div>
          </div>
          <Link href="/dashboard/site-verifications" className="back-button">
            <ArrowRight className="h-4 w-4" />
            بازگشت به تاییدیه‌ها
          </Link>
        </header>

        {/* Main grid */}
        <div className="create-task-grid">
          {/* Form card */}
          <form className="task-form-card" onSubmit={handleSubmit}>
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon">
                  <Clipboard className="h-5 w-5" />
                </span>
                <div>
                  <h2>اطلاعات تاییدیه</h2>
                  <p>جزئیات تاییدیه جدید را وارد کنید. فیلدهای ستاره‌دار الزامی هستند.</p>
                </div>
              </div>
            </div>
            <div className="form-card-divider" />

            <div className="form-fields">
              {/* Title */}
              <div className="field-group">
                <Label className="field-label">عنوان تاییدیه <span className="required-star">*</span></Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="مثال: تاییدیه قرارداد مشتری..."
                  className="task-input"
                />
                {errors.title && <span className="field-error">{errors.title}</span>}
              </div>

              {/* Description */}
              <div className="field-group">
                <Label className="field-label">توضیحات</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="توضیحات کامل تاییدیه را اینجا بنویسید..."
                  className="task-textarea"
                  maxLength={MAX_DESC}
                />
                <div className="char-counter">
                  <span>{form.description.length.toLocaleString('fa-IR')} / {MAX_DESC.toLocaleString('fa-IR')}</span>
                </div>
                {errors.description && <span className="field-error">{errors.description}</span>}
              </div>

              {/* Category */}
              <div className="field-group">
                <Label className="field-label">دسته‌بندی</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="task-select">
                    <span className="select-icon-right"><FileText className="h-4 w-4" /></span>
                    <SelectValue placeholder="انتخاب دسته‌بندی…" />
                  </SelectTrigger>
                  <SelectContent>
                    {VERIFICATION_CATEGORIES.map((c) => (
                      <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* File upload */}
              <div className="field-group">
                <Label className="field-label">فایل تاییدیه <span className="required-star">*</span></Label>
                {!file ? (
                  <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#CBD5E1] bg-slate-50 py-8 cursor-pointer transition-all hover:border-[#2563EB] hover:bg-[#EFF4FF]">
                    {uploading ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
                        <span className="text-sm text-slate-500">در حال آپلود...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-slate-400" />
                        <span className="text-sm text-slate-500">برای آپلود فایل کلیک کنید</span>
                        <span className="text-xs text-slate-400">حداکثر ۱۰ مگابایت</span>
                      </>
                    )}
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  </label>
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-[#22C55E] bg-[#F0FDF4] px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Check className="h-5 w-5 text-[#22C55E] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                        <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button type="button" onClick={removeFile} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {errors.file && <span className="field-error">{errors.file}</span>}
              </div>
            </div>

            {/* Actions */}
            <div className="form-actions-row">
              <button type="button" className="cancel-btn" onClick={() => router.push('/dashboard/site-verifications')} disabled={submitting}>
                انصراف
              </button>
              <button type="submit" className="submit-btn" disabled={submitting || uploading}>
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ارسال...</>) : 'ارسال تاییدیه'}
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
              <p>تاییدیه‌های ارسالی شما توسط سوپرادمین بررسی می‌شوند. وضعیت بررسی را در همین صفحه می‌توانید دنبال کنید.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
