'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight, Lightbulb, Info, Save, ClipboardList, Building2,
  TrendingUp, StickyNote, Loader2, Plus, X, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { LEAD_SOURCES, LEAD_SERVICE_TYPES } from '@/lib/constants';
import type { Lead } from '@/lib/types';

const guideCards = [
  { icon: ClipboardList, title: 'اطلاعات دقیق وارد کنید', desc: 'هرچه اطلاعات کامل‌تر باشد، شانس تبدیل این سرنخ بیشتر خواهد بود.', color: '#2563EB', bg: '#EFF6FF' },
  { icon: Building2, title: 'انتخاب حوزه فعالیت', desc: 'حوزه فعالیت مناسب را انتخاب کنید تا بتوانید بهتر پیگیری و دسته‌بندی کنید.', color: '#16B981', bg: '#F0FDF4' },
  { icon: TrendingUp, title: 'منبع جذب را مشخص کنید', desc: 'مشخص کردن منبع جذب به تحلیل عملکرد کانال‌های بازاریابی کمک می‌کند.', color: '#FF7200', bg: '#FFF7ED' },
  { icon: StickyNote, title: 'یادداشت‌های مهم', desc: 'هر اطلاعات مهمی که ممکن است در آینده نیاز باشد را یادداشت کنید.', color: '#8B5CF6', bg: '#F5F3FF' },
];

const MAX_PHONES = 10;

export default function EditLeadPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const leadId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: '', company: '', phone: '', city: '', industry: '', source: '', sourceOther: '', notes: '',
  });
  const [additionalPhones, setAdditionalPhones] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [otherService, setOtherService] = useState('');

  useEffect(() => {
    if (!leadId) return;
    (async () => {
      try {
        const leads = await fetchData<Lead>('leads', { where: { id: leadId } });
        if (!leads || leads.length === 0) {
          toast.error('سرنخ یافت نشد');
          router.push('/dashboard/leads');
          return;
        }
        const lead = leads[0];
        setForm({
          name: lead.name || '',
          company: lead.company || '',
          phone: lead.phone || '',
          city: (lead as any).city || '',
          industry: (lead as any).industry || '',
          source: lead.source || '',
          sourceOther: '',
          notes: lead.notes || '',
        });
        const extra = (lead as any).additionalPhones;
        setAdditionalPhones(Array.isArray(extra) ? extra : []);
        const services = (lead as any).serviceTypes;
        setSelectedServices(new Set(Array.isArray(services) ? services : []));
        setTimeout(() => nameInputRef.current?.focus(), 100);
      } catch (error: any) {
        toast.error('بارگذاری سرنخ ناموفق: ' + error.message);
        router.push('/dashboard/leads');
      }
      setLoading(false);
    })();
  }, [leadId, router]);

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'نام سرنخ الزامی است';
    if (!form.phone.trim()) e.phone = 'شماره تلفن الزامی است';
    else if (!/^0?9\d{9}$/.test(form.phone.replace(/[\s-]/g, ''))) e.phone = 'شماره تلفن معتبر نیست (مثال: 09123456789)';
    additionalPhones.forEach((p, i) => {
      if (p.trim() && !/^0?9\d{9}$/.test(p.replace(/[\s-]/g, ''))) e[`phone_${i}`] = 'شماره تلفن معتبر نیست';
    });
    if (!form.city.trim()) e.city = 'شهر الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form, additionalPhones]);

  const toggleService = (service: string) => {
    const updated = new Set(selectedServices);
    if (updated.has(service)) updated.delete(service);
    else updated.add(service);
    setSelectedServices(updated);
  };

  const addPhone = () => {
    if (additionalPhones.length < MAX_PHONES - 1) setAdditionalPhones([...additionalPhones, '']);
  };
  const removePhone = (index: number) => setAdditionalPhones(additionalPhones.filter((_, i) => i !== index));
  const updatePhone = (index: number, value: string) => {
    const updated = [...additionalPhones];
    updated[index] = value;
    setAdditionalPhones(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    const combinedNotes = [
      form.notes || '',
      form.industry ? `حوزه فعالیت: ${form.industry.trim()}` : '',
      form.city ? `شهر: ${form.city.trim()}` : '',
    ].filter(Boolean).join('\n').trim();
    const validAdditionalPhones = additionalPhones.filter((p) => p.trim());
    try {
      const finalSource = form.source === 'سایر' && form.sourceOther.trim() ? form.sourceOther.trim() : form.source;
      await updateData('leads', { id: leadId }, {
        name: form.name.trim(),
        company: form.company.trim() || null,
        phone: form.phone.trim() || null,
        additionalPhones: validAdditionalPhones,
        city: form.city.trim() || null,
        industry: form.industry.trim() || null,
        serviceTypes: Array.from(selectedServices),
        source: finalSource || null,
        notes: combinedNotes || null,
      });
      toast.success('سرنخ با موفقیت ویرایش شد');
      router.push('/dashboard/leads');
    } catch (error: any) {
      toast.error('ویرایش سرنخ ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="nb-editor-loading" dir="rtl">
        <span />
        <p>در حال بارگذاری سرنخ...</p>
      </div>
    );
  }

  return (
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/leads" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به سرنخ‌ها
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> سرنخ‌های فروش <b>←</b> ویرایش سرنخ</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/leads')} disabled={submitting}>
            انصراف
          </button>
          <button type="submit" form="lead-edit-form" className="nb-editor-save-btn" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {submitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="lead-edit-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-900/20">
                  <TrendingUp className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>ویرایش سرنخ</h2>
                  <p className="text-sm text-slate-400">اطلاعات سرنخ را ویرایش کنید.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">نام <span className="text-red-500">*</span></Label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="نام شخص یا شرکت"
                  className={`nb-input ${errors.name ? 'border-red-300' : ''}`}
                  style={{ height: 44, borderRadius: 10, border: `1px solid ${errors.name ? '#FCA5A5' : '#E2E8F0'}`, padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                />
                {errors.name && <span className="nb-editor-error">{errors.name}</span>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">شرکت</Label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    placeholder="نام شرکت (اختیاری)"
                    className="nb-input"
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                  />
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">شهر <span className="text-red-500">*</span></Label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="شهر را وارد کنید"
                    className={`nb-input ${errors.city ? 'border-red-300' : ''}`}
                    style={{ height: 44, borderRadius: 10, border: `1px solid ${errors.city ? '#FCA5A5' : '#E2E8F0'}`, padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                  />
                  {errors.city && <span className="nb-editor-error">{errors.city}</span>}
                </div>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">تلفن اصلی <span className="text-red-500">*</span></Label>
                <input
                  type="tel"
                  inputMode="tel"
                  dir="ltr"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="مثال: 09123456789"
                  className={`nb-input ${errors.phone ? 'border-red-300' : ''}`}
                  style={{ height: 44, borderRadius: 10, border: `1px solid ${errors.phone ? '#FCA5A5' : '#E2E8F0'}`, padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                />
                {errors.phone && <span className="nb-editor-error">{errors.phone}</span>}
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">شماره‌های اضافی (حداکثر ۱۰ شماره)</Label>
                <div className="space-y-2">
                  {additionalPhones.map((phone, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="tel"
                        inputMode="tel"
                        dir="ltr"
                        value={phone}
                        onChange={(e) => updatePhone(i, e.target.value)}
                        placeholder={`شماره ${i + 2} - مثال: 09123456789`}
                        className={`nb-input ${errors[`phone_${i}`] ? 'border-red-300' : ''}`}
                        style={{ height: 44, borderRadius: 10, border: `1px solid ${errors[`phone_${i}`] ? '#FCA5A5' : '#E2E8F0'}`, padding: '0 14px', fontSize: 14, flex: 1, background: 'transparent', outline: 'none' }}
                      />
                      <button type="button" onClick={() => removePhone(i)} className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:border-slate-700" title="حذف">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {additionalPhones.length < MAX_PHONES - 1 && (
                  <button type="button" onClick={addPhone} className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-600 hover:underline">
                    <Plus className="h-4 w-4" /> افزودن شماره
                  </button>
                )}
                <p className="text-xs text-slate-400">{(additionalPhones.length + 1).toLocaleString('fa-IR')} از {MAX_PHONES.toLocaleString('fa-IR')} شماره</p>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">حوزه فعالیت</Label>
                <input
                  type="text"
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  placeholder="حوزه فعالیت را وارد کنید (اختیاری)"
                  className="nb-input"
                  style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                />
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">نوع خدمات درخواستی</Label>
                <p className="text-xs text-slate-400 mb-2">می‌توانید چند مورد را انتخاب کنید</p>
                <div className="flex flex-wrap gap-2">
                  {LEAD_SERVICE_TYPES.map((service) => {
                    const checked = selectedServices.has(service);
                    return (
                      <button
                        key={service}
                        type="button"
                        onClick={() => toggleService(service)}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${checked ? 'border-sky-500 bg-sky-50 text-sky-600 dark:bg-sky-900/20' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
                      >
                        {checked && <Check className="h-3 w-3" />}
                        {service}
                      </button>
                    );
                  })}
                </div>
                {selectedServices.size > 0 && (
                  <p className="text-xs text-sky-600 mt-1">{selectedServices.size.toLocaleString('fa-IR')} مورد انتخاب شده</p>
                )}
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">سایر خدمات</Label>
                <p className="text-xs text-slate-400 mb-2">اگر خدمت مورد نظر در لیست بالا نیست، اینجا بنویسید</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={otherService}
                    onChange={(e) => setOtherService(e.target.value)}
                    placeholder="نوع خدمت دیگر..."
                    className="nb-input"
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, flex: 1, background: 'transparent', outline: 'none' }}
                  />
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                    onClick={() => {
                      const val = otherService.trim();
                      if (!val) return;
                      const updated = new Set(selectedServices);
                      updated.add(val);
                      setSelectedServices(updated);
                      setOtherService('');
                      toast.success(`«${val}» اضافه شد`);
                    }}
                  >
                    <Plus className="h-4 w-4" /> افزودن
                  </button>
                </div>
                {selectedServices.size > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {Array.from(selectedServices).filter((s) => !LEAD_SERVICE_TYPES.includes(s)).map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-600 dark:bg-sky-900/20">
                        {s}
                        <button type="button" onClick={() => { const u = new Set(selectedServices); u.delete(s); setSelectedServices(u); }}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">منبع جذب</Label>
                <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="منبع جذب را انتخاب کنید" /></SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((src) => <SelectItem key={src} value={src}>{src}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.source === 'سایر' && (
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">منبع جذب (سایر)</Label>
                  <input
                    type="text"
                    value={form.sourceOther || ''}
                    onChange={(e) => setForm({ ...form, sourceOther: e.target.value })}
                    placeholder="نوع منبع جذب را وارد کنید..."
                    className="nb-input"
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                  />
                </div>
              )}

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">یادداشت</Label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value.slice(0, 500) })}
                  placeholder="یادداشت یا توضیحات مربوط به این سرنخ..."
                  className="nb-input"
                  style={{ minHeight: 120, borderRadius: 10, border: '1px solid #E2E8F0', padding: '12px 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none', resize: 'vertical' }}
                  rows={6}
                />
                <p className="text-xs text-slate-400 text-left">{form.notes.length.toLocaleString('fa-IR')} / ۵۰۰</p>
              </div>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="nb-editor-canvas" style={{ padding: 20 }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/20">
                  <Lightbulb className="h-5 w-5" />
                </span>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">راهنما و نکات</h3>
              </div>
              <div className="space-y-3">
                {guideCards.map((card, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: card.bg, color: card.color }}>
                      <card.icon className="h-4 w-4" />
                    </span>
                    <div>
                      <strong className="block text-sm text-slate-700 dark:text-slate-200">{card.title}</strong>
                      <p className="text-xs text-slate-400 leading-5 mt-0.5">{card.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="nb-editor-canvas" style={{ padding: 20 }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-900/20">
                  <Info className="h-5 w-5" />
                </span>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">اطلاعات مفید</h3>
              </div>
              <p className="text-sm text-slate-400 leading-6">پس از ویرایش سرنخ می‌توانید مراحل فروش را پیگیری کنید.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
