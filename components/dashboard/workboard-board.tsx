'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, Search } from 'lucide-react';
import { relativeTime } from '@/lib/format';
import { tomanShort } from '@/lib/constants';

export type BoardStatus = { key: string; label: string; color: string };
export type PriorityInfo = { key: string; label: string; color: string };

export interface BoardConfig {
  key: string;
  label: string;
  link: string;
  statusField: string;
  statuses: BoardStatus[];
  titleField: string;
  subtitleField?: string;
  amountField?: string;
  dateField: string;
  priorities?: PriorityInfo[];
  priorityField?: string;
}

type AnyRow = Record<string, any>;

export function statusInfo(config: BoardConfig, key: string): BoardStatus {
  return config.statuses.find((s) => s.key === key) || { key, label: key, color: '#64748b' };
}

interface BoardProps {
  config: BoardConfig;
  data: AnyRow[];
  loading: boolean;
  search: string;
  onSearch: (v: string) => void;
  totalCount: number;
  extraFilters?: React.ReactNode;
}

export function WorkboardBoard({ config, data, loading, search, onSearch, totalCount, extraFilters }: BoardProps) {
  const columns = groupByStatus(data, config);

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          {extraFilters}
          <div className="flex h-10 items-center gap-2 rounded-xl border-2 border-border bg-muted/40 px-3.5 transition-all focus-within:border-accent focus-within:bg-card">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="جستجو..."
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/60 sm:w-56"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-bold text-foreground">{totalCount.toLocaleString('fa-IR')}</span>
          <span>مورد در</span>
          <span className="font-bold text-foreground">{config.label}</span>
        </div>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {config.statuses.map((col) => {
          const items = columns[col.key] || [];
          return (
            <div key={col.key} className="flex w-[280px] shrink-0 flex-col rounded-2xl border border-border bg-muted/30">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                  <span className="text-sm font-bold text-foreground">{col.label}</span>
                </div>
                <Badge variant="secondary" className="h-5 min-w-[20px] justify-center px-1.5 text-xs font-bold">
                  {items.length.toLocaleString('fa-IR')}
                </Badge>
              </div>

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
                  <BoardCard key={row.id} row={row} config={config} />
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
  const priorityKey = config.priorityField ? row[config.priorityField] : null;
  const priority = priorityKey && config.priorities ? config.priorities.find((p) => p.key === priorityKey) : null;
  const subtitle = config.subtitleField ? row[config.subtitleField] : null;

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
          <span className="text-xs font-bold text-foreground">{tomanShort(amount)}</span>
        )}
      </div>

      <p className="mb-2 line-clamp-2 text-sm font-semibold text-foreground">{title}</p>

      {subtitle && (
        <p className="mb-2 line-clamp-1 text-xs text-muted-foreground">{String(subtitle)}</p>
      )}

      {priority && (
        <div className="mb-2 flex items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
            style={{ backgroundColor: priority.color + '15', color: priority.color }}
          >
            {priority.label}
          </span>
        </div>
      )}

      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Clock className="h-3 w-3" />
        {date ? relativeTime(date) : '—'}
      </div>
    </Link>
  );
}

function groupByStatus(data: AnyRow[], config: BoardConfig): Record<string, AnyRow[]> {
  const grouped: Record<string, AnyRow[]> = {};
  config.statuses.forEach((s) => { grouped[s.key] = []; });
  data.forEach((row) => {
    const key = row[config.statusField] || 'unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  });
  return grouped;
}
