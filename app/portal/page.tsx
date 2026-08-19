'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ShoppingCart, FileText, MessageSquare, Award, Wallet, TrendingUp } from 'lucide-react';
import { formatToman, relativeTime } from '@/lib/format';
import { CUSTOMER_LEVELS, ORDER_STATUSES, INVOICE_STATUSES } from '@/lib/constants';
import type { Customer, Order, Invoice, Ticket } from '@/lib/types';

const statusInfo = (statuses: { key: string; label: string; color: string }[], key: string) =>
  statuses.find((s) => s.key === key) || statuses[0];

export default function PortalDashboardPage() {
  const { profile } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile?.customerId) return;
    setLoading(true);
    try {
      const custArr = await fetchData<Customer>('customers', { where: { id: profile.customerId } });
      setCustomer(custArr[0] || null);
      const [ords, invs, tkts] = await Promise.all([
        fetchData<Order>('orders', { where: { customerId: profile.customerId }, orderBy: { createdAt: 'desc' }, take: 5 }),
        fetchData<Invoice>('invoices', { where: { customerId: profile.customerId }, orderBy: { createdAt: 'desc' }, take: 5 }),
        fetchData<Ticket>('tickets', { where: { customerId: profile.customerId }, orderBy: { createdAt: 'desc' }, take: 5 }),
      ]);
      setOrders(ords);
      setInvoices(invs);
      setTickets(tkts);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [profile?.customerId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" /></div>;
  }

  const level = customer ? (CUSTOMER_LEVELS.find((l) => l.key === customer.level) || CUSTOMER_LEVELS[0]) : null;
  const totalOrders = orders.length;
  const unpaidInvoices = invoices.filter((i) => i.status !== 'paid');
  const openTickets = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress');

  const stats = [
    { label: 'سفارشات اخیر', value: totalOrders.toLocaleString('fa-IR'), icon: ShoppingCart, color: 'bg-sky-50 text-sky-600', href: '/portal/orders' },
    { label: 'فاکتورهای پرداخت‌نشده', value: unpaidInvoices.length.toLocaleString('fa-IR'), icon: FileText, color: 'bg-amber-50 text-amber-600', href: '/portal/invoices' },
    { label: 'تیکت‌های باز', value: openTickets.length.toLocaleString('fa-IR'), icon: MessageSquare, color: 'bg-cyan-50 text-cyan-600', href: '/portal/tickets' },
    { label: 'امتیاز باشگاه', value: (customer?.loyaltyPoints || 0).toLocaleString('fa-IR'), icon: Award, color: 'bg-violet-50 text-violet-600', href: '/portal/loyalty' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <Card className="bg-gradient-to-l from-emerald-500 to-teal-700 text-white border-0 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">سلام {(customer?.firstName || profile?.firstName) || ''} 👋</h1>
              <p className="text-emerald-50/80">به پورتال مشتریان خوش آمدید</p>
            </div>
            {level && (
              <div className="flex items-center gap-3 bg-white/15 rounded-xl px-4 py-3">
                <Award className="w-8 h-8" />
                <div>
                  <div className="text-xs text-emerald-50/70">سطح شما</div>
                  <div className="font-bold text-lg">{level.label}</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <Link key={i} href={s.href}>
            <Card className="hover:shadow-md transition-smooth cursor-pointer group">
              <CardContent className="p-4">
                <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div className="text-2xl font-bold text-slate-900 tnum">{s.value}</div>
                <div className="text-xs text-slate-500 mt-1">{s.label}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent orders */}
        <Card className="lg:col-span-2">
          <CardHeader><div className="flex items-center justify-between"><CardTitle className="text-base">سفارشات اخیر</CardTitle><Link href="/portal/orders" className="text-xs text-emerald-600 hover:underline">مشاهده همه</Link></div></CardHeader>
          <CardContent>
            {orders.length === 0 ? <p className="text-center text-slate-400 py-8 text-sm">سفارشی ثبت نشده</p> : (
              <div className="space-y-2">
                {orders.map((o) => {
                  const st = statusInfo(ORDER_STATUSES, o.status);
                  return (
                    <div key={o.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-smooth">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center"><ShoppingCart className="w-4 h-4" /></div>
                        <div>
                          <div className="text-sm font-medium">{o.number || o.id.slice(0, 8)}</div>
                          <div className="text-xs text-slate-400">{relativeTime(o.createdAt)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold">{formatToman(o.total)} ت</span>
                        <Badge style={{ backgroundColor: st.color + '20', color: st.color }}>{st.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Wallet & loyalty */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Wallet className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-slate-900">{formatToman(customer?.walletBalance || 0)}</div>
              <div className="text-xs text-slate-500 mt-1">موجودی کیف پول (تومان)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Award className="w-10 h-10 text-amber-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-slate-900">{(customer?.loyaltyPoints || 0).toLocaleString('fa-IR')}</div>
              <div className="text-xs text-slate-500 mt-1">امتیاز باشگاه مشتریان</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invoices & tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><div className="flex items-center justify-between"><CardTitle className="text-base">فاکتورهای اخیر</CardTitle><Link href="/portal/invoices" className="text-xs text-emerald-600 hover:underline">مشاهده همه</Link></div></CardHeader>
          <CardContent>
            {invoices.length === 0 ? <p className="text-center text-slate-400 py-6 text-sm">فاکتوری ثبت نشده</p> : (
              <div className="space-y-2">
                {invoices.slice(0, 4).map((inv) => {
                  const st = statusInfo(INVOICE_STATUSES, inv.status);
                  return (
                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-smooth">
                      <div>
                        <div className="text-sm font-medium">{inv.number}</div>
                        <div className="text-xs text-slate-400">{relativeTime(inv.createdAt)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{formatToman(inv.amount)} ت</span>
                        <Badge style={{ backgroundColor: st.color + '20', color: st.color }}>{st.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><div className="flex items-center justify-between"><CardTitle className="text-base">تیکت‌های اخیر</CardTitle><Link href="/portal/tickets" className="text-xs text-emerald-600 hover:underline">مشاهده همه</Link></div></CardHeader>
          <CardContent>
            {tickets.length === 0 ? <p className="text-center text-slate-400 py-6 text-sm">تیکتی ثبت نشده</p> : (
              <div className="space-y-2">
                {tickets.slice(0, 4).map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-smooth">
                    <div>
                      <div className="text-sm font-medium">{t.subject}</div>
                      <div className="text-xs text-slate-400">{relativeTime(t.createdAt)}</div>
                    </div>
                    <Badge variant="secondary" className="text-xs">{t.status === 'open' ? 'باز' : t.status === 'in_progress' ? 'در حال انجام' : t.status === 'resolved' ? 'حل شده' : 'بسته'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
