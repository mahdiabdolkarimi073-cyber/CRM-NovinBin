'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { fetchData, createData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, Search, Paperclip, Video, FileText, X } from 'lucide-react';
import { relativeTime } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { StaffChatMessage, Profile } from '@/lib/types';

interface Conversation {
  profile: Profile;
  lastMessage?: StaffChatMessage;
  unreadCount: number;
}

export default function StaffChatPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<StaffChatMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<{ url: string; name: string; type: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadUsers = useCallback(async () => {
    if (!profile) return;
    try {
      const data = await fetchData<Profile>('profiles', {
        where: { id: { not: profile.id } },
      });
      setUsers(data || []);
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  }, [profile]);

  const loadConversations = useCallback(async () => {
    if (!profile) return;
    try {
      const allMessages = await fetchData<StaffChatMessage>('staff_chat_messages', {
        orderBy: { createdAt: 'desc' },
      });
      const userMap = new Map<string, Conversation>();
      for (const msg of allMessages || []) {
        const otherId = msg.senderId === profile.id ? msg.receiverId : msg.senderId;
        const otherProfile = users.find((u) => u.id === otherId);
        if (!otherProfile) continue;
        const existing = userMap.get(otherId);
        const isUnread = msg.receiverId === profile.id && !msg.readAt;
        if (!existing) {
          userMap.set(otherId, {
            profile: otherProfile,
            lastMessage: msg,
            unreadCount: isUnread ? 1 : 0,
          });
        } else {
          if (!existing.lastMessage || new Date(msg.createdAt) > new Date(existing.lastMessage.createdAt)) {
            existing.lastMessage = msg;
          }
          if (isUnread) existing.unreadCount++;
        }
      }
      setConversations(Array.from(userMap.values()).sort((a, b) => {
        const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return bTime - aTime;
      }));
    } catch (e: any) {
      // ignore
    }
  }, [profile, users]);

  const loadMessages = useCallback(async (otherUserId: string) => {
    if (!profile) return;
    try {
      const data = await fetchData<StaffChatMessage>('staff_chat_messages', {
        orderBy: { createdAt: 'asc' },
      });
      const filtered = (data || []).filter(
        (m) =>
          (m.senderId === profile.id && m.receiverId === otherUserId) ||
          (m.senderId === otherUserId && m.receiverId === profile.id)
      );
      setMessages(filtered);
      const unread = filtered.filter((m) => m.receiverId === profile.id && !m.readAt);
      for (const m of unread) {
        await updateData('staff_chat_messages', { id: m.id }, { readAt: new Date() });
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [profile]);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { if (users.length > 0) loadConversations(); }, [loadConversations]);
  useEffect(() => {
    if (selectedUser) loadMessages(selectedUser.id);
  }, [selectedUser, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedUser) loadMessages(selectedUser.id);
      if (users.length > 0) loadConversations();
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedUser, loadMessages, loadConversations, users.length]);

  const handleSend = async () => {
    if (!profile || !selectedUser) return;
    if (!text.trim() && !attachment) return;
    setSending(true);
    try {
      const payload: Record<string, any> = {
        receiverId: selectedUser.id,
        content: text.trim() || null,
      };
      if (attachment) {
        payload.attachmentUrl = attachment.url;
        payload.attachmentName = attachment.name;
        payload.attachmentType = attachment.type;
      }
      await createData('staff_chat_messages', payload);
      setText('');
      setAttachment(null);
      loadMessages(selectedUser.id);
      loadConversations();
    } catch (e: any) {
      toast.error(e.message);
    }
    setSending(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('حداکثر حجم فایل ۱۰ مگابایت');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
      setAttachment({ url: reader.result as string, name: file.name, type });
    };
    reader.readAsDataURL(file);
  };

  const getUserLabel = (u: Profile) => {
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || 'کاربر';
    return name;
  };

  const getInitials = (u: Profile) => {
    const fn = u.firstName?.[0] || '';
    const ln = u.lastName?.[0] || '';
    return (fn + ln).toUpperCase() || '؟';
  };

  const roleLabels: Record<string, string> = {
    owner: 'مالک',
    super_admin: 'سوپرادمین',
    admin: 'مدیر',
    personnel: 'پرسنل',
  };

  const filteredUsers = users.filter((u) =>
    getUserLabel(u).toLowerCase().includes(search.toLowerCase())
  );

  const conversationUsers = new Set(conversations.map((c) => c.profile.id));
  const recentConvoUsers = conversations.map((c) => c.profile);
  const otherUsers = filteredUsers.filter((u) => !conversationUsers.has(u.id));

  if (loading) {
    return (
      <div>
        <PageHeader title="چت پرسنل" description="چت خصوصی با کاربران سیستم" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="چت پرسنل" description="چت خصوصی با کاربران سیستم — متن، عکس و ویدیو" />

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 h-[calc(100vh-220px)]">
        {/* Sidebar: user list */}
        <Card className="flex flex-col overflow-hidden">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="جستجوی کاربر..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10 h-9"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2">
              {conversations.length === 0 && otherUsers.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  کاربری یافت نشد
                </div>
              ) : (
                <>
                  {recentConvoUsers.length > 0 && (
                    <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground">گفتگوهای اخیر</div>
                  )}
                  {recentConvoUsers
                    .filter((u) => getUserLabel(u).toLowerCase().includes(search.toLowerCase()))
                    .map((u) => {
                      const convo = conversations.find((c) => c.profile.id === u.id)!;
                      const isActive = selectedUser?.id === u.id;
                      return (
                        <button
                          key={u.id}
                          onClick={() => setSelectedUser(u)}
                          className={cn(
                            'w-full flex items-center gap-3 p-2.5 rounded-lg transition-smooth text-right',
                            isActive ? 'bg-sky-50' : 'hover:bg-muted'
                          )}
                        >
                          <Avatar className="w-10 h-10 shrink-0">
                            <AvatarFallback className="bg-sky-100 text-sky-700 text-sm font-bold">
                              {getInitials(u)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-sm text-slate-900 truncate">{getUserLabel(u)}</span>
                              {convo.lastMessage && (
                                <span className="text-[10px] text-slate-400 shrink-0">
                                  {relativeTime(convo.lastMessage.createdAt)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-slate-500 truncate">
                                {convo.lastMessage?.content || (convo.lastMessage?.attachmentUrl ? 'فایل' : '')}
                              </span>
                              {convo.unreadCount > 0 && (
                                <Badge className="bg-sky-500 text-white text-[10px] h-5 min-w-5 flex items-center justify-center px-1">
                                  {convo.unreadCount.toLocaleString('fa-IR')}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  {otherUsers.length > 0 && recentConvoUsers.length > 0 && (
                    <div className="px-2 py-1.5 mt-2 text-xs font-bold text-muted-foreground">سایر کاربران</div>
                  )}
                  {otherUsers.map((u) => {
                    const isActive = selectedUser?.id === u.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => setSelectedUser(u)}
                        className={cn(
                          'w-full flex items-center gap-3 p-2.5 rounded-lg transition-smooth text-right',
                          isActive ? 'bg-sky-50' : 'hover:bg-muted'
                        )}
                      >
                        <Avatar className="w-10 h-10 shrink-0">
                          <AvatarFallback className="bg-slate-100 text-slate-600 text-sm font-bold">
                            {getInitials(u)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm text-slate-900 truncate block">{getUserLabel(u)}</span>
                          <span className="text-xs text-slate-400">{roleLabels[u.role] || u.role}</span>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Chat area */}
        {selectedUser ? (
          <Card className="flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 p-3 border-b bg-white">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-sky-100 text-sky-700 text-sm font-bold">
                  {getInitials(selectedUser)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-bold text-slate-900">{getUserLabel(selectedUser)}</div>
                <div className="text-xs text-slate-400">{roleLabels[selectedUser.role] || selectedUser.role}</div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <MessageCircle className="w-10 h-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      گفتگو را شروع کنید — اولین پیام را ارسال کنید
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.senderId === profile?.id;
                    return (
                      <div
                        key={msg.id}
                        className={cn('flex', isMine ? 'justify-start' : 'justify-end')}
                      >
                        <div
                          className={cn(
                            'max-w-[75%] rounded-2xl px-4 py-2.5',
                            isMine
                              ? 'bg-sky-500 text-white rounded-bl-sm'
                              : 'bg-muted text-slate-900 rounded-br-sm'
                          )}
                        >
                          {msg.content && (
                            <p className="text-sm leading-6 whitespace-pre-wrap break-words">{msg.content}</p>
                          )}
                          {msg.attachmentUrl && msg.attachmentType === 'image' && (
                            <img
                              src={msg.attachmentUrl}
                              alt={msg.attachmentName || ''}
                              className="rounded-lg max-w-full max-h-60 mt-2"
                            />
                          )}
                          {msg.attachmentUrl && msg.attachmentType === 'video' && (
                            <video
                              src={msg.attachmentUrl}
                              controls
                              className="rounded-lg max-w-full max-h-60 mt-2"
                            />
                          )}
                          {msg.attachmentUrl && msg.attachmentType === 'file' && (
                            <a
                              href={msg.attachmentUrl}
                              download={msg.attachmentName || ''}
                              className={cn(
                                'flex items-center gap-2 mt-2 text-sm underline',
                                isMine ? 'text-white' : 'text-sky-600'
                              )}
                            >
                              <FileText className="w-4 h-4" />
                              {msg.attachmentName || 'دانلود فایل'}
                            </a>
                          )}
                          <div className={cn('text-[10px] mt-1', isMine ? 'text-sky-100' : 'text-slate-400')}>
                            {relativeTime(msg.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Attachment preview */}
            {attachment && (
              <div className="px-4 py-2 border-t bg-muted/50 flex items-center gap-2">
                {attachment.type === 'image' ? (
                  <img src={attachment.url} alt="" className="w-12 h-12 rounded object-cover" />
                ) : attachment.type === 'video' ? (
                  <div className="w-12 h-12 rounded bg-slate-200 flex items-center justify-center">
                    <Video className="w-5 h-5 text-slate-500" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded bg-slate-200 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-slate-500" />
                  </div>
                )}
                <span className="text-sm text-slate-600 flex-1 truncate">{attachment.name}</span>
                <Button size="sm" variant="ghost" onClick={() => setAttachment(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t flex items-center gap-2 bg-white">
              <label className="cursor-pointer">
                <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
                <div className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted transition-smooth">
                  <Paperclip className="w-4 h-4 text-slate-500" />
                </div>
              </label>
              <Input
                placeholder="پیام بنویسید..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-1"
              />
              <Button size="icon" onClick={handleSend} disabled={sending || (!text.trim() && !attachment)}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="flex items-center justify-center">
            <EmptyState
              icon={<MessageCircle className="w-8 h-8" />}
              title="یک کاربر را انتخاب کنید"
              description="از لیست کناری کاربری را انتخاب کنید تا گفتگو را شروع کنید"
            />
          </Card>
        )}
      </div>
    </div>
  );
}
