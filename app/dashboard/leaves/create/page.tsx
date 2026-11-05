'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight,
  CalendarDays,
  Clock,
  UserCheck,
  FileText,
  ClipboardList,
  Loader2,
  Check,
  Lightbulb,
  Info,
  Calendar,
  AlertTriangle,
  Forward,
  CheckSquare,
  ShieldAlert,
} from 'lucide-react';
import { fullName } from '@/lib/constants';
import { formatJalali, toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';
import type { Profile } from '@/lib/types';

const guideItems = [
  {
    icon: CalendarDays,
    title: 'تعیین دقیق نوع و بازه مرخصی',
    desc: 'بین مرخصی ساعتی یا روزانه انتخاب کنید. مدت زمان به صورت آنی محاسبه می‌شود.',
  },
  {
    icon: UserCheck,
    title: 'انتخاب اجباری جانشین',
    desc: 'انتخاب یک همکار به عنوان جانشین الزامی است تا در غیاب شما وظایف پیگیری شوند.',
  },
  {
    icon: Forward,
    title: 'ارجاع خودکار تسک‌ها',
    desc: 'پس از تأیید نهایی مرخصی، تمامی وظایف فعال شما به جانشین منتقل خواهند شد.',
  },
  {
    icon: FileText,
    title: 'ذکر دلیل شفاف',
    desc: 'دلیل مرخصی به مدیران در تصمیم‌گیری و تأیید سریع‌تر کمک می‌کند.',
  },
];

const leaveSubTypes = [
  { value: 'annual', label: 'استحقاقی' },
  { value: 'sick', label: 'استعلاجی' },
  { value: 'unpaid', label: 'بدون حقوق' },
  { value: 'personal', label: 'شخصی / اضطراری' },
];

export default function CreateLeavePage() {
  const { profile } = useAuth();
  const router = useRouter();

  const [staff, setStaff] = useState<Profile[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Active tasks for the user that will be transferred
  const [activeTasks, setActiveTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Form states
  const [leaveMode, setLeaveMode] = useState<'daily' | 'hourly'>('daily');
  const [type, setType] = useState('annual');
  const [substituteId, setSubstituteId] = useState('none');
  const [reason, setReason] = useState('');
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>('');

  // Daily Mode states
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(new Date());

  // Hourly Mode states
  const [hourlyDate, setHourlyDate] = useState<Date | null>(new Date());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  // Load available staff
  const loadStaff = useCallback(async () => {
    setLoadingStaff(true);
    try {
      const res = await fetch('/api/data?model=profiles&where={"userType":"staff","active":true}', {
        credentials: 'include',
      });
      const json = await res.json();
      if (json.data) setStaff(json.data);
    } catch {
      // ignore
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  // Load active tasks for the selected requester
  const effectiveUserId = (isSuperAdmin && targetEmployeeId) ? targetEmployeeId : profile?.id;

  const loadTransferableTasks = useCallback(async (userId: string) => {
    if (!userId) return;
    setLoadingTasks(true);
    try {
      const res = await fetch(`/api/leaves?action=transferable_tasks&userId=${userId}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (json.tasks) {
        setActiveTasks(json.tasks);
      }
    } catch {
      setActiveTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    if (effectiveUserId) {
      loadTransferableTasks(effectiveUserId);
    }
  }, [effectiveUserId, loadTransferableTasks]);

  // Compute duration automatically
  const durationCalculation = useMemo(() => {
    if (leaveMode === 'hourly') {
      if (!startTime || !endTime) return { hours: 0, label: '۰ ساعت' };
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const startMinutes = sh * 60 + sm;
      const endMinutes = eh * 60 + em;
      const diffMinutes = endMinutes - startMinutes;

      if (diffMinutes <= 0) {
        return { hours: 0, label: 'ساعت پایان باید بعد از ساعت شروع باشد', isError: true };
      }

      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      const decimalHours = +(diffMinutes / 60).toFixed(1);

      return {
        hours: decimalHours,
        label: `${hours ? `${hours} ساعت` : ''} ${minutes ? `و ${minutes} دقیقه` : ''} (${decimalHours} ساعت)`,
        isError: false,
      };
    } else {
      if (!startDate || !endDate) return { days: 1, label: '۱ روز' };
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      const e = new Date(endDate);
      e.setHours(0, 0, 0, 0);
      const diffTime = e.getTime() - s.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      if (diffDays <= 0) {
        return { days: 0, label: 'تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد', isError: true };
      }

      return {
        days: diffDays,
        label: `${diffDays.toLocaleString('fa-IR')} روز کامل`,
        isError: false,
      };
    }
  }, [leaveMode, startTime, endTime, startDate, endDate]);

  // Quick preset: Set Daily mode to Today
  const setTodayDaily = () => {
    const today = new Date();
    setStartDate(today);
    setEndDate(today);
  };

  // Validation
  const validate = () => {
    const err: Record<string, string> = {};

    if (!substituteId || substituteId === 'none') {
      err.substituteId = 'انتخاب جانشین الزامی است';
    } else if (substituteId === effectiveUserId) {
      err.substituteId = 'امکان انتخاب خودتان به عنوان جانشین وجود ندارد';
    }

    if (leaveMode === 'hourly') {
      if (!hourlyDate) err.hourlyDate = 'انتخاب تاریخ مرخصی ساعتی الزامی است';
      if (!startTime) err.startTime = 'ساعت شروع الزامی است';
      if (!endTime) err.endTime = 'ساعت پایان الزامی است';
      if (durationCalculation.isError) {
        err.timeRange = durationCalculation.label;
      }
    } else {
      if (!startDate) err.startDate = 'تاریخ شروع مرخصی روزانه الزامی است';
      if (!endDate) err.endDate = 'تاریخ پایان مرخصی روزانه الزامی است';
      if (durationCalculation.isError) {
        err.dateRange = durationCalculation.label;
      }
    }

    if (!reason.trim()) {
      err.reason = 'ذکر دلیل مرخصی الزامی است';
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!validate()) {
      toast.error('لطفاً خطاهای فرم را برطرف نمایید');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        leaveMode,
        type,
        startDate:
          leaveMode === 'hourly'
            ? toLocalDateString(hourlyDate!)
            : toLocalDateString(startDate!),
        endDate:
          leaveMode === 'hourly'
            ? toLocalDateString(hourlyDate!)
            : toLocalDateString(endDate!),
        startTime: leaveMode === 'hourly' ? startTime : undefined,
        endTime: leaveMode === 'hourly' ? endTime : undefined,
        durationHours: leaveMode === 'hourly' ? durationCalculation.hours : undefined,
        durationDays: leaveMode === 'daily' ? durationCalculation.days : undefined,
        substituteId,
        reason: reason.trim(),
        employeeId: isSuperAdmin && targetEmployeeId ? targetEmployeeId : profile.id,
      };

      const res = await fetch('/api/leaves?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'خطا در ثبت درخواست');

      toast.success('درخواست مرخصی با موفقیت ثبت شد و به مدیران و جانشین اطلاع‌رسانی گردید.');
      router.push('/dashboard/leaves');
    } catch (error: any) {
      toast.error('ثبت مرخصی ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter substitutes list (exclude applicant)
  const availableSubstitutes = useMemo(() => {
    return staff.filter((s) => s.id !== effectiveUserId);
  }, [staff, effectiveUserId]);

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
            داشبورد <b>←</b> مرخصی‌ها <b>←</b> ثبت درخواست مرخصی
          </span>
        </div>
        <div className="nb-editor-topbar-right">
          <button
            type="button"
            className="nb-editor-discard"
            onClick={() => router.push('/dashboard/leaves')}
            disabled={submitting}
          >
            انصراف
          </button>
          <button
            type="submit"
            form="leave-create-form"
            className="nb-editor-save-btn"
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin ml-1" />
            ) : (
              <Check className="h-4 w-4 ml-1" />
            )}
            {submitting ? 'در حال ثبت...' : 'ثبت درخواست مرخصی'}
          </button>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form
            id="leave-create-form"
            className="lg:col-span-2 nb-editor-canvas space-y-6"
            onSubmit={handleSubmit}
          >
            {/* Header / Title */}
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/20">
                  <CalendarDays className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>
                    ثبت مرخصی ساعتی و روزانه
                  </h2>
                  <p className="text-sm text-slate-400">
                    لطفاً اطلاعات بازه مرخصی و جانشین موردنظر خود را با دقت تکمیل فرمایید.
                  </p>
                </div>
              </div>
            </div>

            {/* SuperAdmin Employee Selector (optional for superadmin) */}
            {isSuperAdmin && (
              <div className="nb-editor-field-group rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                <Label className="nb-editor-label text-blue-900">
                  ثبت به عنوان سوپرادمین برای کاربر:
                </Label>
                <Select
                  value={targetEmployeeId || profile?.id || ''}
                  onValueChange={(v) => setTargetEmployeeId(v)}
                >
                  <SelectTrigger className="h-11 bg-white">
                    <SelectValue placeholder="انتخاب کارمند متقاضی..." />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {fullName(s.firstName, s.lastName)} ({s.role === 'super_admin' ? 'سوپرادمین' : s.role === 'admin' ? 'مدیر' : 'پرسنل'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Mode Switch (Hourly / Daily) */}
            <div className="space-y-2">
              <Label className="nb-editor-label">نوع مرخصی (ساعتی یا روزانه) <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setLeaveMode('daily')}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3.5 text-sm font-bold transition ${
                    leaveMode === 'daily'
                      ? 'border-[#FF7A00] bg-amber-50/80 text-[#B25C00] shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Calendar className="h-5 w-5 text-[#FF7A00]" />
                  <span>مرخصی روزانه</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLeaveMode('hourly')}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3.5 text-sm font-bold transition ${
                    leaveMode === 'hourly'
                      ? 'border-[#FF7A00] bg-amber-50/80 text-[#B25C00] shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Clock className="h-5 w-5 text-[#FF7A00]" />
                  <span>مرخصی ساعتی</span>
                </button>
              </div>
            </div>

            {/* Sub-type selector (Annual, Sick, etc.) */}
            <div className="nb-editor-field-group">
              <Label className="nb-editor-label">دسته مرخصی</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {leaveSubTypes.map((st) => (
                    <SelectItem key={st.value} value={st.value}>
                      {st.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date and Time Fields depending on mode */}
            {leaveMode === 'daily' ? (
              /* Daily Leave Fields */
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">انتخاب بازه روزها:</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={setTodayDaily}
                    className="h-7 text-xs border-amber-300 text-amber-900 bg-white hover:bg-amber-50"
                  >
                    انتخاب امروز (۱ روز)
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="nb-editor-field-group">
                    <Label className="nb-editor-label">از تاریخ <span className="text-red-500">*</span></Label>
                    <JalaliDatePicker
                      value={startDate}
                      onChange={setStartDate}
                      placeholder="تاریخ شروع"
                      className={`h-11 ${errors.startDate ? 'border-red-300' : ''}`}
                    />
                    {errors.startDate && <span className="nb-editor-error">{errors.startDate}</span>}
                  </div>

                  <div className="nb-editor-field-group">
                    <Label className="nb-editor-label">تا تاریخ <span className="text-red-500">*</span></Label>
                    <JalaliDatePicker
                      value={endDate}
                      onChange={setEndDate}
                      placeholder="تاریخ پایان"
                      className={`h-11 ${errors.endDate ? 'border-red-300' : ''}`}
                    />
                    {errors.endDate && <span className="nb-editor-error">{errors.endDate}</span>}
                  </div>
                </div>

                {errors.dateRange && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold">
                    <AlertTriangle className="h-4 w-4" /> {errors.dateRange}
                  </div>
                )}

                {/* Duration Preview Box */}
                <div className="flex items-center justify-between rounded-lg bg-white p-3 border border-slate-200 text-xs">
                  <span className="text-slate-500">مدت زمان محاسبه‌شده:</span>
                  <span className={`font-bold ${durationCalculation.isError ? 'text-rose-600' : 'text-emerald-700 text-sm'}`}>
                    {durationCalculation.label}
                  </span>
                </div>
              </div>
            ) : (
              /* Hourly Leave Fields */
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">تاریخ مرخصی ساعتی <span className="text-red-500">*</span></Label>
                  <JalaliDatePicker
                    value={hourlyDate}
                    onChange={setHourlyDate}
                    placeholder="انتخاب تاریخ روز"
                    className={`h-11 ${errors.hourlyDate ? 'border-red-300' : ''}`}
                  />
                  {errors.hourlyDate && <span className="nb-editor-error">{errors.hourlyDate}</span>}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="nb-editor-field-group">
                    <Label className="nb-editor-label">از ساعت <span className="text-red-500">*</span></Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className={`h-11 text-sm ${errors.startTime ? 'border-red-300' : ''}`}
                    />
                    {errors.startTime && <span className="nb-editor-error">{errors.startTime}</span>}
                  </div>

                  <div className="nb-editor-field-group">
                    <Label className="nb-editor-label">تا ساعت <span className="text-red-500">*</span></Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className={`h-11 text-sm ${errors.endTime ? 'border-red-300' : ''}`}
                    />
                    {errors.endTime && <span className="nb-editor-error">{errors.endTime}</span>}
                  </div>
                </div>

                {errors.timeRange && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold">
                    <AlertTriangle className="h-4 w-4" /> {errors.timeRange}
                  </div>
                )}

                {/* Duration Preview Box */}
                <div className="flex items-center justify-between rounded-lg bg-white p-3 border border-slate-200 text-xs">
                  <span className="text-slate-500">مدت زمان مرخصی ساعتی:</span>
                  <span className={`font-bold ${durationCalculation.isError ? 'text-rose-600' : 'text-emerald-700 text-sm'}`}>
                    {durationCalculation.label}
                  </span>
                </div>
              </div>
            )}

            {/* Mandatory Substitute Selection */}
            <div className="nb-editor-field-group rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <Label className="nb-editor-label text-emerald-950 font-bold flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-emerald-600" />
                  انتخاب جانشین (اجباری) <span className="text-red-500">*</span>
                </Label>
                <span className="text-[11px] text-emerald-800 font-medium">
                  وظایف به این فرد محول خواهد شد
                </span>
              </div>

              <Select value={substituteId} onValueChange={setSubstituteId}>
                <SelectTrigger className={`h-11 bg-white ${errors.substituteId ? 'border-red-300' : 'border-emerald-300'}`}>
                  <SelectValue placeholder="یک همکار را به عنوان جانشین انتخاب کنید..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>
                    انتخاب همکار جانشین...
                  </SelectItem>
                  {availableSubstitutes.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {fullName(s.firstName, s.lastName)} — ({s.role === 'super_admin' ? 'سوپرادمین' : s.role === 'admin' ? 'مدیر' : 'پرسنل'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.substituteId && <span className="nb-editor-error">{errors.substituteId}</span>}
            </div>

            {/* Reason */}
            <div className="nb-editor-field-group">
              <Label className="nb-editor-label">دلیل مرخصی <span className="text-red-500">*</span></Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="لطفاً علت درخواست مرخصی خود را به طور کامل بنویسید..."
                className={`min-h-[100px] text-sm ${errors.reason ? 'border-red-300' : ''}`}
              />
              {errors.reason && <span className="nb-editor-error">{errors.reason}</span>}
            </div>
          </form>

          {/* Sidebar: Active Tasks Preview & Guides */}
          <aside className="space-y-4">
            {/* Active Tasks Referral Preview Box */}
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-5 dark:border-indigo-900/30 dark:bg-indigo-900/10">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                    <Forward className="h-4 w-4" />
                  </span>
                  <h3 className="font-bold text-sm text-indigo-950 dark:text-indigo-200">
                    وظایف قابل ارجاع به جانشین
                  </h3>
                </div>
                <span className="rounded-full bg-indigo-200/80 px-2 py-0.5 text-xs font-bold text-indigo-900">
                  {loadingTasks ? '...' : `${activeTasks.length.toLocaleString('fa-IR')} تسک`}
                </span>
              </div>

              <p className="text-xs text-indigo-800/80 mb-3 leading-5">
                تسک‌های فعال و در حال انجام شما شناسایی شده‌اند و بلافاصله پس از تأیید درخواست، به صورت خودکار به جانشین ارجاع داده خواهند شد:
              </p>

              {loadingTasks ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                </div>
              ) : activeTasks.length === 0 ? (
                <div className="rounded-lg bg-white/70 p-3 text-center text-xs text-slate-500">
                  در حال حاضر تسک فعال بدون تکمیلی برای انتقال وجود ندارد.
                </div>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {activeTasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-start justify-between rounded-lg bg-white p-2.5 text-xs shadow-xs border border-indigo-100 dark:bg-slate-800 dark:border-slate-700"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                          {t.title}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          سررسید: {t.dueDate ? formatJalali(t.dueDate) : 'بدون سررسید'}
                        </div>
                      </div>
                      <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                        {t.priority === 'urgent' ? 'فوری' : t.priority === 'high' ? 'بالا' : 'عادی'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Guide Card */}
            <div className="nb-editor-canvas" style={{ padding: 20 }}>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-900/20">
                  <Lightbulb className="h-5 w-5" />
                </span>
                <h2 className="font-bold text-slate-900 dark:text-slate-100">راهنما و قوانین</h2>
              </div>
              <div className="space-y-3">
                {guideItems.map((item, i) => (
                  <div key={i} className="flex gap-2.5">
                    <span className="mt-0.5 shrink-0 text-slate-400">
                      <item.icon className="h-4 w-4 text-[#FF7A00]" />
                    </span>
                    <div>
                      <strong className="text-xs text-slate-700 dark:text-slate-300">
                        {item.title}
                      </strong>
                      <p className="text-[11px] text-slate-400 leading-4 mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
