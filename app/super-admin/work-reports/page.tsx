'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { fetchData } from '@/lib/data-client';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatJalali, relativeTime, toLocalDateString } from '@/lib/format';
import type { DailyWorkReport, MonthlyWorkReport, Profile } from '@/lib/types';
import { FileText, CalendarDays, Eye, Printer, Filter, User, ImageIcon } from 'lucide-react';

interface MonthlyReportWithImages extends MonthlyWorkReport {
  images?: { id: string; imageUrl: string }[];
  profileName?: string;
}

interface DailyReportWithProfile extends DailyWorkReport {
  profileName?: string;
}

export default function WorkReportsPage() {
  const { profile } = useAuth();
  const [dailyReports, setDailyReports] = useState<DailyReportWithProfile[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReportWithImages[]>([]);
  const [personnel, setPersonnel] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterPersonnel, setFilterPersonnel] = useState('all');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');

  const [viewReport, setViewReport] = useState<MonthlyReportWithImages | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [daily, monthly, pers] = await Promise.all([
        fetchData<DailyWorkReport>('daily_work_reports', { orderBy: { reportDate: 'desc' } }),
        fetchData<MonthlyWorkReport>('monthly_work_reports', { orderBy: { createdAt: 'desc' }, include: { images: true } }),
        fetchData<Profile>('profiles', { where: { userType: 'staff' }, orderBy: { firstName: 'asc' } }),
      ]);

      const profileMap: Record<string, string> = {};
      (pers || []).forEach((p) => {
        profileMap[p.id] = `${p.firstName || ''} ${p.lastName || ''}`.trim();
      });

      const dailyWithNames: DailyReportWithProfile[] = (daily || []).map((d) => ({
        ...d,
        profileName: profileMap[d.profileId] || '—',
      }));

      const monthlyWithNames: MonthlyReportWithImages[] = (monthly || []).map((m) => ({
        ...m,
        images: (m.images as any) || [],
        profileName: profileMap[m.profileId] || '—',
      }));

      setDailyReports(dailyWithNames);
      setMonthlyReports(monthlyWithNames);
      setPersonnel(pers || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filterByPersonnel = (profileId: string) => {
    if (filterPersonnel === 'all') return true;
    return profileId === filterPersonnel;
  };

  const filterByDateRange = (dateStr: string) => {
    const d = new Date(dateStr);
    if (filterFromDate && d < new Date(filterFromDate)) return false;
    if (filterToDate) {
      const end = new Date(filterToDate);
      end.setHours(23, 59, 59);
      if (d > end) return false;
    }
    return true;
  };

  const filteredDaily = dailyReports.filter(
    (r) => filterByPersonnel(r.profileId) && filterByDateRange(r.reportDate)
  );

  const filteredMonthly = monthlyReports.filter(
    (r) =>
      filterByPersonnel(r.profileId) &&
      (filterByDateRange(r.startDate) || filterByDateRange(r.endDate))
  );

  const openReport = (report: MonthlyReportWithImages) => {
    setViewReport(report);
    setViewOpen(true);
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
      <PageHeader title="گزارش‌های کاری پرسنل" description="مشاهده گزارش‌های روزانه و ماهانه تمام پرسنل" />

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3 text-sm font-medium text-slate-600">
            <Filter className="w-4 h-4" />
            فیلترها
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">پرسنل</Label>
              <Select value={filterPersonnel} onValueChange={setFilterPersonnel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه پرسنل</SelectItem>
                  {personnel.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">از تاریخ</Label>
              <JalaliDatePicker value={filterFromDate ? new Date(filterFromDate) : null} onChange={(d) => setFilterFromDate(d ? toLocalDateString(d) : '')} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">تا تاریخ</Label>
              <JalaliDatePicker value={filterToDate ? new Date(filterToDate) : null} onChange={(d) => setFilterToDate(d ? toLocalDateString(d) : '')} />
            </div>
          </div>
          {(filterPersonnel !== 'all' || filterFromDate || filterToDate) && (
            <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => { setFilterPersonnel('all'); setFilterFromDate(''); setFilterToDate(''); }}>
              پاک کردن فیلترها
            </Button>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="daily">
        <TabsList className="mb-4">
          <TabsTrigger value="daily" className="gap-1.5">
            <CalendarDays className="w-4 h-4" />
            گزارش روزانه
            {filteredDaily.length > 0 && <span className="text-xs text-slate-400">({filteredDaily.length.toLocaleString('fa-IR')})</span>}
          </TabsTrigger>
          <TabsTrigger value="monthly" className="gap-1.5">
            <FileText className="w-4 h-4" />
            گزارش ماهانه
            {filteredMonthly.length > 0 && <span className="text-xs text-slate-400">({filteredMonthly.length.toLocaleString('fa-IR')})</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          {filteredDaily.length === 0 ? (
            <Card><EmptyState icon={<CalendarDays className="w-8 h-8" />} title="گزارش روزانه‌ای یافت نشد" description="گزارش‌های روزانه پرسنل در این بخش نمایش داده می‌شوند" /></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>پرسنل</TableHead>
                      <TableHead>عنوان</TableHead>
                      <TableHead>تاریخ</TableHead>
                      <TableHead>زمان ثبت</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDaily.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8 shrink-0">
                              <AvatarFallback className="bg-sky-100 text-sky-700 text-xs">{(r.profileName || '؟').slice(0, 2)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-slate-700">{r.profileName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm font-medium text-slate-900">{r.title}</div>
                            {r.description && <div className="text-xs text-slate-400 max-w-md truncate mt-0.5">{r.description}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{formatJalali(r.reportDate)}</TableCell>
                        <TableCell className="text-xs text-slate-400">{relativeTime(r.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="monthly">
          {filteredMonthly.length === 0 ? (
            <Card><EmptyState icon={<FileText className="w-8 h-8" />} title="گزارش ماهانه‌ای یافت نشد" description="گزارش‌های ماهانه پرسنل در این بخش نمایش داده می‌شوند" /></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>نام و نام خانوادگی</TableHead>
                      <TableHead>کد ملی</TableHead>
                      <TableHead>بازه زمانی</TableHead>
                      <TableHead>تصاویر</TableHead>
                      <TableHead>وضعیت</TableHead>
                      <TableHead className="text-left">عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMonthly.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8 shrink-0">
                              <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">{(r.fullName || '؟').slice(0, 2)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium text-slate-900">{r.fullName}</div>
                              <div className="text-xs text-slate-400">{r.profileName}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600" dir="ltr">{r.nationalId}</TableCell>
                        <TableCell className="text-sm text-slate-600">{formatJalali(r.startDate)} تا {formatJalali(r.endDate)}</TableCell>
                        <TableCell>
                          {r.images && r.images.length > 0 ? (
                            <Badge variant="outline" className="bg-sky-50 text-sky-600">
                              <ImageIcon className="w-3 h-3 ml-1" />
                              {r.images.length.toLocaleString('fa-IR')} تصویر
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">بدون تصویر</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            r.status === 'submitted' ? 'bg-amber-50 text-amber-600' :
                            r.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                            'bg-slate-100 text-slate-500'
                          }>
                            {r.status === 'submitted' ? 'ارسال شده' : r.status === 'approved' ? 'تایید شده' : r.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="h-8 text-xs text-sky-600 hover:bg-sky-50" onClick={() => openReport(r)}>
                            <Eye className="w-4 h-4" />
                            مشاهده
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>مشاهده گزارش ماهانه</DialogTitle></DialogHeader>
          {viewReport && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-l from-slate-50 to-sky-50/50 border">
                <Avatar className="w-14 h-14">
                  <AvatarFallback className="bg-sky-100 text-sky-700 text-lg">{(viewReport.fullName || '؟').slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="text-lg font-bold text-slate-900">{viewReport.fullName}</div>
                  <div className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                    <User className="w-3.5 h-3.5" />
                    کد ملی: <span dir="ltr">{viewReport.nationalId}</span>
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-xs text-slate-400">تاریخ ثبت</div>
                  <div className="text-sm font-medium">{formatJalali(viewReport.createdAt)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border bg-white">
                  <div className="text-xs text-slate-400 mb-1">تاریخ شروع</div>
                  <div className="text-sm font-medium text-slate-700">{formatJalali(viewReport.startDate)}</div>
                </div>
                <div className="p-3 rounded-lg border bg-white">
                  <div className="text-xs text-slate-400 mb-1">تاریخ پایان</div>
                  <div className="text-sm font-medium text-slate-700">{formatJalali(viewReport.endDate)}</div>
                </div>
              </div>

              {viewReport.description && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    متن اظهارنامه / شرح کار
                  </div>
                  <div className="p-4 rounded-lg border bg-slate-50/50 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {viewReport.description}
                  </div>
                </div>
              )}

              {viewReport.images && viewReport.images.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-slate-400" />
                    تصاویر پیوست ({viewReport.images.length.toLocaleString('fa-IR')} تصویر)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {viewReport.images.map((img) => (
                      <a key={img.id} href={img.imageUrl} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border hover:shadow-md transition-shadow group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.imageUrl} alt="تصویر گزارش" className="w-full h-32 object-cover group-hover:scale-105 transition-transform" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t">
                <Button onClick={() => window.print()} className="gap-2">
                  <Printer className="w-4 h-4" />
                  چاپ گزارش
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
