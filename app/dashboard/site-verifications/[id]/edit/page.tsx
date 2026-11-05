'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Clipboard, FileText, Upload, Loader2, Check, X, Lightbulb, Info } from 'lucide-react';
import { VERIFICATION_CATEGORIES } from '@/lib/constants';
import { formatFileSize } from '@/lib/format';
import { fetchData, updateData } from '@/lib/data-client';
import { toast } from 'sonner';
import type { SiteVerification } from '@/lib/types';

const MAX_DESC = 1000;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const guideItems = [
  { icon: FileText, title: 'عنوان واضح', desc: 'عنوانی کوتاه و گویا برای تاییدیه بنویسید.' },
  { icon: Upload, title: 'فایل مرتبط', desc: 'فایل مورد نظر برای تاییدیه را آپلود کنید.' },
  { icon: Clipboard, title: 'توضیحات کامل', desc: 'جزئیات لازم را در بخش توضیحات وارد کنید.' },
];

const inputStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: '1px solid #E2E8F0',
  padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none',
};

export default function EditVerificationPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ title: '', description: '', category: 'general' });
  const [file, setFile] = useState<{ url: string; name: string; type: string; size: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchData<SiteVerification>('site_verifications', { where: { id } });
        const item = data?.[0];
        if (!item) { toast.error('تاییدیه یافت نشد'); router.push('/dashboard/site-verifications'); return; }
        setForm({
          title: item.title || '',
          description: item.description || '',
          category: item.category || 'general',
        });
        setFile(item.fileUrl ? { url: item.fileUrl, name: item.fileName || 'فایل', type: item.fileType || '', size: Number(item.fileSize) || 0 } : null);
      } catch (error: any) {
        toast.error('بارگذاری تاییدیه ناموفق: ' + error.message);
        router.push('/dashboard/site-verifications');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
    if (selected.size > MAX_FILE_SIZE) { toast.error('حجم فایل نباید بیشتر از ۱۰ مگابایت باشد'); return; }
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
      await updateData('site_verifications', { id }, {
        title: form.title.trim(), description: form.description || null, category: form.category,
        fileUrl: file!.url, fileName: file!.name, fileType: file!.type, fileSize: file!.size,
      });
      toast.success('تاییدیه با موفقیت به‌روزرسانی شد');
      router.push('/dashboard/site-verifications');
    } catch (error: any) {
      toast.error('به‌روزرسانی تاییدیه ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
        <span className="mr-3 text-sm text-slate-500">در حال بارگذاری تاییدیه...</span>
      </div>
    );
  }

  return (
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/site-verifications" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به تاییدیه‌ها
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> تاییدیه‌های سایت <b>←</b> ویرایش تاییدیه</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/site-verifications')} disabled={submitting}>انصراف</button>
          <button type="submit" form="verification-form" className="nb-editor-save-btn" disabled={submitting || uploading}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال به‌روزرسانی...' : 'ذخیره تغییرات'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="verification-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20">
                  <Clipboard className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>اطلاعات تاییدیه</h2>
                  <p className="text-sm text-slate-400">جزئیات تاییدیه را ویرایش کنید.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">عنوان تاییدیه <span className="text-red-500">*</span></Label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: تاییدیه قرارداد مشتری..." className="nb-input" style={inputStyle} />
                {errors.title && <span className="nb-editor-error">{errors.title}</span>}
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">توضیحات</Label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, MAX_DESC) })} placeholder="توضیحات کامل تاییدیه را اینجا بنویسید..." className="nb-input" style={{ minHeight: 100, borderRadius: 10, border: '1px solid #E2E8F0', padding: '12px 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none', resize: 'vertical' }} rows={5} />
                <p className="text-xs text-slate-400 text-left">{form.description.length.toLocaleString('fa-IR')} / {MAX_DESC.toLocaleString('fa-IR')}</p>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">دسته‌بندی</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="h-11"><FileText className="ml-1 h-4 w-4 text-slate-400" /><SelectValue placeholder="انتخاب دسته‌بندی…" /></SelectTrigger>
                  <SelectContent>{VERIFICATION_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">فایل تاییدیه <span className="text-red-500">*</span></Label>
                {!file ? (
                  <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 py-8 cursor-pointer transition hover:border-blue-400 hover:bg-blue-50/30 dark:border-slate-700 dark:bg-slate-800/50">
                    {uploading ? (
                      <><Loader2 className="h-8 w-8 animate-spin text-blue-500" /><span className="text-sm text-slate-500">در حال آپلود...</span></>
                    ) : (
                      <><Upload className="h-8 w-8 text-slate-400" /><span className="text-sm text-slate-500">برای آپلود فایل کلیک کنید</span><span className="text-xs text-slate-400">حداکثر ۱۰ مگابایت</span></>
                    )}
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  </label>
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Check className="h-5 w-5 text-emerald-500 shrink-0" />
                      <div className="min-w-0"><p className="text-sm font-medium text-slate-700 truncate">{file.name}</p><p className="text-xs text-slate-400">{formatFileSize(file.size)}</p></div>
                    </div>
                    <button type="button" onClick={removeFile} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"><X className="h-4 w-4" /></button>
                  </div>
                )}
                {errors.file && <span className="nb-editor-error">{errors.file}</span>}
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
                    <div><strong className="text-sm text-slate-700 dark:text-slate-300">{item.title}</strong><p className="text-xs text-slate-400">{item.desc}</p></div>
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
              <p className="text-sm text-slate-500 dark:text-slate-400">تاییدیه‌های ارسالی شما توسط سوپرادمین بررسی می‌شوند. وضعیت بررسی را در همین صفحه می‌توانید دنبال کنید.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
