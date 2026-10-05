'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Plus, FileSignature, Search, Calendar, Save, Loader2, Eye, LayoutGrid, List, X,
  Trash2, Pencil, DollarSign, Briefcase, User, AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SuperAdminActions } from '@/components/dashboard/super-admin-actions';
import { formatJalali, formatToman, toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';

const CONTRACT_TYPES = [
  { key: 'monthly', label: 'ماهانه', color: '#3b82f6' },
  { key: 'project', label: 'پروژه‌ای', color: '#f59e0b' },
  { key: 'hourly', label: 'ساعتی', color: '#8b5cf6' },
];

const contractTypeLabel = (key: string) => CONTRACT_TYPES.find((t) => t.key === key)?.label || key;
const contractTypeColor = (key: string) => CONTRACT_TYPES.find((t) => t.key === key)?.color || '#64748b';

const PAGE_SIZE = 12;

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
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [page, setPage] = useState(1);
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
    setContracts(data || []);
    setLoading(false);
  }, [profile, isSuperAdmin]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { setPage(1); }, [filterType, search]);

  const filtered = useMemo(() => {
    let result = contracts;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) => c.fullName.toLowerCase().includes(q));
    }
    if (filterType !== 'all') result = result.filter((c) => c.contractType === filterType);
    return result;
  }, [contracts, search, filterType]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const pagedContracts = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => [
    {
      label: 'کل قراردادها', value: contracts.length, icon: FileSignature,
      filter: 'all',
      gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
      glow: 'rgba(37,99,235,0.25)',
    },
    {
      label: 'ماهانه', value: contracts.filter((c) => c.contractType === 'monthly').length, icon: Calendar,
      filter: 'monthly',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563EB 100%)',
      glow: 'rgba(59,130,246,0.25)',
    },
    {
      label: 'پروژه‌ای', value: contracts.filter((c) => c.contractType === 'project').length, icon: Briefcase,
      filter: 'project',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      glow: 'rgba(245,158,11,0.25)',
    },
    {
      label: 'ساعتی', value: contracts.filter((c) => c.contractType === 'hourly').length, icon: DollarSign,
      filter: 'hourly',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      glow: 'rgba(139,92,246,0.25)',
    },
  ], [contracts]);

  const handleStatClick = (f: string) => {
    setFilterType(filterType === f ? 'all' : f);
  };

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

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری قراردادها...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="nb-page" dir="rtl">
      <header className="nb-hero">
        <div className="nb-hero-left">
          <div>
            <div className="nb-hero-title-row">
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#8B5CF6,#7C3AED)', boxShadow: '0 0 12px rgba(139,92,246,.25)' }} />
              <h1>قراردادهای پرسنلی</h1>
            </div>
            <p>مدیریت قراردادهای کارکنان و پرسنل</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/contracts/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            قرارداد جدید
          </Link>
        </div>
      </header>

      {/* Stats */}
      <section className="nb-stats-grid-v2">
        {stats.map((stat) => (
          <button
            type="button"
            className={`nb-stat-card-v2 ${filterType === stat.filter ? 'is-active' : ''}`}
            key={stat.label}
            onClick={() => handleStatClick(stat.filter)}
            style={{ '--stat-glow': stat.glow } as React.CSSProperties}
          >
            <div className="nb-stat-v2-icon" style={{ background: stat.gradient }}>
              <stat.icon className="h-[22px] w-[22px] text-white" />
            </div>
            <div className="nb-stat-v2-body">
              <strong>{stat.value.toLocaleString('fa-IR')}</strong>
              <span>{stat.label}</span>
            </div>
            <div className="nb-stat-v2-spark" style={{ background: stat.gradient }} />
          </button>
        ))}
      </section>

      {/* Toolbar */}
      <div className="nb-toolbar">
        <div className="nb-toolbar-left">
          <h2>همه قراردادها</h2>
          <span className="nb-count-badge">{filtered.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در قراردادها..."
            />
            {search && (
              <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>
            )}
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="nb-select-filter h-10 w-[140px]">
              <SelectValue placeholder="نوع قرارداد" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه انواع</SelectItem>
              {CONTRACT_TYPES.map((t) => (
                <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="nb-view-toggle">
            <button className={viewMode === 'board' ? 'is-active' : ''} onClick={() => setViewMode('board')} aria-label="تخته‌ای">
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button className={viewMode === 'list' ? 'is-active' : ''} onClick={() => setViewMode('list')} aria-label="لیستی">
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon">
            <FileSignature className="h-12 w-12 text-muted-foreground/30" />
          </div>
          <h3>قراردادی ثبت نشده</h3>
          <p>اولین قرارداد پرسنلی را ثبت کنید</p>
          <Link href="/dashboard/contracts/new" className="nb-empty-new-btn">
            <Plus className="h-4 w-4" />
            افزودن قرارداد
          </Link>
        </div>
      ) : viewMode === 'board' ? (
        <div className="nb-grid nb-grid-grid">
          {pagedContracts.map((contract) => {
            const type = CONTRACT_TYPES.find((t) => t.key === contract.contractType);
            const color = type?.color || '#64748b';
            return (
              <article
                key={contract.id}
                className="nb-card"
                onClick={() => openView(contract)}
                style={{ borderBottomColor: color, borderBottomWidth: 3 }}
              >
                <div className="nb-card-top">
                  <div className="nb-card-tags">
                    <span className="nb-card-tag" style={{ background: `${color}15`, color }}>
                      {type?.label || contract.contractType}
                    </span>
                  </div>
                  <div className="nb-card-actions">
                    <button className="nb-card-more" onClick={(e) => { e.stopPropagation(); openView(contract); }}>
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h3 className="nb-card-title">{contract.fullName}</h3>
                <p className="nb-card-excerpt" style={{ WebkitLineClamp: 1 }}>
                  {formatToman(Number(contract.salary))} تومان
                </p>

                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>شروع: {formatJalali(contract.startDate)}</span>
                  </div>
                  {contract.endDate && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span>پایان: {formatJalali(contract.endDate)}</span>
                    </div>
                  )}
                </div>

                {contract.notes && (
                  <div className="mt-2 rounded-lg bg-slate-50/50 p-2 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-400" onClick={(e) => e.stopPropagation()}>
                    <p className="line-clamp-2">{contract.notes}</p>
                  </div>
                )}

                <div className="nb-card-footer" onClick={(e) => e.stopPropagation()}>
                  <div className="nb-card-date">
                    <span dir="ltr">{formatToman(Number(contract.salary))} ت</span>
                  </div>
                  <div className="nb-card-quick">
                    <button onClick={(e) => { e.stopPropagation(); openView(contract); }} title="مشاهده">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    {isSuperAdmin && (
                      <>
                        <Link href={`/dashboard/contracts/${contract.id}/edit`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700" title="ویرایش">
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(contract); }} title="حذف">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
                <tr>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">نام</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">نوع قرارداد</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">تاریخ شروع</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">تاریخ پایان</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">حقوق</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">یادداشت</th>
                  {isSuperAdmin && <th className="p-3 text-center font-medium text-slate-500 dark:text-slate-400">عملیات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {pagedContracts.map((contract) => {
                  const type = CONTRACT_TYPES.find((t) => t.key === contract.contractType);
                  return (
                    <tr key={contract.id} className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={() => openView(contract)}>
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-100">{contract.fullName}</td>
                      <td className="p-3">
                        <Badge variant="outline" style={{ color: type?.color, borderColor: (type?.color || '#64748b') + '40' }} className="text-xs">
                          {type?.label || contract.contractType}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatJalali(contract.startDate)}
                        </span>
                      </td>
                      <td className="p-3">
                        {contract.endDate ? (
                          <span className="text-sm text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formatJalali(contract.endDate)}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="p-3 font-medium text-slate-700 dark:text-slate-200" dir="ltr">
                        {formatToman(Number(contract.salary))} <span className="text-xs text-slate-400">تومان</span>
                      </td>
                      <td className="p-3 max-w-xs">
                        {contract.notes ? (
                          <span className="text-sm text-slate-500 line-clamp-2">{contract.notes}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      {isSuperAdmin && (
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          <SuperAdminActions
                            variant="table"
                            onView={() => openView(contract)}
                            onEdit={() => router.push(`/dashboard/contracts/${contract.id}/edit`)}
                            onDelete={() => handleDelete(contract)}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            <X className="h-4 w-4 rotate-45" />
          </button>
          <span className="text-sm text-slate-500">
            صفحه {currentPage.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}
          </span>
          <button
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          >
            <Plus className="h-4 w-4 rotate-45" />
          </button>
        </div>
      )}

      <Link href="/dashboard/contracts/new" className="nb-fab" aria-label="قرارداد جدید">
        <Plus className="h-6 w-6" />
      </Link>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>مشاهده قرارداد</DialogTitle></DialogHeader>
          {viewContract && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-900/20">
                  <FileSignature className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">{viewContract.fullName}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-400">نوع:</span> <span className="font-medium">{contractTypeLabel(viewContract.contractType)}</span></div>
                <div><span className="text-slate-400">حقوق:</span> <span className="font-bold">{formatToman(Number(viewContract.salary))} ت</span></div>
                <div><span className="text-slate-400">شروع:</span> <span className="font-medium">{formatJalali(viewContract.startDate)}</span></div>
                <div><span className="text-slate-400">پایان:</span> <span className="font-medium">{viewContract.endDate ? formatJalali(viewContract.endDate) : '—'}</span></div>
              </div>
              {viewContract.notes && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <span className="text-slate-400 block mb-1">یادداشت:</span>{viewContract.notes}
                </div>
              )}
              {isSuperAdmin && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => { setViewDialogOpen(false); router.push(`/dashboard/contracts/${viewContract.id}/edit`); }}>
                    <Pencil className="h-3.5 w-3.5" /> ویرایش
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => handleDelete(viewContract)}>
                    <Trash2 className="h-3.5 w-3.5" /> حذف
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>ویرایش قرارداد</DialogTitle></DialogHeader>
          {editContract && (
            <div className="space-y-4">
              <div className="space-y-2"><Label>نام و نام خانوادگی *</Label><Input value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} /></div>
              <div className="space-y-2"><Label>نوع قرارداد</Label>
                <Select value={editForm.contractType} onValueChange={(v) => setEditForm({ ...editForm, contractType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONTRACT_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
