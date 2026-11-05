'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData, fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight, CreditCard, Loader2, Plus,
  Lightbulb, Info, Hash, User, AlertCircle, CheckSquare,
  Building2, ShieldCheck, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import type { BankAccount } from '@/lib/types';

const guideItems = [
  { icon: CheckSquare, title: 'شناسه‌های یکتا', desc: 'شماره ترمینال (TID) و شماره پذیرنده (MID) باید یکتا باشند و تکراری ثبت نشوند.' },
  { icon: Building2, title: 'حساب بانکی متصل', desc: 'حساب بانکی که تسویه کارتخوان به آن واریز می‌شود را انتخاب کنید.' },
  { icon: ShieldCheck, title: 'وضعیت فعال', desc: 'کارتخوان با وضعیت فعال قابل ثبت تراکنش است. می‌توانید بعداً آن را غیرفعال یا مسدود کنید.' },
  { icon: Calendar, title: 'تاریخ شروع', desc: 'تاریخ شروع استفاده از کارتخوان را ثبت کنید.' },
];

export default function NewCardReaderPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  const [number, setNumber] = useState('');
  const [tid, setTid] = useState('');
  const [mid, setMid] = useState('');
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [owner, setOwner] = useState('');
  const [startDate, setStartDate] = useState('');
  const [description, setDescription] = useState('');

  const loadData = useCallback(async () => {
    try {
      const baData = await fetchData<BankAccount>('bank_accounts', { where: { active: true } });
      setBankAccounts(baData || []);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    setNumber(`CR-${Date.now().toString().slice(-8)}`);
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!tid) e.tid = 'شماره ترمینال (TID) الزامی است';
    if (!mid) e.mid = 'شماره پذیرنده (MID) الزامی است';
    if (!bankName) e.bankName = 'نام بانک/شرکت پرداخت الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;

    setSubmitting(true);
    try {
      const reader = await createData('card_readers', {
        number,
        tid,
        mid,
        bankName,
        branchName: branchName || null,
        bankAccountId: bankAccountId || null,
        owner: owner || null,
        status: 'active',
        startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        description: description || null,
        createdBy: profile.id,
      }) as any;

      try {
        await createData('card_reader_history', {
          cardReaderId: reader.id,
          action: 'created',
          actionBy: profile.id,
          actionAt: new Date().toISOString(),
          toStatus: 'active',
          details: { tid, mid, bankName },
        });
      } catch {}

      toast.success('کارتخوان ثبت شد');
      router.push('/dashboard/card-readers');
    } catch (error: any) {
      toast.error('ایجاد ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-task-page" dir="rtl">
      <div className="create-task-container">
        <header className="create-task-header">
          <div>
            <div className="create-task-title">
              <span className="title-accent-bar" />
              <h1>ثبت کارتخوان جدید</h1>
            </div>
            <div className="create-task-breadcrumb">داشبورد <b>←</b> کارتخوان <b>←</b> ثبت</div>
          </div>
          <Link href="/dashboard/card-readers" className="back-button">
            <ArrowRight className="h-4 w-4" /> بازگشت به کارتخوان
          </Link>
        </header>

        <div className="create-task-grid">
          <form className="task-form-card" onSubmit={handleSubmit}>
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><CreditCard className="h-5 w-5" /></span>
                <div>
                  <h2>اطلاعات کارتخوان</h2>
                  <p>شناسه‌های ترمینال و پذیرنده را وارد کنید. این مقادیر باید یکتا باشند.</p>
                </div>
              </div>
            </div>
            <div className="form-card-divider" />

            <div className="form-fields">
              <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
                <div className="field-group">
                  <Label className="field-label">شماره داخلی</Label>
                  <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="CR-..." className="task-input bg-slate-50 dark:bg-slate-800" readOnly />
                </div>
                <div className="field-group">
                  <Label className="field-label">نام بانک / شرکت پرداخت <span className="required-star">*</span></Label>
                  <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="مثلاً: ملت، سامان، آپ..." className="task-input" />
                  {errors.bankName && <span className="field-error">{errors.bankName}</span>}
                </div>
                <div className="field-group">
                  <Label className="field-label">شماره ترمینال (TID) <span className="required-star">*</span></Label>
                  <Input value={tid} onChange={(e) => setTid(e.target.value)} placeholder="TID..." className="task-input" />
                  {errors.tid && <span className="field-error">{errors.tid}</span>}
                </div>
                <div className="field-group">
                  <Label className="field-label">شماره پذیرنده (MID) <span className="required-star">*</span></Label>
                  <Input value={mid} onChange={(e) => setMid(e.target.value)} placeholder="MID..." className="task-input" />
                  {errors.mid && <span className="field-error">{errors.mid}</span>}
                </div>
                <div className="field-group">
                  <Label className="field-label">شعبه / محل استفاده</Label>
                  <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="شعبه یا محل..." className="task-input" />
                </div>
                <div className="field-group">
                  <Label className="field-label">مالک / واحد استفاده‌کننده</Label>
                  <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="مالک یا واحد..." className="task-input" />
                </div>
                <div className="field-group">
                  <Label className="field-label">حساب بانکی متصل</Label>
                  <Select value={bankAccountId || '__none__'} onValueChange={(v) => setBankAccountId(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="task-select"><Building2 className="ml-1 h-4 w-4 text-slate-400" /><SelectValue placeholder="انتخاب حساب..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">بدون حساب</SelectItem>
                      {bankAccounts.map((b) => <SelectItem key={b.id} value={b.id}>{b.bankName} - {b.accountNo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="field-group">
                  <Label className="field-label">تاریخ شروع استفاده</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="task-input" />
                </div>
              </div>

              <div className="field-group">
                <Label className="field-label">توضیحات</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیحات اختیاری..." className="task-textarea" />
              </div>
            </div>

            <div className="form-actions-row">
              <button type="button" className="cancel-btn" onClick={() => router.push('/dashboard/card-readers')} disabled={submitting}>انصراف</button>
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</>) : (<><Plus className="h-4 w-4" /> ثبت کارتخوان</>)}
              </button>
            </div>
          </form>

          <aside className="task-sidebar">
            <div className="guide-card">
              <div className="guide-card-header">
                <span className="guide-card-icon"><Lightbulb className="h-5 w-5" /></span>
                <h2>راهنمای ثبت</h2>
              </div>
              <div className="guide-items">
                {guideItems.map((item, i) => (
                  <div key={i}>
                    <div className="guide-item">
                      <span className="guide-item-icon"><item.icon className="h-5 w-5" /></span>
                      <div className="guide-item-text"><strong>{item.title}</strong><p>{item.desc}</p></div>
                    </div>
                    {i < guideItems.length - 1 && <div className="guide-item-divider" />}
                  </div>
                ))}
              </div>
            </div>
            <div className="info-card">
              <div className="info-card-header">
                <span className="info-card-icon"><Info className="h-5 w-5" /></span>
                <h2>اطلاعات مفید</h2>
              </div>
              <p>پس از ثبت کارتخوان، می‌توانید تراکنش‌های آن را ثبت کنید و سپس سند تسویه ایجاد نمایید. چرخه کامل: تعریف کارتخوان ← ثبت تراکنش ← تأیید تراکنش ← ایجاد تسویه ← تأیید و ثبت نهایی.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
