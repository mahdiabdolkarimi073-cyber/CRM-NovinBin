'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { formatJalali } from '@/lib/format';
import {
  UserPlus,
  UserMinus,
  Users,
  Building2,
  Search,
} from 'lucide-react';

type Customer = {
  id: string;
  type: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  assignedTo: string | null;
  createdAt: string;
};

type Profile = {
  id: string;
  userType: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  active: boolean;
  createdAt: string;
};

type CustomerAssignment = {
  id: string;
  customerId: string;
  assignedTo: string;
  assignedBy: string;
  createdAt: string;
};

export default function CustomerAssignmentPage() {
  const { profile } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [personnel, setPersonnel] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<Record<string, CustomerAssignment>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [assignTarget, setAssignTarget] = useState<Customer | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState('none');
  const [assigning, setAssigning] = useState(false);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const load = useCallback(async () => {
    if (!profile) return;
    if (!isSuperAdmin && profile.role === 'admin') {
      // admin should not see this page
      setLoading(false);
      return;
    }
    setLoading(true);
    const where = isSuperAdmin ? {} : {};
    const [custs, pers, assigns] = await Promise.all([
      fetchData<Customer>('customers', { where, orderBy: { createdAt: 'desc' } }),
      fetchData<Profile>('profiles', { where: isSuperAdmin ? { userType: 'staff', role: { in: ['personnel', 'admin', 'super_admin'] }, active: true } : { userType: 'staff', role: { in: ['personnel', 'admin', 'super_admin'] }, active: true }, orderBy: { firstName: 'asc' } }),
      fetchData<CustomerAssignment>('customer_assignments', { where }),
    ]);

    const assignMap: Record<string, CustomerAssignment> = {};
    assigns.forEach((a) => {
      assignMap[a.customerId] = a;
    });

    setCustomers(custs);
    setPersonnel(pers);
    setAssignments(assignMap);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAssign = (customer: Customer) => {
    setAssignTarget(customer);
    const existing = assignments[customer.id];
    setSelectedPersonnel(existing?.assignedTo || 'none');
    setAssignOpen(true);
  };

  const handleAssign = async () => {
    if (!assignTarget || !profile) return;
    if (selectedPersonnel === 'none') {
      toast.error('یک پرسنل انتخاب کنید');
      return;
    }
    setAssigning(true);

    try {
      // Delete existing assignment if any
      const existing = assignments[assignTarget.id];
      if (existing) {
        await deleteData('customer_assignments', { id: existing.id });
      }

      // Create new assignment
      await createData('customer_assignments', {
        customerId: assignTarget.id,
        assignedTo: selectedPersonnel,
        assignedBy: profile.id,
      });

      // Also update customer.assignedTo for quick reference
      await updateData('customers', { id: assignTarget.id }, { assignedTo: selectedPersonnel });

      toast.success('مشتری به پرسنل تخصیص داده شد');
      setAssignOpen(false);
      load();
    } catch (error: any) {
      toast.error('خطا در تخصیص: ' + (error?.message || 'خطا'));
    }
    setAssigning(false);
  };

  const handleUnassign = async (customer: Customer) => {
    if (!profile) return;
    const existing = assignments[customer.id];
    if (!existing) return;

    try {
      await deleteData('customer_assignments', { id: existing.id });

      // Clear customer.assignedTo
      await updateData('customers', { id: customer.id }, { assignedTo: null });

      toast.success('تخصیص لغو شد');
      load();
    } catch (error: any) {
      toast.error(error?.message || 'خطا');
    }
  };

  const getPersonnelName = (id: string) => {
    const p = personnel.find((x) => x.id === id);
    return p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : '—';
  };

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    const name = `${c.firstName || ''} ${c.lastName || ''} ${c.companyName || ''} ${c.email || ''}`.toLowerCase();
    return name.includes(q);
  });

  const assignedCount = Object.keys(assignments).length;
  const unassignedCount = customers.length - assignedCount;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="تخصیص مشتریان به پرسنل"
        description="هر مشتری فقط به یک پرسنل قابل تخصیص است"
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {customers.length.toLocaleString('fa-IR')}
              </div>
              <div className="text-xs text-slate-400">کل مشتریان</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {assignedCount.toLocaleString('fa-IR')}
              </div>
              <div className="text-xs text-slate-400">تخصیص داده شده</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <UserMinus className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {unassignedCount.toLocaleString('fa-IR')}
              </div>
              <div className="text-xs text-slate-400">بدون تخصیص</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="جستجوی مشتری..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="w-8 h-8" />}
            title="مشتری‌ای یافت نشد"
            description={search ? 'نتیجه‌ای برای جستجوی شما یافت نشد' : 'هنوز مشتری ثبت نشده است'}
          />
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>مشتری</TableHead>
                  <TableHead>ایمیل</TableHead>
                  <TableHead>تلفن</TableHead>
                  <TableHead>تاریخ ثبت</TableHead>
                  <TableHead>تخصیص به</TableHead>
                  <TableHead className="text-left">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const assignment = assignments[c.id];
                  const isAssigned = !!assignment;
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarFallback className="bg-slate-100 text-slate-500 text-xs">
                              {c.type === 'company'
                                ? (c.companyName?.[0] || '?')
                                : (c.firstName?.[0] || '') + (c.lastName?.[0] || '')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {c.type === 'company'
                                ? c.companyName || '—'
                                : `${c.firstName || ''} ${c.lastName || ''}`}
                            </div>
                            {c.type === 'individual' && c.companyName && (
                              <div className="text-xs text-slate-400 flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {c.companyName}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600" dir="ltr">
                        {c.email || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600" dir="ltr">
                        {c.phone || c.mobile || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">
                        {formatJalali(c.createdAt)}
                      </TableCell>
                      <TableCell>
                        {isAssigned ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="bg-sky-100 text-sky-700 text-[10px]">
                                {getPersonnelName(assignment.assignedTo).slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium text-slate-700">
                                {getPersonnelName(assignment.assignedTo)}
                              </div>
                              <div className="text-xs text-slate-400">
                                {formatJalali(assignment.createdAt)}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-600">
                            بدون تخصیص
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs text-sky-600 hover:bg-sky-50"
                            onClick={() => openAssign(c)}
                          >
                            <UserPlus className="w-4 h-4" />
                            {isAssigned ? 'تغییر' : 'تخصیص'}
                          </Button>
                          {isAssigned && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs text-red-600 hover:bg-red-50"
                              onClick={() => handleUnassign(c)}
                            >
                              <UserMinus className="w-4 h-4" />
                              لغو
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Assign Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تخصیص مشتری به پرسنل</DialogTitle>
          </DialogHeader>
          {assignTarget && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-slate-200 text-slate-600">
                    {assignTarget.type === 'company'
                      ? (assignTarget.companyName?.[0] || '?')
                      : (assignTarget.firstName?.[0] || '') + (assignTarget.lastName?.[0] || '')}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {assignTarget.type === 'company'
                      ? assignTarget.companyName
                      : `${assignTarget.firstName} ${assignTarget.lastName}`}
                  </div>
                  <div className="text-xs text-slate-400" dir="ltr">
                    {assignTarget.email}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">انتخاب پرسنل</label>
                <Select value={selectedPersonnel} onValueChange={setSelectedPersonnel}>
                  <SelectTrigger>
                    <SelectValue placeholder="یک پرسنل انتخاب کنید" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون تخصیص</SelectItem>
                    {personnel.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {personnel.length === 0 && (
                  <p className="text-xs text-amber-600">
                    پرسنل فعالی وجود ندارد. ابتدا در بخش کاربران پرسنل ایجاد کنید.
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAssignOpen(false)}>
                  انصراف
                </Button>
                <Button disabled={assigning || selectedPersonnel === 'none'} onClick={handleAssign}>
                  {assigning ? 'در حال تخصیص...' : 'تخصیص دادن'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
