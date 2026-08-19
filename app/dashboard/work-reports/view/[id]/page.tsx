'use client';

import { useEffect, useState } from 'react';
import { fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Printer, ArrowRight, FileText, Calendar, User } from 'lucide-react';
import { formatJalali, formatJalaliDateTime } from '@/lib/format';
import { toast } from 'sonner';
import Link from 'next/link';
import { isSuperAdminRole } from '@/lib/nav-config';

type ReportWithImages = {
  id: string;
  profileId: string;
  fullName: string;
  nationalId: string;
  startDate: string;
  endDate: string;
  description: string | null;
  status: string;
  createdAt: string;
  images?: { id: string; imageUrl: string }[];
};

type ProfileInfo = {
  id: string;
  firstName: string | null;
  lastName: string | null;
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
      .catch((error) => {
        toast.error('خطا در بارگذاری گزارش');
        console.error(error);
        setLoading(false);
      });
  }, [params.id, isSuperAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!report) {
    return (
      <div>
        <PageHeader title="گزارش یافت نشد" />
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">گزارش ماهانه موردنظر یافت نشد</p>
            <Link href="/dashboard/work-reports/monthly">
              <Button variant="outline"><ArrowRight className="w-4 h-4" /> بازگشت</Button>
            </Link>
          </CardContent>
        </Card>
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
    <div>
      <div className="print:hidden">
        <PageHeader
          title="مشاهده گزارش ماهانه"
          description={`گزارش ${report.fullName}`}
          action={
            <div className="flex gap-2">
              <Link href="/dashboard/work-reports/monthly">
                <Button variant="outline" size="sm"><ArrowRight className="w-4 h-4" /> بازگشت</Button>
              </Link>
              <Button size="sm" onClick={() => window.print()}>
                <Printer className="w-4 h-4" /> چاپ
              </Button>
            </div>
          }
        />

        {isSuperAdmin && reportUser && (
          <Card className="mb-4 border-sky-200 bg-sky-50/50">
            <CardContent className="flex items-center gap-3 p-4">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-sky-100 text-sky-700 text-sm font-bold">
                  {submitterInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-bold text-slate-800">ارسال‌کننده:</span>
                  <span className="text-sm font-medium text-slate-700">{submitterName}</span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  شناسه کاربر: <span dir="ltr">{reportUser.id.slice(0, 8)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="print:shadow-none print:border-0 max-w-3xl mx-auto">
        <CardContent className="p-8 print:p-12">
          <div className="text-center mb-8 pb-6 border-b-2 border-slate-200">
            <h1 className="text-xl font-bold text-slate-900 mb-2">گزارش کار ماهانه</h1>
            <p className="text-sm text-slate-500">صورت وضعیت پروژه</p>
          </div>

          <div className="mb-8">
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-6 py-5 text-base text-slate-800 leading-8 text-justify">
              {declarationText}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="space-y-1">
              <span className="text-xs text-slate-400">نام و نام خانوادگی</span>
              <div className="text-sm font-medium text-slate-800 border-b border-slate-200 pb-2">{report.fullName}</div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-slate-400">کد ملی</span>
              <div className="text-sm font-medium text-slate-800 border-b border-slate-200 pb-2" dir="ltr">{report.nationalId}</div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-slate-400">تاریخ شروع</span>
              <div className="text-sm font-medium text-slate-800 border-b border-slate-200 pb-2">
                <Calendar className="inline w-3 h-3 ml-1 text-slate-400" />
                {formatJalali(report.startDate)}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-slate-400">تاریخ پایان</span>
              <div className="text-sm font-medium text-slate-800 border-b border-slate-200 pb-2">
                <Calendar className="inline w-3 h-3 ml-1 text-slate-400" />
                {formatJalali(report.endDate)}
              </div>
            </div>
          </div>

          {report.description && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">شرح کارهای انجام‌شده</h3>
              <div className="text-sm text-slate-600 leading-7 whitespace-pre-wrap border border-slate-200 rounded-lg p-4 bg-white">
                {report.description}
              </div>
            </div>
          )}

          {report.images && report.images.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">تصاویر صورت وضعیت</h3>
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

          <div className="mt-12 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between text-sm">
              <div className="text-slate-400">
                تاریخ ثبت: {formatJalaliDateTime(report.createdAt)}
              </div>
              <div className="text-slate-400">
                شماره گزارش: <span dir="ltr">{report.id.slice(0, 8)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
