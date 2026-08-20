'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { fetchData, createData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { EmptyState } from '@/components/dashboard/empty-state';
import { MessageCircle, Send, Search, Paperclip, Video, FileText, X, Info, MoreVertical, Filter, Plus, Smile, Mic, CheckCheck, Users, ArrowRight, XCircle } from 'lucide-react';
import { relativeTime, formatJalali } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { StaffChatMessage, Profile } from '@/lib/types';

interface Conversation {
  profile: Profile;
  lastMessage?: StaffChatMessage;
  unreadCount: number;
}

const EMOJIS = ['😀', '😄', '😁', '😊', '😍', '🤩', '😎', '🤔', '😅', '😂', '🥳', '😇', '🙂', '😉', '😌', '😋', '🤗', '🤝', '👍', '👏', '🙏', '💪', '🔥', '✨', '🎉', '❤️', '💯', '⭐', '✅', '🚀'];

const ONLINE_THRESHOLD_MS = 45 * 1000;

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS;
}

export default function StaffChatPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<StaffChatMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [isMessageSearchOpen, setIsMessageSearchOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [isUsersOpen, setIsUsersOpen] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [attachment, setAttachment] = useState<{ url: string; name: string; type: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadUsers = useCallback(async () => {
    if (!profile) return;
    try {
      const data = await fetchData<Profile>('profiles', { where: { id: { not: profile.id } } });
      setUsers(data || []);
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  }, [profile]);

  const loadConversations = useCallback(async () => {
    if (!profile) return;
    try {
      const allMessages = await fetchData<StaffChatMessage>('staff_chat_messages', { orderBy: { createdAt: 'desc' } });
      const userMap = new Map<string, Conversation>();
      for (const msg of allMessages || []) {
        const otherId = msg.senderId === profile.id ? msg.receiverId : msg.senderId;
        const otherProfile = users.find((u) => u.id === otherId);
        if (!otherProfile) continue;
        const existing = userMap.get(otherId);
        const isUnread = msg.receiverId === profile.id && !msg.readAt;
        if (!existing) {
          userMap.set(otherId, { profile: otherProfile, lastMessage: msg, unreadCount: isUnread ? 1 : 0 });
        } else {
          if (!existing.lastMessage || new Date(msg.createdAt) > new Date(existing.lastMessage.createdAt)) existing.lastMessage = msg;
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
      const data = await fetchData<StaffChatMessage>('staff_chat_messages', { orderBy: { createdAt: 'asc' } });
      const filtered = (data || []).filter((m) =>
        (m.senderId === profile.id && m.receiverId === otherUserId) ||
        (m.senderId === otherUserId && m.receiverId === profile.id)
      );
      setMessages(filtered);
      const unread = filtered.filter((m) => m.receiverId === profile.id && !m.readAt);
      for (const m of unread) await updateData('staff_chat_messages', { id: m.id }, { readAt: new Date() });
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [profile]);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { if (users.length > 0) loadConversations(); }, [loadConversations]);
  useEffect(() => { if (selectedUser) loadMessages(selectedUser.id); }, [selectedUser, loadMessages]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!profile) return;
    const beat = () => fetch('/api/chat/presence', { method: 'POST' }).catch(() => {});
    beat();
    heartbeatRef.current = setInterval(beat, 30000);
    const onVisible = () => { if (document.visibilityState === 'visible') beat(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    const es = new EventSource('/api/chat/stream');
    es.addEventListener('message', (e) => {
      try {
        const msg: StaffChatMessage = JSON.parse(e.data);
        if (msg.receiverId === profile.id) {
          setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
          if (selectedUser?.id === msg.senderId) {
            updateData('staff_chat_messages', { id: msg.id }, { readAt: new Date() }).catch(() => {});
          }
        }
        loadConversations();
      } catch {}
    });
    es.addEventListener('read', (e) => {
      try {
        const msg: StaffChatMessage = JSON.parse(e.data);
        setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, readAt: msg.readAt } : m));
      } catch {}
    });
    es.addEventListener('error', () => {});
    return () => es.close();
  }, [profile, selectedUser, loadConversations]);

  const handleSend = async () => {
    if (!profile || !selectedUser || (!text.trim() && !attachment)) return;
    setSending(true);
    try {
      const payload: Record<string, any> = { receiverId: selectedUser.id, content: text.trim() || null };
      if (attachment) {
        payload.attachmentUrl = attachment.url;
        payload.attachmentName = attachment.name;
        payload.attachmentType = attachment.type;
      }
      await createData('staff_chat_messages', payload);
      setText('');
      setAttachment(null);
      setIsEmojiOpen(false);
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
    if (file.size > 10 * 1024 * 1024) { toast.error('حداکثر حجم فایل ۱۰ مگابایت'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
      setAttachment({ url: reader.result as string, name: file.name, type });
    };
    reader.readAsDataURL(file);
  };

  const getUserLabel = (u: Profile) => [u.firstName, u.lastName].filter(Boolean).join(' ') || 'کاربر';
  const getInitials = (u: Profile) => ((u.firstName?.[0] || '') + (u.lastName?.[0] || '')).toUpperCase() || '؟';
  const roleLabels: Record<string, string> = { owner: 'مالک', super_admin: 'سوپرادمین', admin: 'مدیر', personnel: 'پرسنل' };
  const filteredUsers = users.filter((u) => getUserLabel(u).toLowerCase().includes(search.toLowerCase()));
  const conversationUsers = new Set(conversations.map((c) => c.profile.id));
  const recentConvoUsers = conversations.map((c) => c.profile);
  const otherUsers = filteredUsers.filter((u) => !conversationUsers.has(u.id));

  const filteredMessages = useMemo(() => {
    if (!messageSearch.trim()) return messages;
    const q = messageSearch.toLowerCase();
    return messages.filter((m) => m.content?.toLowerCase().includes(q));
  }, [messages, messageSearch]);

  const selectUser = (user: Profile) => { setSelectedUser(user); setIsUsersOpen(false); };

  const renderUser = (user: Profile, conversation?: Conversation) => {
    const isActive = selectedUser?.id === user.id;
    const online = isOnline(user.lastSeenAt);
    return (
      <button key={user.id} onClick={() => selectUser(user)} className={cn('staff-chat-user', isActive && 'is-active')}>
        <span className="staff-chat-avatar-wrap">
          <span className="staff-chat-avatar">{getInitials(user)}</span>
          <span className={cn('staff-chat-presence-dot', online ? 'is-online' : 'is-offline')} />
        </span>
        <span className="staff-chat-user-copy">
          <span className="staff-chat-user-topline">
            <strong>{getUserLabel(user)}</strong>
            {conversation?.lastMessage && <time>{relativeTime(conversation.lastMessage.createdAt)}</time>}
          </span>
          <span className="staff-chat-user-bottomline">
            <small>{conversation?.lastMessage?.content || (conversation?.lastMessage?.attachmentUrl ? 'فایل' : online ? 'آنلاین' : user.lastSeenAt ? `آخرین بازدید ${relativeTime(user.lastSeenAt)}` : roleLabels[user.role] || user.role)}</small>
            {conversation?.unreadCount ? <b>{conversation.unreadCount.toLocaleString('fa-IR')}</b> : null}
          </span>
        </span>
      </button>
    );
  };

  if (loading) {
    return <div className="staff-chat-page"><div className="staff-chat-loading"><span /></div></div>;
  }

  return (
    <div className="staff-chat-page">
      <header className="staff-chat-page-header">
        <div className="staff-chat-title"><span /><h1>چت پرسنل</h1></div>
        <p>چت خصوصی با کاربران سیستم</p>
      </header>

      <div className="staff-chat-layout">
        <section className="staff-chat-panel">
          {selectedUser ? (
            <>
              <header className="staff-chat-header">
                <div className="staff-chat-person">
                  <span className="staff-chat-avatar-wrap">
                    <span className="staff-chat-avatar staff-chat-avatar-large">{getInitials(selectedUser)}</span>
                    <span className={cn('staff-chat-presence-dot', isOnline(selectedUser.lastSeenAt) ? 'is-online' : 'is-offline')} />
                  </span>
                  <div>
                    <strong>{getUserLabel(selectedUser)}</strong>
                    <span className="staff-chat-status">
                      <i className={cn(isOnline(selectedUser.lastSeenAt) ? 'is-online' : 'is-offline')} />
                      {isOnline(selectedUser.lastSeenAt) ? 'آنلاین' : selectedUser.lastSeenAt ? `آخرین بازدید ${relativeTime(selectedUser.lastSeenAt)}` : roleLabels[selectedUser.role] || selectedUser.role}
                    </span>
                  </div>
                </div>
                <div className="staff-chat-actions">
                  <button className="staff-chat-icon-button mobile-only" onClick={() => setIsUsersOpen(true)} aria-label="نمایش کاربران"><Users /></button>
                  <button className="staff-chat-icon-button" onClick={() => setIsMessageSearchOpen((v) => !v)} aria-label="جستجوی پیام"><Search /></button>
                  <button className="staff-chat-icon-button" aria-label="اطلاعات"><Info /></button>
                  <button className="staff-chat-icon-button" aria-label="گزینه‌های بیشتر"><MoreVertical /></button>
                </div>
              </header>

              {isMessageSearchOpen && (
                <div className="staff-chat-message-search">
                  <Search />
                  <input autoFocus placeholder="جستجو در پیام‌ها..." value={messageSearch} onChange={(e) => setMessageSearch(e.target.value)} />
                  <button onClick={() => { setIsMessageSearchOpen(false); setMessageSearch(''); }} aria-label="بستن جستجو"><XCircle /></button>
                </div>
              )}

              <div className="staff-chat-messages" ref={messagesContainerRef}>
                <div className="staff-chat-date">امروز - {formatJalali(new Date())}</div>
                {messages.length === 0 ? (
                  <div className="staff-chat-empty"><MessageCircle /><p>گفتگو را شروع کنید — اولین پیام را ارسال کنید</p></div>
                ) : filteredMessages.length === 0 ? (
                  <div className="staff-chat-empty"><Search /><p>پیامی با این عبارت یافت نشد</p></div>
                ) : filteredMessages.map((msg) => {
                  const isMine = msg.senderId === profile?.id;
                  return <div key={msg.id} className={cn('staff-chat-message-row', isMine ? 'is-mine' : 'is-other')}>
                    {!isMine && <span className="staff-chat-avatar staff-chat-message-avatar">{getInitials(selectedUser)}</span>}
                    <div className={cn('staff-chat-bubble', isMine ? 'is-mine' : 'is-other')}>
                      {msg.content && <p>{msg.content}</p>}
                      {msg.attachmentUrl && msg.attachmentType === 'image' && <img src={msg.attachmentUrl} alt={msg.attachmentName || ''} />}
                      {msg.attachmentUrl && msg.attachmentType === 'video' && <video src={msg.attachmentUrl} controls />}
                      {msg.attachmentUrl && msg.attachmentType === 'file' && <a href={msg.attachmentUrl} download={msg.attachmentName || ''}><FileText />{msg.attachmentName || 'دانلود فایل'}</a>}
                      <span className="staff-chat-message-meta">{relativeTime(msg.createdAt)} {isMine && <CheckCheck />}</span>
                    </div>
                  </div>;
                })}
                <div ref={messagesEndRef} />
              </div>

              {attachment && <div className="staff-chat-attachment-preview">
                {attachment.type === 'image' ? <img src={attachment.url} alt="" /> : <span>{attachment.type === 'video' ? <Video /> : <FileText />}</span>}
                <strong>{attachment.name}</strong><button onClick={() => setAttachment(null)} aria-label="حذف فایل"><X /></button>
              </div>}

              {isEmojiOpen && (
                <div className="staff-chat-emoji-picker">
                  {EMOJIS.map((emoji) => (
                    <button key={emoji} className="staff-chat-emoji" onClick={() => { setText((t) => t + emoji); setIsEmojiOpen(false); }}>{emoji}</button>
                  ))}
                </div>
              )}

              <div className="staff-chat-composer">
                <button className="staff-chat-tool" onClick={() => setIsEmojiOpen((v) => !v)} aria-label="افزودن شکلک"><Smile /></button>
                <label className="staff-chat-tool" aria-label="افزودن فایل"><input type="file" accept="image/*,video/*" onChange={handleFileSelect} /><Paperclip /></label>
                <button className="staff-chat-tool" aria-label="ضبط صدا"><Mic /></button>
                <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="پیام خود را بنویسید..." />
                <button className="staff-chat-send" onClick={handleSend} disabled={sending || (!text.trim() && !attachment)} aria-label="ارسال پیام"><Send /></button>
              </div>
            </>
          ) : <div className="staff-chat-empty-panel"><button className="mobile-user-trigger" onClick={() => setIsUsersOpen(true)}><Users /> انتخاب کاربر</button><EmptyState icon={<MessageCircle />} title="یک کاربر را انتخاب کنید" description="از لیست کاربران، گفتگو را انتخاب کنید" /></div>}
        </section>

        <aside className={cn('staff-chat-users-panel', isUsersOpen && 'is-open')}>
          <div className="staff-chat-users-toolbar">
            <div className="staff-chat-search"><Search /><input placeholder="جستجوی کاربر..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <button className="staff-chat-toolbar-button" aria-label="فیلتر"><Filter /></button>
            <button className="staff-chat-add-button" aria-label="افزودن گفتگو"><Plus /></button>
          </div>
          <div className="staff-chat-users-list">
            {conversations.length === 0 && otherUsers.length === 0 ? <div className="staff-chat-no-users">کاربری یافت نشد</div> : <>
              {recentConvoUsers.length > 0 && <h3>گفتگوهای اخیر</h3>}
              {recentConvoUsers.filter((u) => getUserLabel(u).toLowerCase().includes(search.toLowerCase())).map((u) => renderUser(u, conversations.find((c) => c.profile.id === u.id)))}
              {otherUsers.length > 0 && recentConvoUsers.length > 0 && <h3>سایر کاربران</h3>}
              {otherUsers.map((u) => renderUser(u))}
            </>}
          </div>
          <button className="staff-chat-all-users"><Users /> مشاهده همه کاربران</button>
        </aside>
        {isUsersOpen && <button className="staff-chat-overlay" onClick={() => setIsUsersOpen(false)} aria-label="بستن فهرست کاربران" />}
      </div>
    </div>
  );
}
