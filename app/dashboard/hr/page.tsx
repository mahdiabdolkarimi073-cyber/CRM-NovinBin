'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCog, Plus, Trash2, Pencil, Clock, CalendarDays, Check, X, Eye, Loader2, Search, LayoutGrid, List } from 'lucide-react';
import Link from 'next/link';
import { formatToman, formatJalali, toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';

const statusLabels: Record<string, string> = { active: 'فعال', on_leave: 'مرخصی', terminated: 'تسویه شده' };
const statusColors: Record<string, string> = { active: '#10b981', on_leave: '#f59e0b', terminated: '#64748b' };
const leaveTypeLabels: Record<string, string> = { annual: 'استحقاقی', sick: 'استعلاجی', personal: 'شخصی' };
const attendanceStatusLabels: Record<string, string> = { present: 'حاضر', absent: 'غایب', late: 'تأخیر', leave: 'مرخصی' };

export default function HRPage() {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEmp, setEditEmp] = useState<any>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [form, setForm] = useState({ firstName: '', lastName: '', position: '', department: '', phone: '', email: '', salary: '' });
  const [leaveForm, setLeaveForm] = useState({ employeeId: '', type: 'annual', startDate: '', endDate: '', reason: '' });

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const where = isSuperAdmin ? {} : {};
      const [emps, att, lvs] = await Promise.all([
        fetchData('employees', { where, orderBy: { createdAt: 'desc' } }),
        fetchData('attendance_records', { where, orderBy: { date: 'desc' }, take: 20 }),
        fetchData('leave_requests', { where, orderBy: { createdAt: 'desc' } }),
      ]);
      setEmployees(emps || []);
      setAttendance(att || []);
      setLeaves(lvs || []);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }, [profile, isSuperAdmin]);

  useEffect(() => { load(); }, [load]);

  const filteredEmployees = useMemo(() => {
    if (!search) return employees;
    const q = search.toLowerCase();
    return employees.filter((e) =>
      `${e.firstName || ''} ${e.lastName || ''}`.toLowerCase().includes(q) ||
      (e.position || '').toLowerCase().includes(q) ||
      (e.department || '').toLowerCase().includes(q)
    );
  }, [employees, search]);

  const stats = useMemo(() => [
    {
      label: 'کل کارکنان', value: employees.length, icon: UserCog,
      gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
      glow: 'rgba(37,99,235,0.25)',
    },
    {
      label: 'فعال', value: employees.filter((e) => e.status === 'active').length, icon: Check,
      gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      glow: 'rgba(34,197,94,0.25)',
    },
    {
      label: 'مرخصی', value: employees.filter((e) => e.status === 'on_leave').length, icon: CalendarDays,
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      glow: 'rgba(245,158,11,0.25)',
    },
    {
      label: 'درخواست مرخصی', value: leaves.filter((l) => l.status === 'pending').length, icon: Clock,
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      glow: 'rgba(139,92,246,0.25)',
    },
  ], [employees, leaves]);

  const handleSave = async () => {
    if (!form.firstName || !form.lastName) { toast.error('نام و نام خانوادگی را وارد کنید'); return; }
    if (!profile) return;
    const payload: any = {
      firstName: form.firstName,
      lastName: form.lastName,
      position: form.position || undefined,
      department: form.department || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      salary: Number(form.salary.replace(/[^0-9]/g, '')) || 0,
    };
    try {
      if (editEmp) {
        await updateData('employees', { id: editEmp.id }, payload);
        toast.success('کارمند ویرایش شد');
      } else {
        await createData('employees', payload);
        toast.success('کارمند اضافه شد');
      }
      setDialogOpen(false);
      setEditEmp(null);
      setForm({ firstName: '', lastName: '', position: '', department: '', phone: '', email: '', salary: '' });
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const openEdit = (emp: any) => {
    setEditEmp(emp);
    setForm({
      firstName: emp.firstName, lastName: emp.lastName, position: emp.position || '',
      department: emp.department || '', phone: emp.phone || '', email: emp.email || '',
      salary: String(Number(emp.salary)),
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف این کارمند؟')) return;
    try { await deleteData('employees', { id }); toast.success('حذف شد'); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleLeave = async () => {
    if (!leaveForm.employeeId || !leaveForm.startDate || !leaveForm.endDate) { toast.error('فیلدها را پر کنید'); return; }
    try {
      await createData('leave_requests', {
        employeeId: leaveForm.employeeId,
        type: leaveForm.type,
        startDate: new Date(leaveForm.startDate).toISOString(),
        endDate: new Date(leaveForm.endDate).toISOString(),
        reason: leaveForm.reason || undefined,
      });
      toast.success('درخواست مرخصی ثبت شد');
      setLeaveDialogOpen(false);
      setLeaveForm({ employeeId: '', type: 'annual', startDate: '', endDate: '', reason: '' });
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleApproveLeave = async (id: string, approved: boolean) => {
    await updateData('leave_requests', { id }, { status: approved ? 'approved' : 'rejected' });
    toast.success(approved ? 'تأیید شد' : 'رد شد');
    load();
  };

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="nb-page" dir="rtl">
      <header className="nb-hero">
        <div className="nb-hero-left">
          <div>
            <div className="nb-hero-title-row">
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#0EA5E9,#0284C7)', boxShadow: '0 0 12px rgba(14,165,233,.25)' }} />
              <h1>منابع انسانی</h1>
            </div>
            <p>مدیریت کارکنان، حضور و غیاب و مرخصی</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/hr/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            کارمند جدید
          </Link>
        </div>
      </header>

      {/* Stats */}
      <section className="nb-stats-grid-v2">
        {stats.map((stat) => (
          <div key={stat.label} className="nb-stat-card-v2" style={{ '--stat-glow': stat.glow } as React.CSSProperties}>
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

      <Tabs defaultValue="employees">
        <TabsList className="mb-4">
          <TabsTrigger value="employees"><UserCog className="w-4 h-4 ml-1" />کارکنان</TabsTrigger>
          <TabsTrigger value="attendance"><Clock className="w-4 h-4 ml-1" />حضور و غیاب</TabsTrigger>
          <TabsTrigger value="leaves"><CalendarDays className="w-4 h-4 ml-1" />مرخصی</TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          {/* Toolbar */}
          <div className="nb-toolbar">
            <div className="nb-toolbar-left">
              <h2>همه کارکنان</h2>
              <span className="nb-count-badge">{filteredEmployees.length.toLocaleString('fa-IR')} نفر</span>
            </div>
            <div className="nb-toolbar-right">
              <div className="nb-search-box">
                <Search className="h-4 w-4" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="جستجو در کارکنان..."
                />
                {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
              </div>
              <div className="nb-view-toggle">
                <button className={viewMode === 'board' ? 'is-active' : ''} onClick={() => setViewMode('board')} aria-label="تخته‌ای">
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button className={viewMode === 'list' ? 'is-active' : ''} onClick={() => setViewMode('list')} aria-label="لیستی">
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {filteredEmployees.length === 0 ? (
            <div className="nb-empty">
              <div className="sb-empty-icon">
                <UserCog className="h-12 w-12 text-muted-foreground/30" />
              </div>
              <h3>کارمندی ثبت نشده</h3>
              <p>کارکنان سازمان را اضافه کنید</p>
              <Link href="/dashboard/hr/new" className="nb-empty-new-btn">
                <Plus className="h-4 w-4" />
                افزودن کارمند
              </Link>
            </div>
          ) : viewMode === 'board' ? (
            <div className="nb-grid nb-grid-grid">
              {filteredEmployees.map((emp) => {
                const stColor = statusColors[emp.status] || '#64748b';
                return (
                  <article key={emp.id} className="nb-card" style={{ borderBottomColor: stColor, borderBottomWidth: 3 }}>
                    <div className="nb-card-top">
                      <div className="nb-card-tags">
                        <span className="nb-card-tag" style={{ background: `${stColor}15`, color: stColor }}>
                          {statusLabels[emp.status] || 'نامشخص'}
                        </span>
                        {emp.department && (
                          <span className="nb-card-tag" style={{ background: 'rgba(37,99,235,.08)', color: '#2563EB' }}>
                            {emp.department}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mb-2">
                      <Avatar className="w-11 h-11">
                        <AvatarFallback className="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                          {(emp.firstName?.[0] || '') + (emp.lastName?.[0] || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="nb-card-title">{emp.firstName} {emp.lastName}</h3>
                        {emp.position && <p className="nb-card-excerpt" style={{ WebkitLineClamp: 1 }}>{emp.position}</p>}
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                      {emp.phone && (
                        <div className="flex items-center gap-1.5">
                          <span className="shrink-0 text-slate-400">تلفن:</span>
                          <span dir="ltr">{emp.phone}</span>
                        </div>
                      )}
                      {emp.email && (
                        <div className="flex items-center gap-1.5">
                          <span className="shrink-0 text-slate-400">ایمیل:</span>
                          <span dir="ltr" className="truncate">{emp.email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className="shrink-0 text-slate-400">حقوق:</span>
                        <span>{formatToman(Number(emp.salary))} ت</span>
                      </div>
                      {emp.hireDate && (
                        <div className="flex items-center gap-1.5">
                          <span className="shrink-0 text-slate-400">استخدام:</span>
                          <span>{formatJalali(emp.hireDate)}</span>
                        </div>
                      )}
                    </div>

                    <div className="nb-card-footer" onClick={(e) => e.stopPropagation()}>
                      <div className="nb-card-date">
                        <Clock className="h-3 w-3" />
                        {formatJalali(emp.createdAt || emp.hireDate)}
                      </div>
                      <div className="nb-card-quick">
                        <Link href={`/dashboard/hr/${emp.id}`} className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700" title="مشاهده">
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        <Link href={`/dashboard/hr/${emp.id}/edit`} className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700" title="ویرایش">
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        <button onClick={() => handleDelete(emp.id)} title="حذف">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
                    <tr>
                      <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">نام</th>
                      <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">سمت</th>
                      <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">دپارتمان</th>
                      <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">حقوق</th>
                      <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">وضعیت</th>
                      <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredEmployees.map((emp) => {
                      const stColor = statusColors[emp.status] || '#64748b';
                      return (
                        <tr key={emp.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-700/50">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-8 h-8"><AvatarFallback className="bg-sky-100 text-sky-700 text-xs dark:bg-sky-900/30 dark:text-sky-400">{(emp.firstName?.[0] || '') + (emp.lastName?.[0] || '')}</AvatarFallback></Avatar>
                              <span className="font-medium text-slate-800 dark:text-slate-100">{emp.firstName} {emp.lastName}</span>
                            </div>
                          </td>
                          <td className="p-3 text-sm text-slate-500 dark:text-slate-300">{emp.position || '—'}</td>
                          <td className="p-3 text-sm text-slate-500 dark:text-slate-300">{emp.department || '—'}</td>
                          <td className="p-3 text-sm text-slate-600 dark:text-slate-200" dir="ltr">{formatToman(Number(emp.salary))} ت</td>
                          <td className="p-3">
                            <Badge variant="outline" style={{ color: stColor, borderColor: stColor + '40' }} className="text-xs">
                              {statusLabels[emp.status] || 'نامشخص'}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <Link href={`/dashboard/hr/${emp.id}`} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700">
                                <Eye className="h-4 w-4" />
                              </Link>
                              <Link href={`/dashboard/hr/${emp.id}/edit`} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700">
                                <Pencil className="h-4 w-4" />
                              </Link>
                              <button className="rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(emp.id)}>
                                <Trash2 className="h-4 w-4" />
                              </button>
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
        </TabsContent>

        <TabsContent value="attendance">
          {attendance.length === 0 ? (
            <div className="nb-empty">
              <div className="sb-empty-icon">
                <Clock className="h-12 w-12 text-muted-foreground/30" />
              </div>
              <h3>رکورد حضور و غیابی نیست</h3>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
                    <tr>
                      <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">تاریخ</th>
                      <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">ورود</th>
                      <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">خروج</th>
                      <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {attendance.map((a) => (
                      <tr key={a.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="p-3 font-medium text-slate-700 dark:text-slate-200">{formatJalali(a.date)}</td>
                        <td className="p-3 text-emerald-600" dir="ltr">{a.checkIn ? new Date(a.checkIn).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td className="p-3 text-red-600" dir="ltr">{a.checkOut ? new Date(a.checkOut).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs">{attendanceStatusLabels[a.status]}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="leaves">
          <div className="nb-toolbar">
            <div className="nb-toolbar-left">
              <h2>درخواست‌های مرخصی</h2>
              <span className="nb-count-badge">{leaves.length.toLocaleString('fa-IR')} مورد</span>
            </div>
            <div className="nb-toolbar-right">
              <Link href="/dashboard/hr/leaves/new" className="nb-new-btn">
                <Plus className="h-[18px] w-[18px]" />
                درخواست مرخصی
              </Link>
            </div>
          </div>

          {leaves.length === 0 ? (
            <div className="nb-empty">
              <div className="sb-empty-icon">
                <CalendarDays className="h-12 w-12 text-muted-foreground/30" />
              </div>
              <h3>درخواست مرخصی نیست</h3>
            </div>
          ) : (
            <div className="nb-grid nb-grid-grid">
              {leaves.map((l) => {
                const emp = employees.find((e) => e.id === l.employeeId);
                const isPending = l.status === 'pending';
                return (
                  <article key={l.id} className="nb-card" style={{ borderBottomColor: isPending ? '#f59e0b' : l.status === 'approved' ? '#22C55E' : '#EF4444', borderBottomWidth: 3 }}>
                    <div className="nb-card-top">
                      <div className="nb-card-tags">
                        <span className="nb-card-tag" style={{ background: 'rgba(139,92,246,.08)', color: '#8b5cf6' }}>
                          {leaveTypeLabels[l.type] || l.type}
                        </span>
                        {isPending ? (
                          <span className="nb-card-tag" style={{ background: 'rgba(245,158,11,.12)', color: '#f59e0b' }}>در انتظار</span>
                        ) : l.status === 'approved' ? (
                          <span className="nb-card-tag" style={{ background: 'rgba(34,197,94,.12)', color: '#22C55E' }}>تأیید شده</span>
                        ) : (
                          <span className="nb-card-tag" style={{ background: 'rgba(239,68,68,.12)', color: '#EF4444' }}>رد شده</span>
                        )}
                      </div>
                    </div>

                    <h3 className="nb-card-title">{emp ? `${emp.firstName} ${emp.lastName}` : 'کارمند ناشناس'}</h3>
                    <p className="nb-card-excerpt" style={{ WebkitLineClamp: 1 }}>
                      {formatJalali(l.startDate)} تا {formatJalali(l.endDate)}
                    </p>

                    {l.reason && (
                      <div className="mt-2 rounded-lg bg-slate-50/50 p-2 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
                        <p className="line-clamp-2">{l.reason}</p>
                      </div>
                    )}

                    <div className="nb-card-footer">
                      <div className="nb-card-date">
                        <Clock className="h-3 w-3" />
                        {formatJalali(l.createdAt)}
                      </div>
                      {isPending && (
                        <div className="nb-card-quick">
                          <button onClick={() => handleApproveLeave(l.id, true)} title="تأیید" className="text-emerald-500 hover:text-emerald-600">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleApproveLeave(l.id, false)} title="رد" className="text-red-400 hover:text-red-600">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Link href="/dashboard/hr/new" className="nb-fab" aria-label="کارمند جدید">
        <Plus className="h-6 w-6" />
      </Link>

      {/* Employee Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editEmp ? 'ویرایش کارمند' : 'افزودن کارمند'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>نام *</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
              <div className="space-y-2"><Label>نام خانوادگی *</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>سمت</Label><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
              <div className="space-y-2"><Label>دپارتمان</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>تلفن</Label><Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>ایمیل</Label><Input dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>حقوق (تومان)</Label><Input dir="ltr" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button><Button onClick={handleSave}>{editEmp ? 'ذخیره' : 'افزودن'}</Button></DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Dialog */}
      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>ثبت درخواست مرخصی</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>کارمند *</Label>
              <Select value={leaveForm.employeeId} onValueChange={(v) => setLeaveForm({ ...leaveForm, employeeId: v })}>
                <SelectTrigger><SelectValue placeholder="انتخاب..." /></SelectTrigger>
                <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>نوع مرخصی</Label>
              <Select value={leaveForm.type} onValueChange={(v) => setLeaveForm({ ...leaveForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(leaveTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>از تاریخ</Label><JalaliDatePicker value={leaveForm.startDate ? new Date(leaveForm.startDate) : null} onChange={(d) => setLeaveForm({ ...leaveForm, startDate: d ? toLocalDateString(d) : '' })} /></div>
              <div className="space-y-2"><Label>تا تاریخ</Label><JalaliDatePicker value={leaveForm.endDate ? new Date(leaveForm.endDate) : null} onChange={(d) => setLeaveForm({ ...leaveForm, endDate: d ? toLocalDateString(d) : '' })} /></div>
            </div>
            <div className="space-y-2"><Label>دلیل</Label><Input value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setLeaveDialogOpen(false)}>انصراف</Button><Button onClick={handleLeave}>ثبت</Button></DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
