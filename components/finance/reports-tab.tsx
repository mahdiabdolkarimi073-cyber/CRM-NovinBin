'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scale, TrendingUp, TrendingDown, Wallet, Landmark, BookOpen, PieChart } from 'lucide-react';
import { formatToman } from '@/lib/format';
import type { Account } from '@/lib/types';

interface ReportsTabProps {
  accounts: Account[];
  summary: {
    totalAssets: number; totalLiabilities: number; equity: number;
    totalRevenue: number; totalExpenses: number; netIncome: number;
  } | null;
  treasurySummary: {
    bankBalance: number; cashBalance: number; total: number;
  } | null;
  trialBalance: { code: string; name: string; debit: number; credit: number; balance: number }[];
}

export function ReportsTab({ accounts, summary, treasurySummary, trialBalance }: ReportsTabProps) {
  const [reportType, setReportType] = useState('summary');

  const balanceSheetAccounts = accounts.filter((a) => a.type === 'asset' || a.type === 'liability' || a.type === 'equity');
  const plAccounts = accounts.filter((a) => a.type === 'revenue' || a.type === 'expense');

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant={reportType === 'summary' ? 'default' : 'outline'} onClick={() => setReportType('summary')}>خلاصه مالی</Button>
        <Button size="sm" variant={reportType === 'balance' ? 'default' : 'outline'} onClick={() => setReportType('balance')}>ترازنامه</Button>
        <Button size="sm" variant={reportType === 'pl' ? 'default' : 'outline'} onClick={() => setReportType('pl')}>صورت سود و زیان</Button>
        <Button size="sm" variant={reportType === 'trial' ? 'default' : 'outline'} onClick={() => setReportType('trial')}>میزان آزمایشی</Button>
        <Button size="sm" variant={reportType === 'treasury' ? 'default' : 'outline'} onClick={() => setReportType('treasury')}>خزانه‌داری</Button>
      </div>

      {/* Summary report */}
      {reportType === 'summary' && summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card><CardContent className="p-4 flex items-center justify-between">
            <div><div className="text-xs text-slate-400">کل دارایی‌ها</div><div className="text-xl font-bold text-sky-600">{formatToman(summary.totalAssets)} ت</div></div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center"><Wallet className="w-5 h-5" /></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center justify-between">
            <div><div className="text-xs text-slate-400">کل بدهی‌ها</div><div className="text-xl font-bold text-red-600">{formatToman(summary.totalLiabilities)} ت</div></div>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><TrendingDown className="w-5 h-5" /></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center justify-between">
            <div><div className="text-xs text-slate-400">حقوق صاحبان سهام</div><div className="text-xl font-bold text-violet-600">{formatToman(summary.equity)} ت</div></div>
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center"><Scale className="w-5 h-5" /></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center justify-between">
            <div><div className="text-xs text-slate-400">کل درآمد</div><div className="text-xl font-bold text-emerald-600">{formatToman(summary.totalRevenue)} ت</div></div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><TrendingUp className="w-5 h-5" /></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center justify-between">
            <div><div className="text-xs text-slate-400">کل هزینه‌ها</div><div className="text-xl font-bold text-amber-600">{formatToman(summary.totalExpenses)} ت</div></div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><TrendingDown className="w-5 h-5" /></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center justify-between">
            <div><div className="text-xs text-slate-400">سود خالص</div><div className={`text-xl font-bold ${summary.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatToman(summary.netIncome)} ت</div></div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center"><PieChart className="w-5 h-5" /></div>
          </CardContent></Card>
        </div>
      )}

      {/* Balance sheet */}
      {reportType === 'balance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">دارایی‌ها</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {accounts.filter((a) => a.type === 'asset').map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50"><td className="p-3 text-slate-600">{a.code} - {a.name}</td><td className="p-3 text-left font-medium text-sky-600">{formatToman(Number(a.balance))}</td></tr>
                  ))}
                  <tr className="bg-slate-50 font-bold"><td className="p-3">مجموع دارایی‌ها</td><td className="p-3 text-left text-sky-700">{formatToman(summary?.totalAssets || 0)}</td></tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">بدهی‌ها و حقوق صاحبان سهام</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {accounts.filter((a) => a.type === 'liability').map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50"><td className="p-3 text-slate-600">{a.code} - {a.name}</td><td className="p-3 text-left font-medium text-red-600">{formatToman(Number(a.balance))}</td></tr>
                  ))}
                  {accounts.filter((a) => a.type === 'equity').map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50"><td className="p-3 text-slate-600">{a.code} - {a.name}</td><td className="p-3 text-left font-medium text-violet-600">{formatToman(Number(a.balance))}</td></tr>
                  ))}
                  <tr className="bg-slate-50 font-bold"><td className="p-3">مجموع</td><td className="p-3 text-left text-red-700">{formatToman((summary?.totalLiabilities || 0) + (summary?.equity || 0))}</td></tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Profit & Loss */}
      {reportType === 'pl' && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-slate-50 text-slate-500 text-xs"><th className="text-right p-3">حساب</th><th className="text-right p-3">نوع</th><th className="text-left p-3">مبلغ</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.filter((a) => a.type === 'revenue').map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50"><td className="p-3">{a.code} - {a.name}</td><td className="p-3"><Badge className="bg-emerald-50 text-emerald-700">درآمد</Badge></td><td className="p-3 text-left font-medium text-emerald-600">{formatToman(Number(a.balance))}</td></tr>
                ))}
                {accounts.filter((a) => a.type === 'expense').map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50"><td className="p-3">{a.code} - {a.name}</td><td className="p-3"><Badge className="bg-amber-50 text-amber-700">هزینه</Badge></td><td className="p-3 text-left font-medium text-amber-600">{formatToman(Number(a.balance))}</td></tr>
                ))}
                <tr className="bg-slate-50 font-bold"><td className="p-3" colSpan={2}>سود خالص</td><td className={`p-3 text-left ${(summary?.netIncome || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatToman(summary?.netIncome || 0)}</td></tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Trial Balance */}
      {reportType === 'trial' && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-slate-50 text-slate-500 text-xs"><th className="text-right p-3">کد</th><th className="text-right p-3">حساب</th><th className="text-left p-3">بدهکار</th><th className="text-left p-3">بستانکار</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {trialBalance.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-slate-500" dir="ltr">{t.code}</td>
                    <td className="p-3">{t.name}</td>
                    <td className="p-3 text-left font-medium text-sky-600">{t.debit > 0 ? formatToman(t.debit) : '—'}</td>
                    <td className="p-3 text-left font-medium text-red-600">{t.credit > 0 ? formatToman(t.credit) : '—'}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold">
                  <td className="p-3" colSpan={2}>مجموع</td>
                  <td className="p-3 text-left text-sky-700">{formatToman(trialBalance.reduce((s, t) => s + t.debit, 0))}</td>
                  <td className="p-3 text-left text-red-700">{formatToman(trialBalance.reduce((s, t) => s + t.credit, 0))}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Treasury report */}
      {reportType === 'treasury' && treasurySummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card><CardContent className="p-4 flex items-center justify-between">
            <div><div className="text-xs text-slate-400">مجموع نقدی</div><div className="text-xl font-bold text-emerald-600">{formatToman(treasurySummary.cashBalance)} ت</div></div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Wallet className="w-5 h-5" /></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center justify-between">
            <div><div className="text-xs text-slate-400">مجموع بانکی</div><div className="text-xl font-bold text-sky-600">{formatToman(treasurySummary.bankBalance)} ت</div></div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center"><Landmark className="w-5 h-5" /></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center justify-between">
            <div><div className="text-xs text-slate-400">کل خزانه</div><div className="text-xl font-bold text-slate-900">{formatToman(treasurySummary.total)} ت</div></div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center"><BookOpen className="w-5 h-5" /></div>
          </CardContent></Card>
        </div>
      )}
    </div>
  );
}
