'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { EmptyState } from '@/components/dashboard/empty-state';
import { MessageCircle, Send, Search, Paperclip, Video, FileText, X, Info, MoreVertical, Filter, Plus, Smile, Mic, CheckCheck, Users, XCircle, UserPlus, UserMinus, Phone, ArrowLeft, FolderTree } from 'lucide-react';
import { relativeTime, formatJalali } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCall } from '@/components/providers/call-provider';
import type { SocialDMMessage, SocialGroup, SocialGroupMember, SocialGroupMessage, Profile, CustomerSocialFolder } from '@/lib/types';

type Tab = 'dm' | 'groups' | 'folders';

interface DMConversation {
  profile: Profile;
  lastMessage?: SocialDMMessage;
  unreadCount: number;
}

interface GroupConversation {
  group: SocialGroup;
  memberCount: number;
  lastMessage?: SocialGroupMessage;
  unreadCount: number;
}

const EMOJIS = ['😀', '😄', '😁', '😊', '😍', '🤩', '😎', '🤔', '😅', '😂', '🥳', '😇', '🙂', '😉', '😌', '😋', '🤗', '🤝', '👍', '👏', '🙏', '💪', '🔥', '✨', '🎉', '❤️', '💯', '⭐', '✅', '🚀', '🌹', '🎁'];

const ONLINE_THRESHOLD_MS = 45 * 1000;

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS;
}

export default function SocialNetworkPage() {
  const { profile } = useAuth();
  const { startCall } = useCall();
  const [tab, setTab] = useState<Tab>('dm');

  const [users, setUsers] = useState<Profile[]>([]);
  const [dmMessages, setDmMessages] = useState<SocialDMMessage[]>([]);
  const [dmConversations, setDmConversations] = useState<DMConversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  const [groups, setGroups] = useState<SocialGroup[]>([]);
  const [groupMembers, setGroupMembers] = useState<Record<string, SocialGroupMember[]>>({});
  const [groupMessages, setGroupMessages] = useState<SocialGroupMessage[]>([]);
  const [groupConversations, setGroupConversations] = useState<GroupConversation[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<SocialGroup | null>(null);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<SocialGroupMember[]>([]);
  const [showGroupMembers, setShowGroupMembers] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  const [folders, setFolders] = useState<CustomerSocialFolder[]>([]);
  const [folderMembers, setFolderMembers] = useState<Record<string, any[]>>({});
  const [folderCustomers, setFolderCustomers] = useState<Record<string, any[]>>({});
  const [selectedFolder, setSelectedFolder] = useState<CustomerSocialFolder | null>(null);

  const isSuperAdmin = profile?.role === 'super_admin';

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

  const roleLabels: Record<string, string> = { owner: 'مالک', super_admin: 'سوپرادمین', admin: 'مدیر', personnel: 'پرسنل' };

  const getUserLabel = useCallback((u: Profile) => {
    if (u.fullName) return u.fullName;
    return [u.firstName, u.lastName].filter(Boolean).join(' ') || 'کاربر';
  }, []);
  const getInitials = useCallback((u: Profile) => {
    if (u.fullName) return u.fullName.slice(0, 2);
    return ((u.firstName?.[0] || '') + (u.lastName?.[0] || '')).toUpperCase() || '؟';
  }, []);

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

  const loadDmMessages = useCallback(async (otherUserId: string) => {
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
      const myGroups = await fetchData<SocialGroup>('social_groups', { orderBy: { createdAt: 'desc' } });
      setGroups(myGroups || []);

      const memberMap: Record<string, SocialGroupMember[]> = {};
      const convoList: GroupConversation[] = [];
      for (const g of myGroups || []) {
        const members = await fetchData<SocialGroupMember>('social_group_members', { where: { groupId: g.id } });
        memberMap[g.id] = members || [];
        const msgs = await fetchData<SocialGroupMessage>('social_group_messages', { where: { groupId: g.id }, orderBy: { createdAt: 'desc' }, take: 1 });
        convoList.push({ group: g, memberCount: members?.length || 0, lastMessage: msgs?.[0], unreadCount: 0 });
      }
      setGroupMembers(memberMap);
      setGroupConversations(convoList);
    } catch {}
  }, [profile]);

  const loadGroupMessages = useCallback(async (groupId: string) => {
    if (!profile) return;
    try {
      const data = await fetchData<SocialGroupMessage>('social_group_messages', { where: { groupId }, orderBy: { createdAt: 'asc' } });
      setGroupMessages(data || []);
      const members = await fetchData<SocialGroupMember>('social_group_members', { where: { groupId } });
      setSelectedGroupMembers(members || []);
      const otherMsgs = (data || []).filter((m) => m.senderId !== profile.id);
      for (const m of otherMsgs) {
        await createData('social_group_message_reads', { messageId: m.id, profileId: profile.id }).catch(() => {});
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [profile]);

  const loadFolders = useCallback(async () => {
    try {
      const data = await fetchData<CustomerSocialFolder>('customer_social_folders', { orderBy: { createdAt: 'desc' } });
      setFolders(data || []);
      const memberMap: Record<string, any[]> = {};
      const customerMap: Record<string, any[]> = {};
      for (const f of data || []) {
        const members = await fetchData('customer_social_folder_members', { where: { folderId: f.id } });
        memberMap[f.id] = members || [];
        const customers = await fetchData('customer_social_folder_customers', { where: { folderId: f.id } });
        customerMap[f.id] = customers || [];
      }
      setFolderMembers(memberMap);
      setFolderCustomers(customerMap);
    } catch {}
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { if (users.length > 0) loadDMConversations(); }, [loadDMConversations]);
  useEffect(() => { loadGroups(); }, [loadGroups]);
  useEffect(() => { loadFolders(); }, [loadFolders]);
  useEffect(() => {
    if (tab === 'dm' && selectedUser) loadDmMessages(selectedUser.id);
    if (tab === 'groups' && selectedGroup) loadGroupMessages(selectedGroup.id);
  }, [selectedUser, selectedGroup, tab, loadDmMessages, loadGroupMessages]);
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

  useEffect(() => {
    if (!profile) return;
    const es = new EventSource('/api/social/stream');
    es.addEventListener('dm', (e) => {
      try {
        const msg: SocialDMMessage = JSON.parse(e.data);
        if (msg.receiverId === profile.id) {
          setDmMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
          if (selectedUser?.id === msg.senderId && tab === 'dm') {
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
        if (selectedGroup?.id === msg.groupId && tab === 'groups') {
          setGroupMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
          createData('social_group_message_reads', { messageId: msg.id, profileId: profile.id }).catch(() => {});
        }
        loadGroups();
      } catch {}
    });
    es.addEventListener('error', () => {});
    return () => es.close();
  }, [profile, selectedUser, selectedGroup, tab, loadDMConversations, loadGroups]);

  const handleSendDM = async () => {
    if (!profile || !selectedUser || (!text.trim() && !attachment)) return;
    setSending(true);
    try {
      const payload: Record<string, any> = { receiverId: selectedUser.id, content: text.trim() || null };
      if (attachment) { payload.attachmentUrl = attachment.url; payload.attachmentName = attachment.name; payload.attachmentType = attachment.type; }
      await createData('social_dm_messages', payload);
      setText(''); setAttachment(null); setIsEmojiOpen(false);
      loadDmMessages(selectedUser.id);
      loadDMConversations();
    } catch (e: any) { toast.error(e.message); }
    setSending(false);
  };

  const handleSendGroup = async () => {
    if (!profile || !selectedGroup || (!text.trim() && !attachment)) return;
    setSending(true);
    try {
      const payload: Record<string, any> = { groupId: selectedGroup.id, content: text.trim() || null };
      if (attachment) { payload.attachmentUrl = attachment.url; payload.attachmentName = attachment.name; payload.attachmentType = attachment.type; }
      await createData('social_group_messages', payload);
      setText(''); setAttachment(null); setIsEmojiOpen(false);
      loadGroupMessages(selectedGroup.id);
      loadGroups();
    } catch (e: any) { toast.error(e.message); }
    setSending(false);
  };

  const handleSend = tab === 'dm' ? handleSendDM : handleSendGroup;

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

  const handleCreateGroup = async () => {
    if (!profile || !newGroupName.trim()) { toast.error('نام گروه را وارد کنید'); return; }
    try {
      await createData('social_groups', { name: newGroupName.trim(), description: newGroupDesc.trim() || null });
      setNewGroupName(''); setNewGroupDesc(''); setShowCreateGroup(false);
      toast.success('گروه ایجاد شد');
      loadGroups();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAddMember = async (groupId: string, profileId: string) => {
    try {
      await createData('social_group_members', { groupId, profileId, role: 'member' });
      toast.success('عضو اضافه شد');
      loadGroups();
      if (selectedGroup?.id === groupId) loadGroupMessages(groupId);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await deleteData('social_group_members', { id: memberId });
      toast.success('عضو حذف شد');
      if (selectedGroup) loadGroupMessages(selectedGroup.id);
      loadGroups();
    } catch (e: any) { toast.error(e.message); }
  };

  const filteredUsers = users.filter((u) => getUserLabel(u).toLowerCase().includes(search.toLowerCase()));
  const dmConversationUsers = new Set(dmConversations.map((c) => c.profile.id));
  const recentConvoUsers = dmConversations.map((c) => c.profile);
  const otherUsers = filteredUsers.filter((u) => !dmConversationUsers.has(u.id));

  const filteredGroupMessages = useMemo(() => {
    if (!messageSearch.trim()) return groupMessages;
    return groupMessages.filter((m) => m.content?.toLowerCase().includes(messageSearch.toLowerCase()));
  }, [groupMessages, messageSearch]);

  const filteredDmMessages = useMemo(() => {
    if (!messageSearch.trim()) return dmMessages;
    return dmMessages.filter((m) => m.content?.toLowerCase().includes(messageSearch.toLowerCase()));
  }, [dmMessages, messageSearch]);

  const selectUser = (user: Profile) => { setSelectedUser(user); setIsUsersOpen(false); };
  const selectGroup = (group: SocialGroup) => { setSelectedGroup(group); setShowGroupMembers(false); setIsUsersOpen(false); };

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

  const renderGroup = (convo: GroupConversation) => {
    const isActive = selectedGroup?.id === convo.group.id;
    return (
      <button key={convo.group.id} onClick={() => selectGroup(convo.group)} className={cn('staff-chat-user', isActive && 'is-active')}>
        <span className="staff-chat-avatar-wrap">
          <span className="staff-chat-avatar" style={{ background: 'linear-gradient(135deg, #F59E0B, #FBBF24)', color: '#fff' }}>
            <Users style={{ width: 18, height: 18 }} />
          </span>
        </span>
        <span className="staff-chat-user-copy">
          <span className="staff-chat-user-topline">
            <strong>{convo.group.name}</strong>
            {convo.lastMessage && <time>{relativeTime(convo.lastMessage.createdAt)}</time>}
          </span>
          <span className="staff-chat-user-bottomline">
            <small>{convo.lastMessage?.content || (convo.lastMessage?.attachmentUrl ? 'فایل' : `${convo.memberCount} عضو`)}</small>
          </span>
        </span>
      </button>
    );
  };

  const getGroupMemberProfile = (profileId: string) => users.find((u) => u.id === profileId);
  const isGroupOwner = selectedGroup && profile && selectedGroup.ownerId === profile.id;

  if (loading) {
    return <div className="social-network-page"><div className="staff-chat-loading" style={{ background: '#F8F9FC' }}><span style={{ borderColor: '#2563EB #E2E8F0 #E2E8F0' }} /></div></div>;
  }

  return (
    <div className="social-network-page">
      <header className="social-network-header">
        <div className="social-network-header-info">
          <span className="social-network-title-accent" />
          <div>
            <h1>شبکه اجتماعی نوین‌بین</h1>
            <p>چت خصوصی و گروهی با کاربران سیستم</p>
          </div>
        </div>
        <Link href="/dashboard" className="social-network-close">
          <ArrowLeft className="h-4 w-4" />
          بازگشت به CRM
        </Link>
      </header>

      <div className="social-network-tabs">
        <button className={cn('social-network-tab', tab === 'dm' && 'is-active')} onClick={() => setTab('dm')}>
          <MessageCircle style={{ width: 17, height: 17 }} />
          پیام‌های شخصی
        </button>
        <button className={cn('social-network-tab', tab === 'groups' && 'is-active')} onClick={() => setTab('groups')}>
          <Users style={{ width: 17, height: 17 }} />
          گروه‌ها
        </button>
        <button className={cn('social-network-tab', tab === 'folders' && 'is-active')} onClick={() => setTab('folders')}>
          <FolderTree style={{ width: 17, height: 17 }} />
          پوشه‌ها
        </button>
      </div>

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
                  <button className="staff-chat-icon-button mobile-only" onClick={() => setIsUsersOpen(true)} aria-label="نمایش کاربران"><Users /></button>
                  <button className="call-action-btn call-action-audio" onClick={() => startCall(selectedUser, 'audio')} aria-label="تماس صوتی" title="تماس صوتی"><Phone /></button>
                  <button className="call-action-btn call-action-video" onClick={() => startCall(selectedUser, 'video')} aria-label="تماس تصویری" title="تماس تصویری"><Video /></button>
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
                {dmMessages.length === 0 ? (
                  <div className="staff-chat-empty"><MessageCircle /><p>گفتگو را شروع کنید — اولین پیام را ارسال کنید</p></div>
                ) : filteredDmMessages.length === 0 ? (
                  <div className="staff-chat-empty"><Search /><p>پیامی با این عبارت یافت نشد</p></div>
                ) : filteredDmMessages.map((msg) => {
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
            </>
          )}

          {tab === 'groups' && selectedGroup && (
            <>
              <header className="staff-chat-header">
                <div className="staff-chat-person">
                  <span className="staff-chat-avatar-wrap">
                    <span className="staff-chat-avatar staff-chat-avatar-large" style={{ background: 'linear-gradient(135deg, #F59E0B, #FBBF24)', color: '#fff' }}>
                      <Users style={{ width: 20, height: 20 }} />
                    </span>
                  </span>
                  <div>
                    <strong>{selectedGroup.name}</strong>
                    <span className="staff-chat-status">
                      {selectedGroupMembers.length} عضو
                      {isGroupOwner && <span style={{ marginRight: 6, color: '#F59E0B' }}>• مدیر گروه</span>}
                    </span>
                  </div>
                </div>
                <div className="staff-chat-actions">
                  <button className="staff-chat-icon-button mobile-only" onClick={() => setIsUsersOpen(true)} aria-label="نمایش گروه‌ها"><Users /></button>
                  <button className="staff-chat-icon-button" onClick={() => setIsMessageSearchOpen((v) => !v)} aria-label="جستجوی پیام"><Search /></button>
                  <button className="staff-chat-icon-button" onClick={() => setShowGroupMembers((v) => !v)} aria-label="اعضای گروه"><Users /></button>
                  {isGroupOwner && <button className="staff-chat-icon-button" onClick={() => setShowAddMember(true)} aria-label="افزودن عضو"><UserPlus /></button>}
                </div>
              </header>

              {showGroupMembers && (
                <div className="social-members-panel">
                  <div className="social-members-header">
                    <h3>اعضای گروه ({selectedGroupMembers.length})</h3>
                    <button onClick={() => setShowGroupMembers(false)}><X style={{ width: 16, height: 16 }} /></button>
                  </div>
                  <div className="social-members-list">
                    {selectedGroupMembers.map((m) => {
                      const mp = getGroupMemberProfile(m.profileId);
                      const isOwner = selectedGroup.ownerId === m.profileId;
                      return (
                        <div key={m.id} className="social-member-item">
                          <span className="staff-chat-avatar-wrap">
                            <span className="staff-chat-avatar staff-chat-message-avatar">{mp ? getInitials(mp) : '؟'}</span>
                            {mp && <span className={cn('staff-chat-presence-dot', isOnline(mp.lastSeenAt) ? 'is-online' : 'is-offline')} />}
                          </span>
                          <div className="social-member-info">
                            <strong>{mp ? getUserLabel(mp) : 'کاربر حذف شده'}</strong>
                            <small>{isOwner ? 'مدیر گروه' : m.role === 'admin' ? 'ادمین' : 'عضو'}</small>
                          </div>
                          {isGroupOwner && !isOwner && (
                            <button className="social-member-remove" onClick={() => handleRemoveMember(m.id)} aria-label="حذف عضو"><UserMinus style={{ width: 16, height: 16 }} /></button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isMessageSearchOpen && (
                <div className="staff-chat-message-search">
                  <Search />
                  <input autoFocus placeholder="جستجو در پیام‌ها..." value={messageSearch} onChange={(e) => setMessageSearch(e.target.value)} />
                  <button onClick={() => { setIsMessageSearchOpen(false); setMessageSearch(''); }} aria-label="بستن جستجو"><XCircle /></button>
                </div>
              )}

              <div className="staff-chat-messages" ref={messagesContainerRef}>
                <div className="staff-chat-date">امروز - {formatJalali(new Date())}</div>
                {groupMessages.length === 0 ? (
                  <div className="staff-chat-empty"><MessageCircle /><p>گفتگو را شروع کنید — اولین پیام را ارسال کنید</p></div>
                ) : filteredGroupMessages.length === 0 ? (
                  <div className="staff-chat-empty"><Search /><p>پیامی با این عبارت یافت نشد</p></div>
                ) : filteredGroupMessages.map((msg) => {
                  const isMine = msg.senderId === profile?.id;
                  const senderProfile = getGroupMemberProfile(msg.senderId);
                  return <div key={msg.id} className={cn('staff-chat-message-row', isMine ? 'is-mine' : 'is-other')}>
                    {!isMine && <span className="staff-chat-avatar staff-chat-message-avatar">{senderProfile ? getInitials(senderProfile) : '؟'}</span>}
                    <div className={cn('staff-chat-bubble', isMine ? 'is-mine' : 'is-other')}>
                      {!isMine && senderProfile && <div className="social-msg-sender">{getUserLabel(senderProfile)}</div>}
                      {msg.content && <p>{msg.content}</p>}
                      {msg.attachmentUrl && msg.attachmentType === 'image' && <img src={msg.attachmentUrl} alt={msg.attachmentName || ''} />}
                      {msg.attachmentUrl && msg.attachmentType === 'video' && <video src={msg.attachmentUrl} controls />}
                      {msg.attachmentUrl && msg.attachmentType === 'file' && <a href={msg.attachmentUrl} download={msg.attachmentName || ''}><FileText />{msg.attachmentName || 'دانلود فایل'}</a>}
                      <span className="staff-chat-message-meta">{relativeTime(msg.createdAt)}</span>
                    </div>
                  </div>;
                })}
                <div ref={messagesEndRef} />
              </div>
            </>
          )}

          {tab === 'folders' && selectedFolder && (
            <>
              <header className="staff-chat-header">
                <div className="staff-chat-person">
                  <span className="staff-chat-avatar-wrap">
                    <span className="staff-chat-avatar staff-chat-avatar-large" style={{ background: 'linear-gradient(135deg, #F59E0B, #FBBF24)', color: '#fff' }}>
                      <FolderTree style={{ width: 20, height: 20 }} />
                    </span>
                  </span>
                  <div>
                    <strong>{selectedFolder.name}</strong>
                    <span className="staff-chat-status">
                      {(folderMembers[selectedFolder.id] || []).length} پرسنل · {(folderCustomers[selectedFolder.id] || []).length} مشتری
                    </span>
                  </div>
                </div>
                <div className="staff-chat-actions">
                  <button className="staff-chat-icon-button mobile-only" onClick={() => setIsUsersOpen(true)} aria-label="نمایش پوشه‌ها"><FolderTree /></button>
                  <a href="/super-admin/customer-folders" className="staff-chat-icon-button" aria-label="مدیریت پوشه" title="مدیریت پوشه‌ها"><Info /></a>
                </div>
              </header>
              <div className="staff-chat-messages" ref={messagesContainerRef} style={{ overflowY: 'auto' }}>
                <div className="staff-chat-date">{selectedFolder.description || 'پوشه باشگاه مشتریان'}</div>
                <div style={{ padding: '16px 20px' }}>
                  <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Users style={{ width: 16, height: 16 }} /> پرسنل و مدیران ({(folderMembers[selectedFolder.id] || []).length})
                  </h4>
                  <div className="space-y-2">
                    {(folderMembers[selectedFolder.id] || []).length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">پرسنلی در این پوشه نیست</p>
                    ) : (folderMembers[selectedFolder.id] || []).map((m) => {
                      const mp = users.find((u) => u.id === m.profileId);
                      return (
                        <div key={m.id} className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-white border-slate-200">
                          <span className="staff-chat-avatar staff-chat-message-avatar">{mp ? getInitials(mp) : '؟'}</span>
                          <div>
                            <div className="text-sm font-medium text-slate-900">{mp ? getUserLabel(mp) : 'کاربر حذف شده'}</div>
                            <div className="text-xs text-slate-400">{mp ? roleLabels[mp.role] || mp.role : ''}</div>
                          </div>
                          <button className="social-member-remove mr-auto" onClick={() => selectUser(mp!)} disabled={!mp} title="پیام خصوصی" style={{ color: '#2563EB' }}>
                            <MessageCircle style={{ width: 16, height: 16 }} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ padding: '0 20px 16px' }}>
                  <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Users style={{ width: 16, height: 16 }} /> مشتریان ({(folderCustomers[selectedFolder.id] || []).length})
                  </h4>
                  <div className="space-y-2">
                    {(folderCustomers[selectedFolder.id] || []).length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">مشتری‌ای در این پوشه نیست</p>
                    ) : (folderCustomers[selectedFolder.id] || []).map((c) => {
                      const cp = users.find((u) => u.id === c.customerId);
                      return (
                        <div key={c.id} className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-white border-slate-200">
                          <span className="staff-chat-avatar staff-chat-message-avatar" style={{ background: 'linear-gradient(135deg, #22C55E, #4ADE80)', color: '#fff' }}>{cp ? getInitials(cp) : '؟'}</span>
                          <div>
                            <div className="text-sm font-medium text-slate-900">{cp ? getUserLabel(cp) : 'مشتری حذف شده'}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {((tab === 'dm' && !selectedUser) || (tab === 'groups' && !selectedGroup) || (tab === 'folders' && !selectedFolder)) && (
            <div className="staff-chat-empty-panel">
              <button className="mobile-user-trigger" onClick={() => setIsUsersOpen(true)}>
                <Users /> {tab === 'dm' ? 'انتخاب کاربر' : tab === 'groups' ? 'انتخاب گروه' : 'انتخاب پوشه'}
              </button>
              <EmptyState icon={<MessageCircle />} title={tab === 'dm' ? 'یک کاربر را انتخاب کنید' : tab === 'groups' ? 'یک گروه را انتخاب کنید' : 'یک پوشه را انتخاب کنید'} description={tab === 'dm' ? 'از لیست کاربران، گفتگو را انتخاب کنید' : tab === 'groups' ? 'از لیست گروه‌ها، گفتگو را انتخاب کنید' : 'از لیست پوشه‌ها، جزئیات را مشاهده کنید'} />
            </div>
          )}

          {((selectedUser || selectedGroup) || (tab === 'folders' && selectedFolder && false)) && (
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
                <label className="staff-chat-tool" aria-label="افزودن فایل"><input type="file" accept="image/*,video/*" onChange={handleFileSelect} style={{ display: 'none' }} /><Paperclip /></label>
                <button className="staff-chat-tool" aria-label="ضبط صدا"><Mic /></button>
                <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="پیام خود را بنویسید..." />
                <button className="staff-chat-send" onClick={handleSend} disabled={sending || (!text.trim() && !attachment)} aria-label="ارسال پیام"><Send /></button>
              </div>
            </>
          )}
        </section>

        <aside className={cn('social-network-users', isUsersOpen && 'is-open')}>
          <div className="staff-chat-users-toolbar">
            <div className="staff-chat-search"><Search /><input placeholder={tab === 'dm' ? 'جستجوی کاربر...' : 'جستجوی گروه...'} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <button className="staff-chat-toolbar-button" aria-label="فیلتر"><Filter /></button>
            {tab === 'dm' ? (
              <button className="staff-chat-add-button" aria-label="گفتگو جدید"><Plus /></button>
            ) : tab === 'groups' ? (
              isSuperAdmin ? (
                <button className="staff-chat-add-button" onClick={() => setShowCreateGroup(true)} aria-label="گروه جدید"><Plus /></button>
              ) : null
            ) : (
              isSuperAdmin ? (
                <a href="/super-admin/customer-folders" className="staff-chat-add-button" aria-label="پوشه جدید"><Plus /></a>
              ) : null
            )}
          </div>
          <div className="staff-chat-users-list">
            {tab === 'dm' && (
              <>
                {dmConversations.length === 0 && otherUsers.length === 0 ? <div className="staff-chat-no-users">کاربری یافت نشد</div> : <>
                  {recentConvoUsers.length > 0 && <h3>گفتگوهای اخیر</h3>}
                  {recentConvoUsers.filter((u) => getUserLabel(u).toLowerCase().includes(search.toLowerCase())).map((u) => renderUser(u, dmConversations.find((c) => c.profile.id === u.id)))}
                  {otherUsers.length > 0 && recentConvoUsers.length > 0 && <h3>سایر کاربران</h3>}
                  {otherUsers.map((u) => renderUser(u))}
                </>}
              </>
            )}
            {tab === 'groups' && (
              <>
                {groupConversations.length === 0 ? <div className="staff-chat-no-users">گروهی یافت نشد</div> : <>
                  <h3>گروه‌های من</h3>
                  {groupConversations.filter((c) => c.group.name.toLowerCase().includes(search.toLowerCase())).map((c) => renderGroup(c))}
                </>}
              </>
            )}
            {tab === 'folders' && (
              <>
                {folders.length === 0 ? <div className="staff-chat-no-users">پوشه‌ای یافت نشد</div> : <>
                  <h3>پوشه‌های باشگاه مشتریان</h3>
                  {folders.filter((f) => f.name.toLowerCase().includes(search.toLowerCase())).map((f) => {
                    const isActive = selectedFolder?.id === f.id;
                    const memberCount = (folderMembers[f.id] || []).length;
                    const customerCount = (folderCustomers[f.id] || []).length;
                    return (
                      <button key={f.id} onClick={() => { setSelectedFolder(f); setShowGroupMembers(false); setIsUsersOpen(false); }} className={cn('staff-chat-user', isActive && 'is-active')}>
                        <span className="staff-chat-avatar-wrap">
                          <span className="staff-chat-avatar" style={{ background: 'linear-gradient(135deg, #F59E0B, #FBBF24)', color: '#fff' }}>
                            <FolderTree style={{ width: 18, height: 18 }} />
                          </span>
                        </span>
                        <span className="staff-chat-user-copy">
                          <span className="staff-chat-user-topline"><strong>{f.name}</strong></span>
                          <span className="staff-chat-user-bottomline"><small>{memberCount} پرسنل · {customerCount} مشتری</small></span>
                        </span>
                      </button>
                    );
                  })}
                </>}
              </>
            )}
          </div>
          {tab === 'dm' && <button className="staff-chat-all-users"><Users /> مشاهده همه کاربران</button>}
          {tab === 'groups' && isSuperAdmin && <button className="staff-chat-all-users" onClick={() => setShowCreateGroup(true)}><Plus /> ساخت گروه جدید</button>}
          {tab === 'folders' && isSuperAdmin && <a href="/super-admin/customer-folders" className="staff-chat-all-users"><Plus /> مدیریت پوشه‌ها</a>}
        </aside>
        {isUsersOpen && <button className="staff-chat-overlay" onClick={() => setIsUsersOpen(false)} aria-label="بستن فهرست" />}
      </div>

      {showCreateGroup && (
        <div className="social-modal-overlay" onClick={() => setShowCreateGroup(false)}>
          <div className="social-modal" onClick={(e) => e.stopPropagation()}>
            <div className="social-modal-header">
              <h2>ساخت گروه جدید</h2>
              <button onClick={() => setShowCreateGroup(false)}><X style={{ width: 20, height: 20 }} /></button>
            </div>
            <div className="social-modal-body">
              <div className="social-form-group">
                <label>نام گروه *</label>
                <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="نام گروه را وارد کنید..." />
              </div>
              <div className="social-form-group">
                <label>توضیحات</label>
                <textarea value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} placeholder="توضیحات گروه (اختیاری)..." rows={3} />
              </div>
            </div>
            <div className="social-modal-footer">
              <button className="social-btn-cancel" onClick={() => setShowCreateGroup(false)}>انصراف</button>
              <button className="social-btn-primary" onClick={handleCreateGroup}>ساخت گروه</button>
            </div>
          </div>
        </div>
      )}

      {showAddMember && selectedGroup && (
        <div className="social-modal-overlay" onClick={() => setShowAddMember(false)}>
          <div className="social-modal" onClick={(e) => e.stopPropagation()}>
            <div className="social-modal-header">
              <h2>افزودن عضو به گروه</h2>
              <button onClick={() => setShowAddMember(false)}><X style={{ width: 20, height: 20 }} /></button>
            </div>
            <div className="social-modal-body">
              <div className="social-add-member-list">
                {users.filter((u) => !selectedGroupMembers.find((m) => m.profileId === u.id)).map((u) => (
                  <div key={u.id} className="social-add-member-item">
                    <span className="staff-chat-avatar-wrap">
                      <span className="staff-chat-avatar staff-chat-message-avatar">{getInitials(u)}</span>
                      <span className={cn('staff-chat-presence-dot', isOnline(u.lastSeenAt) ? 'is-online' : 'is-offline')} />
                    </span>
                    <div className="social-member-info">
                      <strong>{getUserLabel(u)}</strong>
                      <small>{roleLabels[u.role] || u.role}</small>
                    </div>
                    <button className="social-btn-add" onClick={() => handleAddMember(selectedGroup.id, u.id)}>
                      <UserPlus style={{ width: 16, height: 16 }} />
                      افزودن
                    </button>
                  </div>
                ))}
                {users.filter((u) => !selectedGroupMembers.find((m) => m.profileId === u.id)).length === 0 && (
                  <div className="staff-chat-no-users">تمام کاربران در این گروه هستند</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
