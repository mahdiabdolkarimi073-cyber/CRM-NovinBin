'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, FileText, Wallet, FileCheck, Calendar, Building2, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import type { Account, JournalEntry, FiscalYear, CostCenter, BankAccount, CashFund, FundTransfer, Cheque } from '@/lib/types';
import { AccountsTab } from '@/components/finance/accounts-tab';
import { JournalTab } from '@/components/finance/journal-tab';
import { TreasuryTab } from '@/components/finance/treasury-tab';
import { ChequesTab } from '@/components/finance/cheques-tab';
import { FiscalYearsTab } from '@/components/finance/fiscal-years-tab';
import { CostCentersTab } from '@/components/finance/cost-centers-tab';
import { ReportsTab } from '@/components/finance/reports-tab';

export default function AccountingPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cashFunds, setCashFunds] = useState<CashFund[]>([]);
  const [transfers, setTransfers] = useState<FundTransfer[]>([]);
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [treasurySummary, setTreasurySummary] = useState<any>(null);
  const [trialBalance, setTrialBalance] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const [
      accs, jes, fys, ccs, bas, cfs, fts, chqs,
    ] = await Promise.all([
      fetchData('accounts', { where: {}, orderBy: { code: 'asc' } }),
      fetchData('journal_entries', { where: {}, orderBy: { createdAt: 'desc' }, include: { lines: true } }),
      fetchData('fiscal_years', { where: {}, orderBy: { startDate: 'desc' }, include: { periods: true } }),
      fetchData('cost_centers', { where: {}, orderBy: { code: 'asc' } }),
      fetchData('bank_accounts', { where: {}, orderBy: { createdAt: 'desc' } }),
      fetchData('cash_funds', { where: {}, orderBy: { createdAt: 'desc' } }),
      fetchData('fund_transfers', { where: {}, orderBy: { createdAt: 'desc' } }),
      fetchData('cheques', { where: {}, orderBy: { createdAt: 'desc' } }),
    ]);

    setAccounts(accs || []);
    setEntries(jes || []);
    setFiscalYears(fys || []);
    setCostCenters(ccs || []);
    setBankAccounts(bas || []);
    setCashFunds(cfs || []);
    setTransfers(fts || []);
    setCheques(chqs || []);

    // Compute financial summary from accounts
    const assetAccounts = (accs || []).filter((a: any) => a.type === 'asset');
    const liabilityAccounts = (accs || []).filter((a: any) => a.type === 'liability');
    const revenueAccounts = (accs || []).filter((a: any) => a.type === 'revenue');
    const expenseAccounts = (accs || []).filter((a: any) => a.type === 'expense');
    const sumBalance = (list: any[]) => list.reduce((sum, a) => sum + Number(a.balance || 0), 0);
    const totalAssets = sumBalance(assetAccounts);
    const totalLiabilities = sumBalance(liabilityAccounts);
    const totalRevenue = sumBalance(revenueAccounts);
    const totalExpenses = sumBalance(expenseAccounts);
    setSummary({
      totalAssets, totalLiabilities, totalRevenue, totalExpenses,
      netIncome: totalRevenue - totalExpenses,
      equity: totalAssets - totalLiabilities,
    });

    // Treasury summary
    const bankBalance = (bas || []).reduce((sum: number, b: any) => sum + Number(b.balance || 0), 0);
    const cashBalance = (cfs || []).reduce((sum: number, c: any) => sum + Number(c.balance || 0), 0);
    setTreasurySummary({ bankBalance, cashBalance, total: bankBalance + cashBalance });

    // Trial balance from journal lines
    const accountMap = new Map<string, { code: string; name: string; debit: number; credit: number }>();
    (accs || []).forEach((a: any) => {
      accountMap.set(a.id, { code: a.code, name: a.name, debit: 0, credit: 0 });
    });
    (jes || []).forEach((je: any) => {
      (je.lines || []).forEach((line: any) => {
        const acc = accountMap.get(line.accountId);
        if (acc) {
          acc.debit += Number(line.debit || 0);
          acc.credit += Number(line.credit || 0);
        }
      });
    });
    const tb = Array.from(accountMap.values())
      .filter((a) => a.debit > 0 || a.credit > 0)
      .map((a) => ({ ...a, balance: a.debit - a.credit }));
    setTrialBalance(tb);

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const reload = async () => { await load(); };

  // Account handlers
  const handleCreateAccount = async (data: any) => {
    if (!profile) return;
    try {
      await createData('accounts', { ...data});
      toast.success('حساب ایجاد شد');
      await reload();
    } catch (e: any) { toast.error(e.message); }
  };
  const handleDeleteAccount = async (id: string) => {
    if (!confirm('حذف این حساب؟')) return;
    if (!profile) return;
    try { await deleteData('accounts', { id }); toast.success('حذف شد'); await reload(); }
    catch (e: any) { toast.error(e.message); }
  };

  // Journal handlers
  const handleCreateJE = async (data: any) => {
    if (!profile) return;
    try {
      const { lines, ...jeData } = data;
      const number = 'JE-' + Date.now().toString().slice(-6);
      await createData('journal_entries', {
        ...jeData,
        number,
        createdBy: profile.id,
        lines: {
          create: (lines || []).map((l: any) => ({
            accountId: l.accountId,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            description: l.description || null,
            costCenterId: l.costCenterId || null,
          })),
        },
      });
      toast.success('سند ثبت شد');
      await reload();
    } catch (e: any) { toast.error(e.message); }
  };
  const handleReverseJE = async (id: string, reason: string) => {
    if (!profile) return;
    try {
      await updateData('journal_entries', { id }, { status: 'reversed', reversedBy: profile.id });
      toast.success('سند برگشت داده شد');
      await reload();
    } catch (e: any) { toast.error(e.message); }
  };

  // Fiscal year handlers
  const handleCreateFY = async (data: any) => {
    if (!profile) return;
    try {
      await createData('fiscal_years', { ...data});
      toast.success('سال مالی ایجاد شد');
      await reload();
    } catch (e: any) { toast.error(e.message); }
  };
  const handleCloseFY = async (id: string) => {
    if (!profile) return;
    try { await updateData('fiscal_years', { id }, { status: 'closed', closedBy: profile.id, closedAt: new Date() }); toast.success('سال مالی بسته شد'); await reload(); }
    catch (e: any) { toast.error(e.message); }
  };
  const handleReopenFY = async (id: string) => {
    if (!profile) return;
    try { await updateData('fiscal_years', { id }, { status: 'open', closedBy: null, closedAt: null }); toast.success('سال مالی باز شد'); await reload(); }
    catch (e: any) { toast.error(e.message); }
  };
  const handleClosePeriod = async (id: string) => {
    if (!profile) return;
    try { await updateData('fiscal_periods', { id }, { status: 'closed' }); toast.success('دوره بسته شد'); await reload(); }
    catch (e: any) { toast.error(e.message); }
  };
  const handleOpenPeriod = async (id: string) => {
    if (!profile) return;
    try { await updateData('fiscal_periods', { id }, { status: 'open' }); toast.success('دوره باز شد'); await reload(); }
    catch (e: any) { toast.error(e.message); }
  };

  // Cost center handlers
  const handleCreateCC = async (data: any) => {
    if (!profile) return;
    try {
      await createData('cost_centers', { ...data});
      toast.success('مرکز هزینه ایجاد شد');
      await reload();
    } catch (e: any) { toast.error(e.message); }
  };
  const handleDeleteCC = async (id: string) => {
    if (!confirm('حذف این مرکز هزینه؟')) return;
    if (!profile) return;
    try { await deleteData('cost_centers', { id }); toast.success('حذف شد'); await reload(); }
    catch (e: any) { toast.error(e.message); }
  };

  // Treasury handlers
  const handleCreateBank = async (data: any) => {
    if (!profile) return;
    try {
      await createData('bank_accounts', { ...data});
      toast.success('حساب بانکی ایجاد شد');
      await reload();
    } catch (e: any) { toast.error(e.message); }
  };
  const handleCreateCash = async (data: any) => {
    if (!profile) return;
    try {
      await createData('cash_funds', { ...data});
      toast.success('صندوق نقدی ایجاد شد');
      await reload();
    } catch (e: any) { toast.error(e.message); }
  };
  const handleTransfer = async (data: any) => {
    if (!profile) return;
    try {
      const number = 'FT-' + Date.now().toString().slice(-6);
      await createData('fund_transfers', { ...data, number, createdBy: profile.id });
      toast.success('انتقال وجه انجام شد');
      await reload();
    } catch (e: any) { toast.error(e.message); }
  };
  const handleDeleteCash = async (id: string) => {
    if (!confirm('حذف این صندوق؟')) return;
    if (!profile) return;
    try { await deleteData('cash_funds', { id }); toast.success('حذف شد'); await reload(); }
    catch (e: any) { toast.error(e.message); }
  };

  // Cheque handlers
  const handleCreateCheque = async (data: any) => {
    if (!profile) return;
    try {
      await createData('cheques', { ...data});
      toast.success('چک ثبت شد');
      await reload();
    } catch (e: any) { toast.error(e.message); }
  };
  const handleClearCheque = async (id: string) => {
    if (!profile) return;
    try { await updateData('cheques', { id }, { status: 'cleared', clearedDate: new Date() }); toast.success('چک تسویه شد'); await reload(); }
    catch (e: any) { toast.error(e.message); }
  };
  const handleBounceCheque = async (id: string) => {
    if (!profile) return;
    try { await updateData('cheques', { id }, { status: 'bounced' }); toast.success('چک برگشت خورد'); await reload(); }
    catch (e: any) { toast.error(e.message); }
  };
  const handleDeleteCheque = async (id: string) => {
    if (!confirm('حذف این چک؟')) return;
    if (!profile) return;
    try { await deleteData('cheques', { id }); toast.success('حذف شد'); await reload(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="w-full" dir="rtl">
      <div className="mb-6">
        <div className="flex items-center gap-2.5">
          <div className="h-[30px] w-[5px] rounded-[4px] bg-[#F97316]" />
          <h1 className="text-[24px] font-bold leading-tight text-[#0F172A] sm:text-[32px]">حسابداری و امور مالی</h1>
        </div>
        <p className="mt-2 text-[14px] text-[#64748B]">سیستم کامل حسابداری سازمانی — دفتر کل، خزانه‌داری، چک‌ها، سال مالی و گزارش‌ها</p>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList className="flex-wrap">
          <TabsTrigger value="accounts"><BookOpen className="w-4 h-4 ml-1" />چارت حساب‌ها</TabsTrigger>
          <TabsTrigger value="entries"><FileText className="w-4 h-4 ml-1" />اسناد حسابداری</TabsTrigger>
          <TabsTrigger value="treasury"><Wallet className="w-4 h-4 ml-1" />خزانه‌داری</TabsTrigger>
          <TabsTrigger value="cheques"><FileCheck className="w-4 h-4 ml-1" />چک‌ها</TabsTrigger>
          <TabsTrigger value="fiscal"><Calendar className="w-4 h-4 ml-1" />سال مالی</TabsTrigger>
          <TabsTrigger value="costcenters"><Building2 className="w-4 h-4 ml-1" />مراکز هزینه</TabsTrigger>
          <TabsTrigger value="reports"><BarChart3 className="w-4 h-4 ml-1" />گزارش‌ها</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <AccountsTab accounts={accounts} costCenters={costCenters} loading={loading} onCreate={handleCreateAccount} onDelete={handleDeleteAccount} />
        </TabsContent>
        <TabsContent value="entries">
          <JournalTab entries={entries} accounts={accounts} costCenters={costCenters} loading={loading} onCreate={handleCreateJE} onReverse={handleReverseJE} />
        </TabsContent>
        <TabsContent value="treasury">
          <TreasuryTab bankAccounts={bankAccounts} cashFunds={cashFunds} transfers={transfers} loading={loading}
            onCreateBank={handleCreateBank} onCreateCash={handleCreateCash} onTransfer={handleTransfer} onDeleteCash={handleDeleteCash} />
        </TabsContent>
        <TabsContent value="cheques">
          <ChequesTab cheques={cheques} bankAccounts={bankAccounts} loading={loading}
            onCreate={handleCreateCheque} onClear={handleClearCheque} onBounce={handleBounceCheque} onDelete={handleDeleteCheque} />
        </TabsContent>
        <TabsContent value="fiscal">
          <FiscalYearsTab fiscalYears={fiscalYears} loading={loading}
            onCreate={handleCreateFY} onClose={handleCloseFY} onReopen={handleReopenFY}
            onClosePeriod={handleClosePeriod} onOpenPeriod={handleOpenPeriod} />
        </TabsContent>
        <TabsContent value="costcenters">
          <CostCentersTab costCenters={costCenters} loading={loading} onCreate={handleCreateCC} onDelete={handleDeleteCC} />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab accounts={accounts} summary={summary} treasurySummary={treasurySummary} trialBalance={trialBalance} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
