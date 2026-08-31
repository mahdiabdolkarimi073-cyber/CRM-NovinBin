'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Network, Plus, Search, ChevronLeft, ChevronDown, Trash2,
  Layers, FolderTree, FileText,
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

export default function ChartOfAccountsPage() {
  const { profile } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchData<Account>('accounts', { where: {}, orderBy: { code: 'asc' } });
      setAccounts(data || []);
    } catch (error: any) {
      toast.error('بارگذاری حساب‌ها ناموفق: ' + error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const childrenMap = useMemo(() => {
    const map: Record<string, Account[]> = {};
    accounts.forEach((a) => {
      if (a.parentId) {
        if (!map[a.parentId]) map[a.parentId] = [];
        map[a.parentId].push(a);
      }
    });
    return map;
  }, [accounts]);

  const rootAccounts = useMemo(() => {
    const roots = accounts.filter((a) => !a.parentId);
    const query = search.trim().toLocaleLowerCase();
    if (!query) return roots;
    const matches = new Set<string>();
    accounts.forEach((a) => {
      if (a.name.toLocaleLowerCase().includes(query) || a.code.includes(query)) {
        matches.add(a.id);
        if (a.parentId) matches.add(a.parentId);
      }
    });
    return roots.filter((r) => matches.has(r.id));
  }, [accounts, search]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    const children = childrenMap[id] || [];
    if (children.length > 0) {
      toast.error('این حساب دارای زیرمجموعه است و قابل حذف نیست');
      return;
    }
    if (!confirm('حذف این حساب؟')) return;
    try {
      await deleteData('accounts', { id });
      toast.success('حساب حذف شد');
      loadData();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const renderAccountRow = (account: Account, depth: number): React.ReactNode => {
    const children = childrenMap[account.id] || [];
    const hasChildren = children.length > 0;
    const isExpanded = expanded.has(account.id);
    const isLeaf = account.level === 3;

    return (
      <div key={account.id}>
        <div
          className={`flex cursor-pointer items-center gap-3 border-b border-[#F1F5F9] p-4 transition-colors hover:bg-[#F8FAFD] ${depth > 0 ? 'bg-[#FAFBFC]' : ''}`}
          style={{ paddingRight: `${16 + depth * 28}px` }}
          onClick={() => hasChildren ? toggleExpand(account.id) : undefined}
        >
          {hasChildren ? (
            <button className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#667085] hover:bg-[#EFF4FF] hover:text-[#2563EB]">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          ) : (
            <span className="h-6 w-6 shrink-0" />
          )}

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: isLeaf ? '#EFF6FF' : '#F1F5F9' }}>
            {isLeaf ? <FileText className="h-4 w-4 text-[#2563EB]" /> : <FolderTree className="h-4 w-4 text-[#667085]" />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#1D2939]">{account.name}</span>
              {account.level === 1 && <Badge variant="outline" className="border-[#FF7A00]/30 bg-[#FF7A00]/10 text-[10px] text-[#FF7A00]">حساب اصلی</Badge>}
              {account.level === 2 && <Badge variant="outline" className="border-[#2563EB]/30 bg-[#2563EB]/10 text-[10px] text-[#2563EB]">زیرمجموعه</Badge>}
              {account.level === 3 && <Badge variant="outline" className="border-[#10b981]/30 bg-[#10b981]/10 text-[10px] text-[#10b981]">حساب تفصیلی</Badge>}
              {!account.active && <Badge variant="outline" className="border-[#ef4444]/30 bg-[#ef4444]/10 text-[10px] text-[#ef4444]">غیرفعال</Badge>}
            </div>
            {account.description && <div className="mt-0.5 truncate text-xs text-[#98A2B3]">{account.description}</div>}
          </div>

          <Badge variant="outline" className="shrink-0 font-mono text-xs text-[#667085]">{account.code}</Badge>

          {isLeaf && (
            <Badge variant="outline" style={{ color: NATURE_COLORS[account.nature], borderColor: `${NATURE_COLORS[account.nature]}35`, backgroundColor: `${NATURE_COLORS[account.nature]}10` }} className="shrink-0 text-xs">
              {NATURE_LABELS[account.nature]}
            </Badge>
          )}

          {hasChildren && (
            <span className="hidden shrink-0 items-center gap-1 text-xs text-[#98A2B3] sm:flex">
              <Layers className="h-3.5 w-3.5" />
              {children.length.toLocaleString('fa-IR')}
            </span>
          )}

          <Link
            href={`/dashboard/chart-of-accounts/${account.id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-[#DCE3EE] bg-white px-3 text-xs font-semibold text-[#344054] transition-colors hover:bg-[#FAFBFF]"
          >
            <Plus className="h-3.5 w-3.5" />
            زیرمجموعه
          </Link>

          {isSuperAdmin && (
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(account.id); }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-rose-50 hover:text-rose-500"
              title="حذف"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
        {hasChildren && isExpanded && children.map((child) => renderAccountRow(child, depth + 1))}
      </div>
    );
  };

  const totalAccounts = accounts.length;
  const rootCount = rootAccounts.length;
  const leafCount = accounts.filter((a) => a.level === 3).length;

  return (
    <div className="w-full" dir="rtl">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">حسابواره</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> مالی <span className="mx-1.5 text-[#CBD5E1]">←</span> حسابواره</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/chart-of-accounts/new">
            <Button className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
              <Plus className="h-4 w-4" /> ایجاد حسابواره جدید
            </Button>
          </Link>
        </div>
      </header>

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <div className="flex items-center justify-between">
            <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#FF7A00]/10 text-[#FF7A00]"><Network className="h-5 w-5" strokeWidth={2.5} /></span>
          </div>
          <div>
            <div className="text-[26px] font-bold leading-none text-[#101828]">{rootCount.toLocaleString('fa-IR')}</div>
            <div className="mt-1.5 text-[13px] font-bold text-[#344054]">حساب‌های اصلی</div>
          </div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <div className="flex items-center justify-between">
            <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#2563EB]/10 text-[#2563EB]"><FolderTree className="h-5 w-5" strokeWidth={2.5} /></span>
          </div>
          <div>
            <div className="text-[26px] font-bold leading-none text-[#101828]">{totalAccounts.toLocaleString('fa-IR')}</div>
            <div className="mt-1.5 text-[13px] font-bold text-[#344054]">کل حساب‌ها</div>
          </div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <div className="flex items-center justify-between">
            <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#10b981]/10 text-[#10b981]"><FileText className="h-5 w-5" strokeWidth={2.5} /></span>
          </div>
          <div>
            <div className="text-[26px] font-bold leading-none text-[#101828]">{leafCount.toLocaleString('fa-IR')}</div>
            <div className="mt-1.5 text-[13px] font-bold text-[#344054]">حساب‌های تفصیلی</div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#98A2B3]" />
          <Input
            placeholder="جستجوی حساب..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-[42px] w-full rounded-[10px] border-[#DCE3EE] bg-white pr-9 text-sm sm:w-[300px]"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" />
        </div>
      ) : accounts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Network className="h-8 w-8" />}
            title="حسابی یافت نشد"
            description="برای شروع، اولین حساب اصلی را ایجاد کنید"
            action={<Link href="/dashboard/chart-of-accounts/new"><Button><Plus className="h-4 w-4" /> افزودن حساب</Button></Link>}
          />
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-3 border-b border-[#E6EBF2] bg-[#F8FAFD] px-4 py-3">
              <span className="text-sm font-bold text-[#1D2939]">سلسله‌مراتب حساب‌ها</span>
              <Badge variant="secondary" className="text-xs">{totalAccounts.toLocaleString('fa-IR')} حساب</Badge>
            </div>
            <div>
              {rootAccounts.length === 0 ? (
                <div className="py-12 text-center text-sm text-[#CBD5E1]">نتیجه‌ای یافت نشد</div>
              ) : (
                rootAccounts.map((account) => renderAccountRow(account, 0))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
