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
} from 'lucide-react';
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
        <div className="flex items-center justify-between gap-3 px-4 lg:px-5 xl:px-8" style={{ height: '64px' }}>
          {/* Right side: toggle + logo */}
          <div className="flex items-center gap-3">
            {/* Sidebar toggle button */}
            <button
              onClick={onToggleSidebar}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              aria-label={sidebarOpen ? 'بستن منو' : 'باز کردن منو'}
            >
              {sidebarOpen ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
            </button>

            <Link href={logoHref} className="flex items-center transition-transform hover:scale-105">
              <Logo size={44} withText textClassName="hidden sm:block [&_div]:text-white [&_.text-muted-foreground]:text-[#6BA89E]" />
            </Link>
          </div>

          {/* Center: Search bar */}
          <div className="flex-1 max-w-md hidden sm:block">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex w-full items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/50 transition-colors hover:bg-white/10 hover:text-white/70"
            >
              <Search className="h-4 w-4" />
              <span>جستجوی صفحات...</span>
              <kbd className="mr-auto hidden rounded border border-white/20 px-1.5 py-0.5 text-[10px] text-white/40 lg:inline-block">Ctrl+K</kbd>
            </button>
          </div>

          {/* Mobile search icon */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:hidden"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Left side: notifications + profile */}
          <div className="flex items-center gap-2.5">
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
