'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Calendar, Lock, Unlock } from 'lucide-react';
import { formatJalali, toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';
import type { FiscalYear, FiscalPeriod } from '@/lib/types';

interface FiscalYearsTabProps {
  fiscalYears: FiscalYear[];
  loading: boolean;
  onCreate: (data: any) => Promise<void>;
  onClose: (id: string) => Promise<void>;
  onReopen: (id: string) => Promise<void>;
  onClosePeriod: (id: string) => Promise<void>;
  onOpenPeriod: (id: string) => Promise<void>;
}

export function FiscalYearsTab({ fiscalYears, loading, onCreate, onClose, onReopen, onClosePeriod, onOpenPeriod }: FiscalYearsTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', autoPeriods: true });
  const [expandedFY, setExpandedFY] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!form.name || !form.startDate || !form.endDate) { toast.error('نام و تاریخ شروع و پایان الزامی است'); return; }
    await onCreate({
      name: form.name,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      autoPeriods: form.autoPeriods,
    });
    setDialogOpen(false);
    setForm({ name: '', startDate: '', endDate: '', autoPeriods: true });
  };

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" /> سال مالی جدید</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>تعریف سال مالی</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2"><Label>نام سال مالی *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثلاً: سال ۱۴۰۵" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>تاریخ شروع *</Label><JalaliDatePicker value={form.startDate ? new Date(form.startDate) : null} onChange={(d) => setForm({ ...form, startDate: d ? toLocalDateString(d) : '' })} /></div>
                <div className="space-y-2"><Label>تاریخ پایان *</Label><JalaliDatePicker value={form.endDate ? new Date(form.endDate) : null} onChange={(d) => setForm({ ...form, endDate: d ? toLocalDateString(d) : '' })} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.autoPeriods} onChange={(e) => setForm({ ...form, autoPeriods: e.target.checked })} className="rounded" />
                ایجاد خودکار دوره‌های ماهانه
              </label>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button><Button onClick={handleCreate}>ایجاد</Button></DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" /></div>
      ) : fiscalYears.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-slate-400"><Calendar className="w-8 h-8 mx-auto mb-2" /><div>سال مالی تعریف نشده</div></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {fiscalYears.map((fy) => (
            <Card key={fy.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${fy.status === 'open' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-sm flex items-center gap-2">
                        {fy.name}
                        <Badge variant={fy.status === 'open' ? 'default' : 'secondary'} className="text-xs">{fy.status === 'open' ? 'باز' : 'بسته شده'}</Badge>
                      </div>
                      <div className="text-xs text-slate-400">{formatJalali(fy.startDate)} تا {formatJalali(fy.endDate)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {fy.fiscalPeriods && fy.fiscalPeriods.length > 0 && (
                      <Button size="sm" variant="ghost" className="text-xs" onClick={() => setExpandedFY(expandedFY === fy.id ? null : fy.id)}>
                        {expandedFY === fy.id ? 'بستن دوره‌ها' : `${fy.fiscalPeriods.length} دوره`}
                      </Button>
                    )}
                    {fy.status === 'open' ? (
                      <Button size="sm" variant="outline" className="text-xs text-red-600 hover:bg-red-50" onClick={() => { if (confirm('بستن سال مالی؟ این عمل قابل بازگشت است.')) onClose(fy.id); }}>
                        <Lock className="w-3 h-3" /> بستن سال
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="text-xs text-emerald-600 hover:bg-emerald-50" onClick={() => onReopen(fy.id)}>
                        <Unlock className="w-3 h-3" /> باز کردن
                      </Button>
                    )}
                  </div>
                </div>

                {expandedFY === fy.id && fy.fiscalPeriods && (
                  <div className="mt-3 border-t pt-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {fy.fiscalPeriods.sort((a, b) => a.periodNumber - b.periodNumber).map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                          <div className="flex items-center gap-2">
                            <Lock className={`w-3 h-3 ${p.status === 'open' ? 'text-emerald-500' : 'text-slate-400'}`} />
                            <div>
                              <div className="text-xs font-medium">{p.name}</div>
                              <div className="text-[10px] text-slate-400">{formatJalali(p.startDate)}</div>
                            </div>
                          </div>
                          {p.status === 'open' ? (
                            <Button size="sm" variant="ghost" className="h-7 text-[10px] text-red-600 hover:bg-red-50" onClick={() => onClosePeriod(p.id)}>بستن</Button>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-7 text-[10px] text-emerald-600 hover:bg-emerald-50" onClick={() => onOpenPeriod(p.id)}>باز کردن</Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
