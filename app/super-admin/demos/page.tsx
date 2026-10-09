'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Plus, Clock, MoreVertical, Play, Pause, RotateCcw, Trash2,
  Copy, ExternalLink, Eye, EyeOff, CheckCircle2, AlertCircle,
  Calendar, Activity, Users, RefreshCw, KeyRound,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { availablePages } from '@/lib/nav-config';
import { PLAN_LABELS } from '@/lib/constants';

interface DemoRecord {
  id: string;
  slug: string;
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  plan: string;
  status: string;
  startDate: string;
  expiryDate: string;
  durationDays: number;
  modules: string[];
  maxUsers: number;
  lastActivityAt: string | null;
  resetCount: number;
  suspendedAt: string | null;
  demoUsername: string | null;
  orgId: string | null;
  createdAt: string;
}

export default function SuperAdminDemosPage() {
  const [demos, setDemos] = useState<DemoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showModulesDialog, setShowModulesDialog] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<DemoRecord | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  // Create form
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    plan: 'starter',
    durationDays: 15,
    maxUsers: 10,
    modules: [] as string[],
  });
  const [creating, setCreating] = useState(false);
  const [createdResult, setCreatedResult] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/demo/manage');
      const data = await res.json();
      if (data.demos) setDemos(data.demos);
    } catch {
      toast.error('خطا در دریافت لیست دموها');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('نام الزامی است');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/demo/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'خطا در ایجاد دمو');
      } else {
        setCreatedResult(data);
        toast.success('دمو با موفقیت ایجاد شد');
        load();
      }
    } catch {
      toast.error('خطای ارتباط با سرور');
    }
    setCreating(false);
  };

  const handleAction = async (demoId: string, action: string, extra?: any) => {
    try {
      const res = await fetch('/api/demo/manage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demoId, action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'خطا در انجام عملیات');
      } else {
        toast.success('عملیات با موفقیت انجام شد');
        load();
      }
    } catch {
      toast.error('خطای ارتباط با سرور');
    }
  };

  const handleDelete = async (demoId: string) => {
    if (!confirm('آیا از حذف این دمو مطمئن هستید؟ تمام داده‌ها حذف خواهند شد.')) return;
    try {
      const res = await fetch(`/api/demo/manage?demoId=${demoId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'خطا در حذف دمو');
      } else {
        toast.success('دمو حذف شد');
        load();
      }
    } catch {
      toast.error('خطای ارتباط با سرور');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedDemo || newPassword.length < 6) {
      toast.error('رمز عبور باید حداقل ۶ کاراکتر باشد');
      return;
    }
    await handleAction(selectedDemo.id, 'resetPassword', { newPassword });
    setShowPasswordDialog(false);
    setNewPassword('');
    setSelectedDemo(null);
  };

  const handleUpdateModules = async () => {
    if (!selectedDemo) return;
    await handleAction(selectedDemo.id, 'updateModules', { modules: selectedModules });
    setShowModulesDialog(false);
    setSelectedDemo(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('کپی شد');
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      active: { variant: 'default', label: 'فعال' },
      expired: { variant: 'destructive', label: 'منقضی' },
      suspended: { variant: 'secondary', label: 'معلق' },
    };
    const cfg = map[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  const getDaysLeft = (expiryDate: string) => {
    const diff = new Date(expiryDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const toggleModule = (path: string) => {
    setSelectedModules((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="مدیریت دموها"
        description="ایجاد و مدیریت محیط‌های آزمایشی برای مشتریان"
        action={
          <Dialog open={showCreateDialog} onOpenChange={(v) => {
            setShowCreateDialog(v);
            if (!v) {
              setCreatedResult(null);
              setForm({ name: '', email: '', phone: '', companyName: '', plan: 'starter', durationDays: 15, maxUsers: 10, modules: [] });
            }
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 ml-2" /> دمو جدید</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{createdResult ? 'دمو ایجاد شد' : 'ایجاد دمو جدید'}</DialogTitle>
              </DialogHeader>
              {createdResult ? (
                <div className="space-y-4">
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">دمو با موفقیت ایجاد شد</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded px-3 py-2">
                        <span className="text-slate-500">آدرس ورود:</span>
                        <div className="flex items-center gap-2">
                          <code className="text-blue-600 dark:text-blue-400 text-xs">{createdResult.demoUrl}</code>
                          <Button size="sm" variant="ghost" onClick={() => copyToClipboard(createdResult.demoUrl)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded px-3 py-2">
                        <span className="text-slate-500">رمز عبور:</span>
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-sm">{showPassword ? createdResult.password : '••••••••'}</code>
                          <Button size="sm" variant="ghost" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => copyToClipboard(createdResult.password)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded px-3 py-2">
                        <span className="text-slate-500">تاریخ انقضا:</span>
                        <span className="text-sm">{new Date(createdResult.expiryDate).toLocaleDateString('fa-IR')}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Link href={createdResult.demoUrl} target="_blank">
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-4 w-4 ml-1" /> باز کردن دمو
                        </Button>
                      </Link>
                      <Button size="sm" variant="outline" onClick={() => {
                        setShowCreateDialog(false);
                        setCreatedResult(null);
                        setForm({ name: '', email: '', phone: '', companyName: '', plan: 'starter', durationDays: 15, maxUsers: 10, modules: [] });
                      }}>
                        دمو جدید
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>نام *</Label>
                      <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="نام مشتری" />
                    </div>
                    <div className="space-y-2">
                      <Label>نام شرکت</Label>
                      <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="نام شرکت" />
                    </div>
                    <div className="space-y-2">
                      <Label>ایمیل</Label>
                      <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>تلفن</Label>
                      <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="09xxxxxxxxx" />
                    </div>
                    <div className="space-y-2">
                      <Label>پلن</Label>
                      <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="starter">استارتر</SelectItem>
                          <SelectItem value="business">بیزینس</SelectItem>
                          <SelectItem value="enterprise">سازمانی</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>مدت (روز)</Label>
                      <Input type="number" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: parseInt(e.target.value) || 15 })} min={1} max={90} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>ماژول‌های قابل دسترسی</Label>
                    <div className="border rounded-lg p-3 max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availablePages.map((page) => (
                        <label key={page.path} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded px-2 py-1">
                          <Checkbox
                            checked={form.modules.includes(page.path)}
                            onCheckedChange={() => {
                              setForm((prev) => ({
                                ...prev,
                                modules: prev.modules.includes(page.path)
                                  ? prev.modules.filter((p) => p !== page.path)
                                  : [...prev.modules, page.path],
                              }));
                            }}
                          />
                          <span>{page.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>انصراف</Button>
                    <Button onClick={handleCreate} disabled={creating}>
                      {creating ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : 'ایجاد دمو'}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full" />
        </div>
      ) : demos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400">هنوز دمویی ایجاد نشده است</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {demos.map((demo) => {
            const daysLeft = getDaysLeft(demo.expiryDate);
            return (
              <Card key={demo.id} className="hover:shadow-md transition-smooth">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate">{demo.name}</h3>
                      {demo.companyName && (
                        <p className="text-xs text-slate-500 truncate">{demo.companyName}</p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => copyToClipboard(`/demo/${demo.slug}`)}>
                          <Copy className="h-4 w-4 ml-2" /> کپی آدرس
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/demo/${demo.slug}`} target="_blank">
                            <ExternalLink className="h-4 w-4 ml-2" /> باز کردن دمو
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {demo.status === 'active' && (
                          <DropdownMenuItem onClick={() => handleAction(demo.id, 'suspend')}>
                            <Pause className="h-4 w-4 ml-2" /> تعلیق
                          </DropdownMenuItem>
                        )}
                        {demo.status === 'suspended' && (
                          <DropdownMenuItem onClick={() => handleAction(demo.id, 'resume')}>
                            <Play className="h-4 w-4 ml-2" /> فعال‌سازی
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleAction(demo.id, 'extend', { extraDays: 7 })}>
                          <Calendar className="h-4 w-4 ml-2" /> تمدید ۷ روزه
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setSelectedDemo(demo);
                          setNewPassword('');
                          setShowPasswordDialog(true);
                        }}>
                          <KeyRound className="h-4 w-4 ml-2" /> تغییر رمز
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setSelectedDemo(demo);
                          setSelectedModules(demo.modules || []);
                          setShowModulesDialog(true);
                        }}>
                          <Activity className="h-4 w-4 ml-2" /> مدیریت ماژول‌ها
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction(demo.id, 'reset')}>
                          <RotateCcw className="h-4 w-4 ml-2" /> ریست داده‌ها
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(demo.id)}>
                          <Trash2 className="h-4 w-4 ml-2" /> حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {getStatusBadge(demo.status)}
                    <Badge variant="outline" className="text-xs">{PLAN_LABELS[demo.plan] || demo.plan}</Badge>
                    {daysLeft > 0 && daysLeft <= 3 && (
                      <Badge variant="destructive" className="text-xs">
                        <Clock className="h-3 w-3 ml-1" /> {daysLeft.toLocaleString('fa-IR')} روز
                      </Badge>
                    )}
                    {daysLeft > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 ml-1" /> {daysLeft.toLocaleString('fa-IR')} روز
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {demo.email && <div className="flex items-center gap-1.5 truncate"><Users className="h-3.5 w-3.5 flex-shrink-0" /> {demo.email}</div>}
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>انقضا: {new Date(demo.expiryDate).toLocaleDateString('fa-IR')}</span>
                    </div>
                    {demo.lastActivityAt && (
                      <div className="flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>آخرین فعالیت: {new Date(demo.lastActivityAt).toLocaleDateString('fa-IR')}</span>
                      </div>
                    )}
                    {demo.resetCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>ریست شده: {demo.resetCount.toLocaleString('fa-IR')} بار</span>
                      </div>
                    )}
                    {demo.modules && demo.modules.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{demo.modules.length.toLocaleString('fa-IR')} ماژول فعال</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Password Reset Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تغییر رمز عبور دمو</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>رمز عبور جدید</Label>
              <Input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="حداقل ۶ کاراکتر"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>انصراف</Button>
            <Button onClick={handleResetPassword}>تغییر رمز</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modules Dialog */}
      <Dialog open={showModulesDialog} onOpenChange={setShowModulesDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>مدیریت ماژول‌های دمو</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg p-3 max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availablePages.map((page) => (
              <label key={page.path} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded px-2 py-1">
                <Checkbox
                  checked={selectedModules.includes(page.path)}
                  onCheckedChange={() => toggleModule(page.path)}
                />
                <span>{page.label}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModulesDialog(false)}>انصراف</Button>
            <Button onClick={handleUpdateModules}>ذخیره</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}