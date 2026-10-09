'use client';

import { GlobalNavbar } from '@/components/dashboard/global-navbar';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { useAuth } from '@/components/providers/auth-provider';
import { CallProvider } from '@/components/providers/call-provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/dashboard/logo';
import { PageGuard } from '@/components/dashboard/page-guard';
import { DemoBanner } from '@/components/dashboard/demo-banner';
import { DemoTracker } from '@/components/dashboard/demo-tracker';
import { hasPageAccess } from '@/lib/nav-config';
import { cn } from '@/lib/utils';

const PUBLIC_DASHBOARD_PATHS = ['/dashboard'];
const STORAGE_KEY = 'sb-open';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!profile) {
        router.replace('/login');
      } else if (profile.userType === 'customer') {
        router.replace('/portal');
      }
    }
  }, [profile, loading, router]);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored !== null) setSidebarOpen(stored === 'true');
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(sidebarOpen));
    }
  }, [sidebarOpen]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  if (loading || !profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Logo size={120} />
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  const isPublicPath = PUBLIC_DASHBOARD_PATHS.includes(pathname);
  const needsGuard = !isPublicPath;
  const hasAccess = hasPageAccess(profile, pathname);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300" dir="rtl">
      <DemoBanner />
      <DemoTracker />
      <CallProvider modes={['social', 'customer']}>
        <GlobalNavbar sidebarOpen={sidebarOpen} onToggleSidebar={toggleSidebar} />
        <DashboardSidebar open={sidebarOpen} onToggle={toggleSidebar} />

        {/* wrapper: فضای سایدبار رو از راست کم می‌کنه */}
        <div
          className={cn(
            'w-full transition-all duration-300 ease-in-out',
            sidebarOpen
              ? 'laptop:pr-[280px] desktop:pr-[280px]'
              : 'pr-0'
          )}
        >
          <main
            className={cn(
              'box-border mx-auto transition-all duration-300 ease-in-out',
              // عرض دقیق main (شامل padding داخلی)
              sidebarOpen
                ? 'laptop:w-[1360px] desktop:w-[1360px]'
                : 'laptop:w-[1550px] desktop:w-[1550px]',
              // پدینگ داخلی
              'px-2 pb-8 pt-4 mobile:px-3 tablet:px-5 laptop:px-6 desktop:px-8'
            )}
          >
            {needsGuard && !hasAccess ? <PageGuard href={pathname}>{children}</PageGuard> : children}
          </main>
        </div>
      </CallProvider>
    </div>
  );
}