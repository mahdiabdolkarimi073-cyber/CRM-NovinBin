'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  UserCheck, Plus, Search, User, Phone, MapPin, Eye, Pencil, Trash2,
  X, Loader2, Users, UserX,
} from 'lucide-react';
import { relativeTime } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type { MyCustomer, Profile } from '@/lib/types';

const emptyForm = {
  first_name: '',
  last_name: '',
  mobile: '',
  city: '',
  province: '',
  profile_id: '',
};

export default function MyCustomersPage() {
  const { profile } = useAuth();
  const [customers, setCustomers] = useState<MyCustomer[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterUser, setFilterUser] = useState('all');
  const [statFilter, setStatFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewCustomer, setViewCustomer] = useState<MyCustomer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<MyCustomer | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadCustomers = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const where: any = {};
      if (isSuperAdmin && filterUser !== 'all') {
        where.profileId = filterUser;
      }
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { companyName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { mobile: { contains: search, mode: 'insensitive' } },
        ];
      }
      const data = await fetchData('my_customers', { where, orderBy: { createdAt: 'desc' } });
      setCustomers((data as MyCustomer[]) || []);

      if (isSuperAdmin) {
        const staffData = await fetchData<Profile>('profiles', { where: { userType: 'staff' } });
        setStaff(staffData || []);
      }
    } catch (error: any) {
      toast.error('بارگذاری مشتریان ناموفق: ' + error.message);
    }
    setLoading(false);
  }, [profile, isSuperAdmin, filterUser, search]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!form.first_name) {
      toast.error('نام مشتری را وارد کنید');
      return;
    }
    setCreating(true);
    try {
      await createData('my_customers', {
        type: 'individual',
        firstName: form.first_name || null,
        lastName: form.last_name || null,
        mobile: form.mobile || null,
        city: form.city || null,
        province: form.province || null,
        profileId: isSuperAdmin && form.profile_id ? form.profile_id : profile.id,
      });
      toast.success('مشتری با موفقیت ایجاد شد');
      setDialogOpen(false);
      setForm(emptyForm);
      loadCustomers();
    } catch (error: any) {
      toast.error('ایجاد مشتری ناموفق: ' + error.message);
    }
    setCreating(false);
  };

  const openEdit = (c: MyCustomer) => {
    setEditingCustomer(c);
    setForm({
      first_name: c.firstName || '',
      last_name: c.lastName || '',
      mobile: c.mobile || '',
      city: c.city || '',
      province: c.province || '',
      profile_id: c.profileId,
    });
    setEditDialogOpen(true);
  };

  const openView = (c: MyCustomer) => {
    setViewCustomer(c);
    setViewDialogOpen(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setSaving(true);
    try {
      await updateData('my_customers', { id: editingCustomer.id }, {
        firstName: form.first_name || null,
        lastName: form.last_name || null,
        mobile: form.mobile || null,
        city: form.city || null,
        province: form.province || null,
      });
      toast.success('مشتری ویرایش شد');
      setEditDialogOpen(false);
      setEditingCustomer(null);
      loadCustomers();
    } catch (error: any) {
      toast.error('ویرایش ناموفق: ' + error.message);
    }
    setSaving(false);
  };

  const handleDelete = async (c: MyCustomer) => {
    const name = fullName(c.firstName, c.lastName);
    if (!confirm(`حذف مشتری «${name}»؟`)) return;
    try {
      await deleteData('my_customers', { id: c.id });
      toast.success('مشتری حذف شد');
      loadCustomers();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const getStaffName = (id: string) => {
    const s = staff.find((p) => p.id === id);
    return s ? fullName(s.firstName, s.lastName) : null;
  };

  const filteredCustomers = useMemo(() => {
    if (statFilter === 'all') return customers;
    if (statFilter === 'hasPhone') return customers.filter((c) => c.mobile);
    if (statFilter === 'noPhone') return customers.filter((c) => !c.mobile);
    return customers;
  }, [customers, statFilter]);

  const stats = useMemo(() => [
    {
      label: 'کل مشتریان', value: customers.length, icon: Users,
      filter: 'all',
      gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
      glow: 'rgba(37,99,235,0.25)',
    },
    {
      label: 'دارای موبایل', value: customers.filter((c) => c.mobile).length, icon: Phone,
      filter: 'hasPhone',
      gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      glow: 'rgba(34,197,94,0.25)',
    },
    {
      label: 'بدون موبایل', value: customers.filter((c) => !c.mobile).length, icon: UserX,
      filter: 'noPhone',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      glow: 'rgba(245,158,11,0.25)',
    },
  ], [customers]);

  const handleStatClick = (f: string) => {
    setStatFilter(statFilter === f ? 'all' : f);
  };

  const renderFormFields = () => (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>نام</Label>
          <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>نام خانوادگی</Label>
          <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>موبایل</Label>
        <input dir="ltr" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>استان</Label>
          <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>شهر</Label>
          <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
      </div>
      {isSuperAdmin && (
        <div className="space-y-2">
          <Label>اختصاص به کاربر (سوپرادمین)</Label>
          <Select value={form.profile_id} onValueChange={(v) => setForm({ ...form, profile_id: v === 'none' ? '' : v })}>
            <SelectTrigger><SelectValue placeholder="خودم" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">خودم</SelectItem>
              {staff.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {fullName(s.firstName, s.lastName)} ({s.role === 'admin' ? 'مدیر' : s.role === 'super_admin' ? 'سوپرادمین' : s.role === 'owner' ? 'مدیر سازمان' : 'پرسنل'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  );

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
              <h1>مشتریان من</h1>
            </div>
            <p>{isSuperAdmin ? 'مشتریان شخصی همه کاربران — می‌توانید برای خود یا هر کاربری مشتری اضافه کنید' : 'مشتریان شخصی شما — فقط شما و سوپرادمین این مشتریان را می‌بینند'}</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <button className="nb-new-btn" onClick={() => setDialogOpen(true)}>
            <Plus className="h-[18px] w-[18px]" />
            مشتری جدید
          </button>
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        {stats.map((stat) => (
          <button
            type="button"
            className={`nb-stat-card-v2 ${statFilter === stat.filter ? 'is-active' : ''}`}
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
          <span className="nb-count-badge">{filteredCustomers.length.toLocaleString('fa-IR')} مورد</span>
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
          {isSuperAdmin && (
            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger className="nb-select-filter h-10 w-[150px]">
                <SelectValue placeholder="همه کاربران" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه کاربران</SelectItem>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {fullName(s.firstName, s.lastName)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><UserCheck className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>مشتری‌ای یافت نشد</h3>
          <p>مشتریان شخصی خود را اینجا اضافه کنید. این مشتریان فقط برای شما و سوپرادمین قابل مشاهده هستند</p>
          <button className="nb-empty-new-btn" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> افزودن مشتری</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((c) => {
            const name = fullName(c.firstName, c.lastName);
            const ownerName = isSuperAdmin ? getStaffName(c.profileId) : null;
            return (
              <div key={c.id} className="nb-card group h-full">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 text-sm font-bold shrink-0">
                    {name?.[0] || <User className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate group-hover:text-sky-600 transition-smooth dark:text-slate-100">{name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{relativeTime(c.createdAt)}</div>
                    {ownerName && (
                      <div className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
                        <span className="text-slate-400">مالک: </span>{ownerName}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5 text-sm">
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
                  {c.city && (
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {c.province ? `${c.province}، ${c.city}` : c.city}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 gap-1">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openView(c)} title="مشاهده">
                    <Eye className="w-4 h-4 text-sky-600" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(c)} title="ویرایش">
                    <Pencil className="w-4 h-4 text-amber-600" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-50" onClick={() => handleDelete(c)} title="حذف">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button className="nb-fab" onClick={() => setDialogOpen(true)} aria-label="مشتری جدید">
        <Plus className="h-6 w-6" />
      </button>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>افزودن مشتری شخصی جدید</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {renderFormFields()}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'در حال ایجاد...' : 'ایجاد مشتری'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>مشاهده مشتری</DialogTitle></DialogHeader>
          {viewCustomer && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 text-lg font-bold">
                  {(fullName(viewCustomer.firstName, viewCustomer.lastName))?.[0] || <User className="w-6 h-6" />}
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">{fullName(viewCustomer.firstName, viewCustomer.lastName)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {viewCustomer.firstName && <div><span className="text-slate-400">نام:</span> <span className="font-medium">{viewCustomer.firstName}</span></div>}
                {viewCustomer.lastName && <div><span className="text-slate-400">نام خانوادگی:</span> <span className="font-medium">{viewCustomer.lastName}</span></div>}
                {viewCustomer.mobile && isSuperAdmin && <div><span className="text-slate-400">موبایل:</span> <span className="font-medium" dir="ltr">{viewCustomer.mobile}</span></div>}
                {viewCustomer.mobile && !isSuperAdmin && <div><span className="text-slate-400">موبایل:</span> <span className="font-medium tracking-widest" dir="ltr">••••••••</span></div>}
                {viewCustomer.province && <div><span className="text-slate-400">استان:</span> <span className="font-medium">{viewCustomer.province}</span></div>}
                {viewCustomer.city && <div><span className="text-slate-400">شهر:</span> <span className="font-medium">{viewCustomer.city}</span></div>}
              </div>
              {isSuperAdmin && viewCustomer.profileId && (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="text-slate-400">مالک: </span>{getStaffName(viewCustomer.profileId) || '—'}
                </div>
              )}
              <div className="text-xs text-slate-400">ایجاد شده: {relativeTime(viewCustomer.createdAt)}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>ویرایش مشتری</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSave} className="space-y-4">
            {renderFormFields()}
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
