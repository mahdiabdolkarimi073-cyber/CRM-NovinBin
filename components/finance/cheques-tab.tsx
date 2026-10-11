'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileCheck, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { formatToman, formatJalali } from '@/lib/format';
import type { Cheque, BankAccount } from '@/lib/types';

const chequeStatusLabels: Record<string, string> = {
  pending: 'در جریان', cleared: 'تسویه شده', bounced: 'برگشت‌خورده', transferred: 'واگذار شده',
};
const chequeStatusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-400', cleared: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  bounced: 'bg-red-500/10 text-red-700 dark:text-red-400', transferred: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
};

interface ChequesTabProps {
  cheques: Cheque[];
  bankAccounts: BankAccount[];
  loading: boolean;
  onCreate: (data: any) => Promise<void>;
  onClear: (id: string) => Promise<void>;
  onBounce: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ChequesTab({ cheques, bankAccounts, loading, onCreate, onClear, onBounce, onDelete }: ChequesTabProps) {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? cheques : cheques.filter((c) => c.status === filter);
  const totalReceived = cheques.filter((c) => c.type === 'received' && c.status === 'pending').reduce((s, c) => s + Number(c.amount), 0);
  const totalPaid = cheques.filter((c) => c.type === 'paid' && c.status === 'pending').reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mobile:gap-2.5">
        <span className="h-[26px] w-[4px] rounded-[4px] bg-[#F97316] mobile:h-[30px] mobile:w-[5px]" />
        <h2 className="text-[18px] font-bold text-foreground mobile:text-[20px]">چک‌ها</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 mobile:gap-4">
        <Card className="rounded-[14px] border-border shadow-[0_3px_14px_rgba(20,40,80,.05)]"><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-muted-foreground">چک‌های دریافتی در جریان</div><div className="text-lg font-bold text-emerald-600">{formatToman(totalReceived)} ت</div></div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"><FileCheck className="w-5 h-5" /></div>
        </CardContent></Card>
        <Card className="rounded-[14px] border-border shadow-[0_3px_14px_rgba(20,40,80,.05)]"><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-muted-foreground">چک‌های پرداختی در جریان</div><div className="text-lg font-bold text-red-600">{formatToman(totalPaid)} ت</div></div>
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center"><FileCheck className="w-5 h-5" /></div>
        </CardContent></Card>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1.5 mobile:gap-2 flex-wrap">
          {['all', 'pending', 'cleared', 'bounced'].map((s) => (
            <Button key={s} size="sm" variant={filter === s ? 'default' : 'outline'} className="h-9 mobile:h-[42px] rounded-[10px] text-xs mobile:text-sm" onClick={() => setFilter(s)}>
              {s === 'all' ? 'همه' : chequeStatusLabels[s]}
            </Button>
          ))}
        </div>
        <Link href="/dashboard/accounting/cheques/new">
          <Button size="sm" className="h-9 mobile:h-[42px] rounded-[10px] bg-[#3155E7] px-3 mobile:px-[18px] text-xs mobile:text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
            <Plus className="w-4 h-4" /> چک جدید
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin w-8 h-8 border-[3px] border-[#2563EB] border-t-transparent rounded-full" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground"><FileCheck className="w-8 h-8 mx-auto mb-2" /><div>چکی ثبت نشده</div></CardContent></Card>
      ) : (
        <Card className="overflow-hidden rounded-[14px] border-border shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead><tr className="border-b bg-muted/50 text-muted-foreground text-xs">
                <th className="text-right p-2 mobile:p-3 font-medium">شماره</th>
                <th className="text-right p-2 mobile:p-3 font-medium">نوع</th>
                <th className="text-right p-2 mobile:p-3 font-medium">مبلغ</th>
                <th className="text-right p-2 mobile:p-3 font-medium">سررسید</th>
                <th className="text-right p-2 mobile:p-3 font-medium">وضعیت</th>
                <th className="text-center p-2 mobile:p-3 font-medium">عملیات</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {filtered.map((chq) => (
                  <tr key={chq.id} className="hover:bg-muted/50 transition-colors">
                    <td className="p-3 font-mono text-muted-foreground" dir="ltr">{chq.number}</td>
                    <td className="p-3"><Badge variant={chq.type === 'received' ? 'default' : 'secondary'} className="text-xs">{chq.type === 'received' ? 'دریافتی' : 'پرداختی'}</Badge></td>
                    <td className="p-3 font-bold text-foreground">{formatToman(Number(chq.amount))} ت</td>
                    <td className="p-3 text-muted-foreground">{formatJalali(chq.dueDate)}</td>
                    <td className="p-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${chequeStatusColors[chq.status]}`}>{chequeStatusLabels[chq.status]}</span></td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        {chq.status === 'pending' && (
                          <>
                            <Button size="sm" variant="ghost" className="h-8 text-xs text-emerald-600 hover:bg-emerald-500/10" onClick={() => onClear(chq.id)}><CheckCircle2 className="w-3 h-3" /> تسویه</Button>
                            <Button size="sm" variant="ghost" className="h-8 text-xs text-red-600 hover:bg-red-500/10" onClick={() => onBounce(chq.id)}><XCircle className="w-3 h-3" /> برگشت</Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-500/10" onClick={() => onDelete(chq.id)}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
