'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCheck, Plus, Search, User, Phone, MapPin, Eye, Pencil, Trash2 } from 'lucide-react';
import { relativeTime } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type { MyCustomer, Profile } from '@/lib/types';

const emptyForm = {
  first_name: '',
  last_name: '',
  mobile: '',
  city: '',
  province: '',
  profile_id: '',
};

export default function MyCustomersPage() {
  const { profile } = useAuth();
  const [customers, setCustomers] = useState<MyCustomer[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterUser, setFilterUser] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewCustomer, setViewCustomer] = useState<MyCustomer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<MyCustomer | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadCustomers = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const where: any = {};
      if (isSuperAdmin && filterUser !== 'all') {
        where.profileId = filterUser;
      }
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { companyName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { mobile: { contains: search, mode: 'insensitive' } },
        ];
      }
      const data = await fetchData('my_customers', { where, orderBy: { createdAt: 'desc' } });
      setCustomers((data as MyCustomer[]) || []);

      if (isSuperAdmin) {
        const staffData = await fetchData<Profile>('profiles', { where: { userType: 'staff' } });
        setStaff(staffData || []);
      }
    } catch (error: any) {
      toast.error('بارگذاری مشتریان ناموفق: ' + error.message);
    }
    setLoading(false);
  }, [profile, isSuperAdmin, filterUser, search]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!form.first_name) {
      toast.error('نام مشتری را وارد کنید');
      return;
    }
    setCreating(true);
    try {
      await createData('my_customers', {
        type: 'individual',
        firstName: form.first_name || null,
        lastName: form.last_name || null,
        mobile: form.mobile || null,
        city: form.city || null,
        province: form.province || null,
        profileId: isSuperAdmin && form.profile_id ? form.profile_id : profile.id,
      });
      toast.success('مشتری با موفقیت ایجاد شد');
      setDialogOpen(false);
      setForm(emptyForm);
      loadCustomers();
    } catch (error: any) {
      toast.error('ایجاد مشتری ناموفق: ' + error.message);
    }
    setCreating(false);
  };

  const openEdit = (c: MyCustomer) => {
    setEditingCustomer(c);
    setForm({
      first_name: c.firstName || '',
      last_name: c.lastName || '',
      mobile: c.mobile || '',
      city: c.city || '',
      province: c.province || '',
      profile_id: c.profileId,
    });
    setEditDialogOpen(true);
  };

  const openView = (c: MyCustomer) => {
    setViewCustomer(c);
    setViewDialogOpen(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setSaving(true);
    try {
      await updateData('my_customers', { id: editingCustomer.id }, {
        firstName: form.first_name || null,
        lastName: form.last_name || null,
        mobile: form.mobile || null,
        city: form.city || null,
        province: form.province || null,
      });
      toast.success('مشتری ویرایش شد');
      setEditDialogOpen(false);
      setEditingCustomer(null);
      loadCustomers();
    } catch (error: any) {
      toast.error('ویرایش ناموفق: ' + error.message);
    }
    setSaving(false);
  };

  const handleDelete = async (c: MyCustomer) => {
    const name = fullName(c.firstName, c.lastName);
    if (!confirm(`حذف مشتری «${name}»؟`)) return;
    try {
      await deleteData('my_customers', { id: c.id });
      toast.success('مشتری حذف شد');
      loadCustomers();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const getStaffName = (id: string) => {
    const s = staff.find((p) => p.id === id);
    return s ? fullName(s.firstName, s.lastName) : null;
  };

  const renderFormFields = () => (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>نام</Label>
          <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>نام خانوادگی</Label>
          <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>موبایل</Label>
        <Input dir="ltr" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>استان</Label>
          <Input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>شهر</Label>
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
      </div>
      {isSuperAdmin && (
        <div className="space-y-2">
          <Label>اختصاص به کاربر (سوپرادمین)</Label>
          <Select value={form.profile_id} onValueChange={(v) => setForm({ ...form, profile_id: v === 'none' ? '' : v })}>
            <SelectTrigger><SelectValue placeholder="خودم" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">خودم</SelectItem>
              {staff.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {fullName(s.firstName, s.lastName)} ({s.role === 'admin' ? 'مدیر' : s.role === 'super_admin' ? 'سوپرادمین' : s.role === 'owner' ? 'مدیر سازمان' : 'پرسنل'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  );

  return (
    <div>
      <PageHeader
        title="مشتریان من"
        description={isSuperAdmin ? 'مشتریان شخصی همه کاربران — می‌توانید برای خود یا هر کاربری مشتری اضافه کنید' : 'مشتریان شخصی شما — فقط شما و سوپرادمین این مشتریان را می‌بینید'}
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4" />
                مشتری جدید
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>افزودن مشتری شخصی جدید</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                {renderFormFields()}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? 'در حال ایجاد...' : 'ایجاد مشتری'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="جستجو مشتری..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        {isSuperAdmin && (
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="همه کاربران" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه کاربران</SelectItem>
              {staff.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {fullName(s.firstName, s.lastName)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
        </div>
      ) : customers.length === 0 ? (
        <Card>
          <EmptyState
            icon={<UserCheck className="w-8 h-8" />}
            title="مشتری‌ای یافت نشد"
            description="مشتریان شخصی خود را اینجا اضافه کنید. این مشتریان فقط برای شما و سوپرادمین قابل مشاهده هستند"
            action={
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4" />
                افزودن مشتری
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c) => {
            const name = fullName(c.firstName, c.lastName);
            const ownerName = isSuperAdmin ? getStaffName(c.profileId) : null;
            return (
              <Card key={c.id} className="hover:shadow-md transition-smooth group h-full">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="w-11 h-11">
                      <AvatarFallback className="bg-sky-100 text-sky-700">
                        {name?.[0] || <User className="w-5 h-5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 truncate group-hover:text-sky-600 transition-smooth">{name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{relativeTime(c.createdAt)}</div>
                      {ownerName && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          <span className="text-slate-400">مالک: </span>{ownerName}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    {c.mobile && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span dir="ltr">{c.mobile}</span>
                      </div>
                    )}
                    {c.city && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {c.province ? `${c.province}، ${c.city}` : c.city}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-end mt-3 pt-3 border-t border-slate-100 gap-1">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openView(c)} title="مشاهده">
                      <Eye className="w-4 h-4 text-sky-600" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(c)} title="ویرایش">
                      <Pencil className="w-4 h-4 text-amber-600" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-50" onClick={() => handleDelete(c)} title="حذف">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>مشاهده مشتری</DialogTitle></DialogHeader>
          {viewCustomer && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-sky-100 text-sky-700">
                    {(fullName(viewCustomer.firstName, viewCustomer.lastName))?.[0] || <User className="w-6 h-6" />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-bold text-slate-900">{fullName(viewCustomer.firstName, viewCustomer.lastName)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {viewCustomer.firstName && <div><span className="text-slate-400">نام:</span> <span className="font-medium">{viewCustomer.firstName}</span></div>}
                {viewCustomer.lastName && <div><span className="text-slate-400">نام خانوادگی:</span> <span className="font-medium">{viewCustomer.lastName}</span></div>}
                {viewCustomer.mobile && <div><span className="text-slate-400">موبایل:</span> <span className="font-medium" dir="ltr">{viewCustomer.mobile}</span></div>}
                {viewCustomer.province && <div><span className="text-slate-400">استان:</span> <span className="font-medium">{viewCustomer.province}</span></div>}
                {viewCustomer.city && <div><span className="text-slate-400">شهر:</span> <span className="font-medium">{viewCustomer.city}</span></div>}
              </div>
              {isSuperAdmin && viewCustomer.profileId && (
                <div className="text-xs text-slate-500">
                  <span className="text-slate-400">مالک: </span>{getStaffName(viewCustomer.profileId) || '—'}
                </div>
              )}
              <div className="text-xs text-slate-400">ایجاد شده: {relativeTime(viewCustomer.createdAt)}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>ویرایش مشتری</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSave} className="space-y-4">
            {renderFormFields()}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={saving}>{saving ? 'در حال ذخیره...' : 'ذخیره'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
