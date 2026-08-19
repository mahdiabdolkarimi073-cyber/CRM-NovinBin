'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, User, Briefcase, Phone, Mail, Calendar, Award, FileText, CheckSquare, Activity, DollarSign } from 'lucide-react';
import { fetchData } from '@/lib/data-client';
import { formatToman, formatJalali, relativeTime } from '@/lib/format';

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [contracts, setContracts] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || !params.id) return;
    (async () => {
      setLoading(true);
      const emps = await fetchData('employees', { where: { id: params.id as string} });
      const emp = emps[0] || null;
      setEmployee(emp);
      if (emp) {
        const [cons, tks] = await Promise.all([
          fetchData('staff_contracts', { where: { profileId: emp.id }, orderBy: { startDate: 'desc' } }),
          fetchData('tasks', { where: { assignedTo: emp.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
        ]);
        setContracts(cons || []);
        setKpis([]);
        setTasks(tks || []);
      }
      setLoading(false);
    })();
  }, [params.id]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" /></div>;
  if (!employee) return <div className="text-center py-16"><p className="text-slate-500">کارمند یافت نشد</p><Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/hr')}>بازگشت</Button></div>;

  const statusLabels: Record<string, string> = { active: 'فعال', on_leave: 'مرخصی', terminated: 'تسویه شده' };
  const statusColors: Record<string, string> = { active: '#10b981', on_leave: '#f59e0b', terminated: '#64748b' };

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push('/dashboard/hr')}>
        <ArrowRight className="w-4 h-4" /> بازگشت
      </Button>

      <Card className="mb-6 overflow-hidden">
        <div className="h-24 bg-gradient-to-l from-sky-500 to-blue-700" />
        <CardContent className="p-6 -mt-12">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div className="flex items-end gap-4">
              <Avatar className="w-20 h-20 border-4 border-white shadow-lg">
                <AvatarFallback className="bg-sky-100 text-sky-700 text-2xl">{(employee.firstName?.[0] || '') + (employee.lastName?.[0] || '')}</AvatarFallback>
              </Avatar>
              <div className="mb-2">
                <h1 className="text-2xl font-bold text-slate-900">{employee.firstName} {employee.lastName}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge style={{ backgroundColor: (statusColors[employee.status] || '#64748b') + '20', color: statusColors[employee.status] }}>{statusLabels[employee.status]}</Badge>
                  {employee.position && <span className="text-sm text-slate-400">{employee.position}</span>}
                  {employee.department && <span className="text-sm text-slate-400">- {employee.department}</span>}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="info">
        <TabsList className="w-full justify-start overflow-x-auto h-auto py-1">
          <TabsTrigger value="info" className="gap-1.5"><User className="w-4 h-4" /> اطلاعات</TabsTrigger>
          <TabsTrigger value="contracts" className="gap-1.5"><FileText className="w-4 h-4" /> قرارداد</TabsTrigger>
          <TabsTrigger value="kpi" className="gap-1.5"><Award className="w-4 h-4" /> عملکرد</TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5"><CheckSquare className="w-4 h-4" /> وظایف</TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5"><Activity className="w-4 h-4" /> فعالیت</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader><CardTitle className="text-base">اطلاعات شخصی و کاری</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow icon={Phone} label="تلفن" value={employee.phone} ltr />
                <InfoRow icon={Mail} label="ایمیل" value={employee.email} ltr />
                <InfoRow icon={Briefcase} label="سمت" value={employee.position} />
                <InfoRow icon={Briefcase} label="دپارتمان" value={employee.department} />
                <InfoRow icon={Calendar} label="تاریخ استخدام" value={formatJalali(employee.hireDate)} />
                <InfoRow icon={DollarSign} label="حقوق" value={`${formatToman(Number(employee.salary))} ت`} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts">
          <Card>
            <CardHeader><CardTitle className="text-base">قراردادها</CardTitle></CardHeader>
            <CardContent>
              {contracts.length === 0 ? <p className="text-center text-slate-400 py-8 text-sm">قراردادی ثبت نشده</p> : (
                <div className="space-y-3">
                  {contracts.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center"><FileText className="w-4 h-4" /></div>
                        <div><div className="text-sm font-medium">{c.contractType === 'permanent' ? 'قرارداد دائم' : c.contractType === 'monthly' ? 'قرارداد ماهانه' : 'قرارداد موقت'}</div><div className="text-xs text-slate-400">{formatJalali(c.startDate)} {c.endDate ? `تا ${formatJalali(c.endDate)}` : ''}</div></div>
                      </div>
                      <div className="flex items-center gap-2"><span className="text-sm font-bold">{formatToman(Number(c.salary))} ت</span></div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kpi">
          <Card>
            <CardHeader><CardTitle className="text-base">رکوردهای KPI</CardTitle></CardHeader>
            <CardContent>
              {kpis.length === 0 ? <p className="text-center text-slate-400 py-8 text-sm">رکورد KPI ثبت نشده</p> : (
                <div className="space-y-3">
                  {kpis.map((k) => {
                    const scoreColor = k.score >= 80 ? '#10b981' : k.score >= 60 ? '#f59e0b' : '#ef4444';
                    return (
                      <div key={k.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div><div className="text-sm font-medium">{k.metric}</div><div className="text-xs text-slate-400">{k.period} - هدف: {Number(k.target).toLocaleString('fa-IR')} / محقق: {Number(k.achieved).toLocaleString('fa-IR')}</div></div>
                        <span className="text-lg font-bold" style={{ color: scoreColor }}>{k.score.toLocaleString('fa-IR')}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardHeader><CardTitle className="text-base">وظایف ({tasks.length.toLocaleString('fa-IR')})</CardTitle></CardHeader>
            <CardContent>
              {tasks.length === 0 ? <p className="text-center text-slate-400 py-8 text-sm">وظیفه‌ای ارجاع نشده</p> : (
                <div className="space-y-2">
                  {tasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center"><CheckSquare className="w-4 h-4" /></div>
                        <div><div className="text-sm font-medium">{t.title}</div><div className="text-xs text-slate-400">{relativeTime(t.createdAt)}</div></div>
                      </div>
                      <Badge variant="outline" className="text-xs">{t.status === 'new' ? 'جدید' : t.status === 'in_progress' ? 'در حال انجام' : t.status === 'completed' ? 'تکمیل' : t.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader><CardTitle className="text-base">تایم‌لاین فعالیت</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-sky-500 mt-1.5" />
                  <div><span className="text-slate-700">کارمند در سیستم ثبت شد</span><div className="text-xs text-slate-400 mt-0.5">{relativeTime(employee.createdAt)}</div></div>
                </div>
                {tasks.slice(0, 5).map((t) => (
                  <div key={t.id} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5" />
                    <div><span className="text-slate-700">وظیفه: {t.title}</span><div className="text-xs text-slate-400 mt-0.5">{relativeTime(t.createdAt)}</div></div>
                  </div>
                ))}
                {kpis.slice(0, 3).map((k) => (
                  <div key={k.id} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5" />
                    <div><span className="text-slate-700">KPI: {k.metric} - {k.score.toLocaleString('fa-IR')}%</span><div className="text-xs text-slate-400 mt-0.5">{relativeTime(k.createdAt)}</div></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, ltr }: { icon: any; label: string; value: string | null; ltr?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><Icon className="w-4 h-4" /></div>
      <div><div className="text-xs text-slate-400">{label}</div><div className="text-sm font-medium text-slate-700" dir={ltr ? 'ltr' : 'rtl'}>{value || '—'}</div></div>
    </div>
  );
}
