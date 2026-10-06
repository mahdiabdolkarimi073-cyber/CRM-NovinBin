'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import {
  FileText, Plus, Search, Calendar, ShieldCheck, Eye,
  ChevronRight, ChevronLeft, Sparkles, Send, Loader2, X,
  LayoutGrid, List, Clock,
} from 'lucide-react';
import { formatJalali, formatJalaliDateTime, toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';
import { isSuperAdminRole } from '@/lib/nav-config';

type WorkReportImage = { id: string; imageUrl: string };
type MonthlyWorkReport = {
  id: string;
  profileId: string;
  fullName: string;
  nationalId: string;
  startDate: string;
  endDate: string;
  description: string | null;
  project: string | null;
  reportDate: string;
  summary: string | null;
  details: string | null;
  status: string;
  createdAt: string;
  images?: WorkReportImage[];
};

type ProfileInfo = {
  id: string;
  firstName: string | null;
  lastName: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'پیش‌نویس',
  submitted: 'ارسال شده',
  reviewing: 'در حال بررسی',
  approved: 'تأیید شده',
  needs_revision: 'نیازمند بازبینی',
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#94A3B8',
  submitted: '#2563EB',
  reviewing: '#f59e0b',
  approved: '#22C55E',
  needs_revision: '#EF4444',
};

export default function MonthlyWorkReportsPage() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<MonthlyWorkReport[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, ProfileInfo>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [visibleCount, setVisibleCount] = useState(6);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

  const [aiOpen, setAiOpen] = useState(false);
  const [aiStep, setAiStep] = useState<'dates' | 'generating' | 'review' | 'sending'>('dates');
  const [aiStartDate, setAiStartDate] = useState('');
  const [aiEndDate, setAiEndDate] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [aiReportCount, setAiReportCount] = useState(0);

  const isSuperAdmin = isSuperAdminRole(profile?.role);

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      if (isSuperAdmin) {
        const [allReports, allProfiles] = await Promise.all([
          fetchData<MonthlyWorkReport>('monthly_work_reports', { orderBy: { createdAt: 'desc' }, include: { images: true } }),
          fetchData<ProfileInfo>('profiles', {}),
        ]);
        setReports(allReports);
        const map: Record<string, ProfileInfo> = {};
        allProfiles.forEach((p) => { map[p.id] = p; });
        setProfileMap(map);
      } else {
        const data = await fetchData<MonthlyWorkReport>('monthly_work_reports', {
          where: { profileId: profile.id },
          orderBy: { createdAt: 'desc' },
          include: { images: true },
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
      const matchesQuery = !q || r.fullName.toLocaleLowerCase().includes(q) || name.includes(q);
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
      label: 'ارسال شده', value: reports.filter((r) => r.status === 'submitted').length, icon: Send,
      filter: 'submitted',
      gradient: 'linear-gradient(135deg, #2563EB 0%, #1d4ed8 100%)',
      glow: 'rgba(37,99,235,0.25)',
    },
    {
      label: 'تأیید شده', value: reports.filter((r) => r.status === 'approved').length, icon: FileText,
      filter: 'approved',
      gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      glow: 'rgba(34,197,94,0.25)',
    },
    {
      label: 'در حال بررسی', value: reports.filter((r) => r.status === 'reviewing').length, icon: Clock,
      filter: 'reviewing',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      glow: 'rgba(245,158,11,0.25)',
    },
  ], [reports]);

  const handleStatClick = (f: string) => {
    setFilterStatus(filterStatus === f ? 'all' : f);
  };

  const stColor = (status: string) => STATUS_COLORS[status] || '#94A3B8';

  const handleGenerate = async () => {
    if (!aiStartDate || !aiEndDate) { toast.error('تاریخ شروع و پایان را انتخاب کنید'); return; }
    setAiStep('generating');
    try {
      const res = await fetch('/api/work-reports/generate-monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: aiStartDate, endDate: aiEndDate }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || 'خطا در تولید گزارش'); setAiStep('dates'); return; }
      setAiSummary(json.summary);
      setAiReportCount(json.reportCount);
      setAiStep('review');
    } catch {
      toast.error('خطا در ارتباط با سرور');
      setAiStep('dates');
    }
  };

  const handleSend = async () => {
    if (!profile?.id) { toast.error('اطلاعات کاربری یافت نشد'); return; }
    setAiStep('sending');
    try {
      const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
      await createData<MonthlyWorkReport>('monthly_work_reports', {
        profileId: profile.id,
        fullName,
        nationalId: '',
        startDate: new Date(aiStartDate),
        endDate: new Date(aiEndDate),
        description: aiSummary,
        reportDate: new Date(),
        summary: aiSummary,
        status: 'submitted',
      });
      toast.success('گزارش ماهانه ارسال شد');
      resetAiDialog();
      loadData();
    } catch (error: any) {
      toast.error('خطا در ارسال گزارش: ' + (error?.message || 'خطا'));
      setAiStep('review');
    }
  };

  const resetAiDialog = () => {
    setAiOpen(false);
    setAiStep('dates');
    setAiSummary('');
    setAiStartDate('');
    setAiEndDate('');
  };

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
              <h1>گزارش کار ماهانه</h1>
            </div>
            <p>{isSuperAdmin ? 'مشاهده تمام گزارش‌های ماهانه ارسال‌شده توسط کاربران' : 'ثبت گزارش ماهانه پروژه با صورت وضعیت'}</p>
          </div>
        </div>
        <div className="nb-hero-right">
          {isSuperAdmin ? (
            <span className="nb-editor-quick-btn" style={{ borderColor: '#a7f3d0', color: '#047857', background: '#ecfdf5' }}>
              <ShieldCheck className="h-4 w-4" />
              حالت مشاهده
            </span>
          ) : (
            <>
              <button type="button" className="nb-editor-quick-btn" style={{ borderColor: '#5eead4', color: '#0f766e', background: '#f0fdfa' }} onClick={() => setAiOpen(true)}>
                <Sparkles className="h-4 w-4" />
                گزارش هوشمند
              </button>
              <Link href="/dashboard/work-reports/monthly/new" className="nb-new-btn">
                <Plus className="h-[18px] w-[18px]" />
                گزارش جدید
              </Link>
            </>
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
              placeholder={isSuperAdmin ? 'جستجوی نام کاربر یا گزارش...' : 'جستجوی نام...'}
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
          <h3>{isSuperAdmin ? 'هنوز گزارشی ارسال نشده' : 'گزارش ماهانه‌ای ثبت نشده'}</h3>
          <p>{isSuperAdmin ? 'گزارش‌های ماهانه ارسال‌شده توسط کاربران اینجا نمایش داده می‌شود' : 'اولین گزارش ماهانه خود را ثبت کنید'}</p>
          {!isSuperAdmin && (
            <div className="flex gap-2">
              <button type="button" className="nb-empty-new-btn" style={{ background: '#0D9488' }} onClick={() => setAiOpen(true)}>
                <Sparkles className="h-4 w-4" /> گزارش هوشمند
              </button>
              <Link href="/dashboard/work-reports/monthly/new" className="nb-empty-new-btn">
                <Plus className="h-4 w-4" /> افزودن گزارش
              </Link>
            </div>
          )}
        </div>
      ) : viewMode === 'board' ? (
        <>
          <div className="nb-grid nb-grid-grid">
            {filtered.slice(0, visibleCount).map((report) => {
              const color = stColor(report.status);
              return (
                <article
                  key={report.id}
                  className="nb-card cursor-pointer"
                  onClick={() => window.location.href = `/dashboard/work-reports/view/${report.id}`}
                  style={{ borderBottomColor: color, borderBottomWidth: 3 }}
                >
                  <div className="nb-card-top">
                    <div className="nb-card-tags">
                      <span className="nb-card-tag" style={{ background: `${color}15`, color }}>
                        {STATUS_LABELS[report.status] || report.status}
                      </span>
                      {report.images && report.images.length > 0 && (
                        <span className="nb-card-tag" style={{ background: 'rgba(37,99,235,.12)', color: '#2563EB' }}>
                          {report.images.length.toLocaleString('fa-IR')} تصویر
                        </span>
                      )}
                    </div>
                  </div>
                  <h3 className="nb-card-title">{report.fullName}</h3>
                  <p className="nb-card-excerpt">{formatJalali(report.startDate)} تا {formatJalali(report.endDate)}</p>
                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {report.project && (
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>{report.project}</span>
                      </div>
                    )}
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
                      <Link href={`/dashboard/work-reports/view/${report.id}`} onClick={(e) => e.stopPropagation()}>
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
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
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">نام</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">بازه زمانی</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">وضعیت</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">تصاویر</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.slice(0, visibleCount).map((report) => {
                  const color = stColor(report.status);
                  return (
                    <tr key={report.id} className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={() => window.location.href = `/dashboard/work-reports/view/${report.id}`}>
                      {isSuperAdmin && (
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6"><AvatarFallback className="bg-sky-100 text-[10px] text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">{getInitials(report.profileId)}</AvatarFallback></Avatar>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{getProfileName(report.profileId)}</span>
                          </div>
                        </td>
                      )}
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-100">{report.fullName}</td>
                      <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{formatJalali(report.startDate)} تا {formatJalali(report.endDate)}</td>
                      <td className="p-3">
                        <Badge style={{ backgroundColor: `${color}15`, color }} className="rounded-full text-xs">{STATUS_LABELS[report.status] || report.status}</Badge>
                      </td>
                      <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{(report.images?.length || 0).toLocaleString('fa-IR')} تصویر</td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/dashboard/work-reports/view/${report.id}`} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700" title="مشاهده"><Eye className="h-4 w-4" /></Link>
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
        <Link href="/dashboard/work-reports/monthly/new" className="nb-fab" aria-label="گزارش جدید">
          <Plus className="h-6 w-6" />
        </Link>
      )}

      <Dialog open={aiOpen} onOpenChange={(open) => { if (!open) resetAiDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[18px] font-bold text-slate-900">
              <Sparkles className="h-5 w-5 text-[#0D9488]" />
              تولید و ارسال گزارش ماهانه هوشمند
            </DialogTitle>
          </DialogHeader>

          {aiStep === 'dates' && (
            <div className="space-y-5 py-2">
              <div className="rounded-lg border border-sky-100 bg-sky-50/50 px-4 py-3 text-[13px] leading-relaxed text-slate-600">
                این بخش گزارش‌های روزانه شما را در بازه زمانی انتخاب‌شده جمع‌آوری کرده و به‌صورت خودکار یک خلاصه ماهانه تولید می‌کند. سپس می‌توانید آن را بررسی و ارسال کنید.
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <Label className="mb-2 block text-[14px] font-semibold text-slate-700">تاریخ شروع <span className="text-red-500">*</span></Label>
                  <JalaliDatePicker value={aiStartDate ? new Date(aiStartDate) : null} onChange={(d) => setAiStartDate(d ? toLocalDateString(d) : '')} className="h-[50px]" />
                </div>
                <div>
                  <Label className="mb-2 block text-[14px] font-semibold text-slate-700">تاریخ پایان <span className="text-red-500">*</span></Label>
                  <JalaliDatePicker value={aiEndDate ? new Date(aiEndDate) : null} onChange={(d) => setAiEndDate(d ? toLocalDateString(d) : '')} className="h-[50px]" />
                </div>
              </div>
            </div>
          )}

          {aiStep === 'generating' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-[#0D9488]" />
              <p className="mt-4 text-[14px] text-slate-600">در حال جمع‌آوری و تحلیل گزارش‌های روزانه...</p>
            </div>
          )}

          {(aiStep === 'review' || aiStep === 'sending') && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-[13px] font-medium text-emerald-700">
                <Sparkles className="h-4 w-4" />
                {aiReportCount.toLocaleString('fa-IR')} گزارش روزانه تحلیل شد
              </div>
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-slate-700">خلاصه گزارش ماهانه</Label>
                <Textarea
                  value={aiSummary}
                  onChange={(e) => setAiSummary(e.target.value)}
                  className="h-[300px] resize-y text-[13px] leading-[1.9]"
                  placeholder="خلاصه تولید‌شده اینجا نمایش داده می‌شود..."
                />
                <p className="mt-1 text-left text-[12px] text-slate-400">می‌توانید متن را ویرایش کنید قبل از ارسال</p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {aiStep === 'dates' && (
              <>
                <Button type="button" variant="outline" onClick={resetAiDialog} className="rounded-[10px]">انصراف</Button>
                <Button type="button" onClick={handleGenerate} disabled={!aiStartDate || !aiEndDate} className="rounded-[10px] bg-[#0D9488] text-white hover:bg-[#0f766e]">
                  <Sparkles className="h-4 w-4" /> تولید گزارش
                </Button>
              </>
            )}
            {(aiStep === 'review' || aiStep === 'sending') && (
              <>
                <Button type="button" variant="outline" onClick={() => setAiStep('dates')} className="rounded-[10px]" disabled={aiStep === 'sending'}>بازگشت</Button>
                <Button type="button" onClick={handleSend} disabled={aiStep === 'sending' || !aiSummary.trim()} className="rounded-[10px] bg-[#10265F] text-white hover:bg-[#1a3a7a]">
                  {aiStep === 'sending' ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ارسال...</>) : (<><Send className="h-4 w-4" /> ارسال گزارش ماهانه</>)}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
