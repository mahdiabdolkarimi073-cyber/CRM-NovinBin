'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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
  FileQuestion, Plus, Search, Eye, Trash2, Loader2, Save,
  ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { formatJalali, formatToman } from '@/lib/format';
import {
  INSURANCE_TYPES, INSURANCE_QUOTE_STATUSES, fullName,
} from '@/lib/constants';
import { toast } from 'sonner';
import type { InsuranceQuoteRequest, InsuranceQuote, Customer, Profile, InsuranceCompany } from '@/lib/types';

const quoteStatusInfo = (k: string) => INSURANCE_QUOTE_STATUSES.find(s => s.key === k) || INSURANCE_QUOTE_STATUSES[0];
const typeLabel = (code: string) => INSURANCE_TYPES.find(t => t.key === code)?.label || code;
const PAGE_SIZE = 10;

export default function InsuranceQuotesPage() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<InsuranceQuoteRequest[]>([]);
  const [quotes, setQuotes] = useState<Record<string, InsuranceQuote[]>>({});
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<InsuranceQuoteRequest | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewReq, setViewReq] = useState<InsuranceQuoteRequest | null>(null);
  const [viewQuotes, setViewQuotes] = useState<InsuranceQuote[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customerId: '', insuranceTypeCode: 'third_party', assignedTo: '',
    requestDate: '', notes: '', companiesChecked: '',
  });
  const [quoteForm, setQuoteForm] = useState({
    companyId: '', companyName: '', amount: '0', coverageDetails: '', terms: '', status: 'new', notes: '',
  });
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [quoteReqId, setQuoteReqId] = useState('');

  const loadAll = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [r, c, s, comp] = await Promise.all([
        fetchData<InsuranceQuoteRequest>('insurance_quote_requests', { orderBy: { createdAt: 'desc' } }),
        fetchData<Customer>('customers', { take: 200 }),
        fetchData<Profile>('profiles', {}),
        fetchData<InsuranceCompany>('insurance_companies', { where: { active: true } }),
      ]);
      setRequests(r || []);
      setCustomers(c || []);
      setStaff(s || []);
      setCompanies(comp || []);
      const allQuotes = await fetchData<InsuranceQuote>('insurance_quotes', { orderBy: { createdAt: 'desc' } });
      const qMap: Record<string, InsuranceQuote[]> = {};
      (allQuotes || []).forEach(q => {
        if (!qMap[q.requestId]) qMap[q.requestId] = [];
        qMap[q.requestId].push(q);
      });
      setQuotes(qMap);
    } catch (e: any) { toast.error('بارگذاری ناموفق: ' + e.message); }
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filtered = useMemo(() => {
    return requests.filter(r => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (search.trim()) {
        const cust = customers.find(c => c.id === r.customerId);
        const name = cust ? fullName(cust.firstName, c.lastName, c.companyName || '') : '';
        if (!name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [requests, filterStatus, search, customers]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const customerName = (id: string | null) => {
    if (!id) return '—';
    const c = customers.find(c => c.id === id);
    return c ? fullName(c.firstName, c.lastName, c.companyName || '—') : '—';
  };

  const openEdit = (r: InsuranceQuoteRequest | null) => {
    if (r) {
      setEditingReq(r);
      setForm({
        customerId: r.customerId || '', insuranceTypeCode: r.insuranceTypeCode || 'third_party',
        assignedTo: r.assignedTo || '', requestDate: r.requestDate ? new Date(r.requestDate).toISOString().split('T')[0] : '',
        notes: r.notes || '', companiesChecked: (r.companiesChecked || []).join(', '),
      });
    } else {
      setEditingReq(null);
      setForm({ customerId: '', insuranceTypeCode: 'third_party', assignedTo: '', requestDate: '', notes: '', companiesChecked: '' });
    }
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        customerId: form.customerId || null,
        insuranceTypeCode: form.insuranceTypeCode,
        assignedTo: form.assignedTo || null,
        requestDate: form.requestDate ? new Date(form.requestDate).toISOString() : new Date().toISOString(),
        notes: form.notes || null,
        companiesChecked: form.companiesChecked ? form.companiesChecked.split(',').map(s => s.trim()) : [],
        createdBy: profile?.id,
      };
      if (editingReq) {
        await updateData('insurance_quote_requests', { id: editingReq.id }, data);
        toast.success('استعلام ویرایش شد');
      } else {
        await createData('insurance_quote_requests', data);
        toast.success('استعلام ثبت شد');
      }
      setEditDialogOpen(false);
      loadAll();
    } catch (e: any) { toast.error('ذخیره ناموفق: ' + e.message); }
    setSaving(false);
  };

  const openView = (r: InsuranceQuoteRequest) => {
    setViewReq(r);
    setViewQuotes(quotes[r.id] || []);
    setViewDialogOpen(true);
  };

  const openAddQuote = (reqId: string) => {
    setQuoteReqId(reqId);
    setQuoteForm({ companyId: '', companyName: '', amount: '0', coverageDetails: '', terms: '', status: 'new', notes: '' });
    setQuoteDialogOpen(true);
  };

  const handleSaveQuote = async () => {
    setSaving(true);
    try {
      await createData('insurance_quotes', {
        requestId: quoteReqId,
        companyId: quoteForm.companyId || null,
        companyName: quoteForm.companyName || null,
        amount: Number(quoteForm.amount) || 0,
        coverageDetails: quoteForm.coverageDetails || null,
        terms: quoteForm.terms || null,
        status: quoteForm.status,
        notes: quoteForm.notes || null,
        createdBy: profile?.id,
      });
      toast.success('پیشنهاد ثبت شد');
      setQuoteDialogOpen(false);
      loadAll();
    } catch (e: any) { toast.error('ذخیره ناموفق: ' + e.message); }
    setSaving(false);
  };

  const handleDelete = async (r: InsuranceQuoteRequest) => {
    if (!confirm('حذف این استعلام؟')) return;
    try { await deleteData('insurance_quote_requests', { id: r.id }); toast.success('حذف شد'); loadAll(); }
    catch (e: any) { toast.error('حذف ناموفق: ' + e.message); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">استعلام‌ها و پیشنهادهای بیمه</h1>
          <p className="text-sm text-muted-foreground mt-1">مدیریت فرایند فروش بیمه</p>
        </div>
        <Button onClick={() => openEdit(null)} size="sm"><Plus className="h-4 w-4 ml-1" />استعلام جدید</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="جستجو بر اساس مشتری" value={search} onChange={e => setSearch(e.target.value)} className="pr-8" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="وضعیت" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                {INSURANCE_QUOTE_STATUSES.map(s => (<SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {paged.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileQuestion className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>استعلامی یافت نشد</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right">
                <th className="pb-2 pr-2 font-medium">مشتری</th>
                <th className="pb-2 font-medium">رشته</th>
                <th className="pb-2 font-medium">تاریخ</th>
                <th className="pb-2 font-medium">پیشنهادها</th>
                <th className="pb-2 font-medium">وضعیت</th>
                <th className="pb-2 font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(r => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 pr-2 font-medium">{customerName(r.customerId)}</td>
                  <td className="py-2">{typeLabel(r.insuranceTypeCode || '')}</td>
                  <td className="py-2">{formatJalali(r.requestDate)}</td>
                  <td className="py-2">{(quotes[r.id] || []).length} پیشنهاد</td>
                  <td className="py-2">
                    <Badge style={{ backgroundColor: quoteStatusInfo(r.status).color + '20', color: quoteStatusInfo(r.status).color }}>
                      {quoteStatusInfo(r.status).label}
                    </Badge>
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openView(r)}><Eye className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><FileQuestion className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(r)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
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
          <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage(p => p - 1)}><ChevronRight className="h-4 w-4" /></Button>
          <span className="text-sm text-muted-foreground">صفحه {currentPage} از {totalPages}</span>
          <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronLeft className="h-4 w-4" /></Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingReq ? 'ویرایش استعلام' : 'استعلام جدید'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>مشتری</Label>
              <Select value={form.customerId} onValueChange={v => setForm(f => ({ ...f, customerId: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="انتخاب مشتری" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {customers.map(c => (<SelectItem key={c.id} value={c.id}>{fullName(c.firstName, c.lastName, c.companyName || '')}</SelectItem>))}
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
              <Label>کارشناس مسئول</Label>
              <Select value={form.assignedTo} onValueChange={v => setForm(f => ({ ...f, assignedTo: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="انتخاب کارشناس" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {staff.map(s => (<SelectItem key={s.id} value={s.id}>{fullName(s.firstName, s.lastName)}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>تاریخ درخواست</Label>
              <JalaliDatePicker value={form.requestDate} onChange={v => setForm(f => ({ ...f, requestDate: v || '' }))} />
            </div>
            <div>
              <Label>شرکت‌های بررسی‌شده (با کاما جدا کنید)</Label>
              <Input value={form.companiesChecked} onChange={e => setForm(f => ({ ...f, companiesChecked: e.target.value }))} />
            </div>
            <div>
              <Label>توضیحات</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>انصراف</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 ml-1" />}ذخیره</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>جزئیات استعلام</DialogTitle></DialogHeader>
          {viewReq && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">مشتری:</span> {customerName(viewReq.customerId)}</div>
                <div><span className="text-muted-foreground">رشته:</span> {typeLabel(viewReq.insuranceTypeCode || '')}</div>
                <div><span className="text-muted-foreground">تاریخ:</span> {formatJalali(viewReq.requestDate)}</div>
                <div><span className="text-muted-foreground">وضعیت:</span> {quoteStatusInfo(viewReq.status).label}</div>
              </div>
              {viewReq.notes && <div><span className="text-muted-foreground">توضیحات:</span> {viewReq.notes}</div>}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">پیشنهادهای دریافت‌شده</div>
                  <Button size="sm" variant="outline" onClick={() => openAddQuote(viewReq.id)}><Plus className="h-4 w-4 ml-1" />پیشنهاد جدید</Button>
                </div>
                {viewQuotes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-3">پیشنهادی ثبت نشده است</p>
                ) : (
                  <div className="space-y-2">
                    {viewQuotes.map(q => (
                      <div key={q.id} className="p-3 rounded-lg border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{q.companyName || '—'}</span>
                          <Badge variant="secondary">{formatToman(Number(q.amount) || 0)} تومان</Badge>
                        </div>
                        {q.coverageDetails && <div className="text-xs text-muted-foreground">{q.coverageDetails}</div>}
                        {q.terms && <div className="text-xs text-muted-foreground mt-1">{q.terms}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewDialogOpen(false)}>بستن</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Quote Dialog */}
      <Dialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>ثبت پیشنهاد بیمه</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>شرکت بیمه</Label>
              <Select value={quoteForm.companyId} onValueChange={v => {
                const comp = companies.find(c => c.id === v);
                setQuoteForm(f => ({ ...f, companyId: v === 'none' ? '' : v, companyName: comp?.name || '' }));
              }}>
                <SelectTrigger><SelectValue placeholder="انتخاب شرکت" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {companies.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>مبلغ (تومان)</Label><Input type="number" value={quoteForm.amount} onChange={e => setQuoteForm(f => ({ ...f, amount: e.target.value }))} /></div>
            <div><Label>جزئیات پوشش</Label><Textarea value={quoteForm.coverageDetails} onChange={e => setQuoteForm(f => ({ ...f, coverageDetails: e.target.value }))} rows={2} /></div>
            <div><Label>شرایط</Label><Textarea value={quoteForm.terms} onChange={e => setQuoteForm(f => ({ ...f, terms: e.target.value }))} rows={2} /></div>
            <div>
              <Label>وضعیت</Label>
              <Select value={quoteForm.status} onValueChange={v => setQuoteForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INSURANCE_QUOTE_STATUSES.map(s => (<SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuoteDialogOpen(false)}>انصراف</Button>
            <Button onClick={handleSaveQuote} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 ml-1" />}ذخیره</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
