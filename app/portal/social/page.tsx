'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { fetchData, createData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { useCall } from '@/components/providers/call-provider';
import { EmptyState } from '@/components/dashboard/empty-state';
import { MessageCircle, Send, Search, Paperclip, Video, FileText, X, Info, MoreVertical, Smile, Mic, CheckCheck, Users, XCircle, Phone, PhoneCall, ArrowLeft, ArrowRight, FolderTree, Reply, Menu, User } from 'lucide-react';
import { relativeTime, formatJalali } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { CustomerSocialMessage, Profile, CustomerSocialFolder } from '@/lib/types';

type Tab = 'dm' | 'folders';

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

const MOBILE_SAMPLE_CONVERSATIONS = [
  { name: 'علی رضایی', preview: 'سلام، خوبی؟', time: '۱۲:۴۵', receipt: '✓✓', unread: '۳', online: true, tone: 'navy' },
  { name: 'مهدی احمدی', preview: 'فایل ارسال شد', time: '۱۱:۳۲', receipt: '♬', unread: '۵', tone: 'blue' },
  { name: 'سارا محمدی', preview: 'باشه 👍', time: '۱۰:۱۵', receipt: '✓✓', tone: 'rose' },
  { name: 'گروه دوستان', preview: 'علی: فردا میبینمتون', time: '۰۹:۴۸', receipt: '', unread: '۷', group: true },
  { name: 'رضا کاوه', preview: 'متون، حتما میفرستم', time: 'دیروز', receipt: '✓✓', tone: 'sand' },
  { name: 'نرگس کریمی', preview: 'عکس', time: 'دیروز', receipt: '✓✓', tone: 'amber', image: true },
  { name: 'کانال اخبار', preview: 'آخرین اخبار امروز منتشر شد...', time: 'جمعه', receipt: '', unread: '۱۲', channel: true },
  { name: 'علیرضا اسدی', preview: 'دمت گرم 🙏', time: 'پنجشنبه', receipt: '✓✓', tone: 'sunset' },
  { name: 'فاطمه جلالی', preview: 'تا بعد...', time: 'سه‌شنبه', receipt: '✓✓', tone: 'green' },
  { name: 'محمد شریفی', preview: 'عالیه 👍', time: 'دوشنبه', receipt: '✓✓', tone: 'slate' },
];

export default function PortalSocialPage() {
  const { profile } = useAuth();
  const { startCall: startCallFromHook } = useCall();
  const [tab, setTab] = useState<Tab>('dm');

  const [folders, setFolders] = useState<CustomerSocialFolder[]>([]);
  const [folderStaffMap, setFolderStaffMap] = useState<Record<string, Profile[]>>({});
  const [availableStaff, setAvailableStaff] = useState<Profile[]>([]);
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
  const [replyTo, setReplyTo] = useState<CustomerSocialMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const roleLabels: Record<string, string> = { owner: 'مالک', super_admin: 'سوپرادمین', admin: 'مدیر', personnel: 'پرسنل' };
  const getUserLabel = useCallback((u: Profile) => {
    if (u.userType === 'customer' && u.customerType === 'company' && u.companyName) return u.companyName;
    if (u.fullName) return u.fullName;
    return [u.firstName, u.lastName].filter(Boolean).join(' ') || (u.companyName || 'کاربر');
  }, []);
  const getInitials = useCallback((u: Profile) => {
    if (u.userType === 'customer' && u.customerType === 'company' && u.companyName) return u.companyName.slice(0, 2);
    if (u.fullName) return u.fullName.slice(0, 2);
    return ((u.firstName?.[0] || '') + (u.lastName?.[0] || '')).toUpperCase() || '؟';
  }, []);

  // Load ALL folders and ALL staff — customer sees every folder and every staff member
  const loadFoldersAndStaff = useCallback(async () => {
    if (!profile) return;
    try {
      const folderData = await fetchData<CustomerSocialFolder>('customer_social_folders');
      setFolders(folderData || []);
      if (!folderData || folderData.length === 0) { setAvailableStaff([]); setLoading(false); return; }
      const allMembers: any[] = [];
      const perFolderStaff: Record<string, Profile[]> = {};
      for (const f of folderData) {
        const members = await fetchData('customer_social_folder_members', { where: { folderId: f.id } });
        allMembers.push(...(members || []));
        const fStaffIds = Array.from(new Set((members || []).map((m: any) => m.profileId)));
        if (fStaffIds.length > 0) {
          const fStaff = await fetchData<Profile>('profiles', { where: { id: { in: fStaffIds }, active: true } });
          perFolderStaff[f.id] = fStaff || [];
        } else {
          perFolderStaff[f.id] = [];
        }
      }
      setFolderStaffMap(perFolderStaff);
      const staffIds = Array.from(new Set(allMembers.map((m: any) => m.profileId)));
      if (staffIds.length > 0) {
        const staff = await fetchData<Profile>('profiles', { where: { id: { in: staffIds }, active: true } });
        setAvailableStaff(staff || []);
      } else {
        setAvailableStaff([]);
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
      let extraStaff: Profile[] = [];
      if (otherIds.length > 0) {
        const missingIds = otherIds.filter((id) => !availableStaff.some((u) => u.id === id));
        if (missingIds.length > 0) {
          const extra = await fetchData<Profile>('profiles', { where: { id: { in: missingIds }, active: true } });
          extraStaff = extra || [];
        }
      }
      const allStaff = [...availableStaff, ...extraStaff];
      const userMap = new Map<string, DMConversation>();
      for (const msg of allMessages || []) {
        const otherId = msg.senderId === profile.id ? msg.receiverId : msg.senderId;
        const otherProfile = allStaff.find((u) => u.id === otherId);
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
  }, [profile, availableStaff]);

  // Load DM messages for a specific user
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

  useEffect(() => { loadFoldersAndStaff(); }, [loadFoldersAndStaff]);
  useEffect(() => { if (availableStaff.length >= 0) loadDMConversations(); }, [loadDMConversations]);
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
      body: JSON.stringify({ fingerprint, deviceName, appVersion: 'portal-1.0' }),
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
  const selectedUserRef = useRef<Profile | null>(null);
  useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);

  useEffect(() => {
    if (!profile) return;
    const es = new EventSource('/api/customer-social/stream');
    es.addEventListener('dm', (e) => {
      try {
        const msg: CustomerSocialMessage = JSON.parse(e.data);
        if (msg.receiverId === profile.id) {
          setDmMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
          if (selectedUserRef.current?.id === msg.senderId) {
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
  }, [profile, loadDMConversations]);

  // Customer call initiation — uses customer-call API via CallProvider
  const startCall = async (remoteUser: Profile, callType: 'audio' | 'video') => {
    await startCallFromHook(remoteUser, callType, 'customer');
  };

  const handleSend = async () => {
    if (!profile || !selectedUser || (!text.trim() && !attachment)) return;
    setSending(true);
    try {
      const payload: Record<string, any> = { receiverId: selectedUser.id, content: text.trim() || null };
      if (attachment) { payload.attachmentUrl = attachment.url; payload.attachmentName = attachment.name; payload.attachmentType = attachment.type; }
      if (replyTo) payload.replyToId = replyTo.id;
      await createData('customer_social_messages', payload);
      setText(''); setAttachment(null); setIsEmojiOpen(false); setReplyTo(null);
      loadDmMessages(selectedUser.id);
      loadDMConversations();
    } catch (e: any) { toast.error(e.message); }
    setSending(false);
  };

  const toggleVoiceRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error('ضبط صدا در این مرورگر پشتیبانی نمی‌شود');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event: BlobEvent) => { if (event.data.size > 0) recordedChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size > 10 * 1024 * 1024) { toast.error('حداکثر حجم ویس ۱۰ مگابایت است'); return; }
        const reader = new FileReader();
        reader.onload = () => setAttachment({ url: reader.result as string, name: 'پیام صوتی.webm', type: 'audio' });
        reader.readAsDataURL(blob);
      };
      recorder.start();
      setIsRecording(true);
    } catch { toast.error('اجازه دسترسی به میکروفن داده نشد'); }
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

  const filteredStaff = (selectedFolderId ? (folderStaffMap[selectedFolderId] || []) : availableStaff).filter((u) => getUserLabel(u).toLowerCase().includes(search.toLowerCase()));
  const dmConversationUsers = new Set(dmConversations.map((c) => c.profile.id));
  const recentConvoUsers = dmConversations.map((c) => c.profile);
  const otherStaff = filteredStaff.filter((u) => !dmConversationUsers.has(u.id));
  const mobileUsers = [...recentConvoUsers, ...otherStaff.filter((u) => !recentConvoUsers.some((recent) => recent.id === u.id))];

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
    return <div className="staff-chat-page staff-chat-page-full"><div className="staff-chat-loading"><span /></div></div>;
  }

  return (
    <div className={cn('social-network-page', (selectedUser || (tab === 'folders' && selectedFolderId)) && 'has-mobile-chat')}>
      {!selectedUser && tab === 'dm' && (
        <div className="mobile-social-shell">
          <div className="mobile-social-topbar">
            <button className="mobile-social-icon" onClick={() => setIsMessageSearchOpen((value) => !value)} aria-label="جستجو"><Search /></button>
            <h1>پیام‌ها</h1>
            <button className="mobile-social-icon" onClick={() => setIsUsersOpen(true)} aria-label="منو"><Menu /></button>
          </div>
          <div className="mobile-social-search"><Search /><input placeholder="جستجو در پیام‌ها و مخاطبین..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <div className="mobile-social-filters">
            <button className="is-active">همه <b>{mobileUsers.length > 0 ? mobileUsers.length.toLocaleString('fa-IR') : '۱۲'}</b></button>
            <button>خوانده نشده <b>{mobileUsers.length > 0 ? dmConversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0).toLocaleString('fa-IR') : '۸'}</b></button>
            <button onClick={() => setTab('folders')}>گروه‌ها <b>{mobileUsers.length > 0 ? '' : '۳'}</b></button>
            <button>کانال‌ها</button>
          </div>
          <div className="mobile-social-list">
            {mobileUsers.length === 0 ? (
              <div className="mobile-social-sample-list">
                {MOBILE_SAMPLE_CONVERSATIONS.map((conversation) => (
                  <div key={conversation.name} className="mobile-social-row mobile-social-sample-row">
                    <span className="mobile-social-row-time"><span>{conversation.time}</span><i className={conversation.unread ? 'has-unread' : 'is-receipt'}>{conversation.unread || conversation.receipt}</i></span>
                    <span className="mobile-social-row-copy"><strong>{conversation.name}</strong><small>{conversation.preview}{conversation.image && <span className="mobile-social-attachment-mark"><FileText /></span>}</small></span>
                    <span className="mobile-social-avatar-wrap"><span className={cn('mobile-social-avatar mobile-social-sample-avatar', conversation.tone, conversation.group && 'is-group', conversation.channel && 'is-channel')}>{conversation.group ? <Users /> : conversation.channel ? <Send /> : conversation.name.slice(0, 1)}</span>{conversation.online && <i />}</span>
                  </div>
                ))}
              </div>
            ) : mobileUsers.map((user) => {
              const conversation = dmConversations.find((item) => item.profile.id === user.id);
              const online = isOnline(user.lastSeenAt);
              return <button key={user.id} className="mobile-social-row" onClick={() => selectUser(user)}>
                <span className="mobile-social-row-time"><span>{conversation?.lastMessage ? relativeTime(conversation.lastMessage.createdAt) : ''}</span><i>{conversation?.unreadCount ? conversation.unreadCount.toLocaleString('fa-IR') : '✓✓'}</i></span>
                <span className="mobile-social-row-copy"><strong>{getUserLabel(user)}</strong><small>{conversation?.lastMessage?.content || (conversation?.lastMessage?.attachmentUrl ? 'فایل ارسال شد' : online ? 'آنلاین' : 'گفتگوی جدید')}</small></span>
                <span className="mobile-social-avatar-wrap"><span className="mobile-social-avatar">{getInitials(user)}</span>{online && <i />}</span>
              </button>;
            })}
          </div>
          <nav className="mobile-social-bottom-nav">
            <button><PhoneCall /><span>تماس‌ها</span></button><button><Users /><span>گروه‌ها</span></button><button className="is-active"><span className="mobile-social-nav-icon"><MessageCircle /><b>۱۲</b></span><span>پیام‌ها</span></button><button><User /><span>مخاطبین</span></button>
          </nav>
        </div>
      )}
      <header className="social-network-header">
        <div className="social-network-header-info">
          <span className="social-network-title-accent" />
          <div>
            <h1>شبکه اجتماعی باشگاه مشتریان</h1>
            <p>ارتباط با پرسنل و مدیران از طریق چت و تماس</p>
          </div>
        </div>
        <a href="/portal" className="social-network-close">
          <ArrowLeft className="h-4 w-4" />
          بازگشت به باشگاه
        </a>
      </header>

      <div className="social-network-tabs">
        <button className={cn('social-network-tab', tab === 'dm' && 'is-active')} onClick={() => setTab('dm')}>
          <MessageCircle style={{ width: 18, height: 18 }} />
          پیام‌های شخصی
        </button>
        <button className={cn('social-network-tab', tab === 'folders' && 'is-active')} onClick={() => setTab('folders')}>
          <FolderTree style={{ width: 18, height: 18 }} />
          پوشه‌ها
        </button>
      </div>

      {tab === 'dm' && folders.length > 0 && (
        <div className="portal-social-folders">
          <button
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
          {tab === 'dm' && selectedUser && (
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
                  <button className="social-chat-back" onClick={() => { setSelectedUser(null); setIsUsersOpen(true); }} aria-label="بازگشت"><ArrowRight /></button>
                  <button className="call-action-btn call-action-audio" onClick={() => startCall(selectedUser, 'audio')} aria-label="تماس صوتی" title="تماس صوتی"><Phone /></button>
                  <button className="call-action-btn call-action-video" onClick={() => startCall(selectedUser, 'video')} aria-label="تماس تصویری" title="تماس تصویری"><Video /></button>
                  <button className="staff-chat-icon-button" onClick={() => setIsMessageSearchOpen((v) => !v)} aria-label="جستجوی پیام"><Search /></button>
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
                  const repliedMsg = msg.replyToId ? dmMessages.find((m) => m.id === msg.replyToId) : null;
                  return <div key={msg.id} className={cn('staff-chat-message-row', isMine ? 'is-mine' : 'is-other')}>
                    <button className="staff-chat-reply-btn" onClick={() => setReplyTo(msg)} aria-label="پاسخ"><Reply style={{ width: 14, height: 14 }} /></button>
                    {!isMine && <span className="staff-chat-avatar staff-chat-message-avatar">{getInitials(selectedUser)}</span>}
                    <div className={cn('staff-chat-bubble', isMine ? 'is-mine' : 'is-other')}>
                      {repliedMsg && (
                        <div className="staff-chat-bubble-reply">
                          <div>
                            <div className="bubble-reply-name">{repliedMsg.senderId === profile?.id ? 'شما' : getUserLabel(selectedUser)}</div>
                            <div className="bubble-reply-text">{repliedMsg.content || (repliedMsg.attachmentUrl ? 'فایل' : '')}</div>
                          </div>
                        </div>
                      )}
                      {msg.content && <p>{msg.content}</p>}
                      {msg.attachmentUrl && msg.attachmentType === 'image' && <img src={msg.attachmentUrl} alt={msg.attachmentName || ''} />}
                      {msg.attachmentUrl && msg.attachmentType === 'video' && <video src={msg.attachmentUrl} controls />}
                      {msg.attachmentUrl && msg.attachmentType === 'audio' && <audio src={msg.attachmentUrl} controls preload="metadata" />}
                      {msg.attachmentUrl && msg.attachmentType === 'file' && <a href={msg.attachmentUrl} download={msg.attachmentName || ''}><FileText />{msg.attachmentName || 'دانلود فایل'}</a>}
                      {msg.attachmentType === 'call_log' && (
                        <div className="staff-chat-call-log">
                          <PhoneCall style={{ width: 16, height: 16 }} />
                          <span>{msg.content}</span>
                        </div>
                      )}
                      <span className="staff-chat-message-meta">{relativeTime(msg.createdAt)} {isMine && <CheckCheck />}</span>
                    </div>
                  </div>;
                })}
                <div ref={messagesEndRef} />
              </div>
            </>
          )}

          {tab === 'folders' && selectedFolderId && (
            <>
              <header className="staff-chat-header">
                <div className="staff-chat-person">
                  <span className="staff-chat-avatar-wrap">
                    <span className="staff-chat-avatar staff-chat-avatar-large" style={{ background: '#FEF3C7', color: '#D97706' }}>
                      <FolderTree style={{ width: 20, height: 20 }} />
                    </span>
                  </span>
                  <div>
                    <strong>{folders.find((f) => f.id === selectedFolderId)?.name || ''}</strong>
                    <span className="staff-chat-status">
                      {(folderStaffMap[selectedFolderId] || []).length} پرسنل
                    </span>
                  </div>
                </div>
                <div className="staff-chat-actions">
                  <button className="social-chat-back" onClick={() => { setSelectedFolderId(null); setIsUsersOpen(true); }} aria-label="بازگشت"><ArrowRight /></button>
                </div>
              </header>
              <div className="staff-chat-messages" ref={messagesContainerRef} style={{ overflowY: 'auto' }}>
                <div className="staff-chat-date">{folders.find((f) => f.id === selectedFolderId)?.description || 'پوشه باشگاه مشتریان'}</div>
                <div style={{ padding: '16px 20px' }}>
                  <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Users style={{ width: 16, height: 16 }} /> پرسنل و مدیران ({(folderStaffMap[selectedFolderId] || []).length})
                  </h4>
                  <div className="space-y-2">
                    {(folderStaffMap[selectedFolderId] || []).length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">پرسنلی در این پوشه نیست</p>
                    ) : (folderStaffMap[selectedFolderId] || []).map((m) => {
                      return (
                        <div key={m.id} className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-slate-50">
                          <span className="staff-chat-avatar staff-chat-message-avatar">{getInitials(m)}</span>
                          <div>
                            <div className="text-sm font-medium text-slate-900">{getUserLabel(m)}</div>
                            <div className="text-xs text-slate-400">{roleLabels[m.role] || m.role}</div>
                          </div>
                          <button className="social-member-remove mr-auto" onClick={() => { selectUser(m); setTab('dm'); }} title="پیام خصوصی" style={{ color: '#2563EB' }}>
                            <MessageCircle style={{ width: 16, height: 16 }} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {((tab === 'dm' && !selectedUser) || (tab === 'folders' && !selectedFolderId)) && (
            <div className="staff-chat-empty-panel">
              <button className="mobile-user-trigger" onClick={() => setIsUsersOpen(true)}>
                <Users /> {tab === 'dm' ? 'انتخاب کاربر' : 'انتخاب پوشه'}
              </button>
              <EmptyState icon={<MessageCircle />} title={tab === 'dm' ? 'یک کاربر را انتخاب کنید' : 'یک پوشه را انتخاب کنید'} description={tab === 'dm' ? 'از لیست پرسنل و مدیران، گفتگو را انتخاب کنید' : 'از لیست پوشه‌ها، جزئیات را مشاهده کنید'} />
            </div>
          )}

          {tab === 'dm' && selectedUser && (
            <>
              {replyTo && (
                <div className="social-chat-reply-bar">
                  <Reply className="reply-icon" style={{ width: 18, height: 18 }} />
                  <div className="reply-content">
                    <div className="reply-name">{replyTo.senderId === profile?.id ? 'شما' : getUserLabel(selectedUser)}</div>
                    <div className="reply-text">{replyTo.content || (replyTo.attachmentUrl ? 'فایل' : '')}</div>
                  </div>
                  <button className="reply-close" onClick={() => setReplyTo(null)} aria-label="بستن"><X style={{ width: 16, height: 16 }} /></button>
                </div>
              )}
              {attachment && <div className="staff-chat-attachment-preview">
                {attachment.type === 'image' ? <img src={attachment.url} alt="" /> : <span>{attachment.type === 'video' ? <Video /> : attachment.type === 'audio' ? <Mic /> : <FileText />}</span>}
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
                <button className={cn('staff-chat-tool', isRecording && 'is-recording')} onClick={toggleVoiceRecording} aria-label={isRecording ? 'توقف ضبط صدا' : 'ضبط صدا'}><Mic /></button>
                <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="پیام خود را بنویسید..." />
                <button className="staff-chat-send" onClick={handleSend} disabled={sending || (!text.trim() && !attachment)} aria-label="ارسال پیام"><Send /></button>
              </div>
            </>
          )}
        </section>

        <aside className={cn('social-network-users', isUsersOpen && 'is-open')}>
          <div className="staff-chat-users-toolbar">
            <div className="staff-chat-search"><Search /><input placeholder={tab === 'dm' ? 'جستجوی پرسنل...' : 'جستجوی پوشه...'} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          </div>
          <div className="staff-chat-users-list">
            {tab === 'dm' && (
              <>
                {availableStaff.length === 0 && dmConversations.length === 0 ? (
                  <div className="staff-chat-no-users">
                    <FolderTree className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>هنوز پوشه یا پرسنلی ایجاد نشده</p>
                  </div>
                ) : (
                  <>
                    {recentConvoUsers.length > 0 && <h3>گفتگوهای اخیر</h3>}
                    {recentConvoUsers.filter((u) => getUserLabel(u).toLowerCase().includes(search.toLowerCase())).map((u) => renderUser(u, dmConversations.find((c) => c.profile.id === u.id)))}
                    {otherStaff.length > 0 && recentConvoUsers.length > 0 && <h3>سایر پرسنل</h3>}
                    {otherStaff.map((u) => renderUser(u))}
                  </>
                )}
              </>
            )}
            {tab === 'folders' && (
              <>
                {folders.length === 0 ? <div className="staff-chat-no-users">پوشه‌ای یافت نشد</div> : <>
                  <h3>پوشه‌های باشگاه مشتریان</h3>
                  {folders.filter((f) => f.name.toLowerCase().includes(search.toLowerCase())).map((f) => {
                    const isActive = selectedFolderId === f.id;
                    const memberCount = (folderStaffMap[f.id] || []).length;
                    return (
                      <button key={f.id} onClick={() => { setSelectedFolderId(f.id); setIsUsersOpen(false); }} className={cn('staff-chat-user', isActive && 'is-active')}>
                        <span className="staff-chat-avatar-wrap">
                          <span className="staff-chat-avatar" style={{ background: '#FEF3C7', color: '#D97706' }}>
                            <FolderTree style={{ width: 18, height: 18 }} />
                          </span>
                        </span>
                        <span className="staff-chat-user-copy">
                          <span className="staff-chat-user-topline">
                            <strong>{f.name}</strong>
                          </span>
                          <span className="staff-chat-user-bottomline">
                            <small>{memberCount} پرسنل</small>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </>}
              </>
            )}
          </div>
        </aside>
        {isUsersOpen && <button className="staff-chat-overlay" onClick={() => setIsUsersOpen(false)} aria-label="بستن فهرست" />}
      </div>
    </div>
  );
}
