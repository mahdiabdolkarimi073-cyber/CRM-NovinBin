import Navbar from '@/components/landing/home/Navbar';
import Footer from '@/components/landing/home/Footer';
import WarehouseHero from '@/components/landing/warehouse/Hero';
import WarehouseIntro from '@/components/landing/warehouse/Intro';
import WarehouseFeatures from '@/components/landing/warehouse/Features';
import WarehouseProcess from '@/components/landing/warehouse/Process';
import WarehouseStats from '@/components/landing/warehouse/Stats';
import WarehouseBenefits from '@/components/landing/warehouse/Benefits';
import WarehouseFAQ from '@/components/landing/warehouse/FAQ';
import WarehouseCTA from '@/components/landing/warehouse/CTA';

export const metadata = {
  title: 'انبارداری | مدیریت موجودی کالا، سفارش‌ها و فرآیندهای انبار یکپارچه | نوین بین',
  description:
    'پلتفرم انبارداری نوین بین؛ مدیریت موجودی کالا، ورود و خروج انبار، سفارش‌ها، رسید و حواله، موجودی لحظه‌ای و گزارش‌های انبار در یک سیستم یکپارچه.',
  keywords: [
    'انبارداری',
    'مدیریت انبار',
    'موجودی کالا',
    'ورود و خروج انبار',
    'رسید و حواله',
    'مدیریت سفارش',
    'موجودی لحظه‌ای',
    'یکپارچه‌سازی انبار',
    'نوین بین',
  ],
  openGraph: {
    title: 'انبارداری | مدیریت موجودی کالا، سفارش‌ها و فرآیندهای انبار یکپارچه | نوین بین',
    description:
      'با پلتفرم انبارداری نوین بین، موجودی کالا، ورود و خروج، سفارش‌ها و گزارش‌های انبار را در یک سیستم یکپارچه مدیریت کنید.',
    type: 'website',
    locale: 'fa_IR',
  },
  alternates: {
    canonical: '/warehouse',
  },
};

export default function WarehousePage() {
  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-white text-[#10286d]">
      <Navbar />
      <WarehouseHero />
      <WarehouseIntro />
      <WarehouseFeatures />
      <WarehouseProcess />
      <WarehouseStats />
      <WarehouseBenefits />
      <WarehouseFAQ />
      <WarehouseCTA />
      <Footer />
    </main>
  );
}
