'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { Shield, Plus, Users, Pencil, Trash2, Search, LayoutGrid, List, UserCheck, UserRoundCog, Activity, ChevronLeft, ChevronRight } from 'lucide-react';

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

interface UserRow extends Profile {
  manager_id?: string | null;
  orgName?: string;
  email?: string;
}

export default function UsersPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [managerMap, setManagerMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const staffWhere: any = { userType: 'staff' };
      

      const [usrs, mgrs] = await Promise.all([
        fetchData<Profile & { user?: { email: string } }>('profiles', { where: staffWhere, include: { user: { select: { email: true } } }, orderBy: { createdAt: 'desc' } }),
        fetchData<{ userId: string; managerId: string }>('user_manager', {}),
      ]);

      const mMap: Record<string, string> = {};
      (mgrs as any[]).forEach((m) => { mMap[m.userId] = m.managerId; });

      const rows: UserRow[] = (usrs as (Profile & { user?: { email: string } })[]).map((u) => ({
        ...u,
        email: u.user?.email || '',
        manager_id: mMap[u.id] || null,
        orgName: undefined,
      }));
      setUsers(rows);
      setManagerMap(mMap);
    } catch (error: any) {
      toast.error('بارگذاری ناموفق: ' + error.message);
    }
    setLoading(false);
  }, [profile, isSuperAdmin]);

  useEffect(() => { load(); }, [load]);

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
        <Link
          href="/dashboard/users/create"
          className="flex h-11 items-center gap-2 rounded-[10px] bg-[#111827] px-5 text-sm font-medium text-white transition-colors hover:bg-[#1f2937]"
        >
          <Plus className="h-4 w-4" />
          {isSuperAdmin ? 'کاربر جدید' : 'پرسنل جدید'}
        </Link>
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
            action={<Link href="/dashboard/users/create" className="inline-flex h-10 items-center gap-2 rounded-md bg-[#111827] px-4 text-sm font-medium text-white hover:bg-[#1f2937]"><Plus className="w-4 h-4" /> ایجاد</Link>}
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
                              <Link href={`/dashboard/users/${u.id}/edit`} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#3155E7] transition-all duration-200 hover:bg-[#3155E7]/10 hover:shadow-sm" title="ویرایش">
                                <Pencil className="h-4 w-4" />
                              </Link>
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
                          <Link href={`/dashboard/users/${u.id}/edit`} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-slate-100">
                            <Pencil className="h-4 w-4" />
                          </Link>
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
