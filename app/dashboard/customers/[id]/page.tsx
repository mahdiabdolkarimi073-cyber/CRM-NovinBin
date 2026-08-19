'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchData } from '@/lib/data-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Building2, User, Phone, Mail, MapPin, ArrowRight,
  ShoppingCart, FileText, CheckSquare, Calendar, MessageSquare,
  Award, Activity, Edit, Star
} from 'lucide-react';
import { formatToman, formatJalali, relativeTime } from '@/lib/format';
import { fullName, CUSTOMER_LEVELS, ORDER_STATUSES, INVOICE_STATUSES, TASK_STATUSES, TASK_PRIORITIES, TICKET_STATUSES } from '@/lib/constants';
import type { Customer, Order, Invoice, Task, Meeting, Ticket } from '@/lib/types';

const statusInfo = (statuses: { key: string; label: string; color: string }[], key: string) =>
  statuses.find((s) => s.key === key) || statuses[0];

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [custArr, ords, invs, tks, mtgs, tkts] = await Promise.all([
        fetchData('customers', { where: { id: customerId } }),
        fetchData('orders', { where: { customerId }, orderBy: { createdAt: 'desc' } }),
        fetchData('invoices', { where: { customerId }, orderBy: { createdAt: 'desc' } }),
        fetchData('tasks', { where: { customerId }, orderBy: { createdAt: 'desc' } }),
        fetchData('meetings', { orderBy: { createdAt: 'desc' }, take: 10 }),
        fetchData('tickets', { where: { customerId }, orderBy: { createdAt: 'desc' } }),
      ]);
      setCustomer(custArr[0] || null);
      setOrders(ords || []);
      setInvoices(invs || []);
      setTasks(tks || []);
      setMeetings(mtgs || []);
      setTickets(tkts || []);
    } catch (error) {
      console.error('Load error:', error);
    }
    setLoading(false);
  }, [customerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">مشتری یافت نشد</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/customers')}>
          بازگشت به لیست
        </Button>
      </div>
    );
  }

  const level = CUSTOMER_LEVELS.find((l) => l.key === customer.level) || CUSTOMER_LEVELS[0];
  const name = customer.type === 'company' ? customer.companyName : fullName(customer.firstName, customer.lastName);
  const totalOrders = orders.reduce((s, o) => s + Number(o.total), 0);
  const totalPaid = invoices.reduce((s, i) => s + Number(i.paid), 0);
  const totalDue = invoices.reduce((s, i) => s + (Number(i.amount) - Number(i.paid)), 0);

  return (
    <div>
      {/* Back */}
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push('/dashboard/customers')}>
        <ArrowRight className="w-4 h-4" />
        بازگشت
      </Button>

      {/* Profile header */}
      <Card className="mb-6 overflow-hidden">
        <div className="h-24 bg-gradient-to-l from-sky-500 to-blue-700" />
        <CardContent className="p-6 -mt-12">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div className="flex items-end gap-4">
              <Avatar className="w-20 h-20 border-4 border-white shadow-lg">
                <AvatarFallback className={customer.type === 'company' ? 'bg-blue-100 text-blue-700 text-2xl' : 'bg-sky-100 text-sky-700 text-2xl'}>
                  {customer.type === 'company' ? <Building2 className="w-9 h-9" /> : name?.[0] || <User className="w-9 h-9" />}
                </AvatarFallback>
              </Avatar>
              <div className="mb-2">
                <h1 className="text-2xl font-bold text-slate-900">{name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" style={{ color: level.color, borderColor: level.color + '40' }}>
                    <Star className="w-3 h-3 ml-1" />
                    {level.label}
                  </Badge>
                  <span className="text-sm text-slate-400">
                    {customer.type === 'company' ? 'مشتری حقوقی' : 'مشتری حقیقی'}
                  </span>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4" />
              ویرایش
            </Button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="p-3 rounded-lg bg-slate-50">
              <div className="text-xs text-slate-400 mb-1">تعداد سفارش</div>
              <div className="text-lg font-bold text-slate-900">{orders.length.toLocaleString('fa-IR')}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50">
              <div className="text-xs text-slate-400 mb-1">مجموع خرید</div>
              <div className="text-lg font-bold text-slate-900">{formatToman(totalOrders)} ت</div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50">
              <div className="text-xs text-emerald-600 mb-1">پرداخت شده</div>
              <div className="text-lg font-bold text-emerald-700">{formatToman(totalPaid)} ت</div>
            </div>
            <div className="p-3 rounded-lg bg-red-50">
              <div className="text-xs text-red-600 mb-1">باقی‌مانده</div>
              <div className="text-lg font-bold text-red-700">{formatToman(totalDue)} ت</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList className="w-full justify-start overflow-x-auto h-auto py-1">
          <TabsTrigger value="info" className="gap-1.5"><User className="w-4 h-4" /> اطلاعات</TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5"><ShoppingCart className="w-4 h-4" /> سفارشات</TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5"><FileText className="w-4 h-4" /> فاکتورها</TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5"><CheckSquare className="w-4 h-4" /> وظایف</TabsTrigger>
          <TabsTrigger value="meetings" className="gap-1.5"><Calendar className="w-4 h-4" /> جلسات</TabsTrigger>
          <TabsTrigger value="tickets" className="gap-1.5"><MessageSquare className="w-4 h-4" /> تیکت‌ها</TabsTrigger>
          <TabsTrigger value="loyalty" className="gap-1.5"><Award className="w-4 h-4" /> باشگاه</TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5"><Activity className="w-4 h-4" /> فعالیت</TabsTrigger>
        </TabsList>

        {/* Info */}
        <TabsContent value="info">
          <Card>
            <CardHeader><CardTitle className="text-base">اطلاعات تماس</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow icon={Phone} label="موبایل" value={customer.mobile} ltr />
                <InfoRow icon={Phone} label="تلفن" value={customer.phone} ltr />
                <InfoRow icon={Mail} label="ایمیل" value={customer.email} ltr />
                <InfoRow icon={MapPin} label="شهر" value={customer.city} />
                <InfoRow icon={MapPin} label="استان" value={customer.province} />
                <InfoRow icon={MapPin} label="کد پستی" value={customer.postalCode} ltr />
              </div>
              {customer.address && (
                <div>
                  <Separator className="my-3" />
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <div className="text-slate-400 text-xs mb-1">آدرس کامل</div>
                      <div className="text-slate-700">{customer.address}</div>
                    </div>
                  </div>
                </div>
              )}
              <Separator className="my-3" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-slate-400 mb-1">کد ملی / شناسه</div>
                  <div className="text-sm font-medium" dir="ltr">{customer.nationalId || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">منبع جذب</div>
                  <div className="text-sm font-medium">{customer.source || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">تاریخ ثبت</div>
                  <div className="text-sm font-medium">{formatJalali(customer.createdAt)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders */}
        <TabsContent value="orders">
          <Card>
            <CardHeader><CardTitle className="text-base">سفارشات مشتری</CardTitle></CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">سفارشی ثبت نشده است</p>
              ) : (
                <div className="space-y-2">
                  {orders.map((o) => {
                    const st = statusInfo(ORDER_STATUSES, o.status);
                    return (
                      <div key={o.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-smooth">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                            <ShoppingCart className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">سفارش {o.number || o.id.slice(0, 8)}</div>
                            <div className="text-xs text-slate-400">{formatJalali(o.createdAt)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold">{formatToman(Number(o.total))} ت</span>
                          <Badge style={{ backgroundColor: st.color + '20', color: st.color }}>{st.label}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader><CardTitle className="text-base">فاکتورها</CardTitle></CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">فاکتوری ثبت نشده است</p>
              ) : (
                <div className="space-y-2">
                  {invoices.map((inv) => {
                    const st = statusInfo(INVOICE_STATUSES, inv.status);
                    return (
                      <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-smooth">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">فاکتور {inv.number}</div>
                            <div className="text-xs text-slate-400">{formatJalali(inv.issueDate)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold">{formatToman(Number(inv.amount))} ت</span>
                          <Badge style={{ backgroundColor: st.color + '20', color: st.color }}>{st.label}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader><CardTitle className="text-base">وظایف مرتبط</CardTitle></CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">وظیفه‌ای ثبت نشده است</p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((t) => {
                    const st = statusInfo(TASK_STATUSES, t.status);
                    const pr = statusInfo(TASK_PRIORITIES, t.priority);
                    return (
                      <Link key={t.id} href="/dashboard/tasks" className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-smooth">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                            <CheckSquare className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">{t.title}</div>
                            <div className="text-xs text-slate-400">{t.dueDate ? formatJalali(t.dueDate) : 'بدون موعد'}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" style={{ color: pr.color, borderColor: pr.color + '40' }}>{pr.label}</Badge>
                          <Badge style={{ backgroundColor: st.color + '20', color: st.color }}>{st.label}</Badge>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Meetings */}
        <TabsContent value="meetings">
          <Card>
            <CardHeader><CardTitle className="text-base">جلسات</CardTitle></CardHeader>
            <CardContent>
              {meetings.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">جلسه‌ای ثبت نشده است</p>
              ) : (
                <div className="space-y-2">
                  {meetings.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-smooth">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{m.title}</div>
                          <div className="text-xs text-slate-400">{formatJalali(m.date)}</div>
                        </div>
                      </div>
                      {m.location && <span className="text-xs text-slate-400">{m.location}</span>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tickets */}
        <TabsContent value="tickets">
          <Card>
            <CardHeader><CardTitle className="text-base">تیکت‌های پشتیبانی</CardTitle></CardHeader>
            <CardContent>
              {tickets.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">تیکتی ثبت نشده است</p>
              ) : (
                <div className="space-y-2">
                  {tickets.map((t) => {
                    const st = statusInfo(TICKET_STATUSES, t.status);
                    return (
                      <Link key={t.id} href="/dashboard/tickets" className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-smooth">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">{t.subject}</div>
                            <div className="text-xs text-slate-400">{formatJalali(t.createdAt)}</div>
                          </div>
                        </div>
                        <Badge style={{ backgroundColor: st.color + '20', color: st.color }}>{st.label}</Badge>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loyalty */}
        <TabsContent value="loyalty">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <Award className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                <div className="text-3xl font-bold text-slate-900">{customer.loyaltyPoints?.toLocaleString('fa-IR')}</div>
                <div className="text-sm text-slate-500 mt-1">امتیاز باشگاه</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Star className="w-10 h-10 mx-auto mb-3" style={{ color: level.color }} />
                <div className="text-3xl font-bold" style={{ color: level.color }}>{level.label}</div>
                <div className="text-sm text-slate-500 mt-1">سطح مشتری</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-3">💳</div>
                <div className="text-3xl font-bold text-slate-900">{formatToman(Number(customer.walletBalance))}</div>
                <div className="text-sm text-slate-500 mt-1">موجودی کیف پول (ت)</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity">
          <Card>
            <CardHeader><CardTitle className="text-base">تاریخچه فعالیت</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-sky-500 mt-1.5" />
                  <div>
                    <span className="text-slate-700">مشتری در سیستم ثبت شد</span>
                    <div className="text-xs text-slate-400 mt-0.5">{relativeTime(customer.createdAt)}</div>
                  </div>
                </div>
                {orders.slice(0, 3).map((o) => (
                  <div key={o.id} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5" />
                    <div>
                      <span className="text-slate-700">سفارش به مبلغ {formatToman(Number(o.total))} تومان</span>
                      <div className="text-xs text-slate-400 mt-0.5">{relativeTime(o.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, ltr }: { icon: any; label: string; value: string | null; ltr?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-xs text-slate-400">{label}</div>
        <div className="text-sm font-medium text-slate-700" dir={ltr ? 'ltr' : 'rtl'}>{value || '—'}</div>
      </div>
    </div>
  );
}
