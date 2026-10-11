'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import {
  ArrowRight, Send, Loader2, Check,
  Lightbulb, Info, User, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { fullName } from '@/lib/constants';
import type { Lead, Profile, LeadReferral } from '@/lib/types';

const guideItems = [
  { icon: TrendingUp, title: 'سرنخ فروش', desc: 'سرنخ مرتبط با این ارجاع.' },
  { icon: User, title: 'ارجاع به', desc: 'شخصی که سرنخ به او ارجاع داده شده است.' },
  { icon: Send, title: 'وضعیت', desc: 'وضعیت ارجاع را تغییر دهید.' },
];

const inputStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: '1px solid #E2E8F0',
  padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none',
};

const selectStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: '1px solid #E2E8F0',
  padding: '0 12px', fontSize: 14, width: '100%', background: 'white', outline: 'none',
};

export default function EditLeadReferralPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const refId = params.id as string;
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [leads, setLeads] = useState<Lead[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);

  const [leadId, setLeadId] = useState('');
  const [referredToProfileId, setReferredToProfileId] = useState('');
  const [status, setStatus] = useState('active');
  const [note, setNote] = useState('');

  const leadRef = useRef<HTMLSelectElement>(null);

  const loadData = useCallback(async () => {
    try {
      const [leadData, staffData, refData] = await Promise.all([
        fetchData<Lead>('leads', { where: { isArchived: false }, orderBy: { createdAt: 'desc' } }),
        fetchData<Profile>('profiles', { where: { active: true } }),
        fetchData<LeadReferral[]>('lead_referrals', { where: { id: refId } }),
      ]);
      setLeads(leadData || []);
      setStaff(staffData || []);
      const ref = (refData as any[])[0] as LeadReferral | undefined;
      if (ref) {
        setLeadId(ref.leadId);
        setReferredToProfileId(ref.referredToProfileId || '');
        setStatus(ref.status || 'active');
        setNote(ref.note || '');
      }
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
    setLoading(false);
    setTimeout(() => leadRef.current?.focus(), 100);
  }, [refId]);

  useEffect(() => { loadData(); }, [loadData]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!leadId) e.leadId = 'انتخاب سرنخ الزامی است';
    if (!referredToProfileId) e.referredToProfileId = 'انتخاب شخص الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;

    setSubmitting(true);
    try {
      await updateData('lead_referrals', { id: refId }, {
        leadId,
        referredToProfileId: referredToProfileId || null,
        status,
        note: note || null,
      });
      toast.success('ارجاع ویرایش شد');
      router.push('/dashboard/lead-referrals');
    } catch (error: any) {
      toast.error('ویرایش ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="nb-editor-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/lead-referrals" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به ارجاعیات
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> ارجاعیات سرنخ‌های فروش <b>←</b> ویرایش</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/lead-referrals')} disabled={submitting}>
            انصراف
          </button>
          <button type="submit" form="ref-form" className="nb-editor-save-btn" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="ref-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-900/20">
                  <Send className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>اطلاعات ارجاع</h2>
                  <p className="text-sm text-slate-400">جزئیات ارجاع را ویرایش کنید.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">سرنخ فروش <span className="text-red-500">*</span></Label>
                  <select ref={leadRef} value={leadId} onChange={(e) => setLeadId(e.target.value)} className="nb-input" style={{ ...selectStyle, borderColor: errors.leadId ? '#FCA5A5' : '#E2E8F0' }}>
                    <option value="">انتخاب سرنخ...</option>
                    {leads.map((l) => <option key={l.id} value={l.id}>{l.name}{l.company ? ` - ${l.company}` : ''}</option>)}
                  </select>
                  {errors.leadId && <span className="nb-editor-error">{errors.leadId}</span>}
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">ارجاع به <span className="text-red-500">*</span></Label>
                  <select value={referredToProfileId} onChange={(e) => setReferredToProfileId(e.target.value)} className="nb-input" style={{ ...selectStyle, borderColor: errors.referredToProfileId ? '#FCA5A5' : '#E2E8F0' }}>
                    <option value="">انتخاب شخص...</option>
                    {staff.map((s) => <option key={s.id} value={s.id}>{fullName(s.firstName, s.lastName)}</option>)}
                  </select>
                  {errors.referredToProfileId && <span className="nb-editor-error">{errors.referredToProfileId}</span>}
                </div>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">وضعیت</Label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="nb-input" style={selectStyle}>
                  <option value="active">فعال</option>
                  <option value="closed">بسته شده</option>
                </select>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">یادداشت</Label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="توضیحات اختیاری..."
                  className="nb-input"
                  style={{ minHeight: 100, borderRadius: 10, border: '1px solid #E2E8F0', padding: '12px 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none', resize: 'vertical' }}
                  rows={4}
                />
              </div>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="nb-editor-canvas">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-900/20"><Lightbulb className="h-5 w-5" /></span>
                <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 16 }}>راهنمای ویرایش</h2>
              </div>
              <div className="space-y-3">
                {guideItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"><item.icon className="h-3.5 w-3.5" /></span>
                    <div>
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.title}</div>
                      <div className="mt-0.5 text-xs text-slate-400">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-sky-100 bg-sky-50/50 p-4 dark:border-sky-900/30 dark:bg-sky-900/10">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-500" />
              <p className="text-xs text-sky-700 dark:text-sky-400">تغییرات ارجاع بلافاصله پس از ذخیره اعمال می‌شود.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
