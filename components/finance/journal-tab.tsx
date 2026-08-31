'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, FileText, Undo2 } from 'lucide-react';
import { formatToman, formatJalali } from '@/lib/format';
import type { Account, JournalEntry, CostCenter } from '@/lib/types';

interface JournalTabProps {
  entries: JournalEntry[];
  accounts: Account[];
  costCenters: CostCenter[];
  loading: boolean;
  onCreate: (data: any) => Promise<void>;
  onReverse: (id: string, reason: string) => Promise<void>;
}

export function JournalTab({ entries, accounts, costCenters, loading, onCreate, onReverse }: JournalTabProps) {
  const [reverseDialog, setReverseDialog] = useState(false);
  const [reverseId, setReverseId] = useState('');
  const [reverseReason, setReverseReason] = useState('');

  const handleReverse = async () => {
    try {
      await onReverse(reverseId, reverseReason);
      setReverseDialog(false);
      setReverseReason('');
      setReverseId('');
    } catch (e: any) {}
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="h-[30px] w-[5px] rounded-[4px] bg-[#F97316]" />
          <h2 className="text-[20px] font-bold text-[#0F172A]">اسناد حسابداری</h2>
        </div>
        <Link href="/dashboard/accounting/journal/new">
          <Button className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
            <Plus className="h-4 w-4" /> سند جدید
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin w-8 h-8 border-[3px] border-[#2563EB] border-t-transparent rounded-full" /></div>
      ) : entries.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-[#98A2B3]"><FileText className="w-8 h-8 mx-auto mb-2" /><div>سندی ثبت نشده. اولین سند حسابداری را ثبت کنید.</div></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {entries.map((je) => {
            const total = je.journalLines?.reduce((s: any, l: any) => s + Number(l.debit), 0) || 0;
            const isReversed = je.status === 'reversed';
            const isReversal = je.referenceType === 'reversal';
            return (
              <Card key={je.id} className={`rounded-[14px] border-[#E7ECF3] shadow-[0_3px_14px_rgba(20,40,80,.05)] ${isReversed ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center"><FileText className="w-4 h-4" /></div>
                      <div>
                        <div className="font-medium text-[#1D2939] flex items-center gap-2">
                          سند {je.number}
                          {isReversed && <Badge variant="destructive" className="text-xs">برگشت‌خورده</Badge>}
                          {isReversal && <Badge variant="secondary" className="text-xs">سند برگشتی</Badge>}
                          {je.referenceType && je.referenceType !== 'manual' && je.referenceType !== 'reversal' && (
                            <Badge variant="outline" className="text-xs">{je.referenceType}</Badge>
                          )}
                        </div>
                        <div className="text-xs text-[#98A2B3]">{formatJalali(je.date)} - {je.description || 'بدون توضیحات'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <div className="text-sm font-bold text-[#1D2939]">{formatToman(total)} ت</div>
                        <Badge variant={je.status === 'posted' ? 'default' : 'secondary'} className="text-xs">{je.status === 'posted' ? 'ثبت شده' : je.status === 'reversed' ? 'برگشت‌خورده' : 'پیش‌نویس'}</Badge>
                      </div>
                      {je.status === 'posted' && !isReversal && (
                        <Button size="sm" variant="ghost" className="h-8 text-xs text-amber-600 hover:bg-amber-50" onClick={() => { setReverseId(je.id); setReverseDialog(true); }}>
                          <Undo2 className="w-3 h-3" /> برگشت
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="divide-y divide-[#F1F5F9] border border-[#E7ECF3] rounded-lg">
                    {je.journalLines?.map((l: any) => {
                      const acc = accounts.find((a) => a.id === l.accountId);
                      return (
                        <div key={l.id} className="flex items-center justify-between p-2 text-sm">
                          <span className="text-[#667085]">{acc ? `${acc.code} - ${acc.name}` : '—'}</span>
                          <div className="flex items-center gap-4">
                            <span className="w-28 text-left font-medium text-sky-600">{Number(l.debit) > 0 ? formatToman(Number(l.debit)) : '—'}</span>
                            <span className="w-28 text-left font-medium text-red-600">{Number(l.credit) > 0 ? formatToman(Number(l.credit)) : '—'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={reverseDialog} onOpenChange={setReverseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>برگشت سند</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#667085]">سند برگشتی با مبالغ معکوس ثبت خواهد شد و سند اصلی به وضعیت «برگشت‌خورده» تغییر می‌کند.</p>
            <div className="space-y-2"><Label>دلیل برگشت</Label><Input value={reverseReason} onChange={(e) => setReverseReason(e.target.value)} placeholder="مثلاً: اشتباه در ثبت" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReverseDialog(false)}>انصراف</Button>
              <Button onClick={handleReverse} disabled={!reverseReason}>ثبت برگشت</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
