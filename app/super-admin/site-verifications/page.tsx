'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, updateData } from '@/lib/data-client';
import { PageHeader } from '@/components/dashboard/page-header';
import { VERIFICATION_CATEGORIES, VERIFICATION_STATUSES, fullName } from '@/lib/constants';
import { formatJalaliDateTime, formatFileSize } from '@/lib/format';
import { toast } from 'sonner';
import {
  FileText, Loader2, CheckCircle2, XCircle, Clock, Eye, Search,
  Download, User,
} from 'lucide-react';
import type { SiteVerification, Profile } from '@/lib/types';

const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
  pending: { icon: Clock, color: '#F59E0B', bg: '#FEF3C7' },
  reviewed: { icon: Eye, color: '#3B82F6', bg: '#DBEAFE' },
  approved: { icon: CheckCircle2, color: '#22C55E', bg: '#DCFCE7' },
  rejected: { icon: XCircle, color: '#EF4444', bg: '#FEE2E2' },
};

export default function SuperAdminVerificationsPage() {
  const [items, setItems] = useState<SiteVerification[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    try {
      const [data, profData] = await Promise.all([
        fetchData<SiteVerification>('site_verifications', { orderBy: { createdAt: 'desc' } }),
        fetchData<Profile>('profiles', {}),
      ]);
      setItems(data || []);
      const profMap: Record<string, Profile> = {};
      (profData || []).forEach((p) => { profMap[p.id] = p; });
      setProfiles(profMap);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((item) => {
    const matchesSearch = !search || item.title.includes(search) || (item.description || '').includes(search);
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = items.filter((x) => x.status === 'pending').length;

  const handleReview = async (id: string, status: 'approved' | 'rejected' | 'reviewed') => {
    setUpdating(true);
    try {
      await updateData('site_verifications', { id }, {
        status,
        reviewNote: reviewNote || null,
      });
      setItems((prev) => prev.map((x) => x.id === id ? { ...x, status, reviewNote: reviewNote || null } : x));
      setReviewing(null);
      setReviewNote('');
      toast.success(status === 'approved' ? 'تاییدیه تایید شد' : status === 'rejected' ? 'تاییدیه رد شد' : 'بررسی ثبت شد');
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const getCategoryLabel = (key: string) => VERIFICATION_CATEGORIES.find((c) => c.key === key)?.label || key;
  const getStatusLabel = (key: string) => VERIFICATION_STATUSES.find((s) => s.key === key)?.label || key;
  const getSubmitterName = (id: string) => {
    const p = profiles[id];
    return p ? fullName(p.firstName, p.lastName) : 'کاربر نامشخص';
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="تاییدیه‌های سایت"
        description={pendingCount > 0 ? `${pendingCount.toLocaleString('fa-IR')} تاییدیه در انتظار بررسی` : 'مدیریت تاییدیه‌های ارسالی کاربران'}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="جستجو در عنوان یا توضیحات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pr-10 pl-4 text-sm text-slate-700 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${statusFilter === 'all' ? 'bg-amber-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'}`}
          >
            همه
          </button>
          {VERIFICATION_STATUSES.map((s) => {
            const cfg = statusConfig[s.key];
            return (
              <button
                key={s.key}
                onClick={() => setStatusFilter(s.key)}
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${statusFilter === s.key ? 'text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'}`}
                style={statusFilter === s.key ? { backgroundColor: s.color } : {}}
              >
                <cfg.icon className="h-3 w-3" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-500 mb-1">هیچ تاییدیه‌ای یافت نشد</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((item) => {
            const cfg = statusConfig[item.status] || statusConfig.pending;
            const StatusIcon = cfg.icon;
            const isReviewing = reviewing === item.id;
            return (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 transition-all hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-semibold text-slate-800">{item.title}</h3>
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{ color: cfg.color, backgroundColor: cfg.bg }}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {getStatusLabel(item.status)}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-slate-500 mb-2">{item.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {getSubmitterName(item.submittedBy)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {item.fileName || 'فایل'}
                      </span>
                      <span>{formatFileSize(Number(item.fileSize))}</span>
                      <span>{getCategoryLabel(item.category)}</span>
                      <span>{formatJalaliDateTime(item.createdAt)}</span>
                    </div>
                    {item.reviewNote && (
                      <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        <strong>یادداشت بررسی:</strong> {item.reviewNote}
                      </div>
                    )}
                    {isReviewing && (
                      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-2">
                        <textarea
                          placeholder="یادداشت بررسی (اختیاری)..."
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-amber-500 focus:outline-none"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReview(item.id, 'approved')}
                            disabled={updating}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-emerald-600 disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            تایید
                          </button>
                          <button
                            onClick={() => handleReview(item.id, 'rejected')}
                            disabled={updating}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-red-600 disabled:opacity-50"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            رد
                          </button>
                          <button
                            onClick={() => handleReview(item.id, 'reviewed')}
                            disabled={updating}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-blue-600 disabled:opacity-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            بررسی شد
                          </button>
                          <button
                            onClick={() => { setReviewing(null); setReviewNote(''); }}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
                          >
                            انصراف
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-all hover:border-amber-500 hover:text-amber-600"
                    >
                      <Download className="h-3.5 w-3.5" />
                      دانلود
                    </a>
                    {item.status === 'pending' && !isReviewing && (
                      <button
                        onClick={() => { setReviewing(item.id); setReviewNote(item.reviewNote || ''); }}
                        className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-amber-600"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        بررسی
                      </button>
                    )}
                    {item.status !== 'pending' && !isReviewing && (
                      <button
                        onClick={() => { setReviewing(item.id); setReviewNote(item.reviewNote || ''); }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition-all hover:border-slate-400"
                      >
                        ویرایش بررسی
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
