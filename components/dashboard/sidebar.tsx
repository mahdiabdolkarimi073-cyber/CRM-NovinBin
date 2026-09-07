'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Shield, ChevronDown, User, Settings, LogOut,
  Inbox, Landmark, Warehouse, Award, ClipboardList, TrendingUp,
  FileSearch, PanelRightClose, PanelRightOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/dashboard/logo';
import {
  coreItems, cartableItems, financeItems, inventoryItems, clubItems, adminItems,
  reportsItems, salesItems, serviceItems, isSuperAdminRole, filterByAccess,
  type NavItem, type NavGroup,
} from '@/lib/nav-config';
import { NotificationBell } from '@/components/dashboard/notification-bell';

const SIDEBAR_WIDTH = 272;
const STORAGE_KEY = 'sb-open';

function matches(pathname: string, href: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();

  const [open, setOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

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

  const displayName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : 'کاربر';
  const initials = (profile?.firstName?.[0] || 'ن').toUpperCase();
  const roleLabel = isSuperAdmin ? 'سوپرادمین' : profile?.role === 'admin' ? 'مدیر' : 'پرسنل سازمان';

  const groups: NavGroup[] = [
    { label: 'کارتابل', icon: Inbox, items: visibleCartable },
    { label: 'گزارشات', icon: ClipboardList, items: visibleReports },
    { label: 'مالی', icon: Landmark, items: visibleFinance },
    { label: 'خدمات', icon: FileSearch, items: visibleService },
    { label: 'فروش', icon: TrendingUp, items: visibleSales },
    { label: 'انبارداری', icon: Warehouse, items: visibleInventory },
    { label: 'باشگاه مشتریان', icon: Award, items: visibleClub },
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  // Restore preference on mount
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored !== null) setOpen(stored === 'true');
    setMounted(true);
  }, []);

  // Persist preference + notify listeners
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, String(open));
      window.dispatchEvent(new Event('sb-toggle'));
    }
  }, [open, mounted]);

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

  const closeSidebar = useCallback(() => setOpen(false), []);

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
      {/* Floating toggle button — always visible */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/60 bg-white/90 text-slate-600 shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-white hover:text-slate-900',
          open ? 'right-[280px]' : 'right-4'
        )}
        style={{ transitionProperty: 'right, background, color' }}
        aria-label={open ? 'بستن منو' : 'باز کردن منو'}
      >
        {open ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
      </button>

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
          'fixed top-0 bottom-0 z-40 flex flex-col bg-slate-900 transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ width: SIDEBAR_WIDTH, right: 0 }}
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

        {/* Footer */}
        <div className="flex items-center gap-2.5 border-t border-white/5 px-3 py-3">
          <NotificationBell variant="super-admin" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5">
                <Avatar className="h-8 w-8 border border-emerald-400/30">
                  <AvatarImage src={profile?.avatarUrl || undefined} alt={displayName} />
                  <AvatarFallback className="bg-emerald-500 text-[11px] font-bold text-slate-900">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 text-right">
                  <div className="truncate text-xs font-semibold text-white">{displayName}</div>
                  <div className="text-[10px] text-emerald-400/70">{roleLabel}</div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-slate-700 bg-slate-900 text-slate-200">
              <DropdownMenuLabel>
                <div className="text-sm font-bold text-white">{displayName}</div>
                <div className="text-xs font-normal text-emerald-400/70">{roleLabel}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-300 hover:text-white">
                  <User className="h-4 w-4 text-emerald-400" />
                  پروفایل من
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-300 hover:text-white">
                  <Settings className="h-4 w-4 text-emerald-400" />
                  تنظیمات
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-400 focus:text-red-300"
              >
                <LogOut className="h-4 w-4" />
                خروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}

export { DashboardSidebar as Navbar };
