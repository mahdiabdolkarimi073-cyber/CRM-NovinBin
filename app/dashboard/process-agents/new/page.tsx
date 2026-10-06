'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData, fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import {
  ArrowRight, Network, Loader2, Plus, Trash2, Check,
  Lightbulb, Info, Hash, User, TrendingUp,
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

const inputStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: '1px solid #E2E8F0',
  padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none',
};

const selectStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: '1px solid #E2E8F0',
  padding: '0 12px', fontSize: 14, width: '100%', background: 'white', outline: 'none',
};

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

  const codeRef = useRef<HTMLInputElement>(null);

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
    setTimeout(() => codeRef.current?.focus(), 100);
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
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/process-agents" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به عوامل
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> عامل فرایند <b>←</b> ثبت</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/process-agents')} disabled={submitting}>
            انصراف
          </button>
          <button type="submit" form="pa-form" className="nb-editor-save-btn" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال ثبت...' : 'ثبت عامل'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="pa-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-900/20">
                  <Network className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>اطلاعات عامل</h2>
                  <p className="text-sm text-slate-400">جزئیات عامل فرایند را وارد کنید.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">کد عامل <span className="text-red-500">*</span></Label>
                  <input
                    ref={codeRef}
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="مثل AG-001..."
                    className="nb-input"
                    style={{ ...inputStyle, borderColor: errors.code ? '#FCA5A5' : '#E2E8F0' }}
                  />
                  {errors.code && <span className="nb-editor-error">{errors.code}</span>}
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">نام عامل <span className="text-red-500">*</span></Label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="نام عامل..."
                    className="nb-input"
                    style={{ ...inputStyle, borderColor: errors.name ? '#FCA5A5' : '#E2E8F0' }}
                  />
                  {errors.name && <span className="nb-editor-error">{errors.name}</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">نوع عامل</Label>
                  <select value={agentType} onChange={(e) => setAgentType(e.target.value)} className="nb-input" style={selectStyle}>
                    {AGENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">طرف حساب</Label>
                  <select value={contactPartyId} onChange={(e) => setContactPartyId(e.target.value)} className="nb-input" style={selectStyle}>
                    <option value="">انتخاب طرف حساب...</option>
                    {contacts.map((c) => <option key={c.id} value={c.id}>{[c.firstName, c.lastName, c.companyName].filter(Boolean).join(' ')}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">حساب تسویه</Label>
                  <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="nb-input" style={selectStyle}>
                    <option value="">انتخاب حساب...</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                  </select>
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">شرایط تسویه</Label>
                  <input type="text" value={settlementInfo} onChange={(e) => setSettlementInfo(e.target.value)} placeholder="شرایط تسویه..." className="nb-input" style={inputStyle} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">تاریخ شروع</Label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="nb-input" style={inputStyle} />
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">تاریخ پایان</Label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="nb-input" style={inputStyle} />
                </div>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">توضیحات</Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="توضیحات اختیاری..."
                  className="nb-input"
                  style={{ minHeight: 100, borderRadius: 10, border: '1px solid #E2E8F0', padding: '12px 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none', resize: 'vertical' }}
                  rows={5}
                />
              </div>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-700">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">نقش‌ها و پورسانت</h3>
                <button type="button" onClick={addRole} className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700"><Plus className="h-4 w-4" /> افزودن نقش</button>
              </div>

              {roles.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">نقشی ثبت نشده است. روی «افزودن نقش» کلیک کنید.</p>
              ) : (
                <div className="space-y-3">
                  {roles.map((role, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">نقش {toEnglishDigits(String(i + 1))}</span>
                        <button type="button" onClick={() => removeRole(i)} className="text-rose-400 transition-colors hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <input placeholder="عنوان نقش" value={role.roleTitle} onChange={(e) => updateRole(i, 'roleTitle', e.target.value)} className="nb-input" style={{ height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 12px', fontSize: 13, width: '100%', background: 'transparent', outline: 'none' }} />
                        <input placeholder="کد نقش" value={role.roleCode} onChange={(e) => updateRole(i, 'roleCode', e.target.value)} className="nb-input" style={{ height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 12px', fontSize: 13, width: '100%', background: 'transparent', outline: 'none' }} />
                        <select value={role.calcMethod} onChange={(e) => updateRole(i, 'calcMethod', e.target.value)} style={{ height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 12px', fontSize: 13, width: '100%', background: 'white', outline: 'none' }}>
                          {CALC_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <input placeholder="نرخ پورسانت (%)" type="number" value={role.commissionRate} onChange={(e) => updateRole(i, 'commissionRate', e.target.value)} className="nb-input" style={{ height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 12px', fontSize: 13, width: '100%', background: 'transparent', outline: 'none' }} />
                        <input placeholder="مبلغ ثابت" type="number" value={role.fixedAmount} onChange={(e) => updateRole(i, 'fixedAmount', e.target.value)} className="nb-input" style={{ height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 12px', fontSize: 13, width: '100%', background: 'transparent', outline: 'none' }} />
                        <select value={role.saleType} onChange={(e) => updateRole(i, 'saleType', e.target.value)} style={{ height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 12px', fontSize: 13, width: '100%', background: 'white', outline: 'none' }}>
                          {SALE_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        <input type="date" placeholder="از" value={role.validFrom} onChange={(e) => updateRole(i, 'validFrom', e.target.value)} className="nb-input" style={{ height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 12px', fontSize: 13, width: '100%', background: 'transparent', outline: 'none' }} />
                        <input type="date" placeholder="تا" value={role.validTo} onChange={(e) => updateRole(i, 'validTo', e.target.value)} className="nb-input" style={{ height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 12px', fontSize: 13, width: '100%', background: 'transparent', outline: 'none' }} />
                        <input placeholder="شرایط تسویه" value={role.settlementTerms} onChange={(e) => updateRole(i, 'settlementTerms', e.target.value)} className="nb-input" style={{ height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 12px', fontSize: 13, width: '100%', background: 'transparent', outline: 'none' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>

          <aside className="space-y-4">
            <div className="nb-editor-canvas" style={{ padding: 20 }}>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-900/20">
                  <Lightbulb className="h-5 w-5" />
                </span>
                <h2 className="font-bold text-slate-900 dark:text-slate-100">راهنمای ثبت</h2>
              </div>
              <div className="space-y-3">
                {guideItems.map((item, i) => (
                  <div key={i} className="flex gap-2.5">
                    <span className="mt-0.5 shrink-0 text-slate-300"><item.icon className="h-4 w-4" /></span>
                    <div>
                      <strong className="text-sm text-slate-700 dark:text-slate-300">{item.title}</strong>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-5 dark:border-sky-900/30 dark:bg-sky-900/10">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-900/30">
                  <Info className="h-5 w-5" />
                </span>
                <h2 className="font-bold text-slate-900 dark:text-slate-100">اطلاعات مفید</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">پس از ثبت عامل، باید آن را فعال کنید. نقش‌ها و نرخ پورسانت تعریف شده برای محاسبه پورسانت فروش استفاده می‌شود.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
