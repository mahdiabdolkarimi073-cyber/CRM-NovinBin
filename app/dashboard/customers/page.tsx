'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { fetchData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { SuperAdminActions } from '@/components/dashboard/super-admin-actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Search, Building2, User, Phone, Mail, MapPin, Briefcase, Award, Check, X, KeyRound, Loader2 } from 'lucide-react';
import { relativeTime } from '@/lib/format';
import { fullName, CUSTOMER_LEVELS, SERVICE_TYPES, ACTIVITY_TYPES } from '@/lib/constants';
import { toast } from 'sonner';
import { PasswordInput } from '@/components/ui/password-input';
import type { Customer } from '@/lib/types';

export default function CustomersPage() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: 'individual' as 'individual' | 'company',
    fullName: '',
    companyName: '',
    email: '',
    mobile: '',
    phone: '',
    address: '',
    city: '',
    activityType: '',
    level: 'basic',
    notes: '',
  });
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [additionalPhones, setAdditionalPhones] = useState<string[]>([]);
  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState('');

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadCustomers = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const where: any = {};
      if (filterType !== 'all') where.type = filterType;
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { companyName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { mobile: { contains: search, mode: 'insensitive' } },
        ];
      }
      const data = await fetchData('customers', { where, orderBy: { createdAt: 'desc' } });
      setCustomers((data as Customer[]) || []);
    } catch (error: any) {
      toast.error('بارگذاری مشتریان ناموفق: ' + error.message);
    }
    setLoading(false);
  }, [filterType, search]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && !loading && customers.length > 0) {
      const c = customers.find((x) => x.id === editId);
      if (c) openEdit(c);
    }
  }, [searchParams, loading, customers]);

  const openEdit = (c: Customer) => {
    setEditingCustomer(c);
    const name = c.firstName && c.lastName ? `${c.firstName} ${c.lastName}` : (c.firstName || c.lastName || '');
    setForm({
      type: c.type,
      fullName: name,
      companyName: c.companyName || '',
      email: c.email || '',
      mobile: c.mobile || '',
      phone: c.phone || '',
      address: c.address || '',
      city: c.city || '',
      activityType: c.activityType || '',
      level: c.level || 'basic',
      notes: c.notes || '',
    });
    setSelectedServices(c.serviceTypes || []);
    setAdditionalPhones(c.additionalPhones || []);
    setCreateAccount(false);
    setPassword('');
    setEditDialogOpen(true);
  };

  const openView = (c: Customer) => {
    setViewCustomer(c);
    setViewDialogOpen(true);
  };

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const addPhone = () => setAdditionalPhones((prev) => [...prev, '']);
  const removePhone = (index: number) => setAdditionalPhones((prev) => prev.filter((_, i) => i !== index));
  const updatePhone = (index: number, value: string) =>
    setAdditionalPhones((prev) => prev.map((p, i) => (i === index ? value : p)));

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setSaving(true);
    try {
      const nameParts = form.fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || null;
      const lastName = nameParts.slice(1).join(' ') || null;
      const phones = additionalPhones.filter((p) => p.trim() !== '');

      await updateData('customers', { id: editingCustomer.id }, {
        type: form.type,
        firstName,
        lastName,
        companyName: form.companyName || null,
        email: form.email || null,
        mobile: form.mobile || null,
        phone: form.phone || null,
        address: form.address || null,
        city: form.city || null,
        activityType: form.activityType || null,
        serviceTypes: selectedServices,
        additionalPhones: phones,
        level: form.level,
        notes: form.notes || null,
      });

      if (createAccount && password) {
        if (password.length < 6) {
          toast.error('رمز عبور باید حداقل ۶ کاراکتر باشد');
          setSaving(false);
          return;
        }
        const pwRes = await fetch('/api/auth/set-customer-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId: editingCustomer.id, password }),
        });
        const pwData = await pwRes.json();
        if (!pwRes.ok) throw new Error(pwData.error || 'خطا در تنظیم رمز عبور');
      }

      toast.success('مشتری ویرایش شد');
      setEditDialogOpen(false);
      setEditingCustomer(null);
      setCreateAccount(false);
      setPassword('');
      loadCustomers();
    } catch (error: any) {
      toast.error('ویرایش ناموفق: ' + error.message);
    }
    setSaving(false);
  };

  const handleDelete = async (c: Customer) => {
    const name = c.type === 'company' ? c.companyName : fullName(c.firstName, c.lastName);
    if (!confirm(`حذف مشتری «${name}»؟`)) return;
    try {
      await deleteData('customers', { id: c.id });
      toast.success('مشتری حذف شد');
      loadCustomers();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const getLevelInfo = (level: string) => CUSTOMER_LEVELS.find((l) => l.key === level) || CUSTOMER_LEVELS[0];

  const stats = useMemo(() => [
    {
      label: 'کل مشتریان', value: customers.length, icon: Users,
      filter: 'all',
      gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
      glow: 'rgba(37,99,235,0.25)',
    },
    {
      label: 'مشتریان حقیقی', value: customers.filter((c) => c.type === 'individual').length, icon: User,
      filter: 'individual',
      gradient: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
      glow: 'rgba(14,165,233,0.25)',
    },
    {
      label: 'مشتریان حقوقی', value: customers.filter((c) => c.type === 'company').length, icon: Building2,
      filter: 'company',
      gradient: 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)',
      glow: 'rgba(8,145,178,0.25)',
    },
  ], [customers]);

  const handleStatClick = (f: string) => {
    setFilterType(filterType === f ? 'all' : f);
  };

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری مشتریان...</p>
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
              <h1>مشتریان</h1>
            </div>
            <p>مدیریت مشتریان حقیقی و حقوقی</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/customers/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            مشتری جدید
          </Link>
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        {stats.map((stat) => (
          <button
            type="button"
            className={`nb-stat-card-v2 ${filterType === stat.filter ? 'is-active' : ''}`}
            key={stat.label}
            onClick={() => handleStatClick(stat.filter)}
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
          </button>
        ))}
      </section>

      <div className="nb-toolbar">
        <div className="nb-toolbar-left">
          <h2>همه مشتریان</h2>
          <span className="nb-count-badge">{customers.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجوی مشتری..."
            />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="nb-select-filter h-10 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه مشتریان</SelectItem>
              <SelectItem value="individual">حقیقی</SelectItem>
              <SelectItem value="company">حقوقی</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><Users className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>مشتری‌ای یافت نشد</h3>
          <p>برای شروع، اولین مشتری خود را اضافه کنید</p>
          <Link href="/dashboard/customers/new" className="nb-empty-new-btn"><Plus className="h-4 w-4" /> افزودن مشتری</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 mobile:gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
          {customers.map((c) => {
            const level = getLevelInfo(c.level);
            const name = c.type === 'company' ? c.companyName : fullName(c.firstName, c.lastName);
            return (
              <div key={c.id} className="nb-card group h-full hover:shadow-md transition-smooth">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-full shrink-0 ${c.type === 'company' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'}`}>
                    {c.type === 'company' ? <Building2 className="w-5 h-5" /> : name?.[0] || <User className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/dashboard/customers/${c.id}`}>
                      <div className="font-semibold text-slate-900 truncate group-hover:text-sky-600 transition-smooth dark:text-slate-100">{name}</div>
                    </Link>
                    <div className="text-xs text-slate-400 mt-0.5">{relativeTime(c.createdAt)}</div>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0" style={{ color: level.color, borderColor: level.color + '40' }}>
                    {level.label}
                  </Badge>
                </div>
                <div className="space-y-1.5 text-sm">
                  {c.activityType && (
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      {c.activityType}
                    </div>
                  )}
                  {c.mobile && isSuperAdmin && (
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span dir="ltr">{c.mobile}</span>
                    </div>
                  )}
                  {c.mobile && !isSuperAdmin && (
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span dir="ltr" className="tracking-widest">••••••••</span>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span dir="ltr" className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.city && (
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {c.city}
                    </div>
                  )}
                  {c.serviceTypes && c.serviceTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {c.serviceTypes.map((s) => (
                        <span key={s} className="text-[10px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 dark:bg-slate-700 dark:text-slate-300">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {c.type === 'company' ? 'مشتری حقوقی' : 'مشتری حقیقی'}
                  </span>
                  <SuperAdminActions
                    onView={() => openView(c)}
                    onEdit={() => openEdit(c)}
                    onDelete={() => handleDelete(c)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Link href="/dashboard/customers/new" className="nb-fab" aria-label="مشتری جدید">
        <Plus className="h-6 w-6" />
      </Link>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>مشاهده مشتری</DialogTitle></DialogHeader>
          {viewCustomer && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${viewCustomer.type === 'company' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'}`}>
                  {viewCustomer.type === 'company' ? <Building2 className="w-6 h-6" /> : (fullName(viewCustomer.firstName, viewCustomer.lastName))?.[0] || <User className="w-6 h-6" />}
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">{viewCustomer.type === 'company' ? viewCustomer.companyName : fullName(viewCustomer.firstName, viewCustomer.lastName)}</div>
                  <Badge variant="outline" className="text-xs mt-1" style={{ color: getLevelInfo(viewCustomer.level).color, borderColor: getLevelInfo(viewCustomer.level).color + '40' }}>{getLevelInfo(viewCustomer.level).label}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {viewCustomer.firstName && <div><span className="text-slate-400">نام:</span> <span className="font-medium">{viewCustomer.firstName}</span></div>}
                {viewCustomer.lastName && <div><span className="text-slate-400">نام خانوادگی:</span> <span className="font-medium">{viewCustomer.lastName}</span></div>}
                {viewCustomer.activityType && <div><span className="text-slate-400">نوع فعالیت:</span> <span className="font-medium">{viewCustomer.activityType}</span></div>}
                {viewCustomer.email && <div><span className="text-slate-400">ایمیل:</span> <span className="font-medium" dir="ltr">{viewCustomer.email}</span></div>}
                {viewCustomer.mobile && isSuperAdmin && <div><span className="text-slate-400">موبایل:</span> <span className="font-medium" dir="ltr">{viewCustomer.mobile}</span></div>}
                {viewCustomer.mobile && !isSuperAdmin && <div><span className="text-slate-400">موبایل:</span> <span className="font-medium tracking-widest" dir="ltr">••••••••</span></div>}
                {viewCustomer.phone && isSuperAdmin && <div><span className="text-slate-400">تلفن:</span> <span className="font-medium" dir="ltr">{viewCustomer.phone}</span></div>}
                {viewCustomer.phone && !isSuperAdmin && <div><span className="text-slate-400">تلفن:</span> <span className="font-medium tracking-widest" dir="ltr">••••••••</span></div>}
                {viewCustomer.city && <div><span className="text-slate-400">شهر:</span> <span className="font-medium">{viewCustomer.city}</span></div>}
              </div>
              {viewCustomer.additionalPhones && viewCustomer.additionalPhones.length > 0 && isSuperAdmin && (
                <div className="text-sm">
                  <span className="text-slate-400 block mb-1">شماره‌های اضافی:</span>
                  <div className="flex flex-wrap gap-2">
                    {viewCustomer.additionalPhones.map((p, i) => (
                      <span key={i} dir="ltr" className="font-medium bg-slate-50 rounded px-2 py-1 dark:bg-slate-800">{p}</span>
                    ))}
                  </div>
                </div>
              )}
              {viewCustomer.serviceTypes && viewCustomer.serviceTypes.length > 0 && (
                <div className="text-sm">
                  <span className="text-slate-400 block mb-1">خدمات دریافتی:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {viewCustomer.serviceTypes.map((s) => (
                      <span key={s} className="text-xs bg-blue-50 text-blue-700 rounded px-2 py-1 dark:bg-blue-900/20 dark:text-blue-400">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {viewCustomer.address && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <span className="text-slate-400 block mb-1">آدرس:</span>
                  {viewCustomer.address}
                </div>
              )}
              {viewCustomer.notes && (
                <div className="rounded-lg bg-amber-50 p-3 text-sm text-slate-600 dark:bg-amber-900/20 dark:text-amber-300">
                  <span className="text-slate-400 block mb-1">یادداشت:</span>
                  {viewCustomer.notes}
                </div>
              )}
              <div className="text-xs text-slate-400">ایجاد شده: {relativeTime(viewCustomer.createdAt)}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>ویرایش مشتری</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSave} className="space-y-4">
            <div className="space-y-2">
              <Label>نوع مشتری</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as 'individual' | 'company' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">حقیقی</SelectItem>
                  <SelectItem value="company">حقوقی</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.type === 'individual' ? (
              <div className="space-y-2">
                <Label>نام و نام خانوادگی</Label>
                <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="نام و نام خانوادگی" />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>نام شرکت</Label>
                <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>نوع فعالیت</Label>
                <Select value={form.activityType || 'none'} onValueChange={(v) => setForm({ ...form, activityType: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="انتخاب..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون انتخاب</SelectItem>
                    {ACTIVITY_TYPES.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>سطح مشتری</Label>
                <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CUSTOMER_LEVELS.map((l) => (
                      <SelectItem key={l.key} value={l.key}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>خدمات دریافتی</Label>
              <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                {SERVICE_TYPES.map((service) => {
                  const checked = selectedServices.includes(service);
                  return (
                    <button
                      key={service}
                      type="button"
                      onClick={() => toggleService(service)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${checked ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
                    >
                      {checked && <Check className="h-3 w-3" />}
                      {service}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>موبایل</Label>
                <input dir="ltr" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>تلفن ثابت</Label>
                <input dir="ltr" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>شماره تلفن‌های اضافی</Label>
              <div className="space-y-2">
                {additionalPhones.map((phone, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      dir="ltr"
                      className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={phone}
                      onChange={(e) => updatePhone(index, e.target.value)}
                      placeholder="شماره تلفن اضافی"
                    />
                    <button
                      type="button"
                      onClick={() => removePhone(index)}
                      className="flex items-center justify-center w-11 h-11 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-red-500 hover:border-red-300 transition-all shrink-0 dark:border-slate-700 dark:bg-slate-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addPhone}
                  className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  افزودن شماره تلفن
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>ایمیل</Label>
                <input type="email" dir="ltr" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>شهر</Label>
                <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>آدرس</Label>
              <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>یادداشت</Label>
              <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createAccount}
                  onChange={(e) => setCreateAccount(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4" />
                  تنظیم / تغییر رمز عبور مشتری
                </span>
              </label>
              {createAccount && (
                <div className="mt-2 space-y-2">
                  <Label>رمز عبور</Label>
                  <PasswordInput
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="حداقل ۶ کاراکتر"
                  />
                  <p className="text-xs text-slate-400">مشتری می‌تواند با شماره موبایل و این رمز وارد پورتال شود.</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={saving}>{saving ? 'در حال ذخیره...' : 'ذخیره'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
