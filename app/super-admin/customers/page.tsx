'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData } from '@/lib/data-client';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Search, UserPlus, Loader2, Mail, Phone, Users } from 'lucide-react';
import { PasswordInput } from '@/components/ui/password-input';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { relativeTime } from '@/lib/format';

export default function SuperAdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createDialog, setCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
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
    c.firstName?.toLowerCase().includes(search.toLowerCase()) ||
    c.lastName?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!form.email || !form.password || (!form.firstName && !form.lastName)) {
      toast.error('نام، ایمیل و رمز عبور الزامی است');
      return;
    }
    if (form.password.length < 6) {
      toast.error('رمز عبور باید حداقل ۶ کاراکتر باشد');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          firstName: form.firstName || null,
          lastName: form.lastName || null,
          phone: form.phone || null,
          userType: 'customer',
          role: 'personnel',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'خطا در ثبت‌نام');

      toast.success('مشتری با موفقیت ثبت شد');
      setForm({ firstName: '', lastName: '', email: '', password: '', phone: '' });
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
          placeholder="جستجو با نام یا ایمیل..."
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
                    <th className="p-3 text-right font-medium">ایمیل</th>
                    <th className="p-3 text-right font-medium">تلفن</th>
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
                            <AvatarFallback className="bg-emerald-100 text-xs text-emerald-700">
                              {(c.firstName?.[0] || '') + (c.lastName?.[0] || '') || 'م'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="font-medium text-slate-800">
                            {[c.firstName, c.lastName].filter(Boolean).join(' ') || '—'}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-slate-500" dir="ltr">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {c.email || '—'}
                        </div>
                      </td>
                      <td className="p-3 text-slate-500" dir="ltr">
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {c.phone || '—'}
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

      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>ثبت مشتری جدید</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              مشتری با ایمیل و رمز عبور زیر ثبت می‌شود و می‌تواند از صفحه ورود مشتریان وارد شود.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>نام *</Label>
                <Input
                  placeholder="نام"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>نام خانوادگی</Label>
                <Input
                  placeholder="نام خانوادگی"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>ایمیل *</Label>
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
            <div className="space-y-2">
              <Label>شماره موبایل</Label>
              <Input
                dir="ltr"
                placeholder="09123456789"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
