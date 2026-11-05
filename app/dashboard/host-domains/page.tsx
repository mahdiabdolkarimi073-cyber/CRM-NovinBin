'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchData, deleteData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { HOST_TYPES, fullName } from '@/lib/constants';
import { formatJalaliDateTime, formatJalali } from '@/lib/format';
import { toast } from 'sonner';
import {
  Plus, Trash2, Loader2, Search, Server, Globe, Clock,
  CheckCircle2, XCircle, Send, AlertTriangle, Phone,
  RefreshCw, CalendarX, Mail,
} from 'lucide-react';
import type { HostDomain } from '@/lib/types';

function daysUntilExpiry(expiry: string): number {
  const now = new Date();
  const exp = new Date(expiry);
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getExpiryStatus(expiry: string): { label: string; color: string; bg: string; icon: any } {
  const days = daysUntilExpiry(expiry);
  if (days < 0) return { label: 'منقضی شده', color: '#EF4444', bg: '#FEE2E2', icon: XCircle };
  if (days <= 7) return { label: `${days.toLocaleString('fa-IR')} روز تا انقضا`, color: '#F59E0B', bg: '#FEF3C7', icon: AlertTriangle };
  if (days <= 30) return { label: `${days.toLocaleString('fa-IR')} روز تا انقضا`, color: '#3B82F6', bg: '#DBEAFE', icon: Clock };
  return { label: `${days.toLocaleString('fa-IR')} روز تا انقضا`, color: '#22C55E', bg: '#DCFCE7', icon: CheckCircle2 };
}

type TabKey = 'all' | 'expiring' | 'expired';

export default function HostDomainsPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<HostDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sendingSms, setSendingSms] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const load = useCallback(async () => {
    try {
      const data = await fetchData<HostDomain>('host_domains', {
        orderBy: { expiryDate: 'asc' },
      });
      setItems(data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const expiringSoon = items.filter((item) => {
    const days = daysUntilExpiry(item.expiryDate);
    return days >= 0 && days <= 7;
  });
  const expiredItems = items.filter((item) => daysUntilExpiry(item.expiryDate) < 0);

  const tabFiltered = items.filter((item) => {
    if (activeTab === 'expiring') return daysUntilExpiry(item.expiryDate) >= 0 && daysUntilExpiry(item.expiryDate) <= 7;
    if (activeTab === 'expired') return daysUntilExpiry(item.expiryDate) < 0;
    return true;
  });

  const filtered = tabFiltered.filter((item) => {
    const q = search.toLowerCase();
    const matchesSearch = !search ||
      item.customerNumber.includes(search) ||
      item.firstName.toLowerCase().includes(q) ||
      item.lastName.toLowerCase().includes(q) ||
      (item.domainName || '').toLowerCase().includes(q) ||
      item.phoneNumber.includes(search);
    const matchesType = typeFilter === 'all' || item.hostType === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این هاست/دامنه مطمئن هستید؟')) return;
    try {
      await deleteData('host_domains', { id });
      setItems((prev) => prev.filter((x) => x.id !== id));
      toast.success('هاست/دامنه حذف شد');
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const handleSendSms = async (id: string) => {
    setSendingSms(id);
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_reminder', hostDomainId: id }),
      });
      const json = await res.json();
      if (json.success) {
        setItems((prev) => prev.map((x) => x.id === id ? { ...x, smsSent: true, smsSentAt: new Date().toISOString() } : x));
        toast.success('پیامک تمدید ارسال شد');
      } else {
        toast.error('ارسال پیامک ناموفق: ' + (json.response || json.error || ''));
      }
    } catch (error: any) {
      toast.error('خطا در ارسال پیامک: ' + error.message);
    } finally {
      setSendingSms(null);
    }
  };

  const handleRenew = async (id: string, currentExpiry: string) => {
    const newExpiry = prompt('تاریخ انقضای جدید را به میلادی وارد کنید (YYYY-MM-DD):');
    if (!newExpiry) return;
    const parsed = new Date(newExpiry);
    if (isNaN(parsed.getTime())) {
      toast.error('تاریخ نامعتبر است');
      return;
    }
    try {
      await updateData('host_domains', { id }, {
        expiryDate: parsed.toISOString(),
        smsSent: false,
        smsSentAt: null,
      });
      setItems((prev) => prev.map((x) => x.id === id ? { ...x, expiryDate: parsed.toISOString(), smsSent: false, smsSentAt: null } : x));
      toast.success('هاست/دامنه تمدید شد');
    } catch (error: any) {
      toast.error('تمدید ناموفق: ' + error.message);
    }
  };

  const getHostTypeLabel = (key: string) => HOST_TYPES.find((t) => t.key === key)?.label || key;

  const tabs: { key: TabKey; label: string; count: number; icon: any; color: string }[] = [
    { key: 'all', label: 'همه', count: items.length, icon: Server, color: '#2563EB' },
    { key: 'expiring', label: 'در حال انقضا', count: expiringSoon.length, icon: AlertTriangle, color: '#F59E0B' },
    { key: 'expired', label: 'منقضی شده', count: expiredItems.length, icon: CalendarX, color: '#EF4444' },
  ];

  return (
    <div className="nb-page" dir="rtl">
      <header className="nb-hero">
        <div className="nb-hero-left">
          <div>
            <div className="nb-hero-title-row">
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#6366F1,#4F46E5)', boxShadow: '0 0 12px rgba(99,102,241,.25)' }} />
              <h1>هاست و دامنه</h1>
            </div>
            <p>مدیریت هاست‌ها و دامنه‌های ثبت شده</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/host-domains/new" className="nb-new-btn"><Plus className="h-[18px] w-[18px]" /> ثبت هاست/دامنه</Link>
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(37,99,235,0.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)' }}><Server className="h-[22px] w-[22px] text-white" /></div>
          <div className="nb-stat-v2-body"><strong>{items.length.toLocaleString('fa-IR')}</strong><span>کل هاست/دامنه</span></div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)' }} />
        </div>
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(245,158,11,0.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}><AlertTriangle className="h-[22px] w-[22px] text-white" /></div>
          <div className="nb-stat-v2-body"><strong>{expiringSoon.length.toLocaleString('fa-IR')}</strong><span>در حال انقضا</span></div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }} />
        </div>
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(239,68,68,0.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}><CalendarX className="h-[22px] w-[22px] text-white" /></div>
          <div className="nb-stat-v2-body"><strong>{expiredItems.length.toLocaleString('fa-IR')}</strong><span>منقضی شده</span></div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }} />
        </div>
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(34,197,94,0.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)' }}><CheckCircle2 className="h-[22px] w-[22px] text-white" /></div>
          <div className="nb-stat-v2-body"><strong>{items.filter(i => daysUntilExpiry(i.expiryDate) > 7).length.toLocaleString('fa-IR')}</strong><span>فعال</span></div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)' }} />
        </div>
      </section>

      <div className="nb-toolbar">
        <div className="nb-toolbar-left">
          <h2>همه هاست/دامنه</h2>
          <span className="nb-count-badge">{filtered.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو با شماره، نام، دامنه..." />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><Server className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>{activeTab === 'expiring' ? 'هیچ موردی در حال انقضا نیست' : activeTab === 'expired' ? 'هیچ موردی منقضی نشده است' : 'هاست/دامنه‌ای ثبت نشده'}</h3>
          <p>برای ثبت جدید روی دکمه بالا کلیک کنید</p>
          <Link href="/dashboard/host-domains/new" className="nb-empty-new-btn"><Plus className="h-4 w-4" /> ثبت هاست/دامنه</Link>
        </div>
      ) : (
        <div className="nb-grid nb-grid-grid">
            {filtered.map((item) => {
              const expStatus = getExpiryStatus(item.expiryDate);
              const ExpIcon = expStatus.icon;
              const isExpired = daysUntilExpiry(item.expiryDate) < 0;
              const isExpiringSoon = !isExpired && daysUntilExpiry(item.expiryDate) <= 7;
              return (
                <article key={item.id} className="nb-card" style={{ borderBottomColor: expStatus.color, borderBottomWidth: 3 }}>
                  <div className="nb-card-top">
                    <div className="nb-card-tags">
                      <span className="nb-card-tag" style={{ background: expStatus.bg, color: expStatus.color }}><ExpIcon className="h-2.5 w-2.5" /> {expStatus.label}</span>
                      {item.smsSent && <span className="nb-card-tag" style={{ background: '#DCFCE7', color: '#22C55E' }}><CheckCircle2 className="h-2.5 w-2.5" /> پیامک ارسال شد</span>}
                    </div>
                  </div>
                  <h3 className="nb-card-title">{item.hostType === 'domain' ? <Globe className="h-4 w-4 text-slate-400" /> : <Server className="h-4 w-4 text-slate-400" />} {fullName(item.firstName, item.lastName)}</h3>
                  <p className="nb-card-excerpt">{item.domainName || 'بدون دامنه'} • {getHostTypeLabel(item.hostType)}</p>
                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span dir="ltr">{item.phoneNumber}</span></div>
                    <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span>انقضا: {formatJalali(item.expiryDate)}</span></div>
                  </div>
                  {item.notes && <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{item.notes}</div>}
                  <div className="nb-card-footer">
                    <div className="nb-card-date"><Clock className="h-3 w-3" />{formatJalali(item.startDate)}</div>
                    <div className="nb-card-quick">
                      {(!item.smsSent || isExpired) && !isExpired && (
                        <button onClick={() => handleSendSms(item.id)} disabled={sendingSms === item.id} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50">
                          {sendingSms === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} پیامک
                        </button>
                      )}
                      {isExpiringSoon && item.smsSent && (
                        <button onClick={() => handleSendSms(item.id)} disabled={sendingSms === item.id} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 disabled:opacity-50" title="ارسال مجدد">
                          {sendingSms === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      <button onClick={() => handleRenew(item.id, item.expiryDate)} className="rounded p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600" title="تمدید"><RefreshCw className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDelete(item.id)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500" title="حذف"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

      <Link href="/dashboard/host-domains/new" className="nb-fab" aria-label="ثبت هاست/دامنه"><Plus className="h-6 w-6" /></Link>
    </div>
  );
}
