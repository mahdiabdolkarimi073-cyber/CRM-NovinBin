'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, Palette, Loader2, Check, Upload, X,
  File as FileIcon, Image as ImageIcon, Lightbulb, Info, Type,
} from 'lucide-react';
import { toast } from 'sonner';

interface UploadItem {
  url: string;
  name: string;
  type: string;
  size: number;
}

const guideItems = [
  { icon: Type, title: 'متن توضیحات', desc: 'متن یا دستور کار گرافیکی را وارد کنید.' },
  { icon: ImageIcon, title: 'تصاویر مرتبط', desc: 'تصاویر نمونه یا مرجع را آپلود کنید.' },
  { icon: FileIcon, title: 'فایل‌های پیوست', desc: 'فایل‌های مورد نیاز را ضمیمه کنید.' },
];

export default function NewGraphicWorkPage() {
  const router = useRouter();
  const [textContent, setTextContent] = useState('');
  const [pendingFiles, setPendingFiles] = useState<UploadItem[]>([]);
  const [pendingImages, setPendingImages] = useState<UploadItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File, isImage: boolean): Promise<UploadItem | null> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('isImage', String(isImage));
    try {
      const res = await fetch('/api/upload/graphic-work-file', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingFiles.length === 0 && pendingImages.length === 0 && !textContent.trim()) {
      toast.error('حداقل یک متن، تصویر یا فایل وارد کنید');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/graphic-works', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          textContent: textContent || null,
          fileUrls: pendingFiles.map((f) => ({ url: f.url, name: f.name, type: f.type, size: f.size })),
          imageUrls: pendingImages.map((img) => ({ url: img.url })),
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || 'ایجاد ناموفق بود'); }
      else { toast.success('کار گرافیک با موفقیت ایجاد شد'); router.push('/dashboard/graphic-works'); }
    } catch { toast.error('ایجاد ناموفق بود'); }
    setSaving(false);
  };

  return (
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/graphic-works" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" /> بازگشت به کارهای گرافیک
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> کارهای گرافیک <b>←</b> کار جدید</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/graphic-works')} disabled={saving}>انصراف</button>
          <button type="submit" form="gw-form" className="nb-editor-save-btn" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? 'در حال ایجاد...' : 'ایجاد کار'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="gw-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleCreate}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-900/20">
                  <Palette className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>کار گرافیک جدید</h2>
                  <p className="text-sm text-slate-400">متن، تصاویر و فایل‌های مورد نیاز را وارد کنید.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="nb-editor-field-group">
                <label className="nb-editor-label">متن / توضیحات</label>
                <Textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="متن یا توضیحات مورد نیاز..."
                  rows={6}
                  className="min-h-[120px] w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm"
                />
              </div>

              <div className="nb-editor-field-group">
                <label className="nb-editor-label">تصاویر</label>
                {pendingImages.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
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
                <Button type="button" variant="outline" size="sm" onClick={() => imageInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} افزودن تصویر
                </Button>
              </div>

              <div className="nb-editor-field-group">
                <label className="nb-editor-label">فایل‌ها</label>
                {pendingFiles.length > 0 && (
                  <div className="mb-2 space-y-2">
                    {pendingFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                        <FileIcon className="h-4 w-4 text-slate-400" />
                        <span className="text-xs text-slate-700 truncate flex-1">{file.name}</span>
                        <span className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(0)} KB</span>
                        <button type="button" onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))} className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} افزودن فایل
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
              <p className="text-sm text-slate-500 dark:text-slate-400">کارهای گرافیک پس از ایجاد در صفحه اصلی قابل مشاهده و مدیریت هستند.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
