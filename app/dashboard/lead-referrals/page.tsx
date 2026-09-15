'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Search, Eye, X, Send, User, Clock } from 'lucide-react';
import { LEAD_STATUSES, fullName } from '@/lib/constants';
import { relativeTime } from '@/lib/format';
import { toast } from 'sonner';
import type { Lead, Profile, LeadReferral } from '@/lib/types';

const statusInfo = (key: string) => LEAD_STATUSES.find((s) => s.key === key) || LEAD_STATUSES[0];

export default function LeadReferralsPage() {
  const { profile } = useAuth();
  const [referrals, setReferrals] = useState<LeadReferral[]>([]);
  const [leads, setLeads] = useState<Record<string, Lead>>({});
  const [referrers, setReferrers] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const loadReferrals = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const data = await fetchData<LeadReferral[]>('lead_referrals', {
        where: { referredToProfileId: profile.id },
        orderBy: { createdAt: 'desc' },
      });
      const refs = data || [];
      setReferrals(refs);

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
      toast.error('بارگذاری ارجاعیات ناموفک: ' + e.message);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadReferrals(); }, [loadReferrals]);

  const closeReferral = async (id: string) => {
    try {
      await updateData('lead_referrals', { id }, { status: 'closed' });
      toast.success('ارجاع بسته شد');
      loadReferrals();
    } catch (e: any) {
      toast.error('عملیات ناموفق: ' + e.message);
    }
  };

  const filteredReferrals = referrals.filter((ref) => {
    const lead = leads[ref.leadId];
    if (!lead) return false;
    if (filterStatus !== 'all' && ref.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!lead.name.toLowerCase().includes(q) && !(lead.company || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="leads-page">
      <header className="leads-header">
        <div className="leads-heading">
          <div className="leads-title-row">
            <span className="leads-title-accent" />
            <h1>ارجاعیات سرنخ‌های فروش</h1>
          </div>
          <p>سرنخ‌های فروشی که به شما ارجاع داده شده‌اند</p>
        </div>
        <Link href="/dashboard/leads" className="leads-new-button">
          <TrendingUp className="h-4 w-4" />
          سرنخ‌های فروش
        </Link>
      </header>

      <div className="leads-toolbar">
        <div className="leads-search-wrap">
          <Search className="h-4 w-4" />
          <input
            type="text"
            placeholder="جستجوی ارجاع..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="leads-filter-dropdown">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="leads-select-trigger"
            style={{ padding: '0 12px', height: 40, borderRadius: 10, border: '1px solid #E2E8F0', background: '#fff', fontSize: 13, cursor: 'pointer' }}
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="active">فعال</option>
            <option value="closed">بسته شده</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="leads-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="lead-skeleton">
              <div className="lead-skeleton-avatar" />
              <div className="lead-skeleton-line w-60" />
              <div className="lead-skeleton-line w-40" />
              <div className="lead-skeleton-line w-full" />
              <div className="lead-skeleton-line w-full" />
            </div>
          ))}
        </div>
      ) : filteredReferrals.length === 0 ? (
        <div className="leads-empty">
          <Send className="h-10 w-10" />
          <strong>ارجاعی یافت نشد</strong>
          <span>سرنخ‌های فروش ارجاع‌داده‌شده به شما اینجا نمایش داده می‌شوند</span>
          <Link href="/dashboard/leads" className="leads-empty-button">
            <TrendingUp className="h-4 w-4" /> رفتن به سرنخ‌های فروش
          </Link>
        </div>
      ) : (
        <div className="leads-grid">
          {filteredReferrals.map((ref) => {
            const lead = leads[ref.leadId];
            if (!lead) return null;
            const st = statusInfo(lead.status);
            const referrer = ref.referredByProfileId ? referrers[ref.referredByProfileId] : null;
            const referrerName = referrer ? fullName(referrer.firstName, referrer.lastName) : 'نامشخص';
            return (
              <article key={ref.id} className="lead-card">
                <div className="lead-card-top-bar" style={{ backgroundColor: st.color }} />
                <div className="lead-card-header">
                  <div className="lead-card-avatar-lg" style={{ backgroundColor: st.color + '20', color: st.color, borderColor: st.color + '40' }}>
                    {lead.name?.[0] || '؟'}
                  </div>
                  <div className="lead-card-name-wrap">
                    <h3>{lead.name}</h3>
                    <span>{lead.company || 'مشتری بالقوه'}</span>
                  </div>
                </div>

                <div className="lead-card-status-row">
                  <Badge className="lead-status-badge" style={{ backgroundColor: st.color + '18', color: st.color }}>
                    {st.label}
                  </Badge>
                  <Badge className={ref.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                    {ref.status === 'active' ? 'فعال' : 'بسته شده'}
                  </Badge>
                </div>

                {ref.note && (
                  <div className="lead-card-notes">
                    <span className="lead-card-notes-label">یادداشت ارجاع:</span>
                    <p className="lead-card-notes-text">{ref.note}</p>
                  </div>
                )}

                <div className="lead-card-contacts">
                  <div className="lead-contact-row">
                    <User className="h-4 w-4" />
                    <span>ارجاع توسط: {referrerName}</span>
                  </div>
                  <div className="lead-contact-row">
                    <Clock className="h-4 w-4" />
                    <span>{relativeTime(ref.createdAt)}</span>
                  </div>
                </div>

                <div className="lead-card-actions">
                  <Link href="/dashboard/leads" className="lead-action-btn lead-action-view" title="مشاهده سرنخ">
                    <Eye className="h-4 w-4" />
                  </Link>
                  {ref.status === 'active' && (
                    <button className="lead-action-btn lead-action-delete" onClick={() => closeReferral(ref.id)} title="بستن ارجاع">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
