'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import {
  Shield, ChevronDown,
  Inbox, Landmark, Warehouse, Award, ClipboardList, TrendingUp,
  FileSearch,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/dashboard/logo';
import {
  coreItems, cartableItems, financeItems, inventoryItems, clubItems, adminItems,
  reportsItems, salesItems, serviceItems, isSuperAdminRole, filterByAccess,
  type NavItem, type NavGroup,
} from '@/lib/nav-config';

const SIDEBAR_WIDTH = 272;
const STORAGE_KEY = 'sb-open';

function matches(pathname: string, href: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
}

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

export function DashboardSidebar({ open, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const isSuperAdmin = isSuperAdminRole(profile?.role);

  const visibleCore = filterByAccess(profile, coreItems);
  const visibleClub = filterByAccess(profile, clubItems);
  const visibleFinance = filterByAccess(profile, financeItems);
  const visibleInventory = filterByAccess(profile, inventoryItems);
  const visibleCartable = filterByAccess(profile, cartableItems);
  const visibleAdmin = filterByAccess(profile, adminItems);
  const visibleReports = filterByAccess(profile, reportsItems);
  const visibleSales = filterByAccess(profile, salesItems);
  const visibleService = filterByAccess(profile, serviceItems);

  const groups: NavGroup[] = [
    { label: 'کارتابل', icon: Inbox, items: visibleCartable },
    { label: 'گزارشات', icon: ClipboardList, items: visibleReports },
    { label: 'مالی', icon: Landmark, items: visibleFinance },
    { label: 'خدمات', icon: FileSearch, items: visibleService },
    { label: 'فروش', icon: TrendingUp, items: visibleSales },
    { label: 'انبارداری', icon: Warehouse, items: visibleInventory },
    { label: 'باشگاه مشتریان', icon: Award, items: visibleClub },
  ];

  // Auto-expand group containing active route
  useEffect(() => {
    groups.forEach((g) => {
      if (g.items.some((item) => matches(pathname, item.href))) {
        setExpandedGroups((prev) => new Set(prev).add(g.label));
      }
    });
    if (visibleAdmin.some((item) => matches(pathname, item.href))) {
      setExpandedGroups((prev) => new Set(prev).add('مدیریت'));
    }
  }, [pathname]);

  const toggleGroup = useCallback((label: string) => {
    setExpandedGroups((prev) => {
      const updated = new Set(prev);
      if (updated.has(label)) updated.delete(label);
      else updated.add(label);
      return updated;
    });
  }, []);

  const closeSidebar = useCallback(() => onToggle(), [onToggle]);

  const renderNavLink = (item: NavItem) => {
    const active = matches(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={closeSidebar}
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
          active
            ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
        )}
      >
        <item.icon className="h-[18px] w-[18px] shrink-0" />
        <span className="truncate">{item.label}</span>
        {active && <span className="absolute right-0 h-5/6 w-[3px] rounded-l-full bg-emerald-400" />}
      </Link>
    );
  };

  const renderGroup = (group: NavGroup) => {
    if (!group.items.length) return null;
    const groupActive = group.items.some((item) => matches(pathname, item.href));
    const expanded = expandedGroups.has(group.label);
    return (
      <div key={group.label}>
        <button
          className={cn(
            'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
            groupActive ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
          )}
          onClick={() => toggleGroup(group.label)}
        >
          <group.icon className="h-[18px] w-[18px] shrink-0" />
          <span className="flex-1 truncate text-right">{group.label}</span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform duration-200', expanded && 'rotate-180')} />
        </button>
        <div className={cn('overflow-hidden transition-all duration-300', expanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0')}>
          <div className="flex flex-col gap-0.5 pr-4 pt-1">
            {group.items.map((item) => renderNavLink(item))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Overlay for small screens when sidebar is open */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-[2px] lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed bottom-0 z-40 flex flex-col bg-slate-900 transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ width: SIDEBAR_WIDTH, right: 0, top: '64px' }}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <Link href={isSuperAdmin ? '/super-admin' : '/dashboard'} onClick={closeSidebar}>
            <Logo size={44} withText textClassName="[&_div]:text-white [&_.text-muted-foreground]:text-emerald-400/70" />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="sb-nav-scroll flex-1 overflow-y-auto px-3 py-2">
          {/* Core links */}
          <div className="flex flex-col gap-0.5">
            {visibleCore.map((item) => renderNavLink(item))}
          </div>

          <div className="my-3 h-px bg-white/5" />

          {/* Collapsible groups */}
          {groups.filter((g) => g.items.length > 0).map((g) => renderGroup(g))}

          {/* Admin group */}
          {visibleAdmin.length > 0 && (
            <>
              <div className="my-3 h-px bg-white/5" />
              {renderGroup({ label: 'مدیریت', icon: Shield, items: visibleAdmin })}
            </>
          )}

          {/* Super admin link */}
          {isSuperAdmin && (
            <Link
              href="/super-admin"
              onClick={closeSidebar}
              className={cn(
                'mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                matches(pathname, '/super-admin')
                  ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              )}
            >
              <Shield className="h-[18px] w-[18px] shrink-0" />
              <span className="truncate">پنل سوپرادمین</span>
            </Link>
          )}
        </nav>
      </aside>
    </>
  );
}

export { DashboardSidebar as Navbar };
