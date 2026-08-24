'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight, X, FileText, UploadCloud, Loader2, User, Tag,
  Flag, Lightbulb, Info, Type, AlignRight, Gauge, UserCheck,
} from 'lucide-react';
import { TASK_PRIORITIES, fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type { Profile, Customer } from '@/lib/types';

const MAX_DESC = 2000;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const guideItems = [
  { icon: Type, title: 'عنوان واضح', desc: 'عنوانی کوتاه و گویا برای تیکت بنویسید.' },
  { icon: AlignRight, title: 'شرح کامل', desc: 'جزئیات مشکل یا درخواست را کامل توضیح دهید.' },
  { icon: Gauge, title: 'اولویت مناسب', desc: 'اولویت را متناسب با اهمیت و فوریت تنظیم کنید.' },
  { icon: UserCheck, title: 'تخصیص مسئول', desc: 'تیکت را به فرد مناسب واگذار کنید.' },
];

export default function NewTicketPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState<string | null>(null);
  const [form, setForm] = useState({
    subject: '',
    description: '',
    customerId: '',
    priority: 'medium',
  });

  const loadData = useCallback(async () => {
    try {
      const [custData, staffData] = await Promise.all([
        fetchData<Customer>('customers', { where: {} }),
        fetchData<Profile>('profiles', { where: { userType: 'staff' } }),
      ]);
      setCustomers(custData || []);
      setStaff(staffData || []);
    } catch {
      setCustomers([]);
      setStaff([]);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.subject.trim()) e.subject = 'عنوان تیکت الزامی است';
    if (!form.description.trim()) e.description = 'شرح درخواست الزامی است';
    if (!form.customerId) e.customerId = 'مشتری / درخواست‌کننده الزامی است';
    if (form.description.length > MAX_DESC) e.description = `حداکثر ${MAX_DESC} کاراکتر`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    try {
      await createData('tickets', {
        subject: form.subject.trim(),
        description: form.description.trim(),
        customerId: form.customerId || null,
        priority: form.priority,
        status: 'open',
        channel: 'internal',
        createdBy: profile.id,
      });
      toast.success('تیکت با موفقیت ایجاد شد');
      router.push('/dashboard/tickets');
    } catch (error: any) {
      toast.error('ایجاد تیکت ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error('حجم فایل نباید بیشتر از ۵ مگابایت باشد');
      return;
    }
    setFileName(file.name);
  };

  return (
    <div className="new-ticket-page" dir="rtl">
      <div className="new-ticket-container">
        {/* Page header */}
        <header className="new-ticket-page-header">
          <div className="new-ticket-title-row">
            <span className="new-ticket-title-accent" />
            <div>
              <h1>ایجاد تیکت پشتیبانی</h1>
              <p>برای ثبت درخواست پشتیبانی، فرم زیر را تکمیل کنید.</p>
            </div>
          </div>
          <Link href="/dashboard/tickets" className="new-ticket-back-button">
            <ArrowRight className="h-4 w-4" />
            بازگشت به تیکت‌ها
          </Link>
        </header>

        {/* Main grid: form + sidebar */}
        <div className="new-ticket-grid">
          {/* Form card */}
          <form className="new-ticket-card" onSubmit={handleSubmit}>
            {/* Card header */}
            <div className="new-ticket-card-header">
              <h2>اطلاعات تیکت</h2>
              <Link href="/dashboard/tickets" className="new-ticket-close-btn" aria-label="بستن">
                <X className="h-5 w-5" />
              </Link>
            </div>

            <div className="new-ticket-card-body">
              {/* Subject */}
              <div className="nt-field">
                <Label className="nt-label">عنوان تیکت <span className="nt-star">*</span></Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="موضوع کوتاه و گویای درخواست را وارد کنید..."
                  className={`nt-input ${errors.subject ? 'nt-input-error' : ''}`}
                  maxLength={200}
                />
                {errors.subject && <span className="nt-error-text">{errors.subject}</span>}
              </div>

              {/* Description */}
              <div className="nt-field">
                <Label className="nt-label">شرح درخواست <span className="nt-star">*</span></Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="شرح کامل مشکل یا درخواست خود را بنویسید..."
                  className={`nt-textarea ${errors.description ? 'nt-input-error' : ''}`}
                  maxLength={MAX_DESC}
                />
                <div className="nt-char-counter">
                  <span>{form.description.length.toLocaleString('fa-IR')} / {MAX_DESC.toLocaleString('fa-IR')}</span>
                </div>
                {errors.description && <span className="nt-error-text">{errors.description}</span>}
              </div>

              {/* Customer + Priority row */}
              <div className="nt-two-col">
                <div className="nt-field">
                  <Label className="nt-label">مشتری <span className="nt-star">*</span></Label>
                  <Select
                    value={form.customerId || 'none'}
                    onValueChange={(v) => setForm({ ...form, customerId: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger className={`nt-select ${errors.customerId ? 'nt-input-error' : ''}`}>
                      <span className="nt-select-icon"><User className="h-4 w-4" /></span>
                      <SelectValue placeholder="انتخاب مشتری..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون مشتری</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.type === 'company' ? c.companyName : fullName(c.firstName, c.lastName)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.customerId && <span className="nt-error-text">{errors.customerId}</span>}
                </div>
                <div className="nt-field">
                  <Label className="nt-label">اولویت</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger className="nt-select">
                      <span className="nt-select-icon"><Flag className="h-4 w-4" /></span>
                      <SelectValue placeholder="انتخاب اولویت..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_PRIORITIES.map((p) => (
                        <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Attachment */}
              <div className="nt-field">
                <Label className="nt-label">پیوست</Label>
                <label className="nt-upload-area">
                  <input
                    type="file"
                    className="nt-upload-input"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
                  />
                  <span className="nt-upload-icon"><UploadCloud className="h-7 w-7" /></span>
                  <span className="nt-upload-text">
                    {fileName ? fileName : 'فایل را اینجا رها کنید یا انتخاب کنید'}
                  </span>
                  <span className="nt-upload-hint">فرمت‌های مجاز: تصویر، PDF، Word، Excel، ZIP — حداکثر ۵ مگابایت</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="nt-actions">
              <button type="submit" className="nt-submit-btn" disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> در حال ایجاد...</>
                ) : (
                  <><FileText className="h-4 w-4" /> ایجاد تیکت</>
                )}
              </button>
              <button
                type="button"
                className="nt-cancel-btn"
                onClick={() => router.push('/dashboard/tickets')}
                disabled={submitting}
              >
                انصراف
              </button>
            </div>
          </form>

          {/* Sidebar */}
          <aside className="new-ticket-sidebar">
            <div className="nt-guide-card">
              <div className="nt-guide-header">
                <span className="nt-guide-icon"><Lightbulb className="h-5 w-5" /></span>
                <h2>راهنما و نکات</h2>
              </div>
              <div className="nt-guide-items">
                {guideItems.map((item, i) => (
                  <div key={i} className="nt-guide-item">
                    <span className="nt-guide-item-icon"><item.icon className="h-5 w-5" /></span>
                    <div className="nt-guide-item-text">
                      <strong>{item.title}</strong>
                      <p>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="nt-info-card">
              <div className="nt-info-header">
                <span className="nt-info-icon"><Info className="h-5 w-5" /></span>
                <h2>اطلاعات مفید</h2>
              </div>
              <p>تیکت‌های ایجاد شده در بخش «تیکت‌ها» قابل مشاهده و مدیریت هستند. می‌توانید وضعیت آن‌ها را تغییر دهید و پاسخ‌گویی به درخواست‌ها را پیگیری کنید.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
