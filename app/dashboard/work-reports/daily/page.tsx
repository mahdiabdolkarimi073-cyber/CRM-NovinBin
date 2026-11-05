'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  FileText, Plus, Search, Calendar, ShieldCheck, Eye, Pencil,
  Loader2, X, LayoutGrid, List, Clock,
} from 'lucide-react';
import { formatJalali, formatJalaliDateTime, toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';
import { isSuperAdminRole } from '@/lib/nav-config';

type DailyWorkReport = {
  id: string;
  profileId: string;
  title: string;
  description: string | null;
  project: string | null;
  status: string;
  duration: string | null;
  details: string | null;
  reportDate: string;
  createdAt: string;
};

type ProfileInfo = {
  id: string;
  firstName: string | null;
  lastName: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  completed: 'تکمیل شده',
  in_progress: 'در حال انجام',
  incomplete: 'ناقص',
  needs_followup: 'نیازمند پیگیری',
};

const STATUS_COLORS: Record<string, string> = {
  completed: '#22C55E',
  in_progress: '#2563EB',
  incomplete: '#f59e0b',
  needs_followup: '#EF4444',
};

export default function DailyWorkReportsPage() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<DailyWorkReport[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, ProfileInfo>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [visibleCount, setVisibleCount] = useState(6);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

  const isSuperAdmin = isSuperAdminRole(profile?.role);
  const today = toLocalDateString(new Date());

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      if (isSuperAdmin) {
        const [allReports, allProfiles] = await Promise.all([
          fetchData<DailyWorkReport>('daily_work_reports', { orderBy: { reportDate: 'desc' } }),
          fetchData<ProfileInfo>('profiles', {}),
        ]);
        setReports(allReports);
        const map: Record<string, ProfileInfo> = {};
        allProfiles.forEach((p) => { map[p.id] = p; });
        setProfileMap(map);
      } else {
        const data = await fetchData<DailyWorkReport>('daily_work_reports', {
          where: { profileId: profile.id },
          orderBy: { reportDate: 'desc' },
        });
        setReports(data);
      }
    } catch {
      toast.error('خطا در بارگذاری گزارش‌ها');
    }
    setLoading(false);
  }, [profile?.id, isSuperAdmin]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { setVisibleCount(6); }, [search, filterStatus]);

  const getProfileName = (pid: string) => {
    const p = profileMap[pid];
    return p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : 'نامشخص';
  };
  const getInitials = (pid: string) => {
    const p = profileMap[pid];
    if (!p) return '؟';
    return ((p.firstName?.[0] || '') + (p.lastName?.[0] || '')).toUpperCase();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    return reports.filter((r) => {
      const name = isSuperAdmin ? getProfileName(r.profileId).toLocaleLowerCase() : '';
      const matchesQuery = !q || r.title.toLocaleLowerCase().includes(q) || name.includes(q);
      const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
      return matchesQuery && matchesStatus;
    });
  }, [reports, search, filterStatus, isSuperAdmin, profileMap]);

  const stats = useMemo(() => [
    {
      label: 'کل گزارش‌ها', value: reports.length, icon: FileText,
      filter: 'all',
      gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
      glow: 'rgba(37,99,235,0.25)',
    },
    {
      label: 'تکمیل شده', value: reports.filter((r) => r.status === 'completed').length, icon: FileText,
      filter: 'completed',
      gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      glow: 'rgba(34,197,94,0.25)',
    },
    {
      label: 'در حال انجام', value: reports.filter((r) => r.status === 'in_progress').length, icon: Clock,
      filter: 'in_progress',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      glow: 'rgba(245,158,11,0.25)',
    },
    {
      label: 'ناقص', value: reports.filter((r) => r.status === 'incomplete').length, icon: FileText,
      filter: 'incomplete',
      gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      glow: 'rgba(239,68,68,0.25)',
    },
  ], [reports]);

  const handleStatClick = (f: string) => {
    setFilterStatus(filterStatus === f ? 'all' : f);
  };

  const stColor = (status: string) => STATUS_COLORS[status] || '#94A3B8';

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری گزارش‌ها...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="nb-page" dir="rtl">
      <header className="nb-hero">
        <div className="nb-hero-left">
          <div>
            <div className="nb-hero-title-row">
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#FF7A00,#E65100)', boxShadow: '0 0 12px rgba(255,122,0,.25)' }} />
              <h1>گزارش کار روزانه</h1>
            </div>
            <p>{isSuperAdmin ? 'مشاهده تمام گزارش‌های روزانه ارسال‌شده توسط کاربران' : 'ثبت گزارش کارهای انجام‌شده در هر روز'}</p>
          </div>
        </div>
        <div className="nb-hero-right">
          {isSuperAdmin ? (
            <span className="nb-editor-quick-btn" style={{ borderColor: '#a7f3d0', color: '#047857', background: '#ecfdf5' }}>
              <ShieldCheck className="h-4 w-4" />
              حالت مشاهده
            </span>
          ) : (
            <Link href="/dashboard/work-reports/daily/new" className="nb-new-btn">
              <Plus className="h-[18px] w-[18px]" />
              گزارش جدید
            </Link>
          )}
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        {stats.map((stat) => (
          <button
            type="button"
            className={`nb-stat-card-v2 ${filterStatus === stat.filter ? 'is-active' : ''}`}
            key={stat.label}
            onClick={() => handleStatClick(stat.filter)}
            style={{ '--stat-glow': stat.glow } as React.CSSProperties}
          >
            <div className="nb-stat-v2-icon" style={{ background: stat.gradient }}>
              <stat.icon className="h-[22px] w-[22px] text-white" />
            </div>
            <div className="nb-stat-v2-body">
              <strong>{stat.value.toLocaleString('fa-IR')}</strong>
              <span>{stat.label}</span>
            </div>
            <div className="nb-stat-v2-spark" style={{ background: stat.gradient }} />
          </button>
        ))}
      </section>

      <div className="nb-toolbar">
        <div className="nb-toolbar-left">
          <h2>همه گزارش‌ها</h2>
          <span className="nb-count-badge">{filtered.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجوی عنوان گزارش..."
            />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="nb-select-filter h-10 w-[150px]">
              <SelectValue placeholder="وضعیت" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="nb-view-toggle">
            <button className={viewMode === 'board' ? 'is-active' : ''} onClick={() => setViewMode('board')} aria-label="تخته‌ای">
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button className={viewMode === 'list' ? 'is-active' : ''} onClick={() => setViewMode('list')} aria-label="لیستی">
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><FileText className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>{isSuperAdmin ? 'هنوز گزارشی ارسال نشده' : 'گزارشی ثبت نشده'}</h3>
          <p>{isSuperAdmin ? 'گزارش‌های روزانه ارسال‌شده توسط کاربران اینجا نمایش داده می‌شود' : 'اولین گزارش کار روزانه خود را ثبت کنید'}</p>
          {!isSuperAdmin && <Link href="/dashboard/work-reports/daily/new" className="nb-empty-new-btn"><Plus className="h-4 w-4" /> افزودن گزارش</Link>}
        </div>
      ) : viewMode === 'board' ? (
        <>
          <div className="nb-grid nb-grid-grid">
            {filtered.slice(0, visibleCount).map((report) => {
              const color = stColor(report.status);
              const canEditToday = !isSuperAdmin && toLocalDateString(new Date(report.reportDate)) === today;
              return (
                <article
                  key={report.id}
                  className="nb-card cursor-pointer"
                  onClick={() => window.location.href = `/dashboard/work-reports/daily/view/${report.id}`}
                  style={{ borderBottomColor: color, borderBottomWidth: 3 }}
                >
                  <div className="nb-card-top">
                    <div className="nb-card-tags">
                      <span className="nb-card-tag" style={{ background: `${color}15`, color }}>
                        {STATUS_LABELS[report.status] || report.status}
                      </span>
                    </div>
                  </div>
                  <h3 className="nb-card-title">{report.title}</h3>
                  {report.description && <p className="nb-card-excerpt">{report.description}</p>}
                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span>{formatJalali(report.reportDate)}</span>
                    </div>
                    {isSuperAdmin && (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5"><AvatarFallback className="bg-sky-100 text-[9px] text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">{getInitials(report.profileId)}</AvatarFallback></Avatar>
                        <span>{getProfileName(report.profileId)}</span>
                      </div>
                    )}
                  </div>
                  <div className="nb-card-footer">
                    <div className="nb-card-date">
                      <Clock className="h-3 w-3" />
                      {formatJalaliDateTime(report.createdAt)}
                    </div>
                    <div className="nb-card-quick">
                      <Link href={`/dashboard/work-reports/daily/view/${report.id}`} onClick={(e) => e.stopPropagation()}>
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      {canEditToday && (
                        <Link href={`/dashboard/work-reports/daily/edit/${report.id}`} onClick={(e) => e.stopPropagation()}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {filtered.length > visibleCount && (
            <button type="button" onClick={() => setVisibleCount((c) => c + 6)} className="w-full rounded-lg py-3 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20">
              نمایش ۶ مورد دیگر
            </button>
          )}
        </>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
                <tr>
                  {isSuperAdmin && <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">کاربر</th>}
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">عنوان</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">تاریخ گزارش</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">وضعیت</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">تاریخ ثبت</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.slice(0, visibleCount).map((report) => {
                  const color = stColor(report.status);
                  const canEditToday = !isSuperAdmin && toLocalDateString(new Date(report.reportDate)) === today;
                  return (
                    <tr key={report.id} className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={() => window.location.href = `/dashboard/work-reports/daily/view/${report.id}`}>
                      {isSuperAdmin && (
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6"><AvatarFallback className="bg-sky-100 text-[10px] text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">{getInitials(report.profileId)}</AvatarFallback></Avatar>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{getProfileName(report.profileId)}</span>
                          </div>
                        </td>
                      )}
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-100">{report.title}</td>
                      <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{formatJalali(report.reportDate)}</td>
                      <td className="p-3">
                        <Badge style={{ backgroundColor: `${color}15`, color }} className="rounded-full text-xs">{STATUS_LABELS[report.status] || report.status}</Badge>
                      </td>
                      <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{formatJalaliDateTime(report.createdAt)}</td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Link href={`/dashboard/work-reports/daily/view/${report.id}`} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700" title="مشاهده"><Eye className="h-4 w-4" /></Link>
                          {canEditToday && <Link href={`/dashboard/work-reports/daily/edit/${report.id}`} className="rounded p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-500" title="ویرایش"><Pencil className="h-4 w-4" /></Link>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length > visibleCount && (
            <button type="button" onClick={() => setVisibleCount((c) => c + 6)} className="w-full py-3 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20">
              نمایش ۶ مورد دیگر
            </button>
          )}
        </div>
      )}

      {!isSuperAdmin && (
        <Link href="/dashboard/work-reports/daily/new" className="nb-fab" aria-label="گزارش جدید">
          <Plus className="h-6 w-6" />
        </Link>
      )}
    </div>
  );
}
