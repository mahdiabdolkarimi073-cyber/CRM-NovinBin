import {
  LayoutDashboard, Users, TrendingUp, CheckSquare, Package, ShoppingCart,
  Calendar, MessageSquare, Bell, UserCog, Phone, Clock, FileSignature,
  UserPlus, HandHeart, Settings, Shield, Award, Send, MessagesSquare,
  Inbox, Receipt, FileOutput, WalletCards, BarChart3, Warehouse, Boxes,
  ShoppingBag, Landmark, FileText, ArrowDownToLine, RotateCcw,
  GraduationCap, BadgePercent, Ticket, StickyNote, MessageCircle,
  UserCheck, ClipboardList, Network, Contact, Megaphone, Wallet,
  FileCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Profile } from '@/lib/types';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

export const coreItems: NavItem[] = [
  { href: '/dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { href: '/dashboard/my-customers', label: 'مشتریان من', icon: UserCheck },
  { href: '/dashboard/leads', label: 'سرنخ‌های فروش', icon: TrendingUp },
  { href: '/dashboard/orders', label: 'سفارشات', icon: ShoppingCart },
  { href: '/dashboard/meetings', label: 'جلسات', icon: Calendar },
  { href: '/dashboard/calls', label: 'مکالمات', icon: Phone },
  { href: '/dashboard/demos', label: 'دموها', icon: Clock },
  { href: '/dashboard/contracts', label: 'قراردادها', icon: FileSignature },
  { href: '/dashboard/hr', label: 'منابع انسانی', icon: UserCog },
  { href: '/dashboard/notes', label: 'یادداشت‌ها', icon: StickyNote },
  { href: '/dashboard/staff-chat', label: 'چت پرسنل', icon: MessageCircle },
  { href: '/dashboard/notifications', label: 'اعلان‌ها', icon: Bell },
  { href: '/dashboard/settings', label: 'تنظیمات', icon: Settings },
];

export const cartableItems: NavItem[] = [
  { href: '/dashboard/invoices', label: 'فاکتورها', icon: FileText },
  { href: '/dashboard/pre-invoices', label: 'پیش‌فاکتور', icon: FileOutput },
  { href: '/dashboard/returns', label: 'مرجوعی', icon: RotateCcw },
  { href: '/dashboard/payments', label: 'پرداخت‌ها', icon: WalletCards },
  { href: '/dashboard/receipts', label: 'دریافت‌ها', icon: ArrowDownToLine },
  { href: '/dashboard/customers-chat', label: 'چت مشتری', icon: Send },
  { href: '/dashboard/tickets', label: 'تیکت‌ها', icon: MessageSquare },
  { href: '/dashboard/tasks', label: 'تسک‌ها', icon: CheckSquare },
  { href: '/dashboard/doc-issuance-workboard', label: 'کارتابل صدور سند', icon: FileCheck },
];

export const financeItems: NavItem[] = [
  { href: '/dashboard/accounting', label: 'حسابداری', icon: Landmark },
  { href: '/dashboard/chart-of-accounts', label: 'حسابواره', icon: Network },
  { href: '/dashboard/contact-parties', label: 'طرف حساب', icon: Contact },
  { href: '/dashboard/payment-announcements', label: 'اعلامیه‌های پرداخت', icon: Megaphone },
  { href: '/dashboard/petty-cash', label: 'تنخواه‌دار', icon: Wallet },
  { href: '/dashboard/petty-cash-expenses', label: 'صورت هزینه تنخواه', icon: FileText },
  { href: '/dashboard/petty-cash-merge', label: 'صورت ادغام اسناد', icon: FileText },
  { href: '/dashboard/document-issuance', label: 'صدور اسناد', icon: FileText },
  { href: '/dashboard/contact-settlements', label: 'تسویه حساب طرف مقابل', icon: FileCheck },
  { href: '/dashboard/received-cheques', label: 'چک‌های دریافتی', icon: WalletCards },
  { href: '/dashboard/bank-accounts', label: 'حساب‌های بانکی', icon: Landmark },
  { href: '/dashboard/financial-reports', label: 'گزارش‌های مالی', icon: BarChart3 },
  { href: '/dashboard/finance-academy', label: 'مالی آموزشگاه', icon: GraduationCap },
  { href: '/dashboard/invoices', label: 'فاکتورها', icon: FileText },
  { href: '/dashboard/pre-invoices', label: 'پیش‌فاکتور', icon: FileOutput },
  { href: '/dashboard/payments', label: 'پرداخت‌ها', icon: WalletCards },
  { href: '/dashboard/receipts', label: 'دریافت‌ها', icon: Receipt },
  { href: '/dashboard/returns', label: 'مرجوعی‌ها', icon: RotateCcw },
];

export const inventoryItems: NavItem[] = [
  { href: '/dashboard/inventory', label: 'نمای کلی انبار', icon: Warehouse },
  { href: '/dashboard/products', label: 'محصولات و خدمات', icon: Boxes },
  { href: '/dashboard/purchase', label: 'خرید و تأمین', icon: ShoppingBag },
  { href: '/dashboard/stock-transfers', label: 'انتقال بین انبارها', icon: Package },
];

export const clubItems: NavItem[] = [
  { href: '/dashboard/customers', label: 'مشتریان', icon: Users },
  { href: '/dashboard/customer-segments', label: 'بخش‌بندی مشتریان', icon: BadgePercent },
  { href: '/dashboard/loyalty', label: 'امتیاز و وفاداری', icon: Award },
  { href: '/dashboard/loyalty-rewards', label: 'جوایز باشگاه', icon: Award },
  { href: '/dashboard/customer-interactions', label: 'تعاملات مشتری', icon: MessagesSquare },
];

export const adminItems: NavItem[] = [
  { href: '/dashboard/users', label: 'کاربران', icon: UserCog },
  { href: '/dashboard/registration-approval', label: 'تأیید ثبت‌نام', icon: UserPlus },
  { href: '/dashboard/customer-assignment', label: 'تخصیص مشتری', icon: HandHeart },
];

export const reportsItems: NavItem[] = [
  { href: '/dashboard/work-reports/daily', label: 'گزارش روزانه', icon: CheckSquare },
  { href: '/dashboard/work-reports/monthly', label: 'گزارش ماهانه', icon: CheckSquare },
];

export const allNavGroups: NavGroup[] = [
  { label: 'کارتابل', icon: Inbox, items: cartableItems },
  { label: 'گزارشات', icon: ClipboardList, items: reportsItems },
  { label: 'مالی', icon: Landmark, items: financeItems },
  { label: 'انبارداری', icon: Warehouse, items: inventoryItems },
  { label: 'باشگاه مشتریان', icon: Award, items: clubItems },
];

export const quickActionItems: NavItem[] = [
  { href: '/dashboard/tickets', label: 'تیکت جدید', icon: Ticket },
  { href: '/dashboard/leads', label: 'فرصت جدید', icon: Users },
  { href: '/dashboard/customers', label: 'مشتری جدید', icon: Users },
  { href: '/dashboard/invoices', label: 'پیش فاکتور', icon: Receipt },
  { href: '/dashboard/orders', label: 'سفارش جدید', icon: ShoppingCart },
  { href: '/dashboard/contracts', label: 'قرارداد جدید', icon: FileSignature },
  { href: '/dashboard/products', label: 'محصول جدید', icon: Package },
  { href: '/dashboard/calls', label: 'کمپین جدید', icon: Phone },
  { href: '/dashboard/tasks', label: 'تسک جدید', icon: CheckSquare },
  { href: '/dashboard/settings', label: 'تنظیمات سریع', icon: Settings },
  { href: '/dashboard/meetings', label: 'جلسه جدید', icon: Calendar },
  { href: '/dashboard/financial-reports', label: 'گزارش‌ها', icon: BarChart3 },
];

export function isSuperAdminRole(role?: string | null): boolean {
  return role === 'owner' || role === 'super_admin';
}

export const UNIVERSAL_PAGES = new Set([
  '/dashboard',
  '/dashboard/notes',
  '/dashboard/staff-chat',
  '/dashboard/my-customers',
  '/dashboard/settings',
  '/dashboard/notifications',
]);

export function hasPageAccess(profile: Profile | null, href: string): boolean {
  if (!profile) return false;
  if (isSuperAdminRole(profile.role)) return true;
  if (UNIVERSAL_PAGES.has(href)) return true;
  const pages = profile.assignedPages || [];
  if (pages.length === 0) return false;
  return pages.some((p) => p === href || href.startsWith(p + '/'));
}

export function filterByAccess(profile: Profile | null, items: NavItem[]): NavItem[] {
  if (!profile) return [];
  if (isSuperAdminRole(profile.role)) return items;
  return items.filter((item) => hasPageAccess(profile, item.href));
}
