'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Banknote, DollarSign, Lightbulb, Info, Loader2, FileText, User, Calendar, Bell, Building } from 'lucide-react';
import { formatToman, toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';

const DEPOSIT_TO = [
  { key: 'main_account', label: 'حساب اصلی' },
  { key: 'tehran_branch', label: 'شعبه تهران' },
  { key: 'isfahan_branch', label: 'شعبه اصفهان' },
  { key: 'shiraz_branch', label: 'شعبه شیراز' },
];

const RECEIPT_TYPES = [
  { key: 'cash', label: 'نقدی' },
  { key: 'cheque', label: 'چک' },
  { key: 'bank_transfer', label: 'انتقال بانکی' },
  { key: 'card_to_card', label: 'کارت به کارت' },
  { key: 'pos', label: 'POS' },
];

const CASH_METHODS = [
  { key: 'direct', label: 'مستقیم' },
  { key: 'atm', label: 'ATM' },
  { key: 'internet', label: 'اینترنت' },
  { key: 'cash_register', label: 'صندوق فروش' },
];

const REMINDERS = [
  { key: 'none', label: 'بدون یادآوری' },
  { key: '1day', label: '۱ روز' },
  { key: '3day', label: '۳ روز' },
  { key: '7day', label: '۷ روز' },
];

const PAYER_TYPES = [
  { key: 'customer', label: 'مشتری' },
  { key: 'supplier', label: 'تأمین‌کننده' },
];

const guideItems = [
  { icon: FileText, title: 'فاکتور مرتبط', desc: 'در صورت وجود، فاکتور مرتبط را انتخاب کنید.' },
  { icon: DollarSign, title: 'مبلغ رسید', desc: 'مبلغ رسید را به تومان وارد کنید.' },
  { icon: Banknote, title: 'نوع رسید', desc: 'نوع رسید (نقدی، چک، انتقال و...) را انتخاب کنید.' },
  { icon: Building, title: 'واریز به', desc: 'حساب یا شعبه واریز را مشخص کنید.' },
];

const emptyForm = () => ({
  invoice_id: '',
  amount: '',
  deposit_to: 'main_account',
  receipt_type: 'cash',
  cash_method: 'direct',
  bank_name: '',
  cheque_number: '',
  branch_code: '',
  tracking_number: '',
  received_date: toLocalDateString(new Date()),
  reminder: 'none',
  payer_type: 'customer',
  payer_name: '',
  notes: '',
  manual_number: '',
});

export default function NewReceiptPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState(emptyForm());

  const loadData = useCallback(async () => {
    try {
      const inv = await fetchData('invoices', { where: {} });
      setInvoices(inv || []);
    } catch {
      setInvoices([]);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const showBankFields = ['cheque', 'bank_transfer', 'card_to_card'].includes(form.receipt_type);
  const showCashMethod = ['cash', 'pos'].includes(form.receipt_type);

  const validate = () => {
    const e: Record<string, string> = {};
    const amount = Number(form.amount.replace(/[^0-9]/g, '')) || 0;
    if (amount <= 0) e.amount = 'مبلغ معتبر وارد کنید';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    const number = 'REC-' + Date.now().toString().slice(-6);
    const amount = Number(form.amount.replace(/[^0-9]/g, '')) || 0;
    try {
      await createData('receipts', {
        number,
        relatedInvoiceId: form.invoice_id === 'none' || !form.invoice_id ? null : form.invoice_id,
        amount,
        depositTo: form.deposit_to || null,
        receiptType: form.receipt_type,
        cashMethod: form.cash_method || null,
        bankName: form.bank_name || null,
        chequeNumber: form.cheque_number || null,
        branchCode: form.branch_code || null,
        trackingNumber: form.tracking_number || null,
        receivedDate: form.received_date,
        reminder: form.reminder === 'none' ? null : form.reminder,
        payerType: form.payer_type || null,
        payerName: form.payer_name || null,
        notes: form.notes || null,
        manualNumber: form.manual_number || null,
        receiptImageUrl: null,
        createdBy: profile.id,
      });
      toast.success('رسید با موفقیت ثبت شد');
      router.push('/dashboard/receipts');
    } catch (error: any) {
      toast.error('ثبت رسید ناموفق: ' + (error?.message || 'خطا'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="create-task-page" dir="rtl">
      <div className="create-task-container">
        <header className="create-task-header">
          <div>
            <div className="create-task-title">
              <span className="title-accent-bar" />
              <h1>ثبت رسید جدید</h1>
            </div>
            <div className="create-task-breadcrumb">
              داشبورد <b>←</b> رسیدها <b>←</b> ثبت رسید
            </div>
          </div>
          <Link href="/dashboard/receipts" className="back-button">
            <ArrowRight className="h-4 w-4" />
            بازگشت به رسیدها
          </Link>
        </header>

        <div className="create-task-grid">
          <form className="task-form-card" onSubmit={handleSubmit}>
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon">
                  <Banknote className="h-5 w-5" />
                </span>
                <div>
                  <h2>اطلاعات رسید</h2>
                  <p>جزئیات رسید دریافتی را وارد کنید. فیلدهای ستاره‌دار الزامی هستند.</p>
                </div>
              </div>
            </div>
            <div className="form-card-divider" />

            <div className="form-fields">
              <div className="field-group">
                <Label className="field-label">فاکتور مرتبط</Label>
                <Select value={form.invoice_id || 'none'} onValueChange={(v) => setForm({ ...form, invoice_id: v })}>
                  <SelectTrigger className="task-select">
                    <span className="select-icon-right"><FileText className="h-4 w-4" /></span>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ندارد</SelectItem>
                    {invoices.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>{inv.number} — {formatToman(Number(inv.amount))} ت</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="management-row">
                <div className="field-group">
                  <Label className="field-label">مبلغ (تومان) <span className="required-star">*</span></Label>
                  <Input
                    dir="ltr"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0"
                    className="task-input"
                  />
                  {errors.amount && <span className="field-error">{errors.amount}</span>}
                </div>

                <div className="field-group">
                  <Label className="field-label">واریز به</Label>
                  <Select value={form.deposit_to} onValueChange={(v) => setForm({ ...form, deposit_to: v })}>
                    <SelectTrigger className="task-select">
                      <span className="select-icon-right"><Building className="h-4 w-4" /></span>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPOSIT_TO.map((d) => (
                        <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="field-group">
                  <Label className="field-label">نوع رسید</Label>
                  <Select value={form.receipt_type} onValueChange={(v) => setForm({ ...form, receipt_type: v })}>
                    <SelectTrigger className="task-select">
                      <span className="select-icon-right"><Banknote className="h-4 w-4" /></span>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECEIPT_TYPES.map((t) => (
                        <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="field-group">
                <Label className="field-label">شماره دستی</Label>
                <Input
                  dir="ltr"
                  value={form.manual_number}
                  onChange={(e) => setForm({ ...form, manual_number: e.target.value })}
                  placeholder="اختیاری..."
                  className="task-input"
                />
              </div>

              <div className="management-row">
                <div className="field-group">
                  <Label className="field-label">نوع پرداخت‌کننده</Label>
                  <Select value={form.payer_type} onValueChange={(v) => setForm({ ...form, payer_type: v })}>
                    <SelectTrigger className="task-select">
                      <span className="select-icon-right"><User className="h-4 w-4" /></span>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYER_TYPES.map((p) => (
                        <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="field-group">
                  <Label className="field-label">نام پرداخت‌کننده</Label>
                  <Input
                    value={form.payer_name}
                    onChange={(e) => setForm({ ...form, payer_name: e.target.value })}
                    placeholder="نام..."
                    className="task-input"
                  />
                </div>
              </div>

              {showCashMethod && (
                <div className="field-group">
                  <Label className="field-label">روش نقدی</Label>
                  <Select value={form.cash_method} onValueChange={(v) => setForm({ ...form, cash_method: v })}>
                    <SelectTrigger className="task-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CASH_METHODS.map((c) => (
                        <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {showBankFields && (
                <div className="management-row">
                  <div className="field-group">
                    <Label className="field-label">نام بانک</Label>
                    <Input
                      value={form.bank_name}
                      onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                      className="task-input"
                    />
                  </div>
                  {form.receipt_type === 'cheque' && (
                    <>
                      <div className="field-group">
                        <Label className="field-label">شماره چک</Label>
                        <Input
                          dir="ltr"
                          value={form.cheque_number}
                          onChange={(e) => setForm({ ...form, cheque_number: e.target.value })}
                          className="task-input"
                        />
                      </div>
                      <div className="field-group">
                        <Label className="field-label">کد شعبه</Label>
                        <Input
                          dir="ltr"
                          value={form.branch_code}
                          onChange={(e) => setForm({ ...form, branch_code: e.target.value })}
                          className="task-input"
                        />
                      </div>
                    </>
                  )}
                  {(form.receipt_type === 'bank_transfer' || form.receipt_type === 'card_to_card') && (
                    <div className="field-group">
                      <Label className="field-label">شماره پیگیری</Label>
                      <Input
                        dir="ltr"
                        value={form.tracking_number}
                        onChange={(e) => setForm({ ...form, tracking_number: e.target.value })}
                        className="task-input"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="management-row">
                <div className="field-group">
                  <Label className="field-label">تاریخ دریافت</Label>
                  <div className="date-input-wrap">
                    <span className="date-icon"><Calendar className="h-4 w-4" /></span>
                    <JalaliDatePicker
                      value={form.received_date ? new Date(form.received_date) : null}
                      onChange={(d) => setForm({ ...form, received_date: d ? toLocalDateString(d) : '' })}
                      className="task-date-input"
                    />
                  </div>
                </div>
                <div className="field-group">
                  <Label className="field-label">یادآوری</Label>
                  <Select value={form.reminder} onValueChange={(v) => setForm({ ...form, reminder: v })}>
                    <SelectTrigger className="task-select">
                      <span className="select-icon-right"><Bell className="h-4 w-4" /></span>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REMINDERS.map((r) => (
                        <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="field-group">
                <Label className="field-label">توضیحات</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="توضیحات اختیاری..."
                  className="task-input"
                />
              </div>
            </div>

            <div className="form-actions-row">
              <button type="button" className="cancel-btn" onClick={() => router.push('/dashboard/receipts')} disabled={submitting}>
                انصراف
              </button>
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</>) : 'ثبت رسید'}
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
                {guideItems.map((item, i) => (
                  <div key={i}>
                    <div className="guide-item">
                      <span className="guide-item-icon"><item.icon className="h-5 w-5" /></span>
                      <div className="guide-item-text">
                        <strong>{item.title}</strong>
                        <p>{item.desc}</p>
                      </div>
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
              <p>رسیدهای ثبت شده در بخش «رسیدها» قابل مشاهده و مدیریت هستند. شماره رسید به‌صورت خودکار تولید می‌شود.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
