'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchData, createData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Award, Star, Wallet, TrendingUp, Trophy, Plus, Minus, Gift, Search, Loader2,
  X, ArrowRight,
} from 'lucide-react';
import { formatToman, relativeTime } from '@/lib/format';
import { fullName, CUSTOMER_LEVELS, tomanShort } from '@/lib/constants';
import { toast } from 'sonner';
import Link from 'next/link';
import type { Customer, LoyaltyTransaction } from '@/lib/types';

interface LoyaltyReward {
  id: string;
  name: string;
  description: string | null;
  type: string;
  pointsCost: number;
  monetaryValue: number;
  stock: number;
  active: boolean;
}

export default function LoyaltyPage() {
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner' || profile?.role === 'admin';
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [search, setSearch] = useState('');
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);

  // Points dialog
  const [pointsDialog, setPointsDialog] = useState(false);
  const [pointsMode, setPointsMode] = useState<'add' | 'deduct'>('add');
  const [pointsAmount, setPointsAmount] = useState('');
  const [pointsDesc, setPointsDesc] = useState('');
  const [savingPoints, setSavingPoints] = useState(false);

  // Redemption dialog
  const [redeemDialog, setRedeemDialog] = useState(false);
  const [selectedRewardId, setSelectedRewardId] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const data = await fetchData<Customer>('customers', {
        where: {},
        orderBy: { loyaltyPoints: 'desc' },
      });
      setCustomers(data);
    } catch {
      setCustomers([]);
    }
    setLoading(false);
  }, [profile]);

  const loadRewards = useCallback(async () => {
    try {
      const data = await fetchData<LoyaltyReward>('loyalty_rewards', {
        where: { active: true },
        orderBy: { pointsCost: 'asc' },
      });
      setRewards(data || []);
    } catch {
      setRewards([]);
    }
  }, []);

  useEffect(() => { load(); loadRewards(); }, [load, loadRewards]);

  const loadTransactions = useCallback(async () => {
    if (!selected) return;
    try {
      const data = await fetchData<LoyaltyTransaction>('loyalty_transactions', {
        where: { customerId: selected },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
      setTransactions(data);
    } catch {
      setTransactions([]);
    }
  }, [selected]);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  const selectedCustomer = useMemo(() => customers.find((c) => c.id === selected), [customers, selected]);

  const filteredCustomers = customers.filter((c) => {
    if (!search) return true;
    const name = c.type === 'company' ? c.companyName : fullName(c.firstName, c.lastName);
    return name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search);
  });

  const levelInfo = (level: string) => CUSTOMER_LEVELS.find((l) => l.key === level) || CUSTOMER_LEVELS[0];
  const totalPoints = customers.reduce((s, c) => s + c.loyaltyPoints, 0);
  const totalWallet = customers.reduce((s, c) => s + c.walletBalance, 0);
  const vipCount = customers.filter((c) => c.level === 'vip').length;

  const stats = useMemo(() => [
    {
      label: 'کل امتیازات', value: totalPoints, icon: Star,
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      glow: 'rgba(245,158,11,0.25)',
    },
    {
      label: 'کیف پول کل', value: tomanShort(totalWallet), icon: Wallet,
      gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      glow: 'rgba(34,197,94,0.25)',
    },
    {
      label: 'مشتریان VIP', value: vipCount, icon: Trophy,
      gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
      glow: 'rgba(139,92,246,0.25)',
    },
    {
      label: 'تعداد مشتریان', value: customers.length, icon: Award,
      gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
      glow: 'rgba(37,99,235,0.25)',
    },
  ], [totalPoints, totalWallet, vipCount, customers.length]);

  const openPointsDialog = (mode: 'add' | 'deduct') => {
    setPointsMode(mode);
    setPointsAmount('');
    setPointsDesc('');
    setPointsDialog(true);
  };

  const handleSavePoints = async () => {
    if (!selectedCustomer) return;
    const amount = Number(pointsAmount);
    if (!amount || amount <= 0) {
      toast.error('مقدار امتیاز معتبر نیست');
      return;
    }
    setSavingPoints(true);
    try {
      const finalAmount = pointsMode === 'deduct' ? -amount : amount;
      const newPoints = selectedCustomer.loyaltyPoints + finalAmount;
      if (newPoints < 0) {
        toast.error('امتیاز مشتری کافی نیست');
        setSavingPoints(false);
        return;
      }
      await updateData('customers', { id: selectedCustomer.id }, { loyaltyPoints: newPoints });
      await createData('loyalty_transactions', {
        customerId: selectedCustomer.id,
        points: finalAmount,
        type: pointsMode === 'add' ? 'earn' : 'spend',
        description: pointsDesc.trim() || (pointsMode === 'add' ? `افزودن امتیاز توسط ${profile?.firstName || 'مدیر'}` : `کسر امتیاز توسط ${profile?.firstName || 'مدیر'}`),
      });
      toast.success(pointsMode === 'add' ? `${amount.toLocaleString('fa-IR')} امتیاز افزوده شد` : `${amount.toLocaleString('fa-IR')} امتیاز کسر شد`);
      setPointsDialog(false);
      load();
      loadTransactions();
    } catch (e: any) {
      toast.error('خطا: ' + (e.message || ''));
    }
    setSavingPoints(false);
  };

  const handleRedeem = async () => {
    if (!selectedCustomer || !selectedRewardId) return;
    const reward = rewards.find((r) => r.id === selectedRewardId);
    if (!reward) return;
    if (selectedCustomer.loyaltyPoints < reward.pointsCost) {
      toast.error('امتیاز مشتری کافی نیست');
      return;
    }
    setRedeeming(true);
    try {
      const newPoints = selectedCustomer.loyaltyPoints - reward.pointsCost;
      await updateData('customers', { id: selectedCustomer.id }, { loyaltyPoints: newPoints });
      await createData('loyalty_transactions', {
        customerId: selectedCustomer.id,
        points: -reward.pointsCost,
        type: 'spend',
        description: `بازخرج جایزه: ${reward.name}`,
      });
      await createData('loyalty_redemptions', {
        customerId: selectedCustomer.id,
        rewardId: reward.id,
        pointsSpent: reward.pointsCost,
        status: 'pending',
        createdBy: profile?.id || '',
      });
      toast.success(`جایزه «${reward.name}» با موفقیت بازخرج شد`);
      setRedeemDialog(false);
      setSelectedRewardId('');
      load();
      loadTransactions();
    } catch (e: any) {
      toast.error('خطا: ' + (e.message || ''));
    }
    setRedeeming(false);
  };

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری باشگاه مشتریان...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="nb-page" dir="rtl">
      <header className="nb-hero">
        <div className="nb-hero-left">
          <div>
            <div className="nb-hero-title-row">
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#f59e0b,#d97706)', boxShadow: '0 0 12px rgba(245,158,11,.25)' }} />
              <h1>باشگاه مشتریان</h1>
            </div>
            <p>مدیریت امتیازات، سطح مشتریان، کیف پول و جوایز</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard" className="nb-editor-quick-btn">
            <ArrowRight className="h-4 w-4" />
            بازگشت به داشبورد
          </Link>
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        {stats.map((stat) => (
          <div
            className="nb-stat-card-v2"
            key={stat.label}
            style={{ '--stat-glow': stat.glow } as React.CSSProperties}
          >
            <div className="nb-stat-v2-icon" style={{ background: stat.gradient }}>
              <stat.icon className="h-[22px] w-[22px] text-white" strokeWidth={2.5} />
            </div>
            <div className="nb-stat-v2-body">
              <strong>{typeof stat.value === 'number' ? stat.value.toLocaleString('fa-IR') : stat.value}</strong>
              <span>{stat.label}</span>
            </div>
            <div className="nb-stat-v2-spark" style={{ background: stat.gradient }} />
          </div>
        ))}
      </section>

      {customers.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><Award className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>مشتری‌ای یافت نشد</h3>
          <p>ابتدا مشتری ثبت کنید</p>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="nb-toolbar">
            <div className="nb-toolbar-left">
              <h2>لیست مشتریان</h2>
              <span className="nb-count-badge">{filteredCustomers.length.toLocaleString('fa-IR')} مورد</span>
            </div>
            <div className="nb-toolbar-right">
              <div className="nb-search-box">
                <Search className="h-4 w-4" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="جستجو با نام یا شماره..."
                />
                {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mobile:gap-6">
            {/* Customer list */}
            <div className="lg:col-span-2">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[600px] overflow-y-auto">
                  {filteredCustomers.map((c, i) => {
                    const level = levelInfo(c.level);
                    const name = c.type === 'company' ? c.companyName : fullName(c.firstName, c.lastName);
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelected(c.id)}
                        className={`w-full flex items-center justify-between p-3 mobile:p-4 hover:bg-slate-50 transition-smooth text-right dark:hover:bg-slate-700/40 ${selected === c.id ? 'bg-sky-50 dark:bg-sky-900/20' : ''}`}
                      >
                        <div className="flex items-center gap-2 mobile:gap-3">
                          <div className="relative">
                            <Avatar className="w-8 h-8 mobile:w-10 mobile:h-10">
                              <AvatarFallback className="bg-sky-100 text-sky-700 text-xs mobile:text-sm dark:bg-sky-900/30 dark:text-sky-400">{name?.[0] || '؟'}</AvatarFallback>
                            </Avatar>
                            {i < 3 && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 mobile:w-5 mobile:h-5 rounded-full bg-amber-400 text-white text-[8px] mobile:text-[10px] font-bold flex items-center justify-center">
                                {(i + 1).toLocaleString('fa-IR')}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800 text-xs mobile:text-sm dark:text-slate-200">{name}</div>
                            <div className="text-[10px] mobile:text-xs text-slate-400">{c.loyaltyPoints.toLocaleString('fa-IR')} امتیاز</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mobile:gap-3">
                          <span className="text-[10px] mobile:text-sm font-medium text-slate-600 hidden mobile:inline dark:text-slate-300">{formatToman(c.walletBalance)} ت</span>
                          <Badge variant="outline" style={{ color: level.color, borderColor: level.color + '40' }} className="text-[9px] mobile:text-xs">{level.label}</Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Detail panel */}
            <div>
              {selectedCustomer ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                        {(selectedCustomer.type === 'company' ? selectedCustomer.companyName : fullName(selectedCustomer.firstName, selectedCustomer.lastName))?.[0] || '؟'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm mobile:text-base dark:text-slate-100">
                        {selectedCustomer.type === 'company' ? selectedCustomer.companyName : fullName(selectedCustomer.firstName, selectedCustomer.lastName)}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" style={{ color: levelInfo(selectedCustomer.level).color, borderColor: levelInfo(selectedCustomer.level).color + '40' }}>
                          {levelInfo(selectedCustomer.level).label}
                        </Badge>
                        <span className="text-xs text-slate-400">{selectedCustomer.phone || ''}</span>
                      </div>
                    </div>
                  </div>

                  {/* Points balance */}
                  <div className="rounded-xl bg-gradient-to-l from-amber-50 to-orange-50 border border-amber-100 p-4 mb-4 dark:from-amber-900/20 dark:to-orange-900/20 dark:border-amber-800/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-amber-700 dark:text-amber-400">امتیاز فعلی</p>
                        <p className="text-2xl font-bold text-amber-900 dark:text-amber-300">{selectedCustomer.loyaltyPoints.toLocaleString('fa-IR')}</p>
                      </div>
                      <Star className="w-8 h-8 text-amber-400 fill-amber-400" />
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {isSuperAdmin && (
                      <>
                        <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => openPointsDialog('add')}>
                          <Plus className="w-3.5 h-3.5" /> افزودن امتیاز
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50" onClick={() => openPointsDialog('deduct')}>
                          <Minus className="w-3.5 h-3.5" /> کسر امتیاز
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => setRedeemDialog(true)} disabled={rewards.length === 0}>
                      <Gift className="w-3.5 h-3.5" /> بازخرج جایزه
                    </Button>
                  </div>

                  {/* Transaction history */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-3 dark:text-slate-300">تاریخچه امتیازات</h4>
                    {transactions.length === 0 ? (
                      <p className="text-center text-slate-400 text-sm py-6">تراکنشی ثبت نشده</p>
                    ) : (
                      <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
                        {transactions.map((t) => (
                          <div key={t.id} className="flex items-center gap-2.5 text-xs mobile:text-sm">
                            <div className={`w-7 h-7 mobile:w-8 mobile:h-8 rounded-lg flex items-center justify-center shrink-0 ${t.type === 'earn' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
                              <TrendingUp className={`w-3.5 h-3.5 ${t.type === 'spend' ? 'rotate-180' : ''}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-slate-700 truncate dark:text-slate-200">{t.description || (t.type === 'earn' ? 'کسب امتیاز' : 'استفاده امتیاز')}</div>
                              <div className="text-[10px] mobile:text-xs text-slate-400">{relativeTime(t.createdAt)}</div>
                            </div>
                            <span className={`font-bold shrink-0 ${t.type === 'earn' ? 'text-emerald-600' : 'text-red-600'}`}>
                              {t.type === 'earn' ? '+' : '−'}{t.points.toLocaleString('fa-IR')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="nb-empty">
                  <div className="sb-empty-icon"><Award className="h-12 w-12 text-muted-foreground/30" /></div>
                  <h3>مشتری را انتخاب کنید</h3>
                  <p>برای مشاهده جزئیات، یک مشتری را انتخاب کنید</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Points Add/Deduct Dialog */}
      <Dialog open={pointsDialog} onOpenChange={setPointsDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pointsMode === 'add' ? <Plus className="w-5 h-5 text-emerald-600" /> : <Minus className="w-5 h-5 text-red-600" />}
              {pointsMode === 'add' ? 'افزودن امتیاز' : 'کسر امتیاز'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedCustomer && (
              <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">
                <span className="text-slate-500">مشتری: </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedCustomer.type === 'company' ? selectedCustomer.companyName : fullName(selectedCustomer.firstName, selectedCustomer.lastName)}
                </span>
                <div className="text-xs text-slate-400 mt-1">
                  امتیاز فعلی: {selectedCustomer.loyaltyPoints.toLocaleString('fa-IR')}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>مقدار امتیاز *</Label>
              <Input
                type="number"
                dir="ltr"
                placeholder="مثلاً 100"
                value={pointsAmount}
                onChange={(e) => setPointsAmount(e.target.value)}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label>توضیحات (اختیاری)</Label>
              <Textarea
                placeholder="دلیل افزودن/کسر امتیاز..."
                value={pointsDesc}
                onChange={(e) => setPointsDesc(e.target.value)}
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPointsDialog(false)}>انصراف</Button>
              <Button
                onClick={handleSavePoints}
                disabled={savingPoints}
                className={pointsMode === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {savingPoints ? <Loader2 className="w-4 h-4 animate-spin" /> : pointsMode === 'add' ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                {pointsMode === 'add' ? 'افزودن' : 'کسر'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Redemption Dialog */}
      <Dialog open={redeemDialog} onOpenChange={setRedeemDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-600" />
              بازخرج جایزه
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedCustomer && (
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-sm dark:bg-amber-900/20 dark:border-amber-800/30">
                <div className="text-amber-700 dark:text-amber-400">امتیاز قابل مصرف</div>
                <div className="text-xl font-bold text-amber-900 dark:text-amber-300">{selectedCustomer.loyaltyPoints.toLocaleString('fa-IR')}</div>
              </div>
            )}
            <div className="space-y-2">
              <Label>انتخاب جایزه *</Label>
              <Select value={selectedRewardId} onValueChange={setSelectedRewardId}>
                <SelectTrigger><SelectValue placeholder="یک جایزه انتخاب کنید..." /></SelectTrigger>
                <SelectContent>
                  {rewards.map((r) => {
                    const canAfford = selectedCustomer ? selectedCustomer.loyaltyPoints >= r.pointsCost : false;
                    return (
                      <SelectItem key={r.id} value={r.id} disabled={!canAfford}>
                        {r.name} — {r.pointsCost.toLocaleString('fa-IR')} امتیاز {!canAfford && '(امتیاز ناکافی)'}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            {selectedRewardId && selectedCustomer && (() => {
              const reward = rewards.find((r) => r.id === selectedRewardId);
              if (!reward) return null;
              const remaining = selectedCustomer.loyaltyPoints - reward.pointsCost;
              return (
                <div className="rounded-lg bg-slate-50 p-3 text-sm space-y-1 dark:bg-slate-800">
                  <div className="flex justify-between"><span className="text-slate-500">هزینه جایزه:</span><span className="font-bold text-red-600">−{reward.pointsCost.toLocaleString('fa-IR')}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">امتیاز باقی‌مانده:</span><span className="font-bold text-emerald-600">{remaining.toLocaleString('fa-IR')}</span></div>
                </div>
              );
            })()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setRedeemDialog(false)}>انصراف</Button>
              <Button onClick={handleRedeem} disabled={redeeming || !selectedRewardId} className="bg-amber-600 hover:bg-amber-700">
                {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                بازخرج جایزه
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
