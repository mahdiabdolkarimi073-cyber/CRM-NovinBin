'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { hasPageAccess } from '@/lib/nav-config';
import { ShieldX, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GuardedLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function GuardedLink({ href, children, className, onClick }: GuardedLinkProps) {
  const { profile } = useAuth();
  const router = useRouter();
  const [denied, setDenied] = useState(false);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (onClick) onClick();
      if (!hasPageAccess(profile, href)) {
        setDenied(true);
        setTimeout(() => {
          router.replace('/dashboard');
          setDenied(false);
        }, 3000);
        return;
      }
      router.push(href);
    },
    [profile, href, router, onClick]
  );

  if (denied) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-destructive/20 bg-destructive/5 p-6 text-center" dir="rtl">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <ShieldX className="h-7 w-7 text-destructive" />
        </div>
        <h3 className="text-lg font-black text-foreground">شما دسترسی ندارید</h3>
        <p className="max-w-xs text-xs text-muted-foreground">
          شما به این بخش دسترسی ندارید. به‌طور خودکار به داشبورد منتقل می‌شوید...
        </p>
        <Button size="sm" onClick={() => router.replace('/dashboard')} className="mt-1">
          <ArrowRight className="h-4 w-4" />
          بازگشت به داشبورد
        </Button>
      </div>
    );
  }

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
