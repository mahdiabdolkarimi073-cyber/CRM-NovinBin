'use client';

import { useState } from 'react';
import { MessageCircle, Send, Search, FileText, Users, CheckCheck, Menu, UserRound, PhoneCall, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers/auth-provider';

interface MessagePreview {
  id: string;
  name: string;
  preview: string;
  time: string;
  unread?: number;
  avatar?: string;
  kind?: 'group' | 'channel';
  online?: boolean;
  muted?: boolean;
  receipt?: 'read' | 'old';
}

const messagePreviews: MessagePreview[] = [
  { id: 'ali', name: 'علی رضایی', preview: 'سلام، خوبی؟', time: '۱۲:۴۵', unread: 3, avatar: '/images/ChatGPT_Image_Aug_15,_2026,_12_00_00_PM.png', online: true, receipt: 'read' },
  { id: 'mehdi', name: 'مهدی احمدی', preview: 'فایل ارسال شد', time: '۱۱:۳۲', unread: 5, avatar: '/images/ChatGPT_Image_Aug_21,_2026,_03_02_45_PM.png', muted: true, receipt: 'old' },
  { id: 'sara', name: 'سارا محمدی', preview: 'باشه 👍', time: '۱۰:۱۵', avatar: '/images/ChatGPT_Image_Aug_30,_2026,_02_32_56_PM.png', receipt: 'read' },
  { id: 'friends', name: 'گروه دوستان', preview: 'علی: فردا میبینمتون', time: '۰۹:۴۸', unread: 7, kind: 'group' },
  { id: 'reza', name: 'رضا کاوه', preview: 'متون، حتما میفرستم', time: 'دیروز', avatar: '/images/ChatGPT_Image_Aug_30,_2026,_02_39_21_PM.png', receipt: 'old' },
  { id: 'narges', name: 'نرگس کریمی', preview: 'عکس', time: 'دیروز', avatar: '/images/ChatGPT_Image_Aug_30,_2026,_02_50_26_PM.png', receipt: 'old' },
  { id: 'news', name: 'کانال اخبار', preview: 'آخرین اخبار امروز منتشر شد...', time: 'جمعه', unread: 12, kind: 'channel' },
  { id: 'alireza', name: 'علیرضا اسدی', preview: 'دمت گرم 🙏', time: 'پنجشنبه', avatar: '/images/ChatGPT_Image_Sep_13,_2026,_12_18_29_PM.png', receipt: 'old' },
  { id: 'fatemeh', name: 'فاطمه جلالی', preview: 'تا بعد...', time: 'سه‌شنبه', avatar: '/images/ChatGPT_Image_Sep_16,_2026,_03_10_52_PM.png', receipt: 'old' },
  { id: 'mohammad', name: 'محمد شریفی', preview: 'عالیه 👍', time: 'دوشنبه', avatar: '/images/ChatGPT_Image_Aug_30,_2026,_02_50_26_PM copy.png', receipt: 'old' },
];

function BellOffIcon() {
  return <span className="bell-off-icon">⌁</span>;
}

function MessagesScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('همه');
  const filters = ['همه', 'خوانده نشده', 'گروه‌ها', 'کانال‌ها'];
  const visibleMessages = messagePreviews.filter((message) => {
    const matchesQuery = `${message.name} ${message.preview}`.includes(query.trim());
    const matchesFilter = filter === 'همه' || (filter === 'خوانده نشده' && message.unread) || (filter === 'گروه‌ها' && message.kind === 'group') || (filter === 'کانال‌ها' && message.kind === 'channel');
    return matchesQuery && matchesFilter;
  });

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
              {item === 'همه' && <b>۱۲</b>}
              {item === 'خوانده نشده' && <b>۸</b>}
              {item === 'گروه‌ها' && <b>۳</b>}
            </button>
          ))}
        </div>

        <section className="messages-list" aria-label="فهرست گفتگوها">
          {visibleMessages.map((message) => (
            <button className="message-row" key={message.id}>
              <span className="message-avatar-wrap">
                {message.kind === 'group' ? <span className="message-avatar message-avatar-group"><Users /></span> : message.kind === 'channel' ? <span className="message-avatar message-avatar-channel"><Send /></span> : <span className="message-avatar" style={{ backgroundImage: `url("${message.avatar}")` }} />}
                {message.online && <i className="message-online-dot" />}
              </span>
              <span className="message-copy">
                <strong>{message.name}</strong>
                <span className="message-preview">{message.preview}{message.preview === 'فایل ارسال شد' && <FileText />}{message.preview === 'عکس' && <ImageIcon />}</span>
              </span>
              <span className="message-meta">
                <time>{message.time}</time>
                {message.muted ? <span className="message-muted"><BellOffIcon /></span> : message.receipt && <CheckCheck className={cn('message-receipt', message.receipt === 'read' ? 'is-read' : 'is-old')} />}
                {message.unread && <b className="message-unread">{message.unread.toLocaleString('fa-IR')}</b>}
              </span>
            </button>
          ))}
        </section>
      </main>

      <nav className="messages-bottom-nav" aria-label="ناوبری شبکه اجتماعی">
        <button><UserRound /><span>مخاطبین</span></button>
        <button className="is-active"><span className="messages-nav-icon"><MessageCircle /><b>۱۲</b></span><span>پیام‌ها</span></button>
        <button><Users /><span>گروه‌ها</span></button>
        <button><PhoneCall /><span>تماس‌ها</span></button>
      </nav>
    </div>
  );
}

export default function SocialNetworkPage() {
  useAuth();
  return <MessagesScreen />;
}
