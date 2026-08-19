'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData } from '@/lib/data-client';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Plus, Check, Save } from 'lucide-react';
import { formatToman } from '@/lib/format';
import { toast } from 'sonner';

export default function PlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', price: '', interval: 'monthly', maxUsers: '10', storageGb: '5' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchData<any>('subscription_plans', { orderBy: { createdAt: 'desc' } });
      setPlans(data);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name || !form.price) { toast.error('نام و قیمت پلن را وارد کنید'); return; }
    await createData('subscription_plans', {
      name: form.name,
      description: form.description || null,
      price: Number(form.price.replace(/[^0-9]/g, '')) || 0,
      interval: form.interval,
      maxUsers: Number(form.maxUsers),
      storageGb: Number(form.storageGb),
      modules: [],
    });
    toast.success('پلن ایجاد شد');
    setDialogOpen(false);
    setForm({ name: '', description: '', price: '', interval: 'monthly', maxUsers: '10', storageGb: '5' });
    load();
  };

  return (
    <div>
      <PageHeader
        title="پلن‌های اشتراک"
        description="مدیریت پلن‌های قابل فروش پلتفرم"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" /> پلن جدید</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>ایجاد پلن اشتراک</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>نام پلن *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>توضیحات</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>قیمت (تومان)</Label><Input dir="ltr" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                  <div className="space-y-2"><Label>دوره</Label>
                    <Select value={form.interval} onValueChange={(v) => setForm({ ...form, interval: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="monthly">ماهانه</SelectItem><SelectItem value="yearly">سالانه</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>حداکثر کاربران</Label><Input type="number" dir="ltr" value={form.maxUsers} onChange={(e) => setForm({ ...form, maxUsers: e.target.value })} /></div>
                  <div className="space-y-2"><Label>فضا (GB)</Label><Input type="number" dir="ltr" value={form.storageGb} onChange={(e) => setForm({ ...form, storageGb: e.target.value })} /></div>
                </div>
                <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button><Button onClick={handleCreate}>ایجاد پلن</Button></DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p, i) => (
            <Card key={p.id} className={i === 1 ? 'border-amber-300 shadow-lg' : ''}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><CreditCard className="w-5 h-5" /></div>
                    <div>
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <Badge variant="outline" className="text-xs">{p.interval === 'monthly' ? 'ماهانه' : 'سالانه'}</Badge>
                    </div>
                  </div>
                  {p.active && <Check className="w-5 h-5 text-emerald-500" />}
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">{formatToman(Number(p.price))} <span className="text-sm font-normal text-slate-400">ت</span></div>
                <p className="text-sm text-slate-500 mb-4">{p.description || 'بدون توضیحات'}</p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm"><span className="text-slate-500">حداکثر کاربران</span><span className="font-medium">{p.maxUsers.toLocaleString('fa-IR')}</span></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-slate-500">فضای ذخیره‌سازی</span><span className="font-medium">{p.storageGb.toLocaleString('fa-IR')} گیگ</span></div>
                </div>
                {p.modules && Array.isArray(p.modules) && p.modules.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-3 border-t">
                    {p.modules.map((m: string) => <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
