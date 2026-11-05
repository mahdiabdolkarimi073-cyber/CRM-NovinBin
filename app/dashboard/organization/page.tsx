'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Network, Plus, Trash2, Building2, Users, GitBranch } from 'lucide-react';
import { toast } from 'sonner';

export default function OrganizationPage() {
  const { profile } = useAuth();
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchDialog, setBranchDialog] = useState(false);
  const [deptDialog, setDeptDialog] = useState(false);
  const [teamDialog, setTeamDialog] = useState(false);
  const [branchForm, setBranchForm] = useState({ name: '', address: '', phone: '' });
  const [deptForm, setDeptForm] = useState({ name: '' });
  const [teamForm, setTeamForm] = useState({ name: '', departmentId: '' });

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [brs, depts, tms] = await Promise.all([
        fetchData('branches', { where: {}, orderBy: { name: 'asc' } }),
        fetchData('departments', { where: {}, orderBy: { name: 'asc' } }),
        fetchData('teams', { where: {}, orderBy: { name: 'asc' }, include: { department: true } }),
      ]);
      setBranches(brs);
      setDepartments(depts);
      setTeams(tms);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createBranch = async () => {
    if (!profile || !branchForm.name) { toast.error('نام شعبه را وارد کنید'); return; }
    try {
      await createData('branches', { ...branchForm });
      toast.success('شعبه ایجاد شد'); setBranchDialog(false); setBranchForm({ name: '', address: '', phone: '' }); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const createDept = async () => {
    if (!profile || !deptForm.name) { toast.error('نام واحد را وارد کنید'); return; }
    try {
      await createData('departments', { ...deptForm });
      toast.success('واحد ایجاد شد'); setDeptDialog(false); setDeptForm({ name: '' }); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const createTeam = async () => {
    if (!profile || !teamForm.name) { toast.error('نام تیم را وارد کنید'); return; }
    try {
      await createData('teams', { name: teamForm.name, departmentId: teamForm.departmentId || null });
      toast.success('تیم ایجاد شد'); setTeamDialog(false); setTeamForm({ name: '', departmentId: '' }); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const deleteItem = async (model: string, id: string, label: string) => {
    if (!confirm(`حذف ${label}؟`)) return;
    try {
      await deleteData(model, { id });
      toast.success('حذف شد'); load();
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <PageHeader title="ساختار سازمانی" description="مدیریت شعب، واحدها و تیم‌ها" />

      {/* Org chart visual */}
      <Card className="mb-6 overflow-hidden">
        <div className="bg-gradient-to-l from-sky-500 to-blue-700 p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <Network className="w-6 h-6" />
            <h2 className="text-lg font-bold">چارت سازمانی</h2>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              <span className="text-sm">{branches.length.toLocaleString('fa-IR')} شعبه</span>
            </div>
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              <span className="text-sm">{departments.length.toLocaleString('fa-IR')} واحد سازمانی</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span className="text-sm">{teams.length.toLocaleString('fa-IR')} تیم</span>
            </div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="branches">
        <TabsList>
          <TabsTrigger value="branches"><Building2 className="w-4 h-4 ml-1" />شعب</TabsTrigger>
          <TabsTrigger value="departments"><GitBranch className="w-4 h-4 ml-1" />واحدها</TabsTrigger>
          <TabsTrigger value="teams"><Users className="w-4 h-4 ml-1" />تیم‌ها</TabsTrigger>
        </TabsList>

        {/* Branches */}
        <TabsContent value="branches">
          <div className="flex justify-end mb-3">
            <Dialog open={branchDialog} onOpenChange={setBranchDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" /> شعبه جدید</Button></DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>ایجاد شعبه</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>نام شعبه *</Label><Input value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>آدرس</Label><Input value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} /></div>
                  <div className="space-y-2"><Label>تلفن</Label><Input dir="ltr" value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} /></div>
                  <DialogFooter><Button type="button" variant="outline" onClick={() => setBranchDialog(false)}>انصراف</Button><Button onClick={createBranch}>ایجاد</Button></DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {branches.length === 0 ? (
            <Card><EmptyState icon={<Building2 className="w-8 h-8" />} title="شعبه‌ای تعریف نشده" /></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {branches.map((b) => (
                <Card key={b.id} className="hover:shadow-md transition-smooth">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center"><Building2 className="w-5 h-5" /></div>
                        <div><div className="font-semibold">{b.name}</div>{b.address && <div className="text-xs text-slate-400">{b.address}</div>}</div>
                      </div>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-50" onClick={() => deleteItem('branches', b.id, 'شعبه')}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                    {b.phone && <div className="text-sm text-slate-500" dir="ltr">{b.phone}</div>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Departments */}
        <TabsContent value="departments">
          <div className="flex justify-end mb-3">
            <Dialog open={deptDialog} onOpenChange={setDeptDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" /> واحد جدید</Button></DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle>ایجاد واحد سازمانی</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>نام واحد *</Label><Input value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} /></div>
                  <DialogFooter><Button type="button" variant="outline" onClick={() => setDeptDialog(false)}>انصراف</Button><Button onClick={createDept}>ایجاد</Button></DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {departments.length === 0 ? (
            <Card><EmptyState icon={<GitBranch className="w-8 h-8" />} title="واحدی تعریف نشده" /></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {departments.map((d) => {
                const teamCount = teams.filter((t) => t.departmentId === d.id).length;
                return (
                  <Card key={d.id} className="hover:shadow-md transition-smooth">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center"><GitBranch className="w-4 h-4" /></div>
                          <div><div className="font-medium text-sm">{d.name}</div><div className="text-xs text-slate-400">{teamCount.toLocaleString('fa-IR')} تیم</div></div>
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-red-50" onClick={() => deleteItem('departments', d.id, 'واحد')}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Teams */}
        <TabsContent value="teams">
          <div className="flex justify-end mb-3">
            <Dialog open={teamDialog} onOpenChange={setTeamDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" /> تیم جدید</Button></DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>ایجاد تیم</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>نام تیم *</Label><Input value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>واحد سازمانی</Label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={teamForm.departmentId} onChange={(e) => setTeamForm({ ...teamForm, departmentId: e.target.value })}>
                      <option value="">بدون واحد</option>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <DialogFooter><Button type="button" variant="outline" onClick={() => setTeamDialog(false)}>انصراف</Button><Button onClick={createTeam}>ایجاد</Button></DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {teams.length === 0 ? (
            <Card><EmptyState icon={<Users className="w-8 h-8" />} title="تیمی تعریف نشده" /></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {teams.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-smooth">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><Users className="w-4 h-4" /></div>
                        <div>
                          <div className="font-medium text-sm">{t.name}</div>
                          {t.department?.name && <div className="text-xs text-slate-400">واحد: {t.department.name}</div>}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-50" onClick={() => deleteItem('teams', t.id, 'تیم')}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
