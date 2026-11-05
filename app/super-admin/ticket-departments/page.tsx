'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Headset, Plus, Trash2, UserPlus, UserMinus, Users, X, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Profile, TicketDepartment, TicketDepartmentMember } from '@/lib/types';

export default function TicketDepartmentsPage() {
  const { profile } = useAuth();
  const [departments, setDepartments] = useState<TicketDepartment[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [selectedDept, setSelectedDept] = useState<TicketDepartment | null>(null);
  const [deptMembers, setDeptMembers] = useState<TicketDepartmentMember[]>([]);
  const [showAddStaff, setShowAddStaff] = useState(false);

  const [editDialog, setEditDialog] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteDept, setDeleteDept] = useState<TicketDepartment | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchData<TicketDepartment>('ticket_departments', { orderBy: { createdAt: 'desc' } });
      setDepartments(data || []);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }, []);

  const loadProfiles = useCallback(async () => {
    try {
      const staff = await fetchData<Profile>('profiles', { where: { userType: 'staff', role: { in: ['personnel', 'admin', 'super_admin'] }, active: true } });
      setStaffProfiles(staff || []);
    } catch {}
  }, []);

  useEffect(() => { load(); loadProfiles(); }, [load, loadProfiles]);

  const loadDeptDetails = useCallback(async (dept: TicketDepartment) => {
    setSelectedDept(dept);
    try {
      const members = await fetchData<TicketDepartmentMember>('ticket_department_members', { where: { departmentId: dept.id } });
      setDeptMembers(members || []);
    } catch (e: any) { toast.error(e.message); }
  }, []);

  const handleCreate = async () => {
    if (!profile || !newName.trim()) { toast.error('نام دپارتمان را وارد کنید'); return; }
    try {
      await createData('ticket_departments', { name: newName.trim(), description: newDesc.trim() || null, active: true, createdBy: profile.id });
      setNewName(''); setNewDesc(''); setShowCreate(false);
      toast.success('دپارتمان ایجاد شد');
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const openEdit = (dept: TicketDepartment) => {
    setEditName(dept.name);
    setEditDesc(dept.description || '');
    setEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedDept || !editName.trim()) { toast.error('نام دپارتمان را وارد کنید'); return; }
    setSavingEdit(true);
    try {
      await updateData('ticket_departments', { id: selectedDept.id }, {
        name: editName.trim(),
        description: editDesc.trim() || null,
      });
      toast.success('دپارتمان به‌روزرسانی شد');
      setEditDialog(false);
      load();
      if (selectedDept) {
        loadDeptDetails({ ...selectedDept, name: editName.trim(), description: editDesc.trim() || null });
      }
    } catch (e: any) { toast.error(e.message); }
    setSavingEdit(false);
  };

  const handleDeleteDept = async (dept: TicketDepartment) => {
    try {
      await deleteData('ticket_departments', { id: dept.id });
      toast.success('دپارتمان حذف شد');
      if (selectedDept?.id === dept.id) setSelectedDept(null);
      setDeleteDept(null);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAddStaff = async (staffId: string) => {
    if (!profile || !selectedDept) return;
    try {
      await createData('ticket_department_members', { departmentId: selectedDept.id, profileId: staffId, assignedBy: profile.id });
      toast.success('پرسنل اضافه شد');
      loadDeptDetails(selectedDept);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleRemoveStaff = async (memberId: string) => {
    try {
      await deleteData('ticket_department_members', { id: memberId });
      toast.success('پرسنل حذف شد');
      if (selectedDept) loadDeptDetails(selectedDept);
    } catch (e: any) { toast.error(e.message); }
  };

  const getUserLabel = (p: Profile | undefined) => {
    if (!p) return 'کاربر';
    if (p.fullName) return p.fullName;
    return [p.firstName, p.lastName].filter(Boolean).join(' ') || 'کاربر';
  };
  const getInitials = (p: Profile | undefined) => {
    if (!p) return '؟';
    if (p.fullName) return p.fullName[0] || '؟';
    return ((p.firstName?.[0] || '') + (p.lastName?.[0] || '')).toUpperCase() || '؟';
  };
  const roleLabels: Record<string, string> = { super_admin: 'سوپرادمین', admin: 'مدیر', personnel: 'پرسنل' };

  const memberProfile = (profileId: string) => staffProfiles.find((p) => p.id === profileId);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="دپارتمان‌های تیکت" description="مدیریت دپارتمان‌ها و اعضای آن‌ها برای تیکت‌های پشتیبانی" />

      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          دپارتمان جدید
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-3">
          {departments.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-slate-400">
              <Headset className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">هنوز دپارتمانی ایجاد نشده</p>
            </CardContent></Card>
          ) : departments.map((dept) => (
            <Card key={dept.id} className={`cursor-pointer transition-smooth hover:shadow-md ${selectedDept?.id === dept.id ? 'ring-2 ring-amber-500' : ''}`}>
              <CardContent className="p-3 mobile:p-4" onClick={() => loadDeptDetails(dept)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 mobile:w-10 mobile:h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Headset className="w-4 h-4 mobile:w-5 mobile:h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs mobile:text-sm font-bold text-slate-900 truncate">{dept.name}</div>
                      {dept.description && <div className="text-[10px] mobile:text-xs text-slate-400 mt-0.5 truncate">{dept.description}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(dept); }} className="text-slate-300 hover:text-amber-500 transition-colors p-1" title="ویرایش">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteDept(dept); }} className="text-slate-300 hover:text-red-500 transition-colors p-1" title="حذف">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-2">
          {selectedDept ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-sm mobile:text-base">{selectedDept.name}</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setShowAddStaff(true)} className="gap-1.5">
                      <UserPlus className="w-3.5 h-3.5" /> افزودن پرسنل
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(selectedDept)} className="gap-1.5">
                      <Pencil className="w-3.5 h-3.5" /> ویرایش
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-xs mobile:text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Users className="w-4 h-4" /> اعضای دپارتمان ({deptMembers.length})
                  </h4>
                  <div className="space-y-2">
                    {deptMembers.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">پرسنلی به این دپارتمان اضافه نشده</p>
                    ) : deptMembers.map((m) => {
                      const mp = memberProfile(m.profileId);
                      return (
                        <div key={m.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-slate-50">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold">{getInitials(mp)}</div>
                            <div>
                              <div className="text-xs mobile:text-sm font-medium text-slate-900">{getUserLabel(mp)}</div>
                              <div className="text-[10px] mobile:text-xs text-slate-400">{mp ? roleLabels[mp.role] || mp.role : ''}</div>
                            </div>
                          </div>
                          <button onClick={() => handleRemoveStaff(m.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="py-12 text-center text-slate-400">
              <Headset className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">یک دپارتمان را انتخاب کنید</p>
            </CardContent></Card>
          )}
        </div>
      </div>

      {/* Create Department Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>دپارتمان جدید</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>نام دپارتمان *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="نام دپارتمان..." />
            </div>
            <div>
              <Label>توضیحات</Label>
              <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="توضیحات (اختیاری)..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>انصراف</Button>
            <Button onClick={handleCreate}>ایجاد دپارتمان</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Department Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-amber-600" />
              ویرایش دپارتمان
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>نام دپارتمان *</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="نام دپارتمان..." />
            </div>
            <div>
              <Label>توضیحات</Label>
              <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="توضیحات (اختیاری)..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>انصراف</Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
              ذخیره تغییرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Department Confirm Dialog */}
      <Dialog open={!!deleteDept} onOpenChange={(o) => !o && setDeleteDept(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>حذف دپارتمان</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            آیا از حذف دپارتمان «{deleteDept?.name || ''}» مطمئن هستید؟ تمام اعضای این دپارتمان حذف خواهند شد و تیکت‌های مرتبط بدون دپارتمان می‌مانند.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDept(null)}>انصراف</Button>
            <Button variant="destructive" onClick={() => deleteDept && handleDeleteDept(deleteDept)}>
              <Trash2 className="w-4 h-4" /> حذف دپارتمان
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Staff Dialog */}
      <Dialog open={showAddStaff} onOpenChange={setShowAddStaff}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>افزودن پرسنل به دپارتمان</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2 py-2">
            {staffProfiles.filter((s) => !deptMembers.find((m) => m.profileId === s.id)).map((s) => (
              <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg border">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold">{getInitials(s)}</div>
                  <div>
                    <div className="text-sm font-medium">{getUserLabel(s)}</div>
                    <div className="text-xs text-slate-400">{roleLabels[s.role] || s.role}</div>
                  </div>
                </div>
                <Button size="sm" onClick={() => handleAddStaff(s.id)} className="gap-1">
                  <UserPlus className="w-3.5 h-3.5" /> افزودن
                </Button>
              </div>
            ))}
            {staffProfiles.filter((s) => !deptMembers.find((m) => m.profileId === s.id)).length === 0 && (
              <p className="text-center text-sm text-slate-400 py-4">تمام پرسنل در این دپارتمان هستند</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
