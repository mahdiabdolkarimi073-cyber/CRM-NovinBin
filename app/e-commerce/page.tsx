import Navbar from '@/components/landing/home/Navbar';
import Footer from '@/components/landing/home/Footer';
import ECommerceHero from '@/components/landing/e-commerce/Hero';
import ECommerceIntro from '@/components/landing/e-commerce/Intro';
import ECommerceFeatures from '@/components/landing/e-commerce/Features';
import ECommerceProcess from '@/components/landing/e-commerce/Process';
import ECommerceStats from '@/components/landing/e-commerce/Stats';
import ECommerceBenefits from '@/components/landing/e-commerce/Benefits';
import ECommerceFAQ from '@/components/landing/e-commerce/FAQ';
import ECommerceCTA from '@/components/landing/e-commerce/CTA';

export const metadata = {
  title: 'تجارت الکترونیک | یکپارچه‌سازی فروش اینترنتی با فرآیندهای سازمان | نوین بین',
  description:
    'پلتفرم تجارت الکترونیک نوین بین؛ مدیریت فروشگاه آنلاین، سفارش‌ها، پرداخت، انبار و ارسال در یک سیستم یکپارچه. اتصال مستقیم فروش اینترنتی به CRM، انبار و مالی.',
  keywords: [
    'تجارت الکترونیک',
    'فروشگاه آنلاین',
    'مدیریت سفارش',
    'پرداخت آنلاین',
    'یکپارچه‌سازی فروش',
    'فروش اینترنتی',
    'CRM تجارت الکترونیک',
    'مدیریت فروشگاه',
    'نوین بین',
  ],
  openGraph: {
    title: 'تجارت الکترونیک | یکپارچه‌سازی فروش اینترنتی با فرآیندهای سازمان | نوین بین',
    description:
      'با پلتفرم تجارت الکترونیک نوین بین، فروشگاه آنلاین خود را به CRM، انبار و مالی متصل کنید و تمام فرآیند فروش را یکپارچه مدیریت کنید.',
    type: 'website',
    locale: 'fa_IR',
  },
  alternates: {
    canonical: '/e-commerce',
  },
};

export default function ECommercePage() {
  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-white text-[#10286d]">
      <Navbar />
      <ECommerceHero />
      <ECommerceIntro />
      <ECommerceFeatures />
      <ECommerceProcess />
      <ECommerceStats />
      <ECommerceBenefits />
      <ECommerceFAQ />
      <ECommerceCTA />
      <Footer />
    </main>
  );
}
