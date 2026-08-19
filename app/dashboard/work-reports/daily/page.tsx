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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Plus, FileText, Calendar, Search, ShieldCheck, Eye, Printer, ArrowRight, User } from 'lucide-react';
import { formatJalali, formatJalaliDateTime, toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';
import { isSuperAdminRole } from '@/lib/nav-config';
import Link from 'next/link';

type DailyWorkReport = {
  id: string;
  profileId: string;
  title: string;
  description: string | null;
  reportDate: string;
  createdAt: string;
};

type ProfileInfo = {
  id: string;
  firstName: string | null;
  lastName: string | null;
};

export default function DailyWorkReportsPage() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<DailyWorkReport[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, ProfileInfo>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [viewReport, setViewReport] = useState<DailyWorkReport | null>(null);
  const [form, setForm] = useState({ title: '', description: '', reportDate: '' });
  const [alreadyReportedToday, setAlreadyReportedToday] = useState(false);

  const isSuperAdmin = isSuperAdminRole(profile?.role);
  const today = toLocalDateString(new Date());
  const todayDate = new Date();

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      if (isSuperAdmin) {
        const [allReports, allProfiles] = await Promise.all([
          fetchData<DailyWorkReport>('daily_work_reports', { orderBy: { reportDate: 'desc' } }),
          fetchData<ProfileInfo>('profiles', {}),
        ]);
        setReports(allReports);
        const map: Record<string, ProfileInfo> = {};
        allProfiles.forEach((p) => { map[p.id] = p; });
        setProfileMap(map);
      } else {
        const data = await fetchData<DailyWorkReport>('daily_work_reports', {
          where: { profileId: profile.id },
          orderBy: { reportDate: 'desc' },
        });
        setReports(data);
      }
    } catch (error: any) {
      toast.error('خطا در بارگذاری گزارش‌ها');
    }
    setLoading(false);
  }, [profile?.id, isSuperAdmin]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!profile?.id || isSuperAdmin) return;
    (async () => {
      try {
        const todayReports = await fetchData<DailyWorkReport>('daily_work_reports', {
          where: { profileId: profile.id, reportDate: new Date(today) },
          take: 1,
        });
        setAlreadyReportedToday(todayReports.length > 0);
      } catch {
        setAlreadyReportedToday(false);
      }
    })();
  }, [profile?.id, isSuperAdmin, today, loadData]);

  const filtered = search
    ? reports.filter((r) => {
        const s = search.toLowerCase();
        const p = profileMap[r.profileId];
        const name = p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : '';
        return r.title.toLowerCase().includes(s) || name.toLowerCase().includes(s);
      })
    : reports;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !profile?.id) { toast.error('اطلاعات کاربری یافت نشد'); return; }
    if (!form.title.trim()) { toast.error('عنوان گزارش را وارد کنید'); return; }
    if (!form.reportDate) { toast.error('تاریخ گزارش را انتخاب کنید'); return; }
    if (form.reportDate > today) { toast.error('تاریخ گزارش نمی‌تواند در آینده باشد'); return; }

    const existing = reports.find(
      (r) => toLocalDateString(new Date(r.reportDate)) === form.reportDate
    );
    if (existing) {
      toast.error('برای این تاریخ قبلاً گزارش ثبت کرده‌اید. هر کاربر فقط یک گزارش در روز می‌تواند ثبت کند.');
      return;
    }

    setCreating(true);
    try {
      await createData('daily_work_reports', {
        profileId: profile.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        reportDate: new Date(form.reportDate),
      });
      toast.success('گزارش روزانه ثبت شد');
      setDialogOpen(false);
      setForm({ title: '', description: '', reportDate: '' });
      loadData();
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg.includes('unique') || msg.includes('23505') || msg.includes('Unique constraint')) {
        toast.error('برای این تاریخ قبلاً گزارش ثبت کرده‌اید. هر کاربر فقط یک گزارش در روز می‌تواند ثبت کند.');
      } else {
        toast.error('ایجاد ناموفق: ' + msg);
      }
    }
    setCreating(false);
  };

  const getProfileName = (pid: string) => {
    const p = profileMap[pid];
    return p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : 'نامشخص';
  };
  const getInitials = (pid: string) => {
    const p = profileMap[pid];
    if (!p) return '؟';
    return ((p.firstName?.[0] || '') + (p.lastName?.[0] || '')).toUpperCase();
  };

  const viewProfile = viewReport ? profileMap[viewReport.profileId] : null;

  return (
    <div>
      <PageHeader
        title={isSuperAdmin ? 'گزارشات کار روزانه (نمای کل)' : 'گزارش کار روزانه'}
        description={isSuperAdmin ? 'مشاهده تمام گزارش‌های روزانه ارسال‌شده توسط کاربران' : 'ثبت گزارش کارهای انجام‌شده در هر روز'}
        action={isSuperAdmin ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm font-bold text-emerald-700">
            <ShieldCheck className="w-4 h-4" />
            حالت مشاهده (سوپرادمین)
          </div>
        ) : alreadyReportedToday ? (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm font-bold text-amber-700">
            <Calendar className="w-4 h-4" />
            امروز گزارش ثبت کرده‌اید
          </div>
        ) : (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4" /> گزارش جدید</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>ثبت گزارش روزانه</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="rounded-lg bg-sky-50 border border-sky-100 px-4 py-3 text-sm text-sky-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>امروز: {formatJalali(new Date())}</span>
                </div>
                <div className="space-y-2">
                  <Label>عنوان گزارش *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="عنوان کار انجام‌شده"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>توضیحات</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="شرح کارهای انجام‌شده (می‌توانید لینک قرار دهید)"
                    rows={5}
                  />
                  <p className="text-xs text-slate-400">لینک‌ها به صورت خودکار قابل کلیک خواهند بود</p>
                </div>
                <div className="space-y-2">
                  <Label>تاریخ گزارش *</Label>
                  <JalaliDatePicker
                    value={form.reportDate ? new Date(form.reportDate) : null}
                    onChange={(d) => setForm({ ...form, reportDate: d ? toLocalDateString(d) : '' })}
                    maxDate={todayDate}
                  />
                  <p className="text-xs text-slate-400">فقط تاریخ امروز یا روزهای گذشته قابل انتخاب است. هر کاربر فقط یک گزارش در روز می‌تواند ثبت کند.</p>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
                  <Button type="submit" disabled={creating}>{creating ? 'در حال ثبت...' : 'ثبت گزارش'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />

      <div className="rounded-lg bg-sky-50 border border-sky-100 px-4 py-3 text-sm text-sky-700 flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4" />
        <span>امروز: {formatJalali(new Date())}</span>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder={isSuperAdmin ? 'جستجوی عنوان یا نام کاربر...' : 'جستجوی عنوان گزارش...'}
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
              icon={<FileText className="w-8 h-8" />}
              title={isSuperAdmin ? 'هنوز گزارشی ارسال نشده' : 'گزارشی ثبت نشده'}
              description={isSuperAdmin ? 'گزارش‌های روزانه ارسال‌شده توسط کاربران اینجا نمایش داده می‌شود' : 'اولین گزارش کار روزانه خود را ثبت کنید'}
              action={!isSuperAdmin ? <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" /> افزودن گزارش</Button> : undefined}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {isSuperAdmin && <TableHead>کاربر</TableHead>}
                  <TableHead>عنوان</TableHead>
                  <TableHead>تاریخ گزارش</TableHead>
                  <TableHead>تاریخ ثبت</TableHead>
                  {isSuperAdmin && <TableHead>مشاهده</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((report) => (
                  <TableRow key={report.id}>
                    {isSuperAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-sky-100 text-sky-700 text-[10px] font-bold">
                              {getInitials(report.profileId)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-slate-800 text-sm">{getProfileName(report.profileId)}</span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="font-medium text-slate-800">{report.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="w-3 h-3 ml-1" />
                        {formatJalali(report.reportDate)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-400">{formatJalaliDateTime(report.createdAt)}</TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setViewReport(report)}>
                          <Eye className="w-4 h-4" /> مشاهده
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Superadmin detail view dialog */}
      {viewReport && (
        <Dialog open={!!viewReport} onOpenChange={(open) => { if (!open) setViewReport(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-500" />
                مشاهده گزارش روزانه
              </DialogTitle>
            </DialogHeader>

            {viewProfile && (
              <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50/50 p-4">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-sky-100 text-sky-700 text-sm font-bold">
                    {getInitials(viewReport.profileId)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-bold text-slate-800">ارسال‌کننده:</span>
                    <span className="text-sm font-medium text-slate-700">{getProfileName(viewReport.profileId)}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    تاریخ ارسال: {formatJalaliDateTime(viewReport.createdAt)}
                  </div>
                </div>
              </div>
            )}

            {/* Report form */}
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="text-center mb-6 pb-4 border-b-2 border-slate-200">
                <h1 className="text-lg font-bold text-slate-900 mb-1">گزارش کار روزانه</h1>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-xs text-slate-400">عنوان گزارش</span>
                  <div className="text-sm font-medium text-slate-800 border-b border-slate-200 pb-2 mt-1">
                    {viewReport.title}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-400">تاریخ گزارش</span>
                  <div className="text-sm font-medium text-slate-800 border-b border-slate-200 pb-2 mt-1">
                    <Calendar className="inline w-3 h-3 ml-1 text-slate-400" />
                    {formatJalali(viewReport.reportDate)}
                  </div>
                </div>

                {viewReport.description && (
                  <div>
                    <span className="text-xs text-slate-400">شرح کارهای انجام‌شده</span>
                    <div className="text-sm text-slate-600 leading-7 whitespace-pre-wrap border border-slate-200 rounded-lg p-4 bg-slate-50/50 mt-1">
                      {viewReport.description}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
                <span>شماره گزارش: <span dir="ltr">{viewReport.id.slice(0, 8)}</span></span>
                <Button size="sm" variant="outline" onClick={() => window.print()}>
                  <Printer className="w-4 h-4" /> چاپ
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setViewReport(null)}>
                <ArrowRight className="w-4 h-4" /> بستن
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
