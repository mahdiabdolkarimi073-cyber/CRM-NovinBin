'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import {
  Gift, Plus, Pencil, Trash2, Package, Percent, Truck, Wrench, Star,
  Inbox, CheckCircle2, XCircle, Coins, ShoppingBag, MoreVertical,
} from 'lucide-react';
import { formatToman, formatJalaliDateTime } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ============ Types ============

type RewardType = 'product' | 'discount' | 'free_shipping' | 'service';

interface LoyaltyReward {
  id: string;
  name: string;
  description: string | null;
  type: RewardType;
  pointsCost: number;
  monetaryValue: number; // BigInt serialized as number
  stock: number;
  imageUrl: string | null;
  active: boolean;
  createdAt: string;
}

interface LoyaltyRedemption {
  id: string;
  customerId: string;
  rewardId: string;
  pointsSpent: number;
  status: 'pending' | 'fulfilled' | 'cancelled';
  fulfilledAt: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
}

interface Customer {
  id: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  type: string;
}

// ============ Constants ============

const REWARD_TYPES: Record<RewardType, { label: string; color: string; bg: string; icon: typeof Package }> = {
  product: { label: 'محصول', color: '#2563eb', bg: 'bg-blue-50 text-blue-600 border-blue-200', icon: Package },
  discount: { label: 'تخفیف', color: '#059669', bg: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: Percent },
  free_shipping: { label: 'ارسال رایگان', color: '#d97706', bg: 'bg-amber-50 text-amber-600 border-amber-200', icon: Truck },
  service: { label: 'خدمات', color: '#0284c7', bg: 'bg-sky-50 text-sky-600 border-sky-200', icon: Wrench },
};

const REDEMPTION_STATUS: Record<string, { label: string; color: string; bg: string; icon: typeof Inbox }> = {
  pending: { label: 'در انتظار', color: '#d97706', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: Inbox },
  fulfilled: { label: 'تکمیل شده', color: '#059669', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  cancelled: { label: 'لغو شده', color: '#64748b', bg: 'bg-slate-100 text-slate-600 border-slate-200', icon: XCircle },
};

const emptyForm = {
  name: '', description: '', type: 'product' as RewardType,
  pointsCost: '', monetaryValue: '', stock: '-1', imageUrl: '', active: true,
};

// ============ Page ============

export default function LoyaltyRewardsPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState('catalog');

  // Catalog state
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LoyaltyReward | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Redemptions state
  const [redemptions, setRedemptions] = useState<LoyaltyRedemption[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allRewards, setAllRewards] = useState<LoyaltyReward[]>([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const customerMap = useMemo(() => {
    const m = new Map<string, Customer>();
    customers.forEach((c) => m.set(c.id, c));
    return m;
  }, [customers]);

  const rewardMap = useMemo(() => {
    const m = new Map<string, LoyaltyReward>();
    allRewards.forEach((r) => m.set(r.id, r));
    return m;
  }, [allRewards]);

  const loadRewards = useCallback(async () => {
    if (!profile) return;
    setLoadingRewards(true);
    try {
      const data = await fetchData<LoyaltyReward>('loyalty_rewards', {
        where: {},
        orderBy: { createdAt: 'desc' },
      });
      setRewards(data);
    } catch {
      setRewards([]);
    }
    setLoadingRewards(false);
  }, []);

  const loadRedemptions = useCallback(async () => {
    if (!profile) return;
    setLoadingRedemptions(true);
    try {
      const [reds, custs, rws] = await Promise.all([
        fetchData<LoyaltyRedemption>('loyalty_redemptions', {
          where: {},
          orderBy: { createdAt: 'desc' },
        }),
        fetchData<Customer>('customers', { where: {} }),
        fetchData<LoyaltyReward>('loyalty_rewards', { where: {} }),
      ]);
      setRedemptions(reds);
      setCustomers(custs);
      setAllRewards(rws);
    } catch {
      setRedemptions([]);
    }
    setLoadingRedemptions(false);
  }, []);

  useEffect(() => {
    loadRewards();
    loadRedemptions();
  }, [loadRewards, loadRedemptions]);

  // ----- Reward CRUD -----

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (r: LoyaltyReward) => {
    setEditing(r);
    setForm({
      name: r.name,
      description: r.description || '',
      type: r.type,
      pointsCost: String(r.pointsCost),
      monetaryValue: String(r.monetaryValue),
      stock: String(r.stock),
      imageUrl: r.imageUrl || '',
      active: r.active,
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربری یافت نشد'); return; }
    if (!form.name.trim()) { toast.error('نام جایزه را وارد کنید'); return; }

    const pointsCost = Number(form.pointsCost) || 0;
    if (pointsCost < 0) { toast.error('امتیاز موردنظر معتبر نیست'); return; }

    const monetaryValue = Math.max(0, Number(form.monetaryValue) || 0);
    const stockNum = Number(form.stock);
    const stock = isNaN(stockNum) ? -1 : stockNum;

    setSaving(true);
    try {
      if (editing) {
        await updateData('loyalty_rewards', { id: editing.id }, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          type: form.type,
          pointsCost,
          monetaryValue,
          stock,
          imageUrl: form.imageUrl.trim() || null,
          active: form.active,
        });
        toast.success('جایزه به‌روزرسانی شد');
      } else {
        await createData('loyalty_rewards', {
          name: form.name.trim(),
          description: form.description.trim() || null,
          type: form.type,
          pointsCost,
          monetaryValue,
          stock,
          imageUrl: form.imageUrl.trim() || null,
          active: form.active,
        });
        toast.success('جایزه جدید ایجاد شد');
      }
      setDialogOpen(false);
      loadRewards();
    } catch (error: any) {
      toast.error('ذخیره ناموفق: ' + (error?.message || 'خطا'));
    }
    setSaving(false);
  };

  const handleToggleActive = async (r: LoyaltyReward) => {
    try {
      await updateData('loyalty_rewards', { id: r.id }, { active: !r.active });
      setRewards((prev) => prev.map((x) => x.id === r.id ? { ...x, active: !x.active } : x));
      toast.success(r.active ? 'جایزه غیرفعال شد' : 'جایزه فعال شد');
    } catch (error: any) {
      toast.error('تغییر وضعیت ناموفق: ' + (error?.message || 'خطا'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteData('loyalty_rewards', { id: deleteId });
      setRewards((prev) => prev.filter((x) => x.id !== deleteId));
      toast.success('جایزه حذف شد');
      setDeleteId(null);
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + (error?.message || 'خطا'));
    }
  };

  // ----- Redemption actions -----

  const handleFulfill = async (r: LoyaltyRedemption) => {
    setActionLoading(r.id);
    try {
      await updateData('loyalty_redemptions', { id: r.id }, {
        status: 'fulfilled',
        fulfilledAt: new Date(),
      });
      setRedemptions((prev) => prev.map((x) => x.id === r.id ? { ...x, status: 'fulfilled', fulfilledAt: new Date().toISOString() } : x));
      toast.success('درخواست تکمیل شد');
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + (error?.message || 'خطا'));
    }
    setActionLoading(null);
  };

  const handleCancel = async (r: LoyaltyRedemption) => {
    setActionLoading(r.id);
    try {
      await updateData('loyalty_redemptions', { id: r.id }, { status: 'cancelled', fulfilledAt: null });
      setRedemptions((prev) => prev.map((x) => x.id === r.id ? { ...x, status: 'cancelled', fulfilledAt: null } : x));
      toast.success('درخواست لغو شد');
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + (error?.message || 'خطا'));
    }
    setActionLoading(null);
  };

  // ----- Derived -----

  const customerName = (id: string) => {
    const c = customerMap.get(id);
    if (!c) return 'مشتری ناشناس';
    if (c.type === 'company') return c.companyName || 'شرکت';
    return [c.firstName, c.lastName].filter(Boolean).join(' ') || 'بدون نام';
  };

  const rewardName = (id: string) => rewardMap.get(id)?.name || 'جایزه حذف شده';

  const filteredRedemptions = useMemo(() => {
    if (statusFilter === 'all') return redemptions;
    return redemptions.filter((r) => r.status === statusFilter);
  }, [redemptions, statusFilter]);

  const redemptionStats = useMemo(() => ({
    total: redemptions.length,
    pending: redemptions.filter((r) => r.status === 'pending').length,
    fulfilled: redemptions.filter((r) => r.status === 'fulfilled').length,
    pointsSpent: redemptions.reduce((s, r) => s + r.pointsSpent, 0),
  }), [redemptions]);

  // ============ Render ============

  return (
    <div>
      <PageHeader
        title="جوایز باشگاه مشتریان"
        description="مدیریت کاتالوگ جوایز و درخواست‌های بازخرجی"
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4" /> جایزه جدید
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="catalog">
            <Gift className="w-4 h-4 ml-1.5" /> کاتالوگ جوایز
          </TabsTrigger>
          <TabsTrigger value="redemptions">
            <ShoppingBag className="w-4 h-4 ml-1.5" /> درخواست‌های جایزه
          </TabsTrigger>
        </TabsList>

        {/* ===== Tab 1: Catalog ===== */}
        <TabsContent value="catalog">
          {loadingRewards ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
            </div>
          ) : rewards.length === 0 ? (
            <Card>
              <CardContent className="py-16 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <Gift className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="font-semibold text-slate-700 mb-1">جایزه‌ای تعریف نشده</h3>
                <p className="text-sm text-slate-400 mb-4">اولین جایزه باشگاه مشتریان را ایجاد کنید</p>
                <Button onClick={openCreate}><Plus className="w-4 h-4" /> افزودن جایزه</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {rewards.map((r) => {
                const ti = REWARD_TYPES[r.type] || REWARD_TYPES.product;
                const Icon = ti.icon;
                const unlimited = r.stock === -1;
                const out = !unlimited && r.stock <= 0;
                return (
                  <Card key={r.id} className="group hover:shadow-lg transition-shadow overflow-hidden flex flex-col">
                    {/* Image placeholder / icon banner */}
                    <div className={cn('relative h-32 flex items-center justify-center', ti.bg.split(' ')[0])}>
                      {r.imageUrl ? (
                        <img src={r.imageUrl} alt={r.name} className="w-full h-full object-cover" />
                      ) : (
                        <Icon className={cn('w-12 h-12', ti.bg.split(' ')[1])} />
                      )}
                      <div className="absolute top-2 right-2 flex items-center gap-1.5">
                        <Badge variant="outline" className={cn('bg-white/90 backdrop-blur text-xs', ti.bg)}>
                          <Icon className="w-3 h-3 ml-1" /> {ti.label}
                        </Badge>
                      </div>
                      {!r.active && (
                        <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                          <Badge className="bg-slate-700 text-white">غیرفعال</Badge>
                        </div>
                      )}
                    </div>

                    <CardContent className="p-4 flex flex-col flex-1">
                      <h3 className="font-semibold text-slate-900 mb-1 line-clamp-1">{r.name}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-3 min-h-[2rem]">{r.description || '—'}</p>

                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-1 text-amber-600">
                          <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                          <span className="font-bold text-sm">{r.pointsCost.toLocaleString('fa-IR')}</span>
                        </div>
                        <span className="text-xs text-slate-400">امتیاز</span>
                        {r.monetaryValue > 0 && (
                          <span className="text-xs text-slate-400 mr-auto">
                            {formatToman(Number(r.monetaryValue))} ت
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mb-4">
                        <span className={cn(
                          'text-xs font-medium px-2 py-1 rounded-full',
                          unlimited ? 'bg-emerald-50 text-emerald-600' : out ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'
                        )}>
                          {unlimited ? 'نامحدود' : out ? 'ناموجود' : `${r.stock.toLocaleString('fa-IR')} موجود`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-auto pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <Switch checked={r.active} onCheckedChange={() => handleToggleActive(r)} />
                          <span className="text-xs text-slate-400">{r.active ? 'فعال' : 'غیرفعال'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(r)}>
                            <Pencil className="w-3.5 h-3.5 text-slate-500" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-red-50" onClick={() => setDeleteId(r.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ===== Tab 2: Redemptions ===== */}
        <TabsContent value="redemptions">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">کل درخواست‌ها</div>
                  <div className="text-2xl font-bold text-slate-900">{redemptionStats.total.toLocaleString('fa-IR')}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">در انتظار</div>
                  <div className="text-2xl font-bold text-amber-600">{redemptionStats.pending.toLocaleString('fa-IR')}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Inbox className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">تکمیل شده</div>
                  <div className="text-2xl font-bold text-emerald-600">{redemptionStats.fulfilled.toLocaleString('fa-IR')}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">امتیاز مصرفی</div>
                  <div className="text-2xl font-bold text-slate-900">{redemptionStats.pointsSpent.toLocaleString('fa-IR')}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Coins className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status filter tabs */}
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">همه</TabsTrigger>
              <TabsTrigger value="pending">در انتظار</TabsTrigger>
              <TabsTrigger value="fulfilled">تکمیل شده</TabsTrigger>
              <TabsTrigger value="cancelled">لغو شده</TabsTrigger>
            </TabsList>
          </Tabs>

          {loadingRedemptions ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
            </div>
          ) : filteredRedemptions.length === 0 ? (
            <Card>
              <CardContent className="py-16 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <ShoppingBag className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="font-semibold text-slate-700 mb-1">درخواستی یافت نشد</h3>
                <p className="text-sm text-slate-400">
                  {statusFilter !== 'all' ? 'برای این وضعیت درخواستی وجود ندارد' : 'هنوز درخواست بازخرجی ثبت نشده'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>مشتری</TableHead>
                      <TableHead>جایزه</TableHead>
                      <TableHead>امتیاز مصرفی</TableHead>
                      <TableHead>وضعیت</TableHead>
                      <TableHead>تاریخ درخواست</TableHead>
                      <TableHead className="text-center">عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRedemptions.map((r) => {
                      const si = REDEMPTION_STATUS[r.status] || REDEMPTION_STATUS.pending;
                      const Icon = si.icon;
                      return (
                        <TableRow key={r.id} className="hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-800">{customerName(r.customerId)}</TableCell>
                          <TableCell className="text-slate-600">{rewardName(r.rewardId)}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                              {r.pointsSpent.toLocaleString('fa-IR')}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={si.bg}>
                              <Icon className="w-3 h-3 ml-1" /> {si.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">{formatJalaliDateTime(r.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              {r.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                    disabled={actionLoading === r.id}
                                    onClick={() => handleFulfill(r)}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 ml-1" /> تکمیل
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 border-slate-200 text-slate-600 hover:bg-slate-50"
                                    disabled={actionLoading === r.id}
                                    onClick={() => handleCancel(r)}
                                  >
                                    <XCircle className="w-3.5 h-3.5 ml-1" /> لغو
                                  </Button>
                                </>
                              )}
                              {r.status !== 'pending' && (
                                <span className="text-xs text-slate-400">—</span>
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
        </TabsContent>
      </Tabs>

      {/* ===== Create/Edit Dialog ===== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'ویرایش جایزه' : 'ایجاد جایزه جدید'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>نام جایزه *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثلاً: کپن تخفیف ۲۰٪"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>توضیحات</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="توضیح کوتاه (اختیاری)"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>نوع جایزه</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as RewardType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(REWARD_TYPES).map(([key, info]) => (
                      <SelectItem key={key} value={key}>{info.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>امتیاز موردنظر</Label>
                <Input
                  type="number"
                  dir="ltr"
                  value={form.pointsCost}
                  onChange={(e) => setForm({ ...form, pointsCost: e.target.value })}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>ارزش ریالی (تومان)</Label>
                <Input
                  type="number"
                  dir="ltr"
                  value={form.monetaryValue}
                  onChange={(e) => setForm({ ...form, monetaryValue: e.target.value })}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>موجودی</Label>
                <Input
                  type="number"
                  dir="ltr"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  placeholder="-1 برای نامحدود"
                />
                <p className="text-xs text-slate-400">برای نامحدود وارد کنید -1</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>آدرس تصویر (اختیاری)</Label>
              <Input
                dir="ltr"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
              <div>
                <div className="text-sm font-medium text-slate-700">فعال بودن جایزه</div>
                <div className="text-xs text-slate-400">جایزه‌های غیرفعال در کاتالوگ نمایش داده نمی‌شوند</div>
              </div>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'در حال ذخیره...' : editing ? 'به‌روزرسانی' : 'ایجاد جایزه'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== Delete Confirm Dialog ===== */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>حذف جایزه</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            آیا از حذف این جایزه مطمئن هستید؟ این عملیات قابل بازگشت نیست.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>انصراف</Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 ml-1" /> حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
