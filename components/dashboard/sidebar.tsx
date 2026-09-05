'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Shield, Menu, X, ChevronDown, ChevronLeft, User, Settings, LogOut,
  Inbox, Landmark, Warehouse, Award, ClipboardList, TrendingUp,
  Bell, FileSearch,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/dashboard/logo';
import {
  coreItems, cartableItems, financeItems, inventoryItems, clubItems, adminItems,
  reportsItems, salesItems, serviceItems, isSuperAdminRole, filterByAccess, type NavItem, type NavGroup,
} from '@/lib/nav-config';
import { NotificationBell } from '@/components/dashboard/notification-bell';

function matches(pathname: string, href: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
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

  // Auto-expand group containing active route
  useEffect(() => {
    groups.forEach((g) => {
      if (g.items.some((item) => matches(pathname, item.href))) {
        setExpandedGroups((prev) => new Set(prev).add(g.label));
      }
    });
  }, [pathname]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const updated = new Set(prev);
      if (updated.has(label)) updated.delete(label);
      else updated.add(label);
      return updated;
    });
  };

  const renderNavLink = (item: NavItem, onClick?: () => void) => {
    const active = matches(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClick}
        className={cn(
          'sb-nav-link',
          active && 'sb-nav-link-active'
        )}
      >
        <item.icon className="h-[18px] w-[18px] shrink-0" />
        <span className="truncate">{item.label}</span>
        {active && <span className="sb-nav-link-bar" />}
      </Link>
    );
  };

  const renderGroup = (group: NavGroup, isMobile = false) => {
    if (!group.items.length) return null;
    const groupActive = group.items.some((item) => matches(pathname, item.href));
    const expanded = expandedGroups.has(group.label);
    return (
      <div key={group.label} className="sb-nav-group">
        <button
          className={cn('sb-nav-group-header', groupActive && 'sb-nav-group-header-active')}
          onClick={() => toggleGroup(group.label)}
        >
          <group.icon className="h-[18px] w-[18px] shrink-0" />
          <span className="truncate flex-1 text-right">{group.label}</span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform duration-200', expanded && 'rotate-180')} />
        </button>
        <div className={cn('sb-nav-group-items', expanded ? 'sb-nav-group-expanded' : 'sb-nav-group-collapsed')}>
          <div className="sb-nav-group-inner">
            {group.items.map((item) => renderNavLink(item, isMobile ? () => setMobileOpen(false) : undefined))}
          </div>
        </div>
      </div>
    );
  };

  const sidebarContent = (isMobile = false) => (
    <>
      {/* Logo header */}
      <div className="sb-header">
        <Link href={isSuperAdmin ? '/super-admin' : '/dashboard'} className="sb-logo-link">
          <Logo size={56} withText={true} textClassName="[&_div]:text-white [&_.text-muted-foreground]:text-emerald-300" />
        </Link>
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="sb-collapse-btn"
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', collapsed && 'rotate-180')} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="sb-nav">
        {/* Core items */}
        <div className="sb-nav-section">
          {visibleCore.map((item) => renderNavLink(item, isMobile ? () => setMobileOpen(false) : undefined))}
        </div>

        <div className="sb-nav-divider" />

        {/* Groups with accordion */}
        {groups.filter((g) => g.items.length > 0).map((g) => renderGroup(g, isMobile))}

        {/* Admin group */}
        {visibleAdmin.length > 0 && (
          <>
            <div className="sb-nav-divider" />
            <div className="sb-nav-group">
              <button
                className={cn(
                  'sb-nav-group-header',
                  visibleAdmin.some((item) => matches(pathname, item.href)) && 'sb-nav-group-header-active'
                )}
                onClick={() => toggleGroup('مدیریت')}
              >
                <Shield className="h-[18px] w-[18px] shrink-0" />
                <span className="truncate flex-1 text-right">مدیریت</span>
                <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform duration-200', expandedGroups.has('مدیریت') && 'rotate-180')} />
              </button>
              <div className={cn('sb-nav-group-items', expandedGroups.has('مدیریت') ? 'sb-nav-group-expanded' : 'sb-nav-group-collapsed')}>
                <div className="sb-nav-group-inner">
                  {visibleAdmin.map((item) => renderNavLink(item, isMobile ? () => setMobileOpen(false) : undefined))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Super admin link */}
        {isSuperAdmin && (
          <Link
            href="/super-admin"
            onClick={isMobile ? () => setMobileOpen(false) : undefined}
            className={cn('sb-nav-link', matches(pathname, '/super-admin') && 'sb-nav-link-active')}
          >
            <Shield className="h-[18px] w-[18px] shrink-0" />
            <span className="truncate">پنل سوپرادمین</span>
            {matches(pathname, '/super-admin') && <span className="sb-nav-link-bar" />}
          </Link>
        )}
      </nav>

      {/* Footer: notifications + profile */}
      <div className="sb-footer">
        <div className="sb-footer-top">
          <NotificationBell variant="super-admin" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="sb-profile-btn">
                <Avatar className="h-9 w-9 border-2 border-emerald-400/40">
                  <AvatarImage src={profile?.avatarUrl || undefined} alt={displayName} />
                  <AvatarFallback className="bg-emerald-500 text-xs font-bold text-slate-900">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-right min-w-0">
                  <div className="text-xs font-bold text-white truncate">{displayName}</div>
                  <div className="text-[10px] text-emerald-300">{roleLabel}</div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-white/10" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)' }}>
              <DropdownMenuLabel>
                <div className="text-sm font-bold text-white">{displayName}</div>
                <div className="text-xs font-normal text-emerald-300">{roleLabel}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-300 hover:text-white">
                  <User className="h-4 w-4 text-emerald-300" />
                  پروفایل من
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-300 hover:text-white">
                  <Settings className="h-4 w-4 text-emerald-300" />
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
      </div>
    </>
  );

  return (
    <>
      {/* Mobile/tablet hamburger button (below lg) */}
      <button
        onClick={() => setMobileOpen(true)}
        className="sb-mobile-toggle"
        aria-label="باز کردن منو"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop sidebar (lg+) - permanent, collapsible width on md */}
      <aside
        className={cn(
          'sb-desktop',
          collapsed ? 'sb-desktop-collapsed' : 'sb-desktop-expanded'
        )}
        dir="rtl"
      >
        {sidebarContent(false)}
      </aside>

      {/* Mobile/tablet overlay + drawer (below lg) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          'sb-mobile',
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        dir="rtl"
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="sb-mobile-close"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebarContent(true)}
      </aside>
    </>
  );
}

export { DashboardSidebar as Navbar };
