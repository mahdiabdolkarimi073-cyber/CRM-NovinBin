'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Shield, Menu, X, ChevronDown, Search, User, Settings, LogOut, Bell,
  Inbox, Landmark, Warehouse, Award, ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/dashboard/logo';
import {
  coreItems, cartableItems, financeItems, inventoryItems, clubItems, adminItems,
  reportsItems,
  allNavGroups, isSuperAdminRole, filterByAccess, type NavItem, type NavGroup,
} from '@/lib/nav-config';
import { NotificationBell } from '@/components/dashboard/notification-bell';

function matches(pathname: string, href: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isSuperAdmin = isSuperAdminRole(profile?.role);

  const visibleCore = filterByAccess(profile, coreItems);
  const visibleClub = filterByAccess(profile, clubItems);
  const visibleFinance = filterByAccess(profile, financeItems);
  const visibleInventory = filterByAccess(profile, inventoryItems);
  const visibleCartable = filterByAccess(profile, cartableItems);
  const visibleAdmin = filterByAccess(profile, adminItems);

  const visibleReports = filterByAccess(profile, reportsItems);

  const displayName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : 'کاربر';
  const initials = (profile?.firstName?.[0] || 'ن').toUpperCase();
  const roleLabel = isSuperAdmin ? 'سوپرادمین' : profile?.role === 'admin' ? 'مدیر' : 'پرسنل سازمان';

  const groups: NavGroup[] = [
    { label: 'کارتابل', icon: Inbox, items: visibleCartable },
    { label: 'گزارشات', icon: ClipboardList, items: visibleReports },
    { label: 'مالی', icon: Landmark, items: visibleFinance },
    { label: 'انبارداری', icon: Warehouse, items: visibleInventory },
    { label: 'باشگاه مشتریان', icon: Award, items: visibleClub },
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const topLinks = visibleCore.slice(0, 5);

  const renderDropdownItem = (item: NavItem) => {
    const active = matches(pathname, item.href);
    return (
      <DropdownMenuItem key={item.href} asChild>
        <Link
          href={item.href}
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors',
            active ? 'text-accent' : 'text-foreground hover:text-accent'
          )}
        >
          <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          {item.label}
        </Link>
      </DropdownMenuItem>
    );
  };

  const renderMobileGroup = (group: NavGroup, items: NavItem[]) => {
    if (!items.length) return null;
    return (
      <div key={group.label} className="space-y-1">
        <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <group.icon className="h-3.5 w-3.5" />
          {group.label}
        </div>
        {items.map((item) => {
          const active = matches(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active ? 'bg-accent/10 text-accent' : 'text-foreground hover:bg-muted'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Top navbar */}
      <header className="sticky top-0 z-50 w-full bg-[#111827] px-4 pb-[28px] pt-0 shadow-lg" dir="rtl">
        <div className="mx-auto flex h-[86px] max-w-[1280px] items-center justify-between gap-4">
          {/* Logo + desktop nav */}
          <div className="flex items-center gap-8">
            <Link href={isSuperAdmin ? '/super-admin' : '/dashboard'} className="transition-transform hover:scale-105">
              <Logo size={40} withText={true} textClassName="hidden sm:block [&_div]:text-white [&_.text-muted-foreground]:text-white/60" />
            </Link>

            {/* Full desktop navigation */}
            <nav className="hidden items-center gap-1 2xl:flex">
              {topLinks.map((item) => {
                const active = matches(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'relative flex items-center gap-1.5 px-3 py-2 text-[14px] font-medium transition-all',
                      active
                        ? 'text-white'
                        : 'text-[#F8FAFC]/70 hover:text-white'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                    {active && (
                      <span className="absolute -bottom-[2px] left-0 right-0 h-[3px] rounded-full bg-[#FF7A00] shadow-[0_0_8px_rgba(255,122,0,0.5)]" />
                    )}
                  </Link>
                );
              })}

              {/* Dropdown groups */}
              {groups.filter((g) => g.items.length > 0).map((group) => {
                const groupActive = group.items.some((item) => matches(pathname, item.href));
                return (
                  <DropdownMenu key={group.label}>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={cn(
                          'relative flex items-center gap-1.5 px-3 py-2 text-[14px] font-medium transition-all',
                          groupActive
                            ? 'text-white'
                            : 'text-[#F8FAFC]/70 hover:text-white'
                        )}
                      >
                        <group.icon className="h-4 w-4" />
                        {group.label}
                        <ChevronDown className="h-3 w-3" />
                        {groupActive && (
                          <span className="absolute -bottom-[2px] left-0 right-0 h-[3px] rounded-full bg-[#FF7A00] shadow-[0_0_8px_rgba(255,122,0,0.5)]" />
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      {group.items.map(renderDropdownItem)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              })}

              {/* More dropdown for remaining core items */}
              {visibleCore.slice(5).length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        'relative flex items-center gap-1.5 px-3 py-2 text-[14px] font-medium transition-all',
                        visibleCore.slice(5).some((item) => matches(pathname, item.href))
                          ? 'text-white'
                          : 'text-[#F8FAFC]/70 hover:text-white'
                      )}
                    >
                      بیشتر
                      <ChevronDown className="h-3 w-3" />
                      {visibleCore.slice(5).some((item) => matches(pathname, item.href)) && (
                        <span className="absolute -bottom-[2px] left-0 right-0 h-[3px] rounded-full bg-[#FF7A00] shadow-[0_0_8px_rgba(255,122,0,0.5)]" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {visibleCore.slice(5).map(renderDropdownItem)}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Admin dropdown */}
              {visibleAdmin.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        'relative flex items-center gap-1.5 px-3 py-2 text-[14px] font-medium transition-all',
                        visibleAdmin.some((item) => matches(pathname, item.href))
                          ? 'text-white'
                          : 'text-[#F8FAFC]/70 hover:text-white'
                      )}
                    >
                      <Shield className="h-4 w-4" />
                      مدیریت
                      <ChevronDown className="h-3 w-3" />
                      {visibleAdmin.some((item) => matches(pathname, item.href)) && (
                        <span className="absolute -bottom-[2px] left-0 right-0 h-[3px] rounded-full bg-[#FF7A00] shadow-[0_0_8px_rgba(255,122,0,0.5)]" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {visibleAdmin.map(renderDropdownItem)}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {isSuperAdmin && (
                <Link
                  href="/super-admin"
                  className={cn(
                    'relative flex items-center gap-1.5 px-3 py-2 text-[14px] font-medium transition-all',
                    matches(pathname, '/super-admin')
                      ? 'text-white'
                      : 'text-[#F8FAFC]/70 hover:text-white'
                  )}
                >
                  <Shield className="h-4 w-4" />
                  سوپرادمین
                  {matches(pathname, '/super-admin') && (
                    <span className="absolute -bottom-[2px] left-0 right-0 h-[3px] rounded-full bg-[#FF7A00] shadow-[0_0_8px_rgba(255,122,0,0.5)]" />
                  )}
                </Link>
              )}
            </nav>

            {/* Compact navigation for medium desktop widths */}
            <div className="hidden xl:flex 2xl:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      'flex items-center gap-2 rounded-xl border border-white/20 px-3.5 py-2 text-xs font-bold transition-colors',
                      pathname.startsWith('/dashboard') || pathname.startsWith('/super-admin')
                        ? 'bg-white/10 text-white'
                        : 'text-white/70 hover:bg-white/10'
                    )}
                  >
                    <Menu className="h-4 w-4" />
                    منوی سامانه
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-[70vh] w-64 overflow-y-auto">
                  <DropdownMenuLabel>دسترسی سریع</DropdownMenuLabel>
                  {visibleCore.map(renderDropdownItem)}
                  {groups.map((group) => (
                    group.items.length > 0 ? (
                      <div key={group.label}>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
                          <group.icon className="h-3.5 w-3.5" />
                          {group.label}
                        </DropdownMenuLabel>
                        {group.items.map(renderDropdownItem)}
                      </div>
                    ) : null
                  ))}
                  {visibleAdmin.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Shield className="h-3.5 w-3.5" />
                        مدیریت
                      </DropdownMenuLabel>
                      {visibleAdmin.map(renderDropdownItem)}
                    </>
                  )}
                  {isSuperAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/super-admin" className="flex items-center gap-2.5 px-3 py-2 text-sm">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          سوپرادمین
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Left side: search + notifications + profile */}
          <div className="flex items-center gap-3">
            {/* Search (desktop) */}
            <div className="hidden items-center xl:flex">
              <div className="flex h-10 w-full max-w-[240px] items-center gap-2.5 rounded-xl border border-white/20 bg-white/5 px-3.5 transition-all focus-within:border-[#FF7A00] focus-within:bg-white/10">
                <Search className="h-4 w-4 text-white/50" />
                <input
                  type="text"
                  placeholder="جستجو..."
                  className="flex-1 bg-transparent text-sm font-medium text-white outline-none placeholder:text-white/40"
                />
              </div>
            </div>

            {/* Notifications */}
            <div className="relative">
              <NotificationBell />
            </div>

            {/* Profile dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-xl p-1 transition-colors hover:bg-white/10">
                  <Avatar className="h-9 w-9 border-2 border-[#FF7A00]/40">
                    <AvatarFallback className="bg-[#FF7A00] text-xs font-bold text-white">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="hidden text-right xl:block">
                    <div className="text-xs font-bold text-white">{displayName}</div>
                    <div className="text-[10px] text-white/50">{roleLabel}</div>
                  </div>
                  <ChevronDown className="hidden h-3.5 w-3.5 text-white/50 xl:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-sm font-bold">{displayName}</div>
                  <div className="text-xs font-normal text-muted-foreground">{roleLabel}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="flex items-center gap-2.5 px-3 py-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    پروفایل من
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="flex items-center gap-2.5 px-3 py-2 text-sm">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    تنظیمات
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  خروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 text-white/70 transition-colors hover:bg-white/10 hover:text-white xl:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[60] bg-primary-dark/60 backdrop-blur-sm xl:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-[70] flex w-[300px] flex-col bg-card shadow-2xl transition-transform duration-300 xl:hidden',
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        dir="rtl"
      >
        <div className="flex h-[86px] items-center justify-between border-b border-white/10 bg-[#111827] px-4">
          <Logo size={40} withText={false} />
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {visibleCore.map((item) => {
              const active = matches(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    active ? 'bg-accent/10 text-accent' : 'text-foreground hover:bg-muted'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="my-3 border-t border-border" />
          {renderMobileGroup({ label: 'کارتابل', icon: Inbox, items: [] } as NavGroup, visibleCartable)}
          {renderMobileGroup({ label: 'گزارشات', icon: ClipboardList, items: [] } as NavGroup, visibleReports)}
          {renderMobileGroup({ label: 'مالی', icon: Landmark, items: [] } as NavGroup, visibleFinance)}
          {renderMobileGroup({ label: 'انبارداری', icon: Warehouse, items: [] } as NavGroup, visibleInventory)}
          {renderMobileGroup({ label: 'باشگاه مشتریان', icon: Award, items: [] } as NavGroup, visibleClub)}
          {visibleAdmin.length > 0 && renderMobileGroup({ label: 'مدیریت', icon: Shield, items: [] } as NavGroup, visibleAdmin)}
          {isSuperAdmin && (
            <Link
              href="/super-admin"
              onClick={() => setMobileOpen(false)}
              className={cn(
                'mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                matches(pathname, '/super-admin') ? 'bg-accent/10 text-accent' : 'text-foreground hover:bg-muted'
              )}
            >
              <Shield className="h-4 w-4 shrink-0" />
              پنل سوپرادمین
            </Link>
          )}
        </nav>
        <div className="border-t border-border p-3">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            خروج از حساب
          </button>
        </div>
      </aside>
    </>
  );
}
