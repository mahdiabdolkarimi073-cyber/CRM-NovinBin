'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchData, updateData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import {
  ArrowRight, Network, Loader2, Plus, Trash2, Check,
  Lightbulb, Info, Hash, User, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { toEnglishDigits, parseNumber } from '@/lib/format';
import type { ContactParty, Account, ProcessAgent, ProcessAgentRole } from '@/lib/types';

interface RoleRow { id?: string; roleTitle: string; roleCode: string; calcMethod: string; commissionRate: string; fixedAmount: string; validFrom: string; validTo: string; saleType: string; settlementTerms: string; }

const AGENT_TYPES = [{ value: 'individual', label: 'حقیقی' }, { value: 'company', label: 'حقوقی' }, { value: 'broker', label: 'کارگزار' }, { value: 'representative', label: 'نماینده' }, { value: 'other', label: 'سایر' }];
const CALC_METHODS = [{ value: 'percentage', label: 'درصدی' }, { value: 'fixed_amount', label: 'مبلغ ثابت' }, { value: 'tiered', label: 'پله‌ای' }];
const SALE_TYPES = [{ value: '', label: 'همه' }, { value: 'cash', label: 'نقدی' }, { value: 'credit', label: 'اعتباری' }, { value: 'installment', label: 'قسطی' }];
const guideItems = [{ icon: Hash, title: 'کد عامل', desc: 'کد یکتای عامل ثابت است.' }, { icon: User, title: 'نوع عامل', desc: 'نوع و اطلاعات عامل را ویرایش کنید.' }, { icon: TrendingUp, title: 'نقش و پورسانت', desc: 'نقش‌ها و نرخ پورسانت را ویرایش کنید.' }];

const inputStyle: React.CSSProperties = { height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' };
const selectStyle: React.CSSProperties = { height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 12px', fontSize: 14, width: '100%', background: 'white', outline: 'none' };
const itemInputStyle: React.CSSProperties = { height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px', fontSize: 13, width: '100%', background: 'transparent', outline: 'none' };

export default function EditProcessAgentPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string;
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [contacts, setContacts] = useState<ContactParty[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
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
      const [contactData, accData, paData] = await Promise.all([
        fetchData<ContactParty>('contact_parties', { where: {} }),
        fetchData<Account>('accounts', { where: { active: true } }),
        fetchData<ProcessAgent>('process_agents', { where: { id: agentId }, include: { roles: true } }),
      ]);
      setContacts(contactData || []); setAccounts(accData || []);
      const pa = (paData as any[])[0] as ProcessAgent | undefined;
      if (pa) {
        setCode(pa.code || ''); setName(pa.name || ''); setAgentType(pa.agentType || 'individual');
        setContactPartyId(pa.contactPartyId || ''); setAccountId(pa.accountId || '');
        setStartDate(pa.startDate ? new Date(pa.startDate).toISOString().slice(0, 10) : '');
        setEndDate(pa.endDate ? new Date(pa.endDate).toISOString().slice(0, 10) : '');
        setSettlementInfo(pa.settlementInfo || ''); setDescription(pa.description || '');
        setRoles((pa.roles || []).map((r: ProcessAgentRole) => ({ id: r.id, roleTitle: r.roleTitle || '', roleCode: r.roleCode || '', calcMethod: r.calcMethod || 'percentage', commissionRate: String(r.commissionRate || 0), fixedAmount: String(r.fixedAmount || 0), validFrom: r.validFrom ? new Date(r.validFrom).toISOString().slice(0, 10) : '', validTo: r.validTo ? new Date(r.validTo).toISOString().slice(0, 10) : '', saleType: r.saleType || '', settlementTerms: r.settlementTerms || '' })));
      }
    } catch (error: any) { toast.error('بارگذاری داده‌ها ناموفق: ' + error.message); }
    setLoading(false);
  }, [agentId]);
  useEffect(() => { loadData(); }, [loadData]);

  const addRole = () => setRoles([...roles, { roleTitle: '', roleCode: '', calcMethod: 'percentage', commissionRate: '0', fixedAmount: '0', validFrom: new Date().toISOString().slice(0, 10), validTo: '', saleType: '', settlementTerms: '' }]);
  const removeRole = (i: number) => setRoles(roles.filter((_, idx) => idx !== i));
  const updateRole = (i: number, field: keyof RoleRow, value: string) => setRoles(roles.map((role, idx) => idx !== i ? role : { ...role, [field]: value }));

  const validate = () => { const e: Record<string, string> = {}; if (!code) e.code = 'کد عامل الزامی است'; if (!name) e.name = 'نام عامل الزامی است'; setErrors(e); return Object.keys(e).length === 0; };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; } if (!validate()) return;
    setSubmitting(true);
    try {
      const contact = contacts.find((c) => c.id === contactPartyId); const cName = contact ? [contact.firstName, contact.lastName, contact.companyName].filter(Boolean).join(' ') : null;
      await updateData('process_agents', { id: agentId }, { name, agentType, contactPartyId: contactPartyId || null, contactName: cName, startDate: startDate ? new Date(startDate).toISOString() : null, endDate: endDate ? new Date(endDate).toISOString() : null, accountId: accountId || null, settlementInfo: settlementInfo || null, description: description || null, updatedAt: new Date().toISOString() });
      for (const role of roles) { if (!role.roleTitle) continue; const data = { roleTitle: role.roleTitle, roleCode: role.roleCode || null, active: true, validFrom: new Date(role.validFrom).toISOString(), validTo: role.validTo ? new Date(role.validTo).toISOString() : null, calcMethod: role.calcMethod, commissionRate: parseNumber(role.commissionRate), fixedAmount: parseNumber(role.fixedAmount), settlementTerms: role.settlementTerms || null, saleType: role.saleType || null }; if (role.id) { await updateData('process_agent_roles', { id: role.id }, data); } else { await createData('process_agent_roles', { agentId, ...data }); } }
      toast.success('عامل فرایند ویرایش شد'); router.push('/dashboard/process-agents');
    } catch (error: any) { toast.error('ویرایش ناموفق: ' + error.message); } finally { setSubmitting(false); }
  };

  if (loading) { return (<div className="nb-editor-page" dir="rtl"><div className="nb-empty"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" /><p>در حال بارگذاری...</p></div></div>); }

  return (
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left"><Link href="/dashboard/process-agents" className="nb-editor-back"><ArrowRight className="h-4 w-4" /> بازگشت به عوامل</Link><span className="nb-editor-breadcrumb">داشبورد <b>←</b> عامل فرایند <b>←</b> ویرایش</span></div>
        <div className="nb-editor-topbar-right"><button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/process-agents')} disabled={submitting}>انصراف</button><button type="submit" form="pa-form" className="nb-editor-save-btn" disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{submitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}</button></div>
      </div>
      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="pa-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-900/20"><Network className="h-5 w-5" /></span><div><h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>اطلاعات عامل</h2><p className="text-sm text-slate-400">جزئیات عامل فرایند را ویرایش کنید.</p></div></div></div>
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="nb-editor-field-group"><Label className="nb-editor-label">کد عامل <span className="text-red-500">*</span></Label><input value={code} readOnly className="nb-input" style={{ ...inputStyle, background: '#f8fafc' }} /></div><div className="nb-editor-field-group"><Label className="nb-editor-label">نام عامل <span className="text-red-500">*</span></Label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام عامل..." className="nb-input" style={{ ...inputStyle, borderColor: errors.name ? '#FCA5A5' : '#E2E8F0' }} />{errors.name && <span className="nb-editor-error">{errors.name}</span>}</div></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="nb-editor-field-group"><Label className="nb-editor-label">نوع عامل</Label><select value={agentType} onChange={(e) => setAgentType(e.target.value)} className="nb-input" style={selectStyle}>{AGENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div><div className="nb-editor-field-group"><Label className="nb-editor-label">طرف حساب</Label><select value={contactPartyId} onChange={(e) => setContactPartyId(e.target.value)} className="nb-input" style={selectStyle}><option value="">انتخاب طرف حساب...</option>{contacts.map((c) => <option key={c.id} value={c.id}>{[c.firstName, c.lastName, c.companyName].filter(Boolean).join(' ')}</option>)}</select></div></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="nb-editor-field-group"><Label className="nb-editor-label">حساب تسویه</Label><select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="nb-input" style={selectStyle}><option value="">انتخاب حساب...</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}</select></div><div className="nb-editor-field-group"><Label className="nb-editor-label">شرایط تسویه</Label><input value={settlementInfo} onChange={(e) => setSettlementInfo(e.target.value)} placeholder="شرایط تسویه..." className="nb-input" style={inputStyle} /></div></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="nb-editor-field-group"><Label className="nb-editor-label">تاریخ شروع</Label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="nb-input" style={inputStyle} /></div><div className="nb-editor-field-group"><Label className="nb-editor-label">تاریخ پایان</Label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="nb-input" style={inputStyle} /></div></div>
              <div className="nb-editor-field-group"><Label className="nb-editor-label">توضیحات</Label><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیحات اختیاری..." className="nb-input" style={{ minHeight: 80, borderRadius: 10, border: '1px solid #E2E8F0', padding: '12px 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none', resize: 'vertical' }} rows={3} /></div>
            </div>
            {/* Roles */}
            <div className="mt-6"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20"><TrendingUp className="h-5 w-5" /></span><h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 18 }}>نقش‌ها و پورسانت</h2></div><button type="button" onClick={addRole} className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"><Plus className="h-3.5 w-3.5" /> افزودن نقش</button></div>
              {roles.length === 0 ? <p className="py-3 text-center text-xs text-slate-400">نقشی ثبت نشده است</p> : (<div className="space-y-3">{roles.map((role, i) => (<div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold text-slate-500 dark:text-slate-400">نقش {toEnglishDigits(String(i + 1))}</span><button type="button" onClick={() => removeRole(i)} className="text-rose-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></div><div className="grid grid-cols-1 gap-2 tablet:grid-cols-2 lg:grid-cols-3"><input placeholder="عنوان نقش" value={role.roleTitle} onChange={(e) => updateRole(i, 'roleTitle', e.target.value)} className="nb-input" style={itemInputStyle} /><input placeholder="کد نقش" value={role.roleCode} onChange={(e) => updateRole(i, 'roleCode', e.target.value)} className="nb-input" style={itemInputStyle} /><select value={role.calcMethod} onChange={(e) => updateRole(i, 'calcMethod', e.target.value)} className="nb-input" style={itemInputStyle}>{CALC_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select><input type="number" placeholder="درصد پورسانت" value={role.commissionRate} onChange={(e) => updateRole(i, 'commissionRate', e.target.value)} className="nb-input" style={itemInputStyle} /><input type="number" placeholder="مبلغ ثابت" value={role.fixedAmount} onChange={(e) => updateRole(i, 'fixedAmount', e.target.value)} className="nb-input" style={itemInputStyle} /><select value={role.saleType} onChange={(e) => updateRole(i, 'saleType', e.target.value)} className="nb-input" style={itemInputStyle}>{SALE_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select><input type="date" placeholder="شروع" value={role.validFrom} onChange={(e) => updateRole(i, 'validFrom', e.target.value)} className="nb-input" style={itemInputStyle} /><input type="date" placeholder="پایان" value={role.validTo} onChange={(e) => updateRole(i, 'validTo', e.target.value)} className="nb-input" style={itemInputStyle} /><input placeholder="شرایط تسویه" value={role.settlementTerms} onChange={(e) => updateRole(i, 'settlementTerms', e.target.value)} className="nb-input" style={itemInputStyle} /></div></div>))}</div>)}
            </div>
          </form>
          <aside className="space-y-4">
            <div className="nb-editor-canvas"><div className="mb-4 flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-900/20"><Lightbulb className="h-5 w-5" /></span><h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 16 }}>راهنمای ویرایش</h2></div><div className="space-y-3">{guideItems.map((item, i) => (<div key={i} className="flex items-start gap-3"><span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"><item.icon className="h-3.5 w-3.5" /></span><div><div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.title}</div><div className="mt-0.5 text-xs text-slate-400">{item.desc}</div></div></div>))}</div></div>
            <div className="flex items-start gap-3 rounded-xl border border-sky-100 bg-sky-50/50 p-4 dark:border-sky-900/30 dark:bg-sky-900/10"><Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-500" /><p className="text-xs text-sky-700 dark:text-sky-400">تغییرات عامل فرایند بلافاصله پس از ذخیره اعمال می‌شود.</p></div>
          </aside>
        </div>
      </div>
    </div>
  );
}
