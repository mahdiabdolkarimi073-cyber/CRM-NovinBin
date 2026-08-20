'use client';

import { Navbar } from '@/components/dashboard/navbar';
import { useAuth } from '@/components/providers/auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/dashboard/logo';
import { PageGuard } from '@/components/dashboard/page-guard';
import { hasPageAccess } from '@/lib/nav-config';

const PUBLIC_DASHBOARD_PATHS = ['/dashboard'];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!profile) {
        router.replace('/login');
      } else if (profile.userType === 'customer') {
        router.replace('/portal');
      }
    }
  }, [profile, loading, router]);

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

  return (
    <div className="min-h-screen bg-[#F6F8FD]" dir="rtl">
      <Navbar />
      <main className="mx-auto max-w-[1280px] px-4 pt-6 pb-8 lg:px-6">
        {needsGuard && !hasAccess ? <PageGuard href={pathname}>{children}</PageGuard> : children}
      </main>
    </div>
  );
}
