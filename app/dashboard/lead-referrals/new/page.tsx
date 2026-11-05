'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData, fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import {
  ArrowRight, Send, Loader2, Plus, Check,
  Lightbulb, Info, User, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { fullName } from '@/lib/constants';
import type { Lead, Profile } from '@/lib/types';

const guideItems = [
  { icon: TrendingUp, title: 'سرنخ فروش', desc: 'سرنخی که می‌خواهید ارجاع دهید را انتخاب کنید.' },
  { icon: User, title: 'ارجاع به', desc: 'شخصی که سرنخ به او ارجاع داده می‌شود.' },
  { icon: Send, title: 'یادداشت', desc: 'توضیحات اختیاری درباره دلیل ارجاع.' },
];

const inputStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: '1px solid #E2E8F0',
  padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none',
};

const selectStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: '1px solid #E2E8F0',
  padding: '0 12px', fontSize: 14, width: '100%', background: 'white', outline: 'none',
};

export default function NewLeadReferralPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [leads, setLeads] = useState<Lead[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);

  const [leadId, setLeadId] = useState('');
  const [referredToProfileId, setReferredToProfileId] = useState('');
  const [note, setNote] = useState('');

  const leadRef = useRef<HTMLSelectElement>(null);

  const loadData = useCallback(async () => {
    try {
      const [leadData, staffData] = await Promise.all([
        fetchData<Lead>('leads', { where: { isArchived: false }, orderBy: { createdAt: 'desc' } }),
        fetchData<Profile>('profiles', { where: { active: true } }),
      ]);
      setLeads(leadData || []);
      setStaff(staffData || []);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
  }, []);

  useEffect(() => {
    loadData();
    setTimeout(() => leadRef.current?.focus(), 100);
  }, [loadData]);

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
      await createData('lead_referrals', {
        leadId,
        referredToProfileId: referredToProfileId || null,
        referredByProfileId: profile.id,
        status: 'active',
        note: note || null,
      });
      toast.success('ارجاع ثبت شد');
      router.push('/dashboard/lead-referrals');
    } catch (error: any) {
      toast.error('ایجاد ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/lead-referrals" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به ارجاعیات
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> ارجاعیات سرنخ‌های فروش <b>←</b> ثبت</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/lead-referrals')} disabled={submitting}>
            انصراف
          </button>
          <button type="submit" form="ref-form" className="nb-editor-save-btn" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال ثبت...' : 'ثبت ارجاع'}
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
                  <p className="text-sm text-slate-400">سرنخ و شخص ارجاع‌شونده را انتخاب کنید.</p>
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
                <Label className="nb-editor-label">یادداشت</Label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="توضیحات اختیاری درباره دلیل ارجاع..."
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
                <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 16 }}>راهنمای ثبت</h2>
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
              <p className="text-xs text-sky-700 dark:text-sky-400">پس از ثبت ارجاع، شخص ارجاع‌شونده می‌تواند سرنخ را پیگیری کند و در صورت نیاز آن را ببندد.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
