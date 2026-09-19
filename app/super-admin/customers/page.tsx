'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData } from '@/lib/data-client';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Search, UserPlus, Loader2, Mail, Phone, Users, Building2, User } from 'lucide-react';
import { PasswordInput } from '@/components/ui/password-input';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { relativeTime } from '@/lib/format';

type CustomerType = 'individual' | 'company';

export default function SuperAdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createDialog, setCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [customerType, setCustomerType] = useState<CustomerType>('individual');
  const [form, setForm] = useState({
    fullName: '',
    companyName: '',
    phone: '',
    email: '',
    password: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchData('profiles', {
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

  const getDisplayName = (c: any) => {
    if (c.customerType === 'company') return c.companyName || '—';
    return c.fullName || [c.firstName, c.lastName].filter(Boolean).join(' ') || '—';
  };

  const getInitials = (c: any) => {
    if (c.customerType === 'company') return c.companyName?.[0] || 'ش';
    const name = c.fullName || [c.firstName, c.lastName].filter(Boolean).join(' ');
    return name?.[0] || 'م';
  };

  const resetForm = () => {
    setCustomerType('individual');
    setForm({ fullName: '', companyName: '', phone: '', email: '', password: '' });
  };

  const handleCreate = async () => {
    if (!form.phone || !form.password) {
      toast.error('شماره موبایل و رمز عبور الزامی است');
      return;
    }
    if (form.password.length < 6) {
      toast.error('رمز عبور باید حداقل ۶ کاراکتر باشد');
      return;
    }
    if (customerType === 'individual' && !form.fullName) {
      toast.error('نام و نام خانوادگی برای مشتری حقیقی الزامی است');
      return;
    }
    if (customerType === 'company' && !form.companyName) {
      toast.error('نام شرکت برای مشتری حقوقی الزامی است');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: form.phone,
          email: form.email || null,
          password: form.password,
          customerType,
          fullName: customerType === 'individual' ? form.fullName || null : null,
          companyName: customerType === 'company' ? form.companyName || null : null,
          userType: 'customer',
          role: 'personnel',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'خطا در ثبت‌نام');

      toast.success('مشتری با موفقیت ثبت شد');
      resetForm();
      setCreateDialog(false);
      load();
    } catch (e: any) {
      toast.error('ثبت‌نام ناموفق: ' + (e.message || ''));
    }
    setCreating(false);
  };

  return (
    <div>
      <PageHeader
        title="مدیریت مشتریان"
        description="ثبت‌نام و مدیریت حساب‌های مشتری"
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
                    <th className="p-3 text-right font-medium">ایمیل</th>
                    <th className="p-3 text-right font-medium">وضعیت</th>
                    <th className="p-3 text-right font-medium">تاریخ ثبت</th>
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
                          <div className="font-medium text-slate-800">
                            {getDisplayName(c)}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          {c.customerType === 'company' ? 'حقوقی' : 'حقیقی'}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-500" dir="ltr">
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {c.phone || '—'}
                        </div>
                      </td>
                      <td className="p-3 text-slate-500" dir="ltr">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {c.email || '—'}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant={c.active ? 'default' : 'destructive'} className="text-xs">
                          {c.active ? 'فعال' : 'غیرفعال'}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs text-slate-400">{relativeTime(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={createDialog} onOpenChange={(open) => { setCreateDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>ثبت مشتری جدید</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              مشتری با شماره موبایل و رمز عبور ثبت می‌شود و می‌تواند از صفحه ورود مشتریان وارد شود.
            </p>

            {/* Customer Type Selector */}
            <div className="space-y-2">
              <Label>نوع مشتری *</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCustomerType('individual')}
                  className={`flex items-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-all ${
                    customerType === 'individual'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <User className="h-4 w-4" />
                  حقیقی
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerType('company')}
                  className={`flex items-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-all ${
                    customerType === 'company'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                  حقوقی
                </button>
              </div>
            </div>

            {/* Conditional Name Field */}
            {customerType === 'individual' ? (
              <div className="space-y-2">
                <Label>نام و نام خانوادگی *</Label>
                <Input
                  placeholder="نام و نام خانوادگی"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>نام شرکت *</Label>
                <Input
                  placeholder="نام شرکت"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>شماره موبایل *</Label>
              <Input
                dir="ltr"
                placeholder="09123456789"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="text-left"
              />
            </div>
            <div className="space-y-2">
              <Label>ایمیل (اختیاری)</Label>
              <Input
                type="email"
                dir="ltr"
                placeholder="email@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="text-left"
              />
            </div>
            <div className="space-y-2">
              <Label>رمز عبور *</Label>
              <PasswordInput
                dir="ltr"
                placeholder="حداقل ۶ کاراکتر"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="text-left"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialog(false)}>انصراف</Button>
              <Button type="button" onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                ثبت مشتری
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
