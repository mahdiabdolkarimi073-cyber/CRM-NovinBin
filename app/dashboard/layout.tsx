'use client';

import { GlobalNavbar } from '@/components/dashboard/global-navbar';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { useAuth } from '@/components/providers/auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/dashboard/logo';
import { PageGuard } from '@/components/dashboard/page-guard';
import { hasPageAccess } from '@/lib/nav-config';
import { cn } from '@/lib/utils';

const PUBLIC_DASHBOARD_PATHS = ['/dashboard'];
const SIDEBAR_WIDTH = 272;
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

  // Restore sidebar preference from localStorage
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored !== null) setSidebarOpen(stored === 'true');
  }, []);

  // Persist sidebar preference
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
          <Logo size={72} />
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  const isPublicPath = PUBLIC_DASHBOARD_PATHS.includes(pathname);
  const needsGuard = !isPublicPath;
  const hasAccess = hasPageAccess(profile, pathname);
  const isDashboardHome = pathname === '/dashboard';

  return (
    <div className="min-h-screen bg-[#F6F8FC]" dir="rtl">
      <GlobalNavbar sidebarOpen={sidebarOpen} onToggleSidebar={toggleSidebar} />
      <DashboardSidebar open={sidebarOpen} onToggle={toggleSidebar} />
      <main
        className={cn(
          'mx-auto px-4 pb-10 pt-6 transition-all duration-300 ease-in-out lg:px-6',
          isDashboardHome ? 'max-w-[1470px]' : 'max-w-[1280px]',
          sidebarOpen ? 'lg:pr-[280px]' : 'lg:pr-4'
        )}
      >
        {needsGuard && !hasAccess ? <PageGuard href={pathname}>{children}</PageGuard> : children}
      </main>
    </div>
  );
}
