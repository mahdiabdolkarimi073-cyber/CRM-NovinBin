'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Plus, Trash2, ArrowRightLeft, Landmark, Banknote } from 'lucide-react';
import { formatToman, formatJalali } from '@/lib/format';
import type { BankAccount, CashFund, FundTransfer } from '@/lib/types';

interface TreasuryTabProps {
  bankAccounts: BankAccount[];
  cashFunds: CashFund[];
  transfers: FundTransfer[];
  loading: boolean;
  onCreateBank: (data: any) => Promise<void>;
  onCreateCash: (data: any) => Promise<void>;
  onTransfer: (data: any) => Promise<void>;
  onDeleteCash: (id: string) => Promise<void>;
}

export function TreasuryTab({ bankAccounts, cashFunds, transfers, loading, onCreateBank, onCreateCash, onTransfer, onDeleteCash }: TreasuryTabProps) {
  const totalBank = bankAccounts.reduce((s, b) => s + Number(b.balance), 0);
  const totalCash = cashFunds.reduce((s, c) => s + Number(c.balance), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <span className="h-[30px] w-[5px] rounded-[4px] bg-[#F97316]" />
        <h2 className="text-[20px] font-bold text-[#0F172A]">خزانه‌داری</h2>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-[14px] border-[#E7ECF3] shadow-[0_3px_14px_rgba(20,40,80,.05)]"><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-[#98A2B3]">مجموع حساب‌های بانکی</div><div className="text-xl font-bold text-sky-600">{formatToman(totalBank)} ت</div></div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center"><Landmark className="w-5 h-5" /></div>
        </CardContent></Card>
        <Card className="rounded-[14px] border-[#E7ECF3] shadow-[0_3px_14px_rgba(20,40,80,.05)]"><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-[#98A2B3]">مجموع صندوق‌های نقدی</div><div className="text-xl font-bold text-emerald-600">{formatToman(totalCash)} ت</div></div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Banknote className="w-5 h-5" /></div>
        </CardContent></Card>
        <Card className="rounded-[14px] border-[#E7ECF3] shadow-[0_3px_14px_rgba(20,40,80,.05)]"><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-[#98A2B3]">کل خزانه</div><div className="text-xl font-bold text-[#1D2939]">{formatToman(totalBank + totalCash)} ت</div></div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center"><Wallet className="w-5 h-5" /></div>
        </CardContent></Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/accounting/treasury/bank/new">
          <Button size="sm" variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-white text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#FAFBFF]"><Plus className="w-4 h-4" /> حساب بانکی جدید</Button>
        </Link>
        <Link href="/dashboard/accounting/treasury/cash/new">
          <Button size="sm" variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-white text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#FAFBFF]"><Plus className="w-4 h-4" /> صندوق نقدی جدید</Button>
        </Link>
        <Link href="/dashboard/accounting/treasury/transfer/new">
          <Button size="sm" className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]"><ArrowRightLeft className="w-4 h-4" /> انتقال وجه</Button>
        </Link>
      </div>

      {/* Bank accounts list */}
      <div>
        <h3 className="text-sm font-bold text-[#344054] mb-2">حساب‌های بانکی</h3>
        {loading ? (
          <div className="flex items-center justify-center h-20"><div className="animate-spin w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full" /></div>
        ) : bankAccounts.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-[#98A2B3]">حساب بانکی ثبت نشده</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {bankAccounts.map((ba) => (
              <Card key={ba.id} className="rounded-[14px] border-[#E7ECF3] shadow-[0_3px_14px_rgba(20,40,80,.05)]"><CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center"><Landmark className="w-5 h-5" /></div>
                    <div>
                      <div className="font-medium text-sm text-[#1D2939]">{ba.name}</div>
                      <div className="text-xs text-[#98A2B3]">{ba.bankName} - {ba.accountNo}</div>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sky-600">{formatToman(Number(ba.balance))}</div>
                    <div className="text-xs text-[#98A2B3]">تومان</div>
                  </div>
                </div>
              </CardContent></Card>
            ))}
          </div>
        )}
      </div>

      {/* Cash funds list */}
      <div>
        <h3 className="text-sm font-bold text-[#344054] mb-2">صندوق‌های نقدی</h3>
        {cashFunds.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-[#98A2B3]">صندوقی ثبت نشده</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cashFunds.map((cf) => (
              <Card key={cf.id} className="rounded-[14px] border-[#E7ECF3] shadow-[0_3px_14px_rgba(20,40,80,.05)]"><CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Banknote className="w-5 h-5" /></div>
                    <div>
                      <div className="font-medium text-sm text-[#1D2939]">{cf.name}</div>
                      <div className="text-xs text-[#98A2B3]">{cf.type === 'cash' ? 'صندوق نقدی' : 'صندوق فروشگاهی'}{cf.location ? ` - ${cf.location}` : ''}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <div className="font-bold text-emerald-600">{formatToman(Number(cf.balance))}</div>
                      <div className="text-xs text-[#98A2B3]">تومان</div>
                    </div>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-50" onClick={() => onDeleteCash(cf.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </div>
                </div>
              </CardContent></Card>
            ))}
          </div>
        )}
      </div>

      {/* Transfer history */}
      {transfers.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-[#344054] mb-2">تاریخچه انتقال‌ها</h3>
          <Card className="rounded-[14px] border-[#E7ECF3] shadow-[0_3px_14px_rgba(20,40,80,.05)]">
            <CardContent className="p-0">
              <div className="divide-y divide-[#F1F5F9]">
                {transfers.slice(0, 10).map((ft) => {
                  const fromName = ft.fromType === 'bank' ? bankAccounts.find((b) => b.id === ft.fromId)?.name : cashFunds.find((c) => c.id === ft.fromId)?.name;
                  const toName = ft.toType === 'bank' ? bankAccounts.find((b) => b.id === ft.toId)?.name : cashFunds.find((c) => c.id === ft.toId)?.name;
                  return (
                    <div key={ft.id} className="flex items-center justify-between p-3 hover:bg-[#F8FAFD] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center"><ArrowRightLeft className="w-4 h-4" /></div>
                        <div>
                          <div className="text-sm font-medium text-[#1D2939]">{fromName} → {toName}</div>
                          <div className="text-xs text-[#98A2B3]">{ft.number} - {formatJalali(ft.date)}{ft.description ? ` - ${ft.description}` : ''}</div>
                        </div>
                      </div>
                      <div className="font-bold text-[#1D2939]">{formatToman(Number(ft.amount))} ت</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
