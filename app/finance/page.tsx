import Navbar from '@/components/landing/home/Navbar';
import Footer from '@/components/landing/home/Footer';
import FinanceHero from '@/components/landing/finance-landing/Hero';
import FinanceIntro from '@/components/landing/finance-landing/Intro';
import FinanceFeatures from '@/components/landing/finance-landing/Features';
import FinanceProcess from '@/components/landing/finance-landing/Process';
import FinanceStats from '@/components/landing/finance-landing/Stats';
import FinanceBenefits from '@/components/landing/finance-landing/Benefits';
import FinanceFAQ from '@/components/landing/finance-landing/FAQ';
import FinanceCTA from '@/components/landing/finance-landing/CTA';

export const metadata = {
  title: 'مدیریت مالی | اطلاعات مالی، فروش و تراکنش‌ها در یک سیستم یکپارچه | نوین بین',
  description:
    'پلتفرم مدیریت مالی نوین بین؛ حسابداری، صدور فاکتور، مدیریت پرداخت‌ها، چک‌ها، خزانه‌داری و گزارش‌های مالی در یک سیستم یکپارچه. اتصال مستقیم مالی به فروش و انبار.',
  keywords: [
    'مدیریت مالی',
    'حسابداری',
    'صدور فاکتور',
    'مدیریت چک',
    'خزانه‌داری',
    'گزارش مالی',
    'یکپارچه‌سازی مالی',
    'مدیریت تراکنش',
    'نوین بین',
  ],
  openGraph: {
    title: 'مدیریت مالی | اطلاعات مالی، فروش و تراکنش‌ها در یک سیستم یکپارچه | نوین بین',
    description:
      'با پلتفرم مدیریت مالی نوین بین، حسابداری، فاکتور، چک، خزانه‌داری و گزارش‌های مالی را در یک سیستم یکپارچه مدیریت کنید.',
    type: 'website',
    locale: 'fa_IR',
  },
  alternates: {
    canonical: '/finance',
  },
};

export default function FinancePage() {
  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-white text-[#10286d]">
      <Navbar />
      <FinanceHero />
      <FinanceIntro />
      <FinanceFeatures />
      <FinanceProcess />
      <FinanceStats />
      <FinanceBenefits />
      <FinanceFAQ />
      <FinanceCTA />
      <Footer />
    </main>
  );
}
