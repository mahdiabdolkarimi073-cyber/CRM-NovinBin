'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { fetchData, createData, deleteData } from '@/lib/data-client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Phone, Mail, Calendar, MessageSquare, StickyNote, MapPin, Plus, Search,
  ArrowUpRight, ArrowDownLeft, Clock, CalendarClock, Users, ListChecks,
  ChevronLeft, X, Loader2,
} from 'lucide-react';
import { formatJalali, formatJalaliDateTime, relativeTime, toLocalDateString } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format as jalaliFormat } from 'date-fns-jalali';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import type { Customer } from '@/lib/types';

type InteractionType = 'call' | 'email' | 'meeting' | 'sms' | 'note' | 'visit';
type Outcome = 'positive' | 'negative' | 'neutral' | 'follow_up';
type Direction = 'inbound' | 'outbound';

const TYPE_META: Record<InteractionType, {
  label: string;
  icon: typeof Phone;
  color: string;
  bg: string;
  ring: string;
}> = {
  call:    { label: 'تماس',      icon: Phone,         color: 'text-blue-600',    bg: 'bg-blue-50',    ring: 'ring-blue-200' },
  email:   { label: 'ایمیل',     icon: Mail,          color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200' },
  meeting: { label: 'جلسه',      icon: Calendar,      color: 'text-amber-600',   bg: 'bg-amber-50',   ring: 'ring-amber-200' },
  sms:     { label: 'پیامک',     icon: MessageSquare, color: 'text-sky-600',     bg: 'bg-sky-50',     ring: 'ring-sky-200' },
  note:    { label: 'یادداشت',   icon: StickyNote,    color: 'text-slate-600',   bg: 'bg-slate-100',  ring: 'ring-slate-200' },
  visit:   { label: 'دیدار',     icon: MapPin,        color: 'text-rose-600',    bg: 'bg-rose-50',    ring: 'ring-rose-200' },
};

const OUTCOME_META: Record<Outcome, { label: string; className: string }> = {
  positive:  { label: 'مثبت',     className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' },
  negative:  { label: 'منفی',     className: 'bg-rose-100 text-rose-700 hover:bg-rose-100' },
  neutral:   { label: 'خنثی',     className: 'bg-slate-100 text-slate-600 hover:bg-slate-100' },
  follow_up: { label: 'پیگیری',   className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
};

const DIRECTION_META: Record<Direction, { label: string; icon: typeof ArrowUpRight; className: string }> = {
  inbound:  { label: 'ورودی',  icon: ArrowDownLeft,  className: 'text-emerald-600 bg-emerald-50' },
  outbound: { label: 'خروجی',  icon: ArrowUpRight,   className: 'text-blue-600 bg-blue-50' },
};

function customerName(c: Customer | undefined): string {
  if (!c) return 'مشتری نامشخص';
  return c.type === 'company' ? c.companyName || 'شرکت' : fullName(c.firstName, c.lastName);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isThisMonth(d: Date): boolean {
  const now = new Date();
  return jalaliFormat(d, 'yyyy/MM') === jalaliFormat(now, 'yyyy/MM');
}

export default function CustomerInteractionsPage() {
  const { profile } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<InteractionType | 'all'>('all');
  const [search, setSearch] = useState('');

  const [logOpen, setLogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    customerId: '' as string,
    type: 'call' as InteractionType,
    direction: 'outbound' as Direction,
    subject: '',
    content: '',
    outcome: 'neutral' as Outcome,
    durationMin: '',
    nextFollowUp: '',
  });

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const where = isSuperAdmin ? {} : {};
      const [custs, ints] = await Promise.all([
        fetchData<Customer>('customers', { where, orderBy: { createdAt: 'desc' } }),
        fetchData('customer_interactions', { where, orderBy: { interactionDate: 'desc' } }),
      ]);
      setCustomers(custs || []);
      setInteractions(ints || []);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
    setLoading(false);
  }, [profile, isSuperAdmin]);

  useEffect(() => { load(); }, [load]);

  const customerMap = useMemo(() => {
    const m = new Map<string, Customer>();
    customers.forEach((c) => m.set(c.id, c));
    return m;
  }, [customers]);

  const filtered = useMemo(() => {
    let list = interactions;
    if (selectedCustomerId) {
      list = list.filter((i) => i.customerId === selectedCustomerId);
    }
    if (typeFilter !== 'all') {
      list = list.filter((i) => i.type === typeFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((i) => {
        const subj = (i.subject || '').toLowerCase();
        const name = customerName(customerMap.get(i.customerId)).toLowerCase();
        return subj.includes(q) || name.includes(q);
      });
    }
    return list;
  }, [interactions, selectedCustomerId, typeFilter, search, customerMap]);

  const summary = useMemo(() => {
    const thisMonth = interactions.filter((i) => {
      try { return isThisMonth(new Date(i.interactionDate)); } catch { return false; }
    }).length;

    const byType: Record<string, number> = {};
    interactions.forEach((i) => { byType[i.type] = (byType[i.type] || 0) + 1; });

    const today = new Date();
    const followUpsDueToday = interactions.filter((i) => {
      if (!i.nextFollowUp) return false;
      try { return isSameDay(new Date(i.nextFollowUp), today); } catch { return false; }
    }).length;

    return { thisMonth, byType, followUpsDueToday, total: interactions.length };
  }, [interactions]);

  const typeCounts = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.forEach((i) => { m[i.type] = (m[i.type] || 0) + 1; });
    return m;
  }, [filtered]);

  const openLog = () => {
    setForm({
      customerId: selectedCustomerId || (customers[0]?.id ?? ''),
      type: 'call',
      direction: 'outbound',
      subject: '',
      content: '',
      outcome: 'neutral',
      durationMin: '',
      nextFollowUp: '',
    });
    setLogOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!form.customerId) { toast.error('مشتری را انتخاب کنید'); return; }
    if (!form.subject.trim()) { toast.error('موضوع را وارد کنید'); return; }
    setCreating(true);
    try {
      await createData('customer_interactions', {
        customerId: form.customerId,
        type: form.type,
        direction: form.direction,
        subject: form.subject.trim(),
        content: form.content.trim() || null,
        outcome: form.outcome,
        durationMin: form.durationMin ? Number(form.durationMin) : 0,
        handledBy: profile.id,
        interactionDate: new Date().toISOString(),
        nextFollowUp: form.nextFollowUp ? new Date(form.nextFollowUp).toISOString() : null,
        attachments: [],
      });
      toast.success('تعامل با موفقیت ثبت شد');
      setLogOpen(false);
      load();
    } catch (error: any) {
      toast.error('ثبت تعامل ناموفق: ' + error.message);
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!profile) return;
    try {
      await deleteData('customer_interactions', { id });
      toast.success('تعامل حذف شد');
      setInteractions((prev) => prev.filter((i) => i.id !== id));
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const selectedCustomer = selectedCustomerId ? customerMap.get(selectedCustomerId) : null;

  const stats = useMemo(() => [
    {
      label: 'تعاملات این ماه', value: summary.thisMonth, icon: ListChecks,
      filter: 'all',
      gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
      glow: 'rgba(37,99,235,0.25)',
    },
    {
      label: 'پیگیری‌های امروز', value: summary.followUpsDueToday, icon: CalendarClock,
      filter: 'follow_up',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      glow: 'rgba(245,158,11,0.25)',
    },
    {
      label: 'کل تعاملات', value: summary.total, icon: Users,
      filter: 'total',
      gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      glow: 'rgba(34,197,94,0.25)',
    },
  ], [summary]);

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری تعاملات...</p>
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
              <h1>تاریخچه ارتباطات مشتری</h1>
            </div>
            <p>ثبت و پیگیری تمام تماس‌ها، ایمیل‌ها و جلسات با مشتریان</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <button className="nb-new-btn" onClick={openLog} disabled={customers.length === 0}>
            <Plus className="h-[18px] w-[18px]" />
            ثبت تعامل جدید
          </button>
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
              <stat.icon className="h-[22px] w-[22px] text-white" strokeWidth={2.5} />
            </div>
            <div className="nb-stat-v2-body">
              <strong>{stat.value.toLocaleString('fa-IR')}</strong>
              <span>{stat.label}</span>
            </div>
            <div className="nb-stat-v2-spark" style={{ background: stat.gradient }} />
          </div>
        ))}
      </section>

      {customers.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><Users className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>مشتری‌ای موجود نیست</h3>
          <p>ابتدا مشتری ثبت کنید تا بتوانید تعاملات را پیگیری کنید</p>
        </div>
      ) : interactions.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><ListChecks className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>تعاملی ثبت نشده</h3>
          <p>اولین تماس، ایمیل یا جلسه با مشتریان را ثبت کنید</p>
          <button className="nb-empty-new-btn" onClick={openLog}><Plus className="h-4 w-4" /> ثبت تعامل</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left sidebar — customer list */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 lg:sticky lg:top-6 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">مشتریان</span>
              </div>
              <div className="px-4 pb-3">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    className="flex h-9 w-full rounded-md border border-input bg-background pr-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="جستجو مشتری..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                <button
                  onClick={() => setSelectedCustomerId(null)}
                  className={cn(
                    'w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors text-right dark:hover:bg-slate-700/50',
                    !selectedCustomerId && 'bg-blue-50 dark:bg-blue-900/20'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center dark:bg-slate-700">
                      <ListChecks className="w-4 h-4" />
                    </div>
                    <span className={cn('text-sm font-medium', !selectedCustomerId ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300')}>
                      همه تعاملات
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">{interactions.length.toLocaleString('fa-IR')}</span>
                </button>
                {customers.map((c) => {
                  const count = interactions.filter((i) => i.customerId === c.id).length;
                  const name = customerName(c);
                  const isSelected = selectedCustomerId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCustomerId(c.id)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors text-right dark:hover:bg-slate-700/50',
                        isSelected && 'bg-blue-50 dark:bg-blue-900/20'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn('flex h-8 w-8 items-center justify-center rounded-full shrink-0 text-xs font-bold', c.type === 'company' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400')}>
                          {name?.[0] || '؟'}
                        </div>
                        <div className="min-w-0">
                          <div className={cn('text-sm font-medium truncate', isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300')}>{name}</div>
                          {count > 0 && <div className="text-[11px] text-slate-400">{count.toLocaleString('fa-IR')} تعامل</div>}
                        </div>
                      </div>
                      {count > 0 && (
                        <ChevronLeft className="w-4 h-4 text-slate-300 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right side — timeline */}
          <div className="lg:col-span-3">
            {/* Type filter tabs */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
              <FilterPill active={typeFilter === 'all'} onClick={() => setTypeFilter('all')} label="همه" count={filtered.length} />
              {(Object.keys(TYPE_META) as InteractionType[]).map((t) => (
                <FilterPill
                  key={t}
                  active={typeFilter === t}
                  onClick={() => setTypeFilter(t)}
                  label={TYPE_META[t].label}
                  count={selectedCustomerId || typeFilter !== 'all' ? (typeCounts[t] || 0) : (summary.byType[t] || 0)}
                  dotColor={TYPE_META[t].color}
                />
              ))}
            </div>

            {/* Selected customer banner */}
            {selectedCustomer && (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4 dark:bg-blue-900/20 dark:border-blue-900/30">
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold', selectedCustomer.type === 'company' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400')}>
                    {customerName(selectedCustomer)?.[0] || '؟'}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm dark:text-slate-100">{customerName(selectedCustomer)}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{filtered.length.toLocaleString('fa-IR')} تعامل</div>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-8 text-blue-600 hover:text-blue-700" onClick={() => setSelectedCustomerId(null)}>
                  <X className="w-4 h-4" />
                  لغو فیلتر
                </Button>
              </div>
            )}

            {/* Timeline */}
            {filtered.length === 0 ? (
              <div className="nb-empty">
                <div className="sb-empty-icon"><ListChecks className="h-12 w-12 text-muted-foreground/30" /></div>
                <h3>تعاملی یافت نشد</h3>
                <p>{search ? 'با جستجوی دیگری امتحان کنید' : 'برای این فیلتر تعاملی وجود ندارد'}</p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                <div className="relative">
                  <div className="absolute right-[19px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-700" />
                  <div className="space-y-6">
                    {filtered.map((item) => {
                      const meta = TYPE_META[item.type as InteractionType] || TYPE_META.note;
                      const Icon = meta.icon;
                      const cust = customerMap.get(item.customerId);
                      const outcome = item.outcome ? OUTCOME_META[item.outcome as Outcome] : null;
                      const dir = DIRECTION_META[item.direction as Direction] || DIRECTION_META.outbound;
                      const DirIcon = dir.icon;
                      return (
                        <div key={item.id} className="relative pr-12 group">
                          <div className={cn('absolute right-0 top-0 w-10 h-10 rounded-full ring-4 ring-white dark:ring-slate-800 flex items-center justify-center', meta.bg, meta.ring)}>
                            <Icon className={cn('w-5 h-5', meta.color)} />
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md hover:border-slate-300 transition-all dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-700/50">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className={cn('text-[11px] gap-1', meta.color, 'border-transparent', meta.bg)}>
                                    {meta.label}
                                  </Badge>
                                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                                    <DirIcon className={cn('w-3 h-3', dir.className)} />
                                    {dir.label}
                                  </span>
                                  {outcome && (
                                    <Badge variant="outline" className={cn('text-[11px] border-transparent', outcome.className)}>
                                      {outcome.label}
                                    </Badge>
                                  )}
                                </div>
                                <h4 className="font-semibold text-slate-900 mt-1.5 text-sm dark:text-slate-100">{item.subject || 'بدون موضوع'}</h4>
                              </div>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                title="حذف"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            {item.content && (
                              <p className="text-sm text-slate-600 mt-2 leading-6 whitespace-pre-wrap dark:text-slate-300">{item.content}</p>
                            )}

                            <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400">
                              {!selectedCustomerId && (
                                <span className="inline-flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5" />
                                  <span className="text-slate-600 font-medium dark:text-slate-300">{customerName(cust)}</span>
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                {formatJalaliDateTime(item.interactionDate)}
                              </span>
                              {item.durationMin > 0 && (
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" />
                                  {Number(item.durationMin).toLocaleString('fa-IR')} دقیقه
                                </span>
                              )}
                              {item.nextFollowUp && (
                                <span className="inline-flex items-center gap-1.5 text-amber-600">
                                  <CalendarClock className="w-3.5 h-3.5" />
                                  پیگیری: {formatJalali(item.nextFollowUp)}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1.5 mr-auto">
                                <span className="text-slate-300">•</span>
                                {relativeTime(item.interactionDate)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <button className="nb-fab" onClick={openLog} aria-label="ثبت تعامل" disabled={customers.length === 0}>
        <Plus className="h-6 w-6" />
      </button>

      {/* Log new interaction dialog */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>ثبت تعامل جدید</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>مشتری</Label>
              <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                <SelectTrigger><SelectValue placeholder="انتخاب مشتری" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{customerName(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>نوع تعامل</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as InteractionType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TYPE_META) as InteractionType[]).map((t) => (
                      <SelectItem key={t} value={t}>{TYPE_META[t].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>جهت</Label>
                <Select value={form.direction} onValueChange={(v) => setForm({ ...form, direction: v as Direction })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inbound">ورودی</SelectItem>
                    <SelectItem value="outbound">خروجی</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>موضوع</Label>
              <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="موضوع تعامل" required />
            </div>

            <div className="space-y-2">
              <Label>محتوا</Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="جزئیات تعامل..." rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>نتیجه</Label>
                <Select value={form.outcome} onValueChange={(v) => setForm({ ...form, outcome: v as Outcome })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(OUTCOME_META) as Outcome[]).map((o) => (
                      <SelectItem key={o} value={o}>{OUTCOME_META[o].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>مدت (دقیقه)</Label>
                <input type="number" min={0} dir="ltr" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: e.target.value })} placeholder="۰" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>تاریخ پیگیری بعدی</Label>
              <JalaliDatePicker value={form.nextFollowUp ? new Date(form.nextFollowUp) : null} onChange={(d) => setForm({ ...form, nextFollowUp: d ? toLocalDateString(d) : '' })} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLogOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'در حال ثبت...' : 'ثبت تعامل'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterPill({
  active, onClick, label, count, dotColor,
}: { active: boolean; onClick: () => void; label: string; count: number; dotColor?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium border transition-all whitespace-nowrap',
        active
          ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-700'
          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700/50'
      )}
    >
      {dotColor && <span className={cn('w-1.5 h-1.5 rounded-full', active ? 'bg-white' : dotColor.replace('text-', 'bg-'))} />}
      {label}
      <span className={cn('text-xs', active ? 'text-slate-300' : 'text-slate-400')}>
        {count.toLocaleString('fa-IR')}
      </span>
    </button>
  );
}
