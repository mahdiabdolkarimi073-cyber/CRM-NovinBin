'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  FlaskConical, Activity, CheckCircle2, XCircle, TrendingUp,
  Clock, Calendar, MousePointerClick, Eye, ChevronLeft, BarChart3,
  Filter, Zap, Target,
} from 'lucide-react';
import { formatJalali, formatJalaliDateTime, relativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';

// ============ Types ============

interface Demo {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  plan: string;
  status: 'active' | 'expired' | 'converted';
  startDate: string;
  expiryDate: string;
  createdBy: string | null;
  createdAt: string;
}

interface DemoActivity {
  id: string;
  demoId: string;
  pagePath: string;
  action: string;
  duration: number;
  metadata: any;
  createdAt: string;
}

interface Organization {
  id: string;
  name: string;
  plan: string;
  subscriptionStatus: string;
}

// ============ Constants ============

const PLAN_LABELS: Record<string, string> = {
  starter: 'استارتر',
  business: 'بیزینس',
  enterprise: 'سازمانی',
};

const STATUS_INFO: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'فعال', color: '#059669', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  expired: { label: 'منقضی', color: '#ef4444', bg: 'bg-red-50 text-red-700 border-red-200' },
  converted: { label: 'تبدیل شده', color: '#2563eb', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
};

const ACTION_INFO: Record<string, { label: string; icon: typeof Eye }> = {
  page_view: { label: 'مشاهده صفحه', icon: Eye },
  button_click: { label: 'کلیک دکمه', icon: MousePointerClick },
  form_submit: { label: 'ارسال فرم', icon: CheckCircle2 },
  login: { label: 'ورود', icon: Zap },
};

// ============ Helpers ============

function daysRemaining(expiryDate: string): number {
  const diff = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

function isExpired(d: Demo): boolean {
  return d.status === 'expired' || (d.status !== 'converted' && new Date(d.expiryDate).getTime() < Date.now());
}

function sectionFromPath(path: string): string {
  const parts = path.replace(/^\//, '').split('/');
  return parts[0] || 'home';
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec.toLocaleString('fa-IR')} ثانیه`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m.toLocaleString('fa-IR')} دقیقه و ${s.toLocaleString('fa-IR')} ثانیه` : `${m.toLocaleString('fa-IR')} دقیقه`;
}

// ============ Page ============

export default function DemoActivitiesPage() {
  const { profile } = useAuth();
  const [demos, setDemos] = useState<Demo[]>([]);
  const [activities, setActivities] = useState<DemoActivity[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDemoId, setSelectedDemoId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [d, a, o] = await Promise.all([
        fetchData<Demo>('demos', { where: {}, orderBy: { createdAt: 'desc' } }),
        fetchData<DemoActivity>('demo_activities', { where: {}, orderBy: { createdAt: 'desc' } }),
        fetchData<Organization>('organizations', {}),
      ]);
      setDemos(d);
      setActivities(a);
      setOrgs(o);
    } catch {
      setDemos([]);
      setActivities([]);
      setOrgs([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ----- Derived summary -----

  const stats = useMemo(() => {
    const totalDemos = demos.length;
    const active = demos.filter((d) => d.status === 'active' && !isExpired(d)).length;
    const expired = demos.filter((d) => isExpired(d)).length;
    // Conversion: orgs with subscriptionStatus indicating paying (active/trial won't count;
    // we treat subscriptionStatus !== 'trial' as converted-paying)
    const convertedOrgIds = new Set(
      orgs.filter((o) => o.subscriptionStatus && o.subscriptionStatus !== 'trial').map((o) => o.id)
    );
    const converted = demos.filter((d) => false || d.status === 'converted').length;
    const conversionRate = totalDemos > 0 ? Math.round((converted / totalDemos) * 100) : 0;
    return { totalDemos, active, expired, converted, conversionRate };
  }, [demos, orgs]);

  // ----- Activities for selected demo -----

  const selectedDemo = useMemo(() => demos.find((d) => d.id === selectedDemoId) || null, [demos, selectedDemoId]);

  const selectedActivities = useMemo(() => {
    if (!selectedDemoId) return [];
    return activities.filter((a) => a.demoId === selectedDemoId);
  }, [activities, selectedDemoId]);

  const activitySummary = useMemo(() => {
    if (selectedActivities.length === 0) {
      return { totalPages: 0, totalTime: 0, lastActivity: null as string | null, pageCounts: [] as { path: string; count: number }[], sectionCounts: [] as { section: string; count: number }[] };
    }
    const pageCounts = new Map<string, number>();
    const sectionCounts = new Map<string, number>();
    let totalTime = 0;
    let lastActivity: string | null = null;

    selectedActivities.forEach((a) => {
      if (a.action === 'page_view') {
        pageCounts.set(a.pagePath, (pageCounts.get(a.pagePath) || 0) + 1);
      }
      const sec = sectionFromPath(a.pagePath);
      sectionCounts.set(sec, (sectionCounts.get(sec) || 0) + 1);
      totalTime += a.duration || 0;
      if (!lastActivity || new Date(a.createdAt) > new Date(lastActivity)) {
        lastActivity = a.createdAt;
      }
    });

    return {
      totalPages: pageCounts.size,
      totalTime,
      lastActivity,
      pageCounts: Array.from(pageCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([path, count]) => ({ path, count })),
      sectionCounts: Array.from(sectionCounts.entries()).sort((a, b) => b[1] - a[1]).map(([section, count]) => ({ section, count })),
    };
  }, [selectedActivities]);

  // ----- Conversion funnel -----

  const funnel = useMemo(() => {
    const created = demos.length;
    const activeDemos = demos.filter((d) => d.status === 'active' || d.status === 'converted').length;
    const demoActivityMap = new Map<string, number>();
    activities.forEach((a) => {
      demoActivityMap.set(a.demoId, (demoActivityMap.get(a.demoId) || 0) + 1);
    });
    const engaged = demos.filter((d) => (demoActivityMap.get(d.id) || 0) >= 5).length;
    const convertedOrgIds = new Set(
      orgs.filter((o) => o.subscriptionStatus && o.subscriptionStatus !== 'trial').map((o) => o.id)
    );
    const converted = demos.filter((d) => false || d.status === 'converted').length;
    return { created, activeDemos, engaged, converted };
  }, [demos, activities, orgs]);

  // ============ Render ============

  return (
    <div>
      <PageHeader
        title="فعالیت دمو"
        description="ردیابی فعالیت دموها و نرخ تبدیل به مشتری"
      />

      {/* ===== Section 1: Summary Dashboard ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 mb-1">کل دموها</div>
              <div className="text-3xl font-bold text-slate-900">{stats.totalDemos.toLocaleString('fa-IR')}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FlaskConical className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 mb-1">دموهای فعال</div>
              <div className="text-3xl font-bold text-emerald-600">{stats.active.toLocaleString('fa-IR')}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 mb-1">دموهای منقضی</div>
              <div className="text-3xl font-bold text-red-500">{stats.expired.toLocaleString('fa-IR')}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
              <XCircle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 mb-1">نرخ تبدیل</div>
              <div className="text-3xl font-bold text-sky-600">{stats.conversionRate.toLocaleString('fa-IR')}٪</div>
              <div className="text-xs text-slate-400 mt-0.5">{stats.converted.toLocaleString('fa-IR')} از {stats.totalDemos.toLocaleString('fa-IR')}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== Section 2 & 3: Demo List + Activity Detail ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Demo List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-slate-400" /> فهرست دموها
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
                </div>
              ) : demos.length === 0 ? (
                <div className="py-16 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <FlaskConical className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="font-semibold text-slate-700 mb-1">دمویی وجود ندارد</h3>
                  <p className="text-sm text-slate-400">ابتدا از صفحه دموها یک دمو ایجاد کنید</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>نام / شرکت</TableHead>
                      <TableHead>پلن</TableHead>
                      <TableHead>وضعیت</TableHead>
                      <TableHead>شروع</TableHead>
                      <TableHead>انقضا</TableHead>
                      <TableHead>روز باقیمانده</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {demos.map((demo) => {
                      const st = STATUS_INFO[demo.status] || STATUS_INFO.active;
                      const remaining = daysRemaining(demo.expiryDate);
                      const maxDays = 15;
                      const pct = Math.min(100, (remaining / maxDays) * 100);
                      const barColor = remaining > 7 ? '#059669' : remaining >= 3 ? '#d97706' : '#ef4444';
                      const isSelected = selectedDemoId === demo.id;
                      return (
                        <TableRow
                          key={demo.id}
                          className={cn('cursor-pointer transition-colors', isSelected ? 'bg-sky-50' : 'hover:bg-slate-50')}
                          onClick={() => setSelectedDemoId(demo.id)}
                        >
                          <TableCell>
                            <div className="font-medium text-slate-800">{demo.name}</div>
                            {demo.companyName && <div className="text-xs text-slate-400">{demo.companyName}</div>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{PLAN_LABELS[demo.plan] || demo.plan}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('text-xs', st.bg)}>{st.label}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-500 whitespace-nowrap">{formatJalali(demo.startDate)}</TableCell>
                          <TableCell className="text-sm text-slate-500 whitespace-nowrap">{formatJalali(demo.expiryDate)}</TableCell>
                          <TableCell>
                            {demo.status === 'converted' ? (
                              <span className="text-xs text-blue-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> تبدیل شد
                              </span>
                            ) : isExpired(demo) ? (
                              <span className="text-xs text-slate-400">منقضی</span>
                            ) : (
                              <div className="w-24">
                                <div className={cn('text-xs font-medium mb-1')} style={{ color: barColor }}>
                                  {remaining.toLocaleString('fa-IR')} روز
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                                </div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <ChevronLeft className={cn('w-4 h-4 transition-transform', isSelected ? 'rotate-90 text-sky-600' : 'text-slate-300')} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Detail Panel */}
        <div>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-400" /> جزئیات فعالیت
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDemo ? (
                <div className="py-12 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                    <MousePointerClick className="w-7 h-7 text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-400">یک دمو را برای مشاهده فعالیت‌ها انتخاب کنید</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Selected demo header */}
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="font-semibold text-slate-900 text-sm">{selectedDemo.name}</div>
                    {selectedDemo.companyName && <div className="text-xs text-slate-400">{selectedDemo.companyName}</div>}
                  </div>

                  {/* Summary stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center rounded-lg border border-slate-100 p-2">
                      <Eye className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                      <div className="text-lg font-bold text-slate-900">{activitySummary.totalPages.toLocaleString('fa-IR')}</div>
                      <div className="text-[10px] text-slate-400">صفحه بازدید</div>
                    </div>
                    <div className="text-center rounded-lg border border-slate-100 p-2">
                      <Clock className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                      <div className="text-sm font-bold text-slate-900 leading-tight">{formatDuration(activitySummary.totalTime)}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">زمان کل</div>
                    </div>
                    <div className="text-center rounded-lg border border-slate-100 p-2">
                      <Activity className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                      <div className="text-lg font-bold text-slate-900">{selectedActivities.length.toLocaleString('fa-IR')}</div>
                      <div className="text-[10px] text-slate-400">فعالیت</div>
                    </div>
                  </div>

                  {activitySummary.lastActivity && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      آخرین فعالیت: {relativeTime(activitySummary.lastActivity)}
                    </div>
                  )}

                  {/* Page views by section — bar chart */}
                  {activitySummary.sectionCounts.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5" /> بازدید بر اساس بخش
                      </div>
                      <div className="space-y-2">
                        {activitySummary.sectionCounts.slice(0, 6).map(({ section, count }) => {
                          const max = activitySummary.sectionCounts[0].count || 1;
                          const w = Math.max(4, (count / max) * 100);
                          return (
                            <div key={section} className="flex items-center gap-2">
                              <div className="w-16 text-xs text-slate-500 truncate" dir="ltr">{section}</div>
                              <div className="flex-1 h-5 rounded bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full rounded bg-gradient-to-l from-blue-500 to-sky-400 transition-all flex items-center px-1.5"
                                  style={{ width: `${w}%` }}
                                >
                                  <span className="text-[10px] font-medium text-white">{count.toLocaleString('fa-IR')}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Most viewed pages */}
                  {activitySummary.pageCounts.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" /> پرترین بازدیدها
                      </div>
                      <div className="space-y-1.5">
                        {activitySummary.pageCounts.map(({ path, count }) => (
                          <div key={path} className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 truncate" dir="ltr">{path}</span>
                            <Badge variant="secondary" className="text-[10px] shrink-0 mr-2">{count.toLocaleString('fa-IR')}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Activity timeline */}
                  <div>
                    <div className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> فعالیت‌های اخیر
                    </div>
                    {selectedActivities.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">فعالیتی ثبت نشده</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto pl-1">
                        {selectedActivities.slice(0, 15).map((a) => {
                          const ai = ACTION_INFO[a.action] || { label: a.action, icon: Activity };
                          const Icon = ai.icon;
                          return (
                            <div key={a.id} className="flex items-start gap-2.5 text-xs">
                              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-slate-700 truncate" dir="ltr">{a.pagePath}</div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                  <span>{ai.label}</span>
                                  {a.duration > 0 && <span>• {formatDuration(a.duration)}</span>}
                                  <span>• {relativeTime(a.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ===== Section 4: Conversion Funnel ===== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-slate-400" /> قیف تبدیل
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
            </div>
          ) : stats.totalDemos === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">برای نمایش قیف تبدیل، دمو ایجاد کنید</div>
          ) : (
            <div className="space-y-4 max-w-2xl mx-auto">
              {[
                { label: 'ایجاد شده', count: funnel.created, total: funnel.created, color: 'bg-blue-600', textColor: 'text-white', w: 100 },
                { label: 'فعال', count: funnel.activeDemos, total: funnel.created, color: 'bg-blue-500', textColor: 'text-white', w: 85 },
                { label: 'درگیر (۵+ فعالیت)', count: funnel.engaged, total: funnel.created, color: 'bg-sky-400', textColor: 'text-sky-900', w: 65 },
                { label: 'تبدیل شده', count: funnel.converted, total: funnel.created, color: 'bg-sky-300', textColor: 'text-sky-900', w: 40 },
              ].map((stage, i) => {
                const pct = stage.total > 0 ? Math.round((stage.count / stage.total) * 100) : 0;
                return (
                  <div key={stage.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center">
                          {(i + 1).toLocaleString('fa-IR')}
                        </span>
                        <span className="text-sm font-medium text-slate-700">{stage.label}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-bold text-slate-900">{stage.count.toLocaleString('fa-IR')}</span>
                        <span className="text-slate-400">{pct.toLocaleString('fa-IR')}٪</span>
                      </div>
                    </div>
                    <div className="h-9 rounded-lg bg-slate-100 overflow-hidden">
                      <div
                        className={cn('h-full rounded-lg flex items-center px-4 transition-all', stage.color)}
                        style={{ width: `${Math.max(8, (stage.count / (stage.total || 1)) * stage.w)}%` }}
                      >
                        <span className={cn('text-xs font-medium', stage.textColor)}>{pct.toLocaleString('fa-IR')}٪</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-2">
                <TrendingUp className="w-3.5 h-3.5" />
                نرخ تبدیل نهایی: {stats.conversionRate.toLocaleString('fa-IR')}٪
                <span className="text-slate-300">|</span>
                {stats.converted.toLocaleString('fa-IR')} از {stats.totalDemos.toLocaleString('fa-IR')} دمو
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
