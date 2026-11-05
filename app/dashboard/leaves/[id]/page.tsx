'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowRight,
  CalendarDays,
  Clock,
  UserCheck,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Pencil,
  Loader2,
  Forward,
  CheckSquare,
  ShieldCheck,
  History,
  FileText,
  ExternalLink,
  Ban,
  Check,
  X,
  Calendar,
} from 'lucide-react';
import { formatJalali, formatJalaliDateTime } from '@/lib/format';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'در انتظار بررسی', color: '#d97706', bg: 'rgba(245,158,11,0.12)' },
  approved: { label: 'تأیید شده', color: '#16a34a', bg: 'rgba(34,197,94,0.12)' },
  rejected: { label: 'رد شده', color: '#dc2626', bg: 'rgba(239,68,68,0.12)' },
  cancelled: { label: 'لغو شده', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
};

const leaveTypeLabels: Record<string, string> = {
  annual: 'استحقاقی',
  sick: 'استعلاجی',
  unpaid: 'بدون حقوق',
  personal: 'شخصی',
};

export default function LeaveDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();

  const [leave, setLeave] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Reject dialog
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';
  const isAdmin = isSuperAdmin || profile?.role === 'admin';

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/leaves?action=detail&id=${id}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'خطا در بارگذاری جزئیات مرخصی');

      setLeave(json.leave);
    } catch (e: any) {
      toast.error('خطا در بارگذاری: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // Handle Approve
  const handleApprove = async () => {
    if (!isAdmin) {
      toast.error('تنها مدیران مجاز به تأیید مرخصی هستند');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/leaves?action=approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'خطا در تأیید');

      toast.success(json.message || 'درخواست مرخصی تأیید شد و تسک‌ها با موفقیت ارجاع داده شدند.');
      loadDetail();
    } catch (e: any) {
      toast.error('تأیید ناموفق: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reject
  const handleReject = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/leaves?action=reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, rejectReason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'خطا در رد مرخصی');

      toast.success('درخواست مرخصی رد شد');
      setRejectOpen(false);
      loadDetail();
    } catch (e: any) {
      toast.error('رد ناموفق: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Cancel
  const handleCancel = async () => {
    if (!confirm('آیا از لغو این درخواست مرخصی مطمئن هستید؟')) return;
    try {
      const res = await fetch('/api/leaves?action=cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'خطا در لغو');

      toast.success('درخواست مرخصی لغو شد');
      loadDetail();
    } catch (e: any) {
      toast.error('لغو ناموفق: ' + e.message);
    }
  };

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری جزئیات مرخصی...</p>
        </div>
      </div>
    );
  }

  if (!leave) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <AlertCircle className="h-12 w-12 text-rose-500" />
          <h3>درخواست مرخصی یافت نشد</h3>
          <p>ممکن است این درخواست حذف شده یا شما دسترسی مشاهده آن را نداشته باشید.</p>
          <Link href="/dashboard/leaves" className="nb-empty-new-btn">
            بازگشت به فهرست مرخصی‌ها
          </Link>
        </div>
      </div>
    );
  }

  const meta = leave.metadata || {};
  const isHourly = meta.leaveMode === 'hourly';
  const st = statusConfig[leave.status] || statusConfig.pending;

  const rawType = (leave.type || '').replace(/^(daily_|hourly_)/, '');
  const typeText = leaveTypeLabels[rawType] || 'استحقاقی';

  const durationLabel = isHourly
    ? `${(meta.durationHours || 0).toLocaleString('fa-IR')} ساعت (${meta.startTime || ''} الی ${meta.endTime || ''})`
    : `${(meta.durationDays || 1).toLocaleString('fa-IR')} روز`;

  const transferredTasks = meta.transferredTasks || [];

  return (
    <div className="nb-editor-page" dir="rtl">
      {/* Topbar */}
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/leaves" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به مرخصی‌ها
          </Link>
          <span className="nb-editor-breadcrumb">
            داشبورد <b>←</b> مرخصی‌ها <b>←</b> جزئیات درخواست
          </span>
        </div>

        <div className="nb-editor-topbar-right flex items-center gap-2">
          {leave.status === 'pending' && (isSuperAdmin || leave.employeeId === profile?.id) && (
            <Link href={`/dashboard/leaves/${leave.id}/edit`}>
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1 border-slate-300">
                <Pencil className="h-3.5 w-3.5" /> ویرایش
              </Button>
            </Link>
          )}

          {leave.status === 'pending' && isAdmin && (
            <>
              <Button
                size="sm"
                disabled={actionLoading}
                onClick={handleApprove}
                className="h-9 bg-emerald-600 text-white hover:bg-emerald-700 text-xs gap-1.5"
              >
                <Check className="h-4 w-4" />
                {actionLoading ? 'در حال ثبت...' : 'تأیید و ارجاع تسک‌ها'}
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={actionLoading}
                onClick={() => setRejectOpen(true)}
                className="h-9 border-rose-300 text-rose-600 hover:bg-rose-50 text-xs gap-1.5"
              >
                <X className="h-4 w-4" /> رد درخواست
              </Button>
            </>
          )}

          {leave.status === 'pending' && leave.employeeId === profile?.id && !isAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              className="h-9 border-slate-300 text-slate-700 hover:bg-slate-100 text-xs"
            >
              لغو مرخصی
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary Header Card */}
            <div className="nb-editor-canvas space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/20">
                    <CalendarDays className="h-6 w-6" />
                  </span>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      مرخصی {isHourly ? 'ساعتی' : 'روزانه'} ({typeText})
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      درخواست ثبت‌شده در تاریخ {formatJalaliDateTime(leave.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
                    style={{ background: st.bg, color: st.color }}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: st.color }} />
                    {st.label}
                  </span>
                </div>
              </div>

              {/* People Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Requester Box */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
                    <User className="h-4 w-4 text-blue-600" />
                    <span>متقاضی مرخصی:</span>
                  </div>
                  <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {leave.employeeName}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {leave.requester?.email || 'پرسنل سازمان'}
                  </div>
                </div>

                {/* Substitute Box */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/30 dark:bg-emerald-900/10">
                  <div className="mb-2 flex items-center gap-2 text-xs text-emerald-800">
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                    <span>جانشین تعیین‌شده:</span>
                  </div>
                  <div className="text-base font-bold text-emerald-950 dark:text-emerald-300">
                    {leave.substituteName}
                  </div>
                  <div className="text-xs text-emerald-700/80 mt-1">
                    مسئول رسیدگی به وظایف و تسک‌ها در زمان غیبت
                  </div>
                </div>
              </div>

              {/* Timing Grid */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs space-y-2 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">بازه تاریخی:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatJalali(leave.startDate)}
                    {!isHourly && leave.startDate !== leave.endDate && ` تا ${formatJalali(leave.endDate)}`}
                  </span>
                </div>

                {isHourly && (
                  <div className="flex justify-between items-center py-1 border-t border-slate-200/60 dark:border-slate-700">
                    <span className="text-slate-500">ساعت شروع و پایان:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {meta.startTime} الی {meta.endTime}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center py-1 border-t border-slate-200/60 dark:border-slate-700">
                  <span className="text-slate-500">مدت زمان محاسبه‌شده:</span>
                  <span className="font-black text-[#FF7A00] text-sm">
                    {durationLabel}
                  </span>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  دلیل و توضیحات متقاضی:
                </Label>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-700 leading-6 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                  {meta.description || leave.reason || 'بدون توضیحات'}
                </div>
              </div>

              {/* Reject Reason (if rejected) */}
              {leave.status === 'rejected' && meta.rejectReason && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 space-y-1 text-xs">
                  <span className="font-bold text-rose-800 flex items-center gap-1.5">
                    <XCircle className="h-4 w-4 text-rose-600" />
                    دلیل عدم موافقت مدیر:
                  </span>
                  <p className="text-rose-900 text-sm mt-1">{meta.rejectReason}</p>
                </div>
              )}
            </div>

            {/* Transferred Tasks Card */}
            <div className="nb-editor-canvas space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Forward className="h-4 w-4" />
                  </span>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    تسک‌ها و وظایف ارجاع‌شده به جانشین
                  </h3>
                </div>
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800">
                  {transferredTasks.length.toLocaleString('fa-IR')} تسک
                </span>
              </div>

              <p className="text-xs text-slate-500 leading-5">
                این وظایف طبق قانون ارجاع خودکار، پس از تأیید مرخصی مستقیماً در کارتابل و تب «ارجاعات» ماژول وظایف برای جانشین ({leave.substituteName}) قرار گرفته‌اند:
              </p>

              {transferredTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                  {leave.status === 'approved'
                    ? 'در زمان تأیید مرخصی، تسک فعال بدون تکمیلی برای انتقال وجود نداشته است.'
                    : 'پس از تأیید این مرخصی، تسک‌های فعال درخواست‌دهنده به جانشین ارجاع داده خواهند شد.'}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {transferredTasks.map((t: any, idx: number) => (
                    <div
                      key={t.taskId || idx}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="h-4 w-4 text-indigo-600" />
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {t.taskTitle}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                          <span>مسئول قبلی: <strong>{t.previousAssigneeName}</strong></span>
                          <span>مسئول جدید (جانشین): <strong className="text-emerald-700">{t.newAssigneeName}</strong></span>
                          <span>زمان ارجاع: {formatJalaliDateTime(t.transferredAt)}</span>
                        </div>
                      </div>

                      <Link href="/dashboard/tasks">
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                          مشاهده در ارجاعات <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Audit & Workflow Timeline */}
          <aside className="space-y-5">
            {/* Timeline Card */}
            <div className="nb-editor-canvas space-y-4" style={{ padding: 20 }}>
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <History className="h-4 w-4" />
                </span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  گردش کار و تاریخچه درخواست
                </h3>
              </div>

              <div className="relative border-r-2 border-slate-200 pr-4 space-y-4 text-xs dark:border-slate-800 mr-2">
                {/* Step 1: Created */}
                <div className="relative">
                  <span className="absolute -right-[23px] top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-500 shadow-xs" />
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    ثبت اولیه مرخصی
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    توسط {leave.employeeName}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {formatJalaliDateTime(leave.createdAt)}
                  </div>
                </div>

                {/* Step 2: Substitute Assigned */}
                <div className="relative">
                  <span className="absolute -right-[23px] top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-xs" />
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    انتصاب جانشین
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {leave.substituteName} به عنوان جانشین معین شد
                  </div>
                </div>

                {/* Step 3: Approval / Rejection status */}
                {leave.status === 'approved' ? (
                  <div className="relative">
                    <span className="absolute -right-[23px] top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-600 shadow-xs" />
                    <div className="font-bold text-emerald-700">
                      تأیید نهایی و ارجاع وظایف
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      توسط: {leave.approverName || meta.approvedByName || 'مدیر مجاز'}
                    </div>
                    {meta.approvedAt && (
                      <div className="text-[10px] text-slate-400">
                        {formatJalaliDateTime(meta.approvedAt)}
                      </div>
                    )}
                  </div>
                ) : leave.status === 'rejected' ? (
                  <div className="relative">
                    <span className="absolute -right-[23px] top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-rose-500 shadow-xs" />
                    <div className="font-bold text-rose-700">
                      رد درخواست مرخصی
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      توسط: {leave.approverName || meta.approvedByName || 'مدیر'}
                    </div>
                    {meta.approvedAt && (
                      <div className="text-[10px] text-slate-400">
                        {formatJalaliDateTime(meta.approvedAt)}
                      </div>
                    )}
                  </div>
                ) : leave.status === 'cancelled' ? (
                  <div className="relative">
                    <span className="absolute -right-[23px] top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-slate-500 shadow-xs" />
                    <div className="font-bold text-slate-600">
                      لغو شده
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <span className="absolute -right-[23px] top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-amber-400 shadow-xs animate-pulse" />
                    <div className="font-bold text-amber-700">
                      در صف بررسی مدیریت
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      منتظر اقدام مدیر واحد یا سوپرادمین
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Tips */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-blue-800 leading-5 space-y-2">
              <strong className="font-bold flex items-center gap-1 text-blue-900">
                <ShieldCheck className="h-4 w-4" />
                قوانین ارجاعات و امنیت:
              </strong>
              <p>
                تمامی وظایف ارجاع‌شده در طول مرخصی دارای تاریخچه دقیق مبدأ و مقصد بوده و در تب «ارجاعات» کارتابل جانشین و گزارش‌های سوپرادمین به صورت یکپارچه نگهداری می‌شوند.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Reject Modal Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-600">
              <XCircle className="h-5 w-5" />
              رد درخواست مرخصی
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-xs text-slate-500">
              علت عدم موافقت با درخواست مرخصی را وارد کنید تا به متقاضی اطلاع‌رسانی شود:
            </p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="دلیل رد مرخصی (عدم امکان جانشینی، تراکم کاری و...)..."
              className="h-24 text-sm"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectOpen(false)}
              className="text-xs"
            >
              انصراف
            </Button>
            <Button
              disabled={actionLoading}
              onClick={handleReject}
              className="bg-rose-600 text-white hover:bg-rose-700 text-xs"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : null}
              ثبت رد درخواست
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
