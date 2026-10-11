'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { fetchData, createData } from '@/lib/data-client';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageSquare, FileText } from 'lucide-react';
import { formatJalaliDateTime } from '@/lib/format';
import { toast } from 'sonner';

export default function PortalWorkReportsPage() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMsg, setNewMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!profile?.customerId) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await fetchData('customer_chat_messages', {
        where: { customerId: profile.customerId },
        orderBy: { createdAt: 'asc' },
      });
      setMessages(data);
      setError(null);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e: any) {
      setError(e?.message || 'خطا در بارگذاری پیام‌ها');
    }
    setLoading(false);
  }, [profile?.customerId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!profile?.customerId) return;
    const interval = setInterval(() => { load(); }, 5000);
    return () => clearInterval(interval);
  }, [profile?.customerId, load]);

  const handleSend = async () => {
    if (!newMsg.trim() || !profile || !profile.customerId) return;
    try {
      await createData('customer_chat_messages', {
        customerId: profile.customerId,
        senderType: 'customer',
        senderId: profile.id,
        content: newMsg.trim(),
      });

      // Notify assigned staff
      try {
        const assignments = await fetchData<any>('customer_assignments', {
          where: { customerId: profile.customerId },
        });
        const myName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'مشتری';
        for (const a of assignments) {
          if (a.assignedTo) {
            await createData('notifications', {
              profileId: a.assignedTo,
              title: 'پیام جدید از مشتری',
              body: `${myName} یک پیام جدید در چت ارسال کرد`,
              type: 'chat',
              priority: 'normal',
              link: '/dashboard/customers-chat',
            });
          }
        }
      } catch {}

      setNewMsg('');
      load();
    } catch (e: any) {
      toast.error('ارسال ناموفق: ' + (e?.message || 'خطا'));
    }
  };

  return (
    <div>
      <PageHeader title="گزارش کار من" description="ارتباط با پرسنل و دریافت گزارش کار" />
      <Card className="max-w-3xl mx-auto">
        <CardContent className="p-0">
          <div className="h-[500px] flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <MessageSquare className="w-10 h-10 mb-2" />
                  <p className="text-sm">{error}</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <MessageSquare className="w-10 h-10 mb-2" />
                  <p className="text-sm">هنوز پیامی ثبت نشده</p>
                </div>
              ) : messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.senderType === 'customer' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${msg.senderType === 'customer' ? 'bg-white border border-slate-200' : 'bg-sky-500 text-white'}`}>
                    {msg.isReport && (
                      <div className={`flex items-center gap-1.5 text-xs mb-1.5 ${msg.senderType === 'customer' ? 'text-sky-600' : 'text-sky-100'}`}>
                        <FileText className="w-3 h-3" />
                        گزارش کار
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    {msg.attachmentUrl && (
                      <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className={`text-xs mt-1.5 inline-block underline ${msg.senderType === 'customer' ? 'text-sky-600' : 'text-sky-100'}`}>
                        {msg.attachmentName || 'دانلود فایل'}
                      </a>
                    )}
                    <div className={`text-[10px] mt-1 ${msg.senderType === 'customer' ? 'text-slate-400' : 'text-sky-100/70'}`}>
                      {formatJalaliDateTime(msg.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="border-t p-3 flex gap-2 bg-white">
              <Input
                placeholder="پیام خود را بنویسید..."
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={!newMsg.trim()} size="icon">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
