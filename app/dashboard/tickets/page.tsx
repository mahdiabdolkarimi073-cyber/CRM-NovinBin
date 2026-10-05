'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { fetchData, updateData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatFileSize, formatJalali, relativeTime } from '@/lib/format';
import { fullName, TASK_PRIORITIES } from '@/lib/constants';
import type { Customer, Profile, Ticket, TicketMessage, TicketDepartment } from '@/lib/types';
import {
  CalendarDays, Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Circle,
  Download, Eye, FileText, Filter, MessageCircle, MoreVertical, Paperclip, Plus,
  Search, Send, SlidersHorizontal, Trash2, X, Loader2, LayoutGrid, List, Clock,
  CheckCircle2, AlertCircle, MessageSquare,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const PAGE_SIZE = 10;
const priorityLabels: Record<string, string> = { low: 'کم', medium: 'متوسط', high: 'زیاد', critical: 'فوری' };
const priorityColors: Record<string, string> = { low: '#64748b', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' };
const statusLabels: Record<string, string> = {
  open: 'باز', in_progress: 'در حال انجام', pending: 'در انتظار پاسخ',
  resolved: 'حل شده', closed: 'بسته شده',
};
const statusColors: Record<string, string> = {
  open: '#3b82f6', in_progress: '#f59e0b', pending: '#a855f7',
  resolved: '#22c55e', closed: '#64748b',
};

type Attachment = { url: string; name: string; type: string; size: number };

function displayName(person: Profile | null | undefined): string {
  return person ? fullName(person.firstName, person.lastName, 'کاربر') : 'تخصیص داده نشده';
}
function customerName(customer: Customer | undefined): string {
  return customer
    ? customer.type === 'company'
      ? customer.companyName || 'شرکت'
      : fullName(customer.firstName, customer.lastName)
    : 'بدون مشتری';
}
function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('') || '؟';
}
function ticketNumber(index: number): string {
  return `TK-1403-${String(index).padStart(4, '0')}`;
}
function dateParts(value: string): { date: string; time: string } {
  const date = new Date(value);
  return { date: formatJalali(date), time: date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) };
}

export default function TicketsPage() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<TicketDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('list');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Ticket | null>(null);

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [ticketData, customerData, staffData, deptData] = await Promise.all([
        fetchData<Ticket>('tickets', { orderBy: { createdAt: 'desc' } }),
        fetchData<Customer>('customers', { where: {} }),
        fetchData<Profile>('profiles', { where: { userType: 'staff', role: { in: ['personnel', 'admin', 'super_admin'] } } }),
        fetchData<TicketDepartment>('ticket_departments', { where: { active: true }, orderBy: { name: 'asc' } }),
      ]);
      setTickets(ticketData || []);
      setCustomers(customerData || []);
      setStaff(staffData || []);
      setDepartments(deptData || []);
    } catch (error: any) {
      toast.error('بارگذاری تیکت‌ها ناموفق بود: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);

  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const staffMap = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);
  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);

  const filteredTickets = useMemo(() => tickets.filter((t) => {
    const customer = customerMap.get(t.customerId || '');
    const q = search.trim().toLowerCase();
    const matchesSearch = !q
      || t.subject.toLowerCase().includes(q)
      || customerName(customer).toLowerCase().includes(q)
      || t.id.toLowerCase().includes(q);
    return matchesSearch
      && (priorityFilter === 'all' || t.priority === priorityFilter)
      && (statusFilter === 'all' || t.status === statusFilter)
      && (customerFilter === 'all' || t.customerId === customerFilter)
      && (assigneeFilter === 'all' || t.assignedTo === assigneeFilter);
  }), [tickets, search, priorityFilter, statusFilter, customerFilter, assigneeFilter, customerMap, staffMap]);

  const pageCount = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE));
  const visibleTickets = filteredTickets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  const updateStatus = async (ticket: Ticket, status: string) => {
    try {
      await updateData('tickets', { id: ticket.id }, { status, updatedAt: new Date().toISOString() });
      setTickets((current) => current.map((item) => item.id === ticket.id
        ? { ...item, status, updatedAt: new Date().toISOString() }
        : item));
      if (selected?.id === ticket.id) setSelected((prev) => prev ? { ...prev, status } : prev);
    } catch (error: any) {
      toast.error('تغییر وضعیت ناموفق بود: ' + error.message);
    }
  };

  const resetFilters = () => {
    setSearch(''); setPriorityFilter('all'); setStatusFilter('all');
    setCustomerFilter('all'); setAssigneeFilter('all'); setPage(1);
  };

  const counts = {
    total: tickets.length,
    closed: tickets.filter((t) => t.status === 'closed').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
    open: tickets.filter((t) => t.status === 'open').length,
    progress: tickets.filter((t) => t.status === 'in_progress').length,
    pending: tickets.filter((t) => t.status === 'pending').length,
  };

  const stats = useMemo(() => [
    {
      label: 'کل تیکت‌ها', value: counts.total, icon: MessageCircle,
      filter: 'all',
      gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
      glow: 'rgba(37,99,235,0.25)',
    },
    {
      label: 'باز', value: counts.open, icon: Circle,
      filter: 'open',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563EB 100%)',
      glow: 'rgba(59,130,246,0.25)',
    },
    {
      label: 'در حال انجام', value: counts.progress, icon: Clock,
      filter: 'in_progress',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      glow: 'rgba(245,158,11,0.25)',
    },
    {
      label: 'حل شده', value: counts.resolved, icon: CheckCircle2,
      filter: 'resolved',
      gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      glow: 'rgba(34,197,94,0.25)',
    },
  ], [tickets]);

  const handleStatClick = (f: string) => {
    setStatusFilter(statusFilter === f ? 'all' : f);
    setPage(1);
  };

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری تیکت‌ها...</p>
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
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#3B82F6,#2563EB)', boxShadow: '0 0 12px rgba(37,99,235,.25)' }} />
              <h1>تیکت‌ها</h1>
            </div>
            <p>مدیریت و پیگیری تیکت‌های پشتیبانی</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/tickets/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            تیکت جدید
          </Link>
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        {stats.map((stat) => (
          <button
            type="button"
            className={`nb-stat-card-v2 ${statusFilter === stat.filter ? 'is-active' : ''}`}
            key={stat.label}
            onClick={() => handleStatClick(stat.filter)}
            style={{ '--stat-glow': stat.glow } as React.CSSProperties}
          >
            <div className="nb-stat-v2-icon" style={{ background: stat.gradient }}>
              <stat.icon className="h-[22px] w-[22px] text-white" />
            </div>
            <div className="nb-stat-v2-body">
              <strong>{stat.value.toLocaleString('fa-IR')}</strong>
              <span>{stat.label}</span>
            </div>
            <div className="nb-stat-v2-spark" style={{ background: stat.gradient }} />
          </button>
        ))}
      </section>

      <div className="nb-toolbar">
        <div className="nb-toolbar-left">
          <h2>همه تیکت‌ها</h2>
          <span className="nb-count-badge">{filteredTickets.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="جستجوی تیکت..."
            />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
          </div>
          <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
            <SelectTrigger className="nb-select-filter h-10 w-[140px]"><SelectValue placeholder="اولویت" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه اولویت‌ها</SelectItem>
              {TASK_PRIORITIES.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="nb-view-toggle">
            <button className={viewMode === 'board' ? 'is-active' : ''} onClick={() => setViewMode('board')} aria-label="تخته‌ای">
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button className={viewMode === 'list' ? 'is-active' : ''} onClick={() => setViewMode('list')} aria-label="لیستی">
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {filteredTickets.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><MessageCircle className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>تیکتی ثبت نشده</h3>
          <p>تیکت‌های پشتیبانی در اینجا نمایش داده می‌شوند</p>
          <Link href="/dashboard/tickets/new" className="nb-empty-new-btn"><Plus className="h-4 w-4" /> ایجاد تیکت</Link>
        </div>
      ) : viewMode === 'board' ? (
        <div className="nb-grid nb-grid-grid">
          {visibleTickets.map((t, index) => {
            const customer = customerMap.get(t.customerId || '');
            const assigned = staffMap.get(t.assignedTo || '');
            const stColor = statusColors[t.status] || '#64748b';
            const prColor = priorityColors[t.priority] || '#64748b';
            const created = dateParts(t.createdAt);
            return (
              <article key={t.id} className="nb-card" style={{ borderBottomColor: stColor, borderBottomWidth: 3 }} onClick={() => setSelected(t)}>
                <div className="nb-card-top">
                  <div className="nb-card-tags">
                    <span className="nb-card-tag" style={{ background: `${stColor}15`, color: stColor }}>
                      {statusLabels[t.status] || t.status}
                    </span>
                    <span className="nb-card-tag" style={{ background: `${prColor}15`, color: prColor }}>
                      {priorityLabels[t.priority] || t.priority}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{ticketNumber(index + 1)}</span>
                </div>
                <h3 className="nb-card-title">{t.subject}</h3>
                <p className="nb-card-excerpt" style={{ WebkitLineClamp: 1 }}>{customerName(customer)}</p>
                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                  {deptMap.get(t.departmentId || '')?.name && (
                    <div className="flex items-center gap-1.5">
                      <span className="shrink-0 text-slate-400">دپارتمان:</span>
                      <span>{deptMap.get(t.departmentId || '')?.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>{created.date}</span>
                  </div>
                </div>
                <div className="nb-card-footer">
                  <div className="nb-card-date">
                    <Clock className="h-3 w-3" />
                    {relativeTime(t.createdAt)}
                  </div>
                  <div className="nb-card-quick">
                    {assigned && (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-6 w-6"><AvatarFallback className="bg-sky-100 text-[10px] text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">{initials(displayName(assigned))}</AvatarFallback></Avatar>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{displayName(assigned)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
                <tr>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">شناسه</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">موضوع</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">مشتری</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">اولویت</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">وضعیت</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">مسئول</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">تاریخ</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {visibleTickets.map((t, index) => {
                  const customer = customerMap.get(t.customerId || '');
                  const assigned = staffMap.get(t.assignedTo || '');
                  const stColor = statusColors[t.status] || '#64748b';
                  const prColor = priorityColors[t.priority] || '#64748b';
                  return (
                    <tr key={t.id} className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={() => setSelected(t)}>
                      <td className="p-3"><span className="font-mono text-xs text-slate-400">{ticketNumber(index + 1)}</span></td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4 text-slate-400" />
                          <span className="font-medium text-slate-800 dark:text-slate-100">{t.subject}</span>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-slate-500 dark:text-slate-300">{customerName(customer)}</td>
                      <td className="p-3"><Badge variant="outline" style={{ color: prColor, borderColor: `${prColor}35` }} className="text-xs">{priorityLabels[t.priority] || t.priority}</Badge></td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <Select value={t.status} onValueChange={(v) => updateStatus(t, v)}>
                          <SelectTrigger className="h-8 text-xs" style={{ color: stColor }}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3">
                        {assigned ? <div className="flex items-center gap-1.5"><Avatar className="h-6 w-6"><AvatarFallback className="bg-sky-100 text-[10px] text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">{initials(displayName(assigned))}</AvatarFallback></Avatar><span className="text-xs text-slate-500 dark:text-slate-400">{displayName(assigned)}</span></div> : <span className="text-xs text-slate-400">تخصیص داده نشده</span>}
                      </td>
                      <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{formatJalali(t.createdAt)}</td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button onClick={() => setSelected(t)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700" title="مشاهده"><Eye className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-2 border-t border-slate-200 py-3 dark:border-slate-700">
              <button className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300" onClick={() => setPage(1)} disabled={page === 1}><ChevronsRight className="h-4 w-4" /></button>
              <button className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300" onClick={() => setPage((c) => Math.max(1, c - 1))} disabled={page === 1}><ChevronRight className="h-4 w-4" /></button>
              <span className="text-sm text-slate-500">صفحه {page.toLocaleString('fa-IR')} از {pageCount.toLocaleString('fa-IR')}</span>
              <button className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300" onClick={() => setPage((c) => Math.min(pageCount, c + 1))} disabled={page === pageCount}><ChevronLeft className="h-4 w-4" /></button>
              <button className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300" onClick={() => setPage(pageCount)} disabled={page === pageCount}><ChevronsLeft className="h-4 w-4" /></button>
            </div>
          )}
        </div>
      )}

      <Link href="/dashboard/tickets/new" className="nb-fab" aria-label="تیکت جدید">
        <Plus className="h-6 w-6" />
      </Link>

      {selected && (
        <TicketChat
          ticket={selected}
          customer={customerMap.get(selected.customerId || '')}
          profile={profile}
          onClose={() => setSelected(null)}
          onStatusChange={(status) => updateStatus(selected, status)}
        />
      )}
    </div>
  );
}

function TicketChat({
  ticket, customer, profile, onClose, onStatusChange,
}: {
  ticket: Ticket;
  customer: Customer | undefined;
  profile: Profile | null;
  onClose: () => void;
  onStatusChange: (status: string) => void;
}) {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const data = await fetchData<TicketMessage>('ticket_messages', {
        where: { ticketId: ticket.id },
        orderBy: { createdAt: 'asc' },
      });
      setMessages(data);
    } catch (error: any) {
      toast.error('بارگذاری گفتگو ناموفق بود: ' + error.message);
    }
  }, [ticket.id]);

  useEffect(() => { loadMessages(); }, [loadMessages]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const chooseFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('حجم فایل نباید بیشتر از ۱۰ مگابایت باشد');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAttachment({
      url: reader.result as string,
      name: file.name,
      type: file.type,
      size: file.size,
    });
    reader.readAsDataURL(file);
  };

  const send = async () => {
    if (!profile || (!text.trim() && !attachment)) return;
    setSending(true);
    try {
      let uploaded: { url: string; name: string; type: string; size: number } | null = null;
      if (attachment) {
        const form = new FormData();
        const blob = await fetch(attachment.url).then((r) => r.blob());
        form.append('file', blob, attachment.name);
        const res = await fetch('/api/upload/ticket-file', { method: 'POST', body: form });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'آپلود فایل ناموفق بود');
        uploaded = result;
      }
      await createData('ticket_messages', {
        ticketId: ticket.id,
        senderType: 'staff',
        senderId: profile?.id || null,
        content: text.trim() || null,
        attachmentUrl: uploaded?.url || null,
        attachmentName: uploaded?.name || null,
        attachmentType: uploaded?.type || null,
        attachmentSize: uploaded?.size || 0,
      });
      setText('');
      setAttachment(null);
      if (fileRef.current) fileRef.current.value = '';
      await loadMessages();
    } catch (error: any) {
      toast.error('ارسال پیام ناموفق بود: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const customerLabel = customerName(customer);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="flex h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10"><AvatarFallback className="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">{initials(customerLabel)}</AvatarFallback></Avatar>
            <div>
              <strong className="text-slate-800 dark:text-slate-100">{ticket.subject}</strong>
              <small className="block text-xs text-slate-400">{customerLabel} · {ticket.id.slice(0, 8)}</small>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={ticket.status} onValueChange={onStatusChange}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="بستن"><X className="h-5 w-5" /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto space-y-3 p-5">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-slate-300">
              <MessageCircle className="h-12 w-12" />
              <p className="mt-2 text-sm">هنوز پیامی ثبت نشده است. گفت‌وگو را شروع کنید.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const mine = msg.senderId === profile?.id;
              return (
                <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`} key={msg.id}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${mine ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>
                    {msg.content && <p>{msg.content}</p>}
                    {msg.attachmentUrl && (
                      msg.attachmentType?.startsWith('image/') ? (
                        <img src={msg.attachmentUrl} alt={msg.attachmentName || 'پیوست'} className="mt-2 max-w-full rounded-lg" />
                      ) : (
                        <a href={msg.attachmentUrl} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1.5 text-xs underline">
                          <FileText className="h-3.5 w-3.5" /> {msg.attachmentName || 'دانلود فایل'}{' '}
                          {msg.attachmentSize ? `(${formatFileSize(msg.attachmentSize)})` : ''}
                        </a>
                      )
                    )}
                    <small className={`mt-1 block text-[10px] ${mine ? 'text-blue-200' : 'text-slate-400'}`}>{relativeTime(msg.createdAt)} {mine && <Check className="inline h-3 w-3" />}</small>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        {attachment && (
          <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-2 text-xs text-slate-500 dark:border-slate-700">
            <Paperclip className="h-4 w-4" />
            <span className="flex-1 truncate">{attachment.name}</span>
            <button onClick={() => setAttachment(null)} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
          </div>
        )}

        <footer className="flex items-center gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-700">
          <button onClick={() => fileRef.current?.click()} aria-label="افزودن فایل" type="button" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            ref={fileRef}
            type="file"
            hidden
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
            onChange={chooseFile}
          />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="پاسخ خود را بنویسید..."
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900/50"
          />
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-50"
            onClick={send}
            disabled={sending || (!text.trim() && !attachment)}
            type="button"
            aria-label="ارسال پیام"
          >
            <Send className="h-5 w-5" />
          </button>
        </footer>
      </section>
    </div>
  );
}
