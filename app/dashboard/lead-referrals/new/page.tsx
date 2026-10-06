'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData, fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowRight, Send, Loader2, Plus,
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
    <div className="w-full" dir="rtl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">ثبت ارجاع جدید</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> ارجاعیات سرنخ‌های فروش <span className="mx-1.5 text-[#CBD5E1]">←</span> ثبت</div>
        </div>
        <Link href="/dashboard/lead-referrals">
          <Button variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-white text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#FAFBFF]">
            <ArrowRight className="h-4 w-4" /> بازگشت
          </Button>
        </Link>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><Send className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-bold text-[#1D2939]">اطلاعات ارجاع</h2>
                    <p className="text-xs text-[#98A2B3]">سرنخ و شخص ارجاع‌شونده را انتخاب کنید.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">سرنخ فروش <span className="text-rose-500">*</span></Label>
                    <select value={leadId} onChange={(e) => setLeadId(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      <option value="">انتخاب سرنخ...</option>
                      {leads.map((l) => <option key={l.id} value={l.id}>{l.name}{l.company ? ` - ${l.company}` : ''}</option>)}
                    </select>
                    {errors.leadId && <span className="text-xs text-rose-500">{errors.leadId}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">ارجاع به <span className="text-rose-500">*</span></Label>
                    <select value={referredToProfileId} onChange={(e) => setReferredToProfileId(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      <option value="">انتخاب شخص...</option>
                      {staff.map((s) => <option key={s.id} value={s.id}>{fullName(s.firstName, s.lastName)}</option>)}
                    </select>
                    {errors.referredToProfileId && <span className="text-xs text-rose-500">{errors.referredToProfileId}</span>}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">یادداشت</Label>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="توضیحات اختیاری درباره دلیل ارجاع..." className="rounded-[10px] border-[#DCE3EE]" />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Link href="/dashboard/lead-referrals">
                <Button type="button" variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE]">انصراف</Button>
              </Link>
              <Button type="submit" disabled={submitting} className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</> : <><Plus className="h-4 w-4" /> ثبت ارجاع</>}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-500"><Lightbulb className="h-5 w-5" /></span>
                  <h2 className="text-base font-bold text-[#1D2939]">راهنمای ثبت</h2>
                </div>
                <div className="space-y-3">
                  {guideItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F1F5F9] text-[#3155E7]"><item.icon className="h-3.5 w-3.5" /></span>
                      <div>
                        <div className="text-sm font-semibold text-[#344054]">{item.title}</div>
                        <div className="mt-0.5 text-xs text-[#98A2B3]">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex items-start gap-3 rounded-[12px] border border-blue-100 bg-blue-50 p-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
              <p className="text-xs text-blue-700">پس از ثبت ارجاع، شخص ارجاع‌شونده می‌تواند سرنخ را پیگیری کند و در صورت نیاز آن را ببندد.</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
