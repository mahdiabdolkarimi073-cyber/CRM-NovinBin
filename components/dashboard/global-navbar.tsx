'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem,
} from '@/components/ui/command';
import {
  Menu, Search, Bell, User, Settings, LogOut, ChevronDown,
  PanelRightClose, PanelRightOpen,
  Inbox, Shield, Calendar, Archive, Phone, Palette, LayoutDashboard,
} from 'lucide-react';
import { ThemeToggle } from '@/components/dashboard/theme-toggle';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/dashboard/logo';
import { NotificationBell } from '@/components/dashboard/notification-bell';
import {
  coreItems, cartableItems, financeItems, inventoryItems, clubItems, adminItems,
  reportsItems, salesItems, serviceItems, isSuperAdminRole, filterByAccess,
  type NavItem,
} from '@/lib/nav-config';

const STORAGE_KEY = 'sb-open';

interface GlobalNavbarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  variant?: 'dashboard' | 'super-admin';
}

export function GlobalNavbar({ sidebarOpen, onToggleSidebar, variant = 'dashboard' }: GlobalNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  const isSuperAdmin = isSuperAdminRole(profile?.role);

  const displayName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : 'کاربر';
  const initials = (profile?.firstName?.[0] || 'ن').toUpperCase();
  const roleLabel = isSuperAdmin ? 'سوپرادمین' : profile?.role === 'admin' ? 'مدیر' : 'پرسنل سازمان';

  const allItems: NavItem[] = [
    ...filterByAccess(profile, coreItems),
    ...filterByAccess(profile, cartableItems),
    ...filterByAccess(profile, financeItems),
    ...filterByAccess(profile, inventoryItems),
    ...filterByAccess(profile, clubItems),
    ...filterByAccess(profile, adminItems),
    ...filterByAccess(profile, reportsItems),
    ...filterByAccess(profile, salesItems),
    ...filterByAccess(profile, serviceItems),
  ];

  // Deduplicate by href
  const uniqueItems = allItems.filter((item, index, self) =>
    index === self.findIndex((t) => t.href === item.href)
  );

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const handleSearchSelect = (href: string) => {
    setSearchOpen(false);
    router.push(href);
  };

  const logoHref = variant === 'super-admin' ? '/super-admin' : (isSuperAdmin ? '/super-admin' : '/dashboard');

  const visibleCartable = filterByAccess(profile, cartableItems);
  const visibleAdmin = filterByAccess(profile, adminItems);

  const meetingItems: NavItem[] = [
    { href: '/dashboard/meetings', label: 'جلسات', icon: Calendar },
    { href: '/dashboard/meetings/archive', label: 'آرشیو جلسات', icon: Archive },
    { href: '/dashboard/calls', label: 'مکالمات', icon: Phone },
    { href: '/dashboard/graphic-works', label: 'کارهای گرافیک', icon: Palette },
  ];
  const visibleMeetings = filterByAccess(profile, meetingItems);

  const matches = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  const renderDropdownItem = (item: NavItem) => {
    const active = matches(item.href);
    return (
      <DropdownMenuItem key={item.href} asChild>
        <Link
          href={item.href}
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors',
            active ? 'text-[#2DD4BF]' : 'nb-dropdown-item'
          )}
        >
          <item.icon className="h-4 w-4 shrink-0 nb-text-muted" />
          {item.label}
        </Link>
      </DropdownMenuItem>
    );
  };

  const navDropdownStyle = 'relative flex items-center transition-all nb-text-muted nb-hover';
  const navDropdownItemStyle = { height: '40px', fontSize: '13px', fontWeight: 500, gap: '6px', padding: '0 10px', borderRadius: '8px' } as const;

  return (
    <>
      <header
        className="dashboard-navbar sticky top-0 z-50 w-full shadow-lg"
        dir="rtl"
        style={{
          borderRadius: '0 0 12px 12px',
        }}
      >
        <div className="flex items-center justify-between gap-2 px-3 mobile:gap-3 tablet:px-4 laptop:px-5 desktop:px-8" style={{ height: '64px' }}>
          {/* Right side: toggle + logo */}
          <div className="flex items-center gap-3">
            {/* Sidebar toggle button */}
            <button
              onClick={onToggleSidebar}
              className="flex h-10 w-10 items-center justify-center rounded-xl border nb-btn-icon"
              aria-label={sidebarOpen ? 'بستن منو' : 'باز کردن منو'}
            >
              {sidebarOpen ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
            </button>

            <Link href={logoHref} className="flex items-center transition-transform hover:scale-105">
              <Logo size={88} withText textClassName="hidden tablet:block [&_div]:!text-[var(--nav-text)] [&_.text-muted-foreground]:!text-[var(--nav-text-muted)]" />
            </Link>
            {variant === 'super-admin' && (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-xl border nb-btn-icon px-4 h-10 text-[13px] font-semibold"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden tablet:inline">بازگشت به CRM</span>
              </Link>
            )}
          </div>

          {/* Center: Search bar */}
          <div className="flex-1 max-w-md hidden tablet:block laptop:max-w-sm desktop:max-w-md">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex w-full items-center gap-2 rounded-xl border nb-input px-3 py-2 text-sm nb-text-muted transition-colors nb-hover"
            >
              <Search className="h-4 w-4" />
              <span>جستجوی صفحات...</span>
              <kbd className="mr-auto hidden rounded border nb-border px-1.5 py-0.5 text-[10px] nb-text-muted desktop:inline-block">Ctrl+K</kbd>
            </button>
          </div>

          {/* Mobile search icon */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border nb-btn-icon tablet:hidden"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Quick nav dropdowns */}
          <nav className="hidden items-center gap-1 laptop:flex">
            {/* Cartable dropdown */}
            {visibleCartable.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(navDropdownStyle, visibleCartable.some((item) => matches(item.href)) && 'nb-text')}
                    style={navDropdownItemStyle}
                  >
                    <Inbox className="h-[18px] w-[18px]" />
                    کارتابل من
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 nb-dropdown max-h-[400px] overflow-y-auto">
                  {visibleCartable.map(renderDropdownItem)}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Meetings dropdown */}
            {visibleMeetings.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(navDropdownStyle, visibleMeetings.some((item) => matches(item.href)) && 'nb-text')}
                    style={navDropdownItemStyle}
                  >
                    <Calendar className="h-[18px] w-[18px]" />
                    جلسات
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 nb-dropdown">
                  {visibleMeetings.map(renderDropdownItem)}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Admin dropdown */}
            {visibleAdmin.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(navDropdownStyle, visibleAdmin.some((item) => matches(item.href)) && 'nb-text')}
                    style={navDropdownItemStyle}
                  >
                    <Shield className="h-[18px] w-[18px]" />
                    مدیریت
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 nb-dropdown">
                  {visibleAdmin.map(renderDropdownItem)}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>

          {/* Left side: notifications + profile */}
          <div className="flex items-center gap-2.5">
            {/* Theme toggle */}
            <ThemeToggle />

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
                  <div className="hidden text-right laptop:block">
                    <div className="text-xs font-bold nb-text">{displayName}</div>
                    <div className="text-[10px] nb-text-muted">{roleLabel}</div>
                  </div>
                  <ChevronDown className="hidden h-3.5 w-3.5 nb-text-muted laptop:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 nb-dropdown">
                <DropdownMenuLabel>
                  <div className="text-sm font-bold nb-text">{displayName}</div>
                  <div className="text-xs font-normal nb-text-muted">{roleLabel}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="flex items-center gap-2.5 px-3 py-2 text-[13px] nb-dropdown-item">
                    <User className="h-4 w-4 nb-text-muted" />
                    پروفایل من
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="flex items-center gap-2.5 px-3 py-2 text-[13px] nb-dropdown-item">
                    <Settings className="h-4 w-4 nb-text-muted" />
                    تنظیمات
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
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
      </header>

      {/* Search Command Dialog */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="جستجوی صفحه..." />
        <CommandList>
          <CommandEmpty>صفحه‌ای یافت نشد</CommandEmpty>
          <CommandGroup heading="صفحات">
            {uniqueItems.map((item) => (
              <CommandItem
                key={item.href}
                value={`${item.label} ${item.href}`}
                onSelect={() => handleSearchSelect(item.href)}
                className="gap-2.5"
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
