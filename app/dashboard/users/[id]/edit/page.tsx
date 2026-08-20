'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, ImagePlus, LockKeyhole, Mail, Phone, UserRound, Upload } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { createData, fetchData, deleteData, updateData } from '@/lib/data-client';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const availablePages = [
  { path: '/dashboard/customers', label: 'مشتریان' },
  { path: '/dashboard/leads', label: 'سرنخ‌ها' },
  { path: '/dashboard/pipeline', label: 'قیف فروش' },
  { path: '/dashboard/products', label: 'محصولات' },
  { path: '/dashboard/orders', label: 'سفارشات' },
  { path: '/dashboard/invoices', label: 'فاکتورها' },
  { path: '/dashboard/tasks', label: 'وظایف' },
  { path: '/dashboard/meetings', label: 'جلسات' },
  { path: '/dashboard/tickets', label: 'تیکت‌ها' },
  { path: '/dashboard/accounting', label: 'حسابداری' },
  { path: '/dashboard/inventory', label: 'انبار' },
  { path: '/dashboard/hr', label: 'منابع انسانی' },
  { path: '/dashboard/pre-invoices', label: 'پیش‌فاکتورها' },
  { path: '/dashboard/returns', label: 'مرجوعی‌ها' },
  { path: '/dashboard/payments', label: 'پرداخت‌ها' },
  { path: '/dashboard/receipts', label: 'رسیدها' },
  { path: '/dashboard/contracts', label: 'قراردادها' },
  { path: '/dashboard/calls', label: 'تماس‌ها' },
  { path: '/dashboard/demos', label: 'دموها' },
  { path: '/dashboard/customers-chat', label: 'چت مشتریان' },
  { path: '/dashboard/work-reports/daily', label: 'گزارش روزانه' },
  { path: '/dashboard/work-reports/monthly', label: 'گزارش ماهانه' },
  { path: '/dashboard/finance-academy', label: 'آکادمی مالی' },
  { path: '/dashboard/financial-reports', label: 'گزارش‌های مالی' },
  { path: '/dashboard/customer-interactions', label: 'ارتباطات مشتری' },
  { path: '/dashboard/customer-segments', label: 'بخش‌بندی مشتری' },
  { path: '/dashboard/loyalty-rewards', label: 'جوایز باشگاه' },
  { path: '/dashboard/demo-activities', label: 'فعالیت دمو' },
  { path: '/dashboard/stock-transfers', label: 'انتقال انبار' },
  { path: '/dashboard/purchase', label: 'خرید' },
  { path: '/dashboard/approvals', label: 'تأییدها' },
  { path: '/dashboard/documents', label: 'اسناد' },
  { path: '/dashboard/knowledge', label: 'پایگاه دانش' },
  { path: '/dashboard/performance', label: 'عملکرد' },
  { path: '/dashboard/workboard', label: 'تخته کار' },
  { path: '/dashboard/organization', label: 'سازمان' },
  { path: '/dashboard/registration-approval', label: 'تأیید ثبت‌نام' },
  { path: '/dashboard/customer-assignment', label: 'تخصیص مشتری' },
  { path: '/dashboard/users', label: 'مدیریت کاربران' },
];

type Admin = { id: string; firstName: string | null; lastName: string | null; role: string };
type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: string;
  managerId: string;
  assignedPages: string[];
  active: boolean;
};

const initialForm: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  role: 'personnel',
  managerId: 'none',
  assignedPages: [],
  active: true,
};

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const userId = params.id as string;
  const [form, setForm] = useState<FormState>(initialForm);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const selectedLabels = useMemo(() => new Set(form.assignedPages), [form.assignedPages]);

  useEffect(() => {
    if (!profile || !userId) return;
    (async () => {
      try {
        const [usrs, perms, mgrs, adminList] = await Promise.all([
          fetchData<Profile & { user?: { email: string } }>('profiles', { where: { id: userId }, include: { user: { select: { email: true } } } }),
          fetchData<{ profileId: string; pagePath: string }>('page_permissions', { where: { profileId: userId } }),
          fetchData<{ userId: string; managerId: string }>('user_manager', { where: { userId } }),
          fetchData<Admin & { active: boolean }>('profiles', { where: { userType: 'staff', active: true }, orderBy: { createdAt: 'desc' } }),
        ]);

        const u = (usrs as (Profile & { user?: { email: string } })[])[0];
        if (!u) {
          toast.error('کاربر یافت نشد');
          router.push('/dashboard/users');
          return;
        }

        const permList = perms as { profileId: string; pagePath: string }[];
        const mgr = (mgrs as { userId: string; managerId: string }[])[0];

        setForm({
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          email: u.user?.email || '',
          phone: u.phone || '',
          password: '',
          confirmPassword: '',
          role: u.role,
          managerId: mgr?.managerId || 'none',
          assignedPages: permList.map((p) => p.pagePath),
          active: u.active,
        });

        if (u.avatarUrl) setAvatarPreview(u.avatarUrl);
        setAdmins((adminList as (Admin & { active: boolean })[]).filter((a) => ['owner', 'super_admin', 'admin'].includes(a.role)));
      } catch (error: any) {
        toast.error('بارگذاری اطلاعات کاربر ناموفق بود: ' + error.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile, userId, router]);

  const handleAvatar = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
  };

  const togglePage = (path: string) =>
    update('assignedPages', selectedLabels.has(path) ? form.assignedPages.filter((item) => item !== path) : [...form.assignedPages, path]);

  const selectAll = () => update('assignedPages', availablePages.map((p) => p.path));
  const clearAll = () => update('assignedPages', []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;
    if (form.password && form.password !== form.confirmPassword) {
      toast.error('رمز عبور و تکرار آن یکسان نیستند');
      return;
    }
    setSaving(true);
    try {
      if (isSuperAdmin) {
        const res = await fetch('/api/auth/update-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            email: form.email || undefined,
            password: form.password || undefined,
            firstName: form.firstName,
            lastName: form.lastName,
            phone: form.phone,
            role: form.role,
            active: form.active,
            assignedPages: form.assignedPages,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || 'ویرایش ناموفق');
          setSaving(false);
          return;
        }
      } else {
        await updateData('profiles', { id: userId }, {
          role: form.role,
          active: form.active,
          assignedPages: form.assignedPages,
        });
      }

      const oldPerms = await fetchData<{ id: string }>('page_permissions', { where: { profileId: userId } });
      for (const p of oldPerms) await deleteData('page_permissions', { id: p.id });
      for (const p of form.assignedPages) {
        await createData('page_permissions', { profileId: userId, pagePath: p, granted: true, grantedBy: profile.id });
      }

      const oldMgrs = await fetchData<{ id: string }>('user_manager', { where: { userId } });
      for (const m of oldMgrs) await deleteData('user_manager', { id: m.id });
      if (form.managerId !== 'none') {
        await createData('user_manager', { userId, managerId: form.managerId });
      }

      toast.success('کاربر با موفقیت ویرایش شد');
      router.push('/dashboard/users');
    } catch (error: any) {
      toast.error(error?.message || 'خطا در ویرایش کاربر');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="create-user-page" dir="rtl">
      <div className="create-user-header">
        <div>
          <div className="create-user-title">
            <span /> <h1>ویرایش کاربر</h1>
          </div>
          <div className="create-user-breadcrumb">
            داشبورد <b>/</b> مدیریت کاربران <b>/</b> ویرایش کاربر
          </div>
        </div>
        <button type="button" className="back-button" onClick={() => router.push('/dashboard/users')}>
          <ArrowRight size={16} /> بازگشت به لیست کاربران
        </button>
      </div>

      <form onSubmit={handleSubmit} className="create-user-card">
        <section className="user-main-grid">
          <div className="user-details-section">
            <div className="form-section-heading">
              <span /> اطلاعات اصلی
            </div>
            <div className="user-fields-grid">
              <Field label="نام" icon={<UserRound size={16} />}>
                <Input value={form.firstName} onChange={(e) => update('firstName', e.target.value)} placeholder="نام را وارد کنید" required />
              </Field>
              <Field label="نام خانوادگی" icon={<UserRound size={16} />}>
                <Input value={form.lastName} onChange={(e) => update('lastName', e.target.value)} placeholder="نام خانوادگی را وارد کنید" required />
              </Field>
              {isSuperAdmin && (
                <>
                  <Field label="ایمیل" icon={<Mail size={16} />}>
                    <Input type="email" dir="ltr" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="ایمیل کاربر را وارد کنید" />
                  </Field>
                  <Field label="تلفن همراه" icon={<Phone size={16} />}>
                    <Input dir="ltr" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="شماره موبایل را وارد کنید" />
                  </Field>
                  <Field label="رمز عبور جدید" icon={<LockKeyhole size={16} />}>
                    <PasswordInput dir="ltr" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="خالی = بدون تغییر" />
                  </Field>
                  <Field label="تکرار رمز عبور" icon={<LockKeyhole size={16} />}>
                    <PasswordInput dir="ltr" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} placeholder="تکرار رمز عبور جدید" />
                  </Field>
                </>
              )}
            </div>
            {isSuperAdmin && <p className="password-hint">در صورت پر کردن رمز عبور، رمز قبلی کاربر جایگزین می‌شود.</p>}
          </div>
          <div className="avatar-section">
            <div className="form-section-heading">
              <span /> تصویر پروفایل <small>(اختیاری)</small>
            </div>
            <label className="avatar-upload">
              {avatarPreview ? (
                <img src={avatarPreview} alt="پیش‌نمایش تصویر پروفایل" />
              ) : (
                <>
                  <div className="avatar-icon">
                    <ImagePlus size={25} />
                  </div>
                  <strong>تصویر پروفایل را انتخاب کنید</strong>
                  <small>PNG یا JPG، حداکثر ۲ مگابایت</small>
                  <span className="upload-button">
                    <Upload size={15} /> انتخاب فایل
                  </span>
                </>
              )}
              <input type="file" accept="image/png,image/jpeg" onChange={handleAvatar} />
            </label>
          </div>
        </section>

        <section className="settings-grid">
          <div className="settings-panel permissions-panel">
            <div className="form-section-heading orange">
              <span /> دسترسی‌ها
            </div>
            <p className="section-caption">ماژول‌ها و بخش‌هایی که کاربر به آن‌ها دسترسی خواهد داشت</p>
            <div className="permissions-actions">
              <button type="button" className="perm-action select-all" onClick={selectAll}>انتخاب همه</button>
              <button type="button" className="perm-action clear-all" onClick={clearAll}>پاک کردن</button>
            </div>
            <div className="permissions-list">
              {availablePages.map((page) => (
                <label key={page.path} className="permission-item">
                  <Checkbox checked={selectedLabels.has(page.path)} onCheckedChange={() => togglePage(page.path)} />
                  <span>{page.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="settings-panel">
            <div className="form-section-heading green">
              <span /> وضعیت
            </div>
            <Field label="وضعیت کاربر">
              <Select value={form.active ? 'active' : 'inactive'} onValueChange={(value) => update('active', value === 'active')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">فعال</SelectItem>
                  <SelectItem value="inactive">غیرفعال</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="settings-panel">
            <div className="form-section-heading blue">
              <span /> نقش و دسترسی
            </div>
            <Field label="نقش کاربر">
              <Select value={form.role} onValueChange={(value) => update('role', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="نقش کاربر را انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  {isSuperAdmin && (
                    <>
                      <SelectItem value="admin">مدیر</SelectItem>
                      <SelectItem value="super_admin">سوپر ادمین</SelectItem>
                    </>
                  )}
                  <SelectItem value="personnel">پرسنل</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="مدیر مستقیم (اختیاری)">
              <Select value={form.managerId} onValueChange={(value) => update('managerId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="مدیر مستقیم را انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون مدیر</SelectItem>
                  {admins.filter((admin) => admin.id !== userId).map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.firstName} {admin.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <p className="field-hint">در صورت انتخاب، این کاربر زیرمجموعه مدیر انتخاب‌شده خواهد بود.</p>
          </div>
        </section>

        <footer className="form-actions">
          <button type="button" className="cancel-button" onClick={() => router.push('/dashboard/users')}>انصراف</button>
          <button type="submit" className="submit-button" disabled={saving}>
            {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </footer>
      </form>
    </div>
  );
}

type Profile = {
  id: string;
  userType: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  active: boolean;
};

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="form-field">
      <Label>
        {icon}
        {label}
      </Label>
      {children}
    </div>
  );
}
