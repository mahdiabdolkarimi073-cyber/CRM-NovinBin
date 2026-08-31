'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight, Plus, ChevronLeft, ChevronDown, Trash2, Layers,
  FolderTree, FileText, Network,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Account } from '@/lib/types';

const NATURE_LABELS: Record<string, string> = {
  debit: 'بدهکار',
  credit: 'بستانکار',
  either: 'مهم نیست',
};
const NATURE_COLORS: Record<string, string> = {
  debit: '#ef4444',
  credit: '#10b981',
  either: '#64748b',
};
const LEVEL_LABELS: Record<number, string> = {
  1: 'حساب اصلی',
  2: 'زیرمجموعه',
  3: 'حساب تفصیلی',
};

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [children, setChildren] = useState<Account[]>([]);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const all = await fetchData<Account>('accounts', { where: {}, orderBy: { code: 'asc' } });
      setAllAccounts(all || []);
      const acc = (all || []).find((a) => a.id === id) || null;
      setAccount(acc);
      const kids = (all || []).filter((a) => a.parentId === id);
      setChildren(kids);
    } catch (error: any) {
      toast.error('بارگذاری ناموفق: ' + error.message);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const childrenMap = useMemo(() => {
    const map: Record<string, Account[]> = {};
    allAccounts.forEach((a) => {
      if (a.parentId) {
        if (!map[a.parentId]) map[a.parentId] = [];
        map[a.parentId].push(a);
      }
    });
    return map;
  }, [allAccounts]);

  const toggleExpand = (accId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(accId)) next.delete(accId); else next.add(accId);
      return next;
    });
  };

  const handleDelete = async (accId: string) => {
    const kids = childrenMap[accId] || [];
    if (kids.length > 0) {
      toast.error('این حساب دارای زیرمجموعه است و قابل حذف نیست');
      return;
    }
    if (!confirm('حذف این حساب؟')) return;
    try {
      await deleteData('accounts', { id: accId });
      toast.success('حساب حذف شد');
      loadData();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const renderAccountRow = (acc: Account, depth: number): React.ReactNode => {
    const kids = childrenMap[acc.id] || [];
    const hasChildren = kids.length > 0;
    const isExpanded = expanded.has(acc.id);
    const isLeaf = acc.level === 3;
    return (
      <div key={acc.id}>
        <div
          className={`flex cursor-pointer items-center gap-3 border-b border-[#F1F5F9] p-4 transition-colors hover:bg-[#F8FAFD] ${depth > 0 ? 'bg-[#FAFBFC]' : ''}`}
          style={{ paddingRight: `${16 + depth * 28}px` }}
          onClick={() => hasChildren ? toggleExpand(acc.id) : undefined}
        >
          {hasChildren ? (
            <button className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#667085] hover:bg-[#EFF4FF] hover:text-[#2563EB]">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          ) : <span className="h-6 w-6 shrink-0" />}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: isLeaf ? '#EFF6FF' : '#F1F5F9' }}>
            {isLeaf ? <FileText className="h-4 w-4 text-[#2563EB]" /> : <FolderTree className="h-4 w-4 text-[#667085]" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#1D2939]">{acc.name}</span>
              {acc.level === 2 && <Badge variant="outline" className="border-[#2563EB]/30 bg-[#2563EB]/10 text-[10px] text-[#2563EB]">زیرمجموعه</Badge>}
              {acc.level === 3 && <Badge variant="outline" className="border-[#10b981]/30 bg-[#10b981]/10 text-[10px] text-[#10b981]">تفصیلی</Badge>}
              {!acc.active && <Badge variant="outline" className="border-[#ef4444]/30 bg-[#ef4444]/10 text-[10px] text-[#ef4444]">غیرفعال</Badge>}
            </div>
          </div>
          <Badge variant="outline" className="shrink-0 font-mono text-xs text-[#667085]">{acc.code}</Badge>
          {isLeaf && (
            <Badge variant="outline" style={{ color: NATURE_COLORS[acc.nature], borderColor: `${NATURE_COLORS[acc.nature]}35`, backgroundColor: `${NATURE_COLORS[acc.nature]}10` }} className="shrink-0 text-xs">{NATURE_LABELS[acc.nature]}</Badge>
          )}
          {hasChildren && <span className="hidden shrink-0 items-center gap-1 text-xs text-[#98A2B3] sm:flex"><Layers className="h-3.5 w-3.5" />{kids.length.toLocaleString('fa-IR')}</span>}
          {acc.level < 3 && (
            <Link href={`/dashboard/chart-of-accounts/${acc.id}/new`} onClick={(e) => e.stopPropagation()} className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-[#DCE3EE] bg-white px-3 text-xs font-semibold text-[#344054] transition-colors hover:bg-[#FAFBFF]">
              <Plus className="h-3.5 w-3.5" /> زیرمجموعه
            </Link>
          )}
          {isSuperAdmin && (
            <button onClick={(e) => { e.stopPropagation(); handleDelete(acc.id); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-rose-50 hover:text-rose-500" title="حذف">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
        {hasChildren && isExpanded && kids.map((child) => renderAccountRow(child, depth + 1))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center" dir="rtl">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="w-full" dir="rtl">
        <Card><EmptyState icon={<Network className="h-8 w-8" />} title="حساب یافت نشد" description="این حساب وجود ندارد یا حذف شده است" /></Card>
      </div>
    );
  }

  return (
    <div className="w-full" dir="rtl">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <div>
              <h1 className="text-[24px] font-bold text-[#101828]">{account.name}</h1>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs text-[#667085]">{account.code}</Badge>
                <Badge variant="outline" className="text-xs">{LEVEL_LABELS[account.level] || 'حساب'}</Badge>
                {!account.active && <Badge variant="outline" className="border-[#ef4444]/30 text-xs text-[#ef4444]">غیرفعال</Badge>}
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> حسابواره <span className="mx-1.5 text-[#CBD5E1]">←</span> {account.name}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/chart-of-accounts" className="flex h-[42px] items-center gap-2 rounded-[10px] border border-[#DCE3EE] bg-white px-4 text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#FAFBFF]">
            <ArrowRight className="h-4 w-4" /> بازگشت
          </Link>
          {account.level < 3 && (
            <Link href={`/dashboard/chart-of-accounts/${account.id}/new`}>
              <Button className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
                <Plus className="h-4 w-4" /> ایجاد زیرمجموعه
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Children list */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-3 border-b border-[#E6EBF2] bg-[#F8FAFD] px-4 py-3">
            <FolderTree className="h-4 w-4 text-[#667085]" />
            <span className="text-sm font-bold text-[#1D2939]">زیرمجموعه‌ها</span>
            <Badge variant="secondary" className="text-xs">{children.length.toLocaleString('fa-IR')}</Badge>
          </div>
          {children.length === 0 ? (
            <div className="py-12 text-center">
              <FolderTree className="mx-auto h-10 w-10 text-[#CBD5E1]" />
              <p className="mt-3 text-sm text-[#98A2B3]">زیرمجموعه‌ای وجود ندارد</p>
              {account.level < 3 && (
                <Link href={`/dashboard/chart-of-accounts/${account.id}/new`}>
                  <Button variant="outline" className="mt-4">
                    <Plus className="h-4 w-4" /> افزودن زیرمجموعه
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div>{children.map((child) => renderAccountRow(child, 0))}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
