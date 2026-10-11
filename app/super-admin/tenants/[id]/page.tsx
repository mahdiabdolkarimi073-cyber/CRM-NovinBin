'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchData, updateData } from '@/lib/data-client';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Building2, Users, ShoppingCart, FileText, Package, Pause, Play, Save } from 'lucide-react';
import { formatToman, formatJalali, relativeTime } from '@/lib/format';
import { toast } from 'sonner';

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', plan: 'starter', maxUsers: 10, subscriptionStatus: 'trial' });

  const load = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    try {
      const id = params.id as string;
      const [orgData, users, customers, orders, invoices, products] = await Promise.all([
        fetchData<any>('organizations', { where: { id } }),
        fetchData<any>('profiles', { where: { userType: 'staff' } }),
        fetchData<any>('customers', {}),
        fetchData<any>('orders', {}),
        fetchData<any>('invoices', {}),
        fetchData<any>('products', {}),
      ]);
      const org = orgData[0];
      if (org) {
        setTenant({
          ...org,
          users,
          userCount: users.length,
          customerCount: customers.length,
          orderCount: orders.length,
          invoiceCount: invoices.length,
          productCount: products.length,
        });
        setForm({ name: org.name, plan: org.plan, maxUsers: org.maxUsers, subscriptionStatus: org.subscriptionStatus });
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    await updateData('organizations', { id: params.id as string }, {
      name: form.name,
      plan: form.plan,
      maxUsers: Number(form.maxUsers),
      subscriptionStatus: form.subscriptionStatus,
    });
    toast.success('اطلاعات سازمان ذخیره شد');
    setEditing(false);
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full" /></div>;
  if (!tenant) return <div className="text-center py-16"><p className="text-slate-500">سازمان یافت نشد</p></div>;

  const stats = [
    { label: 'کاربران', value: tenant.userCount, icon: Users, color: 'bg-sky-50 text-sky-600' },
    { label: 'مشتریان', value: tenant.customerCount, icon: Building2, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'سفارشات', value: tenant.orderCount, icon: ShoppingCart, color: 'bg-violet-50 text-violet-600' },
    { label: 'فاکتورها', value: tenant.invoiceCount, icon: FileText, color: 'bg-amber-50 text-amber-600' },
    { label: 'محصولات', value: tenant.productCount, icon: Package, color: 'bg-cyan-50 text-cyan-600' },
  ];

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push('/super-admin/tenants')}>
        <ArrowRight className="w-4 h-4" /> بازگشت
      </Button>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16"><AvatarFallback className="bg-sky-100 text-sky-700 text-2xl">{tenant.name?.[0]}</AvatarFallback></Avatar>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{tenant.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="capitalize">{tenant.plan}</Badge>
                  <Badge variant={tenant.active ? 'default' : 'destructive'}>
                    {tenant.subscriptionStatus === 'trial' ? 'آزمایشی' : tenant.active ? 'فعال' : 'معلق'}
                  </Badge>
                  <span className="text-sm text-slate-400" dir="ltr">کد: {tenant.code}</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">عضویت: {relativeTime(tenant.createdAt)}</div>
              </div>
            </div>
            <div className="flex gap-2">
              {tenant.active ? (
                <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={async () => { await updateData('organizations', { id: tenant.id }, { active: false }); toast.success('تعلیق شد'); load(); }}>
                  <Pause className="w-4 h-4" /> تعلیق
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="text-emerald-600 hover:bg-emerald-50" onClick={async () => { await updateData('organizations', { id: tenant.id }, { active: true }); toast.success('فعال شد'); load(); }}>
                  <Play className="w-4 h-4" /> فعال‌سازی
                </Button>
              )}
              <Button size="sm" onClick={() => setEditing(!editing)}>
                {editing ? 'انصراف' : 'ویرایش'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            {stats.map((s, i) => (
              <div key={i} className="p-3 rounded-lg bg-slate-50">
                <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center mb-2`}><s.icon className="w-4 h-4" /></div>
                <div className="text-lg font-bold text-slate-900">{s.value.toLocaleString('fa-IR')}</div>
                <div className="text-xs text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {editing && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">ویرایش تنظیمات سازمان</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>نام سازمان</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>پلن</Label>
                <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">استارتر</SelectItem>
                    <SelectItem value="business">بیزینس</SelectItem>
                    <SelectItem value="enterprise">سازمانی</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>حداکثر کاربران</Label><Input type="number" dir="ltr" value={form.maxUsers} onChange={(e) => setForm({ ...form, maxUsers: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>وضعیت اشتراک</Label>
                <Select value={form.subscriptionStatus} onValueChange={(v) => setForm({ ...form, subscriptionStatus: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">آزمایشی</SelectItem>
                    <SelectItem value="active">فعال</SelectItem>
                    <SelectItem value="suspended">معلق</SelectItem>
                    <SelectItem value="expired">منقضی</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSave}><Save className="w-4 h-4" /> ذخیره تغییرات</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">کاربران سازمان ({tenant.userCount.toLocaleString('fa-IR')})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(tenant.users || []).map((u: any) => (
              <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8"><AvatarFallback className="bg-slate-100 text-slate-600 text-xs">{(u.firstName?.[0] || '') + (u.lastName?.[0] || '')}</AvatarFallback></Avatar>
                  <div>
                    <div className="text-sm font-medium">{u.firstName} {u.lastName}</div>
                    <div className="text-xs text-slate-400">{u.role === 'owner' ? 'مدیر سازمان' : u.position || 'پرسنل'}</div>
                  </div>
                </div>
                <Badge variant={u.active ? 'default' : 'secondary'} className="text-xs">{u.active ? 'فعال' : 'غیرفعال'}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
