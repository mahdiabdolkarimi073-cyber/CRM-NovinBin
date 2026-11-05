'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  Loader2,
  Check,
  Lightbulb,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { fullName } from '@/lib/constants';
import { toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';
import type { Profile } from '@/lib/types';

const leaveSubTypes = [
  { value: 'annual', label: 'استحقاقی' },
  { value: 'sick', label: 'استعلاجی' },
  { value: 'unpaid', label: 'بدون حقوق' },
  { value: 'personal', label: 'شخصی / اضطراری' },
];

export default function EditLeavePage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const router = useRouter();

  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [leaveMode, setLeaveMode] = useState<'daily' | 'hourly'>('daily');
  const [type, setType] = useState('annual');
  const [substituteId, setSubstituteId] = useState('none');
  const [reason, setReason] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  // Daily Mode states
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(new Date());

  // Hourly Mode states
  const [hourlyDate, setHourlyDate] = useState<Date | null>(new Date());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [leaveRes, staffRes] = await Promise.all([
        fetch(`/api/leaves?action=detail&id=${id}`, { credentials: 'include' }),
        fetch('/api/data?model=profiles&where={"userType":"staff","active":true}', { credentials: 'include' }),
      ]);

      const leaveJson = await leaveRes.json();
      const staffJson = await staffRes.json();

      if (staffJson.data) setStaff(staffJson.data);

      if (leaveJson.leave) {
        const l = leaveJson.leave;
        if (l.status !== 'pending' && !isSuperAdmin) {
          toast.error('این مرخصی از وضعیت در انتظار خارج شده و قابل ویرایش نیست');
          router.push(`/dashboard/leaves/${id}`);
          return;
        }

        const meta = l.metadata || {};
        setEmployeeId(l.employeeId);
        setLeaveMode(meta.leaveMode || 'daily');
        setSubstituteId(meta.substituteId || 'none');
        setReason(meta.description || l.reason || '');

        const rawType = (l.type || '').replace(/^(daily_|hourly_)/, '');
        setType(rawType || 'annual');

        if (meta.leaveMode === 'hourly') {
          setHourlyDate(l.startDate ? new Date(l.startDate) : new Date());
          setStartTime(meta.startTime || '09:00');
          setEndTime(meta.endTime || '13:00');
        } else {
          setStartDate(l.startDate ? new Date(l.startDate) : new Date());
          setEndDate(l.endDate ? new Date(l.endDate) : new Date());
        }
      }
    } catch (e: any) {
      toast.error('خطا در بارگذاری: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [id, isSuperAdmin, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Duration calculation
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

  const validate = () => {
    const err: Record<string, string> = {};
    if (!substituteId || substituteId === 'none') {
      err.substituteId = 'انتخاب جانشین الزامی است';
    }
    if (leaveMode === 'hourly') {
      if (!hourlyDate) err.hourlyDate = 'انتخاب تاریخ الزامی است';
      if (!startTime) err.startTime = 'ساعت شروع الزامی است';
      if (!endTime) err.endTime = 'ساعت پایان الزامی است';
      if (durationCalculation.isError) err.timeRange = durationCalculation.label;
    } else {
      if (!startDate) err.startDate = 'تاریخ شروع الزامی است';
      if (!endDate) err.endDate = 'تاریخ پایان الزامی است';
      if (durationCalculation.isError) err.dateRange = durationCalculation.label;
    }
    if (!reason.trim()) err.reason = 'دلیل مرخصی الزامی است';

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('لطفاً خطاهای فرم را برطرف نمایید');
      return;
    }

    setSubmitting(true);
    try {
      const selectedSub = staff.find((s) => s.id === substituteId);
      const subName = selectedSub ? fullName(selectedSub.firstName, selectedSub.lastName) : 'جانشین';

      const metadata = {
        description: reason.trim(),
        leaveMode,
        startTime: leaveMode === 'hourly' ? startTime : '',
        endTime: leaveMode === 'hourly' ? endTime : '',
        durationHours: leaveMode === 'hourly' ? durationCalculation.hours : 0,
        durationDays: leaveMode === 'daily' ? durationCalculation.days : 1,
        substituteId,
        substituteName: subName,
        requesterId: employeeId,
      };

      const startDateTime = new Date(
        leaveMode === 'hourly' ? toLocalDateString(hourlyDate!) : toLocalDateString(startDate!)
      );
      const endDateTime = new Date(
        leaveMode === 'hourly' ? toLocalDateString(hourlyDate!) : toLocalDateString(endDate!)
      );

      const res = await fetch('/api/data', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          model: 'leave_requests',
          where: { id },
          data: {
            type: `${leaveMode}_${type}`,
            startDate: startDateTime.toISOString(),
            endDate: endDateTime.toISOString(),
            reason: JSON.stringify(metadata),
          },
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'خطا در ویرایش مرخصی');

      toast.success('درخواست مرخصی با موفقیت ویرایش شد');
      router.push(`/dashboard/leaves/${id}`);
    } catch (e: any) {
      toast.error('ویرایش ناموفق: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری اطلاعات مرخصی...</p>
        </div>
      </div>
    );
  }

  const availableSubstitutes = staff.filter((s) => s.id !== employeeId);

  return (
    <div className="nb-editor-page" dir="rtl">
      {/* Topbar */}
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href={`/dashboard/leaves/${id}`} className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به جزئیات
          </Link>
          <span className="nb-editor-breadcrumb">
            داشبورد <b>←</b> مرخصی‌ها <b>←</b> ویرایش مرخصی
          </span>
        </div>
        <div className="nb-editor-topbar-right">
          <button
            type="button"
            className="nb-editor-discard"
            onClick={() => router.push(`/dashboard/leaves/${id}`)}
            disabled={submitting}
          >
            انصراف
          </button>
          <button
            type="submit"
            form="leave-edit-form"
            className="nb-editor-save-btn"
            disabled={submitting}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Check className="h-4 w-4 ml-1" />}
            {submitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form
            id="leave-edit-form"
            className="lg:col-span-2 nb-editor-canvas space-y-6"
            onSubmit={handleUpdate}
          >
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/20">
                  <CalendarDays className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>
                    ویرایش درخواست مرخصی
                  </h2>
                  <p className="text-sm text-slate-400">
                    تغییر مشخصات، ساعات، تاریخ‌ها یا جانشین مرخصی
                  </p>
                </div>
              </div>
            </div>

            {/* Mode switch */}
            <div className="space-y-2">
              <Label className="nb-editor-label">نوع مرخصی (ساعتی یا روزانه)</Label>
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

            {leaveMode === 'daily' ? (
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="nb-editor-field-group">
                    <Label className="nb-editor-label">از تاریخ</Label>
                    <JalaliDatePicker
                      value={startDate}
                      onChange={setStartDate}
                      className="h-11"
                    />
                  </div>
                  <div className="nb-editor-field-group">
                    <Label className="nb-editor-label">تا تاریخ</Label>
                    <JalaliDatePicker
                      value={endDate}
                      onChange={setEndDate}
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-white p-3 border border-slate-200 text-xs">
                  <span className="text-slate-500">مدت زمان محاسبه‌شده:</span>
                  <span className={`font-bold ${durationCalculation.isError ? 'text-rose-600' : 'text-emerald-700 text-sm'}`}>
                    {durationCalculation.label}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">تاریخ مرخصی ساعتی</Label>
                  <JalaliDatePicker
                    value={hourlyDate}
                    onChange={setHourlyDate}
                    className="h-11"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="nb-editor-field-group">
                    <Label className="nb-editor-label">از ساعت</Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="h-11 text-sm"
                    />
                  </div>
                  <div className="nb-editor-field-group">
                    <Label className="nb-editor-label">تا ساعت</Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="h-11 text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-white p-3 border border-slate-200 text-xs">
                  <span className="text-slate-500">مدت زمان مرخصی ساعتی:</span>
                  <span className={`font-bold ${durationCalculation.isError ? 'text-rose-600' : 'text-emerald-700 text-sm'}`}>
                    {durationCalculation.label}
                  </span>
                </div>
              </div>
            )}

            {/* Substitute Selection */}
            <div className="nb-editor-field-group rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <Label className="nb-editor-label text-emerald-950 font-bold flex items-center gap-1.5 mb-2">
                <UserCheck className="h-4 w-4 text-emerald-600" />
                جانشین (اجباری)
              </Label>
              <Select value={substituteId} onValueChange={setSubstituteId}>
                <SelectTrigger className="h-11 bg-white border-emerald-300">
                  <SelectValue placeholder="انتخاب همکار جانشین..." />
                </SelectTrigger>
                <SelectContent>
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
              <Label className="nb-editor-label">دلیل مرخصی</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[100px] text-sm"
              />
              {errors.reason && <span className="nb-editor-error">{errors.reason}</span>}
            </div>
          </form>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="nb-editor-canvas" style={{ padding: 20 }}>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-900/20">
                  <Lightbulb className="h-5 w-5" />
                </span>
                <h2 className="font-bold text-slate-900 dark:text-slate-100">نکته مهم</h2>
              </div>
              <p className="text-xs text-slate-500 leading-5">
                تنها درخواست‌هایی که هنوز توسط مدیریت تأیید یا رد نشده‌اند (وضعیت در انتظار) امکان ویرایش دارند. پس از تأیید، انتقال تسک‌ها به جانشین نهایی خواهد شد.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
