'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, Lock, Unlock } from 'lucide-react';
import { formatJalali } from '@/lib/format';
import type { FiscalYear } from '@/lib/types';

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
  const [expandedFY, setExpandedFY] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="h-[30px] w-[5px] rounded-[4px] bg-[#F97316]" />
          <h2 className="text-[20px] font-bold text-[#0F172A]">سال مالی</h2>
        </div>
        <Link href="/dashboard/accounting/fiscal-years/new">
          <Button className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
            <Plus className="h-4 w-4" /> سال مالی جدید
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin w-8 h-8 border-[3px] border-[#2563EB] border-t-transparent rounded-full" /></div>
      ) : fiscalYears.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-[#98A2B3]"><Calendar className="w-8 h-8 mx-auto mb-2" /><div>سال مالی تعریف نشده</div></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {fiscalYears.map((fy) => (
            <Card key={fy.id} className="rounded-[14px] border-[#E7ECF3] shadow-[0_3px_14px_rgba(20,40,80,.05)]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${fy.status === 'open' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-[#1D2939] flex items-center gap-2">
                        {fy.name}
                        <Badge variant={fy.status === 'open' ? 'default' : 'secondary'} className="text-xs">{fy.status === 'open' ? 'باز' : 'بسته شده'}</Badge>
                      </div>
                      <div className="text-xs text-[#98A2B3]">{formatJalali(fy.startDate)} تا {formatJalali(fy.endDate)}</div>
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
                  <div className="mt-3 border-t border-[#F1F5F9] pt-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {fy.fiscalPeriods.sort((a, b) => a.periodNumber - b.periodNumber).map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-[#F8FAFD]">
                          <div className="flex items-center gap-2">
                            <Lock className={`w-3 h-3 ${p.status === 'open' ? 'text-emerald-500' : 'text-slate-400'}`} />
                            <div>
                              <div className="text-xs font-medium text-[#1D2939]">{p.name}</div>
                              <div className="text-[10px] text-[#98A2B3]">{formatJalali(p.startDate)}</div>
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
