'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  Users, Loader2, LogOut, Bell, Menu, LifeBuoy, Settings, ClipboardList, Wallet,
  CalendarDays, BookOpen, Key, Plus, Trash2, Copy, Check, Code, Eye, EyeOff,
} from 'lucide-react';

type ApiKey = {
  id: string;
  label: string;
  apiKey: string;
  active: boolean;
  createdAt: string;
  lastUsedAt: string | null;
};

const navItems = [
  { label: 'داشبورد', icon: BookOpen, href: '/academy/admin-dashboard' },
  { label: 'مدیریت هنرجویان', icon: Users, href: '/academy/admin-students' },
  { label: 'مدرس‌ها', icon: Users, href: '/academy/teachers' },
  { label: 'آموزش', icon: ClipboardList, href: '/academy/education' },
  { label: 'مالی', icon: Wallet, href: '/academy/finance-management' },
  { label: 'ثبت‌نام‌ها', icon: ClipboardList, href: '/academy/admin-registration' },
  { label: 'کلاس‌ها', icon: CalendarDays, href: '/academy/admin-classes' },
  { label: 'API آموزشگاه', icon: Key, href: '/academy/admin-api', active: true },
  { label: 'تنظیمات', icon: Settings, href: '/academy/admin-settings' },
];

function formatJalali(date: string | null) {
  if (!date) return '—';
  try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date)); }
  catch { return new Date(date).toLocaleString('fa-IR'); }
}

export default function AdminApiPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [error, setError] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visibleKey, setVisibleKey] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/academy/api-keys', { headers: { 'Cache-Control': 'no-store' } });
      if (res.status === 403) { router.replace('/academy/login'); return; }
      const data = await res.json();
      setKeys(data.keys || []);
    } catch {
      setError('خطا در بارگذاری کلیدها');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  async function logout() {
    await fetch('/api/academy/logout', { method: 'POST' });
    router.replace('/academy/login');
  }

  async function createKey() {
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/academy/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel || 'افزونه' }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'خطا در ساخت کلید');
        return;
      }
      const newKey = await res.json();
      setKeys((prev) => [newKey, ...prev]);
      setNewLabel('');
      setVisibleKey(newKey.id);
    } finally {
      setCreating(false);
    }
  }

  async function deleteKey(id: string) {
    if (!confirm('آیا از حذف این کلید مطمئن هستید؟ هر افزونه‌ای که از این کلید استفاده می‌کند دیگر به دوره‌ها دسترسی نخواهد داشت.')) return;
    try {
      const res = await fetch(`/api/academy/api-keys?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'خطا در حذف کلید');
        return;
      }
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch {
      setError('خطا در حذف کلید');
    }
  }

  function copyKey(id: string, apiKey: string) {
    navigator.clipboard.writeText(apiKey).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  if (loading) return <div className="academy-admin-loading"><Loader2 className="animate-spin" /></div>;

  const apiBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const coursesEndpoint = '/api/academy/public/courses';

  return (
    <div className="academy-admin-layout" dir="rtl">
      <div className="academy-admin-overlay" onClick={() => document.querySelector('.academy-admin-sidebar')?.classList.remove('open')} />
      <aside className="academy-admin-sidebar">
        <div className="academy-admin-sidebar-inner">
          <div className="academy-admin-sidebar-brand">
            <img src="/images/cropped-algorithm-logo-design-12.png" alt="لوگو دنیای الگوریتم" className="academy-admin-sidebar-brand-logo" />
            <div><strong>دنیای الگوریتم</strong><small>درکی عمیق از دنیای دیجیتال</small></div>
          </div>
          <nav className="academy-admin-sidebar-nav">
            {navItems.map((item) => (
              <button key={item.label} type="button" className={item.active ? 'active' : ''} onClick={() => router.push(item.href)}>
                <item.icon /> <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="academy-admin-sidebar-support">
            <strong>نیاز به کمک دارید؟</strong><p>با پشتیبانی در ارتباط باشید</p>
            <button type="button"><LifeBuoy /> تماس با پشتیبانی</button>
          </div>
        </div>
      </aside>

      <div className="academy-admin-main">
        <header className="academy-admin-header">
          <div className="academy-admin-header-right">
            <button type="button" className="academy-admin-burger" onClick={() => document.querySelector('.academy-admin-sidebar')?.classList.add('open')} aria-label="منو"><Menu /></button>
            <div className="academy-admin-date-box">{formatJalali(new Date().toISOString())}</div>
          </div>
          <div className="academy-admin-header-left">
            <button type="button" aria-label="اعلان‌ها"><Bell /></button>
            <div className="academy-admin-header-profile">
              <div className="academy-admin-header-avatar">م</div>
              <div><strong>مدیر آموزشگاه</strong><small>API مدیریت</small></div>
              <button type="button" onClick={logout} aria-label="خروج"><LogOut /></button>
            </div>
          </div>
        </header>

        <div className="academy-admin-scroll">
          <div className="academy-admin-page-hero">
            <div><h2><Key /> API آموزشگاه</h2><p>کلید API بسازید تا هر افزونه یا وب‌سایت بتواند دوره‌ها، عکس‌ها، قیمت‌ها و لینک‌های آموزشگاه شما را دریافت کند</p></div>
          </div>

          {error && <div className="academy-admin-modal-error" style={{ marginBottom: 16 }}>{error}</div>}

          {/* ساخت کلید جدید */}
          <div className="academy-admin-sec">
            <div className="academy-admin-sec-header">
              <h3><Plus /> ساخت کلید API جدید</h3>
            </div>
            <div className="academy-admin-form-grid" style={{ gridTemplateColumns: '1fr auto', alignItems: 'end' }}>
              <div className="academy-admin-field">
                <label>نام کلید (مثلاً: وب‌سایت، اپلیکیشن، افزونه فروش)</label>
                <input
                  type="text"
                  placeholder="نام افزونه‌ای که می‌خواهید وصل شود..."
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') createKey(); }}
                />
              </div>
              <button type="button" className="academy-admin-btn-primary" onClick={createKey} disabled={creating}>
                {creating ? <Loader2 className="animate-spin" /> : <Plus />} ساخت کلید
              </button>
            </div>
          </div>

          {/* لیست کلیدها */}
          <div className="academy-admin-sec">
            <div className="academy-admin-sec-header">
              <h3><Key /> کلیدهای API شما ({keys.length.toLocaleString('fa-IR')})</h3>
            </div>

            {keys.length === 0 ? (
              <div className="academy-admin-list-empty">
                <Key />
                <p>هنوز کلید API نساخته‌اید. یک کلید بسازید تا افزونه‌ها بتوانند دوره‌های شما را دریافت کنند.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {keys.map((k) => (
                  <div key={k.id} style={{ border: '1px solid #E2E8F0', borderRadius: 12, padding: 16, background: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: '#1E293B' }}>{k.label}</span>
                        <span style={{
                          padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: k.active ? '#10B9811A' : '#EF44441A', color: k.active ? '#059669' : '#DC2626',
                        }}>
                          {k.active ? 'فعال' : 'غیرفعال'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteKey(k.id)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: '1px solid #EF4444', background: '#EF44441A', color: '#DC2626', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                      >
                        <Trash2 size={16} /> حذف
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F1F5F9', borderRadius: 8, padding: '8px 12px', fontFamily: 'monospace', fontSize: 13, direction: 'ltr' }}>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#475569' }}>
                        {visibleKey === k.id ? k.apiKey : 'nva_••••••••••••••••••••••••••••••••••••••••••••'}
                      </span>
                      <button type="button" onClick={() => setVisibleKey(visibleKey === k.id ? null : k.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4 }} title={visibleKey === k.id ? 'پنهان کردن' : 'نمایش'}>
                        {visibleKey === k.id ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button type="button" onClick={() => copyKey(k.id, k.apiKey)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedId === k.id ? '#059669' : '#64748B', padding: 4 }} title="کپی">
                        {copiedId === k.id ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: '#94A3B8', flexWrap: 'wrap' }}>
                      <span>ساخته شده: {formatJalali(k.createdAt)}</span>
                      <span>آخرین استفاده: {k.lastUsedAt ? formatJalali(k.lastUsedAt) : 'هنوز استفاده نشده'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* راهنمای استفاده */}
          <div className="academy-admin-sec">
            <div className="academy-admin-sec-header">
              <h3><Code /> راهنمای اتصال افزونه‌ها</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.7 }}>
                با استفاده از کلید API که ساخته‌اید، هر افزونه یا وب‌سایتی می‌تواند لیست دوره‌های فعال آموزشگاه شما را همراه با عکس، قیمت، توضیحات و لینک دریافت کند. برای این کار کافی است درخواست زیر ارسال شود:
              </p>

              <div style={{ background: '#0F172A', borderRadius: 12, padding: 16, overflow: 'auto' }} dir="ltr">
                <pre style={{ margin: 0, color: '#94A3B8', fontSize: 13, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
{`GET ${apiBaseUrl}${coursesEndpoint}
Authorization: Bearer YOUR_API_KEY`}
                </pre>
              </div>

              <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.7 }}>
                کلید API را جایگزین <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' }}>YOUR_API_KEY</code> کنید. پاسخ دریافتی به فرمت JSON شامل آرایه‌ای از دوره‌هاست که هر دوره دارای فیلدهای زیر است:
              </p>

              <div style={{ background: '#0F172A', borderRadius: 12, padding: 16, overflow: 'auto' }} dir="ltr">
                <pre style={{ margin: 0, color: '#94A3B8', fontSize: 13, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
{`{
  "success": true,
  "count": 5,
  "courses": [
    {
      "id": "...",
      "title": "نام دوره",
      "code": "کد دوره",
      "description": "توضیحات دوره",
      "teacherName": "نام مدرس",
      "level": "سطح",
      "imageUrl": "https://...",
      "price": 500000,
      "currency": "تومان",
      "startDate": "2026-...",
      "endDate": "2026-...",
      "link": "https://.../academy/course-catalog"
    }
  ]
}`}
                </pre>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 12, background: '#FEF3C7', borderRadius: 8, border: '1px solid #FDE68A' }}>
                <span style={{ color: '#92400E', fontSize: 13, lineHeight: 1.6 }}>
                  هشدار: کلید API را مانند رمز عبور نگه دارید. هر کسی که این کلید را داشته باشد می‌تواند دوره‌های آموزشگاه شما را دریافت کند. در صورت نشت کلید، آن را حذف و کلید جدید بسازید.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
