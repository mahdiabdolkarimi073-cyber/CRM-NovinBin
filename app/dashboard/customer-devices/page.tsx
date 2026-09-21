'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Smartphone, Search, Plus, Trash2, Power, PowerOff, Clock, Globe,
  Monitor, Wifi, Loader2, MapPin, User,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { relativeTime, formatJalaliDateTime } from '@/lib/format';

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

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

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

  // Add device dialog
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

  const getProfileInitials = (id: string) => {
    const p = profileMap.get(id);
    if (!p) return '؟';
    if (p.customerType === 'company' && p.companyName) return p.companyName[0] || 'ش';
    const name = p.fullName || [p.firstName, p.lastName].filter(Boolean).join(' ');
    return name?.[0] || 'م';
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

  return (
    <div>
      <PageHeader
        title="دستگاه‌های فعال"
        description="مدیریت دستگاه‌های متصل مشتریان — مدل، IP، آخرین بازدید و وضعیت"
        action={
          <Button size="sm" onClick={() => setAddDialog(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> ثبت دستگاه
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 mobile:grid-cols-4 gap-3 mobile:gap-4 mb-6">
        <Card><CardContent className="p-3 mobile:p-4 flex items-center justify-between">
          <div><div className="text-[10px] mobile:text-xs text-slate-400">کل دستگاه‌ها</div><div className="text-base mobile:text-xl font-bold text-slate-900">{stats.total.toLocaleString('fa-IR')}</div></div>
          <div className="w-8 h-8 mobile:w-10 mobile:h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center"><Smartphone className="w-4 h-4 mobile:w-5 mobile:h-5" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 mobile:p-4 flex items-center justify-between">
          <div><div className="text-[10px] mobile:text-xs text-slate-400">آنلاین</div><div className="text-base mobile:text-xl font-bold text-emerald-600">{stats.online.toLocaleString('fa-IR')}</div></div>
          <div className="w-8 h-8 mobile:w-10 mobile:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Wifi className="w-4 h-4 mobile:w-5 mobile:h-5" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 mobile:p-4 flex items-center justify-between">
          <div><div className="text-[10px] mobile:text-xs text-slate-400">فعال</div><div className="text-base mobile:text-xl font-bold text-blue-600">{stats.active.toLocaleString('fa-IR')}</div></div>
          <div className="w-8 h-8 mobile:w-10 mobile:h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Power className="w-4 h-4 mobile:w-5 mobile:h-5" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 mobile:p-4 flex items-center justify-between">
          <div><div className="text-[10px] mobile:text-xs text-slate-400">غیرفعال</div><div className="text-base mobile:text-xl font-bold text-slate-500">{stats.inactive.toLocaleString('fa-IR')}</div></div>
          <div className="w-8 h-8 mobile:w-10 mobile:h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center"><PowerOff className="w-4 h-4 mobile:w-5 mobile:h-5" /></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col mobile:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="جستجو با نام، مدل، IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
          <SelectTrigger className="w-full mobile:w-[180px]"><SelectValue placeholder="وضعیت..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه دستگاه‌ها</SelectItem>
            <SelectItem value="online">آنلاین</SelectItem>
            <SelectItem value="active">فعال</SelectItem>
            <SelectItem value="inactive">غیرفعال</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Device list */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
        </div>
      ) : filteredDevices.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Smartphone className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="font-semibold text-slate-700 mb-1">دستگاهی یافت نشد</h3>
            <p className="text-sm text-slate-400 mb-4">هیچ دستگاهی ثبت نشده یا با فیلتر مطابقت ندارد</p>
            <Button onClick={() => setAddDialog(true)}><Plus className="w-4 h-4" /> ثبت دستگاه جدید</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 mobile:grid-cols-2 tablet:grid-cols-3 gap-3 mobile:gap-4">
          {filteredDevices.map((device) => {
            const online = isOnline(device.lastSeenAt);
            const statusColor = !device.isActive ? 'slate' : online ? 'emerald' : 'amber';
            const statusLabel = !device.isActive ? 'غیرفعال' : online ? 'آنلاین' : 'آفلاین';
            return (
              <Card key={device.id} className={cn('transition-all hover:shadow-md', !device.isActive && 'opacity-60')}>
                <CardContent className="p-3 mobile:p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center',
                        !device.isActive ? 'bg-slate-100 text-slate-400' : online ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      )}>
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{device.deviceModel || 'مدل نامشخص'}</div>
                        <div className="text-[10px] mobile:text-xs text-slate-400">
                          {device.deviceBrand && `${device.deviceBrand} · `}
                          {device.osVersion || ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] mobile:text-[10px] font-bold',
                        statusColor === 'emerald' && 'bg-emerald-50 text-emerald-700',
                        statusColor === 'amber' && 'bg-amber-50 text-amber-700',
                        statusColor === 'slate' && 'bg-slate-100 text-slate-500',
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', statusColor === 'emerald' ? 'bg-emerald-500' : statusColor === 'amber' ? 'bg-amber-500' : 'bg-slate-400')} />
                        {statusLabel}
                      </span>
                    </div>
                  </div>

                  {/* Owner */}
                  <div className="flex items-center gap-2 mb-2.5 text-xs text-slate-500">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-700">{getProfileName(device.profileId)}</span>
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 text-[11px] mobile:text-xs text-slate-500 mb-3">
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

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-xs"
                      onClick={() => handleToggleActive(device)}
                    >
                      {device.isActive ? <PowerOff className="w-3.5 h-3.5 text-red-500" /> : <Power className="w-3.5 h-3.5 text-emerald-600" />}
                      {device.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 hover:bg-red-50"
                      onClick={() => handleDelete(device)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Device Dialog */}
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
                <Input
                  placeholder="مثلاً iPhone 14 Pro"
                  value={addForm.deviceModel}
                  onChange={(e) => setAddForm({ ...addForm, deviceModel: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>برند</Label>
                <Input
                  placeholder="مثلاً Apple"
                  value={addForm.deviceBrand}
                  onChange={(e) => setAddForm({ ...addForm, deviceBrand: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>سیستم‌عامل</Label>
                <Input
                  placeholder="مثلاً iOS 17.2"
                  value={addForm.osVersion}
                  onChange={(e) => setAddForm({ ...addForm, osVersion: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>IP آدرس</Label>
                <Input
                  dir="ltr"
                  placeholder="مثلاً 192.168.1.1"
                  value={addForm.ipAddress}
                  onChange={(e) => setAddForm({ ...addForm, ipAddress: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>نام دستگاه</Label>
                <Input
                  placeholder="نام دلخواه"
                  value={addForm.deviceName}
                  onChange={(e) => setAddForm({ ...addForm, deviceName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>موقعیت</Label>
                <Input
                  placeholder="مثلاً تهران"
                  value={addForm.location}
                  onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                />
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
