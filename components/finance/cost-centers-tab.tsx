'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Building2 } from 'lucide-react';
import type { CostCenter } from '@/lib/types';

interface CostCentersTabProps {
  costCenters: CostCenter[];
  loading: boolean;
  onCreate: (data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function CostCentersTab({ costCenters, loading, onCreate, onDelete }: CostCentersTabProps) {
  const rootCenters = costCenters.filter((c) => !c.parentId);
  const getChildren = (parentId: string) => costCenters.filter((c) => c.parentId === parentId);

  const renderCenter = (cc: CostCenter, level: number = 0): { cc: CostCenter; level: number }[] => {
    const children = getChildren(cc.id);
    return [{ cc, level }, ...children.flatMap((child) => renderCenter(child, level + 1))];
  };

  const flatList = rootCenters.flatMap((root) => renderCenter(root));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="h-[30px] w-[5px] rounded-[4px] bg-[#F97316]" />
          <h2 className="text-[20px] font-bold text-[#0F172A]">مراکز هزینه</h2>
        </div>
        <Link href="/dashboard/accounting/cost-centers/new">
          <Button className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
            <Plus className="h-4 w-4" /> مرکز هزینه جدید
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin w-8 h-8 border-[3px] border-[#2563EB] border-t-transparent rounded-full" /></div>
      ) : costCenters.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-[#98A2B3]"><Building2 className="w-8 h-8 mx-auto mb-2" /><div>مرکز هزینه‌ای تعریف نشده</div></CardContent></Card>
      ) : (
        <Card className="overflow-hidden rounded-[14px] border-[#E7ECF3] shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-[#F8FAFD] text-[#667085] text-xs">
                <th className="text-right p-3 font-medium">کد</th>
                <th className="text-right p-3 font-medium">نام</th>
                <th className="text-center p-3 font-medium">عملیات</th>
              </tr></thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {flatList.map(({ cc, level }) => (
                  <tr key={cc.id} className="hover:bg-[#F8FAFD] transition-colors">
                    <td className="p-3 font-mono text-[#667085]" dir="ltr" style={{ paddingRight: `${level * 20 + 12}px` }}>{cc.code}</td>
                    <td className="p-3 font-medium">
                      <span className={level > 0 ? 'text-[#667085]' : 'text-[#1D2939]'}>{cc.name}</span>
                      {!cc.active && <Badge variant="secondary" className="text-xs mr-2">غیرفعال</Badge>}
                    </td>
                    <td className="p-3 text-center">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-50" onClick={() => onDelete(cc.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
