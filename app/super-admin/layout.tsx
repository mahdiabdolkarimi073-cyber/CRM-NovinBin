'use client';

import { GlobalNavbar } from '@/components/dashboard/global-navbar';
import { SuperAdminSidebar } from '@/components/dashboard/super-admin-sidebar';
import { useAuth } from '@/components/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/dashboard/logo';
import { cn } from '@/lib/utils';

const SIDEBAR_WIDTH = 272;
const STORAGE_KEY = 'sb-sa-open';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!profile) {
        router.replace('/login');
      } else if (profile.role !== 'super_admin' && profile.role !== 'owner') {
        router.replace('/dashboard');
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
        <div className="flex flex-col items-center gap-3">
          <Logo size={120} />
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300" dir="rtl">
      <GlobalNavbar sidebarOpen={sidebarOpen} onToggleSidebar={toggleSidebar} variant="super-admin" />
      <SuperAdminSidebar open={sidebarOpen} onToggle={toggleSidebar} />
      <main
        className={cn(
          'mx-auto max-w-[1470px] px-4 pb-10 pt-6 transition-all duration-300 ease-in-out lg:px-6',
          sidebarOpen ? 'lg:pr-[280px]' : 'lg:pr-4'
        )}
      >
        {children}
      </main>
    </div>
  );
}
