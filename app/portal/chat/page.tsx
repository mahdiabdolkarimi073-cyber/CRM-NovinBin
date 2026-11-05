'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  MessageSquare, Send, Paperclip, CheckCircle2, Clock, ShieldCheck,
  Download, AlertTriangle, FileCheck2, Loader2,
} from 'lucide-react';
import { relativeTime, formatJalaliDateTime } from '@/lib/format';
import { toast } from 'sonner';

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
  createdAt: string;
};

export default function PortalChatPage() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<CustomerChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delivery confirmation dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [fileToConfirm, setFileToConfirm] = useState<{ messageId: string; fileName: string; fileUrl: string } | null>(null);
  const [confirming, setConfirming] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMessages = useCallback(async () => {
    if (!profile?.customerId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/customer-chat/messages?customerId=${profile.customerId}`);
      const json = await res.json();
      if (res.ok) {
        setMessages(json.messages || []);
      }
    } catch (err) {
      console.error('Error fetching portal chat messages:', err);
    } finally {
      setLoading(false);
    }
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [profile?.customerId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Polling every 4 seconds for live interaction
  useEffect(() => {
    if (!profile?.customerId) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/customer-chat/messages?customerId=${profile.customerId}`);
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
  }, [profile?.customerId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.customerId) return;
    if (!newMessage.trim() && !selectedFile) {
      toast.error('لطفاً پیام یا فایل را وارد کنید');
      return;
    }

    setSending(true);
    try {
      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;

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

      const res = await fetch('/api/customer-chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: profile.customerId,
          content: newMessage.trim(),
          attachmentUrl,
          attachmentName,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'خطا در ارسال پیام');

      setNewMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadMessages();
      toast.success('پیام شما ارسال شد');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
      setUploadingFile(false);
    }
  };

  // Site delivery confirmation execution
  const executeDeliveryConfirm = async () => {
    if (!fileToConfirm) return;
    setConfirming(true);
    try {
      const res = await fetch('/api/customer-chat/delivery-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: fileToConfirm.messageId,
          fileName: fileToConfirm.fileName,
          fileUrl: fileToConfirm.fileUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'خطا در ثبت تأییدیه تحویل سایت');
      }

      toast.success(json.message || 'تأییدیه تحویل سایت با موفقیت ثبت شد');
      setConfirmDialogOpen(false);
      setFileToConfirm(null);
      await loadMessages();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-4 text-right pb-10" dir="rtl">
      <PageHeader
        title="ارتباط با پشتیبانی و تحویل سایت"
        description="گفت‌وگوی اختصاصی با تیم فنی و تأیید رسمی فایل تحویل پروژه"
      />

      <Card className="border-slate-200 shadow-sm flex flex-col h-[calc(100vh-220px)] min-h-[550px] overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 px-6 border-b border-slate-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
              نوین
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-800">پشتیبانی و مدیریت پروژه نوین بین</h2>
              <p className="text-xs text-slate-400">گفت‌وگوی مستقیم و تأییدیه تحویل نهایی</p>
            </div>
          </div>
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
            آنلاین
          </Badge>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/60">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-sky-600 mb-2" />
              <p className="text-sm">در حال دریافت گفت‌وگو...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">هنوز پیامی ثبت نشده است</p>
              <p className="text-xs text-slate-400 mt-1">پیام خود را در کادر زیر بنویسید و ارسال کنید.</p>
            </div>
          ) : (
            messages.map((m) => {
              const isSystem = m.senderType === 'system';
              const isCustomer = m.senderType === 'customer';
              const isStaff = m.senderType === 'staff';

              if (isSystem) {
                return (
                  <div key={m.id} className="flex justify-center my-3">
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-2xl max-w-xl text-center leading-relaxed shadow-sm">
                      {m.content}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                >
                  <div className="text-[11px] text-slate-400 mb-1 px-1">
                    {isCustomer ? 'شما (مشتری)' : (m.senderName || 'تیم پشتیبانی نوین بین')}
                  </div>

                  <div
                    className={`max-w-xl rounded-2xl p-4 shadow-sm text-sm space-y-2.5 ${
                      isCustomer
                        ? 'bg-sky-600 text-white rounded-tr-none'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                    }`}
                  >
                    {/* 1. Downloadable site delivery file / Attachment FIRST on TOP */}
                    {m.attachmentUrl && (
                      <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                        isCustomer
                          ? 'bg-sky-700/60 border-sky-400 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}>
                        <div className="flex items-center gap-2 truncate">
                          <Paperclip className="w-4 h-4 shrink-0" />
                          <div className="truncate">
                            <span className="truncate font-semibold block">{m.attachmentName || 'فایل تحویل پروژه'}</span>
                            {m.isDeliveryFile && (
                              <span className="text-[10px] opacity-80 block">فایل رسمی تحویل سایت</span>
                            )}
                          </div>
                        </div>
                        <a
                          href={m.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className={`p-2 px-3 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5 min-h-[44px] transition-colors ${
                            isCustomer ? 'bg-white text-sky-800 hover:bg-sky-50' : 'bg-sky-600 text-white hover:bg-sky-700'
                          }`}
                        >
                          <Download className="w-4 h-4" />
                          <span>دانلود فایل تحویل</span>
                        </a>
                      </div>
                    )}

                    {/* 2. Message content */}
                    {m.content && (
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {m.content.replace('[DELIVERY_FILE]', '').trim()}
                      </p>
                    )}

                    {/* 3. Site Delivery Confirmation Card & Action Button at the BOTTOM */}
                    {m.isDeliveryFile && (
                      <div className="p-3.5 bg-amber-50/95 border border-amber-200 rounded-xl text-amber-900 space-y-2.5 mt-1">
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <FileCheck2 className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>تأییدیه رسمی تحویل سایت</span>
                        </div>
                        <p className="text-xs leading-relaxed text-amber-800">
                          لطفاً ابتدا فایل تحویل فوق را دانلود و بررسی نمایید، سپس در این بخش تأییدیه رسمی خود را ثبت فرمایید.
                        </p>

                        {/* Confirmation State & Button */}
                        {m.deliveryConfirmed ? (
                          <div className="p-2.5 bg-emerald-100/90 border border-emerald-300 rounded-lg text-emerald-900 text-xs font-bold flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>این فایل توسط شما با موفقیت تأیید شد و سوابق آن غیرقابل تغییر است.</span>
                          </div>
                        ) : (
                          <div className="pt-1">
                            <Button
                              type="button"
                              onClick={() => {
                                setFileToConfirm({
                                  messageId: m.id,
                                  fileName: m.attachmentName || 'فایل تحویل سایت',
                                  fileUrl: m.attachmentUrl || '',
                                });
                                setConfirmDialogOpen(true);
                              }}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 min-h-[44px] shadow-sm gap-2"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              تأیید می‌کنم تحویل سایت را
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      className={`text-[10px] text-left font-mono pt-1 ${
                        isCustomer ? 'text-sky-200' : 'text-slate-400'
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

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-200 bg-white space-y-2">
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
              placeholder="پیام یا سؤال خود را بنویسید..."
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
      </Card>

      {/* Confirmation Modal for Site Delivery */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-md text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              تأیید رسمی تحویل سایت
            </DialogTitle>
          </DialogHeader>

          {fileToConfirm && (
            <div className="space-y-4 pt-2">
              {/* File Download Bar on TOP */}
              <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 flex items-center justify-between gap-3 text-xs">
                <div className="truncate">
                  <div className="font-bold text-sky-950 truncate">{fileToConfirm.fileName}</div>
                  <div className="text-[11px] text-sky-700 mt-0.5">فایل تحویل سایت قابل دانلود و بازبینی</div>
                </div>
                {fileToConfirm.fileUrl && (
                  <a
                    href={fileToConfirm.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="shrink-0 bg-sky-600 hover:bg-sky-700 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 min-h-[44px]"
                  >
                    <Download className="w-4 h-4" />
                    دانلود فایل
                  </a>
                )}
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-1.5">
                <div><strong>نام فایل:</strong> {fileToConfirm.fileName}</div>
                <div><strong>تأییدکننده:</strong> {[profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'مشتری'}</div>
                <div><strong>تاریخ و زمان:</strong> {formatJalaliDateTime(new Date())}</div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>توجه مهم:</span>
                </div>
                <p>
                  با ثبت تأییدیه، مراتب تحویل سایت به شکل غیرقابل تغییر و غیرقابل حذف در دیتابیس سامانه ثبت خواهد شد و پیام سیستمی به تیم فنی ارسال می‌گردد.
                </p>
              </div>

              <DialogFooter className="pt-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmDialogOpen(false)}
                  disabled={confirming}
                >
                  انصراف
                </Button>
                <Button
                  type="button"
                  onClick={executeDeliveryConfirm}
                  disabled={confirming}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
                >
                  {confirming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      در حال ثبت نهایی...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      تأیید قطعی تحویل سایت
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
