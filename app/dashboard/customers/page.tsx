'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { SuperAdminActions } from '@/components/dashboard/super-admin-actions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Search, Building2, User, Phone, Mail, MapPin, Briefcase, Award, Check, X } from 'lucide-react';
import { relativeTime } from '@/lib/format';
import { fullName, CUSTOMER_LEVELS, SERVICE_TYPES, ACTIVITY_TYPES } from '@/lib/constants';
import { toast } from 'sonner';
import type { Customer } from '@/lib/types';

export default function CustomersPage() {
  const { profile } = useAuth();
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
      toast.success('مشتری ویرایش شد');
      setEditDialogOpen(false);
      setEditingCustomer(null);
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

  return (
    <div>
      <PageHeader
        title="مشتریان"
        description="مدیریت مشتریان حقیقی و حقوقی"
        action={
          <Link href="/dashboard/customers/new">
            <Button size="sm">
              <Plus className="w-4 h-4" />
              مشتری جدید
            </Button>
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="جستجو مشتری..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه مشتریان</SelectItem>
            <SelectItem value="individual">حقیقی</SelectItem>
            <SelectItem value="company">حقوقی</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
        </div>
      ) : customers.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="w-8 h-8" />}
            title="مشتری‌ای یافت نشد"
            description="برای شروع، اولین مشتری خود را اضافه کنید"
            action={
              <Link href="/dashboard/customers/new">
                <Button>
                  <Plus className="w-4 h-4" />
                  افزودن مشتری
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c) => {
            const level = getLevelInfo(c.level);
            const name = c.type === 'company' ? c.companyName : fullName(c.firstName, c.lastName);
            return (
              <Card key={c.id} className="hover:shadow-md transition-smooth group h-full">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="w-11 h-11">
                      <AvatarFallback className={c.type === 'company' ? 'bg-blue-100 text-blue-700' : 'bg-sky-100 text-sky-700'}>
                        {c.type === 'company' ? <Building2 className="w-5 h-5" /> : name?.[0] || <User className="w-5 h-5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <Link href={`/dashboard/customers/${c.id}`}>
                        <div className="font-semibold text-slate-900 truncate group-hover:text-sky-600 transition-smooth">{name}</div>
                      </Link>
                      <div className="text-xs text-slate-400 mt-0.5">{relativeTime(c.createdAt)}</div>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0" style={{ color: level.color, borderColor: level.color + '40' }}>
                      {level.label}
                    </Badge>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    {c.activityType && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        {c.activityType}
                      </div>
                    )}
                    {c.mobile && isSuperAdmin && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span dir="ltr">{c.mobile}</span>
                      </div>
                    )}
                    {c.mobile && !isSuperAdmin && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span dir="ltr" className="tracking-widest">••••••••</span>
                      </div>
                    )}
                    {c.email && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span dir="ltr" className="truncate">{c.email}</span>
                      </div>
                    )}
                    {c.city && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {c.city}
                      </div>
                    )}
                    {c.serviceTypes && c.serviceTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {c.serviceTypes.map((s) => (
                          <span key={s} className="text-[10px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-400">
                      {c.type === 'company' ? 'مشتری حقوقی' : 'مشتری حقیقی'}
                    </span>
                    <SuperAdminActions
                      onView={() => openView(c)}
                      onEdit={() => openEdit(c)}
                      onDelete={() => handleDelete(c)}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>مشاهده مشتری</DialogTitle></DialogHeader>
          {viewCustomer && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className={viewCustomer.type === 'company' ? 'bg-blue-100 text-blue-700' : 'bg-sky-100 text-sky-700'}>
                    {viewCustomer.type === 'company' ? <Building2 className="w-6 h-6" /> : (fullName(viewCustomer.firstName, viewCustomer.lastName))?.[0] || <User className="w-6 h-6" />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-bold text-slate-900">{viewCustomer.type === 'company' ? viewCustomer.companyName : fullName(viewCustomer.firstName, viewCustomer.lastName)}</div>
                  <Badge variant="outline" className="text-xs mt-1" style={{ color: getLevelInfo(viewCustomer.level).color, borderColor: getLevelInfo(viewCustomer.level).color + '40' }}>{getLevelInfo(viewCustomer.level).label}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
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
                      <span key={i} dir="ltr" className="font-medium bg-slate-50 rounded px-2 py-1">{p}</span>
                    ))}
                  </div>
                </div>
              )}
              {viewCustomer.serviceTypes && viewCustomer.serviceTypes.length > 0 && (
                <div className="text-sm">
                  <span className="text-slate-400 block mb-1">خدمات دریافتی:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {viewCustomer.serviceTypes.map((s) => (
                      <span key={s} className="text-xs bg-blue-50 text-blue-700 rounded px-2 py-1">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {viewCustomer.address && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  <span className="text-slate-400 block mb-1">آدرس:</span>
                  {viewCustomer.address}
                </div>
              )}
              {viewCustomer.notes && (
                <div className="rounded-lg bg-amber-50 p-3 text-sm text-slate-600">
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
                <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="نام و نام خانوادگی" />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>نام شرکت</Label>
                <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
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
              <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-3">
                {SERVICE_TYPES.map((service) => {
                  const checked = selectedServices.includes(service);
                  return (
                    <button
                      key={service}
                      type="button"
                      onClick={() => toggleService(service)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${checked ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'}`}
                    >
                      {checked && <Check className="h-3 w-3" />}
                      {service}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>موبایل</Label>
                <Input dir="ltr" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>تلفن ثابت</Label>
                <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>شماره تلفن‌های اضافی</Label>
              <div className="space-y-2">
                {additionalPhones.map((phone, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      dir="ltr"
                      value={phone}
                      onChange={(e) => updatePhone(index, e.target.value)}
                      placeholder="شماره تلفن اضافی"
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removePhone(index)}
                      className="flex items-center justify-center w-11 h-11 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-red-500 hover:border-red-300 transition-all shrink-0"
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>ایمیل</Label>
                <Input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>شهر</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>آدرس</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>یادداشت</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
