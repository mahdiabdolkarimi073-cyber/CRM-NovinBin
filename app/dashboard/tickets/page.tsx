'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { fetchData, updateData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatFileSize, formatJalali, relativeTime } from '@/lib/format';
import { fullName, TASK_PRIORITIES } from '@/lib/constants';
import type { Customer, Profile, Ticket, TicketMessage } from '@/lib/types';
import {
  CalendarDays, Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Circle,
  Download, Eye, FileText, Filter, MessageCircle, MoreVertical, Paperclip, Plus,
  Search, Send, SlidersHorizontal, Trash2, X,
} from 'lucide-react';

const PAGE_SIZE = 10;
const priorityLabels: Record<string, string> = { low: 'کم', medium: 'متوسط', high: 'زیاد', critical: 'فوری' };
const statusLabels: Record<string, string> = {
  open: 'باز', in_progress: 'در حال انجام', pending: 'در انتظار پاسخ',
  resolved: 'حل شده', closed: 'بسته شده',
};
const priorityClasses: Record<string, string> = {
  low: 'is-low', medium: 'is-medium', high: 'is-high', critical: 'is-critical',
};
const statusClasses: Record<string, string> = {
  open: 'is-open', in_progress: 'is-progress', pending: 'is-pending',
  resolved: 'is-resolved', closed: 'is-closed',
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Ticket | null>(null);

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [ticketData, customerData, staffData] = await Promise.all([
        fetchData<Ticket>('tickets', { orderBy: { createdAt: 'desc' } }),
        fetchData<Customer>('customers', { where: {} }),
        fetchData<Profile>('profiles', { where: { userType: 'staff' } }),
      ]);
      setTickets(ticketData || []);
      setCustomers(customerData || []);
      setStaff(staffData || []);
    } catch (error: any) {
      toast.error('بارگذاری تیکت‌ها ناموفق بود: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);

  const customerMap = useMemo(
    () => new Map(customers.map((c) => [c.id, c])),
    [customers],
  );
  const staffMap = useMemo(
    () => new Map(staff.map((s) => [s.id, s])),
    [staff],
  );

  const filteredTickets = useMemo(() => tickets.filter((t) => {
    const customer = customerMap.get(t.customerId || '');
    const assignee = staffMap.get(t.assignedTo || '');
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

  return (
    <div className="tickets-page" dir="rtl">
      <header className="tickets-header">
        <div>
          <div className="tickets-title"><span /><h1>مدیریت تیکت‌ها</h1></div>
          <p>مدیریت و پیگیری تیکت‌های پشتیبانی</p>
          <div className="tickets-breadcrumb">
            داشبورد <ChevronLeft /> تیکت‌ها <ChevronLeft /> مدیریت تیکت‌ها
          </div>
        </div>
        <Link href="/dashboard/tickets/new" className="tickets-new-button">
          <Plus /> تیکت جدید
        </Link>
      </header>

      <div className="tickets-layout">
        <main className="tickets-main">
          <section className="tickets-toolbar">
            <label className="tickets-search">
              <Search />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="جستجوی تیکت..."
              />
            </label>
            <FilterSelect
              value={priorityFilter}
              onChange={(v) => { setPriorityFilter(v); setPage(1); }}
              placeholder="همه اولویت‌ها"
              items={TASK_PRIORITIES.map((p) => ({ value: p.key, label: p.label }))}
            />
            <FilterSelect
              value={customerFilter}
              onChange={(v) => { setCustomerFilter(v); setPage(1); }}
              placeholder="همه مشتریان"
              items={customers.map((c) => ({ value: c.id, label: customerName(c) }))}
            />
            <button className="tickets-date-filter" type="button">
              <CalendarDays /> بازه تاریخ <ChevronLeft />
            </button>
            <button className="tickets-advanced-filter" type="button">
              <SlidersHorizontal /> فیلتر پیشرفته
            </button>
          </section>

          <section className="tickets-table-card">
            <div className="tickets-table-scroll">
              <table className="tickets-table">
                <thead>
                  <tr>
                    <th>شناسه</th>
                    <th className="subject-column">موضوع</th>
                    <th>مشتری</th>
                    <th>اولویت</th>
                    <th>وضعیت</th>
                    <th>مسئول رسیدگی</th>
                    <th>تاریخ ایجاد</th>
                    <th>آخرین بروزرسانی</th>
                    <th>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={9} className="tickets-empty">در حال بارگذاری تیکت‌ها...</td></tr>
                  ) : visibleTickets.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="tickets-empty">
                        <MessageCircle /> تیکتی مطابق فیلترها پیدا نشد
                      </td>
                    </tr>
                  ) : visibleTickets.map((t, index) => {
                    const customer = customerMap.get(t.customerId || '');
                    const assigned = staffMap.get(t.assignedTo || '');
                    const created = dateParts(t.createdAt);
                    const updated = dateParts(t.updatedAt || t.createdAt);
                    return (
                      <tr key={t.id}>
                        <td><span className="ticket-id">{ticketNumber(index + 1)}</span></td>
                        <td className="subject-cell">
                          <MessageCircle />
                          <span title={t.subject}>{t.subject}</span>
                        </td>
                        <td className="customer-cell" title={customerName(customer)}>
                          {customerName(customer)}
                        </td>
                        <td>
                          <span className={`ticket-badge priority-badge ${priorityClasses[t.priority] || 'is-medium'}`}>
                            {priorityLabels[t.priority] || t.priority}
                          </span>
                        </td>
                        <td>
                          <Select value={t.status} onValueChange={(v) => updateStatus(t, v)}>
                            <SelectTrigger className={`ticket-status-select ${statusClasses[t.status] || 'is-open'}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(statusLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td>
                          <div className="assignee-cell">
                            <span className="assignee-avatar">{initials(displayName(assigned))}</span>
                            <span>{displayName(assigned)}</span>
                          </div>
                        </td>
                        <td><DateCell value={created} /></td>
                        <td><DateCell value={updated} /></td>
                        <td>
                          <div className="ticket-actions">
                            <button onClick={() => setSelected(t)} aria-label="مشاهده تیکت"><Eye /></button>
                            <button onClick={() => toast.info('منوی عملیات به‌زودی')} aria-label="عملیات بیشتر"><MoreVertical /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <footer className="tickets-pagination">
              <span>
                ۱ تا {Math.min(page * PAGE_SIZE, filteredTickets.length).toLocaleString('fa-IR')} از {filteredTickets.length.toLocaleString('fa-IR')} تیکت
              </span>
              <div className="pagination-buttons">
                <button onClick={() => setPage(1)} disabled={page === 1} aria-label="اولین صفحه"><ChevronsRight /></button>
                <button onClick={() => setPage((c) => Math.max(1, c - 1))} disabled={page === 1} aria-label="صفحه قبل"><ChevronRight /></button>
                <button className="is-active">{page.toLocaleString('fa-IR')}</button>
                <button onClick={() => setPage((c) => Math.min(pageCount, c + 1))} disabled={page === pageCount} aria-label="صفحه بعد"><ChevronLeft /></button>
                <button onClick={() => setPage(pageCount)} disabled={page === pageCount} aria-label="آخرین صفحه"><ChevronsLeft /></button>
              </div>
              <label className="page-size-select">
                تعداد نمایش در صفحه:
                <select defaultValue={PAGE_SIZE}>
                  <option value={10}>۱۰</option>
                </select>
              </label>
            </footer>
          </section>
        </main>

        <aside className="tickets-sidebar">
          <SummaryCard counts={counts} />
          <section className="tickets-side-card">
            <SideTitle icon={<Filter />} title="فیلترها" />
            <FilterSelect
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setPage(1); }}
              placeholder="همه وضعیت‌ها"
              items={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
            />
            <FilterSelect
              value={priorityFilter}
              onChange={(v) => { setPriorityFilter(v); setPage(1); }}
              placeholder="همه اولویت‌ها"
              items={TASK_PRIORITIES.map((p) => ({ value: p.key, label: p.label }))}
            />
            <FilterSelect
              value={customerFilter}
              onChange={(v) => { setCustomerFilter(v); setPage(1); }}
              placeholder="همه مشتریان"
              items={customers.map((c) => ({ value: c.id, label: customerName(c) }))}
            />
            <FilterSelect
              value={assigneeFilter}
              onChange={(v) => { setAssigneeFilter(v); setPage(1); }}
              placeholder="همه کاربران"
              items={staff.map((s) => ({ value: s.id, label: displayName(s) }))}
            />
            <button className="clear-filters" onClick={resetFilters}><Trash2 /> پاک کردن فیلترها</button>
          </section>
          <section className="tickets-side-card">
            <SideTitle icon={<SlidersHorizontal />} title="عملیات سریع" />
            <div className="quick-actions">
              <Link href="/dashboard/tickets/new"><FileText /><span>تیکت جدید</span></Link>
              <button onClick={() => toast.info('گزارش تیکت‌ها آماده می‌شود')} type="button"><SlidersHorizontal /><span>گزارش تیکت‌ها</span></button>
              <button onClick={() => toast.info('خروجی اکسل آماده می‌شود')} type="button"><Download /><span>خروجی اکسل</span></button>
            </div>
          </section>
        </aside>
      </div>

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

function FilterSelect({
  value, onChange, placeholder, items,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  items: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="ticket-filter-select">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{placeholder}</SelectItem>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SideTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <h2 className="tickets-side-title">{title}<span>{icon}</span></h2>;
}

function DateCell({ value }: { value: { date: string; time: string } }) {
  return (
    <div className="ticket-date">
      <strong>{value.date}</strong>
      <small>{value.time}</small>
    </div>
  );
}

function SummaryCard({ counts }: { counts: Record<string, number> }) {
  const items = [
    { key: 'total', label: 'کل تیکت‌ها', className: 'summary-total' },
    { key: 'closed', label: 'بسته شده', className: 'summary-closed' },
    { key: 'resolved', label: 'حل شده', className: 'summary-resolved' },
    { key: 'open', label: 'باز', className: 'summary-open' },
    { key: 'progress', label: 'در حال انجام', className: 'summary-progress' },
    { key: 'pending', label: 'در انتظار پاسخ', className: 'summary-pending' },
  ];
  return (
    <section className="tickets-side-card">
      <SideTitle icon={<Circle />} title="خلاصه تیکت‌ها" />
      <div className="summary-grid">
        {items.map((item) => (
          <div className={`summary-item ${item.className}`} key={item.key}>
            <strong>{counts[item.key].toLocaleString('fa-IR')}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </section>
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
    <div className="ticket-chat-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="ticket-chat-modal">
        <header className="ticket-chat-header">
          <div className="ticket-chat-heading">
            <span className="chat-avatar">{initials(customerLabel)}</span>
            <div>
              <strong>{ticket.subject}</strong>
              <small>{customerLabel} · {ticket.id.slice(0, 8)}</small>
            </div>
          </div>
          <div className="ticket-chat-head-actions">
            <Select value={ticket.status} onValueChange={onStatusChange}>
              <SelectTrigger className="chat-status-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button onClick={onClose} aria-label="بستن"><X /></button>
          </div>
        </header>

        <div className="ticket-chat-messages">
          {messages.length === 0 ? (
            <div className="ticket-chat-empty">
              <MessageCircle />
              <p>هنوز پیامی ثبت نشده است. گفت‌وگو را شروع کنید.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const mine = msg.senderId === profile?.id;
              return (
                <div className={`ticket-message-row ${mine ? 'is-mine' : ''}`} key={msg.id}>
                  <div className="ticket-message-bubble">
                    {msg.content && <p>{msg.content}</p>}
                    {msg.attachmentUrl && (
                      msg.attachmentType?.startsWith('image/') ? (
                        <img src={msg.attachmentUrl} alt={msg.attachmentName || 'پیوست'} />
                      ) : (
                        <a href={msg.attachmentUrl} target="_blank" rel="noreferrer">
                          <FileText /> {msg.attachmentName || 'دانلود فایل'}{' '}
                          {msg.attachmentSize ? `(${formatFileSize(msg.attachmentSize)})` : ''}
                        </a>
                      )
                    )}
                    <small>{relativeTime(msg.createdAt)} {mine && <Check />}</small>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        {attachment && (
          <div className="ticket-attachment-preview">
            <Paperclip />
            <span>{attachment.name}</span>
            <button onClick={() => setAttachment(null)}><X /></button>
          </div>
        )}

        <footer className="ticket-chat-composer">
          <button onClick={() => fileRef.current?.click()} aria-label="افزودن فایل" type="button">
            <Paperclip />
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
          />
          <button
            className="ticket-send-button"
            onClick={send}
            disabled={sending || (!text.trim() && !attachment)}
            type="button"
            aria-label="ارسال پیام"
          >
            <Send />
          </button>
        </footer>
      </section>
    </div>
  );
}
