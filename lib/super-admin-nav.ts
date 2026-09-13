import {
  LayoutDashboard, Building2, Package, CreditCard, Receipt,
  Settings, FileCheck, ClipboardList, Gauge, Palette,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface SuperAdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const superAdminNavItems: SuperAdminNavItem[] = [
  { href: '/super-admin', label: 'داشبورد', icon: LayoutDashboard },
  { href: '/super-admin/work-reports', label: 'گزارش‌های کار', icon: ClipboardList },
  { href: '/super-admin/site-verifications', label: 'تاییدیه‌های سایت', icon: FileCheck },
  { href: '/super-admin/tenants', label: 'سازمان‌ها', icon: Building2 },
  { href: '/super-admin/plans', label: 'پلن‌ها', icon: Package },
  { href: '/super-admin/modules', label: 'ماژول‌ها', icon: Package },
  { href: '/super-admin/subscriptions', label: 'اشتراک‌ها', icon: CreditCard },
  { href: '/super-admin/billing', label: 'صورتحساب', icon: Receipt },
  { href: '/super-admin/usage', label: 'مصرف منابع', icon: Gauge },
  { href: '/super-admin/graphic-works-access', label: 'دسترسی کارهای گرافیک', icon: Palette },
  { href: '/super-admin/settings', label: 'تنظیمات', icon: Settings },
];
