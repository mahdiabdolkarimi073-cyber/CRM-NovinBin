'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, BookOpen, Trash2 } from 'lucide-react';
import { formatToman } from '@/lib/format';
import type { Account, CostCenter } from '@/lib/types';

const accountTypes = [
  { key: 'asset', label: 'دارایی', color: '#3b82f6' },
  { key: 'liability', label: 'بدهی', color: '#ef4444' },
  { key: 'equity', label: 'حقوق صاحبان سهام', color: '#8b5cf6' },
  { key: 'revenue', label: 'درآمد', color: '#10b981' },
  { key: 'expense', label: 'هزینه', color: '#f59e0b' },
];

interface AccountsTabProps {
  accounts: Account[];
  costCenters: CostCenter[];
  loading: boolean;
  onCreate: (data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function AccountsTab({ accounts, costCenters, loading, onCreate, onDelete }: AccountsTabProps) {
  const buildTree = (accs: Account[], parentId: string | null = null): Account[] => {
    return accs.filter((a) => a.parentId === parentId).map((a) => ({ ...a }));
  };

  const renderAccountRow = (acc: Account, level: number = 0): React.ReactElement => {
    const type = accountTypes.find((t) => t.key === acc.type) || accountTypes[0];
    const children = accounts.filter((a) => a.parentId === acc.id);
    return (
      <>
        <tr key={acc.id} className="hover:bg-[#F8FAFD] transition-colors">
          <td className="p-3 font-mono text-[#667085]" dir="ltr" style={{ paddingRight: `${level * 20 + 12}px` }}>
            {acc.code}
          </td>
          <td className="p-3 font-medium">
            <span className={level > 0 ? 'text-[#667085]' : 'text-[#1D2939]'}>{acc.name}</span>
            {acc.isGroup && <Badge variant="secondary" className="text-[10px] mr-2">گروه</Badge>}
          </td>
          <td className="p-3"><Badge style={{ backgroundColor: type.color + '20', color: type.color }}>{type.label}</Badge></td>
          <td className="p-3 font-bold text-[#1D2939]">{formatToman(Number(acc.balance))} ت</td>
          <td className="p-3 text-center">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-50" onClick={() => onDelete(acc.id)}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </td>
        </tr>
        {children.map((child) => renderAccountRow(child, level + 1))}
      </>
    );
  };

  const rootAccounts = buildTree(accounts);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="h-[30px] w-[5px] rounded-[4px] bg-[#F97316]" />
          <h2 className="text-[20px] font-bold text-[#0F172A]">چارت حساب‌ها</h2>
        </div>
        <Link href="/dashboard/accounting/accounts/new">
          <Button className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
            <Plus className="h-4 w-4" /> حساب جدید
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin w-8 h-8 border-[3px] border-[#2563EB] border-t-transparent rounded-full" /></div>
      ) : accounts.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-[#98A2B3]"><BookOpen className="w-8 h-8 mx-auto mb-2" /><div>حسابی تعریف نشده. چارت حساب‌های سازمان را ایجاد کنید.</div></CardContent></Card>
      ) : (
        <Card className="overflow-hidden rounded-[14px] border-[#E7ECF3] shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-[#F8FAFD] text-[#667085] text-xs">
                <th className="text-right p-3 font-medium">کد</th>
                <th className="text-right p-3 font-medium">نام حساب</th>
                <th className="text-right p-3 font-medium">نوع</th>
                <th className="text-right p-3 font-medium">مانده</th>
                <th className="text-center p-3 font-medium">عملیات</th>
              </tr></thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {rootAccounts.map((acc) => renderAccountRow(acc))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
