'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard } from 'lucide-react';
import { superAdminNavItems } from '@/lib/super-admin-nav';

const SIDEBAR_WIDTH = 272;

function matches(pathname: string, href: string) {
  return pathname === href || (href !== '/super-admin' && pathname.startsWith(href));
}

interface SuperAdminSidebarProps {
  open: boolean;
  onToggle: () => void;
}

export function SuperAdminSidebar({ open, onToggle }: SuperAdminSidebarProps) {
  const pathname = usePathname();

  const closeSidebar = () => onToggle();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-[2px] lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={cn(
          'fixed z-40 flex flex-col bg-sidebar text-sidebar-foreground border-l border-border transition-transform duration-300 ease-in-out scroll-smooth',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ width: SIDEBAR_WIDTH, right: 0, top: '64px', height: 'calc(100vh - 64px)', overflowY: 'auto', scrollBehavior: 'smooth' }}
        dir="rtl"
      >
        <nav className="sb-nav-scroll flex-1 px-3 py-2">
          <div className="flex flex-col gap-0.5">
            {superAdminNavItems.map((item) => {
              const active = matches(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeSidebar}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                    active
                      ? 'bg-accent/10 text-accent font-semibold'
                      : 'text-sidebar-muted-foreground hover:text-sidebar-foreground hover:bg-white/5'
                  )}
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="my-3 h-px bg-white/5" />

          <Link
            href="/dashboard"
            onClick={closeSidebar}
            className="flex items-center justify-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-bold bg-accent/10 text-accent hover:bg-accent/20 transition-colors border border-accent/20"
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            <span>بازگشت به CRM</span>
          </Link>
        </nav>
      </aside>
    </>
  );
}
