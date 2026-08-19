'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tabs, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  CheckSquare, FileText, FileOutput, RotateCcw, WalletCards,
  ArrowDownToLine, Send, MessageSquare, Search, Clock,
  AlertCircle, ChevronLeft, TrendingUp,
} from 'lucide-react';
import { formatJalali, relativeTime } from '@/lib/format';
import {
  TASK_STATUSES, TASK_PRIORITIES, INVOICE_STATUSES,
  TICKET_STATUSES, tomanShort,
} from '@/lib/constants';
import { toast } from 'sonner';

type AnyRow = Record<string, any>;

interface BoardConfig {
  key: string;
  label: string;
  icon: typeof CheckSquare;
  model: string;
  link: string;
  statusField: string;
  statuses: { key: string; label: string; color: string }[];
  titleField: string;
  subtitleField?: string;
  amountField?: string;
  dateField: string;
  extraWhere?: Record<string, any>;
}

const boards: BoardConfig[] = [
  {
    key: 'tasks', label: 'تسک‌ها', icon: CheckSquare, model: 'tasks', link: '/dashboard/tasks',
    statusField: 'status', statuses: TASK_STATUSES,
    titleField: 'title', dateField: 'createdAt',
  extraWhere: { status: { notIn: ['completed', 'cancelled'] } },
  },
  {
    key: 'invoices', label: 'فاکتورها', icon: FileText, model: 'invoices', link: '/dashboard/invoices',
    statusField: 'status', statuses: INVOICE_STATUSES,
    titleField: 'number', amountField: 'amount', dateField: 'issueDate',
  },
  {
    key: 'pre-invoices', label: 'پیش‌فاکتور', icon: FileOutput, model: 'pre_invoices', link: '/dashboard/pre-invoices',
    statusField: 'status', statuses: [
      { key: 'draft', label: 'پیش‌نویس', color: '#64748b' },
      { key: 'sent', label: 'ارسال شده', color: '#3b82f6' },
      { key: 'confirmed', label: 'تأیید شده', color: '#10b981' },
      { key: 'expired', label: 'منقضی', color: '#ef4444' },
    ],
    titleField: 'number', amountField: 'finalAmount', dateField: 'issueDate',
  },
  {
    key: 'returns', label: 'مرجوعی', icon: RotateCcw, model: 'sales_returns', link: '/dashboard/returns',
    statusField: 'status', statuses: [
      { key: 'draft', label: 'پیش‌نویس', color: '#64748b' },
      { key: 'pending', label: 'در انتظار', color: '#f59e0b' },
      { key: 'approved', label: 'تأیید شده', color: '#10b981' },
      { key: 'rejected', label: 'رد شده', color: '#ef4444' },
    ],
    titleField: 'number', amountField: 'finalAmount', dateField: 'issueDate',
  },
  {
    key: 'payments', label: 'پرداخت‌ها', icon: WalletCards, model: 'payments', link: '/dashboard/payments',
    statusField: 'status', statuses: [
      { key: 'pending', label: 'در انتظار', color: '#f59e0b' },
      { key: 'completed', label: 'تکمیل شده', color: '#10b981' },
      { key: 'bounced', label: 'برگشتی', color: '#ef4444' },
      { key: 'cancelled', label: 'لغو شده', color: '#64748b' },
    ],
    titleField: 'number', amountField: 'amount', dateField: 'date',
  },
  {
    key: 'receipts', label: 'دریافت‌ها', icon: ArrowDownToLine, model: 'receipts', link: '/dashboard/receipts',
    statusField: 'receiptType', statuses: [
      { key: 'cash', label: 'نقدی', color: '#10b981' },
      { key: 'cheque', label: 'چک', color: '#3b82f6' },
      { key: 'transfer', label: 'انتقال', color: '#f59e0b' },
    ],
    titleField: 'number', amountField: 'amount', dateField: 'receivedDate',
  },
  {
    key: 'tickets', label: 'تیکت‌ها', icon: MessageSquare, model: 'tickets', link: '/dashboard/tickets',
    statusField: 'status', statuses: TICKET_STATUSES,
    titleField: 'subject', dateField: 'createdAt',
    },
  {
    key: 'chat', label: 'چت مشتری', icon: Send, model: 'customer_chat_messages', link: '/dashboard/customers-chat',
    statusField: 'senderType', statuses: [
      { key: 'staff', label: 'ارسال شده', color: '#3b82f6' },
      { key: 'customer', label: 'دریافتی', color: '#f59e0b' },
    ],
    titleField: 'content', dateField: 'createdAt',
    },
];

function statusInfo(config: BoardConfig, key: string) {
  return config.statuses.find((s) => s.key === key) || { key, label: key, color: '#64748b' };
}

export default function WorkboardPage() {
  const { profile } = useAuth();
  const [activeBoard, setActiveBoard] = useState('tasks');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [data, setData] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';
  const board = boards.find((b) => b.key === activeBoard)!;

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const where: any = isSuperAdmin ? {} : {};
      if (board.extraWhere) Object.assign(where, board.extraWhere);
      if (search) where[board.titleField] = { contains: search, mode: 'insensitive' };
      if (board.key === 'tasks' && priorityFilter !== 'all') where.priority = priorityFilter;

      const result = await fetchData<AnyRow>(board.model, {
        where,
        orderBy: { [board.dateField]: 'desc' },
        take: 100,
      });
      setData(result || []);
    } catch (error: any) {
      toast.error('بارگذاری ناموفق: ' + error.message);
      setData([]);
    }
    setLoading(false);
  }, [profile, isSuperAdmin, board, search, priorityFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = useMemo(() => {
    const grouped: Record<string, AnyRow[]> = {};
    board.statuses.forEach((s) => { grouped[s.key] = []; });
    data.forEach((row) => {
      const key = row[board.statusField] || 'unknown';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    });
    return grouped;
  }, [data, board]);

  const totalCount = data.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="کارتابل یکپارچه"
        description="نمای کلی همه وظایف و فرایندهای در جریان در یک صفحه"
      />

      {/* Board selector tabs */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={activeBoard} onValueChange={(v) => { setActiveBoard(v); setSearch(''); setPriorityFilter('all'); }}>
          <TabsList className="flex h-auto flex-wrap gap-1 bg-muted/60 p-1.5">
            {boards.map((b) => (
              <TabsTrigger
                key={b.key}
                value={b.key}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                <b.icon className="h-3.5 w-3.5" />
                {b.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          {board.key === 'tasks' && (
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="اولویت" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه اولویت‌ها</SelectItem>
                {TASK_PRIORITIES.map((p) => (
                  <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex h-10 items-center gap-2 rounded-xl border-2 border-border bg-muted/40 px-3.5 transition-all focus-within:border-accent focus-within:bg-card">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="جستجو..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/60"
            />
          </div>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <TrendingUp className="h-4 w-4 text-accent" />
        <span className="font-bold text-foreground">{totalCount}</span>
        <span>مورد در</span>
        <span className="font-bold text-foreground">{board.label}</span>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {board.statuses.map((col) => {
          const items = columns[col.key] || [];
          return (
            <div
              key={col.key}
              className="flex w-[280px] shrink-0 flex-col rounded-2xl border border-border bg-muted/30"
            >
              {/* Column header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: col.color }}
                  />
                  <span className="text-sm font-bold text-foreground">{col.label}</span>
                </div>
                <Badge
                  variant="secondary"
                  className="h-5 min-w-[20px] justify-center px-1.5 text-xs font-bold"
                >
                  {items.length.toLocaleString('fa-IR')}
                </Badge>
              </div>

              {/* Column body */}
              <div className="flex-1 space-y-2.5 overflow-y-auto p-3" style={{ maxHeight: 'calc(100vh - 340px)' }}>
                {loading && items.length === 0 && (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  </div>
                )}
                {!loading && items.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <AlertCircle className="h-5 w-5 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground/60">موردی وجود ندارد</p>
                  </div>
                )}
                {items.map((row) => (
                  <BoardCard key={row.id} row={row} config={board} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BoardCard({ row, config }: { row: AnyRow; config: BoardConfig }) {
  const si = statusInfo(config, row[config.statusField] || '');
  const title = String(row[config.titleField] || '—');
  const amount = config.amountField ? Number(row[config.amountField] || 0) : null;
  const date = row[config.dateField];

  return (
    <Link
      href={config.link}
      className="block rounded-xl border border-border bg-card p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span
          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold"
          style={{ backgroundColor: si.color + '15', color: si.color }}
        >
          {si.label}
        </span>
        {amount !== null && (
          <span className="text-xs font-bold text-foreground">
            {tomanShort(amount)}
          </span>
        )}
      </div>

      <p className="mb-2 line-clamp-2 text-sm font-semibold text-foreground">
        {title}
      </p>

      {config.key === 'tasks' && row.priority && (
        <div className="mb-2 flex items-center gap-1.5">
          {TASK_PRIORITIES.filter((p) => p.key === row.priority).map((p) => (
            <span
              key={p.key}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
              style={{ backgroundColor: p.color + '15', color: p.color }}
            >
              {p.label}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Clock className="h-3 w-3" />
        {date ? relativeTime(date) : '—'}
      </div>
    </Link>
  );
}
