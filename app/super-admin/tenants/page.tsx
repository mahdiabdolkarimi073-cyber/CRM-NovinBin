'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchData, createData, updateData } from '@/lib/data-client';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Building2, Search, Eye, Pause, Play, Plus, Sparkles } from 'lucide-react';
import { PasswordInput } from '@/components/ui/password-input';
import { relativeTime } from '@/lib/format';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createDialog, setCreateDialog] = useState(false);
  const [demoDialog, setDemoDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', code: '', plan: 'starter', trialDays: '14' });
  const [demoForm, setDemoForm] = useState({ companyName: '', adminName: '', adminEmail: '', adminPassword: '', trialDays: '14' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchData('organizations', { orderBy: { createdAt: 'desc' } });
      setTenants(data);
    } catch {
      setTenants([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = tenants.filter((t) =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.code?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSuspend = async (id: string) => {
    if (!confirm('این سازمان تعلیق شود؟')) return;
    try {
      await updateData('organizations', { id }, { active: false, subscriptionStatus: 'suspended' });
      toast.success('سازمان معلق شد');
      load();
    } catch (e: any) { toast.error(e.message || 'خطا'); }
  };

  const handleActivate = async (id: string) => {
    try {
      await updateData('organizations', { id }, { active: true, subscriptionStatus: 'active' });
      toast.success('سازمان فعال شد');
      load();
    } catch (e: any) { toast.error(e.message || 'خطا'); }
  };

  const handleCreateOrg = async () => {
    if (!createForm.name || !createForm.code) { toast.error('نام و کد سازمان را وارد کنید'); return; }
    setCreating(true);
    try {
      const plan = createForm.plan;
      await createData('organizations', {
        name: createForm.name,
        code: createForm.code.trim().toUpperCase(),
        plan,
        subscriptionStatus: 'trial',
        active: true,
        maxUsers: plan === 'enterprise' ? 100 : plan === 'business' ? 20 : 5,
        renewalDate: new Date(Date.now() + Number(createForm.trialDays) * 86400000).toISOString(),
      });
      toast.success('سازمان ایجاد شد');
      setCreating(false); setCreateDialog(false);
      setCreateForm({ name: '', code: '', plan: 'starter', trialDays: '14' });
      load();
    } catch (e: any) {
      toast.error('ایجاد ناموفق: ' + (e.message || ''));
      setCreating(false);
    }
  };

  const handleCreateDemo = async () => {
    if (!demoForm.companyName || !demoForm.adminEmail || !demoForm.adminPassword) { toast.error('فیلدها را پر کنید'); return; }
    setCreating(true);
    try {
      const orgCode = 'DEMO-' + Date.now().toString().slice(-6);
      const org = await createData('organizations', {
        name: demoForm.companyName,
        code: orgCode,
        plan: 'business',
        subscriptionStatus: 'trial',
        active: true,
        maxUsers: 10,
        renewalDate: new Date(Date.now() + Number(demoForm.trialDays) * 86400000).toISOString(),
      });

      // Create owner profile — auth user creation is handled server-side;
      // here we create the profile record linked to the new org
      const ownerProfile = await createData('profiles', {
        userType: 'staff',
        role: 'owner',
        firstName: demoForm.adminName || null,
        email: demoForm.adminEmail,
        active: true,
      });

      await updateData('organizations', { id: org.id }, { ownerId: ownerProfile.id });

      // Seed demo customers
      await createData('customers', {
        type: 'individual',
        firstName: 'مشتری',
        lastName: 'نمونه',
        mobile: '09123456789',
        level: 'bronze',
        createdBy: ownerProfile.id,
      });
      await createData('customers', {
        type: 'company',
        companyName: 'شرکت نمونه',
        email: 'info@example.com',
        level: 'silver',
        createdBy: ownerProfile.id,
      });

      // Seed demo products
      await createData('products', {
        name: 'محصول نمونه ۱',
        price: 500000,
        cost: 350000,
        taxRate: 9,
        discount: 0,
        stock: 100,
        minStock: 10,
        unit: 'عدد',
        active: true,
      });
      await createData('products', {
        name: 'محصول نمونه ۲',
        price: 1200000,
        cost: 900000,
        taxRate: 9,
        discount: 0,
        stock: 50,
        minStock: 5,
        unit: 'عدد',
        active: true,
      });

      // Seed demo task
      await createData('tasks', {
        title: 'تماس با مشتری نمونه',
        priority: 'medium',
        status: 'new',
        progress: 0,
        createdBy: ownerProfile.id,
      });

      setCreating(false); setDemoDialog(false);
      toast.success(`دمو ایجاد شد - کد سازمان: ${orgCode}`);
      setDemoForm({ companyName: '', adminName: '', adminEmail: '', adminPassword: '', trialDays: '14' });
      load();
    } catch (e: any) {
      toast.error('ایجاد دمو ناموفق: ' + (e.message || ''));
      setCreating(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="مدیریت سازمان‌ها"
        description="لیست تمام سازمان‌های پلتفرم"
        action={
          <div className="flex gap-2">
            <Dialog open={demoDialog} onOpenChange={setDemoDialog}>
              <DialogTrigger asChild><Button size="sm" variant="outline"><Sparkles className="w-4 h-4" /> ایجاد دمو</Button></DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>ایجاد سازمان دمو</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>نام شرکت *</Label><Input value={demoForm.companyName} onChange={(e) => setDemoForm({ ...demoForm, companyName: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>نام مدیر</Label><Input value={demoForm.adminName} onChange={(e) => setDemoForm({ ...demoForm, adminName: e.target.value })} /></div>
                    <div className="space-y-2"><Label>مدت تست (روز)</Label>
                      <Select value={demoForm.trialDays} onValueChange={(v) => setDemoForm({ ...demoForm, trialDays: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="7">۷ روز</SelectItem><SelectItem value="14">۱۴ روز</SelectItem><SelectItem value="30">۳۰ روز</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2"><Label>ایمیل مدیر *</Label><Input type="email" dir="ltr" value={demoForm.adminEmail} onChange={(e) => setDemoForm({ ...demoForm, adminEmail: e.target.value })} /></div>
                  <div className="space-y-2"><Label>رمز عبور *</Label><PasswordInput dir="ltr" value={demoForm.adminPassword} onChange={(e) => setDemoForm({ ...demoForm, adminPassword: e.target.value })} /></div>
                  <DialogFooter><Button type="button" variant="outline" onClick={() => setDemoDialog(false)}>انصراف</Button><Button onClick={handleCreateDemo} disabled={creating}>{creating ? 'در حال ایجاد...' : 'ایجاد دمو'}</Button></DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={createDialog} onOpenChange={setCreateDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" /> سازمان جدید</Button></DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>ایجاد سازمان جدید</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>نام سازمان *</Label><Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>کد سازمان *</Label><Input dir="ltr" value={createForm.code} onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })} className="uppercase" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>پلن</Label>
                      <Select value={createForm.plan} onValueChange={(v) => setCreateForm({ ...createForm, plan: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="starter">استارتر</SelectItem><SelectItem value="business">بیزینس</SelectItem><SelectItem value="enterprise">سازمانی</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>مدت تست</Label>
                      <Select value={createForm.trialDays} onValueChange={(v) => setCreateForm({ ...createForm, trialDays: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="7">۷ روز</SelectItem><SelectItem value="14">۱۴ روز</SelectItem><SelectItem value="30">۳۰ روز</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter><Button type="button" variant="outline" onClick={() => setCreateDialog(false)}>انصراف</Button><Button onClick={handleCreateOrg} disabled={creating}>{creating ? 'در حال ایجاد...' : 'ایجاد'}</Button></DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />
      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="جستجوی سازمان..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10 max-w-md" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-slate-400">سازمانی یافت نشد</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-slate-500 text-xs">
                    <th className="text-right p-3 font-medium">سازمان</th>
                    <th className="text-right p-3 font-medium">کد</th>
                    <th className="text-right p-3 font-medium">پلن</th>
                    <th className="text-right p-3 font-medium">وضعیت</th>
                    <th className="text-right p-3 font-medium">تاریخ ثبت</th>
                    <th className="text-center p-3 font-medium">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-smooth">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8"><AvatarFallback className="bg-sky-100 text-sky-700 text-xs">{t.name?.[0] || 'س'}</AvatarFallback></Avatar>
                          <div>
                            <div className="font-medium text-slate-800">{t.name}</div>
                            <div className="text-xs text-slate-400">{t.owner?.firstName || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-slate-500" dir="ltr">{t.code}</td>
                      <td className="p-3"><Badge variant="outline" className="text-xs capitalize">{t.plan}</Badge></td>
                      <td className="p-3">
                        <Badge variant={t.active ? 'default' : 'destructive'} className="text-xs">
                          {t.subscriptionStatus === 'trial' ? 'آزمایشی' : t.active ? 'فعال' : 'معلق'}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-400 text-xs">{relativeTime(t.createdAt)}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1">
                          <Link href={`/super-admin/tenants/${t.id}`}>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Eye className="w-4 h-4 text-slate-500" /></Button>
                          </Link>
                          {t.active ? (
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-50" onClick={() => handleSuspend(t.id)}><Pause className="w-4 h-4 text-red-500" /></Button>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-emerald-50" onClick={() => handleActivate(t.id)}><Play className="w-4 h-4 text-emerald-500" /></Button>
                          )}
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
    </div>
  );
}
