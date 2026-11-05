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
import { Switch } from '@/components/ui/switch';
import {
  Building2, Plus, Search, Eye, Trash2, Loader2, Save,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { INSURANCE_TYPES } from '@/lib/constants';
import { toast } from 'sonner';
import type { InsuranceCompany } from '@/lib/types';

const PAGE_SIZE = 10;

export default function InsuranceCompaniesPage() {
  const { profile } = useAuth();
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<InsuranceCompany | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<InsuranceCompany | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', code: '', phone: '', email: '', website: '', address: '',
    branchName: '', contactPerson: '', contactPhone: '',
    supportedTypes: [] as string[], active: true, apiUrl: '', apiKey: '', notes: '',
  });

  const loadAll = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const c = await fetchData<InsuranceCompany>('insurance_companies', { orderBy: { createdAt: 'desc' } });
      setCompanies(c || []);
    } catch (e: any) { toast.error('بارگذاری ناموفق: ' + e.message); }
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filtered = useMemo(() => {
    return companies.filter(c => {
      if (search.trim()) {
        if (!c.name.toLowerCase().includes(search.trim().toLowerCase()) &&
            !(c.code || '').toLowerCase().includes(search.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [companies, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openEdit = (c: InsuranceCompany | null) => {
    if (c) {
      setEditing(c);
      setForm({
        name: c.name || '', code: c.code || '', phone: c.phone || '', email: c.email || '',
        website: c.website || '', address: c.address || '', branchName: c.branchName || '',
        contactPerson: c.contactPerson || '', contactPhone: c.contactPhone || '',
        supportedTypes: c.supportedTypes || [], active: c.active, apiUrl: c.apiUrl || '',
        apiKey: c.apiKey || '', notes: c.notes || '',
      });
    } else {
      setEditing(null);
      setForm({ name: '', code: '', phone: '', email: '', website: '', address: '', branchName: '', contactPerson: '', contactPhone: '', supportedTypes: [], active: true, apiUrl: '', apiKey: '', notes: '' });
    }
    setEditOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        name: form.name, code: form.code || null, phone: form.phone || null,
        email: form.email || null, website: form.website || null, address: form.address || null,
        branchName: form.branchName || null, contactPerson: form.contactPerson || null,
        contactPhone: form.contactPhone || null, supportedTypes: form.supportedTypes,
        active: form.active, apiUrl: form.apiUrl || null, apiKey: form.apiKey || null,
        notes: form.notes || null, createdBy: profile?.id,
      };
      if (editing) {
        await updateData('insurance_companies', { id: editing.id }, data);
        toast.success('شرکت ویرایش شد');
      } else {
        await createData('insurance_companies', data);
        toast.success('شرکت ثبت شد');
      }
      setEditOpen(false);
      loadAll();
    } catch (e: any) { toast.error('ذخیره ناموفق: ' + e.message); }
    setSaving(false);
  };

  const handleDelete = async (c: InsuranceCompany) => {
    if (!confirm('حذف این شرکت بیمه؟')) return;
    try { await deleteData('insurance_companies', { id: c.id }); toast.success('حذف شد'); loadAll(); }
    catch (e: any) { toast.error('حذف ناموفق: ' + e.message); }
  };

  const toggleType = (key: string) => {
    setForm(f => ({
      ...f,
      supportedTypes: f.supportedTypes.includes(key)
        ? f.supportedTypes.filter(t => t !== key)
        : [...f.supportedTypes, key],
    }));
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">شرکت‌های بیمه</h1>
          <p className="text-sm text-muted-foreground mt-1">دفترچه راهنمای شرکت‌های بیمه</p>
        </div>
        <Button onClick={() => openEdit(null)} size="sm"><Plus className="h-4 w-4 ml-1" />شرکت جدید</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="جستجو بر اساس نام یا کد" value={search} onChange={e => setSearch(e.target.value)} className="pr-8" />
          </div>
        </CardContent>
      </Card>

      {paged.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>شرکتی یافت نشد</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right">
                <th className="pb-2 pr-2 font-medium">نام</th>
                <th className="pb-2 font-medium">کد</th>
                <th className="pb-2 font-medium">تلفن</th>
                <th className="pb-2 font-medium">شعبه</th>
                <th className="pb-2 font-medium">وضعیت</th>
                <th className="pb-2 font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(c => (
                <tr key={c.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 pr-2 font-medium">{c.name}</td>
                  <td className="py-2">{c.code || '—'}</td>
                  <td className="py-2">{c.phone || '—'}</td>
                  <td className="py-2">{c.branchName || '—'}</td>
                  <td className="py-2">{c.active ? <Badge style={{ backgroundColor: '#10b98120', color: '#10b981' }}>فعال</Badge> : <Badge style={{ backgroundColor: '#64748b20', color: '#64748b' }}>غیرفعال</Badge>}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setViewing(c); setViewOpen(true); }}><Eye className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Building2 className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(c)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
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
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'ویرایش شرکت' : 'شرکت جدید'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>نام شرکت</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>کد</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>تلفن</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><Label>ایمیل</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>وب‌سایت</Label><Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} /></div>
              <div><Label>شعبه</Label><Input value={form.branchName} onChange={e => setForm(f => ({ ...f, branchName: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>شخص مسئول</Label><Input value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} /></div>
              <div><Label>تلفن مسئول</Label><Input value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} /></div>
            </div>
            <div><Label>آدرس</Label><Textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} /></div>
            <div>
              <Label>رشته‌های پشتیبانی‌شده</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {INSURANCE_TYPES.map(t => (
                  <Badge
                    key={t.key}
                    variant={form.supportedTypes.includes(t.key) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleType(t.key)}
                  >
                    {t.label}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>API URL</Label><Input value={form.apiUrl} onChange={e => setForm(f => ({ ...f, apiUrl: e.target.value }))} /></div>
              <div><Label>API Key</Label><Input value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))} type="password" /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
              <Label>فعال</Label>
            </div>
            <div><Label>توضیحات</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>انصراف</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 ml-1" />}ذخیره</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>جزئیات شرکت</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">نام:</span> {viewing.name}</div>
                <div><span className="text-muted-foreground">کد:</span> {viewing.code || '—'}</div>
                <div><span className="text-muted-foreground">تلفن:</span> {viewing.phone || '—'}</div>
                <div><span className="text-muted-foreground">ایمیل:</span> {viewing.email || '—'}</div>
                <div><span className="text-muted-foreground">وب‌سایت:</span> {viewing.website || '—'}</div>
                <div><span className="text-muted-foreground">شعبه:</span> {viewing.branchName || '—'}</div>
                <div><span className="text-muted-foreground">شخص مسئول:</span> {viewing.contactPerson || '—'}</div>
                <div><span className="text-muted-foreground">تلفن مسئول:</span> {viewing.contactPhone || '—'}</div>
              </div>
              {viewing.address && <div><span className="text-muted-foreground">آدرس:</span> {viewing.address}</div>}
              {viewing.supportedTypes && viewing.supportedTypes.length > 0 && (
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground">رشته‌ها:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {viewing.supportedTypes.map(t => <Badge key={t} variant="secondary">{INSURANCE_TYPES.find(it => it.key === t)?.label || t}</Badge>)}
                  </div>
                </div>
              )}
              {viewing.notes && <div className="pt-2 border-t"><span className="text-muted-foreground">توضیحات:</span> {viewing.notes}</div>}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewOpen(false)}>بستن</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
