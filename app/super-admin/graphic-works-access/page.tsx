'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Palette, Search, UserPlus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { GraphicWorkAccess, Profile } from '@/lib/types';

interface ProfileWithAccess extends Profile {
  graphicWorkAccess?: GraphicWorkAccess | null;
}

export default function GraphicWorksAccessPage() {
  const { profile } = useAuth();
  const [staff, setStaff] = useState<ProfileWithAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const profiles = await fetchData<ProfileWithAccess>('profiles', {
        where: { userType: 'staff' },
        orderBy: { firstName: 'asc' },
      });
      const accessRecords = await fetchData<GraphicWorkAccess>('graphic_work_access', {});
      const accessMap = new Map<string, GraphicWorkAccess>();
      (accessRecords || []).forEach((a) => accessMap.set(a.profileId, a));
      const merged = (profiles || []).map((p) => ({
        ...p,
        graphicWorkAccess: accessMap.get(p.id) || null,
      }));
      setStaff(merged);
    } catch {
      setStaff([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((s) => {
      const name = `${s.firstName || ''} ${s.lastName || ''}`.trim().toLowerCase();
      return name.includes(q) || (s.phone || '').toLowerCase().includes(q);
    });
  }, [staff, search]);

  const grantedCount = staff.filter((s) => s.graphicWorkAccess?.granted).length;

  const handleGrant = async (profileId: string) => {
    setTogglingId(profileId);
    try {
      const existing = staff.find((s) => s.id === profileId)?.graphicWorkAccess;
      if (existing) {
        await updateData('graphic_work_access', { id: existing.id }, { granted: !existing.granted });
        toast.success(existing.granted ? 'دسترسی برداشته شد' : 'دسترسی اعطا شد');
      } else {
        await createData('graphic_work_access', {
          profileId,
          granted: true,
          grantedBy: profile?.id || '',
        });
        toast.success('دسترسی اعطا شد');
      }
      load();
    } catch (e: any) {
      toast.error(e.message || 'خطا در تغییر دسترسی');
    }
    setTogglingId(null);
  };

  const handleRevoke = async (profileId: string) => {
    const existing = staff.find((s) => s.id === profileId)?.graphicWorkAccess;
    if (!existing) return;
    setTogglingId(profileId);
    try {
      await deleteData('graphic_work_access', { id: existing.id });
      toast.success('دسترسی حذف شد');
      load();
    } catch (e: any) {
      toast.error(e.message || 'خطا در حذف دسترسی');
    }
    setTogglingId(null);
  };

  const handleAddAccess = async () => {
    if (!selectedProfileId) {
      toast.error('یک کاربر را انتخاب کنید');
      return;
    }
    setSaving(true);
    try {
      const existing = staff.find((s) => s.id === selectedProfileId)?.graphicWorkAccess;
      if (existing) {
        toast.info('این کاربر قبلاً دسترسی دارد');
      } else {
        await createData('graphic_work_access', {
          profileId: selectedProfileId,
          granted: true,
          grantedBy: profile?.id || '',
        });
        toast.success('دسترسی اعطا شد');
      }
      setAddDialogOpen(false);
      setSelectedProfileId('');
      load();
    } catch (e: any) {
      toast.error(e.message || 'خطا در اعطای دسترسی');
    }
    setSaving(false);
  };

  const ungrantedStaff = staff.filter((s) => !s.graphicWorkAccess);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="دسترسی کارهای گرافیک"
        description="مدیریت دسترسی کاربران به بخش کارهای گرافیک — فقط کاربران دارای دسترسی می‌توانند وارد شوند"
        action={
          <Button onClick={() => setAddDialogOpen(true)} disabled={ungrantedStaff.length === 0}>
            <UserPlus className="h-4 w-4" />
            اعطای دسترسی
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 tnum">{staff.length.toLocaleString('fa-IR')}</div>
                <div className="text-xs text-slate-500">کل کارمندان</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 tnum">{grantedCount.toLocaleString('fa-IR')}</div>
                <div className="text-xs text-slate-500">دارای دسترسی</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 tnum">{(staff.length - grantedCount).toLocaleString('fa-IR')}</div>
                <div className="text-xs text-slate-500">بدون دسترسی</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4 relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو بر اساس نام یا ایمیل..."
          className="pr-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">کاربری یافت نشد</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((s) => {
                const name = `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'بدون نام';
                const initials = (s.firstName?.[0] || 'ن').toUpperCase();
                const hasAccess = !!s.graphicWorkAccess?.granted;
                return (
                  <div key={s.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-sky-100 text-sky-700 text-sm">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">{name}</div>
                        <div className="text-xs text-slate-400 truncate">{s.phone || '—'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant={hasAccess ? 'default' : 'secondary'} className="text-xs">
                        {hasAccess ? 'دسترسی دارد' : 'بدون دسترسی'}
                      </Badge>
                      <Switch
                        checked={hasAccess}
                        onCheckedChange={() => handleGrant(s.id)}
                        disabled={togglingId === s.id}
                      />
                      {s.graphicWorkAccess && (
                        <button
                          onClick={() => handleRevoke(s.id)}
                          disabled={togglingId === s.id}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-300 transition-colors"
                          title="حذف کامل دسترسی"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>اعطای دسترسی به کاربر</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">کاربری که می‌خواهید به بخش کارهای گرافیک دسترسی داشته باشد را انتخاب کنید.</p>
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">— انتخاب کاربر —</option>
              {ungrantedStaff.map((s) => {
                const name = `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'بدون نام';
                return (
                  <option key={s.id} value={s.id}>
                    {name} ({s.phone || '—'})
                  </option>
                );
              })}
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>انصراف</Button>
            <Button onClick={handleAddAccess} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              اعطای دسترسی
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
