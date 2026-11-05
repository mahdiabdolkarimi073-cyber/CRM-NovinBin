'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CalendarDays,
  Clock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Pencil,
  Trash2,
  UserCheck,
  Check,
  X,
  Loader2,
  Calendar,
  LayoutGrid,
  List,
  User,
  ArrowRight,
  Forward,
  ShieldAlert,
} from 'lucide-react';
import { formatJalali, formatJalaliDateTime, toLocalDateString } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type { LeaveRequest, Profile } from '@/lib/types';

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

export default function LeavesPage() {
  const { profile } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMode, setFilterMode] = useState('all');
  const [filterStaff, setFilterStaff] = useState('all');
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

  // Action dialogs
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';
  const isAdmin = isSuperAdmin || profile?.role === 'admin';

  const loadLeaves = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const res = await fetch('/api/leaves?action=list', { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'خطا در بارگذاری');

      setLeaves(json.leaves || []);

      // Also load staff for filters
      const staffRes = await fetch('/api/data?model=profiles&where={"userType":"staff","active":true}', {
        credentials: 'include',
      });
      const staffJson = await staffRes.json();
      if (staffJson.data) setStaff(staffJson.data);
    } catch (e: any) {
      toast.error('بارگذاری مرخصی‌ها ناموفق بود: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  // Filtered leaves
  const filteredLeaves = useMemo(() => {
    return leaves.filter((l) => {
      const q = search.toLowerCase();
      const empName = (l.employeeName || '').toLowerCase();
      const subName = (l.substituteName || '').toLowerCase();
      const desc = (l.metadata?.description || l.reason || '').toLowerCase();
      const matchesSearch = !search || empName.includes(q) || subName.includes(q) || desc.includes(q);

      const matchesStatus = filterStatus === 'all' || l.status === filterStatus;
      const matchesMode = filterMode === 'all' || l.metadata?.leaveMode === filterMode;
      const matchesStaff = filterStaff === 'all' || l.employeeId === filterStaff;

      const matchesDate =
        !filterDate ||
        toLocalDateString(new Date(l.startDate)) === toLocalDateString(filterDate) ||
        toLocalDateString(new Date(l.endDate)) === toLocalDateString(filterDate);

      return matchesSearch && matchesStatus && matchesMode && matchesStaff && matchesDate;
    });
  }, [leaves, search, filterStatus, filterMode, filterStaff, filterDate]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = leaves.length;
    const pending = leaves.filter((l) => l.status === 'pending').length;
    const approved = leaves.filter((l) => l.status === 'approved').length;
    const rejected = leaves.filter((l) => l.status === 'rejected' || l.status === 'cancelled').length;

    return [
      {
        label: isSuperAdmin ? 'کل درخواست‌ها' : 'درخواست‌های من',
        value: total,
        filter: 'all',
        icon: CalendarDays,
        gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
        glow: 'rgba(37,99,235,0.25)',
      },
      {
        label: 'در انتظار بررسی',
        value: pending,
        filter: 'pending',
        icon: Clock,
        gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        glow: 'rgba(245,158,11,0.25)',
      },
      {
        label: 'تأیید شده',
        value: approved,
        filter: 'approved',
        icon: CheckCircle2,
        gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
        glow: 'rgba(34,197,94,0.25)',
      },
      {
        label: 'رد / لغو شده',
        value: rejected,
        filter: 'rejected',
        icon: XCircle,
        gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
        glow: 'rgba(239,68,68,0.25)',
      },
    ];
  }, [leaves, isSuperAdmin]);

  // Handle Approve with atomic task transfer
  const handleApprove = async (id: string) => {
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

      toast.success(json.message || 'درخواست مرخصی تأیید شد و تسک‌ها با موفقیت ارجاع داده شدند');
      loadLeaves();
    } catch (e: any) {
      toast.error('عملیات تأیید ناموفق: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Open reject modal
  const openRejectDialog = (id: string) => {
    setRejectTargetId(id);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  // Submit reject
  const handleRejectSubmit = async () => {
    if (!rejectTargetId) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/leaves?action=reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: rejectTargetId, rejectReason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'خطا در رد مرخصی');

      toast.success('درخواست مرخصی با موفقیت رد شد');
      setRejectDialogOpen(false);
      setRejectTargetId(null);
      loadLeaves();
    } catch (e: any) {
      toast.error('عملیات رد ناموفق: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel own leave
  const handleCancel = async (id: string) => {
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
      loadLeaves();
    } catch (e: any) {
      toast.error('لغو ناموفق: ' + e.message);
    }
  };

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری سامانه مرخصی‌ها...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="nb-page" dir="rtl">
      {/* Hero Header */}
      <header className="nb-hero">
        <div className="nb-hero-left">
          <div>
            <div className="nb-hero-title-row">
              <span
                className="nb-hero-marker"
                style={{
                  background: 'linear-gradient(180deg,#F59E0B,#D97706)',
                  boxShadow: '0 0 12px rgba(245,158,11,.25)',
                }}
              />
              <h1>مدیریت مرخصی‌ها</h1>
            </div>
            <p>
              {isSuperAdmin
                ? 'مدیریت و تأیید درخواست‌های مرخصی پرسنل، انتصاب جانشین و ارجاع خودکار وظایف'
                : 'ثبت و پیگیری درخواست‌های مرخصی روزانه و ساعتی و مشاهده وظایف محوله'}
            </p>
          </div>
        </div>

        <div className="nb-hero-right flex flex-wrap gap-2">
          <Link href="/dashboard/leaves/create" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            ثبت مرخصی جدید
          </Link>

          <Link href="/dashboard/hr">
            <Button variant="outline" size="sm" className="h-10 text-xs border-slate-300">
              <Clock className="h-3.5 w-3.5 ml-1" /> حضور و غیاب
            </Button>
          </Link>
        </div>
      </header>

      {/* Stats Cards */}
      <section className="nb-stats-grid-v2">
        {stats.map((stat) => (
          <div
            key={stat.label}
            onClick={() => setFilterStatus(filterStatus === stat.filter ? 'all' : stat.filter)}
            className="nb-stat-card-v2 cursor-pointer transition hover:scale-[1.01]"
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
          </div>
        ))}
      </section>

      {/* Toolbar & Filters */}
      <div className="nb-toolbar">
        <div className="nb-toolbar-left flex items-center gap-3">
          <h2>فهرست درخواست‌ها</h2>
          <span className="nb-count-badge">
            {filteredLeaves.length.toLocaleString('fa-IR')} درخواست
          </span>
        </div>

        <div className="nb-toolbar-right flex flex-wrap items-center gap-2">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در مرخصی‌ها، دلیل، نام..."
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-32 text-xs">
              <SelectValue placeholder="وضعیت..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              <SelectItem value="pending">در انتظار بررسی</SelectItem>
              <SelectItem value="approved">تأیید شده</SelectItem>
              <SelectItem value="rejected">رد شده</SelectItem>
              <SelectItem value="cancelled">لغو شده</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterMode} onValueChange={setFilterMode}>
            <SelectTrigger className="h-9 w-28 text-xs">
              <SelectValue placeholder="نوع مرخصی..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه انواع</SelectItem>
              <SelectItem value="daily">روزانه</SelectItem>
              <SelectItem value="hourly">ساعتی</SelectItem>
            </SelectContent>
          </Select>

          {isSuperAdmin && (
            <Select value={filterStaff} onValueChange={setFilterStaff}>
              <SelectTrigger className="h-9 w-36 text-xs">
                <SelectValue placeholder="انتخاب کارمند..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه پرسنل</SelectItem>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {fullName(s.firstName, s.lastName)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="w-36">
            <JalaliDatePicker
              value={filterDate}
              onChange={setFilterDate}
              placeholder="فیلتر تاریخ شمسی..."
              className="h-9 text-xs"
            />
          </div>

          {filterDate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilterDate(null)}
              className="h-9 text-xs text-rose-500"
            >
              حذف فیلتر تاریخ
            </Button>
          )}

          <div className="nb-view-toggle">
            <button
              className={viewMode === 'board' ? 'is-active' : ''}
              onClick={() => setViewMode('board')}
              aria-label="نمای کارتی"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              className={viewMode === 'list' ? 'is-active' : ''}
              onClick={() => setViewMode('list')}
              aria-label="نمای جدولی"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Leaves View */}
      {filteredLeaves.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon">
            <CalendarDays className="h-12 w-12 text-muted-foreground/30" />
          </div>
          <h3>درخواست مرخصی ثبت نشده است</h3>
          <p>می‌توانید درخواست مرخصی ساعتی یا روزانه جدید ثبت نمایید.</p>
          <Link href="/dashboard/leaves/create" className="nb-empty-new-btn">
            <Plus className="h-4 w-4" /> ثبت درخواست مرخصی
          </Link>
        </div>
      ) : viewMode === 'board' ? (
        /* Board / Grid View */
        <div className="nb-grid nb-grid-grid">
          {filteredLeaves.map((l) => {
            const st = statusConfig[l.status] || statusConfig.pending;
            const isHourly = l.metadata?.leaveMode === 'hourly';
            const durationLabel = isHourly
              ? `${(l.metadata?.durationHours || 0).toLocaleString('fa-IR')} ساعت (${l.metadata?.startTime || ''} الی ${l.metadata?.endTime || ''})`
              : `${(l.metadata?.durationDays || 1).toLocaleString('fa-IR')} روز`;

            const rawType = (l.type || '').replace(/^(daily_|hourly_)/, '');
            const typeText = leaveTypeLabels[rawType] || 'استحقاقی';

            return (
              <article
                key={l.id}
                className="nb-card transition-all hover:shadow-md"
                style={{ borderBottomColor: st.color, borderBottomWidth: 3 }}
              >
                <div className="nb-card-top flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="nb-card-tag font-semibold"
                      style={{ background: st.bg, color: st.color }}
                    >
                      {st.label}
                    </span>
                    <span className="nb-card-tag bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300">
                      {isHourly ? 'مرخصی ساعتی' : 'مرخصی روزانه'} ({typeText})
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    {formatJalali(l.createdAt)}
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  {/* Requester & Substitute info */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">درخواست‌دهنده:</div>
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {l.employeeName}
                        </div>
                      </div>
                    </div>

                    <div className="text-left">
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                        جانشین:
                      </div>
                      <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">
                        {l.substituteName}
                      </div>
                    </div>
                  </div>

                  {/* Dates & Duration */}
                  <div className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">بازه مرخصی:</span>
                      <span className="font-semibold">
                        {formatJalali(l.startDate)}
                        {!isHourly && l.startDate !== l.endDate && ` تا ${formatJalali(l.endDate)}`}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">مدت زمان:</span>
                      <span className="font-bold text-[#FF7A00]">{durationLabel}</span>
                    </div>

                    {l.metadata?.transferredTasksCount ? (
                      <div className="flex justify-between text-indigo-600 font-semibold pt-1 border-t border-slate-200/60 dark:border-slate-700">
                        <span className="flex items-center gap-1">
                          <Forward className="h-3 w-3" /> وظایف منتقل‌شده:
                        </span>
                        <span>{l.metadata.transferredTasksCount.toLocaleString('fa-IR')} تسک</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Reason snippet */}
                  <div className="text-xs text-slate-500 line-clamp-2">
                    <strong className="text-slate-700 dark:text-slate-300">علت: </strong>
                    {l.metadata?.description || l.reason || 'بدون توضیحات'}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="nb-card-bottom flex items-center justify-between border-t border-slate-100 p-3 dark:border-slate-800">
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/dashboard/leaves/${l.id}`}
                      className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-sky-600 hover:bg-sky-50 transition"
                      title="مشاهده جزئیات کامل و تسک‌ها"
                    >
                      <Eye className="h-3.5 w-3.5" /> جزئیات
                    </Link>

                    {l.status === 'pending' && (isSuperAdmin || l.employeeId === profile?.id) && (
                      <Link
                        href={`/dashboard/leaves/${l.id}/edit`}
                        className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-slate-500 hover:bg-slate-100 transition"
                        title="ویرایش درخواست"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Admin Approval/Reject Buttons */}
                    {l.status === 'pending' && isAdmin && (
                      <>
                        <Button
                          size="sm"
                          disabled={actionLoading}
                          onClick={() => handleApprove(l.id)}
                          className="h-7 bg-emerald-600 px-2.5 text-[11px] text-white hover:bg-emerald-700"
                        >
                          <Check className="h-3 w-3 ml-1" /> تأیید و ارجاع تسک‌ها
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionLoading}
                          onClick={() => openRejectDialog(l.id)}
                          className="h-7 border-rose-200 px-2 text-[11px] text-rose-600 hover:bg-rose-50"
                        >
                          <X className="h-3 w-3 ml-1" /> رد
                        </Button>
                      </>
                    )}

                    {/* Requester cancel option */}
                    {l.status === 'pending' && l.employeeId === profile?.id && !isAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancel(l.id)}
                        className="h-7 border-slate-200 px-2 text-[11px] text-slate-600 hover:bg-slate-50"
                      >
                        لغو درخواست
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                <tr>
                  <th className="p-3.5">درخواست‌دهنده</th>
                  <th className="p-3.5">نوع مرخصی</th>
                  <th className="p-3.5">بازه تاریخ</th>
                  <th className="p-3.5">مدت</th>
                  <th className="p-3.5">جانشین</th>
                  <th className="p-3.5">وضعیت</th>
                  <th className="p-3.5">تسک‌های ارجاعی</th>
                  <th className="p-3.5 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLeaves.map((l) => {
                  const st = statusConfig[l.status] || statusConfig.pending;
                  const isHourly = l.metadata?.leaveMode === 'hourly';
                  const durationLabel = isHourly
                    ? `${(l.metadata?.durationHours || 0).toLocaleString('fa-IR')} ساعت`
                    : `${(l.metadata?.durationDays || 1).toLocaleString('fa-IR')} روز`;

                  return (
                    <tr key={l.id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100">
                        {l.employeeName}
                      </td>
                      <td className="p-3.5 text-xs text-slate-600">
                        {isHourly ? 'ساعتی' : 'روزانه'}
                      </td>
                      <td className="p-3.5 text-xs text-slate-700">
                        {formatJalali(l.startDate)}
                        {isHourly && ` (${l.metadata?.startTime} - ${l.metadata?.endTime})`}
                      </td>
                      <td className="p-3.5 text-xs font-bold text-[#FF7A00]">
                        {durationLabel}
                      </td>
                      <td className="p-3.5 text-xs font-semibold text-emerald-800">
                        {l.substituteName}
                      </td>
                      <td className="p-3.5">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                          style={{ backgroundColor: st.bg, color: st.color }}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-xs font-mono">
                        {l.metadata?.transferredTasksCount
                          ? `${l.metadata.transferredTasksCount.toLocaleString('fa-IR')} تسک`
                          : '—'}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href={`/dashboard/leaves/${l.id}`}
                            className="rounded p-1 text-sky-600 hover:bg-sky-50"
                            title="مشاهده جزئیات"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          {l.status === 'pending' && isAdmin && (
                            <>
                              <button
                                onClick={() => handleApprove(l.id)}
                                className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                                title="تأیید و ارجاع تسک‌ها"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openRejectDialog(l.id)}
                                className="rounded p-1 text-rose-600 hover:bg-rose-50"
                                title="رد درخواست"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-600">
              <XCircle className="h-5 w-5" />
              رد درخواست مرخصی
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-xs text-slate-500">
              لطفاً علت عدم موافقت با درخواست مرخصی را وارد کنید تا به متقاضی اطلاع‌رسانی شود:
            </p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="دلیل رد مرخصی (عدم امکان جانشینی، تراکم کاری، و غیره)..."
              className="h-24 text-sm"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              className="text-xs"
            >
              انصراف
            </Button>
            <Button
              disabled={actionLoading}
              onClick={handleRejectSubmit}
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
