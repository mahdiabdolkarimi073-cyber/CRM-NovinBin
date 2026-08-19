'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
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
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Plus, FlaskConical, Search, Calendar, Clock, CheckCircle, Link2, Copy, Eye, EyeOff, KeyRound } from 'lucide-react';
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

  const filtered = search
    ? demos.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()))
    : demos;

  const today = toLocalDateString(new Date());

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

  const daysRemaining = (expiryDate: string): number => {
    const diff = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  return (
    <div>
      <PageHeader
        title="دموها"
        description="مدیریت نسخه‌های دموی ۱۵ روزه با لینک اختصاصی برای هر مشتری"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4" /> دموی جدید</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
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
                    <Input
                      type="email"
                      dir="ltr"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>تلفن</Label>
                    <Input
                      dir="ltr"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="09123456789"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>نام شرکت</Label>
                  <Input
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    placeholder="نام شرکت (اختیاری)"
                  />
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
                <div className="rounded-lg bg-sky-50 border border-sky-100 px-4 py-3 text-sm text-sky-700 flex items-start gap-2">
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
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="جستجوی نام..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<FlaskConical className="w-8 h-8" />}
              title="دمویی ایجاد نشده"
              description="اولین نسخه دموی ۱۵ روزه را ایجاد کنید"
              action={<Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" /> افزودن دمو</Button>}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نام</TableHead>
                  <TableHead>شرکت</TableHead>
                  <TableHead>پلن</TableHead>
                  <TableHead>تاریخ شروع</TableHead>
                  <TableHead>تاریخ انقضا</TableHead>
                  <TableHead>روزهای باقیمانده</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead>لینک اختصاصی</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((demo) => {
                  const st = STATUS_INFO[demo.status] || STATUS_INFO.active;
                  const remaining = daysRemaining(demo.expiryDate);
                  const info = accessMap[demo.id];
                  return (
                    <TableRow key={demo.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-slate-800">{demo.name}</div>
                          {demo.email && <div className="text-xs text-slate-400" dir="ltr">{demo.email}</div>}
                          {demo.phone && <div className="text-xs text-slate-400" dir="ltr">{demo.phone}</div>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">{demo.companyName || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{PLAN_LABELS[demo.plan] || demo.plan}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatJalali(demo.startDate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatJalali(demo.expiryDate)}
                        </span>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{ color: st.color, borderColor: st.color + '40' }}
                          className="text-xs"
                        >
                          {st.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {info ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => { setAccessDemo({ demo, info }); setShowPassword(false); }}
                          >
                            <Link2 className="w-3.5 h-3.5" />
                            مشاهده لینک
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
              <div className="text-sm text-slate-500">
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
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => handleCopyLink(accessDemo.info.username)}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-500">نام کاربری</Label>
                <div className="flex items-center gap-2">
                  <Input dir="ltr" readOnly value={accessDemo.info.username} />
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => handleCopy(accessDemo.info.username, 'نام کاربری')}
                  >
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
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => handleCopy(accessDemo.info.password, 'رمز عبور')}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700">
                این دمو تا {formatJalali(accessDemo.demo.expiryDate)} فعال است ({daysRemaining(accessDemo.demo.expiryDate).toLocaleString('fa-IR')} روز باقیمانده).
              </div>

              <Button
                className="w-full"
                onClick={() => handleCopyAll(accessDemo.info)}
              >
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
