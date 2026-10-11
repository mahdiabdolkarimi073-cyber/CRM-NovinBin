'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Send, Plus, Search, Trash2, Calendar, ChevronLeft, ChevronRight,
  Eye, User, Clock, X, TrendingUp, Loader2,
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

  const statsList = useMemo(() => [
    { label: 'کل ارجاعیات', value: stats.total.toLocaleString('fa-IR'), icon: Send, filter: 'all', gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)', glow: 'rgba(37,99,235,0.25)' },
    { label: 'فعال', value: stats.active.toLocaleString('fa-IR'), icon: TrendingUp, filter: 'active', gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)', glow: 'rgba(34,197,94,0.25)' },
    { label: 'بسته شده', value: stats.closed.toLocaleString('fa-IR'), icon: X, filter: 'closed', gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)', glow: 'rgba(100,116,139,0.25)' },
  ], [stats]);

  const handleStatClick = (f: string) => {
    setFilterStatus(filterStatus === f ? 'all' : f);
  };

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

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری ارجاعیات...</p>
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
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#FF7A00,#E65100)', boxShadow: '0 0 12px rgba(255,122,0,.25)' }} />
              <h1>ارجاعیات سرنخ‌های فروش</h1>
            </div>
            <p>مدیریت ارجاعیات سرنخ‌های فروش بین اعضای تیم</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/lead-referrals/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            ثبت ارجاع
          </Link>
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        {statsList.map((stat) => (
          <button
            type="button"
            className={`nb-stat-card-v2 ${filterStatus === stat.filter ? 'is-active' : ''}`}
            key={stat.label}
            onClick={() => handleStatClick(stat.filter)}
            style={{ '--stat-glow': stat.glow } as React.CSSProperties}
          >
            <div className="nb-stat-v2-icon" style={{ background: stat.gradient }}>
              <stat.icon className="h-[22px] w-[22px] text-white" strokeWidth={2.5} />
            </div>
            <div className="nb-stat-v2-body">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
            <div className="nb-stat-v2-spark" style={{ background: stat.gradient }} />
          </button>
        ))}
      </section>

      <div className="nb-toolbar">
        <div className="nb-toolbar-left">
          <h2>همه ارجاعیات</h2>
          <span className="nb-count-badge">{filtered.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو بر اساس نام یا شرکت..."
            />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="nb-select-filter h-10 w-[150px]">
              <SelectValue placeholder="وضعیت" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              <SelectItem value="active">فعال</SelectItem>
              <SelectItem value="closed">بسته شده</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {referrals.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><Send className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>ارجاعی یافت نشد</h3>
          <p>سرنخ‌های فروش ارجاع‌داده‌شده در اینجا نمایش داده می‌شوند</p>
          <Link href="/dashboard/lead-referrals/new" className="nb-empty-new-btn"><Plus className="h-4 w-4" /> افزودن ارجاع</Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
                <tr>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">سرنخ</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">وضعیت ارجاع</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">ارجاع‌دهنده</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">تاریخ</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {pageItems.map((ref) => {
                  const lead = leads[ref.leadId];
                  if (!lead) return null;
                  const st = statusInfo(lead.status);
                  const refColor = REF_STATUS_COLOR[ref.status] || '#64748b';
                  return (
                    <tr key={ref.id} className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={() => loadDetail(ref)}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: refColor }} />
                          <div>
                            <div className="font-medium text-slate-800 dark:text-slate-100">{lead.name}</div>
                            {lead.company && <div className="text-xs text-slate-400">{lead.company}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge style={{ backgroundColor: `${refColor}15`, color: refColor }} className="rounded-full text-xs">{REF_STATUS[ref.status] || ref.status}</Badge>
                      </td>
                      <td className="p-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1"><User className="h-3 w-3" />{staffName(ref.referredByProfileId)}</span>
                      </td>
                      <td className="p-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{relativeTime(ref.createdAt)}</span>
                      </td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button onClick={() => loadDetail(ref)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700" title="مشاهده"><Eye className="h-4 w-4" /></button>
                          {ref.status === 'active' && isSuperAdmin && <button onClick={() => closeReferral(ref.id)} className="rounded p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-500" title="بستن ارجاع"><X className="h-4 w-4" /></button>}
                          {isSuperAdmin && <button onClick={() => handleDelete(ref.id)} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500" title="حذف"><Trash2 className="h-4 w-4" /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pageItems.length === 0 && (
                  <tr><td colSpan={5} className="py-12 text-center text-sm text-slate-300 dark:text-slate-600">نتیجه‌ای یافت نشد</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-700">
              <span className="text-xs text-slate-500 dark:text-slate-400">صفحه {currentPage.toLocaleString('fa-IR')} از {pages.toLocaleString('fa-IR')}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-700"><ChevronRight className="h-4 w-4" /></button>
                <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={currentPage === pages} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-700"><ChevronLeft className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </div>
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
                    <div className="rounded-[10px] bg-sky-50 p-3"><div className="text-xs text-slate-500">سرنخ</div><div className="mt-1 text-sm font-bold text-sky-700">{lead.name}</div></div>
                    <div className="rounded-[10px] bg-slate-50 p-3 dark:bg-slate-800/50"><div className="text-xs text-slate-500 dark:text-slate-400">شرکت</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{lead.company || '—'}</div></div>
                    <div className="rounded-[10px] bg-green-50 p-3"><div className="text-xs text-slate-500">تاریخ ارجاع</div><div className="mt-1 text-sm font-bold text-green-700">{formatJalali(ref.createdAt)}</div></div>
                    <div className="rounded-[10px] bg-slate-50 p-3 dark:bg-slate-800/50"><div className="text-xs text-slate-500 dark:text-slate-400">ارجاع‌دهنده</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{staffName(ref.referredByProfileId)}</div></div>
                    <div className="rounded-[10px] bg-slate-50 p-3 dark:bg-slate-800/50"><div className="text-xs text-slate-500 dark:text-slate-400">ارجاع‌شونده</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{staffName(ref.referredToProfileId)}</div></div>
                  </div>
                  {ref.note && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50"><div className="text-xs font-semibold text-slate-500 dark:text-slate-400">یادداشت ارجاع:</div><p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{ref.note}</p></div>}

                  <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
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

      <Link href="/dashboard/lead-referrals/new" className="nb-fab" aria-label="ثبت ارجاع">
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
