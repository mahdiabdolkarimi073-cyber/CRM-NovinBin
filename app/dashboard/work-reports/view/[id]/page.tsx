'use client';

import { useEffect, useState } from 'react';
import { fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowRight, Calendar, User, Printer, FileText, Folder, Activity } from 'lucide-react';
import { formatJalali, formatJalaliDateTime } from '@/lib/format';
import { toast } from 'sonner';
import Link from 'next/link';
import { isSuperAdminRole } from '@/lib/nav-config';

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

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-50 text-slate-700 border-slate-200',
  submitted: 'bg-blue-50 text-blue-700 border-blue-200',
  reviewing: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  needs_revision: 'bg-red-50 text-red-700 border-red-200',
};

const MONTH_LABELS: Record<number, string> = {
  1: 'فروردین', 2: 'اردیبهشت', 3: 'خرداد', 4: 'تیر',
  5: 'مرداد', 6: 'شهریور', 7: 'مهر', 8: 'آبان',
  9: 'آذر', 10: 'دی', 11: 'بهمن', 12: 'اسفند',
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
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#0875C9] border-t-transparent" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="rounded-[14px] border border-[#D9E2EF] bg-white p-16 text-center">
        <FileText className="mx-auto mb-4 h-12 w-12 text-slate-300" />
        <p className="mb-4 text-slate-500">گزارش ماهانه موردنظر یافت نشد</p>
        <Link href="/dashboard/work-reports/monthly">
          <Button variant="outline" className="rounded-[10px]">
            <ArrowRight className="h-4 w-4" /> بازگشت
          </Button>
        </Link>
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

  return (
    <div className="w-full" dir="rtl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-[25px] w-[5px] rounded-[4px] bg-[#FF8A00]" />
            <h1 className="text-[24px] font-bold text-[#101C35] sm:text-[28px]">مشاهده گزارش ماهانه</h1>
          </div>
          <p className="mt-[7px] text-[13px] text-[#71809A]">جزئیات گزارش کار ماهانه</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/work-reports/monthly">
            <Button variant="outline" className="rounded-[10px] border-[#D6E0EC]">
              <ArrowRight className="h-4 w-4" /> بازگشت
            </Button>
          </Link>
          <Button onClick={() => window.print()} className="rounded-[10px] bg-[#10265F] hover:bg-[#1a3a7a]">
            <Printer className="h-4 w-4" /> چاپ
          </Button>
        </div>
      </div>

      {/* Submitter info (super-admin only) */}
      {isSuperAdmin && reportUser && (
        <div className="mb-5 flex items-center gap-3 rounded-[14px] border border-sky-200 bg-sky-50/50 p-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-sky-100 text-sm font-bold text-sky-700">
              {submitterInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-800">ارسال‌کننده:</span>
              <span className="text-sm font-medium text-slate-700">{submitterName}</span>
            </div>
            <div className="mt-0.5 text-xs text-slate-400">
              تاریخ ارسال: {formatJalaliDateTime(report.createdAt)}
            </div>
          </div>
        </div>
      )}

      {/* Report card */}
      <div className="rounded-[14px] border border-[#DCE4EF] bg-white p-6 shadow-[0_4px_18px_rgba(15,23,42,0.05)] sm:p-8">
        {/* Title section */}
        <div className="mb-6 border-b-2 border-slate-100 pb-5 text-center">
          <h1 className="text-lg font-bold text-slate-900 mb-1">گزارش کار ماهانه</h1>
          <p className="text-sm text-slate-500">صورت وضعیت پروژه</p>
        </div>

        {/* Declaration */}
        <div className="mb-6">
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-5 py-4 text-sm text-slate-800 leading-7 text-justify">
            {declarationText}
          </div>
        </div>

        {/* Meta grid */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-[10px] border border-[#DCE4EF] bg-[#F8FAFC] p-4">
            <div className="mb-1.5 text-xs text-slate-400">نام و نام خانوادگی</div>
            <div className="text-sm font-medium text-[#0F172A]">{report.fullName}</div>
          </div>
          <div className="rounded-[10px] border border-[#DCE4EF] bg-[#F8FAFC] p-4">
            <div className="mb-1.5 text-xs text-slate-400">کد ملی</div>
            <div className="text-sm font-medium text-[#0F172A]" dir="ltr">{report.nationalId}</div>
          </div>
          <div className="rounded-[10px] border border-[#DCE4EF] bg-[#F8FAFC] p-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-400">
              <Calendar className="h-3.5 w-3.5" /> تاریخ شروع
            </div>
            <div className="text-sm font-medium text-[#0F172A]">{formatJalali(report.startDate)}</div>
          </div>
          <div className="rounded-[10px] border border-[#DCE4EF] bg-[#F8FAFC] p-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-400">
              <Calendar className="h-3.5 w-3.5" /> تاریخ پایان
            </div>
            <div className="text-sm font-medium text-[#0F172A]">{formatJalali(report.endDate)}</div>
          </div>
          {report.project && (
            <div className="rounded-[10px] border border-[#DCE4EF] bg-[#F8FAFC] p-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                <Folder className="h-3.5 w-3.5" /> پروژه / فعالیت مرتبط
              </div>
              <div className="text-sm font-medium text-[#0F172A]">{report.project}</div>
            </div>
          )}
          <div className="rounded-[10px] border border-[#DCE4EF] bg-[#F8FAFC] p-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-400">
              <Calendar className="h-3.5 w-3.5" /> تاریخ گزارش
            </div>
            <div className="text-sm font-medium text-[#0F172A]">{formatJalali(report.reportDate)}</div>
          </div>
          <div className="rounded-[10px] border border-[#DCE4EF] bg-[#F8FAFC] p-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-400">
              <Activity className="h-3.5 w-3.5" /> وضعیت گزارش
            </div>
            <Badge variant="outline" className={`rounded-[20px] border px-3 py-1 text-xs ${STATUS_COLORS[report.status] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
              {STATUS_LABELS[report.status] || report.status}
            </Badge>
          </div>
        </div>

        {/* Summary */}
        {report.summary && (
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-semibold text-[#172033]">خلاصه عملکرد ماهانه</h3>
            <div className="whitespace-pre-wrap rounded-[10px] border border-[#DCE4EF] bg-[#F8FAFC] p-4 text-sm leading-7 text-slate-600">
              {report.summary}
            </div>
          </div>
        )}

        {/* Details */}
        {report.details && (
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-semibold text-[#172033]">جزئیات فعالیت‌ها و دستاوردها</h3>
            <div className="whitespace-pre-wrap rounded-[10px] border border-[#DCE4EF] bg-[#F8FAFC] p-4 text-sm leading-7 text-slate-600">
              {report.details}
            </div>
          </div>
        )}

        {/* Description / صورت وضعیت */}
        {report.description && (
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-semibold text-[#172033]">شرح کارهای انجام‌شده</h3>
            <div className="whitespace-pre-wrap rounded-[10px] border border-[#DCE4EF] bg-[#F8FAFC] p-4 text-sm leading-7 text-slate-600">
              {report.description}
            </div>
          </div>
        )}

        {/* Images */}
        {report.images && report.images.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-semibold text-[#172033]">تصاویر صورت وضعیت</h3>
            <div className="grid grid-cols-2 gap-4">
              {report.images.map((img) => (
                <div key={img.id} className="rounded-lg overflow-hidden border border-slate-200">
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
        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5 text-xs text-slate-400">
          <span>تاریخ ثبت: {formatJalaliDateTime(report.createdAt)}</span>
          <span>شماره گزارش: <span dir="ltr">{report.id.slice(0, 8)}</span></span>
        </div>
      </div>
    </div>
  );
}
