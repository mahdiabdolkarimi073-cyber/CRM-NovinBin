'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Save, Loader2, ArrowRight } from 'lucide-react';
import {
  INSURANCE_TYPES, INSURANCE_ISSUE_STATUSES, INSURANCE_PAYMENT_STATUSES,
  INSURANCE_PAYMENT_METHODS, fullName,
} from '@/lib/constants';
import { toast } from 'sonner';
import type { InsuranceCompany, Customer, Profile } from '@/lib/types';

export default function NewPolicyPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    policyNumber: '', requestNumber: '', customerId: '', insuranceTypeCode: 'third_party',
    companyId: '', branchName: '', assignedTo: '', issueDate: '', startDate: '', endDate: '',
    premium: '0', discount: '0', tax: '0', finalAmount: '0', paymentMethod: 'cash',
    paymentStatus: 'unpaid', issueStatus: 'pending', notes: '',
    plate: '', chassis: '', vehicleModel: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const [c, cust, s] = await Promise.all([
          fetchData<InsuranceCompany>('insurance_companies', { where: { active: true } }),
          fetchData<Customer>('customers', { take: 200 }),
          fetchData<Profile>('profiles', {}),
        ]);
        setCompanies(c || []);
        setCustomers(cust || []);
        setStaff(s || []);
      } catch (e: any) { toast.error('بارگذاری ناموفق: ' + e.message); }
    })();
  }, []);

  const handleSave = async () => {
    if (!form.policyNumber) { toast.error('شماره بیمه‌نامه الزامی است'); return; }
    setSaving(true);
    try {
      const details: Record<string, any> = {};
      if (form.insuranceTypeCode === 'third_party' || form.insuranceTypeCode === 'vehicle_body') {
        if (form.plate) details.plate = form.plate;
        if (form.chassis) details.chassis = form.chassis;
        if (form.vehicleModel) details.vehicleModel = form.vehicleModel;
      }
      await createData('insurance_policies', {
        policyNumber: form.policyNumber,
        requestNumber: form.requestNumber || null,
        customerId: form.customerId || null,
        insuranceTypeCode: form.insuranceTypeCode,
        companyId: form.companyId || null,
        branchName: form.branchName || null,
        assignedTo: form.assignedTo || null,
        issueDate: form.issueDate ? new Date(form.issueDate).toISOString() : null,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        premium: Number(form.premium) || 0,
        discount: Number(form.discount) || 0,
        tax: Number(form.tax) || 0,
        finalAmount: Number(form.finalAmount) || 0,
        paymentMethod: form.paymentMethod,
        paymentStatus: form.paymentStatus,
        issueStatus: form.issueStatus,
        notes: form.notes || null,
        details,
        createdBy: profile?.id,
      });
      toast.success('بیمه‌نامه ثبت شد');
      router.push('/dashboard/insurance/policies');
    } catch (e: any) { toast.error('ذخیره ناموفق: ' + e.message); }
    setSaving(false);
  };

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-3xl">
      <Link href="/dashboard/insurance/policies" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="h-4 w-4 ml-1" />
        بازگشت به فهرست
      </Link>
      <h1 className="text-2xl font-bold">ثبت بیمه‌نامه جدید</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">اطلاعات اصلی</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>شماره بیمه‌نامه *</Label>
              <Input value={form.policyNumber} onChange={e => setForm(f => ({ ...f, policyNumber: e.target.value }))} />
            </div>
            <div>
              <Label>شناسه درخواست</Label>
              <Input value={form.requestNumber} onChange={e => setForm(f => ({ ...f, requestNumber: e.target.value }))} />
            </div>
            <div>
              <Label>مشتری</Label>
              <Select value={form.customerId} onValueChange={v => setForm(f => ({ ...f, customerId: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="انتخاب مشتری" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{fullName(c.firstName, c.lastName, c.companyName || '')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>رشته بیمه</Label>
              <Select value={form.insuranceTypeCode} onValueChange={v => setForm(f => ({ ...f, insuranceTypeCode: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INSURANCE_TYPES.map(t => (<SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>شرکت بیمه</Label>
              <Select value={form.companyId} onValueChange={v => setForm(f => ({ ...f, companyId: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="انتخاب شرکت" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {companies.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>کارشناس مسئول</Label>
              <Select value={form.assignedTo} onValueChange={v => setForm(f => ({ ...f, assignedTo: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="انتخاب کارشناس" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {staff.map(s => (<SelectItem key={s.id} value={s.id}>{fullName(s.firstName, s.lastName)}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>تاریخ صدور</Label><JalaliDatePicker value={form.issueDate} onChange={v => setForm(f => ({ ...f, issueDate: v || '' }))} /></div>
            <div><Label>شروع پوشش</Label><JalaliDatePicker value={form.startDate} onChange={v => setForm(f => ({ ...f, startDate: v || '' }))} /></div>
            <div><Label>پایان پوشش</Label><JalaliDatePicker value={form.endDate} onChange={v => setForm(f => ({ ...f, endDate: v || '' }))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">اطلاعات مالی</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><Label>حق بیمه</Label><Input type="number" value={form.premium} onChange={e => setForm(f => ({ ...f, premium: e.target.value }))} /></div>
            <div><Label>تخفیف</Label><Input type="number" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} /></div>
            <div><Label>مالیات</Label><Input type="number" value={form.tax} onChange={e => setForm(f => ({ ...f, tax: e.target.value }))} /></div>
            <div><Label>مبلغ نهایی</Label><Input type="number" value={form.finalAmount} onChange={e => setForm(f => ({ ...f, finalAmount: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <div>
              <Label>نحوه پرداخت</Label>
              <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INSURANCE_PAYMENT_METHODS.map(m => (<SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>وضعیت پرداخت</Label>
              <Select value={form.paymentStatus} onValueChange={v => setForm(f => ({ ...f, paymentStatus: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INSURANCE_PAYMENT_STATUSES.map(s => (<SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>وضعیت صدور</Label>
              <Select value={form.issueStatus} onValueChange={v => setForm(f => ({ ...f, issueStatus: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INSURANCE_ISSUE_STATUSES.map(s => (<SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {(form.insuranceTypeCode === 'third_party' || form.insuranceTypeCode === 'vehicle_body') && (
        <Card>
          <CardHeader><CardTitle className="text-base">اطلاعات خودرو</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><Label>شماره پلاک</Label><Input value={form.plate} onChange={e => setForm(f => ({ ...f, plate: e.target.value }))} /></div>
              <div><Label>شماره شاسی</Label><Input value={form.chassis} onChange={e => setForm(f => ({ ...f, chassis: e.target.value }))} /></div>
              <div><Label>مدل خودرو</Label><Input value={form.vehicleModel} onChange={e => setForm(f => ({ ...f, vehicleModel: e.target.value }))} /></div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">توضیحات</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Link href="/dashboard/insurance/policies"><Button variant="outline">انصراف</Button></Link>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 ml-1" />}
          ثبت بیمه‌نامه
        </Button>
      </div>
    </div>
  );
}
