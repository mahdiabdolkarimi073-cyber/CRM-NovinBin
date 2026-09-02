'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Plus, FileText, Calendar, Search, ShieldCheck, Eye, ChevronRight, ChevronLeft, Sparkles, Send, Loader2 } from 'lucide-react';
import { formatJalali, formatJalaliDateTime, toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';
import { isSuperAdminRole } from '@/lib/nav-config';
import Link from 'next/link';

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

const PAGE_SIZE = 10;

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

export default function MonthlyWorkReportsPage() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<MonthlyWorkReport[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, ProfileInfo>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // AI generate + send state
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
          fetchData<MonthlyWorkReport>('monthly_work_reports', {
            orderBy: { createdAt: 'desc' },
            include: { images: true },
          }),
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

  const filtered = useMemo(() => {
    if (!search) return reports;
    const s = search.toLowerCase();
    return reports.filter((r) => {
      const name = isSuperAdmin ? getProfileName(r.profileId) : '';
      return r.fullName.toLowerCase().includes(s) || name.toLowerCase().includes(s);
    });
  }, [search, reports, isSuperAdmin, profileMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const startIdx = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(currentPage * PAGE_SIZE, filtered.length);

  function getProfileName(pid: string) {
    const p = profileMap[pid];
    return p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : 'نامشخص';
  }
  function getInitials(pid: string) {
    const p = profileMap[pid];
    if (!p) return '؟';
    return ((p.firstName?.[0] || '') + (p.lastName?.[0] || '')).toUpperCase();
  }

  const pageNumbers: number[] = [];
  const maxVisible = 3;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);

  // ─── AI Generate handler ───
  const handleGenerate = async () => {
    if (!aiStartDate || !aiEndDate) {
      toast.error('تاریخ شروع و پایان را انتخاب کنید');
      return;
    }
    setAiStep('generating');
    try {
      const res = await fetch('/api/work-reports/generate-monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: aiStartDate, endDate: aiEndDate }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'خطا در تولید گزارش');
        setAiStep('dates');
        return;
      }
      setAiSummary(json.summary);
      setAiReportCount(json.reportCount);
      setAiStep('review');
    } catch {
      toast.error('خطا در ارتباط با سرور');
      setAiStep('dates');
    }
  };

  // ─── Send monthly report handler ───
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
      setAiOpen(false);
      setAiStep('dates');
      setAiSummary('');
      setAiStartDate('');
      setAiEndDate('');
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

  return (
    <div className="w-full" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-[25px] w-[5px] rounded-[4px] bg-[#FF8A00]" />
            <h1 className="text-[28px] font-bold leading-tight text-[#101C35]">
              {isSuperAdmin ? 'گزارشات کار ماهانه (نمای کل)' : 'گزارش کار ماهانه'}
            </h1>
          </div>
          <p className="mt-[7px] text-[13px] text-[#71809A]">
            {isSuperAdmin ? 'مشاهده تمام گزارش‌های ماهانه ارسال‌شده توسط کاربران' : 'ثبت گزارش ماهانه پروژه با صورت وضعیت'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin ? (
            <div className="flex items-center gap-2 rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              حالت مشاهده (سوپرادمین)
            </div>
          ) : (
            <>
              <Button
                onClick={() => setAiOpen(true)}
                className="h-[44px] rounded-[10px] bg-[#0D9488] text-[13px] font-bold text-white shadow-sm transition-all hover:-translate-y-px hover:bg-[#0f766e]"
              >
                <Sparkles className="h-4 w-4" />
                گزارش هوشمند
              </Button>
              <Link href="/dashboard/work-reports/monthly/new">
                <Button
                  className="h-[44px] w-[100px] rounded-[10px] bg-[#10265F] text-[13px] font-bold text-white shadow-sm transition-all hover:-translate-y-px hover:bg-[#1a3a7a]"
                >
                  <Plus className="h-4 w-4" />
                  گزارش جدید
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Date bar */}
      <div className="mt-[35px] flex h-[40px] w-full items-center gap-2 rounded-[10px] border border-[#D7EBFA] bg-[#EFF9FF] px-4 text-[13px] text-[#0875C9]">
        <Calendar className="h-4 w-4" />
        <span>امروز: {formatJalali(new Date())}</span>
      </div>

      {/* Search */}
      <div className="relative mt-[14px] w-full max-w-[330px]">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
        <Input
          placeholder={isSuperAdmin ? 'جستجوی نام کاربر یا گزارش...' : 'جستجوی نام...'}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="h-[38px] rounded-[10px] border-[#D2DCEB] bg-white pr-10 text-[13px] focus:border-[#8EB6E5] focus:shadow-[0_0_0_3px_rgba(142,182,229,0.15)]"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="mt-[15px] flex h-64 items-center justify-center rounded-[14px] border border-[#D9E2EF] bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#0875C9] border-t-transparent" />
        </div>
      ) : paged.length === 0 ? (
        <div className="mt-[15px] rounded-[14px] border border-[#D9E2EF] bg-white p-8">
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title={isSuperAdmin ? 'هنوز گزارشی ارسال نشده' : 'گزارش ماهانه‌ای ثبت نشده'}
            description={isSuperAdmin ? 'گزارش‌های ماهانه ارسال‌شده توسط کاربران اینجا نمایش داده می‌شود' : 'اولین گزارش ماهانه خود را ثبت کنید'}
            action={!isSuperAdmin ? (
              <div className="flex gap-2">
                <Button onClick={() => setAiOpen(true)} className="rounded-[10px] bg-[#0D9488] hover:bg-[#0f766e]">
                  <Sparkles className="h-4 w-4" /> گزارش هوشمند
                </Button>
                <Link href="/dashboard/work-reports/monthly/new">
                  <Button className="rounded-[10px] bg-[#10265F] hover:bg-[#1a3a7a]">
                    <Plus className="h-4 w-4" /> افزودن گزارش
                  </Button>
                </Link>
              </div>
            ) : undefined}
          />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-[15px] hidden overflow-hidden rounded-[14px] border border-[#D9E2EF] bg-white shadow-[0_4px_15px_rgba(20,40,80,0.06)] md:block">
            <Table>
              <TableHeader>
                <TableRow className="h-[48px] border-b border-[#EEF2F6] bg-[#F8FAFC] hover:bg-[#F8FAFC]">
                  {isSuperAdmin && <TableHead className="text-[12px] font-semibold text-[#5F708A]">کاربر</TableHead>}
                  <TableHead className="text-[12px] font-semibold text-[#5F708A]">نام</TableHead>
                  <TableHead className="text-[12px] font-semibold text-[#5F708A]">بازه زمانی</TableHead>
                  <TableHead className="text-[12px] font-semibold text-[#5F708A]">وضعیت</TableHead>
                  <TableHead className="text-[12px] font-semibold text-[#5F708A]">تصاویر</TableHead>
                  <TableHead className="text-[12px] font-semibold text-[#5F708A]">تاریخ ثبت</TableHead>
                  <TableHead className="text-[12px] font-semibold text-[#5F708A] text-left">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((report) => (
                  <TableRow
                    key={report.id}
                    className="h-[70px] border-b border-[#EEF2F6] transition-all hover:bg-[#FAFCFF]"
                  >
                    {isSuperAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-sky-100 text-[10px] font-bold text-sky-700">
                              {getInitials(report.profileId)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-[#17233D]">{getProfileName(report.profileId)}</span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-[14px] font-bold text-[#17233D]">{report.fullName}</TableCell>
                    <TableCell>
                      <span className="text-[13px] text-[#71809A]">
                        {formatJalali(report.startDate)} تا {formatJalali(report.endDate)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`rounded-[20px] border px-3 py-1 text-xs ${STATUS_COLORS[report.status] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                        {STATUS_LABELS[report.status] || report.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {report.images?.length || 0} تصویر
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[13px] text-[#71809A]">{formatJalaliDateTime(report.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/work-reports/view/${report.id}`}>
                          <button
                            className="flex h-[40px] w-[40px] items-center justify-center rounded-[9px] bg-[#F4F8FD] text-[#1764C0] transition-all hover:bg-[#E0EDFB] hover:shadow-sm"
                            title="مشاهده"
                          >
                            <Eye className="h-[18px] w-[18px]" />
                          </button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile card list */}
          <div className="mt-[15px] space-y-[10px] md:hidden">
            {paged.map((report) => (
              <div key={report.id} className="rounded-[12px] border border-[#D9E2EF] bg-white p-4 shadow-[0_4px_15px_rgba(20,40,80,0.06)]">
                {isSuperAdmin && (
                  <div className="mb-2 flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-sky-100 text-[10px] font-bold text-sky-700">
                        {getInitials(report.profileId)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-[#17233D]">{getProfileName(report.profileId)}</span>
                  </div>
                )}
                <div className="text-[14px] font-bold text-[#17233D]">{report.fullName}</div>
                <div className="mt-1 text-[13px] text-[#71809A]">
                  {formatJalali(report.startDate)} تا {formatJalali(report.endDate)}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`rounded-[20px] border px-3 py-1 text-xs ${STATUS_COLORS[report.status] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                    {STATUS_LABELS[report.status] || report.status}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {report.images?.length || 0} تصویر
                  </Badge>
                  <span className="text-[13px] text-[#71809A]">{formatJalaliDateTime(report.createdAt)}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Link href={`/dashboard/work-reports/view/${report.id}`}>
                    <Button variant="outline" size="sm" className="rounded-[9px]">
                      <Eye className="h-4 w-4" /> مشاهده
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-4 flex flex-col items-center justify-between gap-4 rounded-[14px] border border-[#D9E2EF] bg-white px-5 py-4 sm:flex-row">
            <div className="text-[13px] text-[#71809A]">
              نمایش {startIdx.toLocaleString('fa-IR')} تا {endIdx.toLocaleString('fa-IR')} از {filtered.length.toLocaleString('fa-IR')} گزارش
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[13px] text-[#71809A]">
                <span>تعداد در صفحه</span>
                <Select value={String(PAGE_SIZE)} onValueChange={() => {}}>
                  <SelectTrigger className="h-[38px] w-[60px] rounded-[10px] border-[#D2DCEB] text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">۱۰</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="flex h-[42px] w-[42px] items-center justify-center rounded-[10px] bg-[#F7F9FC] text-[#263752] transition-all hover:bg-[#EEF2F6] disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                {pageNumbers.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`flex h-[42px] w-[42px] items-center justify-center rounded-[10px] text-[14px] font-medium transition-all ${
                      p === currentPage
                        ? 'bg-[#10265F] text-white'
                        : 'bg-[#F7F9FC] text-[#263752] hover:bg-[#EEF2F6]'
                    }`}
                  >
                    {p.toLocaleString('fa-IR')}
                  </button>
                ))}
                <button
                  onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="flex h-[42px] w-[42px] items-center justify-center rounded-[10px] bg-[#F7F9FC] text-[#263752] transition-all hover:bg-[#EEF2F6] disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* AI Generate + Send Dialog */}
      <Dialog open={aiOpen} onOpenChange={(open) => { if (!open) resetAiDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[18px] font-bold text-[#0F172A]">
              <Sparkles className="h-5 w-5 text-[#0D9488]" />
              تولید و ارسال گزارش ماهانه هوشمند
            </DialogTitle>
          </DialogHeader>

          {/* Step 1: Date selection */}
          {aiStep === 'dates' && (
            <div className="space-y-5 py-2">
              <div className="rounded-lg border border-sky-100 bg-sky-50/50 px-4 py-3 text-[13px] leading-relaxed text-slate-600">
                این بخش گزارش‌های روزانه شما را در بازه زمانی انتخاب‌شده جمع‌آوری کرده و به‌صورت خودکار یک خلاصه ماهانه تولید می‌کند. سپس می‌توانید آن را بررسی و ارسال کنید.
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">
                    تاریخ شروع <span className="text-[#DC2626]">*</span>
                  </Label>
                  <JalaliDatePicker
                    value={aiStartDate ? new Date(aiStartDate) : null}
                    onChange={(d) => setAiStartDate(d ? toLocalDateString(d) : '')}
                    className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px]"
                  />
                </div>
                <div>
                  <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">
                    تاریخ پایان <span className="text-[#DC2626]">*</span>
                  </Label>
                  <JalaliDatePicker
                    value={aiEndDate ? new Date(aiEndDate) : null}
                    onChange={(d) => setAiEndDate(d ? toLocalDateString(d) : '')}
                    className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Generating */}
          {aiStep === 'generating' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-[#0D9488]" />
              <p className="mt-4 text-[14px] text-slate-600">در حال جمع‌آوری و تحلیل گزارش‌های روزانه...</p>
            </div>
          )}

          {/* Step 3: Review */}
          {(aiStep === 'review' || aiStep === 'sending') && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-[13px] font-medium text-emerald-700">
                <Sparkles className="h-4 w-4" />
                {aiReportCount.toLocaleString('fa-IR')} گزارش روزانه تحلیل شد
              </div>
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">
                  خلاصه گزارش ماهانه
                </Label>
                <Textarea
                  value={aiSummary}
                  onChange={(e) => setAiSummary(e.target.value)}
                  className="h-[300px] resize-y rounded-[10px] border-[#D4DEEA] p-4 text-[13px] leading-[1.9]"
                  placeholder="خلاصه تولید‌شده اینجا نمایش داده می‌شود..."
                />
                <p className="mt-1 text-left text-[12px] text-[#94A3B8]">
                  می‌توانید متن را ویرایش کنید قبل از ارسال
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {aiStep === 'dates' && (
              <>
                <Button variant="outline" onClick={resetAiDialog} className="rounded-[10px]">
                  انصراف
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={!aiStartDate || !aiEndDate}
                  className="rounded-[10px] bg-[#0D9488] text-white hover:bg-[#0f766e]"
                >
                  <Sparkles className="h-4 w-4" />
                  تولید گزارش
                </Button>
              </>
            )}
            {(aiStep === 'review' || aiStep === 'sending') && (
              <>
                <Button variant="outline" onClick={() => setAiStep('dates')} className="rounded-[10px]" disabled={aiStep === 'sending'}>
                  بازگشت
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={aiStep === 'sending' || !aiSummary.trim()}
                  className="rounded-[10px] bg-[#10265F] text-white hover:bg-[#1a3a7a]"
                >
                  {aiStep === 'sending' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      در حال ارسال...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      ارسال گزارش ماهانه
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
