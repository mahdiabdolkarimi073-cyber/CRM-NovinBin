'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCog, Plus, Trash2, Pencil, Clock, CalendarDays, Check, X, Eye } from 'lucide-react';
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
      setEmployees(emps);
      setAttendance(att);
      setLeaves(lvs);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }, [profile, isSuperAdmin]);

  useEffect(() => { load(); }, [load]);

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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <PageHeader title="منابع انسانی" description="مدیریت کارکنان، حضور و غیاب و مرخصی" />

      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees"><UserCog className="w-4 h-4 ml-1" />کارکنان</TabsTrigger>
          <TabsTrigger value="attendance"><Clock className="w-4 h-4 ml-1" />حضور و غیاب</TabsTrigger>
          <TabsTrigger value="leaves"><CalendarDays className="w-4 h-4 ml-1" />مرخصی</TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <div className="flex justify-end mb-3">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button size="sm" onClick={() => { setEditEmp(null); setForm({ firstName: '', lastName: '', position: '', department: '', phone: '', email: '', salary: '' }); }}><Plus className="w-4 h-4" /> کارمند جدید</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
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
          </div>
          {employees.length === 0 ? (
            <Card><EmptyState icon={<UserCog className="w-8 h-8" />} title="کارمندی ثبت نشده" description="کارکنان سازمان را اضافه کنید" /></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employees.map((emp) => (
                <Card key={emp.id} className="hover:shadow-md transition-smooth">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-11 h-11"><AvatarFallback className="bg-sky-100 text-sky-700">{(emp.firstName?.[0] || '') + (emp.lastName?.[0] || '')}</AvatarFallback></Avatar>
                        <div>
                          <div className="font-semibold text-slate-900">{emp.firstName} {emp.lastName}</div>
                          <div className="text-xs text-slate-400">{emp.position || '—'}</div>
                        </div>
                      </div>
                      <Badge style={{ backgroundColor: (statusColors[emp.status] || '#64748b') + '20', color: statusColors[emp.status] || '#64748b' }} className="text-xs">{statusLabels[emp.status]}</Badge>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      {emp.department && <div className="text-slate-500">دپارتمان: {emp.department}</div>}
                      {emp.phone && <div className="text-slate-500" dir="ltr">تلفن: {emp.phone}</div>}
                      <div className="text-slate-500">حقوق: {formatToman(Number(emp.salary))} ت</div>
                      <div className="text-slate-400 text-xs">تاریخ استخدام: {formatJalali(emp.hireDate)}</div>
                    </div>
                    <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100">
                      <Link href={`/dashboard/hr/${emp.id}`}><Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Eye className="w-4 h-4 text-sky-500" /></Button></Link>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(emp)}><Pencil className="w-4 h-4 text-slate-500" /></Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-50" onClick={() => handleDelete(emp.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="attendance">
          {attendance.length === 0 ? (
            <Card><EmptyState icon={<Clock className="w-8 h-8" />} title="رکورد حضور و غیابی نیست" /></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {attendance.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-smooth">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="text-sm font-medium">{formatJalali(a.date)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        {a.checkIn && <span className="text-emerald-600" dir="ltr">ورود: {new Date(a.checkIn).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>}
                        {a.checkOut && <span className="text-red-600" dir="ltr">خروج: {new Date(a.checkOut).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>}
                        <Badge variant="outline" className="text-xs">{attendanceStatusLabels[a.status]}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="leaves">
          <div className="flex justify-end mb-3">
            <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" /> درخواست مرخصی</Button></DialogTrigger>
              <DialogContent className="max-w-md">
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
          {leaves.length === 0 ? (
            <Card><EmptyState icon={<CalendarDays className="w-8 h-8" />} title="درخواست مرخصی نیست" /></Card>
          ) : (
            <div className="space-y-3">
              {leaves.map((l) => (
                <Card key={l.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs text-slate-400">{leaveTypeLabels[l.type]} - {formatJalali(l.startDate)} تا {formatJalali(l.endDate)}</div>
                        {l.reason && <div className="text-sm text-slate-500 mt-1">{l.reason}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        {l.status === 'pending' ? (
                          <>
                            <Button size="sm" variant="outline" className="h-8 text-xs text-emerald-600 hover:bg-emerald-50" onClick={() => handleApproveLeave(l.id, true)}><Check className="w-3 h-3" /> تأیید</Button>
                            <Button size="sm" variant="outline" className="h-8 text-xs text-red-600 hover:bg-red-50" onClick={() => handleApproveLeave(l.id, false)}><X className="w-3 h-3" /> رد</Button>
                          </>
                        ) : (
                          <Badge variant={l.status === 'approved' ? 'default' : 'destructive'} className="text-xs">{l.status === 'approved' ? 'تأیید شده' : 'رد شده'}</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
