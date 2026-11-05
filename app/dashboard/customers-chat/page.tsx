'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  MessageSquare, Send, FileText, Search, Users, Paperclip,
  CheckCircle2, Clock, ShieldCheck, Download, AlertCircle, Eye,
  Sparkles, FileCheck2, Loader2,
} from 'lucide-react';
import { relativeTime, formatJalaliDateTime } from '@/lib/format';
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

type CustomerChatMessage = {
  id: string;
  customerId: string;
  senderType: 'staff' | 'customer' | 'system';
  senderId: string | null;
  senderName?: string;
  content: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  isDeliveryFile?: boolean;
  deliveryConfirmed?: boolean;
  deliverySignoff?: any;
  isReport: boolean;
  readAt: string | null;
  createdAt: string;
};

type DeliverySignoff = {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  signerName: string;
  signerPhone?: string;
  confirmedAt: string;
  confirmedAtFormatted: string;
};

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
  const [activeTab, setActiveTab] = useState<'chat' | 'signoffs'>('chat');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [messages, setMessages] = useState<CustomerChatMessage[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isDeliveryFile, setIsDeliveryFile] = useState(false);
  const [search, setSearch] = useState('');

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Superadmin audit signoffs
  const [signoffs, setSignoffs] = useState<DeliverySignoff[]>([]);
  const [loadingSignoffs, setLoadingSignoffs] = useState(false);
  const [signoffsSearch, setSignoffsSearch] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner' || profile?.role === 'admin';

  // Load all customers for staff/managers
  const loadCustomers = useCallback(async () => {
    if (!profile || !profile?.id) return;
    setLoading(true);
    try {
      const allCustomers = await fetchData<Customer>('customers', {
        orderBy: { createdAt: 'desc' },
        take: 300,
      });
      setCustomers(allCustomers.filter((c) => c && c.id));
    } catch (err: any) {
      console.error('Error loading customers:', err);
      toast.error('خطا در دریافت فهرست مشتریان');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Load messages for the selected customer
  const loadMessages = useCallback(async (customerId: string) => {
    try {
      const res = await fetch(`/api/customer-chat/messages?customerId=${customerId}`);
      const json = await res.json();
      if (res.ok) {
        setMessages(json.messages || []);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    }
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

  // Polling for updates every 4 seconds
  useEffect(() => {
    if (!selectedCustomer) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/customer-chat/messages?customerId=${selectedCustomer.id}`);
        const json = await res.json();
        if (res.ok && json.messages) {
          setMessages((prev) => {
            if (prev.length === json.messages.length && prev[prev.length - 1]?.id === json.messages[json.messages.length - 1]?.id) {
              return prev;
            }
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
            return json.messages;
          });
        }
      } catch {}
    }, 4000);

    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [selectedCustomer]);

  // Load all delivery signoffs for audit
  const loadSignoffs = useCallback(async () => {
    setLoadingSignoffs(true);
    try {
      const res = await fetch('/api/customer-chat/delivery-signoffs');
      const json = await res.json();
      if (res.ok) {
        setSignoffs(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching delivery signoffs:', err);
    } finally {
      setLoadingSignoffs(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'signoffs') {
      loadSignoffs();
    }
  }, [activeTab, loadSignoffs]);

  // Handle message and file sending
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !profile?.id || !selectedCustomer) return;
    if (!newMessage.trim() && !selectedFile) {
      toast.error('لطفاً پیام یا فایل را وارد کنید');
      return;
    }

    setSending(true);
    try {
      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;

      // Upload file if selected
      if (selectedFile) {
        setUploadingFile(true);
        const formData = new FormData();
        formData.append('file', selectedFile);

        const upRes = await fetch('/api/upload/customer-chat', {
          method: 'POST',
          body: formData,
        });
        const upJson = await upRes.json();
        if (!upRes.ok) {
          throw new Error(upJson.error || 'خطا در بارگذاری فایل');
        }
        attachmentUrl = upJson.url;
        attachmentName = upJson.name;
        setUploadingFile(false);
      }

      // Send chat message via API
      const res = await fetch('/api/customer-chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          content: newMessage.trim(),
          attachmentUrl,
          attachmentName,
          isDeliveryFile: !!isDeliveryFile,
          isReport: !!isDeliveryFile,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'خطا در ارسال پیام');
      }

      setNewMessage('');
      setSelectedFile(null);
      setIsDeliveryFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadMessages(selectedCustomer.id);
      toast.success(isDeliveryFile ? 'فایل تحویل سایت برای مشتری ارسال شد' : 'پیام با موفقیت ارسال شد');
    } catch (error: any) {
      toast.error('ارسال ناموفق: ' + (error?.message || 'خطا'));
    } finally {
      setSending(false);
      setUploadingFile(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    if (!search) return true;
    const name = customerDisplayName(c).toLowerCase();
    return name.includes(search.toLowerCase()) || (c.phone || '').includes(search);
  });

  const filteredSignoffs = signoffs.filter((s) => {
    if (!signoffsSearch) return true;
    const q = signoffsSearch.toLowerCase();
    return (
      (s.customerName || '').toLowerCase().includes(q) ||
      (s.fileName || '').toLowerCase().includes(q) ||
      (s.signerName || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 text-right pb-10" dir="rtl">
      <PageHeader
        title="ارتباط با مشتریان و تأییدیه تحویل سایت"
        description="ارسال پیام و فایل، گفت‌وگوی اختصاصی با مشتریان، ثبت و پیگیری تأییدیه تحویل سایت"
      >
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'chat' ? 'default' : 'outline'}
            onClick={() => setActiveTab('chat')}
            className="text-xs gap-1.5 h-9"
          >
            <MessageSquare className="w-4 h-4" />
            گفت‌وگو و ارسال فایل
          </Button>
          {isSuperAdmin && (
            <Button
              variant={activeTab === 'signoffs' ? 'default' : 'outline'}
              onClick={() => setActiveTab('signoffs')}
              className="text-xs gap-1.5 h-9"
            >
              <FileCheck2 className="w-4 h-4" />
              سوابق تأییدیه‌های تحویل سایت
            </Button>
          )}
        </div>
      </PageHeader>

      {activeTab === 'signoffs' ? (
        /* Superadmin Audit View */
        <Card className="border-slate-200">
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  سوابق رسمی تأییدیه‌های تحویل سایت مشتریان
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  تمام تأییدیه‌های ثبت‌شده توسط مشتریان غیرقابل ویرایش و غیرقابل حذف می‌باشند.
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="جستجو در سوابق تأییدیه..."
                  value={signoffsSearch}
                  onChange={(e) => setSignoffsSearch(e.target.value)}
                  className="pr-10 text-sm"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-xs font-semibold">
                    <th className="p-3">کد رهگیری</th>
                    <th className="p-3">نام مشتری</th>
                    <th className="p-3">فایل تحویل تاییدشده</th>
                    <th className="p-3">شخص تأییدکننده</th>
                    <th className="p-3">تاریخ و ساعت ثبت</th>
                    <th className="p-3">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingSignoffs ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-600" />
                        در حال دریافت سوابق...
                      </td>
                    </tr>
                  ) : filteredSignoffs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        هیچ تأییدیه‌ای تاکنون ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    filteredSignoffs.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 font-mono text-xs text-slate-500">{s.id.slice(0, 8)}</td>
                        <td className="p-3 font-bold text-slate-900">{s.customerName}</td>
                        <td className="p-3">
                          {s.fileUrl ? (
                            <a
                              href={s.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sky-600 hover:text-sky-800 font-medium inline-flex items-center gap-1 text-xs"
                            >
                              <Download className="w-3.5 h-3.5" />
                              {s.fileName}
                            </a>
                          ) : (
                            <span className="text-xs text-slate-600">{s.fileName}</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-800 font-semibold">{s.signerName}</td>
                        <td className="p-3 font-mono text-xs text-slate-600">{s.confirmedAtFormatted}</td>
                        <td className="p-3">
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold text-xs gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            تأیید نهایی شده
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Chat Main Pane */
        <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-220px)] min-h-[550px]">
          {/* Customers Sidebar */}
          <Card className="w-80 shrink-0 hidden md:flex flex-col border-slate-200 shadow-sm">
            <CardContent className="p-0 flex flex-col h-full">
              <div className="p-3 border-b border-slate-100 bg-slate-50/70">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="جستجوی مشتری..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pr-10 text-xs bg-white"
                  />
                </div>
                <div className="text-[11px] text-slate-400 mt-2 font-medium flex items-center justify-between">
                  <span>تعداد مشتریان: {filteredCustomers.length}</span>
                  <span className="text-sky-600">انتخاب جهت گفت‌وگو</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-sky-600 mb-2" />
                    <p className="text-xs">در حال بارگذاری مشتریان...</p>
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                    <Users className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-xs">مشتری‌ای یافت نشد</p>
                  </div>
                ) : (
                  filteredCustomers.map((c) => {
                    const isSelected = selectedCustomer?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCustomer(c)}
                        className={`w-full flex items-center gap-3 p-3.5 hover:bg-slate-50 text-right transition-colors ${
                          isSelected ? 'bg-sky-50/90 border-r-4 border-sky-600' : ''
                        }`}
                      >
                        <Avatar className="w-10 h-10 shrink-0">
                          <AvatarFallback className="bg-sky-100 text-sky-700 text-sm font-bold">
                            {customerInitial(c)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-800 truncate">
                            {customerDisplayName(c)}
                          </div>
                          <div className="text-xs text-slate-400 truncate mt-0.5">
                            {c.email || (c.type === 'company' ? 'مشتری حقوقی' : 'مشتری حقیقی')}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active Chat Conversation Area */}
          <Card className="flex-1 flex flex-col border-slate-200 shadow-sm overflow-hidden">
            {/* Mobile Customer Selector */}
            <div className="md:hidden p-3 border-b border-slate-100 bg-slate-50/90 flex items-center gap-2">
              <span className="text-xs text-slate-600 font-semibold whitespace-nowrap">انتخاب مشتری:</span>
              <select
                value={selectedCustomer?.id || ''}
                onChange={(e) => {
                  const found = customers.find((x) => x.id === e.target.value);
                  if (found) setSelectedCustomer(found);
                }}
                className="flex-1 text-xs bg-white border border-slate-200 rounded-lg p-2 font-medium"
              >
                <option value="" disabled>انتخاب مشتری از لیست...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {customerDisplayName(c)}
                  </option>
                ))}
              </select>
            </div>

            {selectedCustomer ? (
              <div className="flex flex-col h-full">
                {/* Chat Top Header */}
                <div className="flex items-center justify-between p-3.5 px-5 border-b border-slate-100 bg-white">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-sky-100 text-sky-700 font-bold">
                        {customerInitial(selectedCustomer)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">
                        {customerDisplayName(selectedCustomer)}
                      </div>
                      <div className="text-xs text-slate-400 font-medium">
                        {selectedCustomer.email || (selectedCustomer.type === 'company' ? 'مشتری حقوقی' : 'مشتری حقیقی')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-200">
                      پورتال اختصاصی متصل
                    </Badge>
                  </div>
                </div>

                {/* Messages Thread */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                      <MessageSquare className="w-12 h-12 text-slate-300 mb-2" />
                      <p className="text-sm font-semibold text-slate-600">هنوز پیامی رد و بدل نشده است</p>
                      <p className="text-xs text-slate-400 mt-1">اولین پیام یا فایل تحویل سایت را ارسال کنید.</p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isSystem = m.senderType === 'system';
                      const isStaff = m.senderType === 'staff';
                      const isCustomer = m.senderType === 'customer';

                      if (isSystem) {
                        return (
                          <div key={m.id} className="flex justify-center my-3">
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-2xl max-w-lg text-center leading-relaxed shadow-sm">
                              {m.content}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isStaff ? 'items-start' : 'items-end'}`}
                        >
                          <div className="text-[11px] text-slate-400 mb-1 px-1">
                            {isStaff ? 'شما (پرسنل / مدیریت)' : (m.senderName || 'مشتری')}
                          </div>

                          <div
                            className={`max-w-xl rounded-2xl p-4 shadow-sm text-sm space-y-2 ${
                              isStaff
                                ? 'bg-sky-600 text-white rounded-tr-none'
                                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                            }`}
                          >
                            {/* Delivery file badge banner */}
                            {m.isDeliveryFile && (
                              <div
                                className={`p-2.5 rounded-xl text-xs space-y-1 font-medium ${
                                  isStaff ? 'bg-sky-700/70 text-sky-100' : 'bg-amber-50 text-amber-900 border border-amber-200'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 font-bold">
                                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                                  <span>فایل رسمی تحویل سایت</span>
                                </div>
                                <div className="text-[11px] opacity-90">
                                  {m.deliveryConfirmed ? (
                                    <span className="text-emerald-300 font-bold">
                                      ✅ توسط مشتری با موفقیت تأیید شد
                                    </span>
                                  ) : (
                                    <span className="text-amber-200">
                                      ⏳ در انتظار تأیید مشتری در پورتال
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Message text */}
                            {m.content && (
                              <p className="whitespace-pre-wrap leading-relaxed">
                                {m.content.replace('[DELIVERY_FILE]', '').trim()}
                              </p>
                            )}

                            {/* Attachment view / download */}
                            {m.attachmentUrl && (
                              <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                                isStaff
                                  ? 'bg-sky-700/50 border-sky-500 text-white'
                                  : 'bg-slate-50 border-slate-200 text-slate-800'
                              }`}>
                                <div className="flex items-center gap-2 truncate">
                                  <Paperclip className="w-4 h-4 shrink-0" />
                                  <span className="truncate font-semibold">{m.attachmentName || 'فایل پیوست'}</span>
                                </div>
                                <a
                                  href={m.attachmentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  download
                                  className={`p-1.5 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1 ${
                                    isStaff ? 'bg-white text-sky-800' : 'bg-sky-600 text-white'
                                  }`}
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  دانلود
                                </a>
                              </div>
                            )}

                            <div
                              className={`text-[10px] text-left font-mono pt-1 ${
                                isStaff ? 'text-sky-200' : 'text-slate-400'
                              }`}
                              dir="ltr"
                            >
                              {m.createdAt ? relativeTime(m.createdAt) : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input & File Bar */}
                <div className="p-3 border-t border-slate-200 bg-white space-y-2">
                  {/* Selected file preview pill */}
                  {selectedFile && (
                    <div className="flex items-center justify-between p-2 px-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-800">
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="w-4 h-4 text-sky-600 shrink-0" />
                        <span className="font-semibold truncate">{selectedFile.name}</span>
                        <span className="text-slate-400 font-mono">({Math.round(selectedFile.size / 1024)} KB)</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-rose-600 hover:text-rose-700 h-6 px-2 text-xs"
                      >
                        حذف فایل
                      </Button>
                    </div>
                  )}

                  {/* Delivery File Checkbox */}
                  <div className="flex items-center gap-2 px-1">
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isDeliveryFile}
                        onChange={(e) => setIsDeliveryFile(e.target.checked)}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
                      />
                      <span className="font-semibold text-slate-800">علامت‌گذاری به عنوان «فایل تحویل سایت» جهت ثبت تأییدیه مشتری</span>
                    </label>
                  </div>

                  <form onSubmit={handleSend} className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setSelectedFile(f);
                      }}
                      className="hidden"
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      className="shrink-0 h-10 w-10 text-slate-600 hover:text-sky-600"
                      title="پیوست فایل"
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>

                    <Input
                      placeholder={isDeliveryFile ? 'توضیحات فایل تحویل سایت...' : 'پیام خود را بنویسید...'}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 text-sm h-10"
                    />

                    <Button
                      type="submit"
                      disabled={sending || uploadingFile || (!newMessage.trim() && !selectedFile)}
                      className="h-10 px-5 bg-sky-600 hover:bg-sky-700 text-white font-medium gap-1.5 shrink-0"
                    >
                      {sending || uploadingFile ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>ارسال</span>
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-400">
                <Users className="w-14 h-14 text-slate-300 mb-3" />
                <h3 className="text-base font-bold text-slate-700">مشتری مورد نظر را انتخاب کنید</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  از ستون سمت راست یک مشتری را انتخاب نمایید تا تاریخچه گفت‌وگو و امکان ارسال فایل تحویل سایت نمایش داده شود.
                </p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
