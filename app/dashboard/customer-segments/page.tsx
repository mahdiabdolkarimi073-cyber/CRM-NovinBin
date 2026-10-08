'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { fetchData, createData, deleteData } from '@/lib/data-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Plus, Users, Sparkles, Trash2, UserPlus, Crown, Heart, AlertTriangle,
  Search, X, Target, Layers, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { formatJalali, relativeTime } from '@/lib/format';
import { fullName, CUSTOMER_LEVELS } from '@/lib/constants';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Customer } from '@/lib/types';

// ---------- Types & constants ----------

type Level = 'bronze' | 'silver' | 'gold' | 'vip';

interface SegmentCriteria {
  minScore?: number | null;
  maxScore?: number | null;
  minOrders?: number | null;
  level?: Level | null;
}

interface Segment {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  criteria: SegmentCriteria;
  active: boolean;
  createdAt: string;
}

interface SegmentMember {
  id: string;
  segmentId: string;
  customerId: string;
  addedAt: string;
  customer: Customer;
}

const SEGMENT_COLORS = [
  { name: 'سبز زمردی', value: '#10b981' },
  { name: 'آبی',       value: '#3b82f6' },
  { name: 'کهربایی',   value: '#f59e0b' },
  { name: 'قرمز',      value: '#f43f5e' },
  { name: 'آبی روشن',  value: '#0ea5e9' },
  { name: 'سربی',      value: '#64748b' },
];

const LEVEL_LABELS: Record<Level, string> = {
  bronze: 'برنزی',
  silver: 'نقره‌ای',
  gold: 'طلایی',
  vip: 'ویژه',
};

const PRESET_SUGGESTIONS = [
  {
    key: 'vip',
    name: 'مشتریان VIP',
    description: 'مشتریانی با امتیاز بالای ۸۰',
    color: '#10b981',
    icon: Crown,
    criteria: { minScore: 80 } as SegmentCriteria,
    summary: 'امتیاز ≥ ۸۰',
  },
  {
    key: 'loyal',
    name: 'مشتریان وفادار',
    description: 'بیش از ۱۰ سفارش ثبت کرده‌اند',
    color: '#3b82f6',
    icon: Heart,
    criteria: { minOrders: 10 } as SegmentCriteria,
    summary: 'سفارش ≥ ۱۰',
  },
  {
    key: 'churn',
    name: 'در معرض ریزش',
    description: '۹۰ روز اخیر سفارشی ثبت نکرده‌اند',
    color: '#f43f5e',
    icon: AlertTriangle,
    criteria: {} as SegmentCriteria,
    summary: 'بدون سفارش ۹۰ روز',
  },
];

// ---------- Helpers ----------

function customerName(c: Customer | undefined): string {
  if (!c) return 'مشتری نامشخص';
  return c.type === 'company' ? c.companyName || 'شرکت' : fullName(c.firstName, c.lastName);
}

function criteriaSummary(c: SegmentCriteria): string {
  const parts: string[] = [];
  if (c.minScore != null) parts.push(`امتیاز ≥ ${Number(c.minScore).toLocaleString('fa-IR')}`);
  if (c.maxScore != null) parts.push(`امتیاز ≤ ${Number(c.maxScore).toLocaleString('fa-IR')}`);
  if (c.minOrders != null) parts.push(`سفارش ≥ ${Number(c.minOrders).toLocaleString('fa-IR')}`);
  if (c.level) parts.push(`سطح: ${LEVEL_LABELS[c.level]}`);
  return parts.length ? parts.join('، ') : 'بدون معیار';
}

function matchesCriteria(c: Customer, crit: SegmentCriteria, ordersByCustomer: Map<string, number>): boolean {
  if (crit.minScore != null && (c.score ?? 0) < crit.minScore) return false;
  if (crit.maxScore != null && (c.score ?? 0) > crit.maxScore) return false;
  if (crit.level && c.level !== crit.level) return false;
  if (crit.minOrders != null) {
    const count = ordersByCustomer.get(c.id) || 0;
    if (count < crit.minOrders) return false;
  }
  return true;
}

// ---------- Main component ----------

export default function CustomerSegmentsPage() {
  const { profile } = useAuth();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [members, setMembers] = useState<SegmentMember[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    color: SEGMENT_COLORS[0].value,
    minScore: '',
    maxScore: '',
    minOrders: '',
    level: '' as Level | '',
  });

  // Detail dialog
  const [detailSegment, setDetailSegment] = useState<Segment | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [addMemberId, setAddMemberId] = useState('');
  const [autoPopulating, setAutoPopulating] = useState(false);

  // ---------- Data loading ----------

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const where = isSuperAdmin ? {} : {};
      const [segs, custs, mems, ords] = await Promise.all([
        fetchData<Segment>('customer_segments', { where, orderBy: { createdAt: 'desc' } }),
        fetchData<Customer>('customers', { where, orderBy: { createdAt: 'desc' } }),
        fetchData<SegmentMember>('customer_segment_members', { where, include: { customer: true } }),
        fetchData<any>('orders', { where }),
      ]);
      setSegments(segs || []);
      setCustomers(custs || []);
      setMembers(mems || []);
      setOrders(ords || []);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
    setLoading(false);
  }, [profile, isSuperAdmin]);

  useEffect(() => { load(); }, [load]);

  // ---------- Derived ----------

  const ordersByCustomer = useMemo(() => {
    const m = new Map<string, number>();
    orders.forEach((o) => {
      if (o.customerId) m.set(o.customerId, (m.get(o.customerId) || 0) + 1);
    });
    return m;
  }, [orders]);

  const membersBySegment = useMemo(() => {
    const m = new Map<string, SegmentMember[]>();
    members.forEach((mem) => {
      const arr = m.get(mem.segmentId) || [];
      arr.push(mem);
      m.set(mem.segmentId, arr);
    });
    return m;
  }, [members]);

  const memberCount = useCallback((segId: string) => membersBySegment.get(segId)?.length || 0, [membersBySegment]);

  const detailMembers = useMemo(
    () => (detailSegment ? (membersBySegment.get(detailSegment.id) || []) : []),
    [detailSegment, membersBySegment]
  );
  const detailMemberIds = useMemo(() => new Set(detailMembers.map((m) => m.customerId)), [detailMembers]);

  // Customers available to add (not already members, matching search)
  const availableCustomers = useMemo(() => {
    if (!detailSegment) return [];
    return customers
      .filter((c) => !detailMemberIds.has(c.id))
      .filter((c) => {
        if (!memberSearch.trim()) return true;
        const q = memberSearch.trim().toLowerCase();
        return customerName(c).toLowerCase().includes(q);
      });
  }, [detailSegment, customers, detailMemberIds, memberSearch]);

  // Auto-populate preview count
  const autoPopulatePreview = useMemo(() => {
    if (!detailSegment) return 0;
    return customers.filter((c) => matchesCriteria(c, detailSegment.criteria, ordersByCustomer)).length;
  }, [detailSegment, customers, ordersByCustomer]);

  // Filtered segments for search
  const filteredSegments = useMemo(() => {
    if (!search.trim()) return segments;
    const q = search.trim().toLowerCase();
    return segments.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q) ||
      criteriaSummary(s.criteria).toLowerCase().includes(q)
    );
  }, [segments, search]);

  const totalMembers = useMemo(() => members.length, [members]);

  // ---------- Stats ----------

  const stats = useMemo(() => [
    {
      label: 'کل بخش‌ها', value: segments.length, icon: Layers,
      filter: 'all',
      gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
      glow: 'rgba(37,99,235,0.25)',
    },
    {
      label: 'کل اعضا', value: totalMembers, icon: Users,
      filter: 'members',
      gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      glow: 'rgba(34,197,94,0.25)',
    },
    {
      label: 'کل مشتریان', value: customers.length, icon: Target,
      filter: 'customers',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      glow: 'rgba(245,158,11,0.25)',
    },
    {
      label: 'بخش‌های فعال', value: segments.filter((s) => s.active).length, icon: Sparkles,
      filter: 'active',
      gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
      glow: 'rgba(139,92,246,0.25)',
    },
  ], [segments, totalMembers, customers.length]);

  // ---------- Handlers ----------

  const openCreate = () => {
    setForm({
      name: '', description: '', color: SEGMENT_COLORS[0].value,
      minScore: '', maxScore: '', minOrders: '', level: '',
    });
    setCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !form.name.trim()) { toast.error('نام بخش را وارد کنید'); return; }
    setCreating(true);
    const criteria: SegmentCriteria = {};
    if (form.minScore) criteria.minScore = Number(form.minScore);
    if (form.maxScore) criteria.maxScore = Number(form.maxScore);
    if (form.minOrders) criteria.minOrders = Number(form.minOrders);
    if (form.level) criteria.level = form.level as Level;
    try {
      await createData('customer_segments', {
        name: form.name.trim(),
        description: form.description.trim() || null,
        color: form.color,
        criteria,
        active: true,
      });
      toast.success('بخش با موفقیت ایجاد شد');
      setCreateOpen(false);
      load();
    } catch (error: any) {
      toast.error('ایجاد بخش ناموفق: ' + error.message);
    }
    setCreating(false);
  };

  const createPreset = async (preset: typeof PRESET_SUGGESTIONS[number]) => {
    if (!profile) return;
    // Avoid duplicates by name
    if (segments.some((s) => s.name === preset.name)) {
      toast.message('این بخش از قبل وجود دارد');
      return;
    }
    try {
      await createData('customer_segments', {
        name: preset.name,
        description: preset.description,
        color: preset.color,
        criteria: preset.criteria,
        active: true,
      });
      toast.success(`بخش «${preset.name}» ایجاد شد`);
      load();
    } catch (error: any) {
      toast.error('ایجاد بخش ناموفق: ' + error.message);
    }
  };

  const handleDeleteSegment = async (seg: Segment) => {
    if (!profile) return;
    try {
      await deleteData('customer_segments', { id: seg.id });
      toast.success('بخش حذف شد');
      setDetailSegment(null);
      load();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const handleAddMember = async (customerId: string) => {
    if (!profile || !detailSegment || !customerId) return;
    try {
      await createData('customer_segment_members', {
        segmentId: detailSegment.id,
        customerId,
      });
      toast.success('عضو اضافه شد');
      setAddMemberId('');
      load();
    } catch (error: any) {
      toast.error('افزودن عضو ناموفق: ' + error.message);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!profile) return;
    try {
      await deleteData('customer_segment_members', { id: memberId });
      toast.success('عضو حذف شد');
      load();
    } catch (error: any) {
      toast.error('حذف عضو ناموفق: ' + error.message);
    }
  };

  const handleAutoPopulate = async () => {
    if (!profile || !detailSegment) return;
    setAutoPopulating(true);
    const matches = customers.filter((c) => matchesCriteria(c, detailSegment.criteria, ordersByCustomer));
    const existing = detailMemberIds;
    const toAdd = matches.filter((c) => !existing.has(c.id));
    if (toAdd.length === 0) {
      toast.message('همه مشتریان منطبق قبلاً اضافه شده‌اند');
      setAutoPopulating(false);
      return;
    }
    try {
      await Promise.all(
        toAdd.map((c) =>
          createData('customer_segment_members', {
            segmentId: detailSegment.id,
            customerId: c.id,
          })
        )
      );
      toast.success(`${toAdd.length.toLocaleString('fa-IR')} مشتری اضافه شد`);
      load();
    } catch (error: any) {
      toast.error('افزودن خودکار ناموفق: ' + error.message);
    }
    setAutoPopulating(false);
  };

  // ---------- Render ----------

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری بخش‌بندی مشتریان...</p>
        </div>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="nb-page" dir="rtl">
        <header className="nb-hero">
          <div className="nb-hero-left">
            <div>
              <div className="nb-hero-title-row">
                <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#2563EB,#3B82F6)', boxShadow: '0 0 12px rgba(37,99,235,.25)' }} />
                <h1>بخش‌بندی مشتریان</h1>
              </div>
              <p>تقسیم‌بندی مشتریان بر اساس رفتار، ارزش و سطح</p>
            </div>
          </div>
          <div className="nb-hero-right" />
        </header>
        <div className="nb-empty">
          <div className="sb-empty-icon"><Users className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>مشتری‌ای موجود نیست</h3>
          <p>ابتدا مشتری ثبت کنید تا بخش‌بندی انجام شود</p>
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
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#2563EB,#3B82F6)', boxShadow: '0 0 12px rgba(37,99,235,.25)' }} />
              <h1>بخش‌بندی مشتریان</h1>
            </div>
            <p>تقسیم‌بندی مشتریان بر اساس رفتار، ارزش و سطح</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/customer-segments/new" className="nb-new-btn" aria-disabled={customers.length === 0} style={customers.length === 0 ? { opacity: 0.5, pointerEvents: 'none' } : undefined}>
            <Plus className="h-[18px] w-[18px]" />
            ایجاد بخش جدید
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

      {/* Preset suggestions */}
      <div className="nb-section-divider">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <span>پیشنهادهای آماده</span>
      </div>
      <div className="nb-grid nb-grid-grid mb-6">
        {PRESET_SUGGESTIONS.map((preset) => {
          const exists = segments.some((s) => s.name === preset.name);
          const PresetIcon = preset.icon;
          return (
            <div
              key={preset.key}
              className={cn(
                'nb-card cursor-default',
                exists && 'opacity-60'
              )}
            >
              <div className="nb-card-top">
                <div className="nb-card-tags">
                  <span className="nb-card-tag" style={{ background: `${preset.color}15`, color: preset.color }}>
                    <PresetIcon className="h-2.5 w-2.5" /> {preset.summary}
                  </span>
                </div>
              </div>
              <h3 className="nb-card-title">{preset.name}</h3>
              <p className="nb-card-excerpt">{preset.description}</p>
              <div className="nb-card-footer">
                <div className="nb-card-quick">
                  {exists ? (
                    <span className="text-[11px] text-slate-400">ایجاد شده</span>
                  ) : (
                    <button
                      className="text-xs font-semibold transition-colors hover:opacity-80"
                      style={{ color: preset.color }}
                      onClick={() => createPreset(preset)}
                    >
                      <Plus className="h-3.5 w-3.5" /> ایجاد
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="nb-toolbar">
        <div className="nb-toolbar-left">
          <h2>بخش‌های شما</h2>
          <span className="nb-count-badge">{segments.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجوی بخش..."
            />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
          </div>
        </div>
      </div>

      {/* Segments grid */}
      {segments.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><Layers className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>بخشی ایجاد نشده</h3>
          <p>از پیشنهادهای آماده استفاده کنید یا بخش دلخواه بسازید</p>
          <Link href="/dashboard/customer-segments/new" className="nb-empty-new-btn">
            <Plus className="h-4 w-4" /> ایجاد بخش
          </Link>
        </div>
      ) : (
        <div className="nb-grid nb-grid-grid">
          {filteredSegments.map((seg) => {
            const count = memberCount(seg.id);
            return (
              <div
                key={seg.id}
                className="nb-card cursor-pointer group"
                onClick={() => { setDetailSegment(seg); setMemberSearch(''); setAddMemberId(''); }}
              >
                <div className="nb-card-top">
                  <div className="nb-card-tags">
                    <span className="nb-card-tag" style={{ background: `${seg.color}15`, color: seg.color }}>
                      <Target className="h-2.5 w-2.5" /> {criteriaSummary(seg.criteria)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 dark:bg-slate-700/40">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{count.toLocaleString('fa-IR')}</span>
                  </div>
                </div>
                <h3 className="nb-card-title group-hover:text-blue-600 transition-colors">
                  <span className="inline-block w-3 h-3 rounded-full ml-2 align-middle" style={{ backgroundColor: seg.color }} />
                  {seg.name}
                </h3>
                {seg.description && <p className="nb-card-excerpt">{seg.description}</p>}
                <div className="nb-card-footer">
                  <div className="nb-card-date">
                    {relativeTime(seg.createdAt)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Link href="/dashboard/customer-segments/new" className="nb-fab" aria-label="ایجاد بخش جدید">
        <Plus className="h-6 w-6" />
      </Link>

      {/* ---------- Create segment dialog ---------- */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>ایجاد بخش جدید</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>نام بخش</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثلاً: مشتریان فعال"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>توضیحات</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="هدف این بخش..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>رنگ بخش</Label>
              <div className="flex items-center gap-2.5 flex-wrap">
                {SEGMENT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm({ ...form, color: c.value })}
                    className={cn(
                      'w-9 h-9 rounded-full transition-all flex items-center justify-center',
                      form.color === c.value ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-110'
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  >
                    {form.color === c.value && <span className="w-3 h-3 rounded-full bg-white/90" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 dark:border-slate-700 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Target className="w-4 h-4 text-slate-400" />
                معیارهای بخش‌بندی
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">حداقل امتیاز</Label>
                  <Input
                    type="number"
                    min={0}
                    dir="ltr"
                    value={form.minScore}
                    onChange={(e) => setForm({ ...form, minScore: e.target.value })}
                    placeholder="۰"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">حداکثر امتیاز</Label>
                  <Input
                    type="number"
                    min={0}
                    dir="ltr"
                    value={form.maxScore}
                    onChange={(e) => setForm({ ...form, maxScore: e.target.value })}
                    placeholder="۱۰۰"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">حداقل سفارش</Label>
                  <Input
                    type="number"
                    min={0}
                    dir="ltr"
                    value={form.minOrders}
                    onChange={(e) => setForm({ ...form, minOrders: e.target.value })}
                    placeholder="۰"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">سطح مشتری</Label>
                  <Select
                    value={form.level || 'none'}
                    onValueChange={(v) => setForm({ ...form, level: v === 'none' ? '' : (v as Level) })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">همه سطوح</SelectItem>
                      <SelectItem value="bronze">برنزی</SelectItem>
                      <SelectItem value="silver">نقره‌ای</SelectItem>
                      <SelectItem value="gold">طلایی</SelectItem>
                      <SelectItem value="vip">ویژه</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'در حال ایجاد...' : 'ایجاد بخش'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---------- Segment detail dialog ---------- */}
      <Dialog open={!!detailSegment} onOpenChange={(o) => !o && setDetailSegment(null)}>
        <DialogContent className="max-w-3xl">
          {detailSegment && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: detailSegment.color, boxShadow: `0 0 0 4px ${detailSegment.color}22` }}
                    />
                    <div className="min-w-0">
                      <DialogTitle className="truncate">{detailSegment.name}</DialogTitle>
                      {detailSegment.description && (
                        <p className="text-sm text-slate-500 mt-1">{detailSegment.description}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 h-8"
                    onClick={() => handleDeleteSegment(detailSegment)}
                  >
                    <Trash2 className="w-4 h-4" />
                    حذف بخش
                  </Button>
                </div>
              </DialogHeader>

              {/* Criteria summary + auto-populate */}
              <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-50 rounded-xl px-4 py-3 dark:bg-slate-800/40">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="gap-1 border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300">
                    <Target className="w-3 h-3 text-slate-400" />
                    {criteriaSummary(detailSegment.criteria)}
                  </Badge>
                  <span className="text-xs text-slate-400">
                    {autoPopulatePreview.toLocaleString('fa-IR')} مشتری منطبق
                  </span>
                </div>
                {Object.keys(detailSegment.criteria).length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={handleAutoPopulate}
                    disabled={autoPopulating || autoPopulatePreview === 0}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    {autoPopulating ? 'در حال افزودن...' : 'افزودن خودکار'}
                  </Button>
                )}
              </div>

              {/* Add member */}
              <div className="flex items-center gap-2">
                <Select value={addMemberId} onValueChange={(v) => { setAddMemberId(v); handleAddMember(v); }}>
                  <SelectTrigger className="flex-1">
                    <span className="text-slate-400 flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      افزودن مشتری به بخش...
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {availableCustomers.length === 0 ? (
                      <SelectItem value="__none" disabled>مشتری دیگری موجود نیست</SelectItem>
                    ) : (
                      availableCustomers.slice(0, 50).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{customerName(c)}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Members table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden dark:border-slate-700">
                {detailMembers.length === 0 ? (
                  <div className="py-12 text-center">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm text-slate-400">عضوی در این بخش نیست</p>
                    <p className="text-xs text-slate-400 mt-1">از افزودن خودکار یا افزودن دستی استفاده کنید</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-800/50">
                        <TableHead className="text-xs">مشتری</TableHead>
                        <TableHead className="text-xs">سطح</TableHead>
                        <TableHead className="text-xs">امتیاز</TableHead>
                        <TableHead className="text-xs">سفارش</TableHead>
                        <TableHead className="text-xs">تاریخ عضویت</TableHead>
                        <TableHead className="text-xs w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailMembers.map((mem) => {
                        const c = mem.customer;
                        const level = CUSTOMER_LEVELS.find((l) => l.key === c.level);
                        const orderCount = ordersByCustomer.get(c.id) || 0;
                        return (
                          <TableRow key={mem.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className={cn('text-xs', c.type === 'company' ? 'bg-blue-100 text-blue-700' : 'bg-sky-100 text-sky-700')}>
                                    {customerName(c)?.[0] || '؟'}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{customerName(c)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {level && (
                                <Badge variant="outline" className="text-[11px] gap-1" style={{ color: level.color, borderColor: level.color + '40' }}>
                                  {level.label}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-slate-600 dark:text-slate-300">{Number(c.score || 0).toLocaleString('fa-IR')}</TableCell>
                            <TableCell className="text-sm text-slate-600 dark:text-slate-300">{orderCount.toLocaleString('fa-IR')}</TableCell>
                            <TableCell className="text-xs text-slate-400">{formatJalali(mem.addedAt)}</TableCell>
                            <TableCell>
                              <button
                                onClick={() => handleRemoveMember(mem.id)}
                                className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                                title="حذف از بخش"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>کل اعضا: {detailMembers.length.toLocaleString('fa-IR')}</span>
                <span>ایجاد: {formatJalali(detailSegment.createdAt)}</span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
