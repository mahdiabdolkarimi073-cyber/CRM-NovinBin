'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData, updateData, fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight, Award, Star, Plus, Minus, Gift,
  Lightbulb, Info, Loader2, Check, User,
} from 'lucide-react';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type { Customer } from '@/lib/types';

interface LoyaltyReward {
  id: string;
  name: string;
  pointsCost: number;
}

const guideItems = [
  { icon: Award, title: 'نوع عملیات امتیاز', desc: 'افزایش امتیاز (پاداش خرید/فعالیت) یا کسر امتیاز (خرج/انقضا) را انتخاب کنید.' },
  { icon: User, title: 'انتخاب مشتری هدف', desc: 'مشتری مورد نظر را برای اعمال تغییرات امتیاز انتخاب فرمایید.' },
  { icon: Star, title: 'میزان امتیاز', desc: 'تعداد امتیاز را به صورت عدد صحیح مثبت وارد کنید.' },
  { icon: Gift, title: 'دلیل و شرح تراکنش', desc: 'شرح دقیقی از علت اعطا یا کسر امتیاز برای ثبت در سوابق بنویسید.' },
];

export default function NewLoyaltyTransactionPage() {
  const { profile } = useAuth();
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    customerId: '',
    mode: 'add' as 'add' | 'deduct' | 'redeem',
    amount: '',
    rewardId: '',
    description: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [custData, rewardData] = await Promise.all([
        fetchData<Customer>('customers', { orderBy: { firstName: 'asc' } }),
        fetchData<LoyaltyReward>('loyalty_rewards', { where: { active: true }, orderBy: { pointsCost: 'asc' } }),
      ]);
      setCustomers(custData || []);
      setRewards(rewardData || []);
    } catch {
      setCustomers([]);
      setRewards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedCustomer = customers.find((c) => c.id === form.customerId);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.customerId) errs.customerId = 'انتخاب مشتری الزامی است';
    if (form.mode !== 'redeem') {
      const amt = Number(form.amount);
      if (!amt || amt <= 0) errs.amount = 'میزان امتیاز باید عددی بزرگتر از صفر باشد';
    } else {
      if (!form.rewardId) errs.rewardId = 'انتخاب جایزه الزامی است';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !validate() || !selectedCustomer) return;

    setSubmitting(true);
    try {
      const currentPts = selectedCustomer.loyaltyPoints || 0;

      if (form.mode === 'redeem') {
        const reward = rewards.find((r) => r.id === form.rewardId);
        if (!reward) throw new Error('جایزه نامعتبر است');
        if (currentPts < reward.pointsCost) {
          throw new Error(`مشتری امتیاز کافی ندارد (موجودی: ${currentPts}، مورد نیاز: ${reward.pointsCost})`);
        }

        const newBalance = currentPts - reward.pointsCost;
        await updateData('customers', { id: selectedCustomer.id }, { loyaltyPoints: newBalance });

        await createData('loyalty_transactions', {
          customerId: selectedCustomer.id,
          amount: -reward.pointsCost,
          balanceAfter: newBalance,
          type: 'redeem',
          description: form.description.trim() || `بازخرج جایزه «${reward.name}»`,
          createdBy: profile.id,
        });

        await createData('loyalty_redemptions', {
          customerId: selectedCustomer.id,
          rewardId: reward.id,
          pointsSpent: reward.pointsCost,
          status: 'pending',
          createdBy: profile.id,
        });

        toast.success(`جایزه «${reward.name}» با موفقیت برای مشتری ثبت شد`);
      } else {
        const delta = Number(form.amount) * (form.mode === 'add' ? 1 : -1);
        const newBalance = Math.max(0, currentPts + delta);

        await updateData('customers', { id: selectedCustomer.id }, { loyaltyPoints: newBalance });

        await createData('loyalty_transactions', {
          customerId: selectedCustomer.id,
          amount: delta,
          balanceAfter: newBalance,
          type: form.mode === 'add' ? 'earn' : 'adjust',
          description: form.description.trim() || (form.mode === 'add' ? 'افزایش دستی امتیاز' : 'کسر دستی امتیاز'),
          createdBy: profile.id,
        });

        toast.success(`امتیاز با موفقیت ${form.mode === 'add' ? 'افزایش' : 'کسر'} یافت`);
      }

      router.push('/dashboard/loyalty');
    } catch (err: any) {
      toast.error('عملیات ناموفق: ' + err.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="nb-editor-loading" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        <p>در حال بارگذاری مشتریان و جوایز...</p>
      </div>
    );
  }

  return (
    <div className="nb-editor-page" dir="rtl">
      {/* Top Bar */}
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/loyalty" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به باشگاه مشتریان
          </Link>
          <span className="nb-editor-breadcrumb">
            داشبورد <b>←</b> امتیاز و وفاداری <b>←</b> ثبت تراکنش جدید
          </span>
        </div>
        <div className="nb-editor-topbar-right">
          <button
            type="button"
            className="nb-editor-discard"
            onClick={() => router.push('/dashboard/loyalty')}
            disabled={submitting}
          >
            انصراف
          </button>
          <button
            type="submit"
            form="loyalty-form"
            className="nb-editor-save-btn"
            disabled={submitting}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال ثبت...' : 'ثبت تراکنش'}
          </button>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="loyalty-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/20">
                  <Star className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>
                    ثبت تراکنش امتیاز باشگاه
                  </h2>
                  <p className="text-sm text-slate-400">
                    افزایش، کسر یا بازخرج جوایز مشتری را به صورت ثبت سند در تاریخچه انجام دهید.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Mode Selection */}
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">نوع تراکنش امتیاز</Label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, mode: 'add' })}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3.5 text-xs font-semibold transition ${
                      form.mode === 'add'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    افزایش امتیاز
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, mode: 'deduct' })}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3.5 text-xs font-semibold transition ${
                      form.mode === 'deduct'
                        ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Minus className="h-4 w-4" />
                    کسر امتیاز
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, mode: 'redeem' })}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3.5 text-xs font-semibold transition ${
                      form.mode === 'redeem'
                        ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Gift className="h-4 w-4" />
                    بازخرج جایزه
                  </button>
                </div>
              </div>

              {/* Customer selection */}
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">انتخاب مشتری <span className="text-red-500">*</span></Label>
                <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                  <SelectTrigger className={`h-11 ${errors.customerId ? 'border-red-300' : ''}`}>
                    <User className="ml-1 h-4 w-4 text-slate-400" />
                    <SelectValue placeholder="یک مشتری را انتخاب کنید..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => {
                      const name = c.type === 'company' ? c.companyName : fullName(c.firstName, c.lastName);
                      return (
                        <SelectItem key={c.id} value={c.id}>
                          {name} — موجودی فعلی: {(c.loyaltyPoints || 0).toLocaleString('fa-IR')} امتیاز
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {errors.customerId && <span className="nb-editor-error">{errors.customerId}</span>}
              </div>

              {/* Reward selection or Amount */}
              {form.mode === 'redeem' ? (
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">انتخاب جایزه باشگاه <span className="text-red-500">*</span></Label>
                  <Select value={form.rewardId} onValueChange={(v) => setForm({ ...form, rewardId: v })}>
                    <SelectTrigger className={`h-11 ${errors.rewardId ? 'border-red-300' : ''}`}>
                      <Gift className="ml-1 h-4 w-4 text-slate-400" />
                      <SelectValue placeholder="جایزه مورد نظر را انتخاب کنید..." />
                    </SelectTrigger>
                    <SelectContent>
                      {rewards.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} — ({r.pointsCost.toLocaleString('fa-IR')} امتیاز)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.rewardId && <span className="nb-editor-error">{errors.rewardId}</span>}
                </div>
              ) : (
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">تعداد امتیاز <span className="text-red-500">*</span></Label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="مثال: ۵۰"
                    className={`nb-input ${errors.amount ? 'border-red-300' : ''}`}
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                  />
                  {errors.amount && <span className="nb-editor-error">{errors.amount}</span>}
                </div>
              )}

              {/* Description */}
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">دلیل / شرح تراکنش</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="مثال: پاداش ثبت خرید عیدانه یا خرید منظم..."
                  className="min-h-[85px]"
                />
              </div>
            </div>
          </form>

          {/* Sidebar Guide */}
          <div className="space-y-6">
            <div className="nb-editor-card">
              <div className="nb-editor-card-header">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <h3>راهنمای امتیازات</h3>
              </div>
              <div className="space-y-4">
                {guideItems.map((item, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedCustomer && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 mb-2">اطلاعات مشتری انتخابی</h4>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  موجودی فعلی: <strong className="font-bold">{(selectedCustomer.loyaltyPoints || 0).toLocaleString('fa-IR')}</strong> امتیاز
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
