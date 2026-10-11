'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Send, Loader2, Search, Calendar, Phone, CheckCircle2, XCircle,
  MessageSquare, RefreshCw, ArrowRight, Clock, UserRound, X,
} from 'lucide-react';
import { formatJalaliDateTime } from '@/lib/format';
import { MEETING_STATUSES, fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type { Meeting, Profile } from '@/lib/types';

interface MeetingWithAssignment extends Meeting {
  assigned_to_name?: string;
  contact_name?: string;
  assigned_to_id?: string;
}

const statusInfo = (key: string) => MEETING_STATUSES.find((s) => s.key === key) || MEETING_STATUSES[0];

export default function MeetingSmsPanelPage() {
  const { profile } = useAuth();
  const [meetings, setMeetings] = useState<MeetingWithAssignment[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSms, setFilterSms] = useState('all');
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [bulkSending, setBulkSending] = useState(false);
  const [checking, setChecking] = useState(false);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';
  const isAdmin = profile?.role === 'admin';

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [mtgs, assigns, pers] = await Promise.all([
        fetchData('meetings', { where: {}, orderBy: { date: 'desc' } }),
        fetchData('meeting_assignments', { where: {} }),
        fetchData('profiles', {
          where: {
            userType: 'staff',
            role: { in: ['personnel', 'admin', 'super_admin', 'owner'] },
            active: true,
          },
          orderBy: { firstName: 'asc' },
        }),
      ]);

      const assignMap: Record<string, any> = {};
      (assigns || []).forEach((a: any) => { assignMap[a.meetingId] = a; });

      const profileMap: Record<string, string> = {};
      (pers as Profile[] || []).forEach((p) => {
        profileMap[p.id] = `${p.firstName || ''} ${p.lastName || ''}`.trim();
      });

      let meetingsWithAssign: MeetingWithAssignment[] = (mtgs as Meeting[] || []).map((m) => {
        const a = assignMap[m.id];
        return {
          ...m,
          assigned_to_name: a ? profileMap[a.assignedTo] || '—' : undefined,
          contact_name: a?.contactName || undefined,
          assigned_to_id: a?.assignedTo || undefined,
        };
      });

      if (!isSuperAdmin && !isAdmin) {
        meetingsWithAssign = meetingsWithAssign.filter(
          (m) => m.assigned_to_id === profile.id || m.mainResponsibleId === profile.id
        );
      }

      setMeetings(meetingsWithAssign);
      setStaff(pers as Profile[] || []);
    } catch (error: any) {
      toast.error('بارگذاری ناموفق: ' + error.message);
    }
    setLoading(false);
  }, [profile, isSuperAdmin, isAdmin]);

  useEffect(() => { load(); }, [load]);

  const filtered = meetings.filter((m) => {
    const q = search.trim().toLocaleLowerCase();
    const title = (m.contact_name || m.title || '').toLocaleLowerCase();
    const matchesQuery = !q || title.includes(q);
    const matchesStatus = filterStatus === 'all' || m.status === filterStatus;
    const matchesSms = filterSms === 'all'
      || (filterSms === 'sent' && m.smsSent)
      || (filterSms === 'not_sent' && !m.smsSent);
    return matchesQuery && matchesStatus && matchesSms;
  });

  const sendSingleSms = async (meetingId: string) => {
    setSendingIds((prev) => new Set(prev).add(meetingId));
    try {
      const res = await fetch('/api/meetings/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ meetingId }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error('ارسال پیامک ناموفق: ' + (json.error || 'خطا'));
      } else {
        if (json.success) {
          toast.success('پیامک جلسه ارسال شد');
        } else {
          toast.error('ارسال پیامک ناموفق بود: ' + (json.details?.join('، ') || 'خطا'));
        }
        load();
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    }
    setSendingIds((prev) => {
      const next = new Set(prev);
      next.delete(meetingId);
      return next;
    });
  };

  const sendBulkSms = async () => {
    const eligible = filtered.filter((m) => !m.smsSent && (m.staffPhone || m.customerPhone));
    if (eligible.length === 0) {
      toast.error('جلسه‌ای برای ارسال پیامک وجود ندارد');
      return;
    }
    if (!confirm(`ارسال پیامک برای ${eligible.length} جلسه؟`)) return;

    setBulkSending(true);
    let successCount = 0;
    let failCount = 0;

    for (const m of eligible) {
      try {
        const res = await fetch('/api/meetings/send-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ meetingId: m.id }),
        });
        const json = await res.json();
        if (json.success) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    toast.success(`${successCount} پیامک موفق، ${failCount} ناموفق`);
    setBulkSending(false);
    load();
  };

  const triggerAutoCheck = async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/meetings/check-sms', { method: 'POST' });
      const json = await res.json();
      toast.success(`بررسی انجام شد: ${json.checked || 0} جلسه بررسی شد`);
      load();
    } catch {
      toast.error('بررسی خودکار ناموفق بود');
    }
    setChecking(false);
  };

  const resetSmsStatus = async (m: MeetingWithAssignment) => {
    if (!confirm(`بازنشانی وضعیت پیامک جلسه «${m.contact_name || m.title}»؟`)) return;
    try {
      await updateData('meetings', { id: m.id }, { smsSent: false, smsSentAt: null });
      toast.success('وضعیت پیامک بازنشانی شد');
      load();
    } catch (e: any) {
      toast.error('بازنشانی ناموفق: ' + e.message);
    }
  };

  const stats = [
    {
      label: 'کل جلسات', value: filtered.length, icon: Calendar,
      gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
      glow: 'rgba(37,99,235,0.25)',
    },
    {
      label: 'پیامک ارسال شده', value: filtered.filter((m) => m.smsSent).length, icon: CheckCircle2,
      gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      glow: 'rgba(34,197,94,0.25)',
    },
    {
      label: 'ارسال نشده', value: filtered.filter((m) => !m.smsSent).length, icon: XCircle,
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      glow: 'rgba(245,158,11,0.25)',
    },
    {
      label: 'بدون شماره', value: filtered.filter((m) => !m.staffPhone && !m.customerPhone).length, icon: Phone,
      gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      glow: 'rgba(239,68,68,0.25)',
    },
  ];

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری...</p>
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
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#0EA5E9,#0284C7)', boxShadow: '0 0 12px rgba(14,165,233,.25)' }} />
              <h1>پنل پیامک جلسات</h1>
            </div>
            <p>ارسال و مدیریت پیامک یادآوری جلسات</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/meetings" className="nb-editor-quick-btn">
            <ArrowRight className="h-4 w-4" />
            بازگشت به جلسات
          </Link>
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        {stats.map((stat) => (
          <div
            className="nb-stat-card-v2"
            key={stat.label}
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
          </div>
        ))}
      </section>

      <div className="mb-4 rounded-xl border border-sky-100 bg-sky-50 p-4 dark:border-sky-900/30 dark:bg-sky-900/10">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="text-sm">
            <p className="font-medium text-sky-900 dark:text-sky-300">ارسال خودکار پیامک</p>
            <p className="mt-0.5 text-sky-700 dark:text-sky-400">
              پیامک یادآوری جلسات به‌صورت خودکار و مستقل از مرورگر، هر ساعت توسط سرور بررسی و ارسال می‌شود.
              همچنین می‌توانید از این پنل به‌صورت دستی برای هر جلسه پیامک ارسال کنید.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          onClick={triggerAutoCheck}
          disabled={checking}
          variant="outline"
          size="sm"
          className="gap-1.5"
        >
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          بررسی خودکار
        </Button>
        <Button
          onClick={sendBulkSms}
          disabled={bulkSending || loading}
          size="sm"
          className="gap-1.5 bg-sky-500 hover:bg-sky-600"
        >
          {bulkSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          ارسال گروهی پیامک‌های ارسال‌نشده
        </Button>
      </div>

      <div className="nb-toolbar">
        <div className="nb-toolbar-left">
          <h2>جلسات</h2>
          <span className="nb-count-badge">{filtered.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در جلسات..."
            />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="nb-select-filter h-10 w-[150px]">
              <SelectValue placeholder="وضعیت جلسه" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              {MEETING_STATUSES.map((s) => (
                <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterSms} onValueChange={setFilterSms}>
            <SelectTrigger className="nb-select-filter h-10 w-[150px]">
              <SelectValue placeholder="وضعیت پیامک" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه پیامک‌ها</SelectItem>
              <SelectItem value="sent">ارسال شده</SelectItem>
              <SelectItem value="not_sent">ارسال نشده</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><Calendar className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>جلسه‌ای یافت نشد</h3>
          <p>جلسه‌ای برای ارسال پیامک وجود ندارد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => {
            const st = statusInfo(m.status);
            const isSending = sendingIds.has(m.id);
            const hasPhone = !!(m.staffPhone || m.customerPhone);

            return (
              <div
                key={m.id}
                className="nb-card"
                style={{ borderBottomColor: m.smsSent ? '#22C55E' : '#f59e0b', borderBottomWidth: 3 }}
              >
                <div className="nb-card-top">
                  <div className="nb-card-tags">
                    <span className="nb-card-tag" style={{ background: `${st.color}15`, color: st.color }}>
                      {st.label}
                    </span>
                    {m.smsSent ? (
                      <span className="nb-card-tag" style={{ background: 'rgba(34,197,94,.12)', color: '#22C55E' }}>
                        <CheckCircle2 className="h-2.5 w-2.5" /> ارسال شد
                      </span>
                    ) : (
                      <span className="nb-card-tag" style={{ background: 'rgba(245,158,11,.12)', color: '#f59e0b' }}>
                        <XCircle className="h-2.5 w-2.5" /> ارسال نشده
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="nb-card-title">{m.contact_name || m.title}</h3>

                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>{formatJalaliDateTime(m.date)}</span>
                  </div>
                  {m.assigned_to_name && (
                    <div className="flex items-center gap-1.5">
                      <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span>مسئول: <strong className="font-medium text-slate-600 dark:text-slate-300">{m.assigned_to_name}</strong></span>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    {m.staffPhone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="text-slate-600 dark:text-slate-300" dir="ltr">پرسنل: {m.staffPhone}</span>
                      </div>
                    )}
                    {m.customerPhone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="text-slate-600 dark:text-slate-300" dir="ltr">مشتری: {m.customerPhone}</span>
                      </div>
                    )}
                    {!hasPhone && (
                      <span className="text-slate-400">شماره تلفنی ثبت نشده</span>
                    )}
                  </div>
                  {m.smsSent && m.smsSentAt && (
                    <div className="text-[11px] text-emerald-500">
                      زمان ارسال: {formatJalaliDateTime(m.smsSentAt)}
                    </div>
                  )}
                </div>

                <div className="nb-card-footer">
                  <div className="nb-card-quick">
                    <Button
                      onClick={() => sendSingleSms(m.id)}
                      disabled={isSending || !hasPhone}
                      size="sm"
                      className="gap-1.5 bg-sky-500 hover:bg-sky-600 h-8"
                    >
                      {isSending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      {m.smsSent ? 'ارسال مجدد' : 'ارسال پیامک'}
                    </Button>
                    {isSuperAdmin && m.smsSent && (
                      <Button
                        onClick={() => resetSmsStatus(m)}
                        variant="outline"
                        size="sm"
                        className="gap-1.5 h-8"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        بازنشانی
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
