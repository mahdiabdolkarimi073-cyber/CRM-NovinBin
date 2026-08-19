'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, FileText, Undo2 } from 'lucide-react';
import { formatToman, formatJalali, toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reverseDialog, setReverseDialog] = useState(false);
  const [reverseId, setReverseId] = useState('');
  const [reverseReason, setReverseReason] = useState('');
  const [jeForm, setJeForm] = useState({
    description: '', date: '', costCenterId: '',
    lines: [{ accountId: '', debit: '', credit: '', description: '' }],
  });

  const addLine = () => setJeForm({ ...jeForm, lines: [...jeForm.lines, { accountId: '', debit: '', credit: '', description: '' }] });
  const removeLine = (i: number) => setJeForm({ ...jeForm, lines: jeForm.lines.filter((_, idx) => idx !== i) });
  const updateLine = (i: number, field: string, value: string) => {
    const lines = [...jeForm.lines];
    lines[i] = { ...lines[i], [field]: value };
    setJeForm({ ...jeForm, lines });
  };

  const totalDebit = jeForm.lines.reduce((s, l) => s + (Number(l.debit.replace(/[^0-9]/g, '')) || 0), 0);
  const totalCredit = jeForm.lines.reduce((s, l) => s + (Number(l.credit.replace(/[^0-9]/g, '')) || 0), 0);

  const handleCreate = async () => {
    if (totalDebit !== totalCredit) { toast.error('سند باید تراز باشد'); return; }
    if (jeForm.lines.length < 2) { toast.error('حداقل دو سطر لازم است'); return; }
    try {
      await onCreate({
        description: jeForm.description,
        date: jeForm.date ? new Date(jeForm.date).toISOString() : undefined,
        costCenterId: jeForm.costCenterId || undefined,
        lines: jeForm.lines.map((l) => ({
          accountId: l.accountId,
          debit: Number(l.debit.replace(/[^0-9]/g, '')) || 0,
          credit: Number(l.credit.replace(/[^0-9]/g, '')) || 0,
          description: l.description,
        })),
      });
      setDialogOpen(false);
      setJeForm({ description: '', date: '', costCenterId: '', lines: [{ accountId: '', debit: '', credit: '', description: '' }] });
    } catch (e: any) { toast.error(e.message); }
  };

  const handleReverse = async () => {
    try {
      await onReverse(reverseId, reverseReason);
      setReverseDialog(false);
      setReverseReason('');
      setReverseId('');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" /> سند جدید</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>ثبت سند حسابداری</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2 col-span-1"><Label>توضیحات</Label><Input value={jeForm.description} onChange={(e) => setJeForm({ ...jeForm, description: e.target.value })} /></div>
                <div className="space-y-2 col-span-1"><Label>تاریخ</Label><JalaliDatePicker value={jeForm.date ? new Date(jeForm.date) : null} onChange={(d) => setJeForm({ ...jeForm, date: d ? toLocalDateString(d) : '' })} /></div>
                <div className="space-y-2 col-span-1"><Label>مرکز هزینه</Label>
                  <Select value={jeForm.costCenterId} onValueChange={(v) => setJeForm({ ...jeForm, costCenterId: v === 'none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون مرکز هزینه</SelectItem>
                      {costCenters.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>سطرهای سند</Label>
                  <Button size="sm" variant="outline" onClick={addLine}><Plus className="w-3 h-3" /> سطر</Button>
                </div>
                {jeForm.lines.map((line, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <Select value={line.accountId} onValueChange={(v) => updateLine(i, 'accountId', v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="حساب..." /></SelectTrigger>
                        <SelectContent>{accounts.filter((a) => !a.isGroup).map((a) => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Input className="col-span-2 h-9 text-left" dir="ltr" placeholder="بدهکار" value={line.debit} onChange={(e) => updateLine(i, 'debit', e.target.value)} />
                    <Input className="col-span-2 h-9 text-left" dir="ltr" placeholder="بستانکار" value={line.credit} onChange={(e) => updateLine(i, 'credit', e.target.value)} />
                    <Input className="col-span-2 h-9" placeholder="شرح" value={line.description} onChange={(e) => updateLine(i, 'description', e.target.value)} />
                    <Button size="sm" variant="ghost" className="col-span-1 h-9 hover:bg-red-50" onClick={() => removeLine(i)} disabled={jeForm.lines.length <= 1}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                  </div>
                ))}
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-slate-50 text-sm">
                <span>مجموع بدهکار: <strong className={totalDebit === totalCredit ? 'text-emerald-600' : 'text-red-600'}>{formatToman(totalDebit)}</strong></span>
                <span>مجموع بستانکار: <strong className={totalDebit === totalCredit ? 'text-emerald-600' : 'text-red-600'}>{formatToman(totalCredit)}</strong></span>
                <span>تراز: <strong className={totalDebit === totalCredit ? 'text-emerald-600' : 'text-red-600'}>{totalDebit === totalCredit ? 'بله' : 'خیر'}</strong></span>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
                <Button onClick={handleCreate}>ثبت سند</Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" /></div>
      ) : entries.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-slate-400"><FileText className="w-8 h-8 mx-auto mb-2" /><div>سندی ثبت نشده. اولین سند حسابداری را ثبت کنید.</div></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {entries.map((je) => {
            const total = je.journalLines?.reduce((s: any, l: any) => s + Number(l.debit), 0) || 0;
            const isReversed = je.status === 'reversed';
            const isReversal = je.referenceType === 'reversal';
            return (
              <Card key={je.id} className={isReversed ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center"><FileText className="w-4 h-4" /></div>
                      <div>
                        <div className="font-medium text-slate-900 flex items-center gap-2">
                          سند {je.number}
                          {isReversed && <Badge variant="destructive" className="text-xs">برگشت‌خورده</Badge>}
                          {isReversal && <Badge variant="secondary" className="text-xs">سند برگشتی</Badge>}
                          {je.referenceType && je.referenceType !== 'manual' && je.referenceType !== 'reversal' && (
                            <Badge variant="outline" className="text-xs">{je.referenceType}</Badge>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">{formatJalali(je.date)} - {je.description || 'بدون توضیحات'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <div className="text-sm font-bold">{formatToman(total)} ت</div>
                        <Badge variant={je.status === 'posted' ? 'default' : 'secondary'} className="text-xs">{je.status === 'posted' ? 'ثبت شده' : je.status === 'reversed' ? 'برگشت‌خورده' : 'پیش‌نویس'}</Badge>
                      </div>
                      {je.status === 'posted' && !isReversal && (
                        <Button size="sm" variant="ghost" className="h-8 text-xs text-amber-600 hover:bg-amber-50" onClick={() => { setReverseId(je.id); setReverseDialog(true); }}>
                          <Undo2 className="w-3 h-3" /> برگشت
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100 border rounded-lg">
                    {je.journalLines?.map((l: any) => {
                      const acc = accounts.find((a) => a.id === l.accountId);
                      return (
                        <div key={l.id} className="flex items-center justify-between p-2 text-sm">
                          <span className="text-slate-600">{acc ? `${acc.code} - ${acc.name}` : '—'}</span>
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
            <p className="text-sm text-slate-500">سند برگشتی با مبالغ معکوس ثبت خواهد شد و سند اصلی به وضعیت «برگشت‌خورده» تغییر می‌کند.</p>
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
