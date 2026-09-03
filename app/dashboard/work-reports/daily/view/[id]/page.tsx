'use client';

import { useEffect, useState } from 'react';
import { fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowRight, Calendar, User, Printer, FileText, Clock, Folder, Activity, Pencil } from 'lucide-react';
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

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  incomplete: 'bg-amber-50 text-amber-700 border-amber-200',
  needs_followup: 'bg-purple-50 text-purple-700 border-purple-200',
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
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#0875C9] border-t-transparent" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="rounded-[14px] border border-[#D9E2EF] bg-white p-16 text-center">
        <FileText className="mx-auto mb-4 h-12 w-12 text-slate-300" />
        <p className="mb-4 text-slate-500">گزارش موردنظر یافت نشد</p>
        <Link href="/dashboard/work-reports/daily">
          <Button variant="outline" className="rounded-[10px]">
            <ArrowRight className="h-4 w-4" /> بازگشت
          </Button>
        </Link>
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

  return (
    <div className="w-full" dir="rtl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-[25px] w-[5px] rounded-[4px] bg-[#FF8A00]" />
            <h1 className="text-[24px] font-bold text-[#101C35] sm:text-[28px]">مشاهده گزارش روزانه</h1>
          </div>
          <p className="mt-[7px] text-[13px] text-[#71809A]">جزئیات گزارش کار روزانه</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/work-reports/daily">
            <Button variant="outline" className="rounded-[10px] border-[#D6E0EC]">
              <ArrowRight className="h-4 w-4" /> بازگشت
            </Button>
          </Link>
          {canEdit && (
            <Link href={`/dashboard/work-reports/daily/edit/${report.id}`}>
              <Button className="rounded-[10px] bg-[#F97316] hover:bg-[#EA680C]">
                <Pencil className="h-4 w-4" /> ویرایش
              </Button>
            </Link>
          )}
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
        <div className="mb-6 border-b-2 border-slate-100 pb-5">
          <div className="mb-1 text-xs text-slate-400">عنوان گزارش</div>
          <div className="text-lg font-bold text-[#0F172A]">{report.title}</div>
        </div>

        {/* Meta grid */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          {report.project && (
            <div className="rounded-[10px] border border-[#DCE4EF] bg-[#F8FAFC] p-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                <Folder className="h-3.5 w-3.5" /> پروژه / فعالیت مرتبط
              </div>
              <div className="text-sm font-medium text-[#0F172A]">{report.project}</div>
            </div>
          )}
          {report.duration && (
            <div className="rounded-[10px] border border-[#DCE4EF] bg-[#F8FAFC] p-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="h-3.5 w-3.5" /> مدت زمان کارکرد
              </div>
              <div className="text-sm font-medium text-[#0F172A]">{DURATION_LABELS[report.duration] || report.duration}</div>
            </div>
          )}
        </div>

        {/* Summary */}
        {report.description && (
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-semibold text-[#172033]">خلاصه فعالیت‌های انجام شده</h3>
            <div className="whitespace-pre-wrap rounded-[10px] border border-[#DCE4EF] bg-[#F8FAFC] p-4 text-sm leading-7 text-slate-600">
              <LinkifyText text={report.description} />
            </div>
          </div>
        )}

        {/* Details */}
        {report.details && (
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-semibold text-[#172033]">جزئیات فعالیت‌ها</h3>
            <div className="whitespace-pre-wrap rounded-[10px] border border-[#DCE4EF] bg-[#F8FAFC] p-4 text-sm leading-7 text-slate-600">
              <LinkifyText text={report.details} />
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
