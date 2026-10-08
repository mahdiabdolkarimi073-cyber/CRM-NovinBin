'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import {
  Network, Plus, Search, ChevronLeft, ChevronDown, Trash2, X,
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
            <span className="hidden shrink-0 items-center gap-1 text-xs text-[#98A2B3] mobile:flex">
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

  const stats = useMemo(() => [
    { label: 'حساب‌های اصلی', value: rootCount, icon: Network, gradient: 'linear-gradient(135deg, #F97316 0%, #E65100 100%)', glow: 'rgba(249,115,22,0.25)' },
    { label: 'کل حساب‌ها', value: totalAccounts, icon: FolderTree, gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)', glow: 'rgba(37,99,235,0.25)' },
    { label: 'حساب‌های تفصیلی', value: leafCount, icon: FileText, gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)', glow: 'rgba(34,197,94,0.25)' },
  ], [rootCount, totalAccounts, leafCount]);

  return (
    <div className="nb-page" dir="rtl">
      <header className="nb-hero">
        <div className="nb-hero-left">
          <div>
            <div className="nb-hero-title-row">
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#FF7A00,#E65100)', boxShadow: '0 0 12px rgba(255,122,0,.25)' }} />
              <h1>حسابواره</h1>
            </div>
            <p>مدیریت سلسله‌مراتب حساب‌های مالی</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/chart-of-accounts/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            حسابواره جدید
          </Link>
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        {stats.map((stat) => (
          <div className="nb-stat-card-v2" key={stat.label} style={{ '--stat-glow': stat.glow } as React.CSSProperties}>
            <div className="nb-stat-v2-icon" style={{ background: stat.gradient }}>
              <stat.icon className="h-[22px] w-[22px] text-white" />
            </div>
            <div className="nb-stat-v2-body">
              <strong>{stat.value.toLocaleString('fa-IR')}</strong>
              <span>{stat.label}</span>
            </div>
            <div className="nb-stat-v2-spark" style={{ background: stat.gradient }} />
          </div>
        ))}
      </section>

      <div className="nb-toolbar">
        <div className="nb-toolbar-left">
          <h2>سلسله‌مراتب حساب‌ها</h2>
          <span className="nb-count-badge">{totalAccounts.toLocaleString('fa-IR')} حساب</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجوی حساب..."
            />
              {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><Network className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>حسابی یافت نشد</h3>
          <p>برای شروع، اولین حساب اصلی را ایجاد کنید</p>
          <Link href="/dashboard/chart-of-accounts/new" className="nb-empty-new-btn"><Plus className="h-4 w-4" /> افزودن حساب</Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div>
            {rootAccounts.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">نتیجه‌ای یافت نشد</div>
            ) : (
              rootAccounts.map((account) => renderAccountRow(account, 0))
            )}
          </div>
        </div>
      )}
      <Link href="/dashboard/chart-of-accounts/new" className="nb-fab" aria-label="حساب جدید">
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
