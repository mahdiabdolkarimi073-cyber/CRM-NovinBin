'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, deleteData } from '@/lib/data-client';
import { formatJalaliDateTime } from '@/lib/format';
import { toast } from 'sonner';
import {
  Search, Loader2, Send, CheckCircle2, XCircle, Trash2,
  MessageSquare, Phone, X, Clock,
} from 'lucide-react';
import type { SmsLog } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const typeLabels: Record<string, string> = {
  manual: 'دستی',
  expiry_reminder: 'یادآوری تمدید هاست/دامنه',
  meeting_reminder: 'یادآوری جلسه',
};

export default function SmsLogsPage() {
  const [items, setItems] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const data = await fetchData<SmsLog>('sms_logs', { orderBy: { createdAt: 'desc' } });
      setItems(data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((item) => {
    const matchesSearch = !search || item.mobile.includes(search) || item.message.includes(search);
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
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

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری پیامک‌ها...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="nb-page" dir="rtl">
      <header className="nb-hero">
        <div className="nb-hero-left">
          <div>
            <div className="nb-hero-title-row">
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#0EA5E9,#0284C7)', boxShadow: '0 0 12px rgba(14,165,233,.25)' }} />
              <h1>پیامک‌ها</h1>
            </div>
            <p>تاریخچه پیامک‌های ارسالی سیستم</p>
          </div>
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(14,165,233,0.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)' }}><Send className="h-[22px] w-[22px] text-white" /></div>
          <div className="nb-stat-v2-body"><strong>{items.length.toLocaleString('fa-IR')}</strong><span>کل پیامک‌ها</span></div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)' }} />
        </div>
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(34,197,94,0.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)' }}><CheckCircle2 className="h-[22px] w-[22px] text-white" /></div>
          <div className="nb-stat-v2-body"><strong>{items.filter(i => i.status === 'sent').length.toLocaleString('fa-IR')}</strong><span>موفق</span></div>
          <div className="nb-stat-v2-spark\" style={{ background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)' }} />
        </div>
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(239,68,68,0.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}><XCircle className="h-[22px] w-[22px] text-white" /></div>
          <div className="nb-stat-v2-body"><strong>{items.filter(i => i.status === 'failed').length.toLocaleString('fa-IR')}</strong><span>ناموفق</span></div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }} />
        </div>
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(37,99,235,0.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)' }}><MessageSquare className="h-[22px] w-[22px] text-white" /></div>
          <div className="nb-stat-v2-body"><strong>{filtered.length.toLocaleString('fa-IR')}</strong><span>مورد نمایش</span></div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)' }} />
        </div>
      </section>

      <div className="nb-toolbar">
        <div className="nb-toolbar-left">
          <h2>تاریخچه پیامک‌ها</h2>
          <span className="nb-count-badge">{filtered.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو در شماره یا متن..." />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="nb-select-filter h-10 w-[120px]"><SelectValue placeholder="وضعیت" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              <SelectItem value="sent">موفق</SelectItem>
              <SelectItem value="failed">ناموفق</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="nb-select-filter h-10 w-[140px]"><SelectValue placeholder="نوع" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه نوع</SelectItem>
              <SelectItem value="meeting_reminder">جلسات</SelectItem>
              <SelectItem value="expiry_reminder">تمدید هاست/دامنه</SelectItem>
              <SelectItem value="manual">دستی</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><MessageSquare className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>پیامکی ارسال نشده</h3>
          <p>تاریخچه پیامک‌های ارسالی در اینجا نمایش داده می‌شود</p>
        </div>
      ) : (
        <div className="nb-grid nb-grid-grid">
          {filtered.map((item) => (
            <article key={item.id} className="nb-card" style={{ borderBottomColor: item.status === 'sent' ? '#22C55E' : '#EF4444', borderBottomWidth: 3 }}>
              <div className="nb-card-top">
                <div className="nb-card-tags">
                  <span className="nb-card-tag" style={{ background: item.status === 'sent' ? '#DCFCE7' : '#FEE2E2', color: item.status === 'sent' ? '#22C55E' : '#EF4444' }}>
                    {item.status === 'sent' ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                    {item.status === 'sent' ? 'موفق' : 'ناموفق'}
                  </span>
                  <span className="nb-card-tag" style={{ background: '#F1F5F9', color: '#64748b' }}>{typeLabels[item.type] || item.type}</span>
                </div>
                <button onClick={() => handleDelete(item.id)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500" title="حذف"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              <p className="nb-card-excerpt" style={{ WebkitLineClamp: 2 }}>{item.message}</p>
              <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span dir="ltr">{item.mobile}</span></div>
                {item.status === 'failed' && item.response && <div className="rounded-lg bg-red-50 px-2 py-1 text-[10px] text-red-500 dark:bg-red-900/20">{item.response.slice(0, 150)}</div>}
              </div>
              <div className="nb-card-footer">
                <div className="nb-card-date"><Clock className="h-3 w-3" />{formatJalaliDateTime(item.createdAt)}</div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
