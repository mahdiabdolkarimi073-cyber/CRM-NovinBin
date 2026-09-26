'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import {
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Wallet,
  LifeBuoy,
  Menu,
  Search,
  Bell,
  LogOut,
  Home,
} from 'lucide-react';

export type StudentNavItem = {
  label: string;
  icon: typeof BookOpen;
  href: string;
};

const defaultNavItems: StudentNavItem[] = [
  { label: 'داشبورد', icon: Home, href: '/academy/dashboard' },
  { label: 'دوره‌ها', icon: GraduationCap, href: '/academy/course-catalog' },
  { label: 'کلاس‌های من', icon: BookOpen, href: '/academy/classes' },
  { label: 'حضور و غیاب', icon: CheckCircle2, href: '/academy/attendance' },
  { label: 'نمرات و پیشرفت', icon: GraduationCap, href: '/academy/education-record' },
  { label: 'پرداخت‌ها', icon: Wallet, href: '/academy/finance' },
];

export function StudentShell({
  user,
  activePath,
  navItems = defaultNavItems,
  pageTitle,
  pageSubtitle,
  noticeCount = 0,
  onLogout,
  children,
}: {
  user: { firstName: string; lastName: string };
  activePath: string;
  navItems?: StudentNavItem[];
  pageTitle: string;
  pageSubtitle: string;
  noticeCount?: number;
  onLogout: () => void;
  children: ReactNode;
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="student-shell" dir="rtl">
      {sidebarOpen && <div className="student-shell-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`student-shell-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="student-shell-inner">
          <div className="student-shell-brand">
            <div className="student-shell-brand-mark"><GraduationCap /></div>
            <div>
              <strong>دنیای الگوریتم</strong>
              <small>آموزش برای ساختن آینده</small>
            </div>
          </div>

          <div className="student-shell-user">
            <div className="student-shell-avatar">{user.firstName.slice(0, 1)}</div>
            <div>
              <strong>{user.firstName} {user.lastName}</strong>
              <small>دانش‌آموز</small>
            </div>
          </div>

          <nav className="student-shell-nav">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className={item.href === activePath ? 'active' : ''}
                onClick={() => { router.push(item.href); setSidebarOpen(false); }}
              >
                <item.icon />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="student-shell-support">
            <LifeBuoy />
            <strong>نیاز به کمک دارید؟</strong>
            <p>با پشتیبانی در ارتباط باشید</p>
            <button type="button">تماس با پشتیبانی</button>
          </div>
        </div>
      </aside>

      <div className="student-shell-main">
        <header className="student-shell-header">
          <button type="button" className="student-shell-burger" onClick={() => setSidebarOpen(true)} aria-label="منو">
            <Menu />
          </button>
          <div className="student-shell-title">
            <h1>{pageTitle}</h1>
            <p>{pageSubtitle}</p>
          </div>
          <div className="student-shell-actions">
            <button type="button" aria-label="جستجو"><Search /></button>
            <button type="button" aria-label="اعلان‌ها">
              <Bell />
              {noticeCount > 0 && <span>{noticeCount.toLocaleString('fa-IR')}</span>}
            </button>
            <div className="student-shell-profile">
              <div className="student-shell-profile-avatar">{user.firstName.slice(0, 1)}</div>
              <div>
                <strong>{user.firstName} {user.lastName}</strong>
                <small>دانش‌آموز</small>
              </div>
            </div>
            <button type="button" className="student-shell-logout" onClick={onLogout} aria-label="خروج">
              <LogOut />
            </button>
          </div>
        </header>

        <div className="student-shell-scroll">{children}</div>
      </div>
    </div>
  );
}
