'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, deleteData } from '@/lib/data-client';
import { formatJalaliDateTime } from '@/lib/format';
import { toast } from 'sonner';
import {
  Search, Loader2, Send, CheckCircle2, XCircle, Trash2,
  MessageSquare, Phone,
} from 'lucide-react';
import type { SmsLog } from '@/lib/types';

const typeLabels: Record<string, string> = {
  manual: 'دستی',
  expiry_reminder: 'یادآوری انقضا',
};

export default function SmsLogsPage() {
  const [items, setItems] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const data = await fetchData<SmsLog>('sms_logs', {
        orderBy: { createdAt: 'desc' },
      });
      setItems(data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((item) => {
    const matchesSearch = !search ||
      item.mobile.includes(search) ||
      item.message.includes(search);
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این لاگ پیامک مطمئن هستید؟')) return;
    try {
      await deleteData('sms_logs', { id });
      setItems((prev) => prev.filter((x) => x.id !== id));
      toast.success('لاگ حذف شد');
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  return (
    <div className="create-task-page" dir="rtl">
      <div className="create-task-container">
        <header className="create-task-header">
          <div>
            <div className="create-task-title">
              <span className="title-accent-bar" />
              <h1>تاریخچه پیامک‌ها</h1>
            </div>
            <div className="create-task-breadcrumb">
              داشبورد <b>←</b> پیامک‌ها
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="جستجو در شماره یا متن پیامک..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] bg-white py-2.5 pr-10 pl-4 text-sm text-slate-700 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/10"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${statusFilter === 'all' ? 'bg-[#2563EB] text-white' : 'bg-white border border-[#E2E8F0] text-slate-600 hover:border-[#94A3B8]'}`}
            >
              همه
            </button>
            <button
              onClick={() => setStatusFilter('sent')}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${statusFilter === 'sent' ? 'bg-emerald-500 text-white' : 'bg-white border border-[#E2E8F0] text-slate-600 hover:border-[#94A3B8]'}`}
            >
              موفق
            </button>
            <button
              onClick={() => setStatusFilter('failed')}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${statusFilter === 'failed' ? 'bg-red-500 text-white' : 'bg-white border border-[#E2E8F0] text-slate-600 hover:border-[#94A3B8]'}`}
            >
              ناموفق
            </button>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MessageSquare className="h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-500 mb-1">هیچ پیامکی ارسال نشده است</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((item) => (
              <div key={item.id} className="rounded-xl border border-[#E2E8F0] bg-white p-4 transition-all hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${item.status === 'sent' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                        {item.status === 'sent' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {item.status === 'sent' ? 'موفق' : 'ناموفق'}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                        {typeLabels[item.type] || item.type}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400" dir="ltr">
                        <Phone className="h-3 w-3" />
                        {item.mobile}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 mb-1">{item.message}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      <span>{formatJalaliDateTime(item.createdAt)}</span>
                    </div>
                    {item.status === 'failed' && item.response && (
                      <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-500">
                        {item.response.slice(0, 200)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-medium text-red-500 transition-all hover:border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
