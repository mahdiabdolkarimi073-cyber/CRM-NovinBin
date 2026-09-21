'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { fetchData, createData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { EmptyState } from '@/components/dashboard/empty-state';
import { MessageCircle, Send, Search, Paperclip, Video, FileText, X, Info, Smile, Mic, CheckCheck, Users, XCircle, Phone, ArrowLeft, User, FolderTree } from 'lucide-react';
import { relativeTime, formatJalali } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { CustomerSocialMessage, Profile, CustomerSocialFolder } from '@/lib/types';

const EMOJIS = ['😀','😄','😁','😊','😍','🤩','😎','🤔','😅','😂','🥳','😇','🙂','😉','😌','😋','🤗','🤝','👍','👏','🙏','💪','🔥','✨','🎉','❤️','💯','⭐','✅','🚀','🌹','🎁'];
const ONLINE_THRESHOLD_MS = 45 * 1000;

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS;
}

interface DMConversation {
  profile: Profile;
  lastMessage?: CustomerSocialMessage;
  unreadCount: number;
}

export default function CustomerSocialPage() {
  const { profile } = useAuth();
  const [customerProfiles, setCustomerProfiles] = useState<Profile[]>([]);
  const [folders, setFolders] = useState<CustomerSocialFolder[]>([]);
  const [folderCustomerMap, setFolderCustomerMap] = useState<Record<string, Profile[]>>({});
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [dmMessages, setDmMessages] = useState<CustomerSocialMessage[]>([]);
  const [dmConversations, setDmConversations] = useState<DMConversation[]>([]);
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

  const getUserLabel = useCallback((u: Profile) => [u.firstName, u.lastName].filter(Boolean).join(' ') || 'مشتری', []);
  const getInitials = useCallback((u: Profile) => ((u.firstName?.[0] || '') + (u.lastName?.[0] || '')).toUpperCase() || '؟', []);

  // Load all customer profiles that this staff has interacted with + customers from folders where staff is a member
  const loadCustomers = useCallback(async () => {
    if (!profile) return;
    try {
      // Get folder members where this staff is assigned
      const folderMembers = await fetchData('customer_social_folder_members', { where: { profileId: profile.id } });
      const folderIds = (folderMembers || []).map((fm: any) => fm.folderId);
      let customerIds: string[] = [];
      const perFolderCustomers: Record<string, Profile[]> = {};
      if (folderIds.length > 0) {
        for (const fid of folderIds) {
          const fc = await fetchData('customer_social_folder_customers', { where: { folderId: fid } });
          const fCustomerIds = (fc || []).map((c: any) => c.customerId);
          customerIds.push(...fCustomerIds);
          if (fCustomerIds.length > 0) {
            const fCustomers = await fetchData<Profile>('profiles', { where: { id: { in: fCustomerIds }, userType: 'customer' } });
            perFolderCustomers[fid] = fCustomers || [];
          } else {
            perFolderCustomers[fid] = [];
          }
        }
        setFolderCustomerMap(perFolderCustomers);
        const folderData = await fetchData<CustomerSocialFolder>('customer_social_folders', { where: { id: { in: folderIds } } });
        setFolders(folderData || []);
      } else {
        setFolderCustomerMap({});
        setFolders([]);
      }
      // Also get customers from existing DM conversations
      const allMessages = await fetchData<CustomerSocialMessage>('customer_social_messages', { orderBy: { createdAt: 'desc' } });
      const msgCustomerIds = (allMessages || []).flatMap((m) => [m.senderId, m.receiverId]).filter((id) => id !== profile.id);
      customerIds = [...new Set([...customerIds, ...msgCustomerIds])];
      if (customerIds.length > 0) {
        const customers = await fetchData<Profile>('profiles', { where: { id: { in: customerIds }, userType: 'customer' } });
        setCustomerProfiles(customers || []);
      } else {
        setCustomerProfiles([]);
      }
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }, [profile]);

  // Load DM conversations
  const loadDMConversations = useCallback(async () => {
    if (!profile) return;
    try {
      const allMessages = await fetchData<CustomerSocialMessage>('customer_social_messages', { orderBy: { createdAt: 'desc' } });
      const otherIds = Array.from(new Set((allMessages || []).flatMap((m) => [m.senderId, m.receiverId]).filter((id) => id !== profile.id)));
      let extraCustomers: Profile[] = [];
      const missingIds = otherIds.filter((id) => !customerProfiles.some((u) => u.id === id));
      if (missingIds.length > 0) {
        const extra = await fetchData<Profile>('profiles', { where: { id: { in: missingIds }, userType: 'customer' } });
        extraCustomers = extra || [];
        if (extraCustomers.length > 0) {
          setCustomerProfiles((prev) => {
            const existing = new Set(prev.map((p) => p.id));
            return [...prev, ...extraCustomers.filter((e) => !existing.has(e.id))];
          });
        }
      }
      const allCustomers = [...customerProfiles, ...extraCustomers];
      const userMap = new Map<string, DMConversation>();
      for (const msg of allMessages || []) {
        const otherId = msg.senderId === profile.id ? msg.receiverId : msg.senderId;
        const otherProfile = allCustomers.find((u) => u.id === otherId);
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
      setDmConversations(Array.from(userMap.values()).sort((a, b) => {
        const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return bTime - aTime;
      }));
    } catch {}
  }, [profile, customerProfiles]);

  // Load DM messages for a specific customer
  const loadDmMessages = useCallback(async (otherUserId: string) => {
    if (!profile) return;
    try {
      const data = await fetchData<CustomerSocialMessage>('customer_social_messages', { orderBy: { createdAt: 'asc' } });
      const filtered = (data || []).filter((m) =>
        (m.senderId === profile.id && m.receiverId === otherUserId) ||
        (m.senderId === otherUserId && m.receiverId === profile.id)
      );
      setDmMessages(filtered);
      const unread = filtered.filter((m) => m.receiverId === profile.id && !m.readAt);
      for (const m of unread) await updateData('customer_social_messages', { id: m.id }, { readAt: new Date() });
    } catch (e: any) { toast.error(e.message); }
  }, [profile]);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);
  useEffect(() => { if (customerProfiles.length >= 0) loadDMConversations(); }, [loadDMConversations]);
  useEffect(() => { if (selectedUser) loadDmMessages(selectedUser.id); }, [selectedUser, loadDmMessages]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [dmMessages]);

  // Auto-track device info on page load
  useEffect(() => {
    if (!profile) return;
    const ua = navigator.userAgent;
    const fingerprint = `${ua}|${screen.width}x${screen.height}|${navigator.language}`;
    let deviceName: string | null = null;
    try {
      const nav = navigator as any;
      if (nav.userAgentData?.mobile) deviceName = 'موبایل';
      else if (nav.userAgentData?.platform) deviceName = nav.userAgentData.platform;
    } catch {}
    if (!deviceName) {
      if (/Mobile|Android|iPhone/.test(ua)) deviceName = 'موبایل';
      else if (/iPad|Tablet/.test(ua)) deviceName = 'تبلت';
      else deviceName = 'کامپیوتر';
    }
    fetch('/api/customer-devices/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint, deviceName, appVersion: 'dashboard-1.0' }),
    }).catch(() => {});
  }, [profile]);

  // Presence heartbeat
  useEffect(() => {
    if (!profile) return;
    const beat = () => fetch('/api/chat/presence', { method: 'POST' }).catch(() => {});
    beat();
    heartbeatRef.current = setInterval(beat, 30000);
    const onVisible = () => { if (document.visibilityState === 'visible') beat(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); document.removeEventListener('visibilitychange', onVisible); };
  }, [profile]);

  // SSE for real-time messages
  useEffect(() => {
    if (!profile) return;
    const es = new EventSource('/api/customer-social/stream');
    es.addEventListener('dm', (e) => {
      try {
        const msg: CustomerSocialMessage = JSON.parse(e.data);
        if (msg.receiverId === profile.id) {
          setDmMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
          if (selectedUser?.id === msg.senderId) {
            updateData('customer_social_messages', { id: msg.id }, { readAt: new Date() }).catch(() => {});
          }
        }
        loadDMConversations();
      } catch {}
    });
    es.addEventListener('dm_read', (e) => {
      try {
        const msg: CustomerSocialMessage = JSON.parse(e.data);
        setDmMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, readAt: msg.readAt } : m));
      } catch {}
    });
    es.addEventListener('error', () => {});
    return () => es.close();
  }, [profile, selectedUser, loadDMConversations]);

  const startCall = async (remoteUser: Profile, callType: 'audio' | 'video') => {
    try {
      const res = await fetch('/api/customer-call/initiate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: remoteUser.id, callType }),
      });
      if (!res.ok) { const err = await res.json(); toast.error(err.error || 'خطا در برقراری تماس'); return; }
      toast.success(`تماس ${callType === 'video' ? 'تصویری' : 'صوتی'} با ${getUserLabel(remoteUser)} برقرار شد`);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleSend = async () => {
    if (!profile || !selectedUser || (!text.trim() && !attachment)) return;
    setSending(true);
    try {
      const payload: Record<string, any> = { receiverId: selectedUser.id, content: text.trim() || null };
      if (attachment) { payload.attachmentUrl = attachment.url; payload.attachmentName = attachment.name; payload.attachmentType = attachment.type; }
      await createData('customer_social_messages', payload);
      setText(''); setAttachment(null); setIsEmojiOpen(false);
      loadDmMessages(selectedUser.id);
      loadDMConversations();
    } catch (e: any) { toast.error(e.message); }
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

  const filteredCustomers = (selectedFolderId ? (folderCustomerMap[selectedFolderId] || []) : customerProfiles).filter((u) => getUserLabel(u).toLowerCase().includes(search.toLowerCase()));
  const dmConversationUsers = new Set(dmConversations.map((c) => c.profile.id));
  const recentConvoUsers = dmConversations.map((c) => c.profile);
  const otherCustomers = filteredCustomers.filter((u) => !dmConversationUsers.has(u.id));

  const filteredDmMessages = useMemo(() => {
    if (!messageSearch.trim()) return dmMessages;
    const q = messageSearch.toLowerCase();
    return dmMessages.filter((m) => m.content?.toLowerCase().includes(q));
  }, [dmMessages, messageSearch]);

  const selectUser = (user: Profile) => { setSelectedUser(user); setIsUsersOpen(false); };

  const renderUser = (user: Profile, conversation?: DMConversation) => {
    const isActive = selectedUser?.id === user.id;
    const online = isOnline(user.lastSeenAt);
    return (
      <button key={user.id} onClick={() => selectUser(user)} className={cn('staff-chat-user', isActive && 'is-active')}>
        <span className="staff-chat-avatar-wrap">
          <span className="staff-chat-avatar" style={{ background: '#DCFCE7', color: '#16A34A' }}>{getInitials(user)}</span>
          <span className={cn('staff-chat-presence-dot', online ? 'is-online' : 'is-offline')} />
        </span>
        <span className="staff-chat-user-copy">
          <span className="staff-chat-user-topline">
            <strong>{getUserLabel(user)}</strong>
            {conversation?.lastMessage && <time>{relativeTime(conversation.lastMessage.createdAt)}</time>}
          </span>
          <span className="staff-chat-user-bottomline">
            <small>{conversation?.lastMessage?.content || (conversation?.lastMessage?.attachmentUrl ? 'فایل' : online ? 'آنلاین' : user.lastSeenAt ? `آخرین بازدید ${relativeTime(user.lastSeenAt)}` : 'مشتری')}</small>
            {conversation?.unreadCount ? <b>{conversation.unreadCount.toLocaleString('fa-IR')}</b> : null}
          </span>
        </span>
      </button>
    );
  };

  if (loading) {
    return <div className="staff-chat-page staff-chat-page-full"><div className="staff-chat-loading"><span /></div></div>;
  }

  return (
    <div className="social-network-page">
      <header className="social-network-header">
        <div className="social-network-header-info">
          <span className="social-network-title-accent" />
          <div>
            <h1>چت مشتریان</h1>
            <p>ارتباط با مشتریان از طریق چت و تماس — شماره مشتری نمایش داده نمی‌شود</p>
          </div>
        </div>
        <a href="/dashboard" className="social-network-close">
          <ArrowLeft className="h-4 w-4" />
          بازگشت به CRM
        </a>
      </header>

      {folders.length > 0 && (
        <div className="portal-social-folders">
          <button
            key="all"
            className={cn('portal-social-folder-chip', !selectedFolderId && 'is-active')}
            onClick={() => setSelectedFolderId(null)}
          >
            <Users className="w-3.5 h-3.5" />
            همه
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              className={cn('portal-social-folder-chip', selectedFolderId === f.id && 'is-active')}
              onClick={() => setSelectedFolderId(selectedFolderId === f.id ? null : f.id)}
            >
              <FolderTree className="w-3.5 h-3.5" />
              {f.name}
            </button>
          ))}
        </div>
      )}

      <div className="social-network-body">
        <section className="staff-chat-panel">
          {selectedUser && (
            <>
              <header className="staff-chat-header">
                <div className="staff-chat-person">
                  <span className="staff-chat-avatar-wrap">
                    <span className="staff-chat-avatar staff-chat-avatar-large" style={{ background: '#DCFCE7', color: '#16A34A' }}>{getInitials(selectedUser)}</span>
                    <span className={cn('staff-chat-presence-dot', isOnline(selectedUser.lastSeenAt) ? 'is-online' : 'is-offline')} />
                  </span>
                  <div>
                    <strong>{getUserLabel(selectedUser)}</strong>
                    <span className="staff-chat-status">
                      <i className={cn(isOnline(selectedUser.lastSeenAt) ? 'is-online' : 'is-offline')} />
                      {isOnline(selectedUser.lastSeenAt) ? 'آنلاین' : selectedUser.lastSeenAt ? `آخرین بازدید ${relativeTime(selectedUser.lastSeenAt)}` : 'مشتری'}
                    </span>
                  </div>
                </div>
                <div className="staff-chat-actions">
                  <button className="staff-chat-icon-button mobile-only" onClick={() => setIsUsersOpen(true)} aria-label="نمایش مشتریان"><Users /></button>
                  <button className="call-action-btn call-action-audio" onClick={() => startCall(selectedUser, 'audio')} aria-label="تماس صوتی" title="تماس صوتی"><Phone /></button>
                  <button className="call-action-btn call-action-video" onClick={() => startCall(selectedUser, 'video')} aria-label="تماس تصویری" title="تماس تصویری"><Video /></button>
                  <button className="staff-chat-icon-button" onClick={() => setIsMessageSearchOpen((v) => !v)} aria-label="جستجوی پیام"><Search /></button>
                  <button className="staff-chat-icon-button" aria-label="اطلاعات"><Info /></button>
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
                {dmMessages.length === 0 ? (
                  <div className="staff-chat-empty"><MessageCircle /><p>گفتگو را شروع کنید — اولین پیام را ارسال کنید</p></div>
                ) : filteredDmMessages.length === 0 ? (
                  <div className="staff-chat-empty"><Search /><p>پیامی با این عبارت یافت نشد</p></div>
                ) : filteredDmMessages.map((msg) => {
                  const isMine = msg.senderId === profile?.id;
                  return <div key={msg.id} className={cn('staff-chat-message-row', isMine ? 'is-mine' : 'is-other')}>
                    {!isMine && <span className="staff-chat-avatar staff-chat-message-avatar" style={{ background: '#DCFCE7', color: '#16A34A' }}>{getInitials(selectedUser)}</span>}
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
            </>
          )}

          {!selectedUser && (
            <div className="staff-chat-empty-panel">
              <button className="mobile-user-trigger" onClick={() => setIsUsersOpen(true)}>
                <Users /> انتخاب مشتری
              </button>
              <EmptyState icon={<User />} title="یک مشتری را انتخاب کنید" description="از لیست مشتریان، گفتگو را انتخاب کنید" />
            </div>
          )}

          {selectedUser && (
            <>
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
                <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="پیام خود را بنویسید..." />
                <button className="staff-chat-send" onClick={handleSend} disabled={sending || (!text.trim() && !attachment)} aria-label="ارسال پیام"><Send /></button>
              </div>
            </>
          )}
        </section>

        <aside className={cn('social-network-users', isUsersOpen && 'is-open')}>
          <div className="staff-chat-users-toolbar">
            <div className="staff-chat-search"><Search /><input placeholder="جستجوی مشتری..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          </div>
          <div className="staff-chat-users-list">
            {customerProfiles.length === 0 && dmConversations.length === 0 ? (
              <div className="staff-chat-no-users">
                <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>هنوز مشتری‌ای با شما ارتباط برقرار نکرده</p>
              </div>
            ) : (
              <>
                {recentConvoUsers.length > 0 && <h3>گفتگوهای اخیر</h3>}
                {recentConvoUsers.filter((u) => getUserLabel(u).toLowerCase().includes(search.toLowerCase())).map((u) => renderUser(u, dmConversations.find((c) => c.profile.id === u.id)))}
                {otherCustomers.length > 0 && recentConvoUsers.length > 0 && <h3>سایر مشتریان</h3>}
                {otherCustomers.map((u) => renderUser(u))}
              </>
            )}
          </div>
        </aside>
        {isUsersOpen && <button className="staff-chat-overlay" onClick={() => setIsUsersOpen(false)} aria-label="بستن فهرست" />}
      </div>
    </div>
  );
}
