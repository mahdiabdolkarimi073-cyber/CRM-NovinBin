'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { fetchData, updateData, deleteData } from '@/lib/data-client';
import {
  ArrowRight, Save, X, Phone, Mail, Calendar, MessageSquare,
  StickyNote, MapPin, ArrowUpRight, ArrowDownLeft, Clock,
  CalendarClock, HelpCircle, CheckCircle2, Trash2, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { fullName } from '@/lib/constants';
import { formatJalaliDateTime } from '@/lib/format';
import type { Customer } from '@/lib/types';

type InteractionType = 'call' | 'email' | 'meeting' | 'sms' | 'note' | 'visit';
type Outcome = 'positive' | 'negative' | 'neutral' | 'follow_up';
type Direction = 'inbound' | 'outbound';

const INTERACTION_TYPES: { id: InteractionType; label: string; icon: any }[] = [
  { id: 'call', label: 'تماس تلفنی', icon: Phone },
  { id: 'email', label: 'ایمیل', icon: Mail },
  { id: 'meeting', label: 'جلسه حضوری/آنلاین', icon: Calendar },
  { id: 'sms', label: 'پیامک / پیام‌رسان', icon: MessageSquare },
  { id: 'note', label: 'یادداشت داخلی', icon: StickyNote },
  { id: 'visit', label: 'دیدار و بازدید', icon: MapPin },
];

export default function EditCustomerInteractionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = React.use(params);
  const interactionId = unwrappedParams.id;
  const router = useRouter();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [interactionMeta, setInteractionMeta] = useState<any>(null);

  const [form, setForm] = useState({
    customerId: '',
    type: 'call' as InteractionType,
    direction: 'outbound' as Direction,
    subject: '',
    content: '',
    outcome: 'neutral' as Outcome,
    durationMin: '',
    nextFollowUp: '',
  });

  useEffect(() => {
    async function load() {
      try {
        const [custs, records] = await Promise.all([
          fetchData<Customer>('customers', { orderBy: { createdAt: 'desc' }, take: 200 }),
          fetchData<any>('customer_interactions', { where: { id: interactionId } }),
        ]);

        setCustomers(custs || []);

        const record = records?.[0];
        if (!record) {
          toast.error('تعامل مورد نظر یافت نشد');
          router.push('/dashboard/customer-interactions');
          return;
        }

        setInteractionMeta(record);
        setForm({
          customerId: record.customerId || '',
          type: (record.type as InteractionType) || 'call',
          direction: (record.direction as Direction) || 'outbound',
          subject: record.subject || '',
          content: record.content || '',
          outcome: (record.outcome as Outcome) || 'neutral',
          durationMin: record.durationMin != null ? String(record.durationMin) : '',
          nextFollowUp: record.nextFollowUp ? record.nextFollowUp.split('T')[0] : '',
        });
      } catch (err: any) {
        toast.error('خطا در بارگذاری اطلاعات: ' + (err?.message || 'نامشخص'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [interactionId, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!form.customerId) {
      toast.error('لطفاً مشتری را انتخاب کنید');
      return;
    }
    if (!form.subject.trim()) {
      toast.error('موضوع تعامل را وارد کنید');
      return;
    }

    setSaving(true);
    try {
      await updateData(
        'customer_interactions',
        { id: interactionId },
        {
          customerId: form.customerId,
          type: form.type,
          direction: form.direction,
          subject: form.subject.trim(),
          content: form.content.trim() || null,
          outcome: form.outcome,
          durationMin: form.durationMin ? Number(form.durationMin) : 0,
          nextFollowUp: form.nextFollowUp ? new Date(form.nextFollowUp).toISOString() : null,
        }
      );
      toast.success('تغییرات تعامل ذخیره شد');
      router.push('/dashboard/customer-interactions');
    } catch (err: any) {
      toast.error('خطا در ذخیره تغییرات: ' + (err?.message || 'نامشخص'));
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('آیا از حذف این تعامل اطمینان دارید؟ این عملیات قابل بازگشت نیست.')) {
      return;
    }

    setDeleting(true);
    try {
      await deleteData('customer_interactions', { id: interactionId });
      toast.success('تعامل با موفقیت حذف شد');
      router.push('/dashboard/customer-interactions');
    } catch (err: any) {
      toast.error('خطا در حذف تعامل: ' + (err?.message || 'نامشخص'));
      setDeleting(false);
    }
  };

  const getCustName = (c: Customer) => {
    return c.type === 'company' && c.companyName ? c.companyName : fullName(c.firstName, c.lastName);
  };

  if (loading) {
    return (
      <div className="nb-editor-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری اطلاعات تعامل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="nb-editor-page" dir="rtl">
      {/* Top Bar */}
      <header className="nb-editor-topbar">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/customer-interactions" className="nb-editor-back" title="بازگشت به تاریخچه تعاملات">
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="nb-editor-breadcrumb">
            <Link href="/dashboard/customer-interactions" className="hover:text-primary transition-colors">
              تاریخچه ارتباطات
            </Link>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="text-slate-900 font-semibold dark:text-slate-100">ویرایش تعامل</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors dark:border-rose-900/40 dark:hover:bg-rose-950/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deleting ? 'در حال حذف...' : 'حذف'}
          </button>
          <Link href="/dashboard/customer-interactions" className="nb-editor-discard">
            <X className="h-4 w-4" />
            انصراف
          </Link>
          <button
            type="submit"
            form="interaction-edit-form"
            disabled={saving}
            className="nb-editor-save-btn"
          >
            <Save className="h-4 w-4" />
            {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="nb-editor-main">
        <form id="interaction-edit-form" onSubmit={handleSave} className="nb-editor-canvas">
          {/* Section 1: اطلاعات اصلی */}
          <section className="nb-editor-section">
            <h2 className="nb-editor-section-title">اطلاعات اصلی تعامل</h2>
            <p className="nb-editor-section-desc">مشتری، نوع کانال ارتباطی و جهت مکالمه</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="nb-label">مشتری طرف تعامل *</label>
                <select
                  className="nb-input"
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  required
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {getCustName(c)} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="nb-label">جهت ارتباط *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, direction: 'outbound' })}
                    className={`h-10 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      form.direction === 'outbound'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm dark:bg-blue-900/30 dark:text-blue-300'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 text-blue-500" />
                    خروجی (ما تماس گرفتیم)
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, direction: 'inbound' })}
                    className={`h-10 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      form.direction === 'inbound'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                    ورودی (مشتری تماس گرفت)
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="nb-label">کانال / نوع ارتباط *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {INTERACTION_TYPES.map((t) => {
                  const Icon = t.icon;
                  const isSelected = form.type === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setForm({ ...form, type: t.id })}
                      className={`p-2.5 rounded-lg border text-center transition-all flex flex-col items-center gap-1.5 ${
                        isSelected
                          ? 'border-primary bg-primary/5 text-primary shadow-sm font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4">
              <label className="nb-label">موضوع تعامل *</label>
              <input
                type="text"
                className="nb-input"
                placeholder="موضوع گفت‌وگو یا جلسه..."
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                required
              />
            </div>
          </section>

          {/* Section 2: نتیجه و پیگیری */}
          <section className="nb-editor-section">
            <h2 className="nb-editor-section-title">نتیجه و پیگیری</h2>
            <p className="nb-editor-section-desc">وضعیت خروجی گفت‌وگو و ثبت موعد پیگیری آینده</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="nb-label">نتیجه تعامل</label>
                <select
                  className="nb-input"
                  value={form.outcome}
                  onChange={(e) => setForm({ ...form, outcome: e.target.value as Outcome })}
                >
                  <option value="positive">مثبت (رضایت، توافق یا فروش)</option>
                  <option value="neutral">خنثی (مکالمه عادی یا بدون نتیجه مشخص)</option>
                  <option value="follow_up">نیاز به پیگیری مجدد</option>
                  <option value="negative">منفی (عدم تمایل یا انصراف)</option>
                </select>
              </div>

              <div>
                <label className="nb-label">مدت زمان (دقیقه)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    className="nb-input pl-10"
                    value={form.durationMin}
                    onChange={(e) => setForm({ ...form, durationMin: e.target.value })}
                  />
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="nb-label">تاریخ پیگیری بعدی (اختیاری)</label>
                <div className="relative">
                  <input
                    type="date"
                    className="nb-input pl-10"
                    value={form.nextFollowUp}
                    onChange={(e) => setForm({ ...form, nextFollowUp: e.target.value })}
                  />
                  <CalendarClock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: متن مذاکرات */}
          <section className="nb-editor-section">
            <h2 className="nb-editor-section-title">شرح مذاکرات و یادداشت‌ها</h2>
            <p className="nb-editor-section-desc">خلاصه صحبت‌ها و تعهدات داده‌شده به مشتری</p>

            <div className="mt-4">
              <textarea
                className="nb-input min-h-[140px] leading-6"
                placeholder="متن کامل مذاکرات، سوالات مشتری، توافقات مالی یا پشتیبانی..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </div>
          </section>
        </form>

        {/* Sidebar Guide */}
        <aside className="nb-editor-guide">
          <div className="nb-editor-guide-card">
            <div className="flex items-center gap-2 mb-3 text-primary font-bold text-sm">
              <HelpCircle className="w-4 h-4" />
              شناسه و اطلاعات سیستمی
            </div>
            {interactionMeta && (
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 leading-5">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-400">تاریخ ثبت:</span>
                  <span dir="ltr">{formatJalaliDateTime(interactionMeta.interactionDate)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-400">ثبت‌شده توسط:</span>
                  <span>{interactionMeta.handledBy ? 'کاربر سیستم' : 'سیستمی'}</span>
                </div>
              </div>
            )}
            <ul className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-400 leading-5">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                <span>به‌روزرسانی تاریخ پیگیری به طور خودکار در کارت‌های هشدار تعاملات منعکس می‌شود.</span>
              </li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}
