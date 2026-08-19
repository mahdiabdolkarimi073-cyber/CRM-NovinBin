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
import { Plus, FileText, Calendar, Search, Eye, ImagePlus, X, ShieldCheck, Printer, ArrowRight, User } from 'lucide-react';
import { formatJalali, formatJalaliDateTime, formatFileSize, toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';
import Link from 'next/link';
import { isSuperAdminRole } from '@/lib/nav-config';

type WorkReportImage = { id: string; imageUrl: string };
type MonthlyWorkReport = {
  id: string;
  profileId: string;
  fullName: string;
  nationalId: string;
  startDate: string;
  endDate: string;
  description: string | null;
  status: string;
  createdAt: string;
  images?: WorkReportImage[];
};

type ProfileInfo = {
  id: string;
  firstName: string | null;
  lastName: string | null;
};

const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const COOLDOWN_DAYS = 20;

export default function MonthlyWorkReportsPage() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<MonthlyWorkReport[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, ProfileInfo>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [viewReport, setViewReport] = useState<MonthlyWorkReport | null>(null);
  const [form, setForm] = useState({
    fullName: '', nationalId: '', startDate: '', endDate: '', description: '',
  });

  const isSuperAdmin = isSuperAdminRole(profile?.role);

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      if (isSuperAdmin) {
        const [allReports, allProfiles] = await Promise.all([
          fetchData<MonthlyWorkReport>('monthly_work_reports', {
            orderBy: { createdAt: 'desc' },
            include: { images: true },
          }),
          fetchData<ProfileInfo>('profiles', {}),
        ]);
        setReports(allReports);
        const map: Record<string, ProfileInfo> = {};
        allProfiles.forEach((p) => { map[p.id] = p; });
        setProfileMap(map);
      } else {
        const data = await fetchData<MonthlyWorkReport>('monthly_work_reports', {
          where: { profileId: profile.id },
          orderBy: { createdAt: 'desc' },
          include: { images: true },
        });
        setReports(data);
      }
    } catch (error: any) {
      toast.error('خطا در بارگذاری گزارش‌ها');
    }
    setLoading(false);
  }, [profile?.id, isSuperAdmin]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredReports = search
    ? reports.filter((r) => {
        const s = search.toLowerCase();
        const p = profileMap[r.profileId];
        const name = p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : '';
        return r.fullName.toLowerCase().includes(s) || name.toLowerCase().includes(s);
      })
    : reports;

  const lastReportDate = reports.length > 0 ? reports[0].createdAt : null;
  const canCreate = (() => {
    if (!lastReportDate) return true;
    const daysSince = Math.floor((Date.now() - new Date(lastReportDate).getTime()) / (1000 * 60 * 60 * 24));
    return daysSince >= COOLDOWN_DAYS;
  })();
  const daysUntilNext = lastReportDate
    ? COOLDOWN_DAYS - Math.floor((Date.now() - new Date(lastReportDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid: File[] = [];
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`فرمت ${file.name} مجاز نیست. فقط JPG، PNG، GIF، WEBP`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`حجم ${file.name} بیشتر از ۵ مگابایت است`);
        continue;
      }
      valid.push(file);
    }
    if (images.length + valid.length > MAX_IMAGES) {
      toast.error(`حداکثر ${MAX_IMAGES} تصویر می‌توانید آپلود کنید`);
      return;
    }
    setImages([...images, ...valid]);
  };

  const removeImage = (idx: number) => {
    setImages(images.filter((_, i) => i !== idx));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !profile?.id) { toast.error('اطلاعات کاربری یافت نشد'); return; }
    if (!form.fullName.trim()) { toast.error('نام و نام خانوادگی را وارد کنید'); return; }
    if (!form.nationalId.trim()) { toast.error('کد ملی را وارد کنید'); return; }
    if (!form.startDate || !form.endDate) { toast.error('تاریخ شروع و پایان را انتخاب کنید'); return; }
    if (!canCreate) { toast.error(`هنوز مهلت ثبت گزارش جدید فرا نرسیده است. ${daysUntilNext} روز دیگر صبر کنید`); return; }

    setCreating(true);
    try {
      const report = await createData<MonthlyWorkReport>('monthly_work_reports', {
        profileId: profile.id,
        fullName: form.fullName.trim(),
        nationalId: form.nationalId.trim(),
        startDate: new Date(form.startDate),
        endDate: new Date(form.endDate),
        description: form.description.trim() || null,
        status: 'submitted',
      }, { images: true });

      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        await createData('work_report_images', {
          monthlyReportId: report.id,
          imageUrl: file.name,
        });
      }

      toast.success('گزارش ماهانه ثبت شد');
      setDialogOpen(false);
      setForm({ fullName: '', nationalId: '', startDate: '', endDate: '', description: '' });
      setImages([]);
      loadData();
    } catch (error: any) {
      toast.error('ایجاد ناموفق: ' + (error?.message || 'خطا'));
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
  const declarationText = viewReport
    ? `اینجانب ${viewReport.fullName} به کد ملی ${viewReport.nationalId} وضعیت پروژه تحویل گرفته را طبق گزارش کار صورت وضعیت ارائه شده اعلام می‌نمایم.`
    : '';
  const formDeclaration = `اینجانب ${form.fullName || '....'} به کد ملی ${form.nationalId || '....'} وضعیت پروژه تحویل گرفته را طبق گزارش کار صورت وضعیت ارائه شده اعلام می‌نمایم.`;

  return (
    <div>
      <PageHeader
        title={isSuperAdmin ? 'گزارشات کار ماهانه (نمای کل)' : 'گزارش کار ماهانه'}
        description={isSuperAdmin ? 'مشاهده تمام گزارش‌های ماهانه ارسال‌شده توسط کاربران' : 'ثبت گزارش ماهانه پروژه با صورت وضعیت'}
        action={isSuperAdmin ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm font-bold text-emerald-700">
            <ShieldCheck className="w-4 h-4" />
            حالت مشاهده (سوپرادمین)
          </div>
        ) : (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!canCreate}>
                <Plus className="w-4 h-4" /> گزارش جدید
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>ثبت گزارش ماهانه</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-4 text-sm text-slate-700 leading-7">
                  {formDeclaration}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>نام و نام خانوادگی *</Label>
                    <Input
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      placeholder="نام کامل"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>کد ملی *</Label>
                    <Input
                      value={form.nationalId}
                      onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                      placeholder="کد ملی"
                      dir="ltr"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>تاریخ شروع *</Label>
                    <JalaliDatePicker
                      value={form.startDate ? new Date(form.startDate) : null}
                      onChange={(d) => setForm({ ...form, startDate: d ? toLocalDateString(d) : '' })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>تاریخ پایان *</Label>
                    <JalaliDatePicker
                      value={form.endDate ? new Date(form.endDate) : null}
                      onChange={(d) => setForm({ ...form, endDate: d ? toLocalDateString(d) : '' })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>توضیحات / صورت وضعیت</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="شرح کارهای انجام‌شده در این بازه زمانی"
                    rows={5}
                  />
                </div>

                <div className="space-y-2">
                  <Label>تصاویر صورت وضعیت (حداکثر {MAX_IMAGES} تصویر، حداکثر ۵ مگابایت هر کدام)</Label>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        <ImagePlus className="w-4 h-4" /> انتخاب تصاویر
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        multiple
                        className="hidden"
                        onChange={handleImageSelect}
                      />
                    </label>
                    <span className="text-xs text-slate-400">{images.length} / {MAX_IMAGES} تصویر</span>
                  </div>
                  {images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {images.map((file, idx) => (
                        <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-full h-24 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 left-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div className="px-1 py-0.5 text-[10px] text-slate-400 truncate">{file.name}</div>
                          <div className="px-1 pb-1 text-[10px] text-slate-400">{formatFileSize(file.size)}</div>
                        </div>
                      ))}
                    </div>
                  )}
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

      {!isSuperAdmin && !canCreate && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 mb-4">
          تا ثبت گزارش بعدی {daysUntilNext > 0 ? `${daysUntilNext} روز` : 'باقی مانده است'}. هر ۲۰ روز یک‌بار می‌توانید گزارش ماهانه ثبت کنید.
        </div>
      )}

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder={isSuperAdmin ? 'جستجوی نام کاربر یا گزارش...' : 'جستجوی نام...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
        </div>
      ) : filteredReports.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<FileText className="w-8 h-8" />}
              title={isSuperAdmin ? 'هنوز گزارشی ارسال نشده' : 'گزارش ماهانه‌ای ثبت نشده'}
              description={isSuperAdmin ? 'گزارش‌های ماهانه ارسال‌شده توسط کاربران اینجا نمایش داده می‌شود' : 'اولین گزارش ماهانه خود را ثبت کنید'}
              action={!isSuperAdmin ? <Button onClick={() => setDialogOpen(true)} disabled={!canCreate}><Plus className="w-4 h-4" /> افزودن گزارش</Button> : undefined}
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
                  <TableHead>نام</TableHead>
                  <TableHead>کد ملی</TableHead>
                  <TableHead>بازه زمانی</TableHead>
                  <TableHead>تصاویر</TableHead>
                  <TableHead>تاریخ ثبت</TableHead>
                  <TableHead>مشاهده</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
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
                    <TableCell className="font-medium text-slate-800">{report.fullName}</TableCell>
                    <TableCell className="text-slate-500" dir="ltr">{report.nationalId}</TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-500">
                        {formatJalali(report.startDate)} تا {formatJalali(report.endDate)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {report.images?.length || 0} تصویر
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-400">{formatJalali(report.createdAt)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setViewReport(report)}>
                        <Eye className="w-4 h-4" /> مشاهده
                      </Button>
                    </TableCell>
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-500" />
                مشاهده گزارش ماهانه
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
                <h1 className="text-lg font-bold text-slate-900 mb-1">گزارش کار ماهانه</h1>
                <p className="text-sm text-slate-500">صورت وضعیت پروژه</p>
              </div>

              <div className="mb-6">
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-5 py-4 text-sm text-slate-800 leading-7 text-justify">
                  {declarationText}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="space-y-1">
                  <span className="text-xs text-slate-400">نام و نام خانوادگی</span>
                  <div className="text-sm font-medium text-slate-800 border-b border-slate-200 pb-2">{viewReport.fullName}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-400">کد ملی</span>
                  <div className="text-sm font-medium text-slate-800 border-b border-slate-200 pb-2" dir="ltr">{viewReport.nationalId}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-400">تاریخ شروع</span>
                  <div className="text-sm font-medium text-slate-800 border-b border-slate-200 pb-2">
                    <Calendar className="inline w-3 h-3 ml-1 text-slate-400" />
                    {formatJalali(viewReport.startDate)}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-400">تاریخ پایان</span>
                  <div className="text-sm font-medium text-slate-800 border-b border-slate-200 pb-2">
                    <Calendar className="inline w-3 h-3 ml-1 text-slate-400" />
                    {formatJalali(viewReport.endDate)}
                  </div>
                </div>
              </div>

              {viewReport.description && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">شرح کارهای انجام‌شده</h3>
                  <div className="text-sm text-slate-600 leading-7 whitespace-pre-wrap border border-slate-200 rounded-lg p-4 bg-white">
                    {viewReport.description}
                  </div>
                </div>
              )}

              {viewReport.images && viewReport.images.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">تصاویر صورت وضعیت</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {viewReport.images.map((img) => (
                      <div key={img.id} className="rounded-lg overflow-hidden border border-slate-200">
                        <img
                          src={img.imageUrl}
                          alt="صورت وضعیت"
                          className="w-full h-48 object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
