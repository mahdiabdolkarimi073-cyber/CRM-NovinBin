'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { fetchData } from '@/lib/data-client';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Scale, TrendingUp, Wallet, ShoppingCart, BookOpen, Calendar, ChevronLeft,
  ArrowUpCircle, ArrowDownCircle, Banknote, Coins, FileText, CheckCircle2,
  Clock, AlertCircle, Users, Receipt, CreditCard, Landmark,
} from 'lucide-react';
import { formatToman, formatJalali, toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ---------- helpers ----------

interface AccountNode {
  id: string;
  code: string;
  name: string;
  type: string;
  parentId: string | null;
  balance: any;
  openingBalance: any;
  isGroup: boolean;
  active: boolean;
  children: AccountNode[];
}

function buildTree(accounts: any[], parentId: string | null): AccountNode[] {
  return accounts
    .filter((a) => (a.parentId ?? null) === parentId)
    .map((a) => ({
      ...a,
      balance: a.balance,
      children: buildTree(accounts, a.id),
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

function sumTree(nodes: AccountNode[]): number {
  let total = 0;
  for (const n of nodes) {
    total += Number(n.balance);
    if (n.children.length) total += sumTree(n.children);
  }
  return total;
}

const accountTypeLabels: Record<string, string> = {
  asset: 'دارایی',
  liability: 'بدهی',
  equity: 'سرمایه',
  revenue: 'درآمد',
  expense: 'هزینه',
};

const accountTypeColors: Record<string, string> = {
  asset: 'text-emerald-600',
  liability: 'text-amber-600',
  equity: 'text-blue-600',
  revenue: 'text-emerald-600',
  expense: 'text-red-600',
};

function AccountRow({ node, depth }: { node: AccountNode; depth: number }) {
  const isGroup = node.isGroup || node.children.length > 0;
  return (
    <>
      <TableRow className={cn('hover:bg-slate-50/60 transition-colors', isGroup && 'bg-slate-50/40 font-medium')}>
        <TableCell className="py-2.5">
          <div className="flex items-center gap-2" style={{ paddingRight: depth * 20 }}>
            {depth > 0 && <ChevronLeft className="w-3 h-3 text-slate-300 shrink-0" />}
            <span className="text-xs text-slate-400 font-mono" dir="ltr">{node.code}</span>
            <span className={cn('text-sm', isGroup ? 'font-semibold text-slate-800' : 'text-slate-600')}>
              {node.name}
            </span>
            {isGroup && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">گروه</Badge>}
          </div>
        </TableCell>
        <TableCell className="text-left py-2.5">
          <span className={cn('text-sm tabular-nums', accountTypeColors[node.type])} dir="ltr">
            {formatToman(Number(node.balance))}
          </span>
        </TableCell>
      </TableRow>
      {node.children.map((child) => (
        <AccountRow key={child.id} node={child} depth={depth + 1} />
      ))}
    </>
  );
}

// ---------- date helpers ----------

function defaultFrom(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return toLocalDateString(d);
}
function defaultTo(): string {
  return toLocalDateString(new Date());
}

// ============================================================
// MAIN
// ============================================================

export default function FinancialReportsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('balance');

  // shared date filter (tabs 3-5)
  const [dateFrom, setDateFrom] = useState(defaultFrom());
  const [dateTo, setDateTo] = useState(defaultTo());

  // data buckets
  const [accounts, setAccounts] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [cashFunds, setCashFunds] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const where = isSuperAdmin ? {} : {};
      const [
        accs, jes, banks, funds, pays, recs, invs, ords, custs,
      ] = await Promise.all([
        fetchData('accounts', { where }),
        fetchData('journal_entries', {
          where: isSuperAdmin ? { status: 'posted' } : { status: 'posted' },
          include: { lines: true },
        }),
        fetchData('bank_accounts', { where }),
        fetchData('cash_funds', { where }),
        fetchData('payments', { where }),
        fetchData('receipts', { where }),
        fetchData('invoices', { where }),
        fetchData('orders', { where }),
        fetchData('customers', { where }),
      ]);
      setAccounts(accs || []);
      setJournalEntries(jes || []);
      setBankAccounts(banks || []);
      setCashFunds(funds || []);
      setPayments(pays || []);
      setReceipts(recs || []);
      setInvoices(invs || []);
      setOrders(ords || []);
      setCustomers(custs || []);
    } catch (e: any) {
      toast.error('خطا در بارگذاری داده‌ها');
    } finally {
      setLoading(false);
    }
  }, [profile, isSuperAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  // ---- derived: balance sheet ----
  const balanceData = useMemo(() => {
    const assets = accounts.filter((a) => a.type === 'asset');
    const liabilities = accounts.filter((a) => a.type === 'liability');
    const equity = accounts.filter((a) => a.type === 'equity');
    const assetTree = buildTree(assets, null);
    const liabTree = buildTree(liabilities, null);
    const equityTree = buildTree(equity, null);
    const totalAssets = sumTree(assetTree);
    const totalLiab = sumTree(liabTree);
    const totalEquity = sumTree(equityTree);
    return { assetTree, liabTree, equityTree, totalAssets, totalLiab, totalEquity };
  }, [accounts]);

  // ---- derived: P&L ----
  const pnlData = useMemo(() => {
    const revenue: Record<string, { name: string; code: string; amount: number }> = {};
    const expense: Record<string, { name: string; code: string; amount: number }> = {};
    for (const je of journalEntries) {
      for (const line of je.lines || []) {
        const acc = accounts.find((a) => a.id === line.accountId);
        if (!acc) continue;
        const debit = Number(line.debit);
        const credit = Number(line.credit);
        if (acc.type === 'revenue') {
          if (!revenue[acc.id]) revenue[acc.id] = { name: acc.name, code: acc.code, amount: 0 };
          revenue[acc.id].amount += credit - debit;
        } else if (acc.type === 'expense') {
          if (!expense[acc.id]) expense[acc.id] = { name: acc.name, code: acc.code, amount: 0 };
          expense[acc.id].amount += debit - credit;
        }
      }
    }
    const revList = Object.values(revenue).filter((r) => r.amount > 0).sort((a, b) => b.amount - a.amount);
    const expList = Object.values(expense).filter((e) => e.amount > 0).sort((a, b) => b.amount - a.amount);
    const totalRevenue = revList.reduce((s, r) => s + r.amount, 0);
    const totalExpense = expList.reduce((s, e) => s + e.amount, 0);
    const netProfit = totalRevenue - totalExpense;
    return { revList, expList, totalRevenue, totalExpense, netProfit };
  }, [journalEntries]);

  // ---- derived: cash flow (date filtered) ----
  const cashFlowData = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;
    const inRange = (d: any) => {
      const date = new Date(d);
      if (from && date < from) return false;
      if (to && date > to) return false;
      return true;
    };
    const filteredReceipts = receipts.filter((r) => inRange(r.receivedDate || r.createdAt));
    const filteredPayments = payments.filter((p) => inRange(p.date || p.createdAt));
    const cashIn = filteredReceipts.reduce((s, r) => s + Number(r.amount), 0);
    const cashOut = filteredPayments.reduce((s, p) => s + Number(p.amount), 0);
    const netCash = cashIn - cashOut;
    const bankTotal = bankAccounts.reduce((s, b) => s + Number(b.balance), 0);
    const fundTotal = cashFunds.reduce((s, f) => s + Number(f.balance), 0);
    return { filteredReceipts, filteredPayments, cashIn, cashOut, netCash, bankTotal, fundTotal };
  }, [receipts, payments, dateFrom, dateTo, bankAccounts, cashFunds]);

  // ---- derived: sales report (date filtered) ----
  const salesData = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;
    const inRange = (d: any) => {
      const date = new Date(d);
      if (from && date < from) return false;
      if (to && date > to) return false;
      return true;
    };
    const filteredInvoices = invoices.filter((i) => inRange(i.issueDate || i.createdAt));
    const filteredOrders = orders.filter((o) => inRange(o.createdAt));
    const totalSales = filteredInvoices.reduce((s, i) => s + Number(i.amount), 0);
    const totalPaid = filteredInvoices.reduce((s, i) => s + Number(i.paid), 0);
    const totalUnpaid = totalSales - totalPaid;
    const count = filteredInvoices.length;
    const avg = count > 0 ? totalSales / count : 0;

    const byStatus: Record<string, number> = { paid: 0, unpaid: 0, partial: 0 };
    for (const inv of filteredInvoices) {
      const amt = Number(inv.amount);
      const paid = Number(inv.paid);
      if (paid >= amt && amt > 0) byStatus.paid += 1;
      else if (paid > 0) byStatus.partial += 1;
      else byStatus.unpaid += 1;
    }

    // top customers
    const byCustomer: Record<string, number> = {};
    for (const inv of filteredInvoices) {
      if (!inv.customerId) continue;
      byCustomer[inv.customerId] = (byCustomer[inv.customerId] || 0) + Number(inv.amount);
    }
    const topCustomers = Object.entries(byCustomer)
      .map(([cid, amt]) => {
        const c = customers.find((x) => x.id === cid);
        const name = c ? (c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim()) : 'ناشناخته';
        return { id: cid, name, amount: amt };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return { filteredInvoices, filteredOrders, totalSales, totalPaid, totalUnpaid, count, avg, byStatus, topCustomers };
  }, [invoices, orders, customers, dateFrom, dateTo]);

  // ---- derived: receivables & payables (date filtered) ----
  const rpData = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;
    const inRange = (d: any) => {
      const date = new Date(d);
      if (from && date < from) return false;
      if (to && date > to) return false;
      return true;
    };

    // receivables = invoices not fully paid
    const receivables = invoices
      .filter((i) => {
        const paid = Number(i.paid);
        const amt = Number(i.amount);
        return paid < amt && inRange(i.issueDate || i.createdAt);
      })
      .map((i) => {
        const due = i.dueDate ? new Date(i.dueDate) : null;
        const daysOverdue = due ? Math.max(0, Math.floor((Date.now() - due.getTime()) / 86400000)) : 0;
        const c = customers.find((x) => x.id === i.customerId);
        const name = c ? (c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim()) : '—';
        return {
          id: i.id,
          number: i.number,
          customerName: name,
          amount: Number(i.amount) - Number(i.paid),
          dueDate: i.dueDate,
          daysOverdue,
          type: 'receivable' as const,
        };
      });

    // payables = payments not completed
    const payables = payments
      .filter((p) => p.status !== 'completed' && inRange(p.date || p.createdAt))
      .map((p) => {
        const c = customers.find((x) => x.id === p.customerId);
        const name = c ? (c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim()) : (p.payerName || '—');
        return {
          id: p.id,
          number: p.number,
          customerName: name,
          amount: Number(p.amount),
          dueDate: null,
          daysOverdue: 0,
          type: 'payable' as const,
        };
      });

    const totalReceivables = receivables.reduce((s, r) => s + r.amount, 0);
    const totalPayables = payables.reduce((s, p) => s + p.amount, 0);
    const net = totalReceivables - totalPayables;
    return { receivables, payables, totalReceivables, totalPayables, net };
  }, [invoices, payments, customers, dateFrom, dateTo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // ---- summary card component ----
  const StatCard = ({
    title, value, icon, accent, subtitle,
  }: { title: string; value: string; icon: React.ReactNode; accent: string; subtitle?: string }) => (
    <Card className="overflow-hidden border-slate-200/70 hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500">{title}</p>
            <p className={cn('text-xl font-bold tabular-nums', accent)} dir="ltr">{value}</p>
            {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
          </div>
          <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', accent.replace('text-', 'bg-').replace('-600', '-50'))}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const balanced = Math.abs(balanceData.totalAssets - (balanceData.totalLiab + balanceData.totalEquity)) < 1;

  return (
    <div>
      <PageHeader
        title="گزارش‌های مالی"
        description="ترازنامه، صورت سود و زیان، جریان وجوه نقد، فروش و مطالبات"
      />

      {/* Global date filter — applies to tabs 3-5 */}
      <Card className="mb-5 border-blue-100 bg-gradient-to-l from-blue-50/50 to-transparent">
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600 ml-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            فیلتر بازه زمانی
            <span className="text-[11px] text-slate-400 font-normal">(برای جریان وجوه، فروش و مطالبات)</span>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">از تاریخ</Label>
            <JalaliDatePicker value={dateFrom ? new Date(dateFrom) : null} onChange={(d) => setDateFrom(d ? toLocalDateString(d) : '')} className="w-40" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">تا تاریخ</Label>
            <JalaliDatePicker value={dateTo ? new Date(dateTo) : null} onChange={(d) => setDateTo(d ? toLocalDateString(d) : '')} className="w-40" />
          </div>
          <Button variant="outline" size="sm" onClick={() => { setDateFrom(defaultFrom()); setDateTo(defaultTo()); }}>
            بازنشانی
          </Button>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="balance"><Scale className="w-4 h-4 ml-1" />ترازنامه</TabsTrigger>
          <TabsTrigger value="pnl"><TrendingUp className="w-4 h-4 ml-1" />صورت سود و زیان</TabsTrigger>
          <TabsTrigger value="cashflow"><Wallet className="w-4 h-4 ml-1" />جریان وجوه نقد</TabsTrigger>
          <TabsTrigger value="sales"><ShoppingCart className="w-4 h-4 ml-1" />گزارش فروش</TabsTrigger>
          <TabsTrigger value="rp"><BookOpen className="w-4 h-4 ml-1" />مطالبات و بدهی‌ها</TabsTrigger>
        </TabsList>

        {/* ====================== TAB 1: BALANCE SHEET ====================== */}
        <TabsContent value="balance">
          {/* summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard
              title="کل دارایی‌ها"
              value={formatToman(balanceData.totalAssets)}
              icon={<Landmark className="w-5 h-5 text-emerald-600" />}
              accent="text-emerald-600"
              subtitle={`${accounts.filter((a) => a.type === 'asset').length} حساب`}
            />
            <StatCard
              title="کل بدهی‌ها"
              value={formatToman(balanceData.totalLiab)}
              icon={<CreditCard className="w-5 h-5 text-amber-600" />}
              accent="text-amber-600"
              subtitle={`${accounts.filter((a) => a.type === 'liability').length} حساب`}
            />
            <StatCard
              title="کل سرمایه"
              value={formatToman(balanceData.totalEquity)}
              icon={<Coins className="w-5 h-5 text-blue-600" />}
              accent="text-blue-600"
              subtitle={`${accounts.filter((a) => a.type === 'equity').length} حساب`}
            />
          </div>

          {/* balance check banner */}
          <Card className={cn('mb-6 border-2', balanced ? 'border-emerald-200 bg-emerald-50/40' : 'border-red-200 bg-red-50/40')}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {balanced ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600" />
                )}
                <div>
                  <p className={cn('font-bold', balanced ? 'text-emerald-800' : 'text-red-800')}>
                    {balanced ? 'ترازنامه متوازن است' : 'ترازنامه متوازن نیست'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    دارایی = بدهی + سرمایه
                  </p>
                </div>
              </div>
              <div className="text-left">
                <p className="text-xs text-slate-500">تفاوت</p>
                <p className={cn('text-lg font-bold tabular-nums', balanced ? 'text-emerald-600' : 'text-red-600')} dir="ltr">
                  {formatToman(Math.abs(balanceData.totalAssets - (balanceData.totalLiab + balanceData.totalEquity)))}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Assets */}
            <Card className="border-emerald-100">
              <CardHeader className="pb-3 border-b border-emerald-50 bg-emerald-50/30">
                <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
                  <Landmark className="w-4 h-4" /> دارایی‌ها
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {balanceData.assetTree.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">حساب دارایی‌ای ثبت نشده</p>
                ) : (
                  <Table>
                    <TableBody>
                      {balanceData.assetTree.map((node) => (
                        <AccountRow key={node.id} node={node} depth={0} />
                      ))}
                    </TableBody>
                  </Table>
                )}
                <div className="border-t border-emerald-100 bg-emerald-50/30 p-3 flex justify-between items-center">
                  <span className="text-sm font-semibold text-emerald-800">جمع کل</span>
                  <span className="text-base font-bold text-emerald-700 tabular-nums" dir="ltr">{formatToman(balanceData.totalAssets)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Liabilities */}
            <Card className="border-amber-100">
              <CardHeader className="pb-3 border-b border-amber-50 bg-amber-50/30">
                <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                  <CreditCard className="w-4 h-4" /> بدهی‌ها
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {balanceData.liabTree.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">حساب بدهی‌ای ثبت نشده</p>
                ) : (
                  <Table>
                    <TableBody>
                      {balanceData.liabTree.map((node) => (
                        <AccountRow key={node.id} node={node} depth={0} />
                      ))}
                    </TableBody>
                  </Table>
                )}
                <div className="border-t border-amber-100 bg-amber-50/30 p-3 flex justify-between items-center">
                  <span className="text-sm font-semibold text-amber-800">جمع کل</span>
                  <span className="text-base font-bold text-amber-700 tabular-nums" dir="ltr">{formatToman(balanceData.totalLiab)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Equity */}
            <Card className="border-blue-100">
              <CardHeader className="pb-3 border-b border-blue-50 bg-blue-50/30">
                <CardTitle className="text-base flex items-center gap-2 text-blue-700">
                  <Coins className="w-4 h-4" /> سرمایه
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {balanceData.equityTree.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">حساب سرمایه‌ای ثبت نشده</p>
                ) : (
                  <Table>
                    <TableBody>
                      {balanceData.equityTree.map((node) => (
                        <AccountRow key={node.id} node={node} depth={0} />
                      ))}
                    </TableBody>
                  </Table>
                )}
                <div className="border-t border-blue-100 bg-blue-50/30 p-3 flex justify-between items-center">
                  <span className="text-sm font-semibold text-blue-800">جمع کل</span>
                  <span className="text-base font-bold text-blue-700 tabular-nums" dir="ltr">{formatToman(balanceData.totalEquity)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ====================== TAB 2: P&L ====================== */}
        <TabsContent value="pnl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard
              title="درآمد کل"
              value={formatToman(pnlData.totalRevenue)}
              icon={<ArrowUpCircle className="w-5 h-5 text-emerald-600" />}
              accent="text-emerald-600"
              subtitle={`${pnlData.revList.length} بابت درآمدی`}
            />
            <StatCard
              title="هزینه کل"
              value={formatToman(pnlData.totalExpense)}
              icon={<ArrowDownCircle className="w-5 h-5 text-red-600" />}
              accent="text-red-600"
              subtitle={`${pnlData.expList.length} بابت هزینه‌ای`}
            />
            <StatCard
              title="سود خالص"
              value={formatToman(pnlData.netProfit)}
              icon={pnlData.netProfit >= 0 ? <TrendingUp className="w-5 h-5 text-blue-600" /> : <TrendingUp className="w-5 h-5 text-red-600" />}
              accent={pnlData.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}
              subtitle={pnlData.netProfit >= 0 ? 'سود' : 'زیان'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Revenue breakdown */}
            <Card className="border-emerald-100">
              <CardHeader className="pb-3 border-b border-emerald-50">
                <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
                  <ArrowUpCircle className="w-4 h-4" /> تفکیک درآمدها
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {pnlData.revList.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">درآمدی ثبت نشده</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">حساب</TableHead>
                        <TableHead className="text-xs text-left">مبلغ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pnlData.revList.map((r) => (
                        <TableRow key={r.code} className="hover:bg-emerald-50/30">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 font-mono" dir="ltr">{r.code}</span>
                              <span className="text-sm text-slate-700">{r.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-left">
                            <span className="text-sm font-semibold text-emerald-600 tabular-nums" dir="ltr">{formatToman(r.amount)}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                <div className="border-t bg-emerald-50/30 p-3 flex justify-between">
                  <span className="text-sm font-semibold text-emerald-800">جمع درآمد</span>
                  <span className="text-base font-bold text-emerald-700 tabular-nums" dir="ltr">{formatToman(pnlData.totalRevenue)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Expense breakdown */}
            <Card className="border-red-100">
              <CardHeader className="pb-3 border-b border-red-50">
                <CardTitle className="text-base flex items-center gap-2 text-red-700">
                  <ArrowDownCircle className="w-4 h-4" /> تفکیک هزینه‌ها
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {pnlData.expList.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">هزینه‌ای ثبت نشده</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">حساب</TableHead>
                        <TableHead className="text-xs text-left">مبلغ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pnlData.expList.map((e) => (
                        <TableRow key={e.code} className="hover:bg-red-50/30">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 font-mono" dir="ltr">{e.code}</span>
                              <span className="text-sm text-slate-700">{e.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-left">
                            <span className="text-sm font-semibold text-red-600 tabular-nums" dir="ltr">{formatToman(e.amount)}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                <div className="border-t bg-red-50/30 p-3 flex justify-between">
                  <span className="text-sm font-semibold text-red-800">جمع هزینه</span>
                  <span className="text-base font-bold text-red-700 tabular-nums" dir="ltr">{formatToman(pnlData.totalExpense)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ====================== TAB 3: CASH FLOW ====================== */}
        <TabsContent value="cashflow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard
              title="نقد ورودی (رسیدها)"
              value={formatToman(cashFlowData.cashIn)}
              icon={<ArrowUpCircle className="w-5 h-5 text-emerald-600" />}
              accent="text-emerald-600"
              subtitle={`${cashFlowData.filteredReceipts.length} رسید`}
            />
            <StatCard
              title="نقد خروجی (پرداخت‌ها)"
              value={formatToman(cashFlowData.cashOut)}
              icon={<ArrowDownCircle className="w-5 h-5 text-red-600" />}
              accent="text-red-600"
              subtitle={`${cashFlowData.filteredPayments.length} پرداخت`}
            />
            <StatCard
              title="خالص جریان نقد"
              value={formatToman(cashFlowData.netCash)}
              icon={<Wallet className="w-5 h-5 text-blue-600" />}
              accent={cashFlowData.netCash >= 0 ? 'text-emerald-600' : 'text-red-600'}
              subtitle={cashFlowData.netCash >= 0 ? 'مثبت' : 'منفی'}
            />
          </div>

          {/* current balances */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
            <Card className="border-blue-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-blue-700">
                  <Banknote className="w-4 h-4" /> موجودی حساب‌های بانکی
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {bankAccounts.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">حساب بانکی ثبت نشده</p>
                ) : (
                  <Table>
                    <TableBody>
                      {bankAccounts.map((b) => (
                        <TableRow key={b.id} className="hover:bg-blue-50/30">
                          <TableCell>
                            <div className="text-sm font-medium text-slate-800">{b.name}</div>
                            <div className="text-xs text-slate-400">{b.bankName} — {b.accountNo}</div>
                          </TableCell>
                          <TableCell className="text-left">
                            <span className="text-sm font-semibold text-blue-600 tabular-nums" dir="ltr">{formatToman(Number(b.balance))}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                <div className="border-t bg-blue-50/30 p-3 flex justify-between">
                  <span className="text-sm font-semibold text-blue-800">جمع</span>
                  <span className="text-base font-bold text-blue-700 tabular-nums" dir="ltr">{formatToman(cashFlowData.bankTotal)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                  <Coins className="w-4 h-4" /> صندوق‌های نقدی
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {cashFunds.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">صندوقی ثبت نشده</p>
                ) : (
                  <Table>
                    <TableBody>
                      {cashFunds.map((f) => (
                        <TableRow key={f.id} className="hover:bg-amber-50/30">
                          <TableCell>
                            <div className="text-sm font-medium text-slate-800">{f.name}</div>
                            {f.location && <div className="text-xs text-slate-400">{f.location}</div>}
                          </TableCell>
                          <TableCell className="text-left">
                            <span className="text-sm font-semibold text-amber-600 tabular-nums" dir="ltr">{formatToman(Number(f.balance))}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                <div className="border-t bg-amber-50/30 p-3 flex justify-between">
                  <span className="text-sm font-semibold text-amber-800">جمع</span>
                  <span className="text-base font-bold text-amber-700 tabular-nums" dir="ltr">{formatToman(cashFlowData.fundTotal)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ====================== TAB 4: SALES REPORT ====================== */}
        <TabsContent value="sales">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="کل فروش"
              value={formatToman(salesData.totalSales)}
              icon={<ShoppingCart className="w-5 h-5 text-emerald-600" />}
              accent="text-emerald-600"
            />
            <StatCard
              title="تعداد فاکتورها"
              value={salesData.count.toLocaleString('fa-IR')}
              icon={<FileText className="w-5 h-5 text-blue-600" />}
              accent="text-blue-600"
              subtitle={`${salesData.filteredOrders.length} سفارش`}
            />
            <StatCard
              title="میانگین فاکتور"
              value={formatToman(salesData.avg)}
              icon={<TrendingUp className="w-5 h-5 text-amber-600" />}
              accent="text-amber-600"
            />
            <StatCard
              title="مطالبات (پرداخت‌نشده)"
              value={formatToman(salesData.totalUnpaid)}
              icon={<Clock className="w-5 h-5 text-red-600" />}
              accent="text-red-600"
              subtitle={`پرداخت‌شده: ${formatToman(salesData.totalPaid)}`}
            />
          </div>

          {/* status breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">وضعیت فاکتورها</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs">وضعیت</TableHead>
                      <TableHead className="text-xs text-left">تعداد</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-emerald-50/30">
                      <TableCell><Badge className="bg-emerald-100 text-emerald-700 border-transparent">پرداخت‌شده</Badge></TableCell>
                      <TableCell className="text-left font-semibold text-emerald-600 tabular-nums">{salesData.byStatus.paid.toLocaleString('fa-IR')}</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-amber-50/30">
                      <TableCell><Badge className="bg-amber-100 text-amber-700 border-transparent">پرداخت‌جزئی</Badge></TableCell>
                      <TableCell className="text-left font-semibold text-amber-600 tabular-nums">{salesData.byStatus.partial.toLocaleString('fa-IR')}</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-red-50/30">
                      <TableCell><Badge className="bg-red-100 text-red-700 border-transparent">پرداخت‌نشده</Badge></TableCell>
                      <TableCell className="text-left font-semibold text-red-600 tabular-nums">{salesData.byStatus.unpaid.toLocaleString('fa-IR')}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" /> ۵ مشتری برتر
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {salesData.topCustomers.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">داده‌ای موجود نیست</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">مشتری</TableHead>
                        <TableHead className="text-xs text-left">مبلغ خرید</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesData.topCustomers.map((c, i) => (
                        <TableRow key={c.id} className="hover:bg-blue-50/30">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                                {(i + 1).toLocaleString('fa-IR')}
                              </span>
                              <span className="text-sm text-slate-700">{c.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-left">
                            <span className="text-sm font-semibold text-blue-600 tabular-nums" dir="ltr">{formatToman(c.amount)}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ====================== TAB 5: RECEIVABLES & PAYABLES ====================== */}
        <TabsContent value="rp">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard
              title="کل مطالبات"
              value={formatToman(rpData.totalReceivables)}
              icon={<Receipt className="w-5 h-5 text-emerald-600" />}
              accent="text-emerald-600"
              subtitle={`${rpData.receivables.length} فاکتور معوق`}
            />
            <StatCard
              title="کل بدهی‌ها"
              value={formatToman(rpData.totalPayables)}
              icon={<CreditCard className="w-5 h-5 text-red-600" />}
              accent="text-red-600"
              subtitle={`${rpData.payables.length} پرداخت معلق`}
            />
            <StatCard
              title="وضعیت خالص"
              value={formatToman(rpData.net)}
              icon={<Scale className="w-5 h-5 text-blue-600" />}
              accent={rpData.net >= 0 ? 'text-emerald-600' : 'text-red-600'}
              subtitle={rpData.net >= 0 ? 'کسری مثبت' : 'کسری منفی'}
            />
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">مطالبات از مشتریان (فاکتورهای پرداخت‌نشده)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {rpData.receivables.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">مطالبات معوقی وجود ندارد ✓</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs">شماره</TableHead>
                      <TableHead className="text-xs">مشتری</TableHead>
                      <TableHead className="text-xs text-left">مبلغ</TableHead>
                      <TableHead className="text-xs">سررسید</TableHead>
                      <TableHead className="text-xs">تأخیر</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rpData.receivables.map((r) => (
                      <TableRow key={r.id} className="hover:bg-slate-50/60">
                        <TableCell><span className="text-xs font-mono text-slate-500" dir="ltr">{r.number}</span></TableCell>
                        <TableCell><span className="text-sm text-slate-700">{r.customerName}</span></TableCell>
                        <TableCell className="text-left">
                          <span className="text-sm font-semibold text-emerald-600 tabular-nums" dir="ltr">{formatToman(r.amount)}</span>
                        </TableCell>
                        <TableCell>
                          {r.dueDate ? <span className="text-xs text-slate-500">{formatJalali(r.dueDate)}</span> : <span className="text-xs text-slate-300">—</span>}
                        </TableCell>
                        <TableCell>
                          {r.daysOverdue > 0 ? (
                            <Badge className="bg-red-100 text-red-700 border-transparent text-xs">{r.daysOverdue.toLocaleString('fa-IR')} روز</Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-500 border-transparent text-xs">سررسید نرسیده</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="mt-5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">بدهی‌ها (پرداخت‌های انجام‌نشده)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {rpData.payables.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">بدهی معوقی وجود ندارد ✓</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs">شماره</TableHead>
                      <TableHead className="text-xs">طرف حساب</TableHead>
                      <TableHead className="text-xs text-left">مبلغ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rpData.payables.map((p) => (
                      <TableRow key={p.id} className="hover:bg-slate-50/60">
                        <TableCell><span className="text-xs font-mono text-slate-500" dir="ltr">{p.number}</span></TableCell>
                        <TableCell><span className="text-sm text-slate-700">{p.customerName}</span></TableCell>
                        <TableCell className="text-left">
                          <span className="text-sm font-semibold text-red-600 tabular-nums" dir="ltr">{formatToman(p.amount)}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
