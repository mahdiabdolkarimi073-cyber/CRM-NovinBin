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
  ArrowRight, Contact, User, Building2, Type, Hash, IdCard, Calendar,
  Briefcase, Phone, Mail, Globe, Tag, Wallet, Scale, MapPin,
  Users as UsersIcon, Plus, Trash2, Lightbulb, Info, Loader2, ChevronDown,
} from 'lucide-react';
import { toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';

type PersonRow = { name: string; position: string; phone: string; email: string };
type AddressRow = { type: string; city: string; address: string; postalCode: string; title: string; branchCode: string };

const COMPANY_TYPES = ['سهامی خاص', 'سهامی عام', 'مسئولیت محدود', 'تضامنی', 'مختلط غیرسهامی', 'مختلط سهامی', 'تعاونی', 'دولتی'];

export default function NewContactPartyPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [type, setType] = useState<'individual' | 'company'>('individual');
  const [detailType, setDetailType] = useState<'detail' | 'supplier' | 'customer'>('detail');
  const [section, setSection] = useState<string>('none');

  // individual
  const [ind, setInd] = useState({ firstName: '', lastName: '', detailedType: '', detailedCode: '', nationalId: '', birthDate: '', passportNumber: '' });
  // company
  const [cmp, setCmp] = useState({ companyName: '', nationalCompanyId: '', registrationNo: '', economicCode: '', registrationDate: '', companyType: '', ceoName: '', companyPhone: '', companyEmail: '', website: '' });
  // supplier
  const [sup, setSup] = useState({ supplierBalance: '', supplierIdentity: 'debit' });
  // customer
  const [cus, setCus] = useState({ discountPercent: '', customerGroupId: '', customerBalance: '' });
  const [periodBalance, setPeriodBalance] = useState('');
  const [notes, setNotes] = useState('');
  // related persons
  const [persons, setPersons] = useState<PersonRow[]>([]);
  // addresses
  const [addresses, setAddresses] = useState<AddressRow[]>([]);
  // phones
  const [phones, setPhones] = useState<string[]>([]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (type === 'individual') {
      if (!ind.firstName.trim()) e.firstName = 'نام الزامی است';
      if (!ind.lastName.trim()) e.lastName = 'نام خانوادگی الزامی است';
    } else {
      if (!cmp.companyName.trim()) e.companyName = 'نام شرکت الزامی است';
    }
    if (detailType === 'supplier' && !sup.supplierBalance.trim()) e.supplierBalance = 'مانده دوره الزامی است';
    if (detailType === 'customer' && !cus.discountPercent.trim()) e.discountPercent = 'درصد تخفیف الزامی است';
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
        type,
        detailType,
        createdBy: profile.id,
        periodBalance: periodBalance ? Number(periodBalance) : 0,
      };
      if (type === 'individual') {
        data.firstName = ind.firstName.trim();
        data.lastName = ind.lastName.trim();
        data.detailedType = ind.detailedType || null;
        data.detailedCode = ind.detailedCode || null;
        data.nationalId = ind.nationalId || null;
        data.birthDate = ind.birthDate ? new Date(ind.birthDate).toISOString() : null;
        data.passportNumber = ind.passportNumber || null;
      } else {
        data.companyName = cmp.companyName.trim();
        data.nationalCompanyId = cmp.nationalCompanyId || null;
        data.registrationNo = cmp.registrationNo || null;
        data.economicCode = cmp.economicCode || null;
        data.registrationDate = cmp.registrationDate ? new Date(cmp.registrationDate).toISOString() : null;
        data.companyType = cmp.companyType || null;
        data.ceoName = cmp.ceoName || null;
        data.companyPhone = cmp.companyPhone || null;
        data.companyEmail = cmp.companyEmail || null;
        data.website = cmp.website || null;
      }
      if (detailType === 'supplier') {
        data.supplierBalance = sup.supplierBalance ? Number(sup.supplierBalance) : 0;
        data.supplierIdentity = sup.supplierIdentity;
      }
      if (detailType === 'customer') {
        data.discountPercent = cus.discountPercent ? Number(cus.discountPercent) : 0;
        data.customerGroupId = cus.customerGroupId || null;
        data.customerBalance = cus.customerBalance ? Number(cus.customerBalance) : 0;
      }
      // nested creates
      if (persons.length > 0) {
        data.relatedPersons = { create: persons.filter((p) => p.name.trim()).map((p) => ({ name: p.name.trim(), position: p.position || null, phone: p.phone || null, email: p.email || null })) };
      }
      if (addresses.length > 0) {
        data.addresses = { create: addresses.filter((a) => a.address.trim() || a.city.trim()).map((a) => ({ type: a.type || null, city: a.city || null, address: a.address || null, postalCode: a.postalCode || null, title: a.title || null, branchCode: a.branchCode || null })) };
      }
      if (phones.length > 0) {
        data.phones = { create: phones.filter((p) => p.trim()).map((p) => ({ phone: p.trim() })) };
      }
      if (notes.trim()) data.notes = notes.trim();

      await createData('contact_parties', data);
      toast.success('طرف حساب ایجاد شد');
      router.push('/dashboard/contact-parties');
    } catch (error: any) {
      toast.error('ایجاد ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const addPerson = () => setPersons([...persons, { name: '', position: '', phone: '', email: '' }]);
  const removePerson = (i: number) => setPersons(persons.filter((_, idx) => idx !== i));
  const updatePerson = (i: number, field: keyof PersonRow, val: string) => setPersons(persons.map((p, idx) => idx === i ? { ...p, [field]: val } : p));

  const addAddress = () => setAddresses([...addresses, { type: '', city: '', address: '', postalCode: '', title: '', branchCode: '' }]);
  const removeAddress = (i: number) => setAddresses(addresses.filter((_, idx) => idx !== i));
  const updateAddress = (i: number, field: keyof AddressRow, val: string) => setAddresses(addresses.map((a, idx) => idx === i ? { ...a, [field]: val } : a));

  const addPhone = () => setPhones([...phones, '']);
  const removePhone = (i: number) => setPhones(phones.filter((_, idx) => idx !== i));
  const updatePhone = (i: number, val: string) => setPhones(phones.map((p, idx) => idx === i ? val : p));

  const sectionItems = [
    { key: 'details', label: 'جزئیات', icon: Tag },
    { key: 'persons', label: 'افراد مرتبط', icon: UsersIcon },
    { key: 'addresses', label: 'نشانی‌ها', icon: MapPin },
    { key: 'phones', label: 'تلفن‌ها', icon: Phone },
  ];

  return (
    <div className="create-task-page" dir="rtl">
      <div className="create-task-container">
        <header className="create-task-header">
          <div>
            <div className="create-task-title">
              <span className="title-accent-bar" />
              <h1>ایجاد طرف حساب جدید</h1>
            </div>
            <div className="create-task-breadcrumb">داشبورد <b>←</b> طرف حساب <b>←</b> ایجاد طرف حساب</div>
          </div>
          <Link href="/dashboard/contact-parties" className="back-button">
            <ArrowRight className="h-4 w-4" /> بازگشت به طرف حساب
          </Link>
        </header>

        <div className="create-task-grid">
          <form className="task-form-card" onSubmit={handleSubmit}>
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><Contact className="h-5 w-5" /></span>
                <div>
                  <h2>اطلاعات طرف حساب</h2>
                  <p>نوع طرف حساب را انتخاب کنید و جزئیات را وارد نمایید. فیلدهای ستاره‌دار الزامی هستند.</p>
                </div>
              </div>
            </div>
            <div className="form-card-divider" />

            <div className="form-fields">
              {/* Type toggle */}
              <div className="field-group">
                <Label className="field-label">نوع طرف حساب <span className="required-star">*</span></Label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setType('individual')} className={`flex items-center gap-2 rounded-[10px] border-2 p-4 text-sm font-semibold transition-all ${type === 'individual' ? 'border-[#3155E7] bg-[#EFF4FF] text-[#3155E7]' : 'border-[#DCE3EE] bg-white text-[#667085] hover:border-[#BFD0FF]'}`}>
                    <User className="h-5 w-5" /> شخص حقیقی
                  </button>
                  <button type="button" onClick={() => setType('company')} className={`flex items-center gap-2 rounded-[10px] border-2 p-4 text-sm font-semibold transition-all ${type === 'company' ? 'border-[#3155E7] bg-[#EFF4FF] text-[#3155E7]' : 'border-[#DCE3EE] bg-white text-[#667085] hover:border-[#BFD0FF]'}`}>
                    <Building2 className="h-5 w-5" /> شخص حقوقی
                  </button>
                </div>
              </div>

              {/* Individual fields */}
              {type === 'individual' && (
                <div className="rounded-[12px] border border-[#E6EBF2] bg-[#FAFBFC] p-4">
                  <div className="mb-3 flex items-center gap-2"><User className="h-4 w-4 text-[#3155E7]" /><span className="text-sm font-bold text-[#1D2939]">اطلاعات شخص حقیقی</span></div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="field-group">
                      <Label className="field-label">نام <span className="required-star">*</span></Label>
                      <Input value={ind.firstName} onChange={(e) => setInd({ ...ind, firstName: e.target.value })} placeholder="مثال: علی" className="task-input" />
                      {errors.firstName && <span className="field-error">{errors.firstName}</span>}
                    </div>
                    <div className="field-group">
                      <Label className="field-label">نام خانوادگی <span className="required-star">*</span></Label>
                      <Input value={ind.lastName} onChange={(e) => setInd({ ...ind, lastName: e.target.value })} placeholder="مثال: رضایی" className="task-input" />
                      {errors.lastName && <span className="field-error">{errors.lastName}</span>}
                    </div>
                    <div className="field-group">
                      <Label className="field-label">نوع تفصیلی</Label>
                      <Input value={ind.detailedType} onChange={(e) => setInd({ ...ind, detailedType: e.target.value })} placeholder="مثال: کارمند" className="task-input" />
                    </div>
                    <div className="field-group">
                      <Label className="field-label">کد تفصیلی</Label>
                      <Input value={ind.detailedCode} onChange={(e) => setInd({ ...ind, detailedCode: e.target.value })} placeholder="مثال: 1001" className="task-input" />
                    </div>
                    <div className="field-group">
                      <Label className="field-label">کد ملی</Label>
                      <Input value={ind.nationalId} onChange={(e) => setInd({ ...ind, nationalId: e.target.value })} placeholder="مثال: 1234567890" className="task-input" />
                    </div>
                    <div className="field-group">
                      <Label className="field-label">تاریخ تولد</Label>
                      <div className="date-input-wrap">
                        <span className="date-icon"><Calendar className="h-4 w-4" /></span>
                        <JalaliDatePicker value={ind.birthDate ? new Date(ind.birthDate) : null} onChange={(d) => setInd({ ...ind, birthDate: d ? toLocalDateString(d) : '' })} placeholder="انتخاب تاریخ" className="task-date-input" />
                      </div>
                    </div>
                    <div className="field-group">
                      <Label className="field-label">شماره گذرنامه</Label>
                      <Input value={ind.passportNumber} onChange={(e) => setInd({ ...ind, passportNumber: e.target.value })} placeholder="مثال: A12345678" className="task-input" />
                    </div>
                  </div>
                </div>
              )}

              {/* Company fields */}
              {type === 'company' && (
                <div className="rounded-[12px] border border-[#E6EBF2] bg-[#FAFBFC] p-4">
                  <div className="mb-3 flex items-center gap-2"><Building2 className="h-4 w-4 text-[#3155E7]" /><span className="text-sm font-bold text-[#1D2939]">اطلاعات شخص حقوقی</span></div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="field-group">
                      <Label className="field-label">نام شرکت <span className="required-star">*</span></Label>
                      <Input value={cmp.companyName} onChange={(e) => setCmp({ ...cmp, companyName: e.target.value })} placeholder="مثال: شرکت نوین" className="task-input" />
                      {errors.companyName && <span className="field-error">{errors.companyName}</span>}
                    </div>
                    <div className="field-group">
                      <Label className="field-label">شناسه ملی</Label>
                      <Input value={cmp.nationalCompanyId} onChange={(e) => setCmp({ ...cmp, nationalCompanyId: e.target.value })} placeholder="مثال: 14001234567" className="task-input" />
                    </div>
                    <div className="field-group">
                      <Label className="field-label">شماره ثبت</Label>
                      <Input value={cmp.registrationNo} onChange={(e) => setCmp({ ...cmp, registrationNo: e.target.value })} placeholder="مثال: 12345" className="task-input" />
                    </div>
                    <div className="field-group">
                      <Label className="field-label">کد اقتصادی</Label>
                      <Input value={cmp.economicCode} onChange={(e) => setCmp({ ...cmp, economicCode: e.target.value })} placeholder="مثال: 41111222333" className="task-input" />
                    </div>
                    <div className="field-group">
                      <Label className="field-label">تاریخ ثبت</Label>
                      <div className="date-input-wrap">
                        <span className="date-icon"><Calendar className="h-4 w-4" /></span>
                        <JalaliDatePicker value={cmp.registrationDate ? new Date(cmp.registrationDate) : null} onChange={(d) => setCmp({ ...cmp, registrationDate: d ? toLocalDateString(d) : '' })} placeholder="انتخاب تاریخ" className="task-date-input" />
                      </div>
                    </div>
                    <div className="field-group">
                      <Label className="field-label">نوع شرکت</Label>
                      <Select value={cmp.companyType} onValueChange={(v) => setCmp({ ...cmp, companyType: v })}>
                        <SelectTrigger className="task-select"><SelectValue placeholder="انتخاب نوع شرکت..." /></SelectTrigger>
                        <SelectContent>{COMPANY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="field-group">
                      <Label className="field-label">مدیرعامل</Label>
                      <Input value={cmp.ceoName} onChange={(e) => setCmp({ ...cmp, ceoName: e.target.value })} placeholder="مثال: محمد رضایی" className="task-input" />
                    </div>
                    <div className="field-group">
                      <Label className="field-label">تلفن</Label>
                      <Input value={cmp.companyPhone} onChange={(e) => setCmp({ ...cmp, companyPhone: e.target.value })} placeholder="مثال: 02112345678" className="task-input" />
                    </div>
                    <div className="field-group">
                      <Label className="field-label">ایمیل</Label>
                      <Input value={cmp.companyEmail} onChange={(e) => setCmp({ ...cmp, companyEmail: e.target.value })} placeholder="مثال: info@company.com" className="task-input" />
                    </div>
                    <div className="field-group">
                      <Label className="field-label">وب‌سایت</Label>
                      <Input value={cmp.website} onChange={(e) => setCmp({ ...cmp, website: e.target.value })} placeholder="مثال: www.company.com" className="task-input" />
                    </div>
                  </div>
                </div>
              )}

              {/* Section selector */}
              <div className="field-group">
                <Label className="field-label">بخش‌های اضافی</Label>
                <div className="flex flex-wrap gap-2">
                  {sectionItems.map((item) => (
                    <button key={item.key} type="button" onClick={() => setSection(section === item.key ? 'none' : item.key)} className={`flex items-center gap-1.5 rounded-[10px] border-2 px-4 py-2.5 text-sm font-semibold transition-all ${section === item.key ? 'border-[#3155E7] bg-[#EFF4FF] text-[#3155E7]' : 'border-[#DCE3EE] bg-white text-[#667085] hover:border-[#BFD0FF]'}`}>
                      <item.icon className="h-4 w-4" /> {item.label}
                      {section === item.key && <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Details section */}
              {section === 'details' && (
                <div className="rounded-[12px] border border-[#E6EBF2] bg-[#FAFBFC] p-4">
                  <div className="mb-3 flex items-center gap-2"><Tag className="h-4 w-4 text-[#3155E7]" /><span className="text-sm font-bold text-[#1D2939]">جزئیات</span></div>
                  <div className="field-group">
                    <Label className="field-label">نوع جزئیات</Label>
                    <Select value={detailType} onValueChange={(v: any) => setDetailType(v)}>
                      <SelectTrigger className="task-select"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="detail">بدون جزئیات</SelectItem>
                        <SelectItem value="supplier">تامین‌کننده</SelectItem>
                        <SelectItem value="customer">مشتری</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {detailType === 'supplier' && (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="field-group">
                        <Label className="field-label">مانده دوره <span className="required-star">*</span></Label>
                        <Input type="number" value={sup.supplierBalance} onChange={(e) => setSup({ ...sup, supplierBalance: e.target.value })} placeholder="مثال: 5000000" className="task-input" />
                        {errors.supplierBalance && <span className="field-error">{errors.supplierBalance}</span>}
                      </div>
                      <div className="field-group">
                        <Label className="field-label">هویت</Label>
                        <Select value={sup.supplierIdentity} onValueChange={(v) => setSup({ ...sup, supplierIdentity: v })}>
                          <SelectTrigger className="task-select"><span className="select-icon-right"><Scale className="h-4 w-4" /></span><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="debit">بدهکار</SelectItem>
                            <SelectItem value="credit">بستانکار</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {detailType === 'customer' && (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="field-group">
                        <Label className="field-label">درصد تخفیف <span className="required-star">*</span></Label>
                        <Input type="number" value={cus.discountPercent} onChange={(e) => setCus({ ...cus, discountPercent: e.target.value })} placeholder="مثال: 10" className="task-input" />
                        {errors.discountPercent && <span className="field-error">{errors.discountPercent}</span>}
                      </div>
                      <div className="field-group">
                        <Label className="field-label">گروه‌بندی</Label>
                        <Input value={cus.customerGroupId} onChange={(e) => setCus({ ...cus, customerGroupId: e.target.value })} placeholder="انتخاب گروه مشتری" className="task-input" />
                      </div>
                      <div className="field-group">
                        <Label className="field-label">مانده دوره</Label>
                        <Input type="number" value={cus.customerBalance} onChange={(e) => setCus({ ...cus, customerBalance: e.target.value })} placeholder="مثال: 1000000" className="task-input" />
                      </div>
                    </div>
                  )}

                  <div className="mt-4 field-group">
                    <Label className="field-label">مانده دوره (عمومی)</Label>
                    <Input type="number" value={periodBalance} onChange={(e) => setPeriodBalance(e.target.value)} placeholder="مثال: 0" className="task-input" />
                  </div>
                </div>
              )}

              {/* Related persons section */}
              {section === 'persons' && (
                <div className="rounded-[12px] border border-[#E6EBF2] bg-[#FAFBFC] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2"><UsersIcon className="h-4 w-4 text-[#3155E7]" /><span className="text-sm font-bold text-[#1D2939]">افراد مرتبط با طرف حساب</span></div>
                    <button type="button" onClick={addPerson} className="flex items-center gap-1 rounded-lg bg-[#3155E7] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2445C7]"><Plus className="h-3.5 w-3.5" /> افزودن فرد</button>
                  </div>
                  {persons.length === 0 ? <p className="py-4 text-center text-xs text-[#98A2B3]">هنوز فردی اضافه نشده است</p> : (
                    <div className="space-y-3">
                      {persons.map((p, i) => (
                        <div key={i} className="rounded-lg border border-[#E6EBF2] bg-white p-3">
                          <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-[#667085]">فرد {((i + 1)).toLocaleString('fa-IR')}</span><button type="button" onClick={() => removePerson(i)} className="text-[#98A2B3] hover:text-rose-500"><Trash2 className="h-4 w-4" /></button></div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <Input value={p.name} onChange={(e) => updatePerson(i, 'name', e.target.value)} placeholder="نام" className="task-input" />
                            <Input value={p.position} onChange={(e) => updatePerson(i, 'position', e.target.value)} placeholder="سمت" className="task-input" />
                            <Input value={p.phone} onChange={(e) => updatePerson(i, 'phone', e.target.value)} placeholder="تلفن" className="task-input" />
                            <Input value={p.email} onChange={(e) => updatePerson(i, 'email', e.target.value)} placeholder="ایمیل" className="task-input" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Addresses section */}
              {section === 'addresses' && (
                <div className="rounded-[12px] border border-[#E6EBF2] bg-[#FAFBFC] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#3155E7]" /><span className="text-sm font-bold text-[#1D2939]">نشانی طرف حساب</span></div>
                    <button type="button" onClick={addAddress} className="flex items-center gap-1 rounded-lg bg-[#3155E7] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2445C7]"><Plus className="h-3.5 w-3.5" /> افزودن نشانی</button>
                  </div>
                  {addresses.length === 0 ? <p className="py-4 text-center text-xs text-[#98A2B3]">هنوز نشانی‌ای اضافه نشده است</p> : (
                    <div className="space-y-3">
                      {addresses.map((a, i) => (
                        <div key={i} className="rounded-lg border border-[#E6EBF2] bg-white p-3">
                          <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-[#667085]">نشانی {((i + 1)).toLocaleString('fa-IR')}</span><button type="button" onClick={() => removeAddress(i)} className="text-[#98A2B3] hover:text-rose-500"><Trash2 className="h-4 w-4" /></button></div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <Input value={a.type} onChange={(e) => updateAddress(i, 'type', e.target.value)} placeholder="نوع" className="task-input" />
                            <Input value={a.city} onChange={(e) => updateAddress(i, 'city', e.target.value)} placeholder="شهر" className="task-input" />
                            <Input value={a.address} onChange={(e) => updateAddress(i, 'address', e.target.value)} placeholder="نشانی" className="task-input" />
                            <Input value={a.postalCode} onChange={(e) => updateAddress(i, 'postalCode', e.target.value)} placeholder="کد پستی" className="task-input" />
                            <Input value={a.title} onChange={(e) => updateAddress(i, 'title', e.target.value)} placeholder="عنوان" className="task-input" />
                            <Input value={a.branchCode} onChange={(e) => updateAddress(i, 'branchCode', e.target.value)} placeholder="کد شعبه" className="task-input" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Phones section */}
              {section === 'phones' && (
                <div className="rounded-[12px] border border-[#E6EBF2] bg-[#FAFBFC] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-[#3155E7]" /><span className="text-sm font-bold text-[#1D2939]">تلفن طرف حساب</span></div>
                    <button type="button" onClick={addPhone} className="flex items-center gap-1 rounded-lg bg-[#3155E7] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2445C7]"><Plus className="h-3.5 w-3.5" /> افزودن تلفن</button>
                  </div>
                  {phones.length === 0 ? <p className="py-4 text-center text-xs text-[#98A2B3]">هنوز تلفنی اضافه نشده است</p> : (
                    <div className="space-y-2">
                      {phones.map((p, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input value={p} onChange={(e) => updatePhone(i, e.target.value)} placeholder="شماره تلفن" className="task-input" />
                          <button type="button" onClick={() => removePhone(i)} className="shrink-0 text-[#98A2B3] hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="field-group">
                <Label className="field-label">توضیحات</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="توضیحات اختیاری..." className="task-textarea" maxLength={1000} />
              </div>
            </div>

            <div className="form-actions-row">
              <button type="button" className="cancel-btn" onClick={() => router.push('/dashboard/contact-parties')} disabled={submitting}>انصراف</button>
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ایجاد...</>) : 'ایجاد طرف حساب'}
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
                  <div className="guide-item"><span className="guide-item-icon"><User className="h-5 w-5" /></span><div className="guide-item-text"><strong>انتخاب نوع شخص</strong><p>ابتداً بین شخص حقیقی یا حقوقی انتخاب کنید.</p></div></div>
                  <div className="guide-item-divider" />
                </div>
                <div>
                  <div className="guide-item"><span className="guide-item-icon"><Tag className="h-5 w-5" /></span><div className="guide-item-text"><strong>بخش جزئیات</strong><p>می‌توانید طرف حساب را به عنوان تامین‌کننده یا مشتری تعریف کنید.</p></div></div>
                  <div className="guide-item-divider" />
                </div>
                <div>
                  <div className="guide-item"><span className="guide-item-icon"><UsersIcon className="h-5 w-5" /></span><div className="guide-item-text"><strong>افراد مرتبط</strong><p>برای هر طرف حساب می‌توانید چندین فرد مرتبط با سمت و تلفن اضافه کنید.</p></div></div>
                  <div className="guide-item-divider" />
                </div>
                <div>
                  <div className="guide-item"><span className="guide-item-icon"><MapPin className="h-5 w-5" /></span><div className="guide-item-text"><strong>نشانی‌ها</strong><p>نشانی‌های متعدد با نوع، شهر، کد پستی و کد شعبه ثبت کنید.</p></div></div>
                </div>
              </div>
            </div>
            <div className="info-card">
              <div className="info-card-header">
                <span className="info-card-icon"><Info className="h-5 w-5" /></span>
                <h2>اطلاعات مفید</h2>
              </div>
              <p>طرف حساب‌های ایجاد شده در بخش «طرف حساب» قابل مشاهده و مدیریت هستند. می‌توانید آن‌ها را فیلتر و جستجو کنید.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
