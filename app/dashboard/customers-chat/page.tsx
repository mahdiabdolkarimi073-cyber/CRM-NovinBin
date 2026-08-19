'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { fetchData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Send, FileText, Share2, Search, Users } from 'lucide-react';
import { relativeTime } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';

type Customer = {
  id: string;
  type: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  email: string | null;
  phone: string | null;
};

type CustomerAssignment = {
  id: string;
  customerId: string;
  assignedTo: string;
  assignedBy: string;
  createdAt: string;
  customer: Customer;
};

type CustomerChatMessage = {
  id: string;
  customerId: string;
  senderType: 'staff' | 'customer';
  senderId: string | null;
  content: string;
  isReport: boolean;
  readAt: string | null;
  createdAt: string;
};

type AssignedCustomer = Customer & { assignment_id: string };

const SHARE_LINKS = [
  { name: 'ایتا', url: 'https://eitaa.com', color: '#27ae60' },
  { name: 'واتساپ', url: 'https://web.whatsapp.com', color: '#25D366' },
  { name: 'تلگرام', url: 'https://web.telegram.org', color: '#0088cc' },
  { name: 'روبیكا', url: 'https://rubika.ir', color: '#0070f3' },
];

function customerDisplayName(c: Customer): string {
  if (c.type === 'company') return c.companyName || 'شرکت';
  return fullName(c.firstName, c.lastName, 'بدون نام');
}

function customerInitial(c: Customer): string {
  const name = customerDisplayName(c);
  return name.charAt(0);
}

export default function CustomersChatPage() {
  const { profile } = useAuth();
  const [customers, setCustomers] = useState<AssignedCustomer[]>([]);
  const [messages, setMessages] = useState<CustomerChatMessage[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<AssignedCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isReport, setIsReport] = useState(false);
  const [search, setSearch] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadCustomers = useCallback(async () => {
    if (!profile || !profile?.id) return;
    setLoading(true);
    const isAdmin = profile.role === 'owner' || profile.role === 'super_admin' || profile.role === 'admin';
    if (isAdmin) {
      const allCustomers = await fetchData<Customer>('customers', {
        orderBy: { createdAt: 'desc' },
      });
      const mapped: AssignedCustomer[] = allCustomers
        .filter((c) => c && c.id)
        .map((c) => ({ ...c, assignment_id: 'admin' }));
      setCustomers(mapped);
    } else {
      const assignments = await fetchData<CustomerAssignment>('customer_assignments', {
        where: { assignedTo: profile.id },
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
      });
      const mapped: AssignedCustomer[] = assignments
        .map((a) => ({ ...a.customer, assignment_id: a.id }))
        .filter((c) => c && c.id);
      setCustomers(mapped);
    }
    setLoading(false);
  }, [profile?.id, profile?.role]);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  const loadMessages = useCallback(async (customerId: string) => {
    const data = await fetchData<CustomerChatMessage>('customer_chat_messages', {
      where: { customerId },
      orderBy: { createdAt: 'asc' },
    });
    setMessages(data);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      loadMessages(selectedCustomer.id);
    } else {
      setMessages([]);
    }
  }, [selectedCustomer, loadMessages]);

  // Polling for new messages every 5 seconds
  useEffect(() => {
    if (!selectedCustomer) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = setInterval(async () => {
      const data = await fetchData<CustomerChatMessage>('customer_chat_messages', {
        where: { customerId: selectedCustomer.id },
        orderBy: { createdAt: 'asc' },
      });
      setMessages((prev) => {
        // Only update if something changed (new message arrived)
        if (prev.length === data.length && prev[prev.length - 1]?.id === data[data.length - 1]?.id) {
          return prev;
        }
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        return data;
      });
    }, 5000);

    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [selectedCustomer]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !profile?.id) return;
    if (!selectedCustomer) return;
    if (!newMessage.trim()) { toast.error('پیام خالی است'); return; }

    setSending(true);
    try {
      await createData('customer_chat_messages', {
        customerId: selectedCustomer.id,
        senderType: 'staff',
        senderId: profile.id,
        content: newMessage.trim(),
        isReport: isReport,
      });

      // Notify other staff assigned to this customer
      try {
        const myName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'پرسنل';
        const assignments = await fetchData<any>('customer_assignments', {
          where: { customerId: selectedCustomer.id },
        });
        for (const a of assignments) {
          if (a.assignedTo && a.assignedTo !== profile.id) {
            await createData('notifications', {
              profileId: a.assignedTo,
              title: 'پیام جدید در چت مشتری',
              body: `${myName} یک پیام در چت با ${customerDisplayName(selectedCustomer)} ارسال کرد`,
              type: 'chat',
              priority: 'normal',
              link: '/dashboard/customers-chat',
            });
          }
        }
      } catch {}

      setNewMessage('');
      setIsReport(false);
      await loadMessages(selectedCustomer.id);
    } catch (error: any) {
      toast.error('ارسال ناموفق: ' + (error?.message || 'خطا'));
    }
    setSending(false);
  };

  const filteredCustomers = customers.filter((c) => {
    if (!search) return true;
    const name = customerDisplayName(c).toLowerCase();
    return name.includes(search.toLowerCase()) || (c.phone || '').includes(search);
  });

  const lastMessageTime = (customerId: string): string | null => {
    const customerMsgs = messages.filter((m) => m.customerId === customerId);
    if (customerMsgs.length === 0) return null;
    return customerMsgs[customerMsgs.length - 1].createdAt;
  };

  return (
    <div>
      <PageHeader
        title="چت با مشتریان"
        description="ارتباط با مشتریان اختصاص‌داده‌شده"
      />

      <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[500px]">
        {/* Customer list sidebar */}
        <Card className="w-72 shrink-0 hidden md:flex flex-col">
          <CardContent className="p-0 flex flex-col h-full">
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="جستجوی مشتری..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10 text-sm"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full" />
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400">مشتری اختصاص‌داده‌شده نیست</p>
                </div>
              ) : (
                filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCustomer(c)}
                    className={`w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-smooth text-right border-b border-slate-50 ${
                      selectedCustomer?.id === c.id ? 'bg-sky-50' : ''
                    }`}
                  >
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarFallback className="bg-sky-100 text-sky-700 text-sm">
                        {customerInitial(c)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{customerDisplayName(c)}</div>
                      <div className="text-xs text-slate-400 truncate">
                        {c.phone || c.email}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chat area */}
        <Card className="flex-1 flex flex-col">
          {selectedCustomer ? (
            <>
              {/* Chat header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-sky-100 text-sky-700 text-sm">
                      {customerInitial(selectedCustomer)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-slate-800">{customerDisplayName(selectedCustomer)}</div>
                    <div className="text-xs text-slate-400" dir="ltr">{selectedCustomer.phone || selectedCustomer.email}</div>
                  </div>
                </div>
                <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Share2 className="w-4 h-4" /> اشتراک‌گذاری
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle>اشتراک‌گذاری گزارش</DialogTitle></DialogHeader>
                    <p className="text-sm text-slate-500 mb-4">گزارش کار را از طریق اپلیکیشن زیر به اشتراک بگذارید:</p>
                    <div className="grid grid-cols-2 gap-3">
                      {SHARE_LINKS.map((link) => (
                        <a
                          key={link.name}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 hover:bg-slate-50 transition-smooth"
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: link.color }}
                          >
                            {link.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-slate-700">{link.name}</span>
                        </a>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="w-10 h-10 text-slate-300 mb-3" />
                    <p className="text-sm text-slate-400">شروع گفتگو با {customerDisplayName(selectedCustomer)}</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isStaff = msg.senderType === 'staff';
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isStaff ? 'justify-start' : 'justify-end'}`}
                      >
                        <div className={`max-w-[70%] ${isStaff ? 'order-2' : ''}`}>
                          <div
                            className={`rounded-2xl px-4 py-2.5 text-sm ${
                              isStaff
                                ? 'bg-sky-500 text-white rounded-tr-sm'
                                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                            }`}
                          >
                            <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                            {msg.isReport && (
                              <div className={`flex items-center gap-1 mt-1.5 text-[10px] ${isStaff ? 'text-sky-100' : 'text-amber-600'}`}>
                                <FileText className="w-3 h-3" /> گزارش کار
                              </div>
                            )}
                          </div>
                          <div className={`text-[10px] text-slate-400 mt-1 ${isStaff ? 'text-left' : 'text-right'}`}>
                            {relativeTime(msg.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Send box */}
              <div className="border-t border-slate-100 p-3">
                <form onSubmit={handleSend} className="space-y-2">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="پیام خود را بنویسید..."
                        className="resize-none"
                      />
                    </div>
                    <Button
                      type="button"
                      variant={isReport ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setIsReport(!isReport)}
                      title="علامت‌گذاری به عنوان گزارش کار"
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button type="submit" size="icon" disabled={sending || !newMessage.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  {isReport && (
                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5">
                      <FileText className="w-3 h-3" />
                      این پیام به عنوان گزارش کار ثبت می‌شود
                    </div>
                  )}
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-700 mb-1">یک مشتری انتخاب کنید</h3>
              <p className="text-sm text-slate-400 max-w-sm">
                برای شروع گفتگو، یک مشتری از لیست سمت راست انتخاب کنید
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Mobile customer list */}
      <div className="md:hidden mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">مشتری اختصاص‌داده‌شده نیست</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredCustomers.map((c) => (
              <Card key={c.id} className="cursor-pointer" >
                <CardContent
                  className="p-3 flex items-center gap-3"
                  onClick={() => { setSelectedCustomer(c); }}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-sky-100 text-sky-700 text-sm">
                      {customerInitial(c)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-800">{customerDisplayName(c)}</div>
                    <div className="text-xs text-slate-400" dir="ltr">{c.phone || c.email}</div>
                  </div>
                  <MessageSquare className="w-4 h-4 text-slate-300" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
