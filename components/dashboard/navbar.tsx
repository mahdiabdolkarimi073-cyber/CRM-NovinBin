'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Shield, Menu, X, ChevronDown, User, Settings, LogOut,
  Inbox, Landmark, Warehouse, Award, ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/dashboard/logo';
import {
  coreItems, cartableItems, financeItems, inventoryItems, clubItems, adminItems,
  reportsItems, isSuperAdminRole, filterByAccess, type NavItem, type NavGroup,
} from '@/lib/nav-config';
import { NotificationBell } from '@/components/dashboard/notification-bell';

function matches(pathname: string, href: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
}

export function DashboardNavbar() {
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
            'flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors',
            active ? 'text-[#2DD4BF]' : 'text-[#B0C4C0] hover:text-white'
          )}
        >
          <item.icon className="h-4 w-4 shrink-0 text-[#6BA89E]" />
          {item.label}
        </Link>
      </DropdownMenuItem>
    );
  };

  const renderMobileGroup = (group: NavGroup, items: NavItem[]) => {
    if (!items.length) return null;
    return (
      <div key={group.label} className="space-y-1">
        <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#6BA89E]">
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
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors',
                active ? 'bg-[#2DD4BF]/15 text-[#2DD4BF]' : 'text-[#B0C4C0] hover:bg-white/5'
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
      <header
        className="sticky top-0 z-50 w-full shadow-lg"
        dir="rtl"
        style={{
          borderRadius: '0 0 12px 12px',
          background: 'linear-gradient(135deg, #0A2A2A 0%, #0F3D38 50%, #0A2A2A 100%)',
        }}
      >
        <div className="flex items-center justify-between gap-4 px-4 lg:px-5 xl:px-8" style={{ height: '60px' }}>
          {/* Right side: Logo + desktop nav */}
          <div className="flex items-center gap-4 lg:gap-6 xl:gap-8">
            <Link href={isSuperAdmin ? '/super-admin' : '/dashboard'} className="transition-transform hover:scale-105">
              <Logo size={36} withText={true} textClassName="hidden sm:block [&_div]:text-white [&_.text-muted-foreground]:text-[#6BA89E]" />
            </Link>

            {/* Desktop full nav (≥1024px) */}
            <nav className="hidden items-center xl:flex" style={{ gap: '22px' }}>
              {topLinks.map((item) => {
                const active = matches(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'relative flex items-center transition-all',
                      active ? 'text-white' : 'text-[#B0C4C0] hover:text-white'
                    )}
                    style={{ height: '40px', fontSize: '13px', fontWeight: 500, gap: '6px', padding: '0 10px', borderRadius: '8px' }}
                  >
                    <item.icon className="h-[18px] w-[18px]" />
                    {item.label}
                    {active && (
                      <>
                        <span className="absolute inset-0 rounded-lg bg-white/[0.08]" />
                        <span className="absolute -bottom-[2px] left-2 right-2 h-[3px] rounded-full bg-[#2DD4BF]" />
                      </>
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
                          'relative flex items-center transition-all',
                          groupActive ? 'text-white' : 'text-[#B0C4C0] hover:text-white'
                        )}
                        style={{ height: '40px', fontSize: '13px', fontWeight: 500, gap: '6px', padding: '0 10px', borderRadius: '8px' }}
                      >
                        <group.icon className="h-[18px] w-[18px]" />
                        {group.label}
                        <ChevronDown className="h-3 w-3" />
                        {groupActive && (
                          <>
                            <span className="absolute inset-0 rounded-lg bg-white/[0.08]" />
                            <span className="absolute -bottom-[2px] left-2 right-2 h-[3px] rounded-full bg-[#2DD4BF]" />
                          </>
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 border-white/10" style={{ background: 'linear-gradient(135deg, #0A2A2A 0%, #0F3D38 100%)' }}>
                      {group.items.map(renderDropdownItem)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              })}

              {/* More dropdown */}
              {visibleCore.slice(5).length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        'relative flex items-center transition-all',
                        visibleCore.slice(5).some((item) => matches(pathname, item.href)) ? 'text-white' : 'text-[#B0C4C0] hover:text-white'
                      )}
                      style={{ height: '40px', fontSize: '13px', fontWeight: 500, gap: '6px', padding: '0 10px', borderRadius: '8px' }}
                    >
                      بیشتر
                      <ChevronDown className="h-3 w-3" />
                      {visibleCore.slice(5).some((item) => matches(pathname, item.href)) && (
                        <span className="absolute -bottom-[2px] left-2 right-2 h-[3px] rounded-full bg-[#2DD4BF]" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 border-white/10" style={{ background: 'linear-gradient(135deg, #0A2A2A 0%, #0F3D38 100%)' }}>
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
                        'relative flex items-center transition-all',
                        visibleAdmin.some((item) => matches(pathname, item.href)) ? 'text-white' : 'text-[#B0C4C0] hover:text-white'
                      )}
                      style={{ height: '40px', fontSize: '13px', fontWeight: 500, gap: '6px', padding: '0 10px', borderRadius: '8px' }}
                    >
                      <Shield className="h-[18px] w-[18px]" />
                      مدیریت
                      <ChevronDown className="h-3 w-3" />
                      {visibleAdmin.some((item) => matches(pathname, item.href)) && (
                        <span className="absolute -bottom-[2px] left-2 right-2 h-[3px] rounded-full bg-[#2DD4BF]" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 border-white/10" style={{ background: 'linear-gradient(135deg, #0A2A2A 0%, #0F3D38 100%)' }}>
                    {visibleAdmin.map(renderDropdownItem)}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {isSuperAdmin && (
                <Link
                  href="/super-admin"
                  className={cn(
                    'relative flex items-center transition-all',
                    matches(pathname, '/super-admin') ? 'text-white' : 'text-[#B0C4C0] hover:text-white'
                  )}
                  style={{ height: '40px', fontSize: '13px', fontWeight: 500, gap: '6px', padding: '0 10px', borderRadius: '8px' }}
                >
                  <Shield className="h-[18px] w-[18px]" />
                  سوپرادمین
                  {matches(pathname, '/super-admin') && (
                    <span className="absolute -bottom-[2px] left-2 right-2 h-[3px] rounded-full bg-[#2DD4BF]" />
                  )}
                </Link>
              )}
            </nav>

            {/* Laptop compact nav removed — inline nav now shows at ≥1024px */}
            <div className="hidden xl:hidden" />
          </div>

          {/* Left side: notifications + profile + hamburger */}
          <div className="flex items-center gap-2.5 lg:gap-3">
            {/* Notifications */}
            <div className="relative">
              <NotificationBell variant="super-admin" />
            </div>

            {/* Profile dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-xl p-1 transition-colors hover:bg-white/10">
                  <Avatar className="h-10 w-10 border-2 border-[#2DD4BF]/40">
                    <AvatarImage src={profile?.avatarUrl || undefined} alt={displayName} />
                    <AvatarFallback className="bg-[#2DD4BF] text-xs font-bold text-[#0A2A2A]">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="hidden text-right lg:block">
                    <div className="text-xs font-bold text-white">{displayName}</div>
                    <div className="text-[10px] text-[#6BA89E]">{roleLabel}</div>
                  </div>
                  <ChevronDown className="hidden h-3.5 w-3.5 text-[#6BA89E] lg:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 border-white/10" style={{ background: 'linear-gradient(135deg, #0A2A2A 0%, #0F3D38 100%)' }}>
                <DropdownMenuLabel>
                  <div className="text-sm font-bold text-white">{displayName}</div>
                  <div className="text-xs font-normal text-[#6BA89E]">{roleLabel}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#B0C4C0] hover:text-white">
                    <User className="h-4 w-4 text-[#6BA89E]" />
                    پروفایل من
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#B0C4C0] hover:text-white">
                    <Settings className="h-4 w-4 text-[#6BA89E]" />
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

            {/* Hamburger (tablet + mobile) */}
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile/tablet drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-[70] flex w-full max-w-[320px] flex-col shadow-2xl transition-transform duration-300 lg:hidden',
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        dir="rtl"
        style={{ background: 'linear-gradient(180deg, #0A2A2A 0%, #0F3D38 100%)' }}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4" style={{ height: '60px' }}>
          <Logo size={36} withText={false} />
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/60 hover:bg-white/10"
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
                    'flex items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-colors',
                    active ? 'bg-[#2DD4BF]/15 text-[#2DD4BF]' : 'text-[#B0C4C0] hover:bg-white/5'
                  )}
                  style={{ height: '46px' }}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="my-3 border-t border-white/10" />
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
                'mt-2 flex items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-colors',
                matches(pathname, '/super-admin') ? 'bg-[#2DD4BF]/15 text-[#2DD4BF]' : 'text-[#B0C4C0] hover:bg-white/5'
              )}
              style={{ height: '46px' }}
            >
              <Shield className="h-4 w-4 shrink-0" />
              پنل سوپرادمین
            </Link>
          )}
        </nav>
        <div className="border-t border-white/10 p-3">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 text-[13px] font-medium text-red-400 transition-colors hover:bg-red-500/10"
            style={{ height: '46px' }}
          >
            <LogOut className="h-4 w-4" />
            خروج از حساب
          </button>
        </div>
      </aside>
    </>
  );
}

export { DashboardNavbar as Navbar };
