'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Wallet, Plus, Trash2, ArrowRightLeft, Landmark, Banknote } from 'lucide-react';
import { formatToman, formatJalali } from '@/lib/format';
import { toast } from 'sonner';
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
  const [bankDialog, setBankDialog] = useState(false);
  const [cashDialog, setCashDialog] = useState(false);
  const [transferDialog, setTransferDialog] = useState(false);
  const [bankForm, setBankForm] = useState({ name: '', bankName: '', accountNo: '', branchName: '', iban: '', cardNumber: '', balance: '' });
  const [cashForm, setCashForm] = useState({ name: '', type: 'cash', location: '', balance: '' });
  const [transferForm, setTransferForm] = useState({ from_type: 'bank', from_id: '', to_type: 'cash', to_id: '', amount: '', description: '' });

  const handleCreateBank = async () => {
    if (!bankForm.name || !bankForm.bankName || !bankForm.accountNo) { toast.error('نام، نام بانک و شماره حساب الزامی است'); return; }
    await onCreateBank({
      name: bankForm.name,
      bankName: bankForm.bankName,
      accountNo: bankForm.accountNo,
      branchName: bankForm.branchName || null,
      iban: bankForm.iban || null,
      cardNumber: bankForm.cardNumber || null,
      balance: Number(bankForm.balance) || 0,
    });
    setBankDialog(false);
    setBankForm({ name: '', bankName: '', accountNo: '', branchName: '', iban: '', cardNumber: '', balance: '' });
  };

  const handleCreateCash = async () => {
    if (!cashForm.name) { toast.error('نام صندوق الزامی است'); return; }
    await onCreateCash({
      name: cashForm.name,
      type: cashForm.type,
      location: cashForm.location || null,
      balance: Number(cashForm.balance) || 0,
    });
    setCashDialog(false);
    setCashForm({ name: '', type: 'cash', location: '', balance: '' });
  };

  const handleTransfer = async () => {
    if (!transferForm.from_id || !transferForm.to_id) { toast.error('مبدأ و مقصد را انتخاب کنید'); return; }
    if (transferForm.from_id === transferForm.to_id && transferForm.from_type === transferForm.to_type) { toast.error('مبدأ و مقصد یکسان هستند'); return; }
    const amount = Number(transferForm.amount.replace(/[^0-9]/g, '')) || 0;
    if (amount <= 0) { toast.error('مبلغ معتبر وارد کنید'); return; }
    try {
      await onTransfer({
        from_type: transferForm.from_type,
        from_id: transferForm.from_id,
        to_type: transferForm.to_type,
        to_id: transferForm.to_id,
        amount,
        description: transferForm.description,
      });
      setTransferDialog(false);
      setTransferForm({ from_type: 'bank', from_id: '', to_type: 'cash', to_id: '', amount: '', description: '' });
    } catch (e: any) { toast.error(e.message); }
  };

  const totalBank = bankAccounts.reduce((s, b) => s + Number(b.balance), 0);
  const totalCash = cashFunds.reduce((s, c) => s + Number(c.balance), 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-slate-400">مجموع حساب‌های بانکی</div><div className="text-xl font-bold text-sky-600">{formatToman(totalBank)} ت</div></div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center"><Landmark className="w-5 h-5" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-slate-400">مجموع صندوق‌های نقدی</div><div className="text-xl font-bold text-emerald-600">{formatToman(totalCash)} ت</div></div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Banknote className="w-5 h-5" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-slate-400">کل خزانه</div><div className="text-xl font-bold text-slate-900">{formatToman(totalBank + totalCash)} ت</div></div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center"><Wallet className="w-5 h-5" /></div>
        </CardContent></Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Dialog open={bankDialog} onOpenChange={setBankDialog}>
          <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-4 h-4" /> حساب بانکی جدید</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>حساب بانکی جدید</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>نام حساب *</Label><Input value={bankForm.name} onChange={(e) => setBankForm({ ...bankForm, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>نام بانک *</Label><Input value={bankForm.bankName} onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>شماره حساب *</Label><Input dir="ltr" value={bankForm.accountNo} onChange={(e) => setBankForm({ ...bankForm, accountNo: e.target.value })} /></div>
                <div className="space-y-2"><Label>شماره شبا</Label><Input dir="ltr" value={bankForm.iban} onChange={(e) => setBankForm({ ...bankForm, iban: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>نام شعبه</Label><Input value={bankForm.branchName} onChange={(e) => setBankForm({ ...bankForm, branchName: e.target.value })} /></div>
                <div className="space-y-2"><Label>شماره کارت</Label><Input dir="ltr" value={bankForm.cardNumber} onChange={(e) => setBankForm({ ...bankForm, cardNumber: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>موجودی اولیه</Label><Input dir="ltr" value={bankForm.balance} onChange={(e) => setBankForm({ ...bankForm, balance: e.target.value })} /></div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setBankDialog(false)}>انصراف</Button><Button onClick={handleCreateBank}>ایجاد</Button></DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={cashDialog} onOpenChange={setCashDialog}>
          <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-4 h-4" /> صندوق نقدی جدید</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>صندوق نقدی جدید</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2"><Label>نام صندوق *</Label><Input value={cashForm.name} onChange={(e) => setCashForm({ ...cashForm, name: e.target.value })} placeholder="مثلاً: صندوق فروشگاه" /></div>
              <div className="space-y-2"><Label>نوع</Label>
                <select className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" value={cashForm.type} onChange={(e) => setCashForm({ ...cashForm, type: e.target.value })}>
                  <option value="cash">صندوق نقدی</option>
                  <option value="register">صندوق فروشگاهی</option>
                </select>
              </div>
              <div className="space-y-2"><Label>محل</Label><Input value={cashForm.location} onChange={(e) => setCashForm({ ...cashForm, location: e.target.value })} /></div>
              <div className="space-y-2"><Label>موجودی اولیه</Label><Input dir="ltr" value={cashForm.balance} onChange={(e) => setCashForm({ ...cashForm, balance: e.target.value })} /></div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setCashDialog(false)}>انصراف</Button><Button onClick={handleCreateCash}>ایجاد</Button></DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
          <DialogTrigger asChild><Button size="sm"><ArrowRightLeft className="w-4 h-4" /> انتقال وجه</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>انتقال وجه بین صندوق‌ها</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>مبدأ</Label>
                  <select className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" value={`${transferForm.from_type}:${transferForm.from_id}`} onChange={(e) => { const [t, id] = e.target.value.split(':'); setTransferForm({ ...transferForm, from_type: t, from_id: id }); }}>
                    <option value="bank:">— انتخاب —</option>
                    {bankAccounts.map((b) => <option key={b.id} value={`bank:${b.id}`}>بانک - {b.name}</option>)}
                    {cashFunds.map((c) => <option key={c.id} value={`cash:${c.id}`}>صندوق - {c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2"><Label>مقصد</Label>
                  <select className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" value={`${transferForm.to_type}:${transferForm.to_id}`} onChange={(e) => { const [t, id] = e.target.value.split(':'); setTransferForm({ ...transferForm, to_type: t, to_id: id }); }}>
                    <option value="cash:">— انتخاب —</option>
                    {bankAccounts.map((b) => <option key={b.id} value={`bank:${b.id}`}>بانک - {b.name}</option>)}
                    {cashFunds.map((c) => <option key={c.id} value={`cash:${c.id}`}>صندوق - {c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2"><Label>مبلغ (تومان)</Label><Input dir="ltr" value={transferForm.amount} onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })} /></div>
              <div className="space-y-2"><Label>توضیحات</Label><Input value={transferForm.description} onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })} /></div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setTransferDialog(false)}>انصراف</Button><Button onClick={handleTransfer}>انتقال</Button></DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Bank accounts list */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-2">حساب‌های بانکی</h3>
        {loading ? (
          <div className="flex items-center justify-center h-20"><div className="animate-spin w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full" /></div>
        ) : bankAccounts.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-slate-400">حساب بانکی ثبت نشده</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {bankAccounts.map((ba) => (
              <Card key={ba.id}><CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center"><Landmark className="w-5 h-5" /></div>
                    <div>
                      <div className="font-medium text-sm">{ba.name}</div>
                      <div className="text-xs text-slate-400">{ba.bankName} - {ba.accountNo}</div>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sky-600">{formatToman(Number(ba.balance))}</div>
                    <div className="text-xs text-slate-400">تومان</div>
                  </div>
                </div>
              </CardContent></Card>
            ))}
          </div>
        )}
      </div>

      {/* Cash funds list */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-2">صندوق‌های نقدی</h3>
        {cashFunds.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-slate-400">صندوقی ثبت نشده</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cashFunds.map((cf) => (
              <Card key={cf.id}><CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Banknote className="w-5 h-5" /></div>
                    <div>
                      <div className="font-medium text-sm">{cf.name}</div>
                      <div className="text-xs text-slate-400">{cf.type === 'cash' ? 'صندوق نقدی' : 'صندوق فروشگاهی'}{cf.location ? ` - ${cf.location}` : ''}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <div className="font-bold text-emerald-600">{formatToman(Number(cf.balance))}</div>
                      <div className="text-xs text-slate-400">تومان</div>
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
          <h3 className="text-sm font-bold text-slate-700 mb-2">تاریخچه انتقال‌ها</h3>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {transfers.slice(0, 10).map((ft) => {
                  const fromName = ft.fromType === 'bank' ? bankAccounts.find((b) => b.id === ft.fromId)?.name : cashFunds.find((c) => c.id === ft.fromId)?.name;
                  const toName = ft.toType === 'bank' ? bankAccounts.find((b) => b.id === ft.toId)?.name : cashFunds.find((c) => c.id === ft.toId)?.name;
                  return (
                    <div key={ft.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-smooth">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center"><ArrowRightLeft className="w-4 h-4" /></div>
                        <div>
                          <div className="text-sm font-medium">{fromName} → {toName}</div>
                          <div className="text-xs text-slate-400">{ft.number} - {formatJalali(ft.date)}{ft.description ? ` - ${ft.description}` : ''}</div>
                        </div>
                      </div>
                      <div className="font-bold text-slate-700">{formatToman(Number(ft.amount))} ت</div>
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
