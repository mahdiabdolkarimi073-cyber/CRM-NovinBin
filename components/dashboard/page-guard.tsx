'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { hasPageAccess } from '@/lib/nav-config';
import { ShieldX, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageGuardProps {
  href: string;
  children: React.ReactNode;
}

export function PageGuard({ href, children }: PageGuardProps) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  const hasAccess = hasPageAccess(profile, href);

  useEffect(() => {
    if (!loading && profile && !hasAccess) {
      const t = setTimeout(() => router.replace('/dashboard'), 3000);
      return () => clearTimeout(t);
    }
  }, [loading, profile, hasAccess, router]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center" dir="rtl">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <ShieldX className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-2xl font-black text-foreground">شما دسترسی ندارید</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          شما به این بخش دسترسی ندارید. لطفاً با مدیر سازمان خود تماس بگیرید تا در صورت نیاز دسترسی لازم را به شما اختصاص دهد.
        </p>
        <p className="text-xs text-muted-foreground">به‌طور خودکار به داشبورد منتقل می‌شوید...</p>
        <Button onClick={() => router.replace('/dashboard')} className="mt-2">
          <ArrowRight className="h-4 w-4" />
          بازگشت به داشبورد
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
