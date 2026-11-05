'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import {
  FileText, Plus, Search, Eye, Trash2, Loader2, Filter,
  ChevronLeft, ChevronRight, Save, X, Download,
} from 'lucide-react';
import { formatJalali, formatToman } from '@/lib/format';
import {
  INSURANCE_TYPES, INSURANCE_ISSUE_STATUSES, INSURANCE_PAYMENT_STATUSES,
  INSURANCE_PAYMENT_METHODS, fullName,
} from '@/lib/constants';
import { toast } from 'sonner';
import type { InsurancePolicy, InsuranceCompany, Customer, Profile } from '@/lib/types';

const issueStatusInfo = (k: string) => INSURANCE_ISSUE_STATUSES.find(s => s.key === k) || INSURANCE_ISSUE_STATUSES[0];
const typeLabel = (code: string) => INSURANCE_TYPES.find(t => t.key === code)?.label || code;

const PAGE_SIZE = 10;

const emptyForm = {
  policyNumber: '', requestNumber: '', customerId: '', insuranceTypeCode: 'third_party',
  companyId: '', branchName: '', assignedTo: '', issueDate: '', startDate: '', endDate: '',
  premium: '0', discount: '0', tax: '0', finalAmount: '0', paymentMethod: 'cash',
  paymentStatus: 'unpaid', issueStatus: 'pending', notes: '',
  // vehicle fields
  plate: '', chassis: '', engine: '', vehicleModel: '', vehicleYear: '', prevExpiry: '', noClaimDiscount: '',
  // life fields
  insuredPerson: '', beneficiary: '', coverageAmount: '', contractPeriod: '', periodicPremium: '', paymentPeriod: '', nextDueDate: '',
  // health fields
  policyholder: '', coveredCount: '', coverageStart: '', coverageEnd: '', coverageLimit: '', groupInfo: '',
  // liability/fire fields
  subject: '', coverageArea: '', liabilityLimit: '', coveragePeriod: '', conditions: '',
};

export default function InsurancePoliciesPage() {
  const { profile } = useAuth();
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [page, setPage] = useState(1);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewPolicy, setViewPolicy] = useState<InsurancePolicy | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<InsurancePolicy | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [p, c, cust, s] = await Promise.all([
        fetchData<InsurancePolicy>('insurance_policies', { orderBy: { createdAt: 'desc' } }),
        fetchData<InsuranceCompany>('insurance_companies', { where: { active: true } }),
        fetchData<Customer>('customers', { take: 200 }),
        fetchData<Profile>('profiles', {}),
      ]);
      setPolicies(p || []);
      setCompanies(c || []);
      setCustomers(cust || []);
      setStaff(s || []);
    } catch (e: any) {
      toast.error('بارگذاری ناموفق: ' + e.message);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filtered = useMemo(() => {
    return policies.filter(p => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const cust = customers.find(c => c.id === p.customerId);
        const custName = cust ? (cust.firstName || '') + ' ' + (cust.lastName || '') : '';
        if (!p.policyNumber?.toLowerCase().includes(q) &&
            !p.requestNumber?.toLowerCase().includes(q) &&
            !custName.toLowerCase().includes(q) &&
            !(cust?.phone || '').includes(q)) return false;
      }
      if (filterType !== 'all' && p.insuranceTypeCode !== filterType) return false;
      if (filterCompany !== 'all' && p.companyId !== filterCompany) return false;
      if (filterStatus !== 'all' && p.issueStatus !== filterStatus) return false;
      if (filterAssignee !== 'all' && p.assignedTo !== filterAssignee) return false;
      return true;
    });
  }, [policies, search, filterType, filterCompany, filterStatus, filterAssignee, customers]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const customerName = (id: string | null) => {
    if (!id) return '—';
    const c = customers.find(c => c.id === id);
    return c ? fullName(c.firstName, c.lastName, c.companyName || '—') : '—';
  };

  const companyName = (id: string | null) => {
    if (!id) return '—';
    const c = companies.find(c => c.id === id);
    return c?.name || '—';
  };

  const staffName = (id: string | null) => {
    if (!id) return '—';
    const s = staff.find(s => s.id === id);
    return s ? fullName(s.firstName, s.lastName) : '—';
  };

  const openView = (p: InsurancePolicy) => {
    setViewPolicy(p);
    setViewDialogOpen(true);
  };

  const openEdit = (p: InsurancePolicy | null) => {
    if (p) {
      setEditingPolicy(p);
      const d = p.details || {};
      setForm({
        policyNumber: p.policyNumber || '', requestNumber: p.requestNumber || '',
        customerId: p.customerId || '', insuranceTypeCode: p.insuranceTypeCode || 'third_party',
        companyId: p.companyId || '', branchName: p.branchName || '', assignedTo: p.assignedTo || '',
        issueDate: p.issueDate ? new Date(p.issueDate).toISOString().split('T')[0] : '',
        startDate: p.startDate ? new Date(p.startDate).toISOString().split('T')[0] : '',
        endDate: p.endDate ? new Date(p.endDate).toISOString().split('T')[0] : '',
        premium: String(p.premium || '0'), discount: String(p.discount || '0'),
        tax: String(p.tax || '0'), finalAmount: String(p.finalAmount || '0'),
        paymentMethod: p.paymentMethod || 'cash', paymentStatus: p.paymentStatus || 'unpaid',
        issueStatus: p.issueStatus || 'pending', notes: p.notes || '',
        plate: d.plate || '', chassis: d.chassis || '', engine: d.engine || '',
        vehicleModel: d.vehicleModel || '', vehicleYear: d.vehicleYear || '',
        prevExpiry: d.prevExpiry || '', noClaimDiscount: d.noClaimDiscount || '',
        insuredPerson: d.insuredPerson || '', beneficiary: d.beneficiary || '',
        coverageAmount: d.coverageAmount || '', contractPeriod: d.contractPeriod || '',
        periodicPremium: d.periodicPremium || '', paymentPeriod: d.paymentPeriod || '',
        nextDueDate: d.nextDueDate || '',
        policyholder: d.policyholder || '', coveredCount: d.coveredCount || '',
        coverageStart: d.coverageStart || '', coverageEnd: d.coverageEnd || '',
        coverageLimit: d.coverageLimit || '', groupInfo: d.groupInfo || '',
        subject: d.subject || '', coverageArea: d.coverageArea || '',
        liabilityLimit: d.liabilityLimit || '', coveragePeriod: d.coveragePeriod || '',
        conditions: d.conditions || '',
      });
    } else {
      setEditingPolicy(null);
      setForm(emptyForm);
    }
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.policyNumber) { toast.error('شماره بیمه‌نامه الزامی است'); return; }
    setSaving(true);
    try {
      const typeCode = form.insuranceTypeCode;
      const details: Record<string, any> = {};
      if (typeCode === 'third_party' || typeCode === 'vehicle_body') {
        ['plate', 'chassis', 'engine', 'vehicleModel', 'vehicleYear', 'prevExpiry', 'noClaimDiscount'].forEach(k => {
          if ((form as any)[k]) details[k] = (form as any)[k];
        });
      } else if (typeCode === 'life') {
        ['insuredPerson', 'beneficiary', 'coverageAmount', 'contractPeriod', 'periodicPremium', 'paymentPeriod', 'nextDueDate'].forEach(k => {
          if ((form as any)[k]) details[k] = (form as any)[k];
        });
      } else if (typeCode === 'health') {
        ['policyholder', 'coveredCount', 'coverageStart', 'coverageEnd', 'coverageLimit', 'groupInfo'].forEach(k => {
          if ((form as any)[k]) details[k] = (form as any)[k];
        });
      } else if (typeCode === 'liability' || typeCode === 'fire') {
        ['subject', 'coverageArea', 'liabilityLimit', 'coveragePeriod', 'conditions'].forEach(k => {
          if ((form as any)[k]) details[k] = (form as any)[k];
        });
      }

      const data: Record<string, any> = {
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
      };

      if (editingPolicy) {
        await updateData('insurance_policies', { id: editingPolicy.id }, data);
        toast.success('بیمه‌نامه ویرایش شد');
      } else {
        await createData('insurance_policies', data);
        toast.success('بیمه‌نامه ثبت شد');
      }
      setEditDialogOpen(false);
      loadAll();
    } catch (e: any) {
      toast.error('ذخیره ناموفق: ' + e.message);
    }
    setSaving(false);
  };

  const handleVoid = async (p: InsurancePolicy) => {
    if (!confirm(`ابطال بیمه‌نامه «${p.policyNumber}»؟`)) return;
    const reason = prompt('دلیل ابطال:');
    if (!reason) return;
    try {
      await updateData('insurance_policies', { id: p.id }, {
        issueStatus: 'voided', voidedAt: new Date().toISOString(), voidReason: reason, voidedBy: profile?.id,
      });
      toast.success('بیمه‌نامه ابطال شد');
      loadAll();
    } catch (e: any) { toast.error('ابطال ناموفق: ' + e.message); }
  };

  const handleDelete = async (p: InsurancePolicy) => {
    if (!confirm(`حذف بیمه‌نامه «${p.policyNumber}»؟ این عمل قابل بازگشت نیست.`)) return;
    try {
      await deleteData('insurance_policies', { id: p.id });
      toast.success('بیمه‌نامه حذف شد');
      loadAll();
    } catch (e: any) { toast.error('حذف ناموفق: ' + e.message); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">بیمه‌نامه‌ها</h1>
          <p className="text-sm text-muted-foreground mt-1">مدیریت کامل بیمه‌نامه‌ها</p>
        </div>
        <Button onClick={() => openEdit(null)} size="sm">
          <Plus className="h-4 w-4 ml-1" />
          بیمه‌نامه جدید
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="جستجو: شماره، مشتری، تلفن"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-8"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger><SelectValue placeholder="رشته بیمه" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه رشته‌ها</SelectItem>
                {INSURANCE_TYPES.map(t => (
                  <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCompany} onValueChange={setFilterCompany}>
              <SelectTrigger><SelectValue placeholder="شرکت بیمه" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه شرکت‌ها</SelectItem>
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue placeholder="وضعیت" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                {INSURANCE_ISSUE_STATUSES.map(s => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-3">
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="max-w-xs"><SelectValue placeholder="کارشناس مسئول" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه کارشناسان</SelectItem>
                {staff.map(s => (
                  <SelectItem key={s.id} value={s.id}>{fullName(s.firstName, s.lastName)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {paged.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>بیمه‌نامه‌ای یافت نشد</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right">
                <th className="pb-2 pr-2 font-medium">شماره</th>
                <th className="pb-2 font-medium">مشتری</th>
                <th className="pb-2 font-medium">رشته</th>
                <th className="pb-2 font-medium">شرکت</th>
                <th className="pb-2 font-medium">حق بیمه</th>
                <th className="pb-2 font-medium">پایان</th>
                <th className="pb-2 font-medium">وضعیت</th>
                <th className="pb-2 font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(p => (
                <tr key={p.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 pr-2 font-medium">{p.policyNumber}</td>
                  <td className="py-2">{customerName(p.customerId)}</td>
                  <td className="py-2">{typeLabel(p.insuranceTypeCode || '')}</td>
                  <td className="py-2">{companyName(p.companyId)}</td>
                  <td className="py-2">{formatToman(Number(p.finalAmount) || 0)}</td>
                  <td className="py-2">{p.endDate ? formatJalali(p.endDate) : '—'}</td>
                  <td className="py-2">
                    <Badge style={{ backgroundColor: issueStatusInfo(p.issueStatus).color + '20', color: issueStatusInfo(p.issueStatus).color }}>
                      {issueStatusInfo(p.issueStatus).label}
                    </Badge>
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openView(p)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                        <FileText className="h-4 w-4" />
                      </Button>
                      {p.issueStatus !== 'voided' && (
                        <Button size="sm" variant="ghost" onClick={() => handleVoid(p)}>
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(p)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            صفحه {currentPage} از {totalPages}
          </span>
          <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>جزئیات بیمه‌نامه: {viewPolicy?.policyNumber}</DialogTitle>
          </DialogHeader>
          {viewPolicy && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">مشتری:</span> {customerName(viewPolicy.customerId)}</div>
                <div><span className="text-muted-foreground">رشته:</span> {typeLabel(viewPolicy.insuranceTypeCode || '')}</div>
                <div><span className="text-muted-foreground">شرکت بیمه:</span> {companyName(viewPolicy.companyId)}</div>
                <div><span className="text-muted-foreground">کارشناس:</span> {staffName(viewPolicy.assignedTo)}</div>
                <div><span className="text-muted-foreground">تاریخ صدور:</span> {viewPolicy.issueDate ? formatJalali(viewPolicy.issueDate) : '—'}</div>
                <div><span className="text-muted-foreground">شروع پوشش:</span> {viewPolicy.startDate ? formatJalali(viewPolicy.startDate) : '—'}</div>
                <div><span className="text-muted-foreground">پایان پوشش:</span> {viewPolicy.endDate ? formatJalali(viewPolicy.endDate) : '—'}</div>
                <div><span className="text-muted-foreground">وضعیت:</span> {issueStatusInfo(viewPolicy.issueStatus).label}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t pt-3">
                <div><span className="text-muted-foreground">حق بیمه:</span> {formatToman(Number(viewPolicy.premium) || 0)} تومان</div>
                <div><span className="text-muted-foreground">تخفیف:</span> {formatToman(Number(viewPolicy.discount) || 0)} تومان</div>
                <div><span className="text-muted-foreground">مالیات:</span> {formatToman(Number(viewPolicy.tax) || 0)} تومان</div>
                <div><span className="text-muted-foreground">مبلغ نهایی:</span> {formatToman(Number(viewPolicy.finalAmount) || 0)} تومان</div>
              </div>
              {viewPolicy.details && Object.keys(viewPolicy.details).length > 0 && (
                <div className="border-t pt-3">
                  <div className="font-medium mb-2">اطلاعات اختصاصی</div>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(viewPolicy.details).map(([k, v]) => (
                      <div key={k}><span className="text-muted-foreground">{k}:</span> {String(v)}</div>
                    ))}
                  </div>
                </div>
              )}
              {viewPolicy.notes && (
                <div className="border-t pt-3">
                  <div className="font-medium mb-1">توضیحات</div>
                  <p className="text-muted-foreground">{viewPolicy.notes}</p>
                </div>
              )}
              {viewPolicy.voidedAt && (
                <div className="border-t pt-3 text-red-500">
                  <div>ابطال در: {formatJalali(viewPolicy.voidedAt)}</div>
                  <div>دلیل: {viewPolicy.voidReason}</div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>بستن</Button>
            {viewPolicy && (
              <Button onClick={() => { setViewDialogOpen(false); openEdit(viewPolicy); }}>ویرایش</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPolicy ? 'ویرایش بیمه‌نامه' : 'ثبت بیمه‌نامه جدید'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
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
                    {INSURANCE_TYPES.map(t => (
                      <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>شرکت بیمه</Label>
                <Select value={form.companyId} onValueChange={v => setForm(f => ({ ...f, companyId: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="انتخاب شرکت" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>کارشناس مسئول</Label>
                <Select value={form.assignedTo} onValueChange={v => setForm(f => ({ ...f, assignedTo: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="انتخاب کارشناس" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {staff.map(s => (
                      <SelectItem key={s.id} value={s.id}>{fullName(s.firstName, s.lastName)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>تاریخ صدور</Label>
                <JalaliDatePicker value={form.issueDate} onChange={v => setForm(f => ({ ...f, issueDate: v || '' }))} />
              </div>
              <div>
                <Label>شروع پوشش</Label>
                <JalaliDatePicker value={form.startDate} onChange={v => setForm(f => ({ ...f, startDate: v || '' }))} />
              </div>
              <div>
                <Label>پایان پوشش</Label>
                <JalaliDatePicker value={form.endDate} onChange={v => setForm(f => ({ ...f, endDate: v || '' }))} />
              </div>
              <div>
                <Label>نحوه پرداخت</Label>
                <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INSURANCE_PAYMENT_METHODS.map(m => (
                      <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>وضعیت پرداخت</Label>
                <Select value={form.paymentStatus} onValueChange={v => setForm(f => ({ ...f, paymentStatus: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INSURANCE_PAYMENT_STATUSES.map(s => (
                      <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>وضعیت صدور</Label>
                <Select value={form.issueStatus} onValueChange={v => setForm(f => ({ ...f, issueStatus: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INSURANCE_ISSUE_STATUSES.map(s => (
                      <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t pt-3">
              <div>
                <Label>حق بیمه (تومان)</Label>
                <Input type="number" value={form.premium} onChange={e => setForm(f => ({ ...f, premium: e.target.value }))} />
              </div>
              <div>
                <Label>تخفیف</Label>
                <Input type="number" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} />
              </div>
              <div>
                <Label>مالیات</Label>
                <Input type="number" value={form.tax} onChange={e => setForm(f => ({ ...f, tax: e.target.value }))} />
              </div>
              <div>
                <Label>مبلغ نهایی</Label>
                <Input type="number" value={form.finalAmount} onChange={e => setForm(f => ({ ...f, finalAmount: e.target.value }))} />
              </div>
            </div>

            {/* Type-specific fields */}
            {(form.insuranceTypeCode === 'third_party' || form.insuranceTypeCode === 'vehicle_body') && (
              <div className="border-t pt-3">
                <div className="font-medium mb-2">اطلاعات خودرو</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div><Label>شماره پلاک</Label><Input value={form.plate} onChange={e => setForm(f => ({ ...f, plate: e.target.value }))} /></div>
                  <div><Label>شماره شاسی</Label><Input value={form.chassis} onChange={e => setForm(f => ({ ...f, chassis: e.target.value }))} /></div>
                  <div><Label>شماره موتور</Label><Input value={form.engine} onChange={e => setForm(f => ({ ...f, engine: e.target.value }))} /></div>
                  <div><Label>مدل خودرو</Label><Input value={form.vehicleModel} onChange={e => setForm(f => ({ ...f, vehicleModel: e.target.value }))} /></div>
                  <div><Label>سال ساخت</Label><Input value={form.vehicleYear} onChange={e => setForm(f => ({ ...f, vehicleYear: e.target.value }))} /></div>
                  <div><Label>تخفیف عدم خسارت</Label><Input value={form.noClaimDiscount} onChange={e => setForm(f => ({ ...f, noClaimDiscount: e.target.value }))} /></div>
                </div>
              </div>
            )}
            {form.insuranceTypeCode === 'life' && (
              <div className="border-t pt-3">
                <div className="font-medium mb-2">اطلاعات عمر</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div><Label>بیمه‌شده</Label><Input value={form.insuredPerson} onChange={e => setForm(f => ({ ...f, insuredPerson: e.target.value }))} /></div>
                  <div><Label>ذی‌نفع</Label><Input value={form.beneficiary} onChange={e => setForm(f => ({ ...f, beneficiary: e.target.value }))} /></div>
                  <div><Label>سرمایه بیمه</Label><Input value={form.coverageAmount} onChange={e => setForm(f => ({ ...f, coverageAmount: e.target.value }))} /></div>
                  <div><Label>مدت قرارداد</Label><Input value={form.contractPeriod} onChange={e => setForm(f => ({ ...f, contractPeriod: e.target.value }))} /></div>
                  <div><Label>حق بیمه دوره‌ای</Label><Input value={form.periodicPremium} onChange={e => setForm(f => ({ ...f, periodicPremium: e.target.value }))} /></div>
                  <div><Label>دوره پرداخت</Label><Input value={form.paymentPeriod} onChange={e => setForm(f => ({ ...f, paymentPeriod: e.target.value }))} /></div>
                </div>
              </div>
            )}
            {form.insuranceTypeCode === 'health' && (
              <div className="border-t pt-3">
                <div className="font-medium mb-2">اطلاعات درمان تکمیلی</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div><Label>بیمه‌گذار</Label><Input value={form.policyholder} onChange={e => setForm(f => ({ ...f, policyholder: e.target.value }))} /></div>
                  <div><Label>تعداد افراد تحت پوشش</Label><Input type="number" value={form.coveredCount} onChange={e => setForm(f => ({ ...f, coveredCount: e.target.value }))} /></div>
                  <div><Label>سقف تعهدات</Label><Input value={form.coverageLimit} onChange={e => setForm(f => ({ ...f, coverageLimit: e.target.value }))} /></div>
                  <div><Label>اطلاعات گروه/سازمان</Label><Input value={form.groupInfo} onChange={e => setForm(f => ({ ...f, groupInfo: e.target.value }))} /></div>
                </div>
              </div>
            )}
            {(form.insuranceTypeCode === 'liability' || form.insuranceTypeCode === 'fire') && (
              <div className="border-t pt-3">
                <div className="font-medium mb-2">اطلاعات مسئولیت/آتش‌سوزی</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div><Label>موضوع بیمه</Label><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} /></div>
                  <div><Label>محل پوشش</Label><Input value={form.coverageArea} onChange={e => setForm(f => ({ ...f, coverageArea: e.target.value }))} /></div>
                  <div><Label>سرمایه/سقف تعهد</Label><Input value={form.liabilityLimit} onChange={e => setForm(f => ({ ...f, liabilityLimit: e.target.value }))} /></div>
                </div>
              </div>
            )}

            <div>
              <Label>توضیحات</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>انصراف</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 ml-1" />}
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
