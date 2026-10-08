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
  Smartphone, Search, Plus, Trash2, Power, PowerOff, Clock, Globe,
  Monitor, Wifi, Loader2, MapPin, User, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { relativeTime } from '@/lib/format';

interface CustomerDevice {
  id: string;
  profileId: string;
  deviceModel: string | null;
  deviceBrand: string | null;
  osVersion: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  appVersion: string | null;
  isActive: boolean;
  lastSeenAt: string | null;
  firstSeenAt: string | null;
  deviceName: string | null;
  location: string | null;
  createdAt: string;
}

interface Profile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  fullName: string | null;
  customerType: string | null;
  userType: string;
  phone: string | null;
}

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS;
}

export default function CustomerDevicesPage() {
  const { profile } = useAuth();
  const [devices, setDevices] = useState<CustomerDevice[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'online'>('all');
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);

  const [addDialog, setAddDialog] = useState(false);
  const [addForm, setAddForm] = useState({
    profileId: '',
    deviceModel: '',
    deviceBrand: '',
    osVersion: '',
    ipAddress: '',
    deviceName: '',
    location: '',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [deviceData, profileData] = await Promise.all([
        fetchData<CustomerDevice>('customer_devices', { orderBy: { lastSeenAt: 'desc' } }),
        fetchData<Profile>('profiles', { where: { userType: 'customer' }, orderBy: { createdAt: 'desc' } }),
      ]);
      setDevices(deviceData || []);
      setProfiles(profileData || []);
    } catch {
      setDevices([]);
      setProfiles([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const profileMap = useMemo(() => {
    const m = new Map<string, Profile>();
    profiles.forEach((p) => m.set(p.id, p));
    return m;
  }, [profiles]);

  const getProfileName = (id: string) => {
    const p = profileMap.get(id);
    if (!p) return 'نامشخص';
    if (p.customerType === 'company' && p.companyName) return p.companyName;
    return p.fullName || [p.firstName, p.lastName].filter(Boolean).join(' ') || 'مشتری';
  };

  const handleToggleActive = async (device: CustomerDevice) => {
    try {
      await updateData('customer_devices', { id: device.id }, { isActive: !device.isActive });
      setDevices((prev) => prev.map((d) => d.id === device.id ? { ...d, isActive: !d.isActive } : d));
      toast.success(device.isActive ? 'دستگاه غیرفعال شد' : 'دستگاه فعال شد');
    } catch (e: any) {
      toast.error('خطا: ' + (e.message || ''));
    }
  };

  const handleDelete = async (device: CustomerDevice) => {
    if (!confirm('آیا از حذف این دستگاه مطمئن هستید؟')) return;
    try {
      await deleteData('customer_devices', { id: device.id });
      setDevices((prev) => prev.filter((d) => d.id !== device.id));
      toast.success('دستگاه حذف شد');
    } catch (e: any) {
      toast.error('خطا: ' + (e.message || ''));
    }
  };

  const handleAdd = async () => {
    if (!addForm.profileId) { toast.error('مشتری را انتخاب کنید'); return; }
    if (!addForm.deviceModel.trim()) { toast.error('مدل دستگاه را وارد کنید'); return; }
    setSaving(true);
    try {
      await createData('customer_devices', {
        profileId: addForm.profileId,
        deviceModel: addForm.deviceModel.trim(),
        deviceBrand: addForm.deviceBrand.trim() || null,
        osVersion: addForm.osVersion.trim() || null,
        ipAddress: addForm.ipAddress.trim() || null,
        deviceName: addForm.deviceName.trim() || null,
        location: addForm.location.trim() || null,
        isActive: true,
        lastSeenAt: new Date().toISOString(),
        firstSeenAt: new Date().toISOString(),
      });
      toast.success('دستگاه ثبت شد');
      setAddDialog(false);
      setAddForm({ profileId: '', deviceModel: '', deviceBrand: '', osVersion: '', ipAddress: '', deviceName: '', location: '' });
      load();
    } catch (e: any) {
      toast.error('خطا: ' + (e.message || ''));
    }
    setSaving(false);
  };

  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      if (selectedProfile && d.profileId !== selectedProfile) return false;
      if (filterStatus === 'active' && !d.isActive) return false;
      if (filterStatus === 'inactive' && d.isActive) return false;
      if (filterStatus === 'online' && !isOnline(d.lastSeenAt)) return false;
      if (search) {
        const name = getProfileName(d.profileId);
        const q = search.toLowerCase();
        return name.toLowerCase().includes(q) ||
          d.deviceModel?.toLowerCase().includes(q) ||
          d.deviceBrand?.toLowerCase().includes(q) ||
          d.ipAddress?.includes(q) ||
          d.deviceName?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [devices, search, filterStatus, selectedProfile, profileMap]);

  const stats = useMemo(() => ({
    total: devices.length,
    active: devices.filter((d) => d.isActive).length,
    online: devices.filter((d) => isOnline(d.lastSeenAt)).length,
    inactive: devices.filter((d) => !d.isActive).length,
  }), [devices]);

  const statCards = useMemo(() => [
    {
      label: 'کل دستگاه‌ها', value: stats.total, icon: Smartphone,
      filter: 'all',
      gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
      glow: 'rgba(37,99,235,0.25)',
    },
    {
      label: 'آنلاین', value: stats.online, icon: Wifi,
      filter: 'online',
      gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      glow: 'rgba(34,197,94,0.25)',
    },
    {
      label: 'فعال', value: stats.active, icon: Power,
      filter: 'active',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      glow: 'rgba(245,158,11,0.25)',
    },
    {
      label: 'غیرفعال', value: stats.inactive, icon: PowerOff,
      filter: 'inactive',
      gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      glow: 'rgba(239,68,68,0.25)',
    },
  ], [stats]);

  const handleStatClick = (f: string) => {
    setFilterStatus(filterStatus === f ? 'all' : f as any);
  };

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری دستگاه‌ها...</p>
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
              <h1>دستگاه‌های فعال</h1>
            </div>
            <p>مدیریت دستگاه‌های متصل مشتریان — مدل، IP، آخرین بازدید و وضعیت</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <button className="nb-new-btn" onClick={() => setAddDialog(true)}>
            <Plus className="h-[18px] w-[18px]" />
            ثبت دستگاه
          </button>
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        {statCards.map((stat) => (
          <button
            type="button"
            className={`nb-stat-card-v2 ${filterStatus === stat.filter ? 'is-active' : ''}`}
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
          <h2>همه دستگاه‌ها</h2>
          <span className="nb-count-badge">{filteredDevices.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو با نام، مدل، IP..."
            />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
          </div>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
            <SelectTrigger className="nb-select-filter h-10 w-[150px]"><SelectValue placeholder="وضعیت..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه دستگاه‌ها</SelectItem>
              <SelectItem value="online">آنلاین</SelectItem>
              <SelectItem value="active">فعال</SelectItem>
              <SelectItem value="inactive">غیرفعال</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredDevices.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><Smartphone className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>دستگاهی یافت نشد</h3>
          <p>هیچ دستگاهی ثبت نشده یا با فیلتر مطابقت ندارد</p>
          <button className="nb-empty-new-btn" onClick={() => setAddDialog(true)}><Plus className="h-4 w-4" /> ثبت دستگاه جدید</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 mobile:grid-cols-2 tablet:grid-cols-3 gap-3 mobile:gap-4">
          {filteredDevices.map((device) => {
            const online = isOnline(device.lastSeenAt);
            const statusColor = !device.isActive ? 'slate' : online ? 'emerald' : 'amber';
            const statusLabel = !device.isActive ? 'غیرفعال' : online ? 'آنلاین' : 'آفلاین';
            return (
              <div key={device.id} className={cn('nb-card transition-all', !device.isActive && 'opacity-60')}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center',
                      !device.isActive ? 'bg-slate-100 text-slate-400 dark:bg-slate-700' : online ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20'
                    )}>
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{device.deviceModel || 'مدل نامشخص'}</div>
                      <div className="text-[10px] mobile:text-xs text-slate-400">
                        {device.deviceBrand && `${device.deviceBrand} · `}
                        {device.osVersion || ''}
                      </div>
                    </div>
                  </div>
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] mobile:text-[10px] font-bold',
                    statusColor === 'emerald' && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
                    statusColor === 'amber' && 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
                    statusColor === 'slate' && 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
                  )}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', statusColor === 'emerald' ? 'bg-emerald-500' : statusColor === 'amber' ? 'bg-amber-500' : 'bg-slate-400')} />
                    {statusLabel}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-2.5 text-xs text-slate-500 dark:text-slate-400">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">{getProfileName(device.profileId)}</span>
                </div>

                <div className="space-y-1.5 text-[11px] mobile:text-xs text-slate-500 dark:text-slate-400 mb-3">
                  {device.ipAddress && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span dir="ltr">{device.ipAddress}</span>
                    </div>
                  )}
                  {device.deviceName && (
                    <div className="flex items-center gap-2">
                      <Monitor className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{device.deviceName}</span>
                    </div>
                  )}
                  {device.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{device.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>آخرین بازدید: {device.lastSeenAt ? relativeTime(device.lastSeenAt) : '—'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                  <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => handleToggleActive(device)}>
                    {device.isActive ? <PowerOff className="w-3.5 h-3.5 text-red-500" /> : <Power className="w-3.5 h-3.5 text-emerald-600" />}
                    {device.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 hover:bg-red-50" onClick={() => handleDelete(device)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button className="nb-fab" onClick={() => setAddDialog(true)} aria-label="ثبت دستگاه">
        <Plus className="h-6 w-6" />
      </button>

      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-sky-600" />
              ثبت دستگاه جدید
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>مشتری *</Label>
              <Select value={addForm.profileId} onValueChange={(v) => setAddForm({ ...addForm, profileId: v })}>
                <SelectTrigger><SelectValue placeholder="انتخاب مشتری..." /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.customerType === 'company' && p.companyName ? p.companyName : (p.fullName || [p.firstName, p.lastName].filter(Boolean).join(' ') || 'مشتری')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>مدل دستگاه *</Label>
                <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" placeholder="مثلاً iPhone 14 Pro" value={addForm.deviceModel} onChange={(e) => setAddForm({ ...addForm, deviceModel: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>برند</Label>
                <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" placeholder="مثلاً Apple" value={addForm.deviceBrand} onChange={(e) => setAddForm({ ...addForm, deviceBrand: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>سیستم‌عامل</Label>
                <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" placeholder="مثلاً iOS 17.2" value={addForm.osVersion} onChange={(e) => setAddForm({ ...addForm, osVersion: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>IP آدرس</Label>
                <input dir="ltr" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" placeholder="مثلاً 192.168.1.1" value={addForm.ipAddress} onChange={(e) => setAddForm({ ...addForm, ipAddress: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>نام دستگاه</Label>
                <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" placeholder="نام دلخواه" value={addForm.deviceName} onChange={(e) => setAddForm({ ...addForm, deviceName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>موقعیت</Label>
                <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" placeholder="مثلاً تهران" value={addForm.location} onChange={(e) => setAddForm({ ...addForm, location: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialog(false)}>انصراف</Button>
              <Button onClick={handleAdd} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                ثبت دستگاه
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
