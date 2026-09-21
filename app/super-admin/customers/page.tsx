'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, updateData, deleteData } from '@/lib/data-client';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Search, UserPlus, Loader2, Mail, Phone, Users, Building2, User, Pencil, Trash2, Power } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { relativeTime } from '@/lib/format';
import { toast } from 'sonner';

type CustomerType = 'individual' | 'company';

interface CustomerRow {
  id: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  customerType: CustomerType | null;
  phone: string | null;
  email: string | null;
  active: boolean | null;
  createdAt: string;
}

export default function SuperAdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createDialog, setCreateDialog] = useState(false);

  // Edit dialog
  const [editDialog, setEditDialog] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    companyName: '',
    phone: '',
    email: '',
    customerType: 'individual' as CustomerType,
    active: true,
  });
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<CustomerRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchData<CustomerRow>('profiles', {
        where: { userType: 'customer' },
        orderBy: { createdAt: 'desc' },
      });
      setCustomers(data || []);
    } catch {
      setCustomers([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = customers.filter((c) =>
    !search ||
    c.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    c.firstName?.toLowerCase().includes(search.toLowerCase()) ||
    c.lastName?.toLowerCase().includes(search.toLowerCase()) ||
    c.companyName?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getDisplayName = (c: CustomerRow) => {
    if (c.customerType === 'company') return c.companyName || '—';
    return c.fullName || [c.firstName, c.lastName].filter(Boolean).join(' ') || '—';
  };

  const getInitials = (c: CustomerRow) => {
    if (c.customerType === 'company') return c.companyName?.[0] || 'ش';
    const name = c.fullName || [c.firstName, c.lastName].filter(Boolean).join(' ');
    return name?.[0] || 'م';
  };

  const openEdit = (c: CustomerRow) => {
    setEditing(c);
    setEditForm({
      fullName: c.fullName || [c.firstName, c.lastName].filter(Boolean).join(' '),
      companyName: c.companyName || '',
      phone: c.phone || '',
      email: c.email || '',
      customerType: c.customerType || 'individual',
      active: c.active !== false,
    });
    setEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const updates: Record<string, any> = {
        phone: editForm.phone.trim() || null,
        email: editForm.email.trim() || null,
        customerType: editForm.customerType,
        active: editForm.active,
      };
      if (editForm.customerType === 'individual') {
        const parts = editForm.fullName.trim().split(' ');
        updates.fullName = editForm.fullName.trim();
        updates.firstName = parts[0] || null;
        updates.lastName = parts.slice(1).join(' ') || null;
        updates.companyName = null;
      } else {
        updates.companyName = editForm.companyName.trim();
        updates.fullName = editForm.companyName.trim();
        updates.firstName = null;
        updates.lastName = null;
      }
      await updateData('profiles', { id: editing.id }, updates);
      toast.success('مشتری به‌روزرسانی شد');
      setEditDialog(false);
      load();
    } catch (e: any) {
      toast.error('خطا: ' + (e.message || ''));
    }
    setSaving(false);
  };

  const handleToggleActive = async (c: CustomerRow) => {
    try {
      await updateData('profiles', { id: c.id }, { active: !c.active });
      setCustomers((prev) => prev.map((x) => x.id === c.id ? { ...x, active: !c.active } : x));
      toast.success(c.active ? 'مشتری غیرفعال شد' : 'مشتری فعال شد');
    } catch (e: any) {
      toast.error('خطا: ' + (e.message || ''));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteData('profiles', { id: deleteTarget.id });
      toast.success('مشتری حذف شد');
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      toast.error('خطا: ' + (e.message || ''));
    }
    setDeleting(false);
  };

  return (
    <div>
      <PageHeader
        title="مدیریت مشتریان"
        description="ثبت‌نام، ویرایش و مدیریت حساب‌های مشتری"
        action={
          <Button size="sm" onClick={() => setCreateDialog(true)}>
            <UserPlus className="h-4 w-4" />
            ثبت مشتری جدید
          </Button>
        }
      />

      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="جستجو با نام، شماره موبایل یا ایمیل..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10 max-w-md"
        />
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-slate-400">
            <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            مشتری‌ای ثبت نشده است
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs text-slate-500">
                    <th className="p-3 text-right font-medium">مشتری</th>
                    <th className="p-3 text-right font-medium">نوع</th>
                    <th className="p-3 text-right font-medium">موبایل</th>
                    <th className="p-3 text-right font-medium hidden mobile:table-cell">ایمیل</th>
                    <th className="p-3 text-right font-medium">وضعیت</th>
                    <th className="p-3 text-right font-medium hidden tablet:table-cell">تاریخ ثبت</th>
                    <th className="p-3 text-center font-medium">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((c) => (
                    <tr key={c.id} className="transition-smooth hover:bg-slate-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className={`text-xs ${c.customerType === 'company' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {getInitials(c)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="font-medium text-slate-800 text-xs mobile:text-sm">
                            {getDisplayName(c)}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px] mobile:text-xs">
                          {c.customerType === 'company' ? 'حقوقی' : 'حقیقی'}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-500 text-xs mobile:text-sm" dir="ltr">
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {c.phone || '—'}
                        </div>
                      </td>
                      <td className="p-3 text-slate-500 hidden mobile:table-cell" dir="ltr">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {c.email || '—'}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant={c.active ? 'default' : 'destructive'} className="text-[10px] mobile:text-xs">
                          {c.active ? 'فعال' : 'غیرفعال'}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs text-slate-400 hidden tablet:table-cell">{relativeTime(c.createdAt)}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)} title="ویرایش">
                            <Pencil className="w-3.5 h-3.5 text-slate-500" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleToggleActive(c)} title={c.active ? 'غیرفعال کردن' : 'فعال کردن'}>
                            <Power className={`w-3.5 h-3.5 ${c.active ? 'text-emerald-600' : 'text-slate-400'}`} />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-red-50" onClick={() => setDeleteTarget(c)} title="حذف">
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-amber-600" />
              ویرایش مشتری
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>نوع مشتری</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, customerType: 'individual' })}
                  className={`flex items-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-all ${
                    editForm.customerType === 'individual'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <User className="h-4 w-4" />
                  حقیقی
                </button>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, customerType: 'company' })}
                  className={`flex items-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-all ${
                    editForm.customerType === 'company'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                  حقوقی
                </button>
              </div>
            </div>

            {editForm.customerType === 'individual' ? (
              <div className="space-y-2">
                <Label>نام و نام خانوادگی</Label>
                <Input
                  placeholder="نام و نام خانوادگی"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>نام شرکت</Label>
                <Input
                  placeholder="نام شرکت"
                  value={editForm.companyName}
                  onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>شماره موبایل</Label>
              <Input
                dir="ltr"
                placeholder="09123456789"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="text-left"
              />
            </div>
            <div className="space-y-2">
              <Label>ایمیل</Label>
              <Input
                type="email"
                dir="ltr"
                placeholder="email@example.com"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="text-left"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
              <div>
                <div className="text-sm font-medium text-slate-700">فعال بودن حساب</div>
                <div className="text-xs text-slate-400">حساب غیرفعال نمی‌تواند وارد شود</div>
              </div>
              <Switch checked={editForm.active} onCheckedChange={(v) => setEditForm({ ...editForm, active: v })} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialog(false)}>انصراف</Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                ذخیره تغییرات
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>حذف مشتری</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            آیا از حذف «{deleteTarget ? getDisplayName(deleteTarget) : ''}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>انصراف</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              حذف مشتری
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog (kept from original for backward compatibility) */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>ثبت مشتری جدید</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              برای ثبت مشتری جدید از صفحه ثبت‌نام مشتریان استفاده کنید.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialog(false)}>بستن</Button>
              <Button onClick={() => { setCreateDialog(false); window.location.href = '/register/customer'; }}>
                <UserPlus className="h-4 w-4" />
                رفتن به ثبت‌نام
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
