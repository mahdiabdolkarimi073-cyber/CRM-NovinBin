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
  ArrowRight, Network, Loader2, Plus, Trash2,
  Lightbulb, Info, Hash, User, Calendar, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { toEnglishDigits, parseNumber } from '@/lib/format';
import type { ContactParty, Account, Profile } from '@/lib/types';

interface RoleRow {
  roleTitle: string;
  roleCode: string;
  calcMethod: string;
  commissionRate: string;
  fixedAmount: string;
  validFrom: string;
  validTo: string;
  saleType: string;
  settlementTerms: string;
}

const AGENT_TYPES = [
  { value: 'individual', label: 'حقیقی' },
  { value: 'company', label: 'حقوقی' },
  { value: 'broker', label: 'کارگزار' },
  { value: 'representative', label: 'نماینده' },
  { value: 'other', label: 'سایر' },
];

const CALC_METHODS = [
  { value: 'percentage', label: 'درصدی' },
  { value: 'fixed_amount', label: 'مبلغ ثابت' },
  { value: 'tiered', label: 'پله‌ای' },
];

const SALE_TYPES = [
  { value: '', label: 'همه' },
  { value: 'cash', label: 'نقدی' },
  { value: 'credit', label: 'اعتباری' },
  { value: 'installment', label: 'قسطی' },
];

const guideItems = [
  { icon: Hash, title: 'کد عامل', desc: 'کد یکتای عامل را وارد کنید (مثل AG-001).' },
  { icon: User, title: 'نوع عامل', desc: 'نوع عامل را انتخاب کنید.' },
  { icon: TrendingUp, title: 'نقش و پورسانت', desc: 'نقش‌ها و نرخ پورسانت را تعریف کنید.' },
];

export default function NewProcessAgentPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [contacts, setContacts] = useState<ContactParty[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [agentType, setAgentType] = useState('individual');
  const [contactPartyId, setContactPartyId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [settlementInfo, setSettlementInfo] = useState('');
  const [description, setDescription] = useState('');
  const [roles, setRoles] = useState<RoleRow[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [contactData, accData, staffData] = await Promise.all([
        fetchData<ContactParty>('contact_parties', { where: {} }),
        fetchData<Account>('accounts', { where: { active: true } }),
        fetchData<Profile>('profiles', { where: { active: true } }),
      ]);
      setContacts(contactData || []);
      setAccounts(accData || []);
      setStaff(staffData || []);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    setStartDate(new Date().toISOString().slice(0, 10));
  }, []);

  const addRole = () => {
    setRoles([...roles, { roleTitle: '', roleCode: '', calcMethod: 'percentage', commissionRate: '0', fixedAmount: '0', validFrom: new Date().toISOString().slice(0, 10), validTo: '', saleType: '', settlementTerms: '' }]);
  };

  const removeRole = (index: number) => {
    setRoles(roles.filter((_, i) => i !== index));
  };

  const updateRole = (index: number, field: keyof RoleRow, value: string) => {
    setRoles(roles.map((role, i) => i !== index ? role : { ...role, [field]: value }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!code) e.code = 'کد عامل الزامی است';
    if (!name) e.name = 'نام عامل الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;

    setSubmitting(true);
    try {
      const contact = contacts.find((c) => c.id === contactPartyId);
      const contactName = contact ? [contact.firstName, contact.lastName, contact.companyName].filter(Boolean).join(' ') : null;

      const agent = await createData('process_agents', {
        code,
        name,
        agentType,
        contactPartyId: contactPartyId || null,
        contactName,
        active: true,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        accountId: accountId || null,
        settlementInfo: settlementInfo || null,
        description: description || null,
        totalDebt: 0,
        totalPaid: 0,
        balance: 0,
        status: 'draft',
        createdBy: profile.id,
      }) as any;

      for (let i = 0; i < roles.length; i++) {
        const role = roles[i];
        if (!role.roleTitle) continue;
        await createData('process_agent_roles', {
          agentId: agent.id,
          roleTitle: role.roleTitle,
          roleCode: role.roleCode || null,
          active: true,
          validFrom: new Date(role.validFrom).toISOString(),
          validTo: role.validTo ? new Date(role.validTo).toISOString() : null,
          calcMethod: role.calcMethod,
          commissionRate: parseNumber(role.commissionRate),
          fixedAmount: parseNumber(role.fixedAmount),
          settlementTerms: role.settlementTerms || null,
          saleType: role.saleType || null,
        });
      }

      try {
        await createData('process_agent_history', {
          agentId: agent.id,
          action: 'created',
          actionBy: profile.id,
          actionAt: new Date().toISOString(),
          toStatus: 'draft',
          details: { code, name, agentType },
        });
      } catch {}

      toast.success('عامل فرایند ثبت شد');
      router.push('/dashboard/process-agents');
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
            <h1 className="text-[28px] font-bold text-[#101828]">ثبت عامل فرایند جدید</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> عامل فرایند <span className="mx-1.5 text-[#CBD5E1]">←</span> ثبت</div>
        </div>
        <Link href="/dashboard/process-agents">
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
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><Network className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-bold text-[#1D2939]">اطلاعات عامل</h2>
                    <p className="text-xs text-[#98A2B3]">جزئیات عامل فرایند را وارد کنید.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">کد عامل <span className="text-rose-500">*</span></Label>
                    <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="مثل AG-001..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                    {errors.code && <span className="text-xs text-rose-500">{errors.code}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">نام عامل <span className="text-rose-500">*</span></Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام عامل..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                    {errors.name && <span className="text-xs text-rose-500">{errors.name}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">نوع عامل</Label>
                    <select value={agentType} onChange={(e) => setAgentType(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      {AGENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">طرف حساب</Label>
                    <select value={contactPartyId} onChange={(e) => setContactPartyId(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      <option value="">انتخاب طرف حساب...</option>
                      {contacts.map((c) => <option key={c.id} value={c.id}>{[c.firstName, c.lastName, c.companyName].filter(Boolean).join(' ')}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">حساب تسویه</Label>
                    <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      <option value="">انتخاب حساب...</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">تاریخ شروع</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">تاریخ پایان</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">شرایط تسویه</Label>
                    <Input value={settlementInfo} onChange={(e) => setSettlementInfo(e.target.value)} placeholder="شرایط تسویه..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">توضیحات</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیحات اختیاری..." className="rounded-[10px] border-[#DCE3EE]" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#1D2939]">نقش‌ها و پورسانت</h2>
                  <Button type="button" size="sm" variant="outline" onClick={addRole}><Plus className="h-4 w-4" /> افزودن نقش</Button>
                </div>

                {roles.length === 0 ? (
                  <p className="py-3 text-center text-xs text-slate-400">نقشی ثبت نشده است</p>
                ) : (
                  <div className="space-y-3">
                    {roles.map((role, i) => (
                      <div key={i} className="rounded-lg border border-[#E7ECF3] bg-slate-50 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-bold text-[#667085]">نقش {toEnglishDigits(String(i + 1))}</span>
                          <button type="button" onClick={() => removeRole(i)} className="text-rose-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          <Input placeholder="عنوان نقش" value={role.roleTitle} onChange={(e) => updateRole(i, 'roleTitle', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <Input placeholder="کد نقش" value={role.roleCode} onChange={(e) => updateRole(i, 'roleCode', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <select value={role.calcMethod} onChange={(e) => updateRole(i, 'calcMethod', e.target.value)} className="h-[38px] rounded-[8px] border border-[#DCE3EE] bg-white px-2 text-sm">
                            {CALC_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                          </select>
                          <Input placeholder="نرخ پورسانت (%)" type="number" value={role.commissionRate} onChange={(e) => updateRole(i, 'commissionRate', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <Input placeholder="مبلغ ثابت" type="number" value={role.fixedAmount} onChange={(e) => updateRole(i, 'fixedAmount', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <select value={role.saleType} onChange={(e) => updateRole(i, 'saleType', e.target.value)} className="h-[38px] rounded-[8px] border border-[#DCE3EE] bg-white px-2 text-sm">
                            {SALE_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                          <Input type="date" placeholder="از" value={role.validFrom} onChange={(e) => updateRole(i, 'validFrom', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <Input type="date" placeholder="تا" value={role.validTo} onChange={(e) => updateRole(i, 'validTo', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <Input placeholder="شرایط تسویه" value={role.settlementTerms} onChange={(e) => updateRole(i, 'settlementTerms', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Link href="/dashboard/process-agents">
                <Button type="button" variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE]">انصراف</Button>
              </Link>
              <Button type="submit" disabled={submitting} className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</> : <><Plus className="h-4 w-4" /> ثبت عامل</>}
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
              <p className="text-xs text-blue-700">پس از ثبت عامل، باید آن را فعال کنید. نقش‌ها و نرخ پورسانت تعریف شده برای محاسبه پورسانت فروش استفاده می‌شود.</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
