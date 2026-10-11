'use client';

import { useEffect, useState } from 'react';
import { fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ArrowRight, Calendar, User, Printer, FileText, Folder, Activity,
  Loader2,
} from 'lucide-react';
import { formatJalali, formatJalaliDateTime } from '@/lib/format';
import { toast } from 'sonner';
import Link from 'next/link';
import { isSuperAdminRole } from '@/lib/nav-config';
import { LinkifyText } from '@/components/ui/linkify-text';

type WorkReportImage = { id: string; imageUrl: string };
type ReportWithImages = {
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

const STATUS_HEX: Record<string, string> = {
  draft: '#94A3B8',
  submitted: '#2563EB',
  reviewing: '#f59e0b',
  approved: '#22C55E',
  needs_revision: '#EF4444',
};

export default function MonthlyReportViewPage({ params }: { params: { id: string } }) {
  const { profile } = useAuth();
  const [report, setReport] = useState<ReportWithImages | null>(null);
  const [reportUser, setReportUser] = useState<ProfileInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = isSuperAdminRole(profile?.role);

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);
    fetchData<ReportWithImages>('monthly_work_reports', {
      where: { id: params.id },
      include: { images: true },
    })
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
          <h3>گزارش ماهانه موردنظر یافت نشد</h3>
          <Link href="/dashboard/work-reports/monthly" className="nb-empty-new-btn">
            <ArrowRight className="h-4 w-4" /> بازگشت به گزارش‌ها
          </Link>
        </div>
      </div>
    );
  }

  const submitterName = isSuperAdmin && reportUser
    ? `${reportUser.firstName || ''} ${reportUser.lastName || ''}`.trim()
    : report.fullName;
  const submitterInitials = isSuperAdmin && reportUser
    ? ((reportUser.firstName?.[0] || '') + (reportUser.lastName?.[0] || '')).toUpperCase()
    : report.fullName?.[0]?.toUpperCase() || '؟';

  const declarationText = `اینجانب ${report.fullName} به کد ملی ${report.nationalId} وضعیت پروژه تحویل گرفته را طبق گزارش کار صورت وضعیت ارائه شده اعلام می‌نمایم.`;
  const statusColor = STATUS_HEX[report.status] || '#94A3B8';

  return (
    <div className="nb-page" dir="rtl">
      {/* Hero header */}
      <header className="nb-hero">
        <div className="nb-hero-left">
          <div>
            <div className="nb-hero-title-row">
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#FF7A00,#E65100)', boxShadow: '0 0 12px rgba(255,122,0,.25)' }} />
              <h1>مشاهده گزارش ماهانه</h1>
            </div>
            <p>جزئیات گزارش کار ماهانه</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/work-reports/monthly" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به گزارش‌ها
          </Link>
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
        <div className="mb-6 border-b-2 border-slate-100 pb-5 text-center dark:border-slate-700">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: `${statusColor}15`, color: statusColor }}>
              <FileText className="h-5 w-5" />
            </span>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">گزارش کار ماهانه</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">صورت وضعیت پروژه</p>
          <div className="mt-3 flex justify-center">
            <span className="nb-card-tag" style={{ background: `${statusColor}15`, color: statusColor, height: 28, padding: '0 14px', fontSize: 12 }}>
              {STATUS_LABELS[report.status] || report.status}
            </span>
          </div>
        </div>

        {/* Declaration */}
        <div className="mb-6">
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-5 py-4 text-sm text-slate-800 leading-7 text-justify dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-200">
            {declarationText}
          </div>
        </div>

        {/* Meta grid */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-[12px] border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="mb-1.5 text-xs text-slate-400">نام و نام خانوادگی</div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{report.fullName}</div>
          </div>
          <div className="rounded-[12px] border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="mb-1.5 text-xs text-slate-400">کد ملی</div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100" dir="ltr">{report.nationalId}</div>
          </div>
          <div className="rounded-[12px] border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-400">
              <Calendar className="h-3.5 w-3.5" /> تاریخ شروع
            </div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{formatJalali(report.startDate)}</div>
          </div>
          <div className="rounded-[12px] border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-400">
              <Calendar className="h-3.5 w-3.5" /> تاریخ پایان
            </div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{formatJalali(report.endDate)}</div>
          </div>
          {report.project && (
            <div className="rounded-[12px] border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                <Folder className="h-3.5 w-3.5" /> پروژه / فعالیت مرتبط
              </div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{report.project}</div>
            </div>
          )}
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
        </div>

        {/* Summary */}
        {report.summary && (
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">خلاصه عملکرد ماهانه</h3>
            <div className="whitespace-pre-wrap rounded-[12px] border border-slate-200 bg-slate-50/50 p-4 text-sm leading-7 text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
              <LinkifyText text={report.summary} />
            </div>
          </div>
        )}

        {/* Details */}
        {report.details && (
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">جزئیات فعالیت‌ها و دستاوردها</h3>
            <div className="whitespace-pre-wrap rounded-[12px] border border-slate-200 bg-slate-50/50 p-4 text-sm leading-7 text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
              <LinkifyText text={report.details} />
            </div>
          </div>
        )}

        {/* Description / صورت وضعیت */}
        {report.description && (
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">شرح کارهای انجام‌شده</h3>
            <div className="whitespace-pre-wrap rounded-[12px] border border-slate-200 bg-slate-50/50 p-4 text-sm leading-7 text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
              <LinkifyText text={report.description} />
            </div>
          </div>
        )}

        {/* Images */}
        {report.images && report.images.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">تصاویر صورت وضعیت</h3>
            <div className="grid grid-cols-2 gap-4">
              {report.images.map((img) => (
                <div key={img.id} className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                  <img
                    src={img.imageUrl}
                    alt="صورت وضعیت"
                    className="w-full h-48 object-cover"
                  />
                </div>
              ))}
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
