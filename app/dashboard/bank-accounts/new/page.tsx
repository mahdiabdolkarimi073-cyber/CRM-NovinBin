'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import {
  ArrowRight, Landmark, Hash, CreditCard, Building2, Wallet,
  Type, Calendar, User, Lightbulb, Info, Loader2,
} from 'lucide-react';
import { toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';

export default function NewBankAccountPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    accountNumber: '',
    accountType: 'current',
    bankName: '',
    name: '',
    branchName: '',
    cardNumber: '',
    iban: '',
    detailTitle: '',
    detailCode: '',
    openingDate: '',
    expiryDate: '',
    cardHolderName: '',
    notes: '',
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.accountNumber.trim()) e.accountNumber = 'شماره حساب الزامی است';
    if (!form.bankName.trim()) e.bankName = 'نام بانک الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    try {
      const data: Record<string, any> = {
        name: form.name.trim() || form.bankName.trim(),
        bankName: form.bankName.trim(),
        accountNo: form.accountNumber.trim(),
        accountNumber: form.accountNumber.trim(),
        accountType: form.accountType,
        branchName: form.branchName || null,
        cardNumber: form.cardNumber || null,
        iban: form.iban || null,
        detailTitle: form.detailTitle || null,
        detailCode: form.detailCode || null,
        openingDate: form.openingDate ? new Date(form.openingDate).toISOString() : null,
        expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
        cardHolderName: form.cardHolderName || null,
        notes: form.notes || null,
        balance: 0,
        active: true,
        createdBy: profile.id,
      };
      await createData('bank_accounts', data);
      toast.success('حساب بانکی ایجاد شد');
      router.push('/dashboard/bank-accounts');
    } catch (error: any) {
      toast.error('ایجاد ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="create-task-page" dir="rtl">
      <div className="create-task-container">
        <header className="create-task-header">
          <div>
            <div className="create-task-title">
              <span className="title-accent-bar" />
              <h1>ایجاد حساب بانکی جدید</h1>
            </div>
            <div className="create-task-breadcrumb">داشبورد <b>←</b> حساب‌های بانکی <b>←</b> ایجاد حساب بانکی</div>
          </div>
          <Link href="/dashboard/bank-accounts" className="back-button">
            <ArrowRight className="h-4 w-4" /> بازگشت به حساب‌های بانکی
          </Link>
        </header>

        <div className="create-task-grid">
          <form className="task-form-card" onSubmit={handleSubmit}>
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><Landmark className="h-5 w-5" /></span>
                <div>
                  <h2>اطلاعات حساب بانکی</h2>
                  <p>جزئیات حساب بانکی را وارد کنید. فیلدهای ستاره‌دار الزامی هستند.</p>
                </div>
              </div>
            </div>
            <div className="form-card-divider" />

            <div className="form-fields">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="field-group">
                  <Label className="field-label">شماره حساب <span className="required-star">*</span></Label>
                  <Input value={form.accountNumber} onChange={(e) => set('accountNumber', e.target.value)} placeholder="مثال: 1234567890" className="task-input" />
                  {errors.accountNumber && <span className="field-error">{errors.accountNumber}</span>}
                </div>
                <div className="field-group">
                  <Label className="field-label">نوع حساب</Label>
                  <Select value={form.accountType} onValueChange={(v) => set('accountType', v)}>
                    <SelectTrigger className="task-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">جاری</SelectItem>
                      <SelectItem value="savings">پس‌انداز</SelectItem>
                      <SelectItem value="fixed">مدت‌دار</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="field-group">
                  <Label className="field-label">نام بانک / شعبه <span className="required-star">*</span></Label>
                  <Input value={form.bankName} onChange={(e) => set('bankName', e.target.value)} placeholder="مثال: بانک ملت" className="task-input" />
                  {errors.bankName && <span className="field-error">{errors.bankName}</span>}
                </div>
                <div className="field-group">
                  <Label className="field-label">نام شعبه</Label>
                  <Input value={form.branchName} onChange={(e) => set('branchName', e.target.value)} placeholder="مثال: شعبه مرکزی" className="task-input" />
                </div>
                <div className="field-group">
                  <Label className="field-label">عنوان حساب</Label>
                  <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="مثال: حساب جاری ملت" className="task-input" />
                </div>
                <div className="field-group">
                  <Label className="field-label">شماره کارت</Label>
                  <Input value={form.cardNumber} onChange={(e) => set('cardNumber', e.target.value)} placeholder="مثال: 6104-3378-1234-5678" className="task-input" maxLength={19} />
                </div>
                <div className="field-group">
                  <Label className="field-label">شماره شبا</Label>
                  <Input value={form.iban} onChange={(e) => set('iban', e.target.value)} placeholder="مثال: 012345678901234567890123" className="task-input" maxLength={24} />
                </div>
                <div className="field-group">
                  <Label className="field-label">عنوان تفصیل</Label>
                  <Input value={form.detailTitle} onChange={(e) => set('detailTitle', e.target.value)} placeholder="مثال: بانک ملت" className="task-input" />
                </div>
                <div className="field-group">
                  <Label className="field-label">کد تفصیل</Label>
                  <Input value={form.detailCode} onChange={(e) => set('detailCode', e.target.value)} placeholder="مثال: 1001" className="task-input" />
                </div>
                <div className="field-group">
                  <Label className="field-label">تاریخ افتتاح</Label>
                  <div className="date-input-wrap">
                    <span className="date-icon"><Calendar className="h-4 w-4" /></span>
                    <JalaliDatePicker value={form.openingDate ? new Date(form.openingDate) : null} onChange={(d) => set('openingDate', d ? toLocalDateString(d) : '')} placeholder="انتخاب تاریخ" className="task-date-input" />
                  </div>
                </div>
                <div className="field-group">
                  <Label className="field-label">تاریخ انقضا</Label>
                  <div className="date-input-wrap">
                    <span className="date-icon"><Calendar className="h-4 w-4" /></span>
                    <JalaliDatePicker value={form.expiryDate ? new Date(form.expiryDate) : null} onChange={(d) => set('expiryDate', d ? toLocalDateString(d) : '')} placeholder="انتخاب تاریخ" className="task-date-input" />
                  </div>
                </div>
                <div className="field-group">
                  <Label className="field-label">نام صاحب کارت</Label>
                  <Input value={form.cardHolderName} onChange={(e) => set('cardHolderName', e.target.value)} placeholder="مثال: علی رضایی" className="task-input" />
                </div>
              </div>

              <div className="field-group">
                <Label className="field-label">توضیحات</Label>
                <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="توضیحات اختیاری..." className="task-textarea" maxLength={1000} />
              </div>
            </div>

            <div className="form-actions-row">
              <button type="button" className="cancel-btn" onClick={() => router.push('/dashboard/bank-accounts')} disabled={submitting}>انصراف</button>
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ایجاد...</>) : 'ایجاد حساب بانکی'}
              </button>
            </div>
          </form>

          <aside className="task-sidebar">
            <div className="guide-card">
              <div className="guide-card-header">
                <span className="guide-card-icon"><Lightbulb className="h-5 w-5" /></span>
                <h2>راهنما و نکات</h2>
              </div>
              <div className="guide-items">
                <div>
                  <div className="guide-item"><span className="guide-item-icon"><Hash className="h-5 w-5" /></span><div className="guide-item-text"><strong>شماره حساب</strong><p>شماره حساب بانکی را بدون خط تیره وارد کنید.</p></div></div>
                  <div className="guide-item-divider" />
                </div>
                <div>
                  <div className="guide-item"><span className="guide-item-icon"><CreditCard className="h-5 w-5" /></span><div className="guide-item-text"><strong>شماره کارت</strong><p>شماره کارت ۱۶ رقمی را با خط تیره وارد کنید.</p></div></div>
                  <div className="guide-item-divider" />
                </div>
                <div>
                  <div className="guide-item"><span className="guide-item-icon"><Building2 className="h-5 w-5" /></span><div className="guide-item-text"><strong>شماره شبا</strong><p>شماره شبا (IBAN) ۲۴ رقمی است. پیشوند IR توسط سیستم اضافه می‌شود.</p></div></div>
                  <div className="guide-item-divider" />
                </div>
                <div>
                  <div className="guide-item"><span className="guide-item-icon"><Type className="h-5 w-5" /></span><div className="guide-item-text"><strong>عنوان و کد تفصیل</strong><p>برای ارتباط با حسابواره، عنوان و کد تفصیل را وارد کنید.</p></div></div>
                </div>
              </div>
            </div>
            <div className="info-card">
              <div className="info-card-header">
                <span className="info-card-icon"><Info className="h-5 w-5" /></span>
                <h2>اطلاعات مفید</h2>
              </div>
              <p>حساب‌های بانکی ایجاد شده در بخش «حساب‌های بانکی» قابل مشاهده و مدیریت هستند. می‌توانید آن‌ها را فیلتر و جستجو کنید.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
