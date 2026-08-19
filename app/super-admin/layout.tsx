'use client';

import { useAuth } from '@/components/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, LogOut, ArrowRight, LayoutDashboard, ChevronDown, Bell } from 'lucide-react';
import { Logo } from '@/components/dashboard/logo';
import { NotificationBell } from '@/components/dashboard/notification-bell';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { allNavGroups, coreItems, adminItems } from '@/lib/nav-config';

const superAdminNav = [
  { href: '/super-admin', label: 'داشبورد' },
  { href: '/super-admin/work-reports', label: 'گزارش‌های کار' },
  { href: '/super-admin/tenants', label: 'سازمان‌ها' },
  { href: '/super-admin/plans', label: 'پلن‌ها' },
  { href: '/super-admin/modules', label: 'ماژول‌ها' },
  { href: '/super-admin/subscriptions', label: 'اشتراک‌ها' },
  { href: '/super-admin/billing', label: 'صورتحساب' },
  { href: '/super-admin/usage', label: 'مصرف منابع' },
  { href: '/super-admin/settings', label: 'تنظیمات' },
];

const dashboardQuickLinks = [
  ...coreItems,
  ...adminItems,
  ...allNavGroups.flatMap((g) => g.items),
];

function DashboardDropdown() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex items-center gap-1.5 rounded-xl border border-white/20 px-3 py-2 text-xs font-bold text-white/90 transition-colors hover:bg-white/10"
      >
        <LayoutDashboard className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">داشبورد سازمان</span>
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 mt-2 w-64 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-card shadow-premium-lg z-50">
          <div className="p-2">
            <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">دسترسی سریع</div>
            {dashboardQuickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-accent"
                >
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!profile) {
        router.replace('/login');
      } else if (profile.role !== 'super_admin' && profile.role !== 'owner') {
        router.replace('/dashboard');
      }
    }
  }, [profile, loading, router]);

  if (loading || !profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Logo size={56} />
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  const isActive = (href: string) => pathname === href || (href !== '/super-admin' && pathname.startsWith(href));

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-50 bg-primary-gradient shadow-premium-lg">
        <div className="mx-auto flex h-[68px] max-w-[1600px] items-center justify-between gap-2 px-3 sm:px-4 lg:px-7">
          <div className="flex items-center gap-2 sm:gap-3">
            <Logo size={40} withText={true} textClassName="hidden sm:block [&_div]:text-white [&_.text-muted-foreground]:text-white/60" />
          </div>
          <nav className="hidden items-center gap-1 overflow-x-auto lg:flex">
            {superAdminNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-bold transition-all',
                  isActive(item.href)
                    ? 'bg-accent text-accent-foreground shadow-md glow-accent'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <DashboardDropdown />
            <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/20">
              <NotificationBell variant="super-admin" />
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-xl border border-white/20 px-2.5 py-2 sm:px-3.5 text-xs font-bold text-white/90 transition-colors hover:bg-white/10"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">پنل سازمانی</span>
            </Link>
            <button
              onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login'); }}
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/20 text-white/90 transition-colors hover:bg-destructive/20 hover:border-destructive/40"
            >
              <LogOut className="h-[16px] w-[16px] sm:h-[18px] sm:w-[18px]" />
            </button>
          </div>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto px-3 pb-2.5 lg:hidden">
          {superAdminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition-all',
                isActive(item.href)
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-white/10 text-white/70'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-[1600px] px-3 py-4 sm:px-4 sm:py-6 lg:px-7 lg:py-8">{children}</main>
    </div>
  );
}
