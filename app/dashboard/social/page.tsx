'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { fetchData, createData, updateData } from '@/lib/data-client';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { useCall } from '@/components/providers/call-provider';
import { cn } from '@/lib/utils';
import { relativeTime, formatJalali } from '@/lib/format';
import { toast } from 'sonner';
import type { SocialDMMessage, SocialGroup, SocialGroupMessage, Profile } from '@/lib/types';
import {
  MessageCircle, Send, Search, FileText, Users, CheckCheck,
  X, Info, MoreVertical, Smile, Mic, Menu, UserRound,
  PhoneCall, Image as ImageIcon, ArrowRight, XCircle,
  ChevronRight, Phone, Video, Paperclip, Trash2, ArrowLeft,
} from 'lucide-react';

const ONLINE_THRESHOLD_MS = 45 * 1000;
const EMOJIS = ['😀', '😄', '😁', '😊', '😍', '🤩', '😎', '🤔', '😅', '😂', '🥳', '😇', '🙂', '😉', '😌', '😋', '🤗', '🤝', '👍', '👏', '🙏', '💪', '🔥', '✨', '🎉', '❤️', '💯', '⭐', '✅', '🚀'];

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS;
}

type Tab = 'dms' | 'groups';

interface DMConversation {
  profile: Profile;
  lastMessage?: SocialDMMessage;
  unreadCount: number;
}

interface GroupConversation {
  group: SocialGroup;
  lastMessage?: SocialGroupMessage;
  unreadCount: number;
}

function getUserLabel(u: Profile) {
  if (u.userType === 'customer' && u.customerType === 'company' && u.companyName) return u.companyName;
  if (u.fullName) return u.fullName;
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || (u.companyName || 'کاربر');
}
function getInitials(u: Profile) {
  if (u.userType === 'customer' && u.customerType === 'company' && u.companyName) return u.companyName.slice(0, 2);
  if (u.fullName) return u.fullName.slice(0, 2);
  return ((u.firstName?.[0] || '') + (u.lastName?.[0] || '')).toUpperCase() || '؟';
}

function useSocialChat() {
  const { profile } = useAuth();
  const callCtx = useCall();
  const [users, setUsers] = useState<Profile[]>([]);
  const [dmConversations, setDmConversations] = useState<DMConversation[]>([]);
  const [dmMessages, setDmMessages] = useState<SocialDMMessage[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<SocialGroup[]>([]);
  const [groupConversations, setGroupConversations] = useState<GroupConversation[]>([]);
  const [groupMessages, setGroupMessages] = useState<SocialGroupMessage[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<SocialGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<{ url: string; name: string; type: string } | null>(null);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  const loadDMConversations = useCallback(async () => {
    if (!profile) return;
    try {
      const allMessages = await fetchData<SocialDMMessage>('social_dm_messages', { orderBy: { createdAt: 'desc' } });
      const userMap = new Map<string, DMConversation>();
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
      setDmConversations(Array.from(userMap.values()).sort((a, b) => {
        const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return bTime - aTime;
      }));
    } catch {}
  }, [profile, users]);

  const loadDMMessages = useCallback(async (otherUserId: string) => {
    if (!profile) return;
    try {
      const data = await fetchData<SocialDMMessage>('social_dm_messages', { orderBy: { createdAt: 'asc' } });
      const filtered = (data || []).filter((m) =>
        (m.senderId === profile.id && m.receiverId === otherUserId) ||
        (m.senderId === otherUserId && m.receiverId === profile.id)
      );
      setDmMessages(filtered);
      const unread = filtered.filter((m) => m.receiverId === profile.id && !m.readAt);
      for (const m of unread) await updateData('social_dm_messages', { id: m.id }, { readAt: new Date() });
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [profile]);

  const loadGroups = useCallback(async () => {
    if (!profile) return;
    try {
      const memberships = await fetchData<any>('social_group_members', { where: { profileId: profile.id } });
      const groupIds = memberships.map((m: any) => m.groupId);
      if (groupIds.length === 0) { setGroups([]); setGroupConversations([]); return; }
      const allGroups: SocialGroup[] = [];
      for (const gid of groupIds) {
        const g = await fetchData<SocialGroup>('social_groups', { where: { id: gid } });
        if (g && g[0]) allGroups.push(g[0]);
      }
      setGroups(allGroups);

      const groupMap = new Map<string, GroupConversation>();
      for (const g of allGroups) {
        const msgs = await fetchData<SocialGroupMessage>('social_group_messages', { where: { groupId: g.id }, orderBy: { createdAt: 'desc' }, take: 1 });
        const reads = await fetchData<any>('social_group_message_reads', { where: { profileId: profile.id } });
        const readMsgIds = new Set(reads.map((r: any) => r.messageId));
        const allMsgs = await fetchData<SocialGroupMessage>('social_group_messages', { where: { groupId: g.id }, orderBy: { createdAt: 'asc' } });
        const unread = (allMsgs || []).filter((m) => m.senderId !== profile.id && !readMsgIds.has(m.id));
        groupMap.set(g.id, { group: g, lastMessage: msgs?.[0], unreadCount: unread.length });
      }
      setGroupConversations(Array.from(groupMap.values()).sort((a, b) => {
        const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return bTime - aTime;
      }));
    } catch {}
  }, [profile]);

  const loadGroupMessages = useCallback(async (groupId: string) => {
    if (!profile) return;
    try {
      const data = await fetchData<SocialGroupMessage>('social_group_messages', { where: { groupId }, orderBy: { createdAt: 'asc' } });
      setGroupMessages(data || []);
      const unread = (data || []).filter((m) => m.senderId !== profile.id);
      for (const m of unread) {
        try { await createData('social_group_message_reads', { messageId: m.id, profileId: profile.id }); } catch {}
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [profile]);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { if (users.length > 0) loadDMConversations(); }, [loadDMConversations]);
  useEffect(() => { loadGroups(); }, [loadGroups]);
  useEffect(() => {
    if (selectedUser) loadDMMessages(selectedUser.id);
    if (selectedGroup) loadGroupMessages(selectedGroup.id);
  }, [selectedUser, selectedGroup, loadDMMessages, loadGroupMessages]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [dmMessages, groupMessages]);

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

  const selectedUserRef = useRef<Profile | null>(null);
  const selectedGroupRef = useRef<SocialGroup | null>(null);
  useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);
  useEffect(() => { selectedGroupRef.current = selectedGroup; }, [selectedGroup]);

  useEffect(() => {
    if (!profile) return;
    const es = new EventSource('/api/social/stream');
    es.addEventListener('dm', (e) => {
      try {
        const msg: SocialDMMessage = JSON.parse(e.data);
        if (msg.receiverId === profile.id) {
          setDmMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
          if (selectedUserRef.current?.id === msg.senderId) {
            updateData('social_dm_messages', { id: msg.id }, { readAt: new Date() }).catch(() => {});
          }
        }
        loadDMConversations();
      } catch {}
    });
    es.addEventListener('dm_read', (e) => {
      try {
        const msg: SocialDMMessage = JSON.parse(e.data);
        setDmMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, readAt: msg.readAt } : m));
      } catch {}
    });
    es.addEventListener('group', (e) => {
      try {
        const msg: SocialGroupMessage = JSON.parse(e.data);
        if (selectedGroupRef.current?.id === msg.groupId) {
          setGroupMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
          if (msg.senderId !== profile.id) {
            createData('social_group_message_reads', { messageId: msg.id, profileId: profile.id }).catch(() => {});
          }
        }
        loadGroups();
      } catch {}
    });
    es.addEventListener('error', () => {});
    return () => es.close();
  }, [profile, loadDMConversations, loadGroups]);

  const handleSend = async () => {
    if (!profile) return;
    if (selectedUser) {
      if (!text.trim() && !attachment) return;
      setSending(true);
      try {
        const payload: Record<string, any> = { receiverId: selectedUser.id, content: text.trim() || null };
        if (attachment) {
          payload.attachmentUrl = attachment.url;
          payload.attachmentName = attachment.name;
          payload.attachmentType = attachment.type;
        }
        await createData('social_dm_messages', payload);
        setText(''); setAttachment(null); setIsEmojiOpen(false);
        loadDMMessages(selectedUser.id);
        loadDMConversations();
      } catch (e: any) { toast.error(e.message); }
      setSending(false);
    } else if (selectedGroup) {
      if (!text.trim() && !attachment) return;
      setSending(true);
      try {
        const payload: Record<string, any> = { groupId: selectedGroup.id, content: text.trim() || null };
        if (attachment) {
          payload.attachmentUrl = attachment.url;
          payload.attachmentName = attachment.name;
          payload.attachmentType = attachment.type;
        }
        await createData('social_group_messages', payload);
        setText(''); setAttachment(null); setIsEmojiOpen(false);
        loadGroupMessages(selectedGroup.id);
        loadGroups();
      } catch (e: any) { toast.error(e.message); }
      setSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('حداکثر حجم فایل ۱۰ مگابایت'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'file';
      setAttachment({ url: reader.result as string, name: file.name, type });
    };
    reader.readAsDataURL(file);
  };

  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  const cancelRecording = useCallback(() => {
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
    setIsRecording(false);
    setRecordTime(0);
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      recorder.stop();
    }
    mediaRecorderRef.current = null;
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    recordedChunksRef.current = [];
  }, []);

  const toggleVoiceRecording = useCallback(async () => {
    if (isRecording) {
      if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
      setIsRecording(false);
      setRecordTime(0);
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
      mediaRecorderRef.current = null;
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error('ضبط صدا در این مرورگر پشتیبانی نمی‌شود');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((track) => track.stop());
          audioStreamRef.current = null;
        }
        const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size > 10 * 1024 * 1024) { toast.error('حداکثر حجم ویس ۱۰ مگابایت است'); return; }
        if (blob.size === 0) return;
        const reader = new FileReader();
        reader.onload = () => setAttachment({ url: reader.result as string, name: 'پیام صوتی.webm', type: 'audio' });
        reader.readAsDataURL(blob);
      };
      recorder.start();
      setIsRecording(true);
      setRecordTime(0);
      recordTimerRef.current = setInterval(() => setRecordTime((t) => t + 1), 1000);
    } catch {
      toast.error('اجازه دسترسی به میکروفن داده نشد');
    }
  }, [isRecording, setAttachment]);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const selectUser = (user: Profile) => { setSelectedUser(user); setSelectedGroup(null); };
  const selectGroup = (group: SocialGroup) => { setSelectedGroup(group); setSelectedUser(null); };
  const closeChat = () => { setSelectedUser(null); setSelectedGroup(null); };

  return {
    profile, users, dmConversations, dmMessages, selectedUser, groups,
    groupConversations, groupMessages, selectedGroup, loading,
    text, setText, sending, attachment, setAttachment, isEmojiOpen, setIsEmojiOpen,
    messagesEndRef, handleSend, handleFileSelect, selectUser, selectGroup, closeChat,
    startCall: callCtx.startCall,
    isRecording, recordTime, toggleVoiceRecording, cancelRecording,
  };
}

const SAMPLE_MESSAGES: { id: string; content: string; isMine: boolean; time: string }[] = [
  { id: 's1', content: 'سلام خوبی؟', isMine: false, time: '۱۲:۳۰' },
  { id: 's2', content: 'سلام علی، خوبی؟', isMine: true, time: '۱۲:۳۱' },
  { id: 's3', content: 'خوبم، ممنون فایل اون پروژه رو دیدی؟', isMine: false, time: '۱۲:۳۲' },
  { id: 's4', content: 'آره، دیدم خیلی خوبه 👌', isMine: true, time: '۱۲:۳۳' },
  { id: 's5', content: 'عالیه! اگه سوالی بود بپرس', isMine: false, time: '۱۲:۳۴' },
  { id: 's6', content: 'حتماً، راستی جلسه چند ساعت هست؟', isMine: true, time: '۱۲:۳۵' },
  { id: 's7', content: 'ساعت ۴ مکان هم همون همیشگیه', isMine: false, time: '۱۲:۳۶' },
  { id: 's8', content: 'باشه، حتماً', isMine: true, time: '۱۲:۳۷' },
  { id: 's9', content: 'اوکی، موفق باشی 🙏', isMine: false, time: '۱۲:۳۸' },
  { id: 's10', content: '👍', isMine: true, time: '۱۲:۳۹' },
];

function formatRecordTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function MobileChatView({ chat }: { chat: ReturnType<typeof useSocialChat> }) {
  const { profile, selectedUser, selectedGroup, dmMessages, groupMessages, text, setText,
    sending, attachment, setAttachment, isEmojiOpen, setIsEmojiOpen, messagesEndRef,
    handleSend, handleFileSelect, closeChat, users, startCall,
    isRecording, recordTime, toggleVoiceRecording, cancelRecording } = chat;

  const isDM = !!selectedUser;
  const currentLabel = selectedUser ? getUserLabel(selectedUser) : selectedGroup?.name || 'علی رضایی';
  const currentInitials = selectedUser ? getInitials(selectedUser) : 'ع';
  const currentOnline = selectedUser ? isOnline(selectedUser.lastSeenAt) : true;
  const realMessages = isDM ? dmMessages : groupMessages;

  const hasRealMessages = realMessages.length > 0;
  const displayMessages = hasRealMessages
    ? realMessages.map((msg) => {
        const isMine = isDM ? (msg as SocialDMMessage).senderId === profile?.id : (msg as SocialGroupMessage).senderId === profile?.id;
        return { id: msg.id, content: (msg as any).content || '', isMine, time: relativeTime((msg as any).createdAt), attachment: (msg as any).attachmentUrl, attachmentType: (msg as any).attachmentType, attachmentName: (msg as any).attachmentName };
      })
    : SAMPLE_MESSAGES;

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [displayMessages.length]);

  return (
    <div className="tg-chat-screen" dir="rtl">
      <header className="tg-chat-header">
        <button className="tg-back-btn" onClick={closeChat} aria-label="بازگشت">
          <ChevronRight />
          <span>بازگشت</span>
        </button>
        <div className="tg-header-center">
          <div className="tg-header-avatar">{currentInitials}</div>
          <div className="tg-header-info">
            <strong>{currentLabel}</strong>
            <span className="tg-header-status">
              {currentOnline && <i className="tg-online-dot" />}
              {currentOnline ? 'آنلاین' : 'آفلاین'}
            </span>
          </div>
        </div>
        <div className="tg-header-actions">
          <button className="tg-header-action" aria-label="تماس صوتی" onClick={() => selectedUser && startCall(selectedUser, 'audio')} disabled={!selectedUser}><Phone /></button>
          <button className="tg-header-action" aria-label="تماس تصویری" onClick={() => selectedUser && startCall(selectedUser, 'video')} disabled={!selectedUser}><Video /></button>
          <button className="tg-header-action" aria-label="منو"><MoreVertical /></button>
        </div>
      </header>

      <div className="tg-chat-messages" ref={messagesContainerRef}>
        <div className="tg-date-separator">امروز</div>
        {displayMessages.map((msg) => (
          <div key={msg.id} className={cn('tg-msg-row', msg.isMine ? 'is-mine' : 'is-other')}>
            <div className={cn('tg-bubble', msg.isMine ? 'is-mine' : 'is-other')}>
              {msg.content && <p>{msg.content}</p>}
              {msg.attachment && msg.attachmentType === 'image' && <img src={msg.attachment} alt={msg.attachmentName || ''} style={{ maxWidth: '100%', borderRadius: 8, marginTop: 4 }} />}
              {msg.attachment && msg.attachmentType === 'video' && <video src={msg.attachment} controls style={{ maxWidth: '100%', borderRadius: 8, marginTop: 4 }} />}
              {msg.attachment && msg.attachmentType === 'audio' && <audio src={msg.attachment} controls preload="metadata" style={{ width: '100%', marginTop: 4 }} />}
              {msg.attachment && msg.attachmentType === 'file' && <a href={msg.attachment} download={msg.attachmentName || ''} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><FileText /> {msg.attachmentName || 'دانلود فایل'}</a>}
              <span className="tg-msg-time">
                {msg.time}
                {msg.isMine && <CheckCheck className="tg-read-receipt" />}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {attachment && (
        <div className="tg-attachment-bar">
          {attachment.type === 'image' ? <img src={attachment.url} alt="" /> : <span>{attachment.type === 'video' ? <ImageIcon /> : attachment.type === 'audio' ? <Mic /> : <FileText />}</span>}
          <strong>{attachment.name}</strong>
          <button onClick={() => setAttachment(null)} aria-label="حذف"><X /></button>
        </div>
      )}

      {isEmojiOpen && (
        <div className="tg-emoji-picker">
          {EMOJIS.map((emoji) => (
            <button key={emoji} onClick={() => { setText((prev) => prev + emoji); setIsEmojiOpen(false); }}>{emoji}</button>
          ))}
        </div>
      )}

      <footer className="tg-composer">
        {isRecording ? (
          <div className="tg-recording-bar">
            <button className="tg-rec-cancel" onClick={cancelRecording} aria-label="لغو"><Trash2 /></button>
            <span className="tg-rec-dot" />
            <span className="tg-rec-time">{formatRecordTime(recordTime)}</span>
            <span className="tg-rec-hint">در حال ضبط...</span>
            <button className="tg-rec-send" onClick={toggleVoiceRecording} aria-label="ارسال"><Send /></button>
          </div>
        ) : (
          <>
            <label className="tg-composer-attach" aria-label="پیوست">
              <input type="file" hidden onChange={handleFileSelect} />
              <Paperclip />
            </label>
            <input
              className="tg-composer-input"
              placeholder="پیام خود را بنویسید..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            />
            <button className="tg-composer-emoji" onClick={() => setIsEmojiOpen((v) => !v)} aria-label="ایموجی"><Smile /></button>
            {text.trim() || attachment ? (
              <button className="tg-composer-send" onClick={handleSend} disabled={sending} aria-label="ارسال"><Send /></button>
            ) : (
              <button className="tg-composer-mic" onClick={toggleVoiceRecording} aria-label="ضبط صدا"><Mic /></button>
            )}
          </>
        )}
      </footer>
    </div>
  );
}

function MessagesScreen({ chat }: { chat: ReturnType<typeof useSocialChat> }) {
  const { profile, dmConversations, groupConversations, selectedUser, selectedGroup, selectUser, selectGroup, loading } = chat;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('همه');
  const [activeNav, setActiveNav] = useState('messages');
  const filters = ['همه', 'خوانده نشده', 'گروه‌ها'];

  const allItems = useMemo(() => {
    const dmItems = dmConversations.map((c) => ({
      id: c.profile.id,
      name: getUserLabel(c.profile),
      preview: c.lastMessage?.content || (c.lastMessage?.attachmentUrl ? 'فایل' : ''),
      time: c.lastMessage ? relativeTime(c.lastMessage.createdAt) : '',
      unread: c.unreadCount || undefined,
      online: isOnline(c.profile.lastSeenAt),
      receipt: c.lastMessage?.readAt ? 'read' as const : c.lastMessage ? 'old' as const : undefined,
      kind: undefined as undefined | 'group',
      onClick: () => selectUser(c.profile),
    }));
    const groupItems = groupConversations.map((gc) => ({
      id: gc.group.id,
      name: gc.group.name,
      preview: gc.lastMessage?.content || gc.group.description || 'گروه',
      time: gc.lastMessage ? relativeTime(gc.lastMessage.createdAt) : '',
      unread: gc.unreadCount || undefined,
      online: false,
      receipt: undefined as undefined | 'read' | 'old',
      kind: 'group' as const,
      onClick: () => selectGroup(gc.group),
    }));
    return [...dmItems, ...groupItems];
  }, [dmConversations, groupConversations, selectUser, selectGroup]);

  const visibleMessages = allItems.filter((message) => {
    const matchesQuery = `${message.name} ${message.preview}`.includes(query.trim());
    const matchesFilter = filter === 'همه' || (filter === 'خوانده نشده' && message.unread) || (filter === 'گروه‌ها' && message.kind === 'group');
    return matchesQuery && matchesFilter;
  });

  const totalUnread = dmConversations.reduce((s, c) => s + c.unreadCount, 0) + groupConversations.reduce((s, c) => s + c.unreadCount, 0);
  const unreadDMs = dmConversations.filter((c) => c.unreadCount > 0).length;
  const groupCount = groupConversations.length;

  if (selectedUser || selectedGroup) return <MobileChatView chat={chat} />;

  return (
    <div className="messages-screen" dir="rtl">
      <header className="messages-screen-header">
        <button className="messages-header-button" aria-label="منو"><Menu /></button>
        <h1>پیام‌ها</h1>
        <button className="messages-header-button" aria-label="جستجو" onClick={() => document.getElementById('messages-search')?.focus()}><Search /></button>
      </header>
      <main className="messages-screen-content">
        <label className="messages-search-bar" htmlFor="messages-search">
          <Search />
          <input id="messages-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جستجو در پیام‌ها و مخاطبین..." />
        </label>
        <div className="messages-filter-scroll" role="tablist" aria-label="فیلتر پیام‌ها">
          {filters.map((item) => (
            <button key={item} className={cn('messages-filter', filter === item && 'is-active')} onClick={() => setFilter(item)} role="tab" aria-selected={filter === item}>
              <span>{item}</span>
              {item === 'همه' && <b>{allItems.length.toLocaleString('fa-IR')}</b>}
              {item === 'خوانده نشده' && <b>{unreadDMs.toLocaleString('fa-IR')}</b>}
              {item === 'گروه‌ها' && <b>{groupCount.toLocaleString('fa-IR')}</b>}
            </button>
          ))}
        </div>
        <section className="messages-list" aria-label="فهرست گفتگوها">
          {loading ? (
            <div className="messages-loading"><span /></div>
          ) : visibleMessages.length === 0 ? (
            <div className="messages-empty"><MessageCircle /><p>گفتگویی وجود ندارد</p></div>
          ) : visibleMessages.map((message) => (
            <button className="message-row" key={message.id} onClick={message.onClick}>
              <span className="message-avatar-wrap">
                {message.kind === 'group'
                  ? <span className="message-avatar message-avatar-group"><Users /></span>
                  : <span className="message-avatar" style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)' }}>{getUserLabelInitials(message.name)}</span>}
                {message.online && <i className="message-online-dot" />}
              </span>
              <span className="message-copy">
                <strong>{message.name}</strong>
                <span className="message-preview">{message.preview}{message.preview === 'فایل' && <FileText />}</span>
              </span>
              <span className="message-meta">
                <time>{message.time}</time>
                {message.receipt && <CheckCheck className={cn('message-receipt', message.receipt === 'read' ? 'is-read' : 'is-old')} />}
                {message.unread && <b className="message-unread">{message.unread.toLocaleString('fa-IR')}</b>}
              </span>
            </button>
          ))}
        </section>
      </main>
      <nav className="messages-bottom-nav" aria-label="ناوبری شبکه اجتماعی">
        <button className={cn(activeNav === 'contacts' && 'is-active')} onClick={() => setActiveNav('contacts')}><UserRound /><span>مخاطبین</span></button>
        <button className={cn(activeNav === 'messages' && 'is-active')} onClick={() => setActiveNav('messages')}>
          <span className="messages-nav-icon"><MessageCircle />{totalUnread > 0 && <b>{totalUnread.toLocaleString('fa-IR')}</b>}</span>
          <span>پیام‌ها</span>
        </button>
        <button className={cn(activeNav === 'groups' && 'is-active')} onClick={() => setActiveNav('groups')}><Users /><span>گروه‌ها</span></button>
        <button className={cn(activeNav === 'calls' && 'is-active')} onClick={() => setActiveNav('calls')}><PhoneCall /><span>تماس‌ها</span></button>
      </nav>
    </div>
  );
}

function getUserLabelInitials(name: string): string {
  return name.slice(0, 2);
}

function SocialNetworkDesktop({ chat }: { chat: ReturnType<typeof useSocialChat> }) {
  const { profile, users, dmConversations, dmMessages, selectedUser, groups,
    groupConversations, groupMessages, selectedGroup, loading,
    text, setText, sending, attachment, setAttachment, isEmojiOpen, setIsEmojiOpen,
    messagesEndRef, handleSend, handleFileSelect, selectUser, selectGroup, startCall,
    isRecording, recordTime, toggleVoiceRecording, cancelRecording } = chat;

  const [tab, setTab] = useState<Tab>('dms');
  const [search, setSearch] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [isMessageSearchOpen, setIsMessageSearchOpen] = useState(false);
  const [isUsersOpen, setIsUsersOpen] = useState(false);

  const roleLabels: Record<string, string> = { owner: 'مالک', super_admin: 'سوپرادمین', admin: 'مدیر', personnel: 'پرسنل' };

  const filteredUsers = users.filter((u) => getUserLabel(u).toLowerCase().includes(search.toLowerCase()));
  const conversationUserIds = new Set(dmConversations.map((c) => c.profile.id));
  const recentDMUsers = dmConversations.map((c) => c.profile);
  const otherUsers = filteredUsers.filter((u) => !conversationUserIds.has(u.id));

  const filteredDMMessages = useMemo(() => {
    if (!messageSearch.trim()) return dmMessages;
    return dmMessages.filter((m) => m.content?.toLowerCase().includes(messageSearch.toLowerCase()));
  }, [dmMessages, messageSearch]);

  const filteredGroupMessages = useMemo(() => {
    if (!messageSearch.trim()) return groupMessages;
    return groupMessages.filter((m) => m.content?.toLowerCase().includes(messageSearch.toLowerCase()));
  }, [groupMessages, messageSearch]);

  const selectUserAndClose = (user: Profile) => { selectUser(user); setIsUsersOpen(false); };
  const selectGroupAndClose = (group: SocialGroup) => { selectGroup(group); setIsUsersOpen(false); };

  const renderDMUser = (user: Profile, conversation?: DMConversation) => {
    const isActive = selectedUser?.id === user.id;
    const online = isOnline(user.lastSeenAt);
    return (
      <button key={user.id} onClick={() => selectUserAndClose(user)} className={cn('staff-chat-user', isActive && 'is-active')}>
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

  const renderGroupItem = (gc: GroupConversation) => {
    const isActive = selectedGroup?.id === gc.group.id;
    return (
      <button key={gc.group.id} onClick={() => selectGroupAndClose(gc.group)} className={cn('staff-chat-user', isActive && 'is-active')}>
        <span className="staff-chat-avatar-wrap">
          <span className="staff-chat-avatar" style={{ background: 'linear-gradient(135deg, #2F80ED, #1B6FD0)' }}>
            <Users style={{ width: 22, height: 22 }} />
          </span>
        </span>
        <span className="staff-chat-user-copy">
          <span className="staff-chat-user-topline">
            <strong>{gc.group.name}</strong>
            {gc.lastMessage && <time>{relativeTime(gc.lastMessage.createdAt)}</time>}
          </span>
          <span className="staff-chat-user-bottomline">
            <small>{gc.lastMessage?.content || gc.group.description || 'گروه'}</small>
            {gc.unreadCount ? <b>{gc.unreadCount.toLocaleString('fa-IR')}</b> : null}
          </span>
        </span>
      </button>
    );
  };

  if (loading) {
    return <div className="staff-chat-page"><div className="staff-chat-loading"><span /></div></div>;
  }

  const currentMessages = tab === 'dms' ? filteredDMMessages : filteredGroupMessages;
  const currentSelected = tab === 'dms' ? selectedUser : selectedGroup;
  const currentLabel = tab === 'dms' && selectedUser ? getUserLabel(selectedUser) : tab === 'groups' && selectedGroup ? selectedGroup.name : '';
  const currentInitials = tab === 'dms' && selectedUser ? getInitials(selectedUser) : 'گ';
  const currentOnline = tab === 'dms' && selectedUser ? isOnline(selectedUser.lastSeenAt) : false;
  const currentStatus = tab === 'dms' && selectedUser
    ? (currentOnline ? 'آنلاین' : selectedUser.lastSeenAt ? `آخرین بازدید ${relativeTime(selectedUser.lastSeenAt)}` : roleLabels[selectedUser.role] || selectedUser.role)
    : tab === 'groups' && selectedGroup ? (selectedGroup.description || 'گروه') : '';

  return (
    <div className="social-network-page" dir="rtl">
      <header className="social-network-header">
        <div className="social-network-header-info">
          <span className="social-network-title-accent" />
          <div>
            <h1>شبکه اجتماعی</h1>
            <p>پیام‌رسانی داخلی و گروهی</p>
          </div>
        </div>
        <Link href="/dashboard" className="social-back-to-crm">
          <ArrowLeft className="h-4 w-4" />
          بازگشت به CRM
        </Link>
      </header>

      <nav className="social-network-tabs">
        <button className={cn('social-network-tab', tab === 'dms' && 'is-active')} onClick={() => setTab('dms')}>
          <MessageCircle /> پیام مستقیم
          {dmConversations.filter((c) => c.unreadCount > 0).length > 0 && (
            <b>{dmConversations.filter((c) => c.unreadCount > 0).length.toLocaleString('fa-IR')}</b>
          )}
        </button>
        <button className={cn('social-network-tab', tab === 'groups' && 'is-active')} onClick={() => setTab('groups')}>
          <Users /> گروه‌ها
          {groupConversations.filter((c) => c.unreadCount > 0).length > 0 && (
            <b>{groupConversations.filter((c) => c.unreadCount > 0).length.toLocaleString('fa-IR')}</b>
          )}
        </button>
      </nav>

      <div className="social-network-body">
        <section className="staff-chat-panel">
          {currentSelected ? (
            <>
              <header className="staff-chat-header">
                <div className="staff-chat-person">
                  <button className="social-chat-back mobile-only" onClick={() => setIsUsersOpen(true)} aria-label="نمایش لیست">
                    <ArrowRight />
                  </button>
                  <span className="staff-chat-avatar-wrap">
                    <span className="staff-chat-avatar staff-chat-avatar-large">
                      {tab === 'dms' ? currentInitials : <Users style={{ width: 24, height: 24 }} />}
                    </span>
                    {tab === 'dms' && <span className={cn('staff-chat-presence-dot', currentOnline ? 'is-online' : 'is-offline')} />}
                  </span>
                  <div>
                    <strong>{currentLabel}</strong>
                    <span className="staff-chat-status">
                      {tab === 'dms' && <i className={cn(currentOnline ? 'is-online' : 'is-offline')} />}
                      {currentStatus}
                    </span>
                  </div>
                </div>
                <div className="staff-chat-actions">
                  <button className="staff-chat-icon-button mobile-only" onClick={() => setIsUsersOpen(true)} aria-label="نمایش کاربران"><Users /></button>
                  {tab === 'dms' && selectedUser && (
                    <>
                      <button className="staff-chat-icon-button" onClick={() => startCall(selectedUser, 'audio')} aria-label="تماس صوتی"><Phone /></button>
                      <button className="staff-chat-icon-button" onClick={() => startCall(selectedUser, 'video')} aria-label="تماس تصویری"><Video /></button>
                    </>
                  )}
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

              <div className="staff-chat-messages">
                <div className="staff-chat-date">امروز - {formatJalali(new Date())}</div>
                {currentMessages.length === 0 ? (
                  messageSearch ? (
                    <div className="staff-chat-empty"><Search /><p>پیامی با این عبارت یافت نشد</p></div>
                  ) : (
                    <div className="staff-chat-empty"><MessageCircle /><p>گفتگو را شروع کنید — اولین پیام را ارسال کنید</p></div>
                  )
                ) : currentMessages.map((msg) => {
                  const isMine = tab === 'dms'
                    ? (msg as SocialDMMessage).senderId === profile?.id
                    : (msg as SocialGroupMessage).senderId === profile?.id;
                  const senderName = tab === 'groups'
                    ? (() => {
                        const sender = users.find((u) => u.id === (msg as SocialGroupMessage).senderId);
                        return sender ? getUserLabel(sender) : 'کاربر';
                      })()
                    : '';
                  return (
                    <div key={msg.id} className={cn('staff-chat-message-row', isMine ? 'is-mine' : 'is-other')}>
                      {!isMine && tab === 'dms' && <span className="staff-chat-avatar staff-chat-message-avatar">{currentInitials}</span>}
                      <div className={cn('staff-chat-bubble', isMine ? 'is-mine' : 'is-other')}>
                        {tab === 'groups' && !isMine && <span className="social-msg-sender">{senderName}</span>}
                        {(msg as any).content && <p>{(msg as any).content}</p>}
                        {(msg as any).attachmentUrl && (msg as any).attachmentType === 'image' && <img src={(msg as any).attachmentUrl} alt={(msg as any).attachmentName || ''} />}
                        {(msg as any).attachmentUrl && (msg as any).attachmentType === 'video' && <video src={(msg as any).attachmentUrl} controls />}
                        {(msg as any).attachmentUrl && (msg as any).attachmentType === 'audio' && <audio src={(msg as any).attachmentUrl} controls preload="metadata" />}
                        {(msg as any).attachmentUrl && (msg as any).attachmentType === 'file' && <a href={(msg as any).attachmentUrl} download={(msg as any).attachmentName || ''}><FileText />{(msg as any).attachmentName || 'دانلود فایل'}</a>}
                        <span className="staff-chat-message-meta">{relativeTime((msg as any).createdAt)} {isMine && <CheckCheck />}</span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {attachment && (
                <div className="staff-chat-attachment-preview">
                  {attachment.type === 'image' ? <img src={attachment.url} alt="" /> : <span>{attachment.type === 'video' ? <ImageIcon /> : attachment.type === 'audio' ? <Mic /> : <FileText />}</span>}
                  <strong>{attachment.name}</strong>
                  <button onClick={() => setAttachment(null)} aria-label="حذف فایل"><X /></button>
                </div>
              )}

              {isEmojiOpen && (
                <div className="staff-chat-emoji-picker">
                  {EMOJIS.map((emoji) => (
                    <button key={emoji} className="staff-chat-emoji" onClick={() => { setText((prev) => prev + emoji); setIsEmojiOpen(false); }}>{emoji}</button>
                  ))}
                </div>
              )}

              {isRecording && (
                <div className="staff-chat-recording-bar">
                  <button className="staff-chat-rec-cancel" onClick={cancelRecording} aria-label="لغو"><Trash2 /></button>
                  <span className="staff-chat-rec-dot" />
                  <span className="staff-chat-rec-time">{formatRecordTime(recordTime)}</span>
                  <span className="staff-chat-rec-hint">در حال ضبط...</span>
                  <button className="staff-chat-rec-send" onClick={toggleVoiceRecording} aria-label="ارسال"><Send /></button>
                </div>
              )}

              <footer className="staff-chat-composer">
                <button className="staff-chat-tool" onClick={() => setIsEmojiOpen((v) => !v)} aria-label="ایموجی"><Smile /></button>
                <label className="staff-chat-tool" aria-label="پیوست">
                  <input type="file" hidden onChange={handleFileSelect} />
                  <FileText />
                </label>
                <input
                  placeholder="پیام بنویسید..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                />
                <button className={cn('staff-chat-tool', isRecording && 'is-recording')} onClick={toggleVoiceRecording} aria-label={isRecording ? 'توقف ضبط' : 'ضبط صدا'}><Mic /></button>
                <button className="staff-chat-send" onClick={handleSend} disabled={sending || (!text.trim() && !attachment)} aria-label="ارسال">
                  <Send />
                </button>
              </footer>
            </>
          ) : (
            <div className="staff-chat-empty-panel">
              <MessageCircle />
              <p>یک گفتگو را انتخاب کنید</p>
            </div>
          )}
        </section>

        <aside className={cn('social-network-users', isUsersOpen && 'is-open')}>
          <div className="staff-chat-users-toolbar">
            <div className="staff-chat-search">
              <Search />
              <input placeholder="جستجو..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="staff-chat-users-list">
            {tab === 'dms' ? (
              <>
                {recentDMUsers.filter((u) => getUserLabel(u).toLowerCase().includes(search.toLowerCase())).map((u) => {
                  const convo = dmConversations.find((c) => c.profile.id === u.id);
                  return renderDMUser(u, convo);
                })}
                {otherUsers.length > 0 && <h3>سایر کاربران</h3>}
                {otherUsers.map((u) => renderDMUser(u))}
              </>
            ) : (
              <>
                {groupConversations.filter((gc) => gc.group.name.toLowerCase().includes(search.toLowerCase())).map((gc) => renderGroupItem(gc))}
                {groups.length === 0 && <div className="staff-chat-no-users">گروهی وجود ندارد</div>}
              </>
            )}
          </div>
        </aside>

        {isUsersOpen && <div className="staff-chat-overlay" onClick={() => setIsUsersOpen(false)} />}
      </div>
    </div>
  );
}

export default function SocialNetworkPage() {
  const { profile } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const chat = useSocialChat();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!profile) return null;
  if (isMobile) return <MessagesScreen chat={chat} />;
  return <SocialNetworkDesktop chat={chat} />;
}
