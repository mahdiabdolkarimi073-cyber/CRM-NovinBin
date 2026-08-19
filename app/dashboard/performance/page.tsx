'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, Plus, Trash2, TrendingUp, Award, BarChart3, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatJalali, toLocalDateString } from '@/lib/format';

export default function PerformancePage() {
  const { profile } = useAuth();
  const [goals, setGoals] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [goalDialog, setGoalDialog] = useState(false);
  const [kpiDialog, setKpiDialog] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: '', description: '', type: 'company', ownerId: '', endDate: '' });
  const [kpiForm, setKpiForm] = useState({ employeeId: '', metric: '', target: '100', achieved: '0', period: '', notes: '' });

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const where = isSuperAdmin ? {} : {};
      const [gls, emps, kpiRecs] = await Promise.all([
        fetchData('goals', { where, orderBy: { createdAt: 'desc' } }),
        fetchData('employees', { where, orderBy: { firstName: 'asc' } }),
        fetchData('kpi_records', { where, orderBy: { createdAt: 'desc' }, include: { employee: true } }),
      ]);
      setGoals(gls);
      setEmployees(emps);
      setKpis(kpiRecs);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [profile, isSuperAdmin]);

  useEffect(() => { load(); }, [load]);

  const createGoal = async () => {
    if (!profile || !goalForm.title) { toast.error('عنوان هدف را وارد کنید'); return; }
    try {
      await createData('goals', {
        title: goalForm.title,
        description: goalForm.description || null,
        type: goalForm.type,
        ownerId: goalForm.ownerId || null,
        endDate: goalForm.endDate || null,
        status: 'active',
      });
      toast.success('هدف ایجاد شد'); setGoalDialog(false);
      setGoalForm({ title: '', description: '', type: 'company', ownerId: '', endDate: '' }); load();
    } catch (e: any) {
      toast.error(e.message || 'خطا در ایجاد');
    }
  };

  const createKPI = async () => {
    if (!profile || !kpiForm.employeeId || !kpiForm.metric) { toast.error('کارمند و معیار را وارد کنید'); return; }
    const achieved = Number(kpiForm.achieved) || 0;
    const target = Number(kpiForm.target) || 100;
    const score = Math.round((achieved / target) * 100);
    try {
      await createData('kpi_records', {
        employeeId: kpiForm.employeeId,
        metric: kpiForm.metric,
        target,
        achieved,
        period: kpiForm.period,
        score,
        notes: kpiForm.notes || null,
      });
      toast.success('KPI ثبت شد'); setKpiDialog(false);
      setKpiForm({ employeeId: '', metric: '', target: '100', achieved: '0', period: '', notes: '' }); load();
    } catch (e: any) {
      toast.error(e.message || 'خطا در ثبت');
    }
  };

  const deleteGoal = async (id: string) => {
    if (!confirm('حذف این هدف؟')) return;
    await deleteData('goals', { id }); load();
  };

  const deleteKPI = async (id: string) => {
    if (!confirm('حذف این رکورد KPI؟')) return;
    await deleteData('kpi_records', { id }); load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" /></div>;

  const avgScore = kpis.length > 0 ? Math.round(kpis.reduce((s, k) => s + k.score, 0) / kpis.length) : 0;
  const activeGoals = goals.filter((g) => g.status === 'active').length;

  return (
    <div>
      <PageHeader title="عملکرد و KPI" description="مدیریت اهداف (OKR) و شاخص‌های عملکرد" />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-slate-400">اهداف فعال</div><div className="text-2xl font-bold text-slate-900">{activeGoals.toLocaleString('fa-IR')}</div></div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center"><Target className="w-5 h-5" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-slate-400">میانگین عملکرد</div><div className="text-2xl font-bold text-emerald-600">{avgScore.toLocaleString('fa-IR')}%</div></div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><TrendingUp className="w-5 h-5" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-slate-400">رکوردهای KPI</div><div className="text-2xl font-bold text-slate-900">{kpis.length.toLocaleString('fa-IR')}</div></div>
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center"><BarChart3 className="w-5 h-5" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-slate-400">کارکنان</div><div className="text-2xl font-bold text-slate-900">{employees.length.toLocaleString('fa-IR')}</div></div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Award className="w-5 h-5" /></div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="goals">
        <TabsList>
          <TabsTrigger value="goals"><Target className="w-4 h-4 ml-1" />اهداف (OKR)</TabsTrigger>
          <TabsTrigger value="kpi"><BarChart3 className="w-4 h-4 ml-1" />KPI کارکنان</TabsTrigger>
        </TabsList>

        {/* Goals */}
        <TabsContent value="goals">
          <div className="flex justify-end mb-3">
            <Dialog open={goalDialog} onOpenChange={setGoalDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" /> هدف جدید</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>ایجاد هدف (OKR)</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>عنوان *</Label><Input value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} /></div>
                  <div className="space-y-2"><Label>توضیحات</Label><Textarea value={goalForm.description} onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>نوع هدف</Label>
                      <Select value={goalForm.type} onValueChange={(v) => setGoalForm({ ...goalForm, type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="company">شرکت</SelectItem><SelectItem value="department">واحد</SelectItem><SelectItem value="employee">کارمند</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>مسئول</Label>
                      <select className="w-full border rounded-lg px-3 py-2 text-sm" value={goalForm.ownerId} onChange={(e) => setGoalForm({ ...goalForm, ownerId: e.target.value })}>
                        <option value="">انتخاب...</option>
                        {employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2"><Label>تاریخ پایان</Label><JalaliDatePicker value={goalForm.endDate ? new Date(goalForm.endDate) : null} onChange={(d) => setGoalForm({ ...goalForm, endDate: d ? toLocalDateString(d) : '' })} /></div>
                  <DialogFooter><Button type="button" variant="outline" onClick={() => setGoalDialog(false)}>انصراف</Button><Button onClick={createGoal}>ایجاد</Button></DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {goals.length === 0 ? (
            <Card><EmptyState icon={<Target className="w-8 h-8" />} title="هدفی تعریف نشده" description="اهداف سازمانی، واحد یا کارکنان را ایجاد کنید" /></Card>
          ) : (
            <div className="space-y-3">
              {goals.map((g) => (
                <Card key={g.id} className="hover:shadow-md transition-smooth">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center"><Target className="w-5 h-5" /></div>
                        <div>
                          <div className="font-semibold text-slate-900">{g.title}</div>
                          {g.description && <div className="text-sm text-slate-500 mt-1">{g.description}</div>}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">{g.type === 'company' ? 'شرکت' : g.type === 'department' ? 'واحد' : 'کارمند'}</Badge>
                            {g.endDate && <span className="text-xs text-slate-400">تا {formatJalali(g.endDate)}</span>}
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-50" onClick={() => deleteGoal(g.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-slate-400">پیشرفت:</div>
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${g.progress}%` }} />
                      </div>
                      <span className="text-xs font-medium text-slate-600">{g.progress.toLocaleString('fa-IR')}%</span>
                    </div>
                    {g.keyResults && Array.isArray(g.keyResults) && g.keyResults.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                        {g.keyResults.map((kr: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-slate-600">{kr.title}</span>
                            <span className="text-xs text-slate-400 mr-auto">
                              {Number(kr.progress || 0).toLocaleString('fa-IR')}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* KPI */}
        <TabsContent value="kpi">
          <div className="flex justify-end mb-3">
            <Dialog open={kpiDialog} onOpenChange={setKpiDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" /> ثبت KPI</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>ثبت رکورد KPI</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>کارمند *</Label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={kpiForm.employeeId} onChange={(e) => setKpiForm({ ...kpiForm, employeeId: e.target.value })}>
                      <option value="">انتخاب...</option>
                      {employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>معیار *</Label><Input value={kpiForm.metric} onChange={(e) => setKpiForm({ ...kpiForm, metric: e.target.value })} placeholder="مثلا: تعداد فروش" /></div>
                    <div className="space-y-2"><Label>دوره</Label><Input value={kpiForm.period} onChange={(e) => setKpiForm({ ...kpiForm, period: e.target.value })} placeholder="مثلا: مرداد ۱۴۰۵" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>هدف</Label><Input type="number" dir="ltr" value={kpiForm.target} onChange={(e) => setKpiForm({ ...kpiForm, target: e.target.value })} /></div>
                    <div className="space-y-2"><Label>محقق شده</Label><Input type="number" dir="ltr" value={kpiForm.achieved} onChange={(e) => setKpiForm({ ...kpiForm, achieved: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label>توضیحات</Label><Input value={kpiForm.notes} onChange={(e) => setKpiForm({ ...kpiForm, notes: e.target.value })} /></div>
                  <DialogFooter><Button type="button" variant="outline" onClick={() => setKpiDialog(false)}>انصراف</Button><Button onClick={createKPI}>ثبت</Button></DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {kpis.length === 0 ? (
            <Card><EmptyState icon={<BarChart3 className="w-8 h-8" />} title="رکورد KPI ثبت نشده" /></Card>
          ) : (
            <div className="space-y-3">
              {kpis.map((k) => {
                const scoreColor = k.score >= 80 ? '#10b981' : k.score >= 60 ? '#f59e0b' : '#ef4444';
                return (
                  <Card key={k.id} className="hover:shadow-md transition-smooth">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: scoreColor + '20', color: scoreColor }}>
                            <BarChart3 className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{k.employee?.firstName} {k.employee?.lastName}</div>
                            <div className="text-sm text-slate-500">{k.metric} - {k.period}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold" style={{ color: scoreColor }}>{k.score.toLocaleString('fa-IR')}%</span>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-50" onClick={() => deleteKPI(k.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">هدف: {Number(k.target).toLocaleString('fa-IR')}</span>
                        <span className="text-xs text-slate-400">|</span>
                        <span className="text-xs text-slate-400">محقق: {Number(k.achieved).toLocaleString('fa-IR')}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden mr-2">
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, k.score)}%`, backgroundColor: scoreColor }} />
                        </div>
                      </div>
                      {k.notes && <div className="text-sm text-slate-500 mt-2 pt-2 border-t border-slate-100">{k.notes}</div>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
