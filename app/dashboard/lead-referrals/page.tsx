'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Send, Plus, Search, Trash2, Calendar, ChevronLeft, ChevronRight,
  Eye, User, Clock, X, TrendingUp,
} from 'lucide-react';
import { formatJalali, relativeTime } from '@/lib/format';
import { LEAD_STATUSES, fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type { Lead, Profile, LeadReferral } from '@/lib/types';

const REF_STATUS: Record<string, string> = {
  active: 'فعال',
  closed: 'بسته شده',
};
const REF_STATUS_COLOR: Record<string, string> = {
  active: '#10b981',
  closed: '#64748b',
};

const statusInfo = (key: string) => LEAD_STATUSES.find((s) => s.key === key) || LEAD_STATUSES[0];

export default function LeadReferralsPage() {
  const { profile } = useAuth();
  const [referrals, setReferrals] = useState<LeadReferral[]>([]);
  const [leads, setLeads] = useState<Record<string, Lead>>({});
  const [referrers, setReferrers] = useState<Record<string, Profile>>({});
  const [staff, setStaff] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<{ ref: LeadReferral; lead: Lead | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [refData, staffData] = await Promise.all([
        fetchData<LeadReferral[]>('lead_referrals', {
          orderBy: { createdAt: 'desc' },
        }),
        fetchData<Profile>('profiles', { where: {} }),
      ]);
      const refs = refData || [];
      setReferrals(refs);
      setStaff(staffData || []);

      const leadIds = Array.from(new Set(refs.map((r) => r.leadId)));
      if (leadIds.length > 0) {
        const leadsData = await fetchData<Lead[]>('leads', { where: { id: { in: leadIds } } });
        const leadMap: Record<string, Lead> = {};
        (leadsData || []).forEach((l) => { leadMap[l.id] = l; });
        setLeads(leadMap);
      }

      const referrerIds = Array.from(new Set(refs.map((r) => r.referredByProfileId).filter(Boolean) as string[]));
      if (referrerIds.length > 0) {
        const profiles = await fetchData<Profile[]>('profiles', { where: { id: { in: referrerIds } } });
        const profileMap: Record<string, Profile> = {};
        (profiles || []).forEach((p) => { profileMap[p.id] = p; });
        setReferrers(profileMap);
      }
    } catch (e: any) {
      toast.error('بارگذاری ارجاعیات ناموفق: ' + e.message);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    return referrals.filter((ref) => {
      const lead = leads[ref.leadId];
      if (!lead) return false;
      if (filterStatus !== 'all' && ref.status !== filterStatus) return false;
      if (search) {
        const q = search.trim().toLocaleLowerCase();
        if (!lead.name?.toLocaleLowerCase().includes(q) && !(lead.company || '')?.toLocaleLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [referrals, leads, search, filterStatus]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = useMemo(() => ({
    total: referrals.length,
    active: referrals.filter((r) => r.status === 'active').length,
    closed: referrals.filter((r) => r.status === 'closed').length,
  }), [referrals]);

  const closeReferral = async (id: string) => {
    try {
      await updateData('lead_referrals', { id }, { status: 'closed' });
      toast.success('ارجاع بسته شد');
      setDetail(null);
      loadData();
    } catch (e: any) {
      toast.error('عملیات ناموفق: ' + e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف این ارجاع؟')) return;
    try {
      await deleteData('lead_referrals', { id });
      toast.success('ارجاع حذف شد');
      setDetail(null);
      loadData();
    } catch (e: any) {
      toast.error('حذف ناموفق: ' + e.message);
    }
  };

  const loadDetail = (ref: LeadReferral) => {
    setDetail({ ref, lead: leads[ref.leadId] || null });
  };

  const staffName = (id: string | null | undefined) => {
    if (!id) return 'نامشخص';
    const s = referrers[id] || staff.find((p) => p.id === id);
    return s ? fullName(s.firstName, s.lastName) : 'نامشخص';
  };

  return (
    <div className="w-full" dir="rtl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">ارجاعیات سرنخ‌های فروش</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> فروش <span className="mx-1.5 text-[#CBD5E1]">←</span> ارجاعیات سرنخ‌های فروش</div>
        </div>
        <Link href="/dashboard/lead-referrals/new">
          <Button className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
            <Plus className="h-4 w-4" /> ثبت ارجاع
          </Button>
        </Link>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-3">
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#3155E7]/10 text-[#3155E7]"><Send className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.total.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">کل ارجاعیات</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#10b981]/10 text-[#10b981]"><TrendingUp className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.active.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">فعال</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#64748b]/10 text-[#64748b]"><X className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.closed.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">بسته شده</div></div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#98A2B3]" />
          <Input placeholder="جستجو بر اساس نام یا شرکت..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-[42px] w-full rounded-[10px] border-[#DCE3EE] bg-white pr-9 text-sm sm:w-[320px]" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-[42px] rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
          <option value="all">همه وضعیت‌ها</option>
          <option value="active">فعال</option>
          <option value="closed">بسته شده</option>
        </select>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" /></div>
      ) : referrals.length === 0 ? (
        <Card><EmptyState icon={<Send className="h-8 w-8" />} title="ارجاعی یافت نشد" description="سرنخ‌های فروش ارجاع‌داده‌شده در اینجا نمایش داده می‌شوند" action={<Link href="/dashboard/lead-referrals/new"><Button><Plus className="h-4 w-4" /> افزودن ارجاع</Button></Link>} /></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="divide-y divide-[#F1F5F9]">
            {pageItems.map((ref) => {
              const lead = leads[ref.leadId];
              if (!lead) return null;
              const st = statusInfo(lead.status);
              const refColor = REF_STATUS_COLOR[ref.status] || '#64748b';
              return (
                <div key={ref.id} className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-[#F8FAFD]" onClick={() => loadDetail(ref)}>
                  <div className="h-10 w-2 rounded-full" style={{ backgroundColor: refColor }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-bold text-[#1D2939]">{lead.name}</div>
                      <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: refColor, borderColor: `${refColor}35`, backgroundColor: `${refColor}10` }}>{REF_STATUS[ref.status] || ref.status}</Badge>
                      <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: st.color, borderColor: `${st.color}35`, backgroundColor: `${st.color}10` }}>{st.label}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#98A2B3]">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />ارجاع توسط: {staffName(ref.referredByProfileId)}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{relativeTime(ref.createdAt)}</span>
                      {lead.company && <span>{lead.company}</span>}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); loadDetail(ref); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-[#EFF4FF] hover:text-[#2563EB]"><Eye className="h-4 w-4" /></button>
                  {ref.status === 'active' && isSuperAdmin && <button onClick={(e) => { e.stopPropagation(); closeReferral(ref.id); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-amber-50 hover:text-amber-500" title="بستن ارجاع"><X className="h-4 w-4" /></button>}
                  {isSuperAdmin && <button onClick={(e) => { e.stopPropagation(); handleDelete(ref.id); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>}
                </div>
              );
            })}
            {pageItems.length === 0 && <div className="py-12 text-center text-sm text-[#CBD5E1]">نتیجه‌ای یافت نشد</div>}
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-[#F1F5F9] px-4 py-3">
              <span className="text-xs text-[#667085]">صفحه {currentPage.toLocaleString('fa-IR')} از {pages.toLocaleString('fa-IR')}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCE3EE] text-[#667085] transition-colors hover:bg-[#F1F5F9] disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
                <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={currentPage === pages} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCE3EE] text-[#667085] transition-colors hover:bg-[#F1F5F9] disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </CardContent></Card>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {detail && detail.lead && (() => {
            const { ref, lead } = detail;
            const st = statusInfo(lead.status);
            const refColor = REF_STATUS_COLOR[ref.status] || '#64748b';
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-3">
                    <DialogTitle className="text-lg">{lead.name}</DialogTitle>
                    {isSuperAdmin && <Button size="sm" variant="ghost" className="h-8 shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(ref.id)}><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge style={{ backgroundColor: `${refColor}20`, color: refColor }}>{REF_STATUS[ref.status] || ref.status}</Badge>
                    <Badge style={{ backgroundColor: `${st.color}20`, color: st.color }}>{st.label}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-[10px] bg-[#EFF4FF] p-3"><div className="text-xs text-[#667085]">سرنخ</div><div className="mt-1 text-sm font-bold text-[#3155E7]">{lead.name}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">شرکت</div><div className="mt-1 text-sm font-bold text-[#344054]">{lead.company || '—'}</div></div>
                    <div className="rounded-[10px] bg-[#DCFCE7] p-3"><div className="text-xs text-[#667085]">تاریخ ارجاع</div><div className="mt-1 text-sm font-bold text-[#16A34A]">{formatJalali(ref.createdAt)}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">ارجاع‌دهنده</div><div className="mt-1 text-sm font-bold text-[#344054]">{staffName(ref.referredByProfileId)}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">ارجاع‌شونده</div><div className="mt-1 text-sm font-bold text-[#344054]">{staffName(ref.referredToProfileId)}</div></div>
                  </div>
                  {ref.note && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="text-xs font-semibold text-slate-500">یادداشت ارجاع:</div><p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{ref.note}</p></div>}

                  <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                    {ref.status === 'active' && isSuperAdmin && (
                      <Button variant="outline" className="border-amber-200 text-amber-600 hover:bg-amber-50" onClick={() => closeReferral(ref.id)}><X className="h-4 w-4" /> بستن ارجاع</Button>
                    )}
                    <Link href={`/dashboard/lead-referrals/${ref.id}/edit`}>
                      <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">ویرایش</Button>
                    </Link>
                  </div>
                </div>
              </>
            );
          })()}
          {detail && !detail.lead && (
            <div className="py-8 text-center text-sm text-slate-400">سرنخ مرتبط یافت نشد</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
