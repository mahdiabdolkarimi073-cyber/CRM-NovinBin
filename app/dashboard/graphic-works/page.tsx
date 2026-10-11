'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Link from 'next/link';
import {
  Loader2, Palette, Plus, FileText, Image as ImageIcon, Upload,
  Trash2, Pencil, X, Download, File as FileIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { relativeTime } from '@/lib/format';
import type { GraphicWork } from '@/lib/types';

interface UploadItem {
  url: string;
  name: string;
  type: string;
  size: number;
}

export default function GraphicWorksPage() {
  const { profile } = useAuth();
  const [works, setWorks] = useState<GraphicWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<GraphicWork | null>(null);
  const [textContent, setTextContent] = useState('');
  const [pendingFiles, setPendingFiles] = useState<UploadItem[]>([]);
  const [pendingImages, setPendingImages] = useState<UploadItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editText, setEditText] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const isSuperAdmin = profile?.role === 'owner' || profile?.role === 'super_admin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/graphic-works', { credentials: 'include' });
      const json = await res.json();
      if (res.status === 403) {
        setAccessDenied(true);
        setWorks([]);
      } else if (!res.ok) {
        toast.error(json.error || 'دریافت کارهای گرافیک ناموفق بود');
        setWorks([]);
      } else {
        setWorks(json.works || []);
      }
    } catch {
      toast.error('دریافت کارهای گرافیک ناموفق بود');
      setWorks([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

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
      if (!res.ok) {
        toast.error(json.error || 'آپلود ناموفق بود');
        return null;
      }
      return { url: json.url, name: json.name, type: json.type, size: json.size };
    } catch {
      toast.error('آپلود ناموفق بود');
      return null;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    const results: UploadItem[] = [];
    for (const file of files) {
      const result = await uploadFile(file, false);
      if (result) results.push(result);
    }
    setPendingFiles((prev) => [...prev, ...results]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    const results: UploadItem[] = [];
    for (const file of files) {
      const result = await uploadFile(file, true);
      if (result) results.push(result);
    }
    setPendingImages((prev) => [...prev, ...results]);
    setUploading(false);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const removePendingFile = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const removePendingImage = (idx: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const openNew = () => {
    setEditingWork(null);
    setTextContent('');
    setPendingFiles([]);
    setPendingImages([]);
    setDialogOpen(true);
  };

  const handleCreate = async () => {
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
      if (!res.ok) {
        toast.error(json.error || 'ایجاد ناموفق بود');
      } else {
        toast.success('کار گرافیک با موفقیت ایجاد شد');
        setDialogOpen(false);
        setTextContent('');
        setPendingFiles([]);
        setPendingImages([]);
        load();
      }
    } catch {
      toast.error('ایجاد ناموفق بود');
    }
    setSaving(false);
  };

  const openEditText = (work: GraphicWork) => {
    setEditingWork(work);
    setEditText(work.textContent || '');
    setEditDialogOpen(true);
  };

  const handleEditTextSave = async () => {
    if (!editingWork) return;
    setEditSaving(true);
    try {
      const res = await fetch('/api/graphic-works', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: editingWork.id, textContent: editText }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'ویرایش ناموفق بود');
      } else {
        toast.success('متن ویرایش شد');
        setEditDialogOpen(false);
        setEditingWork(null);
        load();
      }
    } catch {
      toast.error('ویرایش ناموفق بود');
    }
    setEditSaving(false);
  };

  const handleDeleteWork = async (work: GraphicWork) => {
    if (!confirm('حذف این کار گرافیک؟ تمام فایل‌ها و تصاویر نیز حذف می‌شوند.')) return;
    try {
      const res = await fetch(`/api/graphic-works?id=${work.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'حذف ناموفق بود');
      } else {
        toast.success('حذف شد');
        load();
      }
    } catch {
      toast.error('حذف ناموفق بود');
    }
  };

  const handleDeleteFile = async (fileId: string, workId: string) => {
    if (!confirm('حذف این فایل؟')) return;
    try {
      const res = await fetch(`/api/graphic-works?id=${workId}&fileId=${fileId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'حذف ناموفق بود');
      } else {
        toast.success('فایل حذف شد');
        load();
      }
    } catch {
      toast.error('حذف ناموفق بود');
    }
  };

  const handleDeleteImage = async (imageId: string, workId: string) => {
    if (!confirm('حذف این تصویر؟')) return;
    try {
      const res = await fetch(`/api/graphic-works?id=${workId}&imageId=${imageId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'حذف ناموفق بود');
      } else {
        toast.success('تصویر حذف شد');
        load();
      }
    } catch {
      toast.error('حذف ناموفق بود');
    }
  };

  const stats = useMemo(() => {
    const totalFiles = works.reduce((sum, w) => sum + (w.files?.length || 0), 0);
    const totalImages = works.reduce((sum, w) => sum + (w.images?.length || 0), 0);
    return [
      { label: 'کل کارها', value: works.length, icon: Palette, color: 'bg-sky-50 text-sky-600' },
      { label: 'فایل‌ها', value: totalFiles, icon: FileText, color: 'bg-emerald-50 text-emerald-600' },
      { label: 'تصاویر', value: totalImages, icon: ImageIcon, color: 'bg-amber-50 text-amber-600' },
    ];
  }, [works]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="nb-empty" dir="rtl" style={{ minHeight: '60vh' }}>
        <div className="sb-empty-icon">
          <Palette className="h-12 w-12 text-muted-foreground/30" />
        </div>
        <h3>دسترسی محدود</h3>
        <p>شما به این بخش دسترسی ندارید — برای دریافت دسترسی با مدیر سیستم تماس بگیرید</p>
      </div>
    );
  }

  return (
    <div className="nb-page" dir="rtl">
      <header className="nb-hero">
        <div className="nb-hero-left">
          <div>
            <div className="nb-hero-title-row">
              <span className="nb-hero-marker" />
              <h1>کارهای گرافیک</h1>
            </div>
            <p>مدیریت فایل‌ها، تصاویر و متن‌های گرافیکی</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/graphic-works/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            کار جدید
          </Link>
        </div>
      </header>

      <section className="nb-stats-grid-v2 nb-stats-grid-v2--3">
        {stats.map((stat) => (
          <div key={stat.label} className="nb-stat-card-v2" style={{ cursor: 'default' }}>
            <div className="nb-stat-v2-icon" style={{ background: stat.color.includes('sky') ? 'linear-gradient(135deg,#0EA5E9,#0284C7)' : stat.color.includes('emerald') ? 'linear-gradient(135deg,#10B981,#059669)' : 'linear-gradient(135deg,#F59E0B,#D97706)' }}>
              <stat.icon className="h-[22px] w-[22px] text-white" />
            </div>
            <div className="nb-stat-v2-body">
              <strong>{stat.value.toLocaleString('fa-IR')}</strong>
              <span>{stat.label}</span>
            </div>
            <div className="nb-stat-v2-spark" style={{ background: stat.color.includes('sky') ? 'linear-gradient(135deg,#0EA5E9,#0284C7)' : stat.color.includes('emerald') ? 'linear-gradient(135deg,#10B981,#059669)' : 'linear-gradient(135deg,#F59E0B,#D97706)' }} />
          </div>
        ))}
      </section>

      {works.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon">
            <Palette className="h-12 w-12 text-muted-foreground/30" />
          </div>
          <h3>هنوز کاری ثبت نشده است</h3>
          <p>اولین کار گرافیک را ایجاد کنید</p>
          <Link href="/dashboard/graphic-works/new" className="nb-empty-new-btn">
            <Plus className="h-4 w-4" />
            اولین کار را شروع کنید
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {works.map((work) => (
            <div key={work.id} className="nb-editor-canvas" style={{ padding: '20px' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                    <Palette className="h-4 w-4 text-sky-500" />
                    <span>{relativeTime(work.createdAt)}</span>
                    {work.updatedAt !== work.createdAt && (
                      <span className="text-slate-300">• ویرایش {relativeTime(work.updatedAt)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {isSuperAdmin && (
                      <>
                        <Link
                          href={`/dashboard/graphic-works/${work.id}/edit`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-sky-600 hover:border-sky-300 transition-colors"
                          title="ویرایش"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDeleteWork(work)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-300 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {work.textContent && (
                  <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {work.textContent}
                  </div>
                )}

                {work.images && work.images.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5" />
                      تصاویر ({work.images.length.toLocaleString('fa-IR')})
                    </div>
                    <div className="grid grid-cols-2 mobile:grid-cols-3 tablet:grid-cols-4 laptop:grid-cols-5 desktop:grid-cols-6 gap-2">
                      {work.images.map((img) => (
                        <div key={img.id} className="group relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.imageUrl} alt="graphic" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                            <a
                              href={img.imageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-slate-700 hover:bg-white"
                              title="باز کردن"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                            {isSuperAdmin && (
                              <button
                                onClick={() => handleDeleteImage(img.id, work.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-red-600 hover:bg-white"
                                title="حذف"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {work.files && work.files.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      فایل‌ها ({work.files.length.toLocaleString('fa-IR')})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {work.files.map((file) => (
                        <div key={file.id} className="group flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50 transition-colors">
                          <FileIcon className="h-4 w-4 text-slate-400" />
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-slate-700 truncate max-w-[160px]">
                              {file.fileName || 'فایل'}
                            </div>
                            {file.fileSize > 0 && (
                              <div className="text-[10px] text-slate-400">
                                {(file.fileSize / 1024).toFixed(0)} KB
                              </div>
                            )}
                          </div>
                          <a
                            href={file.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-sky-600"
                            title="دانلود"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                          {isSuperAdmin && (
                            <button
                              onClick={() => handleDeleteFile(file.id, work.id)}
                              className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-red-600"
                              title="حذف"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>کار گرافیک جدید</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <label className="mb-1.5 block text-sm font-medium">متن</label>
              <Textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="متن یا توضیحات مورد نیاز..."
                rows={4}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">تصاویر</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {pendingImages.map((img, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePendingImage(idx)}
                      className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                افزودن تصویر
              </Button>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">فایل‌ها</label>
              <div className="space-y-2 mb-2">
                {pendingFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                    <FileIcon className="h-4 w-4 text-slate-400" />
                    <span className="text-xs text-slate-700 truncate flex-1">{file.name}</span>
                    <span className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(0)} KB</span>
                    <button
                      onClick={() => removePendingFile(idx)}
                      className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                افزودن فایل
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
            <Button onClick={handleCreate} disabled={saving || (pendingFiles.length === 0 && pendingImages.length === 0 && !textContent.trim())}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              ایجاد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Text Dialog (super admin only) */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>ویرایش متن</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="متن یا توضیحات..."
              rows={6}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>انصراف</Button>
            <Button onClick={handleEditTextSave} disabled={editSaving}>
              {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
