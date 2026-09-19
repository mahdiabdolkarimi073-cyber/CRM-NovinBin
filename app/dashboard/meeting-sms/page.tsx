'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Send, Loader2, Search, Calendar, Phone, CheckCircle2, XCircle,
  MessageSquare, RefreshCw, ArrowRight, Clock, UserRound,
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

  return (
    <div className="mx-auto max-w-7xl p-3 mobile:p-4 tablet:p-6" dir="rtl">
      {/* Header */}
      <header className="mb-4 flex flex-col gap-3 tablet:flex-row tablet:items-center tablet:justify-between tablet:mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-7 w-1.5 rounded-full bg-sky-500" />
            <h1 className="text-xl font-bold text-slate-900 mobile:text-2xl">پنل پیامک جلسات</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">ارسال و مدیریت پیامک یادآوری جلسات</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/meetings" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs mobile:text-sm font-medium text-slate-600 transition hover:bg-slate-50">
            <ArrowRight className="h-4 w-4" />
            بازگشت به جلسات
          </Link>
        </div>
      </header>

      {/* Info banner */}
      <div className="mb-4 rounded-xl border border-sky-100 bg-sky-50 p-4 tablet:mb-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="text-sm">
            <p className="font-medium text-sky-900">ارسال خودکار پیامک</p>
            <p className="mt-0.5 text-sky-700">
              پیامک یادآوری جلسات به‌صورت خودکار و مستقل از مرورگر، هر ساعت توسط سرور بررسی و ارسال می‌شود.
              همچنین می‌توانید از این پنل به‌صورت دستی برای هر جلسه پیامک ارسال کنید.
            </p>
          </div>
        </div>
      </div>

      {/* Actions bar */}
      <div className="mb-4 flex flex-wrap gap-2 tablet:mb-5">
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

      {/* Filters bar */}
      <div className="mb-4 tablet:mb-5 flex flex-col gap-2 tablet:flex-wrap tablet:items-center tablet:gap-2 rounded-xl border border-slate-200 bg-white p-2 tablet:p-3">
        <div className="relative flex-1 min-w-0 tablet:min-w-[200px]">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو در جلسات..."
            className="pr-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full tablet:w-[160px]">
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
          <SelectTrigger className="w-full tablet:w-[160px]">
            <SelectValue placeholder="وضعیت پیامک" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه پیامک‌ها</SelectItem>
            <SelectItem value="sent">ارسال شده</SelectItem>
            <SelectItem value="not_sent">ارسال نشده</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="mb-4 grid grid-cols-3 gap-2 mobile:gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">کل جلسات</span>
            <Calendar className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-1 text-xl font-bold text-slate-900">
            {filtered.length.toLocaleString('fa-IR')}
          </div>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-600">پیامک ارسال شده</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-1 text-xl font-bold text-emerald-700">
            {filtered.filter((m) => m.smsSent).length.toLocaleString('fa-IR')}
          </div>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-600">ارسال نشده</span>
            <XCircle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-1 text-xl font-bold text-amber-700">
            {filtered.filter((m) => !m.smsSent).length.toLocaleString('fa-IR')}
          </div>
        </div>
      </div>

      {/* Meeting list */}
      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16">
          <Calendar className="h-10 w-10 text-slate-300" />
          <strong className="mt-3 text-slate-700">جلسه‌ای یافت نشد</strong>
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
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-sm"
              >
                <div className="flex flex-col gap-3 tablet:flex-row tablet:items-start tablet:justify-between">
                  {/* Left: meeting info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {m.contact_name || m.title}
                      </h3>
                      <span
                        className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ background: `${st.color}15`, color: st.color }}
                      >
                        {st.label}
                      </span>
                      {m.smsSent ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" /> پیامک ارسال شد
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                          <XCircle className="h-3 w-3" /> پیامک ارسال نشده
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>{formatJalaliDateTime(m.date)}</span>
                      </div>
                      {m.assigned_to_name && (
                        <div className="flex items-center gap-1.5">
                          <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span>مسئول: <strong className="font-medium text-slate-600">{m.assigned_to_name}</strong></span>
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        {m.staffPhone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="text-slate-600" dir="ltr">پرسنل: {m.staffPhone}</span>
                          </div>
                        )}
                        {m.customerPhone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="text-slate-600" dir="ltr">مشتری: {m.customerPhone}</span>
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
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={() => sendSingleSms(m.id)}
                      disabled={isSending || !hasPhone}
                      size="sm"
                      className="gap-1.5 bg-sky-500 hover:bg-sky-600"
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      {m.smsSent ? 'ارسال مجدد' : 'ارسال پیامک'}
                    </Button>
                    {isSuperAdmin && m.smsSent && (
                      <Button
                        onClick={() => resetSmsStatus(m)}
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
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
