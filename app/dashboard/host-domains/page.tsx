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

export default function HostDomainsPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<HostDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sendingSms, setSendingSms] = useState<string | null>(null);

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

  const filtered = items.filter((item) => {
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

  const getHostTypeLabel = (key: string) => HOST_TYPES.find((t) => t.key === key)?.label || key;

  return (
    <div className="create-task-page" dir="rtl">
      <div className="create-task-container">
        <header className="create-task-header">
          <div>
            <div className="create-task-title">
              <span className="title-accent-bar" />
              <h1>ثبت هاست و دامنه</h1>
            </div>
            <div className="create-task-breadcrumb">
              داشبورد <b>←</b> هاست و دامنه
            </div>
          </div>
          <Link href="/dashboard/host-domains/new" className="submit-btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Plus className="h-4 w-4" />
            ثبت هاست/دامنه جدید
          </Link>
        </header>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="جستجو با شماره مشتری، نام، دامنه یا موبایل..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] bg-white py-2.5 pr-10 pl-4 text-sm text-slate-700 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setTypeFilter('all')}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${typeFilter === 'all' ? 'bg-[#2563EB] text-white' : 'bg-white border border-[#E2E8F0] text-slate-600 hover:border-[#94A3B8]'}`}
            >
              همه
            </button>
            {HOST_TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setTypeFilter(t.key)}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${typeFilter === t.key ? 'bg-[#2563EB] text-white' : 'bg-white border border-[#E2E8F0] text-slate-600 hover:border-[#94A3B8]'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Server className="h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-500 mb-1">هیچ هاست/دامنه‌ای ثبت نشده است</p>
            <p className="text-sm text-slate-400">برای ثبت جدید روی دکمه بالا کلیک کنید</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((item) => {
              const expStatus = getExpiryStatus(item.expiryDate);
              const ExpIcon = expStatus.icon;
              const isExpired = daysUntilExpiry(item.expiryDate) < 0;
              return (
                <div key={item.id} className="rounded-xl border border-[#E2E8F0] bg-white p-4 transition-all hover:shadow-md">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-800">
                          {item.hostType === 'domain' ? <Globe className="h-4 w-4 text-slate-400" /> : <Server className="h-4 w-4 text-slate-400" />}
                          {fullName(item.firstName, item.lastName)}
                        </span>
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                          style={{ color: expStatus.color, backgroundColor: expStatus.bg }}
                        >
                          <ExpIcon className="h-3 w-3" />
                          {expStatus.label}
                        </span>
                        {item.smsSent && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" />
                            پیامک ارسال شد
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                        <span>مشتری: {item.customerNumber}</span>
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {item.phoneNumber}
                        </span>
                        {item.domainName && <span>دامنه: {item.domainName}</span>}
                        <span>نوع: {getHostTypeLabel(item.hostType)}</span>
                        <span>شروع: {formatJalali(item.startDate)}</span>
                        <span>انقضا: {formatJalali(item.expiryDate)}</span>
                      </div>
                      {item.notes && (
                        <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          {item.notes}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {!item.smsSent && !isExpired && (
                        <button
                          onClick={() => handleSendSms(item.id)}
                          disabled={sendingSms === item.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-[#1d4ED8] disabled:opacity-50"
                        >
                          {sendingSms === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          ارسال پیامک تمدید
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-medium text-red-500 transition-all hover:border-red-300 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
