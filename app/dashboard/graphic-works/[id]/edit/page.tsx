'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, Palette, Loader2, Check, Upload, X,
  File as FileIcon, Image as ImageIcon, Lightbulb, Info, Type, Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { relativeTime } from '@/lib/format';
import type { GraphicWork } from '@/lib/types';

interface UploadItem { url: string; name: string; type: string; size: number; }

const guideItems = [
  { icon: Type, title: 'ویرایش متن', desc: 'متن توضیحات کار را ویرایش کنید.' },
  { icon: ImageIcon, title: 'مدیریت تصاویر', desc: 'تصاویر جدید اضافه یا حذف کنید.' },
  { icon: FileIcon, title: 'مدیریت فایل‌ها', desc: 'فایل‌های جدید اضافه یا حذف کنید.' },
];

export default function EditGraphicWorkPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [work, setWork] = useState<GraphicWork | null>(null);
  const [loading, setLoading] = useState(true);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<UploadItem[]>([]);
  const [pendingImages, setPendingImages] = useState<UploadItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/graphic-works', { credentials: 'include' });
      const json = await res.json();
      if (res.ok) {
        const found = (json.works || []).find((w: GraphicWork) => w.id === id);
        if (found) { setWork(found); setEditText(found.textContent || ''); }
        else { toast.error('کار یافت نشد'); router.push('/dashboard/graphic-works'); }
      } else { toast.error('بارگذاری ناموفق بود'); router.push('/dashboard/graphic-works'); }
    } catch { toast.error('بارگذاری ناموفق بود'); }
    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  const uploadFile = async (file: File, isImage: boolean): Promise<UploadItem | null> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('isImage', String(isImage));
    try {
      const res = await fetch('/api/upload/graphic-work-file', { method: 'POST', body: formData, credentials: 'include' });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || 'آپلود ناموفق بود'); return null; }
      return { url: json.url, name: json.name, type: json.type, size: json.size };
    } catch { toast.error('آپلود ناموفق بود'); return null; }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    const results: UploadItem[] = [];
    for (const file of files) { const result = await uploadFile(file, false); if (result) results.push(result); }
    setPendingFiles((prev) => [...prev, ...results]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    const results: UploadItem[] = [];
    for (const file of files) { const result = await uploadFile(file, true); if (result) results.push(result); }
    setPendingImages((prev) => [...prev, ...results]);
    setUploading(false);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/graphic-works', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, textContent: editText }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || 'ویرایش ناموفق بود'); }
      else { toast.success('متن ویرایش شد'); router.push('/dashboard/graphic-works'); }
    } catch { toast.error('ویرایش ناموفق بود'); }
    setSaving(false);
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('حذف این فایل؟')) return;
    try {
      const res = await fetch(`/api/graphic-works?id=${id}&fileId=${fileId}`, { method: 'DELETE', credentials: 'include' });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || 'حذف ناموفق بود'); }
      else { toast.success('فایل حذف شد'); load(); }
    } catch { toast.error('حذف ناموفق بود'); }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('حذف این تصویر؟')) return;
    try {
      const res = await fetch(`/api/graphic-works?id=${id}&imageId=${imageId}`, { method: 'DELETE', credentials: 'include' });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || 'حذف ناموفق بود'); }
      else { toast.success('تصویر حذف شد'); load(); }
    } catch { toast.error('حذف ناموفق بود'); }
  };

  if (loading) {
    return <div className="nb-editor-loading" dir="rtl"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /><p>در حال بارگذاری...</p></div>;
  }

  return (
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/graphic-works" className="nb-editor-back"><ArrowRight className="h-4 w-4" /> بازگشت به کارهای گرافیک</Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> کارهای گرافیک <b>←</b> ویرایش</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/graphic-works')} disabled={saving}>انصراف</button>
          <button type="submit" form="gw-edit-form" className="nb-editor-save-btn" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="gw-edit-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSave}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-900/20"><Palette className="h-5 w-5" /></span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>ویرایش کار گرافیک</h2>
                  <p className="text-sm text-slate-400">ایجاد شده: {work ? relativeTime(work.createdAt) : ''}</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="nb-editor-field-group">
                <label className="nb-editor-label">متن / توضیحات</label>
                <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} placeholder="متن یا توضیحات..." rows={6} className="min-h-[120px] w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm" />
              </div>

              <div className="nb-editor-field-group">
                <label className="nb-editor-label">تصاویر فعلی</label>
                {work?.images && work.images.length > 0 ? (
                  <div className="grid grid-cols-2 mobile:grid-cols-3 tablet:grid-cols-4 gap-2">
                    {work.images.map((img) => (
                      <div key={img.id} className="group relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.imageUrl} alt="graphic" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => handleDeleteImage(img.id)} className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-slate-400">تصویری ثبت نشده است</p>}

                {pendingImages.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {pendingImages.map((img, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt="preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setPendingImages((prev) => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
                <Button type="button" variant="outline" size="sm" onClick={() => imageInputRef.current?.click()} disabled={uploading} className="mt-2">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} افزودن تصویر جدید
                </Button>
              </div>

              <div className="nb-editor-field-group">
                <label className="nb-editor-label">فایل‌های فعلی</label>
                {work?.files && work.files.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {work.files.map((file) => (
                      <div key={file.id} className="group flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                        <FileIcon className="h-4 w-4 text-slate-400" />
                        <span className="text-xs font-medium text-slate-700 truncate max-w-[160px]">{file.fileName || 'فایل'}</span>
                        <button type="button" onClick={() => handleDeleteFile(file.id)} className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-slate-400">فایلی ثبت نشده است</p>}

                {pendingFiles.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {pendingFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                        <FileIcon className="h-4 w-4 text-slate-400" />
                        <span className="text-xs text-slate-700 truncate flex-1">{file.name}</span>
                        <button type="button" onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))} className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="mt-2">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} افزودن فایل جدید
                </Button>
              </div>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="nb-editor-canvas" style={{ padding: 20 }}>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-900/20"><Lightbulb className="h-5 w-5" /></span>
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
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-900/30"><Info className="h-5 w-5" /></span>
                <h2 className="font-bold text-slate-900 dark:text-slate-100">اطلاعات مفید</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">پس از ذخیره تغییرات، کار گرافیک در صفحه اصلی به‌روزرسانی می‌شود.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
