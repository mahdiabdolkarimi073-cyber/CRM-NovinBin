'use client';

import { useEffect, useState } from 'react';
import { fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ArrowRight, Calendar, User, Printer, FileText, Clock, Folder, Activity, Pencil,
  Loader2,
} from 'lucide-react';
import { formatJalali, formatJalaliDateTime, toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';
import Link from 'next/link';
import { isSuperAdminRole } from '@/lib/nav-config';
import { LinkifyText } from '@/components/ui/linkify-text';

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

const STATUS_HEX: Record<string, string> = {
  completed: '#22C55E',
  in_progress: '#2563EB',
  incomplete: '#f59e0b',
  needs_followup: '#EF4444',
};

const DURATION_LABELS: Record<string, string> = {
  under_2h: 'کمتر از ۲ ساعت',
  '2_to_4h': '۲ تا ۴ ساعت',
  '4_to_6h': '۴ تا ۶ ساعت',
  over_6h: 'بیشتر از ۶ ساعت',
};

export default function DailyReportViewPage({ params }: { params: { id: string } }) {
  const { profile } = useAuth();
  const [report, setReport] = useState<DailyWorkReport | null>(null);
  const [reportUser, setReportUser] = useState<ProfileInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = isSuperAdminRole(profile?.role);

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);
    fetchData<DailyWorkReport>('daily_work_reports', { where: { id: params.id } })
      .then(async (data) => {
        const r = data[0] || null;
        setReport(r);
        if (r && isSuperAdmin) {
          try {
            const profiles = await fetchData<ProfileInfo>('profiles', { where: { id: r.profileId } });
            setReportUser(profiles[0] || null);
          } catch {}
        }
        setLoading(false);
      })
      .catch(() => {
        toast.error('خطا در بارگذاری گزارش');
        setLoading(false);
      });
  }, [params.id, isSuperAdmin]);

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری گزارش...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <div className="sb-empty-icon"><FileText className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>گزارش موردنظر یافت نشد</h3>
          <Link href="/dashboard/work-reports/daily" className="nb-empty-new-btn">
            <ArrowRight className="h-4 w-4" /> بازگشت به گزارش‌ها
          </Link>
        </div>
      </div>
    );
  }

  const submitterName = isSuperAdmin && reportUser
    ? `${reportUser.firstName || ''} ${reportUser.lastName || ''}`.trim()
    : `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();
  const submitterInitials = isSuperAdmin && reportUser
    ? ((reportUser.firstName?.[0] || '') + (reportUser.lastName?.[0] || '')).toUpperCase()
    : ((profile?.firstName?.[0] || '') + (profile?.lastName?.[0] || '')).toUpperCase();

  const today = toLocalDateString(new Date());
  const reportDay = toLocalDateString(new Date(report.reportDate));
  const canEdit = !isSuperAdmin && reportDay === today && report.profileId === profile?.id;
  const statusColor = STATUS_HEX[report.status] || '#94A3B8';

  return (
    <div className="nb-page" dir="rtl">
      {/* Hero header */}
      <header className="nb-hero">
        <div className="nb-hero-left">
          <div>
            <div className="nb-hero-title-row">
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#FF7A00,#E65100)', boxShadow: '0 0 12px rgba(255,122,0,.25)' }} />
              <h1>مشاهده گزارش روزانه</h1>
            </div>
            <p>جزئیات گزارش کار روزانه</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/work-reports/daily" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به گزارش‌ها
          </Link>
          {canEdit && (
            <Link href={`/dashboard/work-reports/daily/edit/${report.id}`} className="nb-editor-quick-btn" style={{ borderColor: '#fed7aa', color: '#c2410c', background: '#fff7ed' }}>
              <Pencil className="h-4 w-4" />
              ویرایش
            </Link>
          )}
          <button type="button" onClick={() => window.print()} className="nb-editor-quick-btn" style={{ borderColor: '#dbeafe', color: '#1e40af', background: '#eff6ff' }}>
            <Printer className="h-4 w-4" />
            چاپ
          </button>
        </div>
      </header>

      {/* Submitter info (super-admin only) */}
      {isSuperAdmin && reportUser && (
        <div className="nb-editor-canvas" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-sky-100 text-sm font-bold text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
              {submitterInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">ارسال‌کننده:</span>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{submitterName}</span>
            </div>
            <div className="mt-0.5 text-xs text-slate-400">
              تاریخ ارسال: {formatJalaliDateTime(report.createdAt)}
            </div>
          </div>
        </div>
      )}

      {/* Report card */}
      <div className="nb-editor-canvas" style={{ padding: '32px 36px' }}>
        {/* Title section */}
        <div className="nb-editor-meta-row" style={{ marginBottom: 24, paddingBottom: 20 }}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: `${statusColor}15`, color: statusColor }}>
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <div className="text-xs text-slate-400 mb-1">عنوان گزارش</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{report.title}</div>
            </div>
          </div>
          <span className="nb-card-tag" style={{ background: `${statusColor}15`, color: statusColor, height: 28, padding: '0 14px', fontSize: 12 }}>
            {STATUS_LABELS[report.status] || report.status}
          </span>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
          <div className="rounded-[12px] border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-400">
              <Calendar className="h-3.5 w-3.5" /> تاریخ گزارش
            </div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{formatJalali(report.reportDate)}</div>
          </div>
          <div className="rounded-[12px] border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-400">
              <Activity className="h-3.5 w-3.5" /> وضعیت گزارش
            </div>
            <span className="nb-card-tag" style={{ background: `${statusColor}15`, color: statusColor, height: 26, padding: '0 12px', fontSize: 11 }}>
              {STATUS_LABELS[report.status] || report.status}
            </span>
          </div>
          {report.project && (
            <div className="rounded-[12px] border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                <Folder className="h-3.5 w-3.5" /> پروژه / فعالیت مرتبط
              </div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{report.project}</div>
            </div>
          )}
          {report.duration && (
            <div className="rounded-[12px] border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="h-3.5 w-3.5" /> مدت زمان کارکرد
              </div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{DURATION_LABELS[report.duration] || report.duration}</div>
            </div>
          )}
        </div>

        {/* Summary */}
        {report.description && (
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">خلاصه فعالیت‌های انجام شده</h3>
            <div className="whitespace-pre-wrap rounded-[12px] border border-slate-200 bg-slate-50/50 p-4 text-sm leading-7 text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
              <LinkifyText text={report.description} />
            </div>
          </div>
        )}

        {/* Details */}
        {report.details && (
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">جزئیات فعالیت‌ها</h3>
            <div className="whitespace-pre-wrap rounded-[12px] border border-slate-200 bg-slate-50/50 p-4 text-sm leading-7 text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
              <LinkifyText text={report.details} />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5 text-xs text-slate-400 dark:border-slate-700">
          <span>تاریخ ثبت: {formatJalaliDateTime(report.createdAt)}</span>
          <span>شماره گزارش: <span dir="ltr">{report.id.slice(0, 8)}</span></span>
        </div>
      </div>
    </div>
  );
}
