'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  TrendingUp, Plus, Phone, Mail, MapPin, Search, Eye, Pencil, Trash2,
  BarChart3, Filter, Zap, FileBarChart, FileSpreadsheet, ChevronLeft, ChevronRight,
  UserCheck, Clock,
} from 'lucide-react';
import { relativeTime } from '@/lib/format';
import { LEAD_STATUSES } from '@/lib/constants';
import { toast } from 'sonner';
import type { Lead } from '@/lib/types';

const statusInfo = (key: string) => LEAD_STATUSES.find((s) => s.key === key) || LEAD_STATUSES[0];

const LEAD_SOURCES = ['وب‌سایت', 'نمایشگاه', 'معرفی', 'تماس مستقیم', 'تبلیغات', 'شبکه اجتماعی'];
const CITIES = ['تهران', 'مشهد', 'اصفهان', 'شیراز', 'تبریز', 'کرج', 'اهواز', 'کرمان'];

const PAGE_SIZE = 12;

export default function LeadsPage() {
  const { profile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterCity, setFilterCity] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterTime, setFilterTime] = useState('all');
  const [page, setPage] = useState(1);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewLead, setViewLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [form, setForm] = useState({
    name: '', company: '', phone: '', email: '', city: '', source: '', notes: '',
  });

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadLeads = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const where: any = {};
      if (filterStatus !== 'all') where.status = filterStatus;
      if (filterSource !== 'all') where.source = filterSource;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { company: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }
      const data = await fetchData('leads', { where, orderBy: { createdAt: 'desc' } });
      setLeads((data as Lead[]) || []);
    } catch (error: any) {
      toast.error('بارگذاری سرنخ‌ها ناموفق: ' + error.message);
    }
    setLoading(false);
  }, [profile, filterStatus, filterSource, search]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, filterStatus, filterSource, filterCity, filterAssignee, filterTime]);

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (filterCity !== 'all') {
      result = result.filter((l) => (l as any).city === filterCity);
    }
    if (filterAssignee !== 'all') {
      result = result.filter((l) => l.assignedTo === filterAssignee);
    }
    if (filterTime !== 'all') {
      const now = new Date();
      const days = filterTime === '7d' ? 7 : filterTime === '30d' ? 30 : 90;
      const cutoff = new Date(now.getTime() - days * 86400000);
      result = result.filter((l) => new Date(l.createdAt) >= cutoff);
    }
    return result;
  }, [leads, filterCity, filterAssignee, filterTime]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedLeads = filteredLeads.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    LEAD_STATUSES.forEach((s) => { counts[s.key] = 0; });
    leads.forEach((l) => { if (counts[l.status] !== undefined) counts[l.status]++; });
    return [
      { key: 'new', label: 'سرنخ جدید', count: counts['new'] || 0, color: '#2F80ED' },
      { key: 'total', label: 'کل سرنخ‌ها', count: leads.length, color: '#6366F1' },
      { key: 'contacted', label: 'در حال پیگیری', count: counts['contacted'] || 0, color: '#9B51E0' },
      { key: 'contact_needed', label: 'نیازمند تماس', count: counts['new'] || 0, color: '#FF9F1C' },
      { key: 'qualified', label: 'مشتری بالقوه', count: counts['qualified'] || 0, color: '#16B978' },
      { key: 'converted', label: 'مشتری قطعی', count: counts['converted'] || 0, color: '#10B981' },
    ];
  }, [leads]);

  const hasActiveFilters = filterStatus !== 'all' || filterSource !== 'all' || filterCity !== 'all' || filterAssignee !== 'all' || filterTime !== 'all';

  const clearFilters = () => {
    setFilterStatus('all');
    setFilterSource('all');
    setFilterCity('all');
    setFilterAssignee('all');
    setFilterTime('all');
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm({
      name: lead.name || '',
      company: lead.company || '',
      phone: lead.phone || '',
      email: lead.email || '',
      city: (lead as any).city || '',
      source: lead.source || '',
      notes: lead.notes || '',
    });
    setEditDialogOpen(true);
  };

  const openView = (lead: Lead) => {
    setViewLead(lead);
    setViewDialogOpen(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead || !form.name) return;
    setSaving(true);
    try {
      await updateData('leads', { id: editingLead.id }, {
        name: form.name,
        company: form.company || null,
        phone: form.phone || null,
        email: form.email || null,
        source: form.source || null,
        notes: form.notes || null,
      });
      toast.success('سرنخ ویرایش شد');
      setEditDialogOpen(false);
      setEditingLead(null);
      loadLeads();
    } catch (error: any) {
      toast.error('ویرایش ناموفق: ' + error.message);
    }
    setSaving(false);
  };

  const handleDelete = async (lead: Lead) => {
    if (!confirm(`حذف سرنخ «${lead.name}»؟`)) return;
    try {
      await deleteData('leads', { id: lead.id });
      toast.success('سرنخ حذف شد');
      loadLeads();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const convertToCustomer = async (lead: Lead) => {
    if (!profile) return;
    if (!isSuperAdmin) {
      toast.error('فقط سوپرادمین می‌تواند سرنخ را به مشتری تبدیل کند');
      return;
    }
    setConverting(true);
    try {
      const cust = await createData('customers', {
        type: 'individual',
        firstName: lead.name,
        companyName: lead.company,
        phone: lead.phone,
        email: lead.email,
        source: lead.source,
        level: 'bronze',
        createdBy: profile.id,
      });
      await updateData('leads', { id: lead.id }, { status: 'converted', customerId: cust.id });
      toast.success('سرنخ به مشتری واقعی تبدیل شد و در لیست مشتریان اضافه شد');
      setEditDialogOpen(false);
      setEditingLead(null);
      loadLeads();
    } catch (error: any) {
      toast.error('تبدیل ناموفق: ' + error.message);
    }
    setConverting(false);
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateData('leads', { id }, { status });
      loadLeads();
    } catch (error: any) {
      toast.error('تغییر وضعیت ناموفق: ' + error.message);
    }
  };

  const exportExcel = () => {
    const headers = ['نام', 'شرکت', 'تلفن', 'ایمیل', 'منبع', 'وضعیت', 'تاریخ ایجاد'];
    const rows = filteredLeads.map((l) => [
      l.name, l.company || '', l.phone || '', l.email || '', l.source || '', statusInfo(l.status).label, l.createdAt,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('خروجی Excel آماده شد');
  };

  return (
    <div className="leads-page">
      <header className="leads-header">
        <div className="leads-heading">
          <div className="leads-title-row">
            <span className="leads-title-accent" />
            <h1>سرنخ‌های فروش</h1>
          </div>
          <p>مدیریت سرنخ‌ها و دنبال‌کردن مشتریان</p>
        </div>
        <Link href="/dashboard/leads/new" className="leads-new-button">
          <Plus className="h-4 w-4" />
          سرنخ جدید
        </Link>
      </header>

      <div className="leads-toolbar">
        <div className="leads-search-wrap">
          <Search className="h-4 w-4" />
          <input
            type="text"
            placeholder="جستجوی سرنخ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="leads-filter-dropdown">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="leads-select-trigger">
              <SelectValue placeholder="همه وضعیت‌ها" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="leads-layout">
        <main className="leads-content">
          {loading ? (
            <div className="leads-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="lead-skeleton">
                  <div className="lead-skeleton-avatar" />
                  <div className="lead-skeleton-line w-60" />
                  <div className="lead-skeleton-line w-40" />
                  <div className="lead-skeleton-line w-full" />
                  <div className="lead-skeleton-line w-full" />
                  <div className="lead-skeleton-line w-3/4" />
                </div>
              ))}
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="leads-empty">
              <TrendingUp className="h-10 w-10" />
              <strong>سرنخی یافت نشد</strong>
              <span>سرنخ‌های فروش جدید را ثبت کنید</span>
              <Link href="/dashboard/leads/new" className="leads-empty-button">
                <Plus className="h-4 w-4" /> ایجاد سرنخ
              </Link>
            </div>
          ) : (
            <>
              <div className="leads-grid">
                {pagedLeads.map((lead) => {
                  const st = statusInfo(lead.status);
                  const stageIndex = LEAD_STATUSES.findIndex((s) => s.key === lead.status);
                  const progress = Math.round(((stageIndex + 1) / LEAD_STATUSES.length) * 100);
                  return (
                    <article key={lead.id} className="lead-card">
                      <div className="lead-card-header">
                        <div className="lead-card-id">
                          <div
                            className="lead-card-avatar"
                            style={{ backgroundColor: st.color + '20', color: st.color }}
                          >
                            {lead.name?.[0] || '؟'}
                          </div>
                          <div className="lead-card-name-wrap">
                            <h3>{lead.name}</h3>
                            <span>{lead.company || 'مشتری بالقوه'}</span>
                          </div>
                        </div>
                        <Badge
                          className="lead-status-badge"
                          style={{ backgroundColor: st.color + '18', color: st.color }}
                        >
                          {st.label}
                        </Badge>
                      </div>

                      <div className="lead-card-contacts">
                        {lead.phone && (
                          <div className="lead-contact-row">
                            <Phone className="h-4 w-4" />
                            <span dir="ltr">{lead.phone}</span>
                          </div>
                        )}
                        {lead.email && (
                          <div className="lead-contact-row">
                            <Mail className="h-4 w-4" />
                            <span dir="ltr" className="truncate">{lead.email}</span>
                          </div>
                        )}
                        {lead.source && (
                          <div className="lead-contact-row">
                            <MapPin className="h-4 w-4" />
                            <span className="truncate">{lead.source}</span>
                          </div>
                        )}
                      </div>

                      <div className="lead-progress-wrap">
                        <div className="lead-progress-track">
                          <div
                            className="lead-progress-fill"
                            style={{ width: `${progress}%`, backgroundColor: st.color }}
                          />
                        </div>
                        <span className="lead-progress-time">{relativeTime(lead.createdAt)}</span>
                      </div>

                      <div className="lead-card-actions">
                        <button className="lead-action-btn lead-action-view" onClick={() => openView(lead)}>
                          <Eye className="h-3.5 w-3.5" />
                          مشاهده
                        </button>
                        <button className="lead-action-btn lead-action-edit" onClick={() => openEdit(lead)}>
                          <Pencil className="h-3.5 w-3.5" />
                          ویرایش
                        </button>
                        <button className="lead-action-btn lead-action-delete" onClick={() => handleDelete(lead)}>
                          <Trash2 className="h-3.5 w-3.5" />
                          حذف
                        </button>
                      </div>

                      {isSuperAdmin && lead.status !== 'converted' && (
                        <button
                          className="lead-convert-btn"
                          onClick={() => convertToCustomer(lead)}
                          disabled={converting}
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          {converting ? 'در حال تبدیل...' : 'تبدیل به مشتری'}
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="leads-pagination">
                  <div className="leads-page-size">
                    <span>نمایش</span>
                    <Select value={String(PAGE_SIZE)} onValueChange={() => {}}>
                      <SelectTrigger className="leads-page-size-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12">۱۲</SelectItem>
                      </SelectContent>
                    </Select>
                    <span>سرنخ</span>
                  </div>
                  <div className="leads-page-buttons">
                    <button
                      className="leads-page-btn"
                      onClick={() => setPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        className={`leads-page-btn ${currentPage === i + 1 ? 'leads-page-btn-active' : ''}`}
                        onClick={() => setPage(i + 1)}
                      >
                        {(i + 1).toLocaleString('fa-IR')}
                      </button>
                    ))}
                    <button
                      className="leads-page-btn"
                      onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        <aside className="leads-sidebar">
          <section className="leads-sidebar-section">
            <h2 className="leads-sidebar-title">
              <BarChart3 className="h-4 w-4" />
              آمار سرنخ‌ها
            </h2>
            <div className="leads-stats-grid">
              {stats.map((s) => (
                <div key={s.key} className="lead-mini-stat">
                  <strong style={{ color: s.color }}>{s.count.toLocaleString('fa-IR')}</strong>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="leads-sidebar-section">
            <h2 className="leads-sidebar-title">
              <Filter className="h-4 w-4" />
              فیلترها
            </h2>
            <div className="leads-filter-list">
              <div className="leads-filter-field">
                <label>وضعیت سرنخ</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="leads-filter-select"><SelectValue placeholder="همه" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه</SelectItem>
                    {LEAD_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="leads-filter-field">
                <label>منبع سرنخ</label>
                <Select value={filterSource} onValueChange={setFilterSource}>
                  <SelectTrigger className="leads-filter-select"><SelectValue placeholder="همه" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه</SelectItem>
                    {LEAD_SOURCES.map((src) => <SelectItem key={src} value={src}>{src}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="leads-filter-field">
                <label>بازه زمانی</label>
                <Select value={filterTime} onValueChange={setFilterTime}>
                  <SelectTrigger className="leads-filter-select"><SelectValue placeholder="همه" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه</SelectItem>
                    <SelectItem value="7d">۷ روز اخیر</SelectItem>
                    <SelectItem value="30d">۳۰ روز اخیر</SelectItem>
                    <SelectItem value="90d">۹۰ روز اخیر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="leads-filter-field">
                <label>شهر</label>
                <Select value={filterCity} onValueChange={setFilterCity}>
                  <SelectTrigger className="leads-filter-select"><SelectValue placeholder="همه" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه</SelectItem>
                    {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="leads-filter-field">
                <label>مسئول پیگیری</label>
                <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                  <SelectTrigger className="leads-filter-select"><SelectValue placeholder="همه" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <button
              className={`leads-clear-filters ${!hasActiveFilters ? 'leads-clear-filters-disabled' : ''}`}
              onClick={clearFilters}
              disabled={!hasActiveFilters}
            >
              <Trash2 className="h-3.5 w-3.5" />
              پاک کردن فیلترها
            </button>
          </section>

          <section className="leads-sidebar-section">
            <h2 className="leads-sidebar-title">
              <Zap className="h-4 w-4" />
              عملیات سریع
            </h2>
            <div className="leads-quick-actions">
              <Link href="/dashboard/leads/new" className="leads-quick-btn leads-quick-blue">
                <Plus className="h-5 w-5" />
                <span>سرنخ جدید</span>
              </Link>
              <button className="leads-quick-btn leads-quick-purple">
                <FileBarChart className="h-5 w-5" />
                <span>گزارش سرنخ‌ها</span>
              </button>
              <button className="leads-quick-btn leads-quick-teal" onClick={exportExcel}>
                <FileSpreadsheet className="h-5 w-5" />
                <span>خروجی Excel</span>
              </button>
            </div>
          </section>
        </aside>
      </div>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>مشاهده سرنخ</DialogTitle></DialogHeader>
          {viewLead && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full text-white flex items-center justify-center font-bold text-lg" style={{ backgroundColor: statusInfo(viewLead.status).color }}>
                  {viewLead.name?.[0] || '؟'}
                </div>
                <div>
                  <div className="font-bold text-slate-900">{viewLead.name}</div>
                  <Badge style={{ backgroundColor: statusInfo(viewLead.status).color + '20', color: statusInfo(viewLead.status).color }}>{statusInfo(viewLead.status).label}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {viewLead.company && <div><span className="text-slate-400">شرکت:</span> <span className="font-medium">{viewLead.company}</span></div>}
                {viewLead.source && <div><span className="text-slate-400">منبع:</span> <span className="font-medium">{viewLead.source}</span></div>}
                {viewLead.phone && <div><span className="text-slate-400">تلفن:</span> <span className="font-medium" dir="ltr">{viewLead.phone}</span></div>}
                {viewLead.email && <div><span className="text-slate-400">ایمیل:</span> <span className="font-medium" dir="ltr">{viewLead.email}</span></div>}
              </div>
              {viewLead.notes && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  <span className="text-slate-400 block mb-1">یادداشت:</span>
                  {viewLead.notes}
                </div>
              )}
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                ایجاد شده: {relativeTime(viewLead.createdAt)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>ویرایش سرنخ</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>نام *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>شرکت</Label>
                <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>تلفن</Label>
                <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>ایمیل</Label>
                <Input dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>منبع جذب</Label>
              <Input placeholder="مثلا: وب‌سایت، نمایشگاه، معرفی" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>یادداشت</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <div className="flex gap-2 w-full sm:w-auto">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>انصراف</Button>
                <Button type="submit" disabled={saving}>{saving ? 'در حال ذخیره...' : 'ذخیره'}</Button>
              </div>
              {isSuperAdmin && editingLead && editingLead.status !== 'converted' && (
                <Button
                  type="button"
                  variant="default"
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
                  disabled={converting}
                  onClick={() => convertToCustomer(editingLead)}
                >
                  <UserCheck className="w-4 h-4" />
                  {converting ? 'در حال تبدیل...' : 'تبدیل به مشتری واقعی'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
