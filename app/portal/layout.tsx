'use client';

import { useAuth } from '@/components/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, LogOut, Bell } from 'lucide-react';
import { Logo } from '@/components/dashboard/logo';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !profile) {
      router.replace('/login/customer');
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

  const navItems = [
    { href: '/portal', label: 'داشبورد' },
    { href: '/portal/orders', label: 'سفارشات من' },
    { href: '/portal/invoices', label: 'فاکتورهای من' },
    { href: '/portal/work-reports', label: 'گزارش کار من' },
    { href: '/portal/tickets', label: 'تیکت‌های من' },
    { href: '/portal/loyalty', label: 'باشگاه مشتریان' },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-50 border-b border-border bg-card/90 shadow-premium backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1400px] items-center justify-between px-4 lg:px-7">
          <Link href="/portal" className="flex items-center gap-3">
            <Logo size={44} withText={true} textClassName="hidden sm:block" />
          </Link>
          <nav className="hidden items-center gap-1.5 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${
                  isActive(item.href)
                    ? 'bg-primary text-primary-foreground shadow-premium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/portal/tickets" className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-accent">
              <Bell className="h-[18px] w-[18px]" />
            </Link>
            <button
              onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login/customer'); }}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-3 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                isActive(item.href)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-6 lg:px-7 lg:py-8">{children}</main>
    </div>
  );
}
