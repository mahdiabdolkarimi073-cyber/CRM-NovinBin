'use client';

import { useEffect, useState, useRef } from 'react';
import { fetchData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Save, Crown, Shield, Lock, Camera, Trash2, Upload, X } from 'lucide-react';
import { PasswordInput } from '@/components/ui/password-input';
import { PLAN_LABELS } from '@/lib/constants';
import { toast } from 'sonner';
import type { Organization, Profile } from '@/lib/types';

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgForm, setOrgForm] = useState({ name: '', code: '' });
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', phone: '', position: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarDeleting, setAvatarDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      try {
        const orgData = await fetchData<Organization>('organizations', { where: { id: undefined } });
        const orgRow = orgData[0] || null;
        setOrg(orgRow);
        if (orgRow) setOrgForm({ name: orgRow.name, code: orgRow.code });
        setProfileForm({
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          phone: profile.phone || '',
          position: profile.position || '',
        });
        if (profile.avatarUrl) setAvatarPreview(profile.avatarUrl);
        const staffData = await fetchData<Profile>('profiles', { where: { userType: 'staff' } });
        setStaff(staffData);
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, []);

  const saveOrg = async () => {
    if (!org) return;
    setSaving(true);
    try {
      await updateData('organizations', { id: org.id }, { name: orgForm.name });
      toast.success('اطلاعات سازمان ذخیره شد');
    } catch {
      toast.error('ذخیره ناموفق');
    }
    setSaving(false);
  };

  const changePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) {
      toast.error('رمز فعلی و رمز جدید را وارد کنید');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      toast.error('رمز جدید باید حداقل ۶ کاراکتر باشد');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('رمز جدید و تکرار آن یکسان نیستند');
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'تغییر رمز ناموفق');
        setPwSaving(false);
        return;
      }
      toast.success('رمز عبور تغییر کرد');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error?.message || 'خطا');
    }
    setPwSaving(false);
  };

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await updateData('profiles', { id: profile.id }, {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        phone: profileForm.phone,
        position: profileForm.position,
      });
      toast.success('پروفایل ذخیره شد');
      refreshProfile();
    } catch {
      toast.error('ذخیره ناموفق');
    }
    setSaving(false);
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('فرمت مجاز: JPEG، PNG، WebP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حداکثر حجم فایل ۵ مگابایت');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload/profile-image', { method: 'POST', body: formData, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'آپلود ناموفق');
        setAvatarUploading(false);
        return;
      }
      toast.success('عکس پروفایل ذخیره شد');
      setAvatarPreview(data.url);
      refreshProfile();
    } catch {
      toast.error('آپلود ناموفق');
    }
    setAvatarUploading(false);
  };

  const cancelAvatarPreview = () => {
    setAvatarPreview(profile?.avatarUrl || null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const deleteAvatar = async () => {
    setAvatarDeleting(true);
    try {
      const res = await fetch('/api/upload/profile-image', { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        toast.error('حذف ناموفق');
        setAvatarDeleting(false);
        return;
      }
      toast.success('عکس پروفایل حذف شد');
      setAvatarPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      refreshProfile();
    } catch {
      toast.error('حذف ناموفق');
    }
    setAvatarDeleting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="تنظیمات" description="مدیریت سازمان، پروفایل و کاربران" />

      <div className="grid grid-cols-1 gap-4 mobile:gap-6 tablet:grid-cols-2">
        {/* Organization */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Building2 className="w-5 h-5 text-sky-500" /> اطلاعات سازمان</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>نام سازمان</Label>
              <Input value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>کد سازمان</Label>
              <Input value={orgForm.code} disabled className="bg-slate-50" dir="ltr" />
              <p className="text-xs text-slate-400">کد سازمان قابل تغییر نیست</p>
            </div>
            <div className="grid grid-cols-1 gap-3 mobile:grid-cols-2">
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="text-xs text-slate-400 mb-1">پلن فعلی</div>
                <Badge className="bg-sky-100 text-sky-700">{PLAN_LABELS[org?.plan || 'starter']}</Badge>
              </div>
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="text-xs text-slate-400 mb-1">وضعیت اشتراک</div>
                <Badge variant="outline" className="capitalize">{org?.subscriptionStatus}</Badge>
              </div>
            </div>
            <Button onClick={saveOrg} disabled={saving}><Save className="w-4 h-4" /> ذخیره</Button>
          </CardContent>
        </Card>

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Users className="w-5 h-5 text-sky-500" /> پروفایل من</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar upload */}
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-sky-200 dark:border-slate-700 flex items-center justify-center bg-sky-50 dark:bg-slate-800">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="پروفایل" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-sky-500">
                      {(profile?.firstName?.[0] || '') + (profile?.lastName?.[0] || '')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleAvatarSelect} />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={avatarUploading || avatarDeleting}>
                  <Camera className="w-4 h-4" /> انتخاب عکس
                </Button>
                {avatarPreview && avatarPreview !== profile?.avatarUrl && (
                  <Button size="sm" onClick={uploadAvatar} disabled={avatarUploading}>
                    {avatarUploading ? <><Upload className="w-4 h-4 animate-pulse" /> در حال آپلود...</> : <><Upload className="w-4 h-4" /> ذخیره عکس</>}
                  </Button>
                )}
                {avatarPreview && avatarPreview !== profile?.avatarUrl && (
                  <Button variant="outline" size="sm" onClick={cancelAvatarPreview} disabled={avatarUploading}>
                    <X className="w-4 h-4" /> لغو
                  </Button>
                )}
                {profile?.avatarUrl && avatarPreview === profile?.avatarUrl && (
                  <Button variant="outline" size="sm" onClick={deleteAvatar} disabled={avatarDeleting}>
                    {avatarDeleting ? <><Trash2 className="w-4 h-4 animate-pulse" /> در حال حذف...</> : <><Trash2 className="w-4 h-4" /> حذف عکس</>}
                  </Button>
                )}
              </div>
              <p className="text-xs text-slate-400 text-center">فرمت‌های مجاز: JPEG، PNG، WebP - حداکثر ۵ مگابایت</p>
            </div>

            <div className="grid grid-cols-1 gap-3 mobile:grid-cols-2">
              <div className="space-y-2">
                <Label>نام</Label>
                <Input value={profileForm.firstName} onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>نام خانوادگی</Label>
                <Input value={profileForm.lastName} onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 mobile:grid-cols-2">
              <div className="space-y-2">
                <Label>تلفن</Label>
                <Input dir="ltr" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>سمت</Label>
                <Input value={profileForm.position} onChange={(e) => setProfileForm({ ...profileForm, position: e.target.value })} />
              </div>
            </div>
            <Button onClick={saveProfile} disabled={saving}><Save className="w-4 h-4" /> ذخیره پروفایل</Button>
          </CardContent>
        </Card>

        {/* Password change */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Lock className="w-5 h-5 text-sky-500" /> تغییر رمز عبور</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>رمز فعلی</Label>
              <PasswordInput dir="ltr" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} placeholder="رمز فعلی خود را وارد کنید" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>رمز جدید</Label>
                <PasswordInput dir="ltr" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} placeholder="حداقل ۶ کاراکتر" />
              </div>
              <div className="space-y-2">
                <Label>تکرار رمز جدید</Label>
                <PasswordInput dir="ltr" value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} placeholder="تکرار رمز جدید" />
              </div>
            </div>
            <p className="text-xs text-slate-400">به دلایل امنیتی، رمزهای عبور به صورت رمزنگاری‌شده ذخیره می‌شوند و قابل نمایش نیستند. رمز فعلی خود را وارد کرده و رمز جدید را تنظیم کنید.</p>
            <Button onClick={changePassword} disabled={pwSaving}><Lock className="w-4 h-4" /> {pwSaving ? 'در حال ذخیره...' : 'تغییر رمز'}</Button>
          </CardContent>
        </Card>

        {/* Staff list */}
        <Card className="tablet:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Shield className="w-5 h-5 text-sky-500" /> کاربران سازمان</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {staff.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-smooth">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-sm font-bold">
                      {(s.firstName?.[0] || '') + (s.lastName?.[0] || '')}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{s.firstName} {s.lastName}</div>
                      <div className="text-xs text-slate-400">{s.position || 'پرسنل'}</div>
                    </div>
                  </div>
                  <Badge variant={s.role === 'owner' ? 'default' : 'secondary'} className="text-xs">
                    {s.role === 'owner' ? <><Crown className="w-3 h-3 ml-1" /> مدیر</> : 'پرسنل'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
