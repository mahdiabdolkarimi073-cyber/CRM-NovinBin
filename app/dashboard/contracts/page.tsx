'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Plus, FileSignature, Search, Calendar } from 'lucide-react';
import { SuperAdminActions } from '@/components/dashboard/super-admin-actions';
import { formatJalali, formatToman, toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';

const CONTRACT_TYPES = [
  { key: 'monthly', label: 'ماهانه', color: '#3b82f6' },
  { key: 'project', label: 'پروژه‌ای', color: '#f59e0b' },
  { key: 'hourly', label: 'ساعتی', color: '#8b5cf6' },
];

const contractTypeLabel = (key: string) => CONTRACT_TYPES.find((t) => t.key === key)?.label || key;

type Contract = {
  id: string;
  profileId: string;
  fullName: string;
  contractType: string;
  startDate: string;
  endDate: string | null;
  salary: bigint | number;
  notes: string | null;
  createdBy: string;
  createdAt: string;
};

export default function ContractsPage() {
  const { profile } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    fullName: '', contractType: 'monthly', startDate: '', endDate: '', salary: '', notes: '',
  });
  const [viewContract, setViewContract] = useState<Contract | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editContract, setEditContract] = useState<Contract | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: '', contractType: 'monthly', startDate: '', endDate: '', salary: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const where = isSuperAdmin ? {} : {};
    const data = await fetchData<Contract>('staff_contracts', {
      where,
      orderBy: { createdAt: 'desc' },
    });
    setContracts(data);
    setLoading(false);
  }, [profile, isSuperAdmin]);

  useEffect(() => { loadData(); }, [loadData]);

  // Client-side search filter (replaces ilike)
  const filtered = search
    ? contracts.filter((c) => c.fullName.toLowerCase().includes(search.toLowerCase()))
    : contracts;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !profile?.id) { toast.error('اطلاعات کاربری یافت نشد'); return; }
    if (!form.fullName.trim()) { toast.error('نام را وارد کنید'); return; }
    if (!form.startDate) { toast.error('تاریخ شروع را انتخاب کنید'); return; }

    setCreating(true);
    try {
      await createData('staff_contracts', {
        profileId: profile.id,
        fullName: form.fullName.trim(),
        contractType: form.contractType,
        startDate: new Date(form.startDate),
        endDate: form.endDate ? new Date(form.endDate) : null,
        salary: Number(form.salary) || 0,
        notes: form.notes.trim() || null,
        createdBy: profile.id,
      });
      toast.success('قرارداد ثبت شد');
      setDialogOpen(false);
      setForm({ fullName: '', contractType: 'monthly', startDate: '', endDate: '', salary: '', notes: '' });
      loadData();
    } catch (error: any) {
      toast.error('ایجاد ناموفق: ' + (error?.message || 'خطا'));
    }
    setCreating(false);
  };

  const openView = (c: Contract) => { setViewContract(c); setViewDialogOpen(true); };
  const openEdit = (c: Contract) => {
    setEditContract(c);
    setEditForm({
      fullName: c.fullName,
      contractType: c.contractType,
      startDate: toLocalDateString(new Date(c.startDate)),
      endDate: c.endDate ? toLocalDateString(new Date(c.endDate)) : '',
      salary: String(Number(c.salary)),
      notes: c.notes || '',
    });
    setEditDialogOpen(true);
  };
  const handleEditSave = async () => {
    if (!editContract) return;
    setSaving(true);
    try {
      await updateData('staff_contracts', { id: editContract.id }, {
        fullName: editForm.fullName,
        contractType: editForm.contractType,
        startDate: editForm.startDate ? new Date(editForm.startDate) : undefined,
        endDate: editForm.endDate ? new Date(editForm.endDate) : null,
        salary: Number(editForm.salary) || 0,
        notes: editForm.notes || null,
      });
      toast.success('قرارداد ویرایش شد');
      setEditDialogOpen(false); setEditContract(null); loadData();
    } catch (e: any) { toast.error('ویرایش ناموفق: ' + e.message); }
    setSaving(false);
  };
  const handleDelete = async (c: Contract) => {
    if (!confirm(`حذف قرارداد «${c.fullName}»؟`)) return;
    try { await deleteData('staff_contracts', { id: c.id }); toast.success('قرارداد حذف شد'); loadData(); }
    catch (e: any) { toast.error('حذف ناموفق: ' + e.message); }
  };

  return (
    <div>
      <PageHeader
        title="قراردادهای پرسنلی"
        description="مدیریت قراردادهای کارکنان و پرسنل"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4" /> قرارداد جدید</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>ثبت قرارداد جدید</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>نام و نام خانوادگی *</Label>
                  <Input
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="نام کامل پرسنل"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>نوع قرارداد</Label>
                  <Select value={form.contractType} onValueChange={(v) => setForm({ ...form, contractType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONTRACT_TYPES.map((t) => (
                        <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>تاریخ شروع *</Label>
                    <JalaliDatePicker
                      value={form.startDate ? new Date(form.startDate) : null}
                      onChange={(d) => setForm({ ...form, startDate: d ? toLocalDateString(d) : '' })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>تاریخ پایان</Label>
                    <JalaliDatePicker
                      value={form.endDate ? new Date(form.endDate) : null}
                      onChange={(d) => setForm({ ...form, endDate: d ? toLocalDateString(d) : '' })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>حقوق (تومان)</Label>
                  <Input
                    type="number"
                    dir="ltr"
                    value={form.salary}
                    onChange={(e) => setForm({ ...form, salary: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>یادداشت</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="توضیحات اختیاری"
                    rows={3}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
                  <Button type="submit" disabled={creating}>{creating ? 'در حال ثبت...' : 'ثبت'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="جستجوی نام..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<FileSignature className="w-8 h-8" />}
              title="قراردادی ثبت نشده"
              description="اولین قرارداد پرسنلی را ثبت کنید"
              action={<Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" /> افزودن قرارداد</Button>}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نام</TableHead>
                  <TableHead>نوع قرارداد</TableHead>
                  <TableHead>تاریخ شروع</TableHead>
                  <TableHead>تاریخ پایان</TableHead>
                  <TableHead>حقوق</TableHead>
                  <TableHead>یادداشت</TableHead>
                  {isSuperAdmin && <TableHead className="text-center">عملیات سوپرادمین</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((contract) => {
                  const type = CONTRACT_TYPES.find((t) => t.key === contract.contractType);
                  return (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium text-slate-800">{contract.fullName}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{ color: type?.color, borderColor: (type?.color || '#64748b') + '40' }}
                          className="text-xs"
                        >
                          {type?.label || contract.contractType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatJalali(contract.startDate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {contract.endDate ? (
                          <span className="text-sm text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formatJalali(contract.endDate)}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-slate-700" dir="ltr">
                        {formatToman(Number(contract.salary))} <span className="text-xs text-slate-400">تومان</span>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {contract.notes ? (
                          <span className="text-sm text-slate-500 line-clamp-2">{contract.notes}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell>
                          <SuperAdminActions
                            variant="table"
                            onView={() => openView(contract)}
                            onEdit={() => openEdit(contract)}
                            onDelete={() => handleDelete(contract)}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>مشاهده قرارداد</DialogTitle></DialogHeader>
          {viewContract && (
            <div className="space-y-3">
              <div className="font-bold text-slate-900">{viewContract.fullName}</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-400">نوع:</span> <span className="font-medium">{contractTypeLabel(viewContract.contractType)}</span></div>
                <div><span className="text-slate-400">حقوق:</span> <span className="font-bold">{formatToman(Number(viewContract.salary))} ت</span></div>
                <div><span className="text-slate-400">شروع:</span> <span className="font-medium">{formatJalali(viewContract.startDate)}</span></div>
                <div><span className="text-slate-400">پایان:</span> <span className="font-medium">{viewContract.endDate ? formatJalali(viewContract.endDate) : '—'}</span></div>
              </div>
              {viewContract.notes && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  <span className="text-slate-400 block mb-1">یادداشت:</span>{viewContract.notes}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>ویرایش قرارداد</DialogTitle></DialogHeader>
          {editContract && (
            <div className="space-y-4">
              <div className="space-y-2"><Label>نام و نام خانوادگی *</Label><Input value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} /></div>
              <div className="space-y-2"><Label>نوع قرارداد</Label>
                <Select value={editForm.contractType} onValueChange={(v) => setEditForm({ ...editForm, contractType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONTRACT_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>تاریخ شروع</Label><JalaliDatePicker value={editForm.startDate ? new Date(editForm.startDate) : null} onChange={(d) => setEditForm({ ...editForm, startDate: d ? toLocalDateString(d) : '' })} /></div>
                <div className="space-y-2"><Label>تاریخ پایان</Label><JalaliDatePicker value={editForm.endDate ? new Date(editForm.endDate) : null} onChange={(d) => setEditForm({ ...editForm, endDate: d ? toLocalDateString(d) : '' })} /></div>
              </div>
              <div className="space-y-2"><Label>حقوق (تومان)</Label><Input type="number" dir="ltr" value={editForm.salary} onChange={(e) => setEditForm({ ...editForm, salary: e.target.value })} /></div>
              <div className="space-y-2"><Label>یادداشت</Label><Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} /></div>
              <DialogFooter><Button variant="outline" onClick={() => setEditDialogOpen(false)}>انصراف</Button><Button onClick={handleEditSave} disabled={saving}>{saving ? 'در حال ذخیره...' : 'ذخیره'}</Button></DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
