'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Plus, FlaskConical, Search, Calendar, Clock, CheckCircle, Link2, Copy, Eye, EyeOff, KeyRound,
  Loader2, LayoutGrid, List, X, AlertTriangle, TrendingUp, Sparkles, Zap,
} from 'lucide-react';
import Link from 'next/link';
import { formatJalali, toLocalDateString } from '@/lib/format';
import { PLAN_LABELS } from '@/lib/constants';
import { toast } from 'sonner';

type Demo = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  plan: string;
  status: string;
  startDate: string;
  expiryDate: string;
  createdBy: string | null;
  createdAt: string;
};

type AccessInfo = { username: string; password: string };

const DEMO_DURATION_DAYS = 15;

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  active: { label: 'فعال', color: '#10b981' },
  expired: { label: 'منقضی', color: '#ef4444' },
  converted: { label: 'تبدیل شده', color: '#3b82f6' },
};

const PAGE_SIZE = 12;

function generateUsername(name: string): string {
  const slug = name.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^\w.]/g, '').slice(0, 20);
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${slug || 'demo'}.${rand}`;
}

function generatePassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 8; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass;
}

export default function DemosPage() {
  const { profile } = useAuth();
  const [demos, setDemos] = useState<Demo[]>([]);
  const [accessMap, setAccessMap] = useState<Record<string, AccessInfo>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [accessDemo, setAccessDemo] = useState<{ demo: Demo; info: AccessInfo } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', companyName: '', plan: 'starter', startDate: '',
  });

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const where = isSuperAdmin ? {} : {};
      const [demoData, activities] = await Promise.all([
        fetchData<Demo>('demos', {
          where,
          orderBy: { createdAt: 'desc' },
        }),
        fetchData<any>('demo_activities', {
          where: isSuperAdmin ? { action: 'access_created' } : { action: 'access_created' },
        }),
      ]);
      setDemos(demoData || []);

      const map: Record<string, AccessInfo> = {};
      (activities || []).forEach((a) => {
        try {
          const meta = typeof a.metadata === 'string' ? JSON.parse(a.metadata) : a.metadata;
          if (meta?.username && meta?.password && a.demoId) {
            map[a.demoId] = { username: meta.username, password: meta.password };
          }
        } catch { /* skip */ }
      });
      setAccessMap(map);
    } catch (error: any) {
      toast.error('بارگذاری دموها ناموفق: ' + error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { setPage(1); }, [filterStatus, search]);

  const filtered = useMemo(() => {
    let result = demos;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((d) => d.name.toLowerCase().includes(q) || (d.companyName || '').toLowerCase().includes(q));
    }
    if (filterStatus !== 'all') result = result.filter((d) => d.status === filterStatus);
    return result;
  }, [demos, search, filterStatus]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const pagedDemos = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const today = toLocalDateString(new Date());

  const daysRemaining = (expiryDate: string): number => {
    const diff = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const stats = useMemo(() => [
    {
      label: 'کل دموها', value: demos.length, icon: FlaskConical,
      filter: 'all',
      gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
      glow: 'rgba(37,99,235,0.25)',
    },
    {
      label: 'فعال', value: demos.filter((d) => d.status === 'active').length, icon: Zap,
      filter: 'active',
      gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      glow: 'rgba(34,197,94,0.25)',
    },
    {
      label: 'منقضی شده', value: demos.filter((d) => d.status === 'expired').length, icon: AlertTriangle,
      filter: 'expired',
      gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      glow: 'rgba(239,68,68,0.25)',
    },
    {
      label: 'تبدیل شده', value: demos.filter((d) => d.status === 'converted').length, icon: CheckCircle,
      filter: 'converted',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563EB 100%)',
      glow: 'rgba(59,130,246,0.25)',
    },
  ], [demos]);

  const handleStatClick = (f: string) => {
    setFilterStatus(filterStatus === f ? 'all' : f);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربری یافت نشد'); return; }
    if (!form.name.trim()) { toast.error('نام را وارد کنید'); return; }

    const startDate = form.startDate || today;
    const expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + DEMO_DURATION_DAYS);
    const expiryStr = toLocalDateString(expiryDate);

    const username = generateUsername(form.name);
    const password = generatePassword();

    setCreating(true);
    try {
      const demo = await createData<any>('demos', {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        companyName: form.companyName.trim() || null,
        plan: form.plan,
        status: 'active',
        startDate: new Date(startDate),
        expiryDate: new Date(expiryStr),
        createdBy: profile.id,
      });

      await createData('demo_activities', {
        demoId: demo.id,
        pagePath: '/login/customer',
        action: 'access_created',
        duration: 0,
        metadata: { username, password },
      });

      toast.success('دموی ۱۵ روزه ایجاد شد و لینک اختصاصی ساخته شد');
      setDialogOpen(false);
      setForm({ name: '', email: '', phone: '', companyName: '', plan: 'starter', startDate: '' });
      loadData();
    } catch (error: any) {
      toast.error('ایجاد ناموفق: ' + (error?.message || 'خطا'));
    }
    setCreating(false);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} کپی شد`);
  };

  const handleCopyLink = (username: string) => {
    const link = `${window.location.origin}/login/customer?u=${encodeURIComponent(username)}`;
    navigator.clipboard.writeText(link);
    toast.success('لینک اختصاصی کپی شد');
  };

  const handleCopyAll = (info: AccessInfo) => {
    const link = `${window.location.origin}/login/customer?u=${encodeURIComponent(info.username)}`;
    const text = `لینک ورود: ${link}\nنام کاربری: ${info.username}\nرمز عبور: ${info.password}`;
    navigator.clipboard.writeText(text);
    toast.success('اطلاعات کامل کپی شد');
  };

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری دموها...</p>
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
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#3B82F6,#2563EB)', boxShadow: '0 0 12px rgba(37,99,235,.25)' }} />
              <h1>دموها</h1>
            </div>
            <p>مدیریت نسخه‌های دموی ۱۵ روزه با لینک اختصاصی برای هر مشتری</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button className="nb-new-btn" onClick={() => setDialogOpen(true)}>
                <Plus className="h-[18px] w-[18px]" />
                دموی جدید
              </button>
            </DialogTrigger>
          </Dialog>
        </div>
      </header>

      {/* Stats */}
      <section className="nb-stats-grid-v2">
        {stats.map((stat) => (
          <button
            type="button"
            className={`nb-stat-card-v2 ${filterStatus === stat.filter ? 'is-active' : ''}`}
            key={stat.label}
            onClick={() => handleStatClick(stat.filter)}
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
          </button>
        ))}
      </section>

      {/* Toolbar */}
      <div className="nb-toolbar">
        <div className="nb-toolbar-left">
          <h2>همه دموها</h2>
          <span className="nb-count-badge">{filtered.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در دموها..."
            />
            {search && (
              <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>
            )}
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="nb-select-filter h-10 w-[140px]">
              <SelectValue placeholder="وضعیت" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              {Object.entries(STATUS_INFO).map(([key, info]) => (
                <SelectItem key={key} value={key}>{info.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="nb-view-toggle">
            <button className={viewMode === 'board' ? 'is-active' : ''} onClick={() => setViewMode('board')} aria-label="تخته‌ای">
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button className={viewMode === 'list' ? 'is-active' : ''} onClick={() => setViewMode('list')} aria-label="لیستی">
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon">
            <FlaskConical className="h-12 w-12 text-muted-foreground/30" />
          </div>
          <h3>دمویی ایجاد نشده</h3>
          <p>اولین نسخه دموی ۱۵ روزه را ایجاد کنید</p>
          <button className="nb-empty-new-btn" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            افزودن دمو
          </button>
        </div>
      ) : viewMode === 'board' ? (
        <div className="nb-grid nb-grid-grid">
          {pagedDemos.map((demo) => {
            const st = STATUS_INFO[demo.status] || STATUS_INFO.active;
            const remaining = daysRemaining(demo.expiryDate);
            const info = accessMap[demo.id];
            const isUrgent = demo.status === 'active' && remaining <= 3;
            return (
              <article
                key={demo.id}
                className="nb-card"
                onClick={() => info ? setAccessDemo({ demo, info }) : undefined}
                style={{ borderBottomColor: st.color, borderBottomWidth: 3 }}
              >
                <div className="nb-card-top">
                  <div className="nb-card-tags">
                    <span className="nb-card-tag" style={{ background: `${st.color}15`, color: st.color }}>
                      {st.label}
                    </span>
                    <span className="nb-card-tag" style={{ background: 'rgba(37,99,235,.08)', color: '#2563EB' }}>
                      {PLAN_LABELS[demo.plan] || demo.plan}
                    </span>
                    {isUrgent && (
                      <span className="nb-card-tag" style={{ background: 'rgba(239,68,68,.12)', color: '#EF4444' }}>
                        <AlertTriangle className="h-2.5 w-2.5" /> رو به انقضا
                      </span>
                    )}
                  </div>
                  <div className="nb-card-actions">
                    {info && (
                      <button className="nb-card-more" onClick={(e) => { e.stopPropagation(); setAccessDemo({ demo, info }); setShowPassword(false); }}>
                        <Link2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="nb-card-title">{demo.name}</h3>
                {demo.companyName && <p className="nb-card-excerpt" style={{ WebkitLineClamp: 1 }}>{demo.companyName}</p>}

                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                  {demo.email && (
                    <div className="flex items-center gap-1.5">
                      <span className="shrink-0 text-slate-400">ایمیل:</span>
                      <span dir="ltr" className="truncate">{demo.email}</span>
                    </div>
                  )}
                  {demo.phone && (
                    <div className="flex items-center gap-1.5">
                      <span className="shrink-0 text-slate-400">تلفن:</span>
                      <span dir="ltr">{demo.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>شروع: {formatJalali(demo.startDate)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>انقضا: {formatJalali(demo.expiryDate)}</span>
                  </div>
                </div>

                <div className="nb-card-footer" onClick={(e) => e.stopPropagation()}>
                  <div className="nb-card-date">
                    {demo.status === 'active' ? (
                      <span className={remaining <= 3 ? 'text-amber-600 font-medium' : ''}>
                        <Clock className="h-3 w-3" />
                        {remaining.toLocaleString('fa-IR')} روز باقیمانده
                      </span>
                    ) : demo.status === 'converted' ? (
                      <span className="text-sky-600">
                        <CheckCircle className="h-3 w-3" /> تبدیل شد
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        <Clock className="h-3 w-3" /> منقضی شد
                      </span>
                    )}
                  </div>
                  <div className="nb-card-quick">
                    {info && (
                      <button onClick={(e) => { e.stopPropagation(); setAccessDemo({ demo, info }); setShowPassword(false); }} title="مشاهده لینک">
                        <Link2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
                <tr>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">نام</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">شرکت</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">پلن</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">تاریخ شروع</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">تاریخ انقضا</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">روزهای باقیمانده</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">وضعیت</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">لینک اختصاصی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {pagedDemos.map((demo) => {
                  const st = STATUS_INFO[demo.status] || STATUS_INFO.active;
                  const remaining = daysRemaining(demo.expiryDate);
                  const info = accessMap[demo.id];
                  return (
                    <tr key={demo.id} className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={() => info ? setAccessDemo({ demo, info }) : undefined}>
                      <td className="p-3">
                        <div className="font-medium text-slate-800 dark:text-slate-100">{demo.name}</div>
                        {demo.email && <div className="text-xs text-slate-400" dir="ltr">{demo.email}</div>}
                        {demo.phone && <div className="text-xs text-slate-400" dir="ltr">{demo.phone}</div>}
                      </td>
                      <td className="p-3 text-sm text-slate-500 dark:text-slate-300">{demo.companyName || '—'}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">{PLAN_LABELS[demo.plan] || demo.plan}</Badge>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatJalali(demo.startDate)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatJalali(demo.expiryDate)}
                        </span>
                      </td>
                      <td className="p-3">
                        {demo.status === 'active' ? (
                          <span className={`text-sm flex items-center gap-1 ${remaining <= 3 ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>
                            <Clock className="w-3 h-3" />
                            {remaining.toLocaleString('fa-IR')} روز
                          </span>
                        ) : demo.status === 'converted' ? (
                          <span className="text-sm text-sky-600 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> تبدیل شد
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" style={{ color: st.color, borderColor: st.color + '40' }} className="text-xs">
                          {st.label}
                        </Badge>
                      </td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        {info ? (
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setAccessDemo({ demo, info }); setShowPassword(false); }}>
                            <Link2 className="w-3.5 h-3.5" />
                            مشاهده لینک
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            <X className="h-4 w-4 rotate-45" />
          </button>
          <span className="text-sm text-slate-500">
            صفحه {currentPage.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}
          </span>
          <button
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          >
            <Plus className="h-4 w-4 rotate-45" />
          </button>
        </div>
      )}

      <Link href="#" onClick={(e) => { e.preventDefault(); setDialogOpen(true); }} className="nb-fab" aria-label="دموی جدید">
        <Plus className="h-6 w-6" />
      </Link>

      {/* Create Demo Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>ایجاد دموی ۱۵ روزه</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>نام *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="نام شخص یا شرکت"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>ایمیل</Label>
                <Input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
              </div>
              <div className="space-y-2">
                <Label>تلفن</Label>
                <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="09123456789" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>نام شرکت</Label>
              <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="نام شرکت (اختیاری)" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>پلن</Label>
                <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLAN_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>تاریخ شروع</Label>
                <JalaliDatePicker
                  value={form.startDate ? new Date(form.startDate) : null}
                  onChange={(d) => setForm({ ...form, startDate: d ? toLocalDateString(d) : '' })}
                />
                <p className="text-xs text-slate-400">در صورت خالی بودن، امروز در نظر گرفته می‌شود</p>
              </div>
            </div>
            <div className="rounded-lg bg-sky-50 border border-sky-100 px-4 py-3 text-sm text-sky-700 flex items-start gap-2 dark:bg-sky-900/20 dark:border-sky-800 dark:text-sky-400">
              <KeyRound className="w-4 h-4 mt-0.5 shrink-0" />
              <span>پس از ایجاد دمو، یک نام کاربری و رمز عبور اختصاصی برای مشتری ساخته می‌شود تا از طریق لینک اختصاصی وارد پنل خود شود.</span>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={creating}>{creating ? 'در حال ایجاد...' : 'ایجاد دمو'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Access link dialog */}
      <Dialog open={!!accessDemo} onOpenChange={(o) => !o && setAccessDemo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-sky-600" />
              لینک اختصاصی دمو
            </DialogTitle>
          </DialogHeader>
          {accessDemo && (
            <div className="space-y-4">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                این لینک و اطلاعات ورود را به مشتری بدهید تا وارد پنل دموی خود شود:
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-500">لینک ورود</Label>
                <div className="flex items-center gap-2">
                  <Input
                    dir="ltr"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/login/customer?u=${encodeURIComponent(accessDemo.info.username)}`}
                    className="text-xs"
                  />
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => handleCopyLink(accessDemo.info.username)}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-500">نام کاربری</Label>
                <div className="flex items-center gap-2">
                  <Input dir="ltr" readOnly value={accessDemo.info.username} />
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => handleCopy(accessDemo.info.username, 'نام کاربری')}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-500">رمز عبور</Label>
                <div className="flex items-center gap-2">
                  <Input
                    dir="ltr"
                    readOnly
                    type={showPassword ? 'text' : 'password'}
                    value={accessDemo.info.password}
                  />
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => handleCopy(accessDemo.info.password, 'رمز عبور')}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400">
                این دمو تا {formatJalali(accessDemo.demo.expiryDate)} فعال است ({daysRemaining(accessDemo.demo.expiryDate).toLocaleString('fa-IR')} روز باقیمانده).
              </div>

              <Button className="w-full" onClick={() => handleCopyAll(accessDemo.info)}>
                <Copy className="w-4 h-4" />
                کپی کامل اطلاعات ورود
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
