'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp, Archive, Trash2, Eye, ArchiveRestore, ArrowRight, Loader2, AlertTriangle,
} from 'lucide-react';
import { relativeTime } from '@/lib/format';
import { LEAD_STATUSES } from '@/lib/constants';
import { toast } from 'sonner';
import type { Lead } from '@/lib/types';

const statusInfo = (key: string) => LEAD_STATUSES.find((s) => s.key === key) || LEAD_STATUSES[0];

const AUTO_DELETE_DAYS = 30;

export default function LeadsArchivePage() {
  const { profile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const where: any = { isArchived: true };
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { company: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ];
      }
      const data = await fetchData<Lead>('leads', { where, orderBy: { archivedAt: 'desc' } });
      setLeads(data || []);
    } catch (error: any) {
      toast.error('بارگذاری آرشیو ناموفق: ' + error.message);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  const handleRestore = async (lead: Lead) => {
    try {
      await updateData('leads', { id: lead.id }, { isArchived: false, archivedAt: null });
      toast.success('سرنخ از آرشیو بازگردانده شد');
      loadLeads();
    } catch (error: any) { toast.error('بازگردانی ناموفق: ' + error.message); }
  };

  const handleDelete = async (lead: Lead) => {
    if (!confirm(`سرنخ «${lead.name}» برای همیشه حذف شود؟`)) return;
    try { await deleteData('leads', { id: lead.id }); toast.success('سرنخ حذف شد'); loadLeads(); }
    catch (error: any) { toast.error('حذف ناموفق: ' + error.message); }
  };

  const daysUntilDelete = (archivedAt: string | null) => {
    if (!archivedAt) return AUTO_DELETE_DAYS;
    const archived = new Date(archivedAt).getTime();
    const deleteDate = archived + AUTO_DELETE_DAYS * 86400000;
    const remaining = Math.ceil((deleteDate - Date.now()) / 86400000);
    return Math.max(0, remaining);
  };

  return (
    <div className="leads-page" dir="rtl">
      <header className="leads-header">
        <div className="leads-heading">
          <div className="leads-title-row">
            <span className="leads-title-accent" />
            <h1>آرشیو سرنخ‌ها</h1>
          </div>
          <p>سرنخ‌های آرشیو شده — پس از ۳۰ روز به‌طور خودکار حذف می‌شوند</p>
        </div>
        <Link href="/dashboard/leads" className="leads-new-button">
          <ArrowRight className="h-4 w-4" />
          بازگشت به سرنخ‌ها
        </Link>
      </header>

      <div className="leads-toolbar">
        <div className="leads-search-wrap">
          <input
            type="text"
            placeholder="جستجوی سرنخ آرشیو شده..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="leads-layout">
        <main className="leads-content">
          {loading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
            </div>
          ) : leads.length === 0 ? (
            <div className="leads-empty">
              <Archive className="h-10 w-10" />
              <strong>سرنخ آرشیو شده‌ای یافت نشد</strong>
              <span>سرنخ‌های آرشیو شده در اینجا نمایش داده می‌شوند</span>
              <Link href="/dashboard/leads" className="leads-empty-button">
                <ArrowRight className="h-4 w-4" /> بازگشت به سرنخ‌ها
              </Link>
            </div>
          ) : (
            <div className="leads-grid">
              {leads.map((lead) => {
                const st = statusInfo(lead.status);
                const remaining = daysUntilDelete(lead.archivedAt);
                const isUrgent = remaining <= 3;
                return (
                  <article key={lead.id} className="lead-card" style={{ opacity: 0.85 }}>
                    <div className="lead-card-top-bar" style={{ backgroundColor: '#94A3B8' }} />
                    <div className="lead-card-header">
                      <div className="lead-card-avatar-lg" style={{ backgroundColor: '#94A3B820', color: '#94A3B8', borderColor: '#94A3B840' }}>
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
                      <span className="lead-card-source">{lead.source || '—'}</span>
                    </div>

                    <div className="rounded-lg px-3 py-2 text-xs flex items-center gap-2" style={{
                      backgroundColor: isUrgent ? '#FEF2F2' : '#F1F5F9',
                      color: isUrgent ? '#EF4444' : '#64748B',
                    }}>
                      {isUrgent ? <AlertTriangle className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                      <span>
                        {remaining > 0
                          ? `${remaining.toLocaleString('fa-IR')} روز تا حذف خودکار`
                          : 'در انتظار حذف خودکار'}
                      </span>
                    </div>

                    {lead.notes && (
                      <div className="lead-card-notes">
                        <span className="lead-card-notes-label">یادداشت:</span>
                        <p className="lead-card-notes-text">{lead.notes}</p>
                      </div>
                    )}

                    <div className="lead-progress-wrap">
                      <span className="lead-progress-time">
                        آرشیو شده: {lead.archivedAt ? relativeTime(lead.archivedAt) : '—'}
                      </span>
                    </div>

                    <div className="lead-card-actions">
                      <Link href={`/dashboard/leads/${lead.id}/edit`} className="lead-action-btn lead-action-view" title="مشاهده">
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button className="lead-action-btn lead-action-edit" onClick={() => handleRestore(lead)} title="بازگردانی از آرشیو">
                        <ArchiveRestore className="h-4 w-4" />
                      </button>
                      {isSuperAdmin && (
                        <button className="lead-action-btn lead-action-delete" onClick={() => handleDelete(lead)} title="حذف دائمی">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
