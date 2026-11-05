'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { fetchData, createData, updateData } from '@/lib/data-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Clock,
  CalendarDays,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Search,
  Plus,
  ArrowRight,
  Filter,
  UserCheck,
  Calendar,
  LogIn,
  LogOut,
  CalendarClock,
  FileSpreadsheet,
} from 'lucide-react';
import Link from 'next/link';
import { formatJalali, formatJalaliDateTime, toLocalDateString } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type { AttendanceRecord, Profile } from '@/lib/types';

const attendanceStatusLabels: Record<string, { label: string; color: string; bg: string }> = {
  present: { label: 'حاضر', color: '#16a34a', bg: 'rgba(34,197,94,0.1)' },
  absent: { label: 'غایب', color: '#dc2626', bg: 'rgba(239,68,68,0.1)' },
  late: { label: 'تأخیر', color: '#d97706', bg: 'rgba(245,158,11,0.1)' },
  leave: { label: 'مرخصی', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
};

export default function HRPage() {
  const { profile } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStaff, setFilterStaff] = useState('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [form, setForm] = useState({
    employeeId: '',
    date: toLocalDateString(new Date()),
    checkIn: '',
    checkOut: '',
    status: 'present',
    notes: '',
  });

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';
  const isAdmin = isSuperAdmin || profile?.role === 'admin';

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // Access control: Personnel sees only their own attendance, SuperAdmin sees all
      const whereClause = isSuperAdmin ? {} : { employeeId: profile.id };

      const [attData, staffData] = await Promise.all([
        fetchData<AttendanceRecord>('attendance_records', {
          where: whereClause,
          orderBy: { date: 'desc' },
          take: 100,
        }),
        fetchData<Profile>('profiles', {
          where: { userType: 'staff', active: true },
        }),
      ]);

      setAttendance(attData || []);
      setStaff(staffData || []);
    } catch (e: any) {
      toast.error('خطا در بارگذاری داده‌ها: ' + e.message);
    }
    setLoading(false);
  }, [profile, isSuperAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const staffMap = useMemo(() => {
    return new Map(staff.map((s) => [s.id, s]));
  }, [staff]);

  const getStaffName = useCallback(
    (id: string) => {
      const s = staffMap.get(id);
      return s ? fullName(s.firstName, s.lastName) || s.email : 'کاربر';
    },
    [staffMap]
  );

  const filteredAttendance = useMemo(() => {
    return attendance.filter((rec) => {
      const empName = getStaffName(rec.employeeId).toLowerCase();
      const matchesSearch = !search || empName.includes(search.toLowerCase()) || (rec.notes || '').includes(search);
      const matchesStatus = filterStatus === 'all' || rec.status === filterStatus;
      const matchesStaff = filterStaff === 'all' || rec.employeeId === filterStaff;
      const matchesDate = !selectedDate || toLocalDateString(new Date(rec.date)) === toLocalDateString(selectedDate);
      return matchesSearch && matchesStatus && matchesStaff && matchesDate;
    });
  }, [attendance, search, filterStatus, filterStaff, selectedDate, getStaffName]);

  const stats = useMemo(() => {
    const total = attendance.length;
    const present = attendance.filter((a) => a.status === 'present').length;
    const late = attendance.filter((a) => a.status === 'late').length;
    const onLeave = attendance.filter((a) => a.status === 'leave').length;

    return [
      {
        label: isSuperAdmin ? 'کل رکوردهای حضور' : 'سوابق حضور من',
        value: total,
        icon: Clock,
        gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
        glow: 'rgba(37,99,235,0.25)',
      },
      {
        label: 'حاضر',
        value: present,
        icon: CheckCircle2,
        gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
        glow: 'rgba(34,197,94,0.25)',
      },
      {
        label: 'تأخیر',
        value: late,
        icon: AlertCircle,
        gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        glow: 'rgba(245,158,11,0.25)',
      },
      {
        label: 'مرخصی',
        value: onLeave,
        icon: CalendarDays,
        gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
        glow: 'rgba(139,92,246,0.25)',
      },
    ];
  }, [attendance, isSuperAdmin]);

  // Quick self check-in / check-out
  const handleQuickCheck = async (type: 'in' | 'out') => {
    if (!profile) return;
    const now = new Date();
    const todayStr = toLocalDateString(now);
    const timeStr = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    // Check if record exists for today
    const existing = attendance.find(
      (a) => a.employeeId === profile.id && toLocalDateString(new Date(a.date)) === todayStr
    );

    try {
      if (existing) {
        await updateData('attendance_records', { id: existing.id }, {
          checkOut: type === 'out' ? timeStr : existing.checkOut,
          checkIn: type === 'in' ? timeStr : existing.checkIn,
        });
        toast.success(type === 'out' ? `خروج شما در ساعت ${timeStr} ثبت شد` : `ورود شما در ساعت ${timeStr} ثبت شد`);
      } else {
        await createData('attendance_records', {
          employeeId: profile.id,
          date: new Date(todayStr).toISOString(),
          checkIn: type === 'in' ? timeStr : null,
          checkOut: type === 'out' ? timeStr : null,
          status: 'present',
        });
        toast.success(`ثبت شد: ساعت ${timeStr}`);
      }
      loadData();
    } catch (e: any) {
      toast.error('ثبت حضور و غیاب ناموفق: ' + e.message);
    }
  };

  const handleSaveAttendance = async () => {
    if (!form.date) {
      toast.error('انتخاب تاریخ الزامی است');
      return;
    }
    const targetEmpId = isSuperAdmin ? form.employeeId || profile?.id : profile?.id;
    if (!targetEmpId) {
      toast.error('انتخاب کارمند الزامی است');
      return;
    }

    try {
      await createData('attendance_records', {
        employeeId: targetEmpId,
        date: new Date(form.date).toISOString(),
        checkIn: form.checkIn || null,
        checkOut: form.checkOut || null,
        status: form.status,
        notes: form.notes || null,
      });

      toast.success('رکورد حضور و غیاب با موفقیت ذخیره شد');
      setDialogOpen(false);
      setForm({
        employeeId: '',
        date: toLocalDateString(new Date()),
        checkIn: '',
        checkOut: '',
        status: 'present',
        notes: '',
      });
      loadData();
    } catch (e: any) {
      toast.error('خطا در ثبت: ' + e.message);
    }
  };

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری اطلاعات حضور و غیاب...</p>
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
                  background: 'linear-gradient(180deg,#0EA5E9,#0284C7)',
                  boxShadow: '0 0 12px rgba(14,165,233,.25)',
                }}
              />
              <h1>منابع انسانی و حضور و غیاب</h1>
            </div>
            <p>
              {isSuperAdmin
                ? 'مدیریت تردد، حضور و غیاب پرسنل و دسترسی سریع به سامانه مرخصی‌ها'
                : 'مشاهده تردد شخصی و ثبت ساعات ورود و خروج'}
            </p>
          </div>
        </div>

        <div className="nb-hero-right flex flex-wrap gap-2">
          {/* Quick Check-in/out buttons */}
          <Button
            size="sm"
            onClick={() => handleQuickCheck('in')}
            className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs"
          >
            <LogIn className="h-3.5 w-3.5 ml-1" /> ثبت ورود
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleQuickCheck('out')}
            className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs"
          >
            <LogOut className="h-3.5 w-3.5 ml-1" /> ثبت خروج
          </Button>

          {/* Direct link to Leaves module */}
          <Link href="/dashboard/leaves">
            <Button size="sm" className="bg-[#3155E7] text-white hover:bg-[#2445C7] text-xs">
              <CalendarDays className="h-3.5 w-3.5 ml-1" /> سامانه مرخصی‌ها
            </Button>
          </Link>

          {isSuperAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDialogOpen(true)}
              className="border-sky-300 text-sky-700 hover:bg-sky-50 text-xs"
            >
              <Plus className="h-3.5 w-3.5 ml-1" /> ثبت رکورد دستی
            </Button>
          )}
        </div>
      </header>

      {/* Stats Cards */}
      <section className="nb-stats-grid-v2">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="nb-stat-card-v2"
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

      {/* Attendance Content Section */}
      <div className="space-y-4">
        {/* Toolbar & Filters */}
        <div className="nb-toolbar">
          <div className="nb-toolbar-left flex items-center gap-3">
            <h2>سوابق حضور و غیاب</h2>
            <span className="nb-count-badge">
              {filteredAttendance.length.toLocaleString('fa-IR')} رکورد
            </span>
          </div>

          <div className="nb-toolbar-right flex flex-wrap items-center gap-2">
            {isSuperAdmin && (
              <div className="nb-search-box">
                <Search className="h-4 w-4" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="جستجو در پرسنل..."
                />
              </div>
            )}

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 w-32 text-xs">
                <SelectValue placeholder="وضعیت..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                <SelectItem value="present">حاضر</SelectItem>
                <SelectItem value="late">تأخیر</SelectItem>
                <SelectItem value="absent">غایب</SelectItem>
                <SelectItem value="leave">مرخصی</SelectItem>
              </SelectContent>
            </Select>

            {isSuperAdmin && (
              <Select value={filterStaff} onValueChange={setFilterStaff}>
                <SelectTrigger className="h-9 w-40 text-xs">
                  <SelectValue placeholder="فیلتر پرسنل..." />
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
                value={selectedDate}
                onChange={setSelectedDate}
                placeholder="فیلتر تاریخ..."
                className="h-9 text-xs"
              />
            </div>

            {selectedDate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(null)}
                className="h-9 text-xs text-rose-500"
              >
                پاک کردن تاریخ
              </Button>
            )}
          </div>
        </div>

        {/* Attendance Records Table */}
        {filteredAttendance.length === 0 ? (
          <div className="nb-empty">
            <div className="sb-empty-icon">
              <Clock className="h-12 w-12 text-muted-foreground/30" />
            </div>
            <h3>رکوردی یافت نشد</h3>
            <p>سوابق حضور و غیاب برای فیلترهای انتخابی موجود نیست.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                  <tr>
                    <th className="p-3.5">ردیف</th>
                    {isSuperAdmin && <th className="p-3.5">نام کارمند</th>}
                    <th className="p-3.5">تاریخ</th>
                    <th className="p-3.5">ساعت ورود</th>
                    <th className="p-3.5">ساعت خروج</th>
                    <th className="p-3.5">وضعیت</th>
                    <th className="p-3.5">توضیحات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAttendance.map((rec, idx) => {
                    const st = attendanceStatusLabels[rec.status] || attendanceStatusLabels.present;
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/60 transition">
                        <td className="p-3.5 text-xs text-slate-400">
                          {(idx + 1).toLocaleString('fa-IR')}
                        </td>
                        {isSuperAdmin && (
                          <td className="p-3.5 font-semibold text-slate-900 dark:text-slate-100">
                            {getStaffName(rec.employeeId)}
                          </td>
                        )}
                        <td className="p-3.5 text-slate-700 dark:text-slate-300">
                          {formatJalali(rec.date)}
                        </td>
                        <td className="p-3.5 font-mono text-xs text-emerald-600 font-bold">
                          {rec.checkIn || '—'}
                        </td>
                        <td className="p-3.5 font-mono text-xs text-rose-600 font-bold">
                          {rec.checkOut || '—'}
                        </td>
                        <td className="p-3.5">
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                            style={{ backgroundColor: st.bg, color: st.color }}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td className="p-3.5 text-xs text-slate-500">
                          {rec.notes || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Manual Attendance Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Clock className="h-5 w-5 text-sky-600" />
              ثبت رکورد حضور و غیاب
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {isSuperAdmin && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">انتخاب کارمند</Label>
                <Select
                  value={form.employeeId}
                  onValueChange={(v) => setForm({ ...form, employeeId: v })}
                >
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="انتخاب کارمند..." />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {fullName(s.firstName, s.lastName)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">تاریخ</Label>
              <JalaliDatePicker
                value={form.date ? new Date(form.date) : null}
                onChange={(d) => setForm({ ...form, date: d ? toLocalDateString(d) : '' })}
                className="h-10 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">ساعت ورود</Label>
                <Input
                  type="time"
                  value={form.checkIn}
                  onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
                  className="h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">ساعت خروج</Label>
                <Input
                  type="time"
                  value={form.checkOut}
                  onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
                  className="h-10 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">وضعیت</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">حاضر</SelectItem>
                  <SelectItem value="late">تأخیر</SelectItem>
                  <SelectItem value="absent">غایب</SelectItem>
                  <SelectItem value="leave">مرخصی</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">یادداشت / توضیحات</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="توضیحات اختیاری..."
                className="h-10 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="text-xs">
              انصراف
            </Button>
            <Button onClick={handleSaveAttendance} className="bg-sky-600 text-white hover:bg-sky-700 text-xs">
              ذخیره رکورد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
