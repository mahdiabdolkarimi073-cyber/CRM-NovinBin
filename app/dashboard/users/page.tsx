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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { relativeTime } from '@/lib/format';
import { Shield, Plus, Users, Pencil, Building2, Trash2, Search, LayoutGrid, List, UserCheck, UserRoundCog, Activity, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { PasswordInput } from '@/components/ui/password-input';

const roleLabels: Record<string, string> = {
  owner: 'مدیر سازمان',
  super_admin: 'سوپر ادمین',
  admin: 'مدیر',
  personnel: 'پرسنل',
};

const roleBadgeClasses: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-700',
  super_admin: 'bg-amber-100 text-amber-700',
  admin: 'bg-sky-100 text-sky-700',
  personnel: 'bg-slate-100 text-slate-600',
};

const availablePages = [
  { path: '/dashboard/customers', label: 'مشتریان' },
  { path: '/dashboard/leads', label: 'سرنخ‌ها' },
  { path: '/dashboard/pipeline', label: 'قیف فروش' },
  { path: '/dashboard/products', label: 'محصولات' },
  { path: '/dashboard/orders', label: 'سفارشات' },
  { path: '/dashboard/invoices', label: 'فاکتورها' },
  { path: '/dashboard/tasks', label: 'وظایف' },
  { path: '/dashboard/meetings', label: 'جلسات' },
  { path: '/dashboard/tickets', label: 'تیکت‌ها' },
  { path: '/dashboard/accounting', label: 'حسابداری' },
  { path: '/dashboard/inventory', label: 'انبار' },
  { path: '/dashboard/hr', label: 'منابع انسانی' },
  { path: '/dashboard/notifications', label: 'اعلان‌ها' },
  { path: '/dashboard/settings', label: 'تنظیمات' },
  { path: '/dashboard/pre-invoices', label: 'پیش‌فاکتورها' },
  { path: '/dashboard/returns', label: 'مرجوعی‌ها' },
  { path: '/dashboard/payments', label: 'پرداخت‌ها' },
  { path: '/dashboard/receipts', label: 'رسیدها' },
  { path: '/dashboard/contracts', label: 'قراردادها' },
  { path: '/dashboard/calls', label: 'تماس‌ها' },
  { path: '/dashboard/demos', label: 'دموها' },
  { path: '/dashboard/customers-chat', label: 'چت مشتریان' },
  { path: '/dashboard/work-reports/daily', label: 'گزارش روزانه' },
  { path: '/dashboard/work-reports/monthly', label: 'گزارش ماهانه' },
  { path: '/dashboard/finance-academy', label: 'آکادمی مالی' },
  { path: '/dashboard/financial-reports', label: 'گزارش‌های مالی' },
  { path: '/dashboard/customer-interactions', label: 'ارتباطات مشتری' },
  { path: '/dashboard/customer-segments', label: 'بخش‌بندی مشتری' },
  { path: '/dashboard/loyalty-rewards', label: 'جوایز باشگاه' },
  { path: '/dashboard/demo-activities', label: 'فعالیت دمو' },
  { path: '/dashboard/stock-transfers', label: 'انتقال انبار' },
];

type Profile = {
  id: string;
  userType: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  position: string | null;
  departmentId: string | null;
  customerId: string | null;
  assignedPages: string[];
  birthDate: string | null;
  active: boolean;
  createdAt: string;
};

type Org = { id: string; name: string; code: string };

interface UserRow extends Profile {
  manager_id?: string | null;
  orgName?: string;
  email?: string;
}

export default function UsersPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [pagePermissions, setPagePermissions] = useState<Record<string, string[]>>({});
  const [managerMap, setManagerMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
    role: 'personnel' as string, assignedPages: [] as string[], managerId: 'none' as string,
  phone: '', position: '',
  });
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [editForm, setEditForm] = useState({
    role: 'personnel' as string, assignedPages: [] as string[],
    managerId: 'none' as string, active: true,
    email: '', password: '', firstName: '', lastName: '', phone: '', position: '',
  });

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const staffWhere: any = { userType: 'staff' };
      

      const [usrs, perms, mgrs] = await Promise.all([
        fetchData<Profile & { user?: { email: string } }>('profiles', { where: staffWhere, include: { user: { select: { email: true } } }, orderBy: { createdAt: 'desc' } }),
        fetchData<{ profileId: string; pagePath: string }>('page_permissions', {}),
        fetchData<{ userId: string; managerId: string }>('user_manager', {}),
      ]);

      const permMap: Record<string, string[]> = {};
      (perms as any[]).forEach((p) => {
        if (!permMap[p.profileId]) permMap[p.profileId] = [];
        permMap[p.profileId].push(p.pagePath);
      });

      const mMap: Record<string, string> = {};
      (mgrs as any[]).forEach((m) => { mMap[m.userId] = m.managerId; });

      const rows: UserRow[] = (usrs as (Profile & { user?: { email: string } })[]).map((u) => ({
        ...u,
        email: u.user?.email || '',
        manager_id: mMap[u.id] || null,
        orgName: undefined,
      }));
      setUsers(rows);
      setPagePermissions(permMap);
      setManagerMap(mMap);
      setOrgs([]);
    } catch (error: any) {
      toast.error('بارگذاری ناموفق: ' + error.message);
    }
    setLoading(false);
  }, [profile, isSuperAdmin]);

  useEffect(() => { load(); }, [load]);

  const togglePage = (path: string, list: string[], setter: (v: string[]) => void) => {
    if (list.includes(path)) setter(list.filter((p) => p !== path));
    else setter([...list, path]);
  };

  const admins = users.filter((u) =>
    (u.role === 'admin' || u.role === 'super_admin' || u.role === 'owner') && u.active
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      toast.error('نام، نام خانوادگی، ایمیل و رمز عبور را وارد کنید');
      return;
    }
    if (!isSuperAdmin && form.role !== 'personnel') {
      toast.error('شما فقط می‌توانید پرسنل ایجاد کنید');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email, password: form.password,
          firstName: form.firstName, lastName: form.lastName,
          role: form.role, userType: 'staff',
          phone: form.phone || undefined,
          assignedPages: form.assignedPages,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreating(false);
        toast.error('خطا در ایجاد کاربر: ' + (data.error || 'ناموفق'));
        return;
      }
      const newId = data.profile.id;

      if (form.assignedPages.length > 0) {
        for (const p of form.assignedPages) {
          await createData('page_permissions', { profileId: newId, pagePath: p, granted: true, grantedBy: profile.id });
        }
      }
      if (form.managerId !== 'none') {
        await createData('user_manager', { userId: newId, managerId: form.managerId });
      }

      toast.success('کاربر با ایمیل و رمز عبور ایجاد شد و می‌تواند وارد شود.');
      setCreateOpen(false);
      setForm({ firstName: '', lastName: '', email: '', password: '', role: 'personnel', assignedPages: [], managerId: 'none', phone: '', position: '' });
      load();
    } catch (error: any) {
      toast.error('خطا: ' + (error?.message || 'ناموفق'));
    }
    setCreating(false);
  };

  const openEdit = (u: UserRow) => {
    if (!isSuperAdmin && u.role !== 'personnel') {
      toast.error('شما فقط می‌توانید پرسنل خود را ویرایش کنید');
      return;
    }
    setEditTarget(u);
    setEditForm({
      role: u.role,
      assignedPages: pagePermissions[u.id] || u.assignedPages || [],
      managerId: (managerMap[u.id] as string) || 'none',
      active: u.active,
      email: u.email || '', password: '',
      firstName: u.firstName || '', lastName: u.lastName || '',
      phone: u.phone || '', position: u.position || '',
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editTarget || !profile) return;
    if (!editTarget) return;
    setEditOpen(false);
    try {
      if (isSuperAdmin) {
        const res = await fetch('/api/auth/update-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: editTarget.id,
            email: editForm.email || undefined,
            password: editForm.password || undefined,
            firstName: editForm.firstName,
            lastName: editForm.lastName,
            phone: editForm.phone,
            position: editForm.position,
            role: editForm.role,
            active: editForm.active,
            assignedPages: editForm.assignedPages,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || 'ویرایش ناموفق');
          return;
        }
      } else {
        await updateData('profiles', { id: editTarget.id }, {
          role: editForm.role, active: editForm.active,
          assignedPages: editForm.assignedPages,
        });
      }

      const oldPerms = await fetchData<{ id: string }>('page_permissions', { where: { profileId: editTarget.id } });
      for (const p of oldPerms) await deleteData('page_permissions', { id: p.id });
      for (const p of editForm.assignedPages) {
        await createData('page_permissions', { profileId: editTarget.id, pagePath: p, granted: true, grantedBy: profile.id });
      }

      const oldMgrs = await fetchData<{ id: string }>('user_manager', { where: { userId: editTarget.id } });
      for (const m of oldMgrs) await deleteData('user_manager', { id: m.id });
      if (editForm.managerId !== 'none') {
        await createData('user_manager', { userId: editTarget.id, managerId: editForm.managerId });
      }

      toast.success('کاربر ویرایش شد');
      setEditOpen(false);
      load();
    } catch (error: any) {
      toast.error('خطا: ' + (error?.message || 'ناموفق'));
    }
  };

  const toggleActive = async (u: UserRow) => {
    if (!isSuperAdmin && u.role !== 'personnel') {
      toast.error('دسترسی محدود');
      return;
    }
    try {
      await updateData('profiles', { id: u.id }, { active: !u.active });
      toast.success(u.active ? 'غیرفعال شد' : 'فعال شد');
      load();
    } catch (error: any) {
      toast.error(error?.message || 'خطا');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/auth/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: deleteTarget.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'حذف ناموفق');
        setDeleting(false);
        return;
      }
      toast.success('کاربر حذف شد');
      setDeleteTarget(null);
      load();
    } catch (error: any) {
      toast.error(error?.message || 'خطا در حذف');
    }
    setDeleting(false);
  };

  if (!isSuperAdmin) {
    return (
      <div>
        <PageHeader title="کاربران و دسترسی‌ها" />
        <Card><EmptyState icon={<Shield className="w-8 h-8" />} title="دسترسی محدود" description="این صفحه فقط برای سوپرادمین قابل دسترسی است" /></Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const getPageLabel = (path: string) => availablePages.find((p) => p.path === path)?.label || path;

  const visibleUsers = isSuperAdmin
    ? users
    : users.filter((u) => u.role === 'personnel' && managerMap[u.id] === profile?.id);
  const filteredUsers = visibleUsers.filter((u) => {
    const query = tableSearch.trim().toLowerCase();
    const matchesSearch = !query || `${u.firstName || ''} ${u.lastName || ''} ${u.email || ''} ${u.phone || ''}`.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? u.active : !u.active);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedUsers = filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize);
  const startIdx = filteredUsers.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIdx = Math.min(safePage * pageSize, filteredUsers.length);

  const activeCount = visibleUsers.filter((u) => u.active).length;
  const inactiveCount = visibleUsers.filter((u) => !u.active).length;
  const adminCount = visibleUsers.filter((u) => u.role === 'admin' || u.role === 'super_admin' || u.role === 'owner').length;

  const stats = [
    { label: 'کل کاربران', value: visibleUsers.length, icon: Users, color: 'bg-blue-50 text-blue-600', growth: '+12%' },
    { label: 'کاربران فعال', value: activeCount, icon: UserCheck, color: 'bg-green-50 text-green-600', growth: '+8%' },
    { label: 'مدیران', value: adminCount, icon: UserRoundCog, color: 'bg-purple-50 text-purple-600', growth: '+3%' },
    { label: 'غیرفعال', value: inactiveCount, icon: Activity, color: 'bg-orange-50 text-orange-600', growth: '-2%' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-[#FF7A00]" />
            <h1 className="text-[32px] font-bold leading-tight text-[#111827]">مدیریت کاربران</h1>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[13px] text-[#64748B] pr-4">
            <span>داشبورد</span>
            <span className="text-[#CBD5E1]">/</span>
            <span>مدیریت کاربران</span>
          </div>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex h-11 items-center gap-2 rounded-[10px] bg-[#111827] px-5 text-sm font-medium text-white transition-colors hover:bg-[#1f2937]"
        >
          <Plus className="h-4 w-4" />
          {isSuperAdmin ? 'کاربر جدید' : 'پرسنل جدید'}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex h-[105px] items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white px-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          >
            <div>
              <div className="text-[26px] font-bold text-[#111827]">{s.value}</div>
              <div className="mt-1 text-xs text-[#64748B]">{s.label}</div>
              <div className="mt-1.5 inline-flex items-center rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600">
                {s.growth}
              </div>
            </div>
            <div className={`flex h-11 w-11 items-center justify-center rounded-full ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Panel */}
      {visibleUsers.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="w-8 h-8" />}
            title={isSuperAdmin ? 'کاربری یافت نشد' : 'پرسنلی یافت نشد'}
            description={isSuperAdmin ? 'اولین کاربر را ایجاد کنید' : 'هنوز پرسنلی به شما اختصاص داده نشده'}
            action={<Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /> ایجاد</Button>}
          />
        </Card>
      ) : (
        <div className="rounded-[20px] border border-[#E5E7EB] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          {/* Toolbar: Search + Filters + View Toggle */}
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="جستجو بر اساس نام، ایمیل یا تلفن..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="h-[42px] w-full rounded-[10px] border border-[#DCE3F0] bg-white pr-10 pl-4 text-sm text-[#111827] outline-none transition-colors focus:border-[#FF7A00] lg:w-[300px]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-[42px] w-[130px] rounded-[10px] border-[#DCE3F0] text-sm">
                  <SelectValue placeholder="وضعیت" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                  <SelectItem value="active">فعال</SelectItem>
                  <SelectItem value="inactive">غیرفعال</SelectItem>
                </SelectContent>
              </Select>

              {/* Role Filter */}
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-[42px] w-[130px] rounded-[10px] border-[#DCE3F0] text-sm">
                  <SelectValue placeholder="نقش" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه نقش‌ها</SelectItem>
                  <SelectItem value="super_admin">سوپر ادمین</SelectItem>
                  <SelectItem value="admin">مدیر</SelectItem>
                  <SelectItem value="personnel">پرسنل</SelectItem>
                </SelectContent>
              </Select>

              {/* View Toggle */}
              <div className="flex items-center gap-1 rounded-[10px] border border-[#DCE3F0] p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex h-8 w-8 items-center justify-center rounded-[8px] transition-colors ${viewMode === 'list' ? 'bg-[#111827] text-white' : 'text-[#64748B] hover:bg-slate-50'}`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex h-8 w-8 items-center justify-center rounded-[8px] transition-colors ${viewMode === 'grid' ? 'bg-[#111827] text-white' : 'text-[#64748B] hover:bg-slate-50'}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#94A3B8]">کاربری با این فیلترها یافت نشد</div>
          ) : viewMode === 'list' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-xs text-[#64748B]">
                    <th className="px-3 py-3 text-right font-medium">کاربر</th>
                    <th className="px-3 py-3 text-right font-medium">نقش</th>
                    <th className="px-3 py-3 text-right font-medium">وضعیت</th>
                    <th className="px-3 py-3 text-right font-medium">تلفن</th>
                    <th className="px-3 py-3 text-right font-medium">ایمیل</th>
                    <th className="px-3 py-3 text-right font-medium">تاریخ عضویت</th>
                    <th className="px-3 py-3 text-center font-medium">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2F7]">
                  {pagedUsers.map((u) => {
                    const canEdit = isSuperAdmin || (u.role === 'personnel' && managerMap[u.id] === profile?.id);
                    return (
                      <tr key={u.id} className="transition-all duration-200 hover:bg-[#F8FAFC]" style={{ height: '60px' }}>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-10 w-10 shrink-0">
                              <AvatarFallback className="bg-slate-100 text-xs text-[#475569]">
                                {(u.firstName?.[0] || '') + (u.lastName?.[0] || '')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="text-[14px] font-semibold text-[#172554]">{u.firstName} {u.lastName}</div>
                              <div className="text-[12px] text-[#94A3B8]">{u.firstName?.toLowerCase() || ''}.{u.lastName?.toLowerCase() || ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${roleBadgeClasses[u.role] || 'bg-slate-100 text-slate-600'}`}>
                            {roleLabels[u.role] || u.role}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${u.active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${u.active ? 'bg-green-500' : 'bg-red-500'}`} />
                            {u.active ? 'فعال' : 'غیرفعال'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[13px] text-[#475569]" dir="ltr">{u.phone || '—'}</td>
                        <td className="px-3 py-3 text-[13px] text-[#475569]" dir="ltr">{u.email || '—'}</td>
                        <td className="px-3 py-3 text-xs text-[#94A3B8]">{relativeTime(u.createdAt)}</td>
                        <td className="px-3 py-3">
                          {canEdit ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button onClick={() => openEdit(u)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#3155E7] transition-all duration-200 hover:bg-[#3155E7]/10 hover:shadow-sm" title="ویرایش">
                                <Pencil className="h-4 w-4" />
                              </button>
                              {u.role !== 'owner' && (
                                <button onClick={() => toggleActive(u)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] transition-all duration-200 hover:bg-slate-100 hover:shadow-sm" title={u.active ? 'غیرفعال کردن' : 'فعال کردن'}>
                                  {u.active ? <Activity className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                </button>
                              )}
                              {isSuperAdmin && u.role !== 'owner' && (
                                <button onClick={() => setDeleteTarget(u)} className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-all duration-200 hover:bg-red-50 hover:shadow-sm" title="حذف">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-[#CBD5E1]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pagedUsers.map((u) => {
                const canEdit = isSuperAdmin || (u.role === 'personnel' && managerMap[u.id] === profile?.id);
                return (
                  <div key={u.id} className="rounded-2xl border border-[#E5E7EB] p-4 transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-slate-100 text-xs text-[#475569]">
                            {(u.firstName?.[0] || '') + (u.lastName?.[0] || '')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-[14px] font-semibold text-[#111827]">{u.firstName} {u.lastName}</div>
                          <div className="text-[12px] text-[#94A3B8]" dir="ltr">{u.email || ''}</div>
                        </div>
                      </div>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeClasses[u.role] || 'bg-slate-100 text-slate-600'}`}>
                        {roleLabels[u.role] || u.role}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${u.active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${u.active ? 'bg-green-500' : 'bg-red-500'}`} />
                        {u.active ? 'فعال' : 'غیرفعال'}
                      </span>
                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(u)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-slate-100">
                            <Pencil className="h-4 w-4" />
                          </button>
                          {isSuperAdmin && u.role !== 'owner' && (
                            <button onClick={() => setDeleteTarget(u)} className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {filteredUsers.length > 0 && (
            <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-[#EEF2F7] pt-4 sm:flex-row">
              <div className="text-xs text-[#64748B]">
                نمایش {startIdx} تا {endIdx} از {filteredUsers.length} کاربر
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] transition-colors hover:bg-[#F8FAFC] disabled:opacity-40 disabled:hover:bg-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors ${p === safePage ? 'bg-[#111827] text-white' : 'border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] transition-colors hover:bg-[#F8FAFC] disabled:opacity-40 disabled:hover:bg-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isSuperAdmin ? 'ایجاد کاربر جدید' : 'ایجاد پرسنل جدید'}</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>نام *</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></div>
              <div className="space-y-2"><Label>نام خانوادگی *</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>ایمیل *</Label><Input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
              <div className="space-y-2"><Label>رمز عبور *</Label><PasswordInput dir="ltr" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="رمز عبور اولیه" required /></div>
            </div>
            <div className="space-y-2"><Label>شماره موبایل</Label><Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="09123456789" /></div>

            {false && isSuperAdmin && (
              <div className="space-y-2">
                <Label>سازمان *</Label>
                <Select value="" onValueChange={() => {}}>
                  <SelectTrigger><SelectValue placeholder="انتخاب سازمان" /></SelectTrigger>
                  <SelectContent>
                    {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name} ({o.code})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>نقش *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {isSuperAdmin && <SelectItem value="super_admin">سوپر ادمین</SelectItem>}
                  {isSuperAdmin && <SelectItem value="admin">مدیر</SelectItem>}
                  <SelectItem value="personnel">پرسنل</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.role === 'personnel' && (
              <div className="space-y-2">
                <Label>مدیر مسئول (اختیاری)</Label>
                <Select value={form.managerId} onValueChange={(v) => setForm({ ...form, managerId: v })}>
                  <SelectTrigger><SelectValue placeholder="انتخاب مدیر" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون مدیر</SelectItem>
                    {admins.filter((a) => isSuperAdmin || a.id === profile?.id).map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.firstName} {a.lastName} ({roleLabels[a.role]})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400">پرسنل فقط از مدیر خود تسک دریافت می‌کند و به پرسنل هم‌گروه ارجاع می‌دهد.</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>صفحات دسترسی</Label>
              <div className="border rounded-lg p-3 max-h-60 overflow-y-auto grid grid-cols-2 gap-2 bg-slate-50/50">
                {availablePages.map((page) => (
                  <label key={page.path} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1.5 rounded transition-colors">
                    <Checkbox
                      checked={form.assignedPages.includes(page.path)}
                      onCheckedChange={() => togglePage(page.path, form.assignedPages, (v) => setForm({ ...form, assignedPages: v }))}
                    />
                    <span className="text-sm text-slate-700">{page.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <button type="button" className="text-sky-600 hover:underline" onClick={() => setForm({ ...form, assignedPages: availablePages.map((p) => p.path) })}>انتخاب همه</button>
                <span>•</span>
                <button type="button" className="text-slate-500 hover:underline" onClick={() => setForm({ ...form, assignedPages: [] })}>پاک کردن</button>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={creating}>{creating ? 'در حال ایجاد...' : 'ایجاد کاربر'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>ویرایش کاربر</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-sky-100 text-sky-700">{(editTarget?.firstName?.[0] || '') + (editTarget?.lastName?.[0] || '')}</AvatarFallback>
              </Avatar>
              <div><div className="font-medium text-sm">{editTarget?.firstName} {editTarget?.lastName}</div></div>
            </div>

            {isSuperAdmin && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>نام</Label><Input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} /></div>
                <div className="space-y-2"><Label>نام خانوادگی</Label><Input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} /></div>
              </div>
            )}

            {isSuperAdmin && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>ایمیل</Label>
                  <Input type="email" dir="ltr" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder={editTarget ? 'ایمیل فعلی ذخیره شده' : ''} />
                </div>
                <div className="space-y-2">
                  <Label>رمز عبور جدید</Label>
                  <PasswordInput dir="ltr" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="خالی = بدون تغییر" />
                </div>
              </div>
            )}

            {isSuperAdmin && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>شماره موبایل</Label><Input dir="ltr" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
                <div className="space-y-2"><Label>سمت</Label><Input value={editForm.position} onChange={(e) => setEditForm({ ...editForm, position: e.target.value })} /></div>
              </div>
            )}

            {isSuperAdmin && (
              <div className="space-y-2">
                <Label>نقش</Label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">سوپر ادمین</SelectItem>
                    <SelectItem value="admin">مدیر</SelectItem>
                    <SelectItem value="personnel">پرسنل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {editForm.role === 'personnel' && (
              <div className="space-y-2">
                <Label>مدیر مسئول</Label>
                <Select value={editForm.managerId} onValueChange={(v) => setEditForm({ ...editForm, managerId: v })}>
                  <SelectTrigger><SelectValue placeholder="انتخاب مدیر" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون مدیر</SelectItem>
                    {admins.filter((a) => a.id !== editTarget?.id).map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.firstName} {a.lastName} ({roleLabels[a.role]})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>وضعیت</Label>
              <Select value={editForm.active ? 'true' : 'false'} onValueChange={(v) => setEditForm({ ...editForm, active: v === 'true' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">فعال</SelectItem>
                  <SelectItem value="false">غیرفعال</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>صفحات دسترسی</Label>
              <div className="border rounded-lg p-3 max-h-60 overflow-y-auto grid grid-cols-2 gap-2 bg-slate-50/50">
                {availablePages.map((page) => (
                  <label key={page.path} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1.5 rounded transition-colors">
                    <Checkbox
                      checked={editForm.assignedPages.includes(page.path)}
                      onCheckedChange={() => togglePage(page.path, editForm.assignedPages, (v) => setEditForm({ ...editForm, assignedPages: v }))}
                    />
                    <span className="text-sm text-slate-700">{page.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <button type="button" className="text-sky-600 hover:underline" onClick={() => setEditForm({ ...editForm, assignedPages: availablePages.map((p) => p.path) })}>انتخاب همه</button>
                <span>•</span>
                <button type="button" className="text-slate-500 hover:underline" onClick={() => setEditForm({ ...editForm, assignedPages: [] })}>پاک کردن</button>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>انصراف</Button>
              <Button onClick={handleSaveEdit}>ذخیره</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف کاربر</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف «{deleteTarget?.firstName} {deleteTarget?.lastName}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'در حال حذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
