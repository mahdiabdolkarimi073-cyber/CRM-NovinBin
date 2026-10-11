'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import {
  Archive, Trash2, Eye, ArchiveRestore, ArrowRight, Loader2, AlertTriangle,
  Search, X, TrendingUp, Phone, MapPin, Clock,
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
    <div className="nb-page" dir="rtl">
      <header className="nb-hero">
        <div className="nb-hero-left">
          <div>
            <div className="nb-hero-title-row">
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#64748B,#475569)', boxShadow: '0 0 12px rgba(100,116,139,.25)' }} />
              <h1>آرشیو سرنخ‌ها</h1>
            </div>
            <p>سرنخ‌های آرشیو شده — پس از ۳۰ روز به‌طور خودکار حذف می‌شوند</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/leads" className="nb-editor-quick-btn">
            <ArrowRight className="h-4 w-4" />
            بازگشت به سرنخ‌ها
          </Link>
        </div>
      </header>

      {/* Toolbar */}
      <div className="nb-toolbar">
        <div className="nb-toolbar-left">
          <h2>سرنخ‌های آرشیو شده</h2>
          <span className="nb-count-badge">{leads.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در آرشیو..."
            />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon">
            <Archive className="h-12 w-12 text-muted-foreground/30" />
          </div>
          <h3>سرنخ آرشیو شده‌ای یافت نشد</h3>
          <p>سرنخ‌های آرشیو شده در اینجا نمایش داده می‌شوند</p>
          <Link href="/dashboard/leads" className="nb-empty-new-btn">
            <ArrowRight className="h-4 w-4" />
            بازگشت به سرنخ‌ها
          </Link>
        </div>
      ) : (
        <div className="nb-grid nb-grid-grid">
          {leads.map((lead) => {
            const st = statusInfo(lead.status);
            const remaining = daysUntilDelete(lead.archivedAt);
            const isUrgent = remaining <= 3;
            return (
              <article
                key={lead.id}
                className="nb-card"
                style={{ opacity: 0.85, borderBottomColor: '#94A3B8', borderBottomWidth: 3 }}
              >
                <div className="nb-card-top">
                  <div className="nb-card-tags">
                    <span className="nb-card-tag" style={{ background: `${st.color}15`, color: st.color }}>
                      {st.label}
                    </span>
                    <span className="nb-card-tag" style={{ background: 'rgba(100,116,139,.1)', color: '#64748B' }}>
                      <Archive className="h-2.5 w-2.5" /> آرشیو
                    </span>
                  </div>
                </div>

                <h3 className="nb-card-title">{lead.name}</h3>
                {lead.company && <p className="nb-card-excerpt" style={{ WebkitLineClamp: 1 }}>{lead.company}</p>}

                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                  {lead.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span dir="ltr">{isSuperAdmin ? lead.phone : '۰۹** *** ****'}</span>
                    </div>
                  )}
                  {lead.city && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span>{lead.city}</span>
                    </div>
                  )}
                </div>

                {/* Auto-delete countdown */}
                <div className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs" style={{
                  backgroundColor: isUrgent ? 'rgba(239,68,68,.06)' : 'rgba(241,245,249,.6)',
                  color: isUrgent ? '#EF4444' : '#64748B',
                }}>
                  {isUrgent ? <AlertTriangle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                  <span>
                    {remaining > 0
                      ? `${remaining.toLocaleString('fa-IR')} روز تا حذف خودکار`
                      : 'در انتظار حذف خودکار'}
                  </span>
                </div>

                {lead.notes && (
                  <div className="mt-2 rounded-lg bg-slate-50/50 p-2 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
                    <p className="line-clamp-2">{lead.notes}</p>
                  </div>
                )}

                <div className="nb-card-footer">
                  <div className="nb-card-date">
                    <Clock className="h-3 w-3" />
                    {lead.archivedAt ? relativeTime(lead.archivedAt) : '—'}
                  </div>
                  <div className="nb-card-quick">
                    <Link href={`/dashboard/leads/${lead.id}`} className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700" title="مشاهده">
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                    <button onClick={() => handleRestore(lead)} title="بازگردانی از آرشیو" className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600">
                      <ArchiveRestore className="h-3.5 w-3.5" />
                    </button>
                    {isSuperAdmin && (
                      <button onClick={() => handleDelete(lead)} title="حذف دائمی" className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
