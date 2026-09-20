'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { fetchData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  ArrowRight, Check, FileText, Headphones, Loader2, MessageCircle,
  MessageSquare, Paperclip, Plus, Send, Sparkles, TrendingUp, Users, Zap, Clock,
} from 'lucide-react';
import { formatJalali, formatFileSize, relativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Ticket, TicketMessage } from '@/lib/types';

const statusLabels: Record<string, string> = {
  open: 'باز', in_progress: 'در حال انجام', pending: 'در انتظار پاسخ',
  resolved: 'حل شده', closed: 'بسته',
};
const statusColors: Record<string, string> = {
  open: '#3b82f6', in_progress: '#f59e0b', pending: '#a855f7',
  resolved: '#10b981', closed: '#64748b',
};
const priorityLabels: Record<string, string> = { low: 'کم', medium: 'متوسط', high: 'زیاد', critical: 'بحرانی' };
const priorityColors: Record<string, string> = { low: '#64748b', medium: '#3b82f6', high: '#f59e0b', critical: '#ef4444' };

type Attachment = { url: string; name: string; type: string; size: number };

export default function PortalTicketsPage() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', priority: 'medium' });
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    if (!profile?.customerId) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await fetchData<Ticket>('tickets', {
        where: { customerId: profile.customerId },
        orderBy: { createdAt: 'desc' },
      });
      setTickets(data || []);
    } catch {
      setTickets([]);
    }
    setLoading(false);
  }, [profile?.customerId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !profile.customerId || !form.subject.trim()) {
      toast.error('موضوع تیکت را وارد کنید');
      return;
    }
    setCreating(true);
    try {
      await createData('tickets', {
        subject: form.subject.trim(),
        description: form.description.trim() || null,
        customerId: profile.customerId,
        priority: form.priority,
        status: 'open',
        createdBy: profile.id,
        channel: 'portal',
      });
      toast.success('تیکت شما ثبت شد و در سیستم پشتیبانی نمایش داده می‌شود');
      setDialogOpen(false);
      setForm({ subject: '', description: '', priority: 'medium' });
      load();
    } catch (e: any) {
      toast.error('ثبت ناموفق: ' + (e.message || ''));
    }
    setCreating(false);
  };

  const filteredTickets = tickets.filter((t) =>
    statusFilter === 'all' || t.status === statusFilter,
  );

  const stats = [
    { label: 'کل تیکت‌ها', value: tickets.length, icon: MessageSquare, color: '#3b82f6', bg: 'bg-blue-50' },
    { label: 'باز', value: tickets.filter((t) => t.status === 'open').length, icon: Clock, color: '#3b82f6', bg: 'bg-blue-50' },
    { label: 'در حال انجام', value: tickets.filter((t) => t.status === 'in_progress').length, icon: Zap, color: '#f59e0b', bg: 'bg-amber-50' },
    { label: 'حل شده', value: tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length, icon: Check, color: '#10b981', bg: 'bg-emerald-50' },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-emerald-600 via-teal-600 to-cyan-700 p-6 shadow-lg mobile:p-8">
        <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-12 left-24 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative z-10 flex flex-col gap-4 mobile:flex-row mobile:items-center mobile:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm mobile:h-16 mobile:w-16">
              <Headphones className="h-7 w-7 text-white mobile:h-8 mobile:w-8" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white mobile:text-2xl">تیکت‌های پشتیبانی</h1>
              <p className="mt-1 text-sm text-white/80 mobile:text-base">درخواست‌های پشتیبانی خود را ثبت و پیگیری کنید</p>
            </div>
          </div>
          <button
            onClick={() => setDialogOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-emerald-700 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg mobile:h-12"
          >
            <Plus className="h-5 w-5" />
            تیکت جدید
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 mobile:gap-4 tablet:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md mobile:p-5"
          >
            <div className="flex items-center justify-between">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl mobile:h-12 mobile:w-12', s.bg)}>
                <s.icon className="h-5 w-5 mobile:h-6 mobile:w-6" style={{ color: s.color }} />
              </div>
              <span className="text-2xl font-extrabold text-slate-800 mobile:text-3xl">
                {s.value.toLocaleString('fa-IR')}
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-500 mobile:text-sm">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all', label: 'همه' },
          { key: 'open', label: 'باز' },
          { key: 'in_progress', label: 'در حال انجام' },
          { key: 'pending', label: 'در انتظار پاسخ' },
          { key: 'resolved', label: 'حل شده' },
          { key: 'closed', label: 'بسته' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={cn(
              'shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition',
              statusFilter === f.key
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300 hover:text-emerald-700',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Ticket list or empty state */}
      {filteredTickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 px-4 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
            <MessageCircle className="h-10 w-10 text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            {tickets.length === 0 ? 'هنوز تیکتی ثبت نکرده‌اید' : 'تیکتی با این وضعیت یافت نشد'}
          </h3>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            {tickets.length === 0
              ? 'اولین درخواست پشتیبانی خود را ثبت کنید تا کارشناسان ما پاسخگو باشند'
              : 'فیلتر دیگری را انتخاب کنید یا تیکت جدید ثبت کنید'}
          </p>
          {tickets.length === 0 && (
            <button
              onClick={() => setDialogOpen(true)}
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700"
            >
              <Plus className="h-5 w-5" />
              ثبت اولین تیکت
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 mobile:gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
          {filteredTickets.map((t) => {
            const date = new Date(t.createdAt);
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTicket(t)}
                className="group flex flex-col rounded-xl border border-slate-100 bg-white p-4 text-right shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md mobile:p-5"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-110"
                      style={{ backgroundColor: statusColors[t.status] + '20' }}
                    >
                      <MessageSquare className="h-5 w-5" style={{ color: statusColors[t.status] }} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-slate-800 mobile:text-base">{t.subject}</h3>
                      <span className="text-xs text-slate-400">{formatJalali(date)}</span>
                    </div>
                  </div>
                </div>
                {t.description && (
                  <p className="mb-3 line-clamp-2 text-xs text-slate-500 mobile:text-sm">{t.description}</p>
                )}
                <div className="mt-auto flex items-center gap-2 pt-3 border-t border-slate-50">
                  <Badge
                    className="text-xs font-semibold"
                    style={{ backgroundColor: statusColors[t.status] + '20', color: statusColors[t.status] }}
                  >
                    {statusLabels[t.status] || t.status}
                  </Badge>
                  <Badge
                    className="text-xs font-semibold"
                    style={{ backgroundColor: priorityColors[t.priority] + '20', color: priorityColors[t.priority] }}
                  >
                    {priorityLabels[t.priority] || t.priority}
                  </Badge>
                  <span className="mr-auto text-xs text-slate-400">{relativeTime(t.createdAt)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* New ticket dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              ثبت تیکت پشتیبانی
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">موضوع *</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="موضوع درخواست خود را بنویسید"
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">توضیحات</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="جزئیات درخواست خود را شرح دهید..."
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">اولویت</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={creating} className="bg-emerald-600 hover:bg-emerald-700">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {creating ? 'در حال ثبت...' : 'ثبت تیکت'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ticket chat modal */}
      {selectedTicket && (
        <TicketChat
          ticket={selectedTicket}
          profileId={profile?.id || ''}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  );
}

function TicketChat({
  ticket, profileId, onClose,
}: {
  ticket: Ticket;
  profileId: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const data = await fetchData<TicketMessage>('ticket_messages', {
        where: { ticketId: ticket.id },
        orderBy: { createdAt: 'asc' },
      });
      setMessages(data || []);
    } catch {
      setMessages([]);
    }
    setLoadingMsgs(false);
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
    if (!text.trim() && !attachment) return;
    setSending(true);
    try {
      let uploaded: Attachment | null = null;
      if (attachment) {
        const formData = new FormData();
        const blob = await fetch(attachment.url).then((r) => r.blob());
        formData.append('file', blob, attachment.name);
        const res = await fetch('/api/upload/ticket-file', { method: 'POST', body: formData });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'آپلود فایل ناموفق بود');
        uploaded = result;
      }
      await createData('ticket_messages', {
        ticketId: ticket.id,
        senderType: 'customer',
        senderId: profileId,
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
      toast.success('پیام ارسال شد');
    } catch (e: any) {
      toast.error('ارسال پیام ناموفق بود: ' + (e.message || ''));
    }
    setSending(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex h-[85vh] max-h-[700px] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-scale-in">
        {/* Chat header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-l from-emerald-50 to-teal-50 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: statusColors[ticket.status] + '20' }}
            >
              <MessageSquare className="h-5 w-5" style={{ color: statusColors[ticket.status] }} />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-bold text-slate-800">{ticket.subject}</h3>
              <div className="mt-1 flex items-center gap-2">
                <Badge
                  className="text-xs"
                  style={{ backgroundColor: statusColors[ticket.status] + '20', color: statusColors[ticket.status] }}
                >
                  {statusLabels[ticket.status] || ticket.status}
                </Badge>
                <Badge
                  className="text-xs"
                  style={{ backgroundColor: priorityColors[ticket.priority] + '20', color: priorityColors[ticket.priority] }}
                >
                  {priorityLabels[ticket.priority] || ticket.priority}
                </Badge>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 px-4 py-5 mobile:px-6">
          {loadingMsgs ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                <MessageCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-slate-600">هنوز پیامی ثبت نشده است</p>
              <p className="mt-1 text-xs text-slate-400">اولین پیام خود را ارسال کنید</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const mine = msg.senderType === 'customer' && msg.senderId === profileId;
                return (
                  <div
                    key={msg.id}
                    className={cn('flex', mine ? 'justify-left' : 'justify-right')}
                  >
                    <div
                      className={cn(
                        'max-w-[75%] rounded-2xl px-4 py-3 shadow-sm',
                        mine
                          ? 'rounded-bl-md bg-emerald-600 text-white'
                          : 'rounded-br-md bg-white border border-slate-100 text-slate-700',
                      )}
                    >
                      {msg.content && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
                      {msg.attachmentUrl && (
                        msg.attachmentType?.startsWith('image/') ? (
                          <img
                            src={msg.attachmentUrl}
                            alt={msg.attachmentName || 'پیوست'}
                            className="mt-2 max-w-full rounded-lg"
                          />
                        ) : (
                          <a
                            href={msg.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={cn(
                              'mt-2 flex items-center gap-2 text-xs font-semibold underline',
                              mine ? 'text-white/90' : 'text-emerald-600',
                            )}
                          >
                            <FileText className="h-4 w-4" />
                            {msg.attachmentName || 'دانلود فایل'}
                            {msg.attachmentSize ? ` (${formatFileSize(msg.attachmentSize)})` : ''}
                          </a>
                        )
                      )}
                      <span
                        className={cn(
                          'mt-1.5 block text-[10px]',
                          mine ? 'text-white/70' : 'text-slate-400',
                        )}
                      >
                        {relativeTime(msg.createdAt)}
                        {mine && <Check className="mr-1 inline h-3 w-3" />}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {/* Attachment preview */}
        {attachment && (
          <div className="flex items-center gap-2 border-t border-slate-100 bg-amber-50 px-4 py-2 mobile:px-6">
            <Paperclip className="h-4 w-4 text-amber-600" />
            <span className="truncate text-xs font-medium text-slate-600">{attachment.name}</span>
            <button
              onClick={() => { setAttachment(null); if (fileRef.current) fileRef.current.value = ''; }}
              className="mr-auto text-xs font-semibold text-red-500 hover:text-red-600"
            >
              حذف
            </button>
          </div>
        )}

        {/* Composer */}
        <div className="flex items-center gap-2 border-t border-slate-100 bg-white px-4 py-3 mobile:px-6">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            type="button"
          >
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
            className="h-11 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
          <button
            onClick={send}
            disabled={sending || (!text.trim() && !attachment)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
            type="button"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
