'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { VERIFICATION_CATEGORIES, VERIFICATION_STATUSES } from '@/lib/constants';
import { formatJalaliDateTime, formatFileSize } from '@/lib/format';
import { toast } from 'sonner';
import {
  ArrowRight, Plus, FileText, Trash2, Loader2, CheckCircle2,
  XCircle, Clock, Eye, Search,
} from 'lucide-react';
import type { SiteVerification } from '@/lib/types';

const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
  pending: { icon: Clock, color: '#F59E0B', bg: '#FEF3C7' },
  reviewed: { icon: Eye, color: '#3B82F6', bg: '#DBEAFE' },
  approved: { icon: CheckCircle2, color: '#22C55E', bg: '#DCFCE7' },
  rejected: { icon: XCircle, color: '#EF4444', bg: '#FEE2E2' },
};

export default function SiteVerificationsPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<SiteVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const data = await fetchData<SiteVerification>('site_verifications', {
        orderBy: { createdAt: 'desc' },
      });
      setItems(data || []);
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

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این تاییدیه مطمئن هستید؟')) return;
    try {
      await deleteData('site_verifications', { id });
      setItems((prev) => prev.filter((x) => x.id !== id));
      toast.success('تاییدیه حذف شد');
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const getCategoryLabel = (key: string) => VERIFICATION_CATEGORIES.find((c) => c.key === key)?.label || key;
  const getStatusLabel = (key: string) => VERIFICATION_STATUSES.find((s) => s.key === key)?.label || key;

  return (
    <div className="nb-page" dir="rtl">
      <header className="nb-hero">
        <div className="nb-hero-left">
          <div>
            <div className="nb-hero-title-row">
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#3B82F6,#2563EB)', boxShadow: '0 0 12px rgba(37,99,235,.25)' }} />
              <h1>تاییدیه‌های سایت</h1>
            </div>
            <p>مدیریت تاییدیه‌های سایت و دامنه</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/site-verifications/new" className="nb-new-btn"><Plus className="h-[18px] w-[18px]" /> تاییدیه جدید</Link>
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(245,158,11,0.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}><Clock className="h-[22px] w-[22px] text-white" /></div>
          <div className="nb-stat-v2-body"><strong>{items.filter(i => i.status === 'pending').length.toLocaleString('fa-IR')}</strong><span>در انتظار</span></div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }} />
        </div>
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(34,197,94,0.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)' }}><CheckCircle2 className="h-[22px] w-[22px] text-white" /></div>
          <div className="nb-stat-v2-body"><strong>{items.filter(i => i.status === 'approved').length.toLocaleString('fa-IR')}</strong><span>تایید شده</span></div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)' }} />
        </div>
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(239,68,68,0.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}><XCircle className="h-[22px] w-[22px] text-white" /></div>
          <div className="nb-stat-v2-body"><strong>{items.filter(i => i.status === 'rejected').length.toLocaleString('fa-IR')}</strong><span>رد شده</span></div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }} />
        </div>
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(37,99,235,0.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)' }}><FileText className="h-[22px] w-[22px] text-white" /></div>
          <div className="nb-stat-v2-body"><strong>{items.length.toLocaleString('fa-IR')}</strong><span>کل تاییدیه‌ها</span></div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)' }} />
        </div>
      </section>

      <div className="nb-toolbar">
        <div className="nb-toolbar-left">
          <h2>همه تاییدیه‌ها</h2>
          <span className="nb-count-badge">{filtered.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو در عنوان یا توضیحات..." />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری تاییدیه‌ها...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><FileText className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>تاییدیه‌ای یافت نشد</h3>
          <p>برای ارسال تاییدیه جدید روی دکمه بالا کلیک کنید</p>
          <Link href="/dashboard/site-verifications/new" className="nb-empty-new-btn"><Plus className="h-4 w-4" /> تاییدیه جدید</Link>
        </div>
      ) : (
        <div className="nb-grid nb-grid-grid">
          {filtered.map((item) => {
            const cfg = statusConfig[item.status] || statusConfig.pending;
            const StatusIcon = cfg.icon;
            return (
              <article key={item.id} className="nb-card" style={{ borderBottomColor: cfg.color, borderBottomWidth: 3 }}>
                <div className="nb-card-top">
                  <div className="nb-card-tags">
                    <span className="nb-card-tag" style={{ background: cfg.bg, color: cfg.color }}><StatusIcon className="h-2.5 w-2.5" /> {getStatusLabel(item.status)}</span>
                  </div>
                </div>
                <h3 className="nb-card-title">{item.title}</h3>
                {item.description && <p className="nb-card-excerpt">{item.description}</p>}
                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span>{item.fileName || 'فایل'} • {formatFileSize(Number(item.fileSize))}</span></div>
                  <div className="flex items-center gap-1.5"><span className="shrink-0 text-slate-400">دسته:</span><span>{getCategoryLabel(item.category)}</span></div>
                </div>
                {item.reviewNote && <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"><strong>یادداشت بررسی:</strong> {item.reviewNote}</div>}
                <div className="nb-card-footer">
                  <div className="nb-card-date"><Clock className="h-3 w-3" />{formatJalaliDateTime(item.createdAt)}</div>
                  <div className="nb-card-quick">
                    <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition-all hover:text-blue-600"><Eye className="h-3.5 w-3.5" /> مشاهده</a>
                    {item.status === 'pending' && <button onClick={() => handleDelete(item.id)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500" title="حذف"><Trash2 className="h-3.5 w-3.5" /></button>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Link href="/dashboard/site-verifications/new" className="nb-fab" aria-label="تاییدیه جدید"><Plus className="h-6 w-6" /></Link>
    </div>
  );
}
