'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { GraduationCap, Plus, Search, UserPlus, ClipboardList } from 'lucide-react';
import { formatToman, formatJalali } from '@/lib/format';
import { toast } from 'sonner';

const PAYMENT_TYPES = [
  { key: 'cash', label: 'نقدی' },
  { key: 'cheque', label: 'چک' },
];

const PAYMENT_STATUSES = [
  { key: 'paid', label: 'پرداخت شده', color: '#10b981' },
  { key: 'unpaid', label: 'پرداخت نشده', color: '#ef4444' },
  { key: 'partial', label: 'پرداخت جزئی', color: '#f59e0b' },
];

const PAYMENT_TYPE_LABEL: Record<string, string> = { cash: 'نقدی', cheque: 'چک' };
const PAYMENT_STATUS_LABEL: Record<string, string> = { paid: 'پرداخت شده', unpaid: 'پرداخت نشده', partial: 'پرداخت جزئی' };
const PAYMENT_STATUS_COLOR: Record<string, string> = { paid: '#10b981', unpaid: '#ef4444', partial: '#f59e0b' };

export default function FinanceAcademyPage() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [studentSearch, setStudentSearch] = useState('');
  const [enrollSearch, setEnrollSearch] = useState('');

  const [studentDialog, setStudentDialog] = useState(false);
  const [enrollDialog, setEnrollDialog] = useState(false);
  const [creatingStudent, setCreatingStudent] = useState(false);
  const [creatingEnroll, setCreatingEnroll] = useState(false);

  const [studentForm, setStudentForm] = useState({
    full_name: '',
    national_id: '',
    phone: '',
    email: '',
  });
  const [enrollForm, setEnrollForm] = useState({
    student_id: '',
    course_name: '',
    fee: '',
    payment_type: 'cash',
    payment_status: 'unpaid',
    installment_count: '0',
    notes: '',
  });

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const [st, en] = await Promise.all([
      fetchData('academy_students', { where: {}, orderBy: { createdAt: 'desc' } }),
      fetchData('academy_enrollments', { where: {}, orderBy: { createdAt: 'desc' } }),
    ]);
    let studentsData = st || [];
    let enrollmentsData = en || [];
    if (studentSearch) {
      const q = studentSearch.toLowerCase();
      studentsData = studentsData.filter(
        (s) =>
          (s.fullName || '').toLowerCase().includes(q) ||
          (s.nationalId || '').includes(studentSearch) ||
          (s.phone || '').includes(studentSearch)
      );
    }
    if (enrollSearch) {
      const q = enrollSearch.toLowerCase();
      enrollmentsData = enrollmentsData.filter(
        (e) => (e.courseName || '').toLowerCase().includes(q)
      );
    }
    setStudents(studentsData);
    setEnrollments(enrollmentsData);
    setLoading(false);
  }, [studentSearch, enrollSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getStudentName = (id: string) => {
    const s = students.find((s) => s.id === id);
    return s ? s.fullName : '—';
  };

  const resetStudentForm = () =>
    setStudentForm({ full_name: '', national_id: '', phone: '', email: '' });

  const resetEnrollForm = () =>
    setEnrollForm({
      student_id: '',
      course_name: '',
      fee: '',
      payment_type: 'cash',
      payment_status: 'unpaid',
      installment_count: '0',
      notes: '',
    });

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!studentForm.full_name) {
      toast.error('نام و نام خانوادگی الزامی است');
      return;
    }
    setCreatingStudent(true);
    try {
      await createData('academy_students', {
        fullName: studentForm.full_name,
        nationalId: studentForm.national_id || null,
        phone: studentForm.phone || null,
        email: studentForm.email || null,
        createdBy: profile.id,
      });
      toast.success('هنرجو اضافه شد');
      setStudentDialog(false);
      resetStudentForm();
      loadData();
    } catch (e: any) {
      toast.error('ثبت ناموفق: ' + e.message);
    } finally {
      setCreatingStudent(false);
    }
  };

  const handleCreateEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!enrollForm.student_id) {
      toast.error('انتخاب هنرجو الزامی است');
      return;
    }
    if (!enrollForm.course_name) {
      toast.error('نام دوره الزامی است');
      return;
    }
    setCreatingEnroll(true);
    const fee = Number(enrollForm.fee.replace(/[^0-9]/g, '')) || 0;
    try {
      await createData('academy_enrollments', {
        studentId: enrollForm.student_id,
        courseName: enrollForm.course_name,
        fee,
        paymentType: enrollForm.payment_type,
        paymentStatus: enrollForm.payment_status,
        installmentCount: Number(enrollForm.installment_count) || 0,
        notes: enrollForm.notes || null,
        createdBy: profile.id,
      });
      toast.success('ثبت‌نام دوره انجام شد');
      setEnrollDialog(false);
      resetEnrollForm();
      loadData();
    } catch (e: any) {
      toast.error('ثبت ناموفق: ' + e.message);
    } finally {
      setCreatingEnroll(false);
    }
  };

  // load all students for the enrollment select (unfiltered)
  const [allStudents, setAllStudents] = useState<any[]>([]);
  useEffect(() => {
    if (!profile) return;
    fetchData('academy_students', { where: {}, orderBy: { fullName: 'asc' } })
      .then((data) => setAllStudents(data || []));
  }, [students.length]);

  return (
    <div>
      <PageHeader
        title="آکادمی مالی"
        description="مدیریت هنرجویان و ثبت‌نام دوره‌ها"
      />

      <Tabs defaultValue="students">
        <TabsList className="mb-4">
          <TabsTrigger value="students"><GraduationCap className="w-4 h-4 ml-1" /> هنرجویان</TabsTrigger>
          <TabsTrigger value="enrollments"><ClipboardList className="w-4 h-4 ml-1" /> ثبت‌نام دوره</TabsTrigger>
        </TabsList>

        {/* ===== Students Tab ===== */}
        <TabsContent value="students">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="جستجوی هنرجو..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} className="pr-10 max-w-md" />
            </div>
            <Dialog open={studentDialog} onOpenChange={(o) => { setStudentDialog(o); if (!o) resetStudentForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm"><UserPlus className="w-4 h-4" /> افزودن هنرجو</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>افزودن هنرجوی جدید</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateStudent} className="space-y-4">
                  <div className="space-y-2">
                    <Label>نام و نام خانوادگی *</Label>
                    <Input value={studentForm.full_name} onChange={(e) => setStudentForm({ ...studentForm, full_name: e.target.value })} required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>کد ملی</Label>
                      <Input dir="ltr" value={studentForm.national_id} onChange={(e) => setStudentForm({ ...studentForm, national_id: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>تلفن</Label>
                      <Input dir="ltr" value={studentForm.phone} onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>ایمیل</Label>
                    <Input dir="ltr" type="email" value={studentForm.email} onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })} />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setStudentDialog(false)}>انصراف</Button>
                    <Button type="submit" disabled={creatingStudent}>{creatingStudent ? 'در حال ثبت...' : 'افزودن هنرجو'}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
            </div>
          ) : students.length === 0 ? (
            <Card>
              <EmptyState
                icon={<GraduationCap className="w-8 h-8" />}
                title="هنرجویی یافت نشد"
                description="اولین هنرجو را اضافه کنید"
                action={<Button onClick={() => setStudentDialog(true)}><UserPlus className="w-4 h-4" /> افزودن هنرجو</Button>}
              />
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-slate-500 text-xs">
                        <th className="text-right p-3 font-medium">نام</th>
                        <th className="text-right p-3 font-medium">کد ملی</th>
                        <th className="text-right p-3 font-medium">تلفن</th>
                        <th className="text-right p-3 font-medium">ایمیل</th>
                        <th className="text-right p-3 font-medium">تاریخ ثبت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50 transition-smooth">
                          <td className="p-3 font-medium text-slate-800">{s.fullName}</td>
                          <td className="p-3 text-slate-600" dir="ltr">{s.nationalId || '—'}</td>
                          <td className="p-3 text-slate-600" dir="ltr">{s.phone || '—'}</td>
                          <td className="p-3 text-slate-600" dir="ltr">{s.email || '—'}</td>
                          <td className="p-3 text-slate-500">{formatJalali(s.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== Enrollments Tab ===== */}
        <TabsContent value="enrollments">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="جستجوی دوره..." value={enrollSearch} onChange={(e) => setEnrollSearch(e.target.value)} className="pr-10 max-w-md" />
            </div>
            <Dialog open={enrollDialog} onOpenChange={(o) => { setEnrollDialog(o); if (!o) resetEnrollForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4" /> ثبت‌نام دوره</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>ثبت‌نام دوره جدید</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateEnroll} className="space-y-4">
                  <div className="space-y-2">
                    <Label>هنرجو *</Label>
                    <Select value={enrollForm.student_id} onValueChange={(v) => setEnrollForm({ ...enrollForm, student_id: v })}>
                      <SelectTrigger><SelectValue placeholder="انتخاب هنرجو..." /></SelectTrigger>
                      <SelectContent>
                        {allStudents.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>نام دوره *</Label>
                    <Input value={enrollForm.course_name} onChange={(e) => setEnrollForm({ ...enrollForm, course_name: e.target.value })} required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>شهریه (تومان) *</Label>
                      <Input dir="ltr" value={enrollForm.fee} onChange={(e) => setEnrollForm({ ...enrollForm, fee: e.target.value })} placeholder="0" required />
                    </div>
                    <div className="space-y-2">
                      <Label>تعداد اقساط</Label>
                      <Input dir="ltr" type="number" min="0" value={enrollForm.installment_count} onChange={(e) => setEnrollForm({ ...enrollForm, installment_count: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>نوع پرداخت</Label>
                      <Select value={enrollForm.payment_type} onValueChange={(v) => setEnrollForm({ ...enrollForm, payment_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PAYMENT_TYPES.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>وضعیت پرداخت</Label>
                      <Select value={enrollForm.payment_status} onValueChange={(v) => setEnrollForm({ ...enrollForm, payment_status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PAYMENT_STATUSES.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>توضیحات</Label>
                    <Input value={enrollForm.notes} onChange={(e) => setEnrollForm({ ...enrollForm, notes: e.target.value })} />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setEnrollDialog(false)}>انصراف</Button>
                    <Button type="submit" disabled={creatingEnroll}>{creatingEnroll ? 'در حال ثبت...' : 'ثبت‌نام دوره'}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
            </div>
          ) : enrollments.length === 0 ? (
            <Card>
              <EmptyState
                icon={<ClipboardList className="w-8 h-8" />}
                title="ثبت‌نامی یافت نشد"
                description="اولین ثبت‌نام دوره را انجام دهید"
                action={<Button onClick={() => setEnrollDialog(true)}><Plus className="w-4 h-4" /> ثبت‌نام دوره</Button>}
              />
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-slate-500 text-xs">
                        <th className="text-right p-3 font-medium">هنرجو</th>
                        <th className="text-right p-3 font-medium">دوره</th>
                        <th className="text-right p-3 font-medium">شهریه</th>
                        <th className="text-right p-3 font-medium">نوع پرداخت</th>
                        <th className="text-right p-3 font-medium">اقساط</th>
                        <th className="text-right p-3 font-medium">وضعیت پرداخت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {enrollments.map((e) => (
                        <tr key={e.id} className="hover:bg-slate-50 transition-smooth">
                          <td className="p-3 font-medium text-slate-800">{getStudentName(e.studentId)}</td>
                          <td className="p-3 text-slate-600">{e.courseName}</td>
                          <td className="p-3 font-bold">{formatToman(Number(e.fee))} ت</td>
                          <td className="p-3 text-slate-600">{PAYMENT_TYPE_LABEL[e.paymentType] || e.paymentType}</td>
                          <td className="p-3 text-slate-500" dir="ltr">{e.installmentCount}</td>
                          <td className="p-3">
                            <Badge style={{ backgroundColor: (PAYMENT_STATUS_COLOR[e.paymentStatus] || '#64748b') + '20', color: PAYMENT_STATUS_COLOR[e.paymentStatus] || '#64748b' }}>
                              {PAYMENT_STATUS_LABEL[e.paymentStatus] || e.paymentStatus}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
