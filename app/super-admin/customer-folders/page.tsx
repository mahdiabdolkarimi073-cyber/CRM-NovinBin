'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FolderTree, Plus, Trash2, UserPlus, UserMinus, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Profile, CustomerSocialFolder } from '@/lib/types';

export default function CustomerFoldersPage() {
  const { profile } = useAuth();
  const [folders, setFolders] = useState<CustomerSocialFolder[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<Profile[]>([]);
  const [customerProfiles, setCustomerProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<CustomerSocialFolder | null>(null);
  const [folderMembers, setFolderMembers] = useState<any[]>([]);
  const [folderCustomers, setFolderCustomers] = useState<any[]>([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchData<CustomerSocialFolder>('customer_social_folders', { orderBy: { createdAt: 'desc' } });
      setFolders(data || []);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }, []);

  const loadProfiles = useCallback(async () => {
    try {
      const staff = await fetchData<Profile>('profiles', { where: { userType: 'staff', active: true } });
      setStaffProfiles(staff || []);
      const customers = await fetchData<Profile>('profiles', { where: { userType: 'customer', active: true } });
      setCustomerProfiles(customers || []);
    } catch {}
  }, []);

  useEffect(() => { load(); loadProfiles(); }, [load, loadProfiles]);

  const loadFolderDetails = useCallback(async (folder: CustomerSocialFolder) => {
    setSelectedFolder(folder);
    try {
      const members = await fetchData('customer_social_folder_members', { where: { folderId: folder.id } });
      const customers = await fetchData('customer_social_folder_customers', { where: { folderId: folder.id } });
      setFolderMembers(members || []);
      setFolderCustomers(customers || []);
    } catch (e: any) { toast.error(e.message); }
  }, []);

  const handleCreate = async () => {
    if (!profile || !newName.trim()) { toast.error('نام پوشه را وارد کنید'); return; }
    try {
      await createData('customer_social_folders', { name: newName.trim(), description: newDesc.trim() || null, createdBy: profile.id });
      setNewName(''); setNewDesc(''); setShowCreate(false);
      toast.success('پوشه ایجاد شد');
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDeleteFolder = async (id: string) => {
    try {
      await deleteData('customer_social_folders', { id });
      toast.success('پوشه حذف شد');
      if (selectedFolder?.id === id) setSelectedFolder(null);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAddStaff = async (staffId: string) => {
    if (!profile || !selectedFolder) return;
    try {
      await createData('customer_social_folder_members', { folderId: selectedFolder.id, profileId: staffId, assignedBy: profile.id });
      toast.success('پرسنل اضافه شد');
      loadFolderDetails(selectedFolder);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleRemoveStaff = async (memberId: string) => {
    try {
      await deleteData('customer_social_folder_members', { id: memberId });
      toast.success('پرسنل حذف شد');
      if (selectedFolder) loadFolderDetails(selectedFolder);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAddCustomer = async (customerId: string) => {
    if (!profile || !selectedFolder) return;
    try {
      await createData('customer_social_folder_customers', { folderId: selectedFolder.id, customerId, assignedBy: profile.id });
      toast.success('مشتری اضافه شد');
      loadFolderDetails(selectedFolder);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleRemoveCustomer = async (id: string) => {
    try {
      await deleteData('customer_social_folder_customers', { id });
      toast.success('مشتری حذف شد');
      if (selectedFolder) loadFolderDetails(selectedFolder);
    } catch (e: any) { toast.error(e.message); }
  };

  const getUserLabel = (p: Profile | undefined) => p ? [p.firstName, p.lastName].filter(Boolean).join(' ') || 'کاربر' : 'نامشخص';
  const getInitials = (p: Profile | undefined) => p ? ((p.firstName?.[0] || '') + (p.lastName?.[0] || '')).toUpperCase() || '؟' : '؟';
  const roleLabels: Record<string, string> = { owner: 'مالک', super_admin: 'سوپرادمین', admin: 'مدیر', personnel: 'پرسنل' };

  const memberProfile = (profileId: string) => staffProfiles.find((p) => p.id === profileId);
  const customerProfile = (customerId: string) => customerProfiles.find((p) => p.id === customerId);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="پوشه‌های باشگاه مشتریان" description="مدیریت پوشه‌بندی پرسنل و مدیران برای مشتریان" />

      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          پوشه جدید
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-3">
          {folders.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-slate-400">
              <FolderTree className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">هنوز پوشه‌ای ایجاد نشده</p>
            </CardContent></Card>
          ) : folders.map((folder) => (
            <Card key={folder.id} className={`cursor-pointer transition-smooth hover:shadow-md ${selectedFolder?.id === folder.id ? 'ring-2 ring-amber-500' : ''}`}>
              <CardContent className="p-4" onClick={() => loadFolderDetails(folder)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <FolderTree className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{folder.name}</div>
                      {folder.description && <div className="text-xs text-slate-400 mt-0.5">{folder.description}</div>}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }} className="text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-2">
          {selectedFolder ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{selectedFolder.name}</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setShowAddStaff(true)} className="gap-1.5">
                      <UserPlus className="w-3.5 h-3.5" /> افزودن پرسنل
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowAddCustomer(true)} className="gap-1.5">
                      <UserPlus className="w-3.5 h-3.5" /> افزودن مشتری
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Users className="w-4 h-4" /> پرسنل و مدیران ({folderMembers.length})
                  </h4>
                  <div className="space-y-2">
                    {folderMembers.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">پرسنلی به این پوشه اضافه نشده</p>
                    ) : folderMembers.map((m) => {
                      const mp = memberProfile(m.profileId);
                      return (
                        <div key={m.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-slate-50">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold">{getInitials(mp)}</div>
                            <div>
                              <div className="text-sm font-medium text-slate-900">{getUserLabel(mp)}</div>
                              <div className="text-xs text-slate-400">{mp ? roleLabels[mp.role] || mp.role : ''}</div>
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
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Users className="w-4 h-4" /> مشتریان ({folderCustomers.length})
                  </h4>
                  <div className="space-y-2">
                    {folderCustomers.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">مشتری‌ای به این پوشه اضافه نشده</p>
                    ) : folderCustomers.map((c) => {
                      const cp = customerProfile(c.customerId);
                      return (
                        <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-slate-50">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">{getInitials(cp)}</div>
                            <div>
                              <div className="text-sm font-medium text-slate-900">{getUserLabel(cp)}</div>
                            </div>
                          </div>
                          <button onClick={() => handleRemoveCustomer(c.id)} className="text-slate-300 hover:text-red-500 transition-colors">
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
              <FolderTree className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">یک پوشه را انتخاب کنید</p>
            </CardContent></Card>
          )}
        </div>
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>پوشه جدید</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>نام پوشه *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="نام پوشه..." />
            </div>
            <div>
              <Label>توضیحات</Label>
              <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="توضیحات (اختیاری)..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>انصراف</Button>
            <Button onClick={handleCreate}>ایجاد پوشه</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Staff Dialog */}
      <Dialog open={showAddStaff} onOpenChange={setShowAddStaff}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>افزودن پرسنل به پوشه</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2 py-2">
            {staffProfiles.filter((s) => !folderMembers.find((m) => m.profileId === s.id)).map((s) => (
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
            {staffProfiles.filter((s) => !folderMembers.find((m) => m.profileId === s.id)).length === 0 && (
              <p className="text-center text-sm text-slate-400 py-4">تمام پرسنل در این پوشه هستند</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Customer Dialog */}
      <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>افزودن مشتری به پوشه</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2 py-2">
            {customerProfiles.filter((c) => !folderCustomers.find((fc) => fc.customerId === c.id)).map((c) => (
              <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg border">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">{getInitials(c)}</div>
                  <div className="text-sm font-medium">{getUserLabel(c)}</div>
                </div>
                <Button size="sm" onClick={() => handleAddCustomer(c.id)} className="gap-1">
                  <UserPlus className="w-3.5 h-3.5" /> افزودن
                </Button>
              </div>
            ))}
            {customerProfiles.filter((c) => !folderCustomers.find((fc) => fc.customerId === c.id)).length === 0 && (
              <p className="text-center text-sm text-slate-400 py-4">تمام مشتریان در این پوشه هستند</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
