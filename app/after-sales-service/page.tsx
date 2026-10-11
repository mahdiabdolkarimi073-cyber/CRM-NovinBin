import Navbar from '@/components/landing/home/Navbar';
import Footer from '@/components/landing/home/Footer';
import AfterSalesHero from '@/components/landing/after-sales/Hero';
import AfterSalesIntro from '@/components/landing/after-sales/Intro';
import AfterSalesFeatures from '@/components/landing/after-sales/Features';
import AfterSalesProcess from '@/components/landing/after-sales/Process';
import AfterSalesBenefits from '@/components/landing/after-sales/Benefits';
import AfterSalesStats from '@/components/landing/after-sales/Stats';
import AfterSalesFAQ from '@/components/landing/after-sales/FAQ';
import AfterSalesCTA from '@/components/landing/after-sales/CTA';

export const metadata = {
  title: 'خدمات پس از فروش | مدیریت درخواست‌ها و رضایت مشتریان | نوین بین',
  description:
    'سیستم مدیریت خدمات پس از فروش نوین بین؛ مدیریت درخواست‌ها، پیگیری رضایت مشتریان، ثبت تیکت، نظرسنجی و ارائه خدمات بهتر. پلتفرمی هوشمند برای افزایش رضایت و وفاداری مشتریان شما.',
  keywords: [
    'خدمات پس از فروش',
    'مدیریت درخواست‌ها',
    'رضایت مشتری',
    'سیستم تیکتینگ',
    'پشتیبانی مشتری',
    'مدیریت شکایات',
    'نظرسنجی مشتری',
    'CRM خدمات پس از فروش',
    'پیگیری درخواست',
    'نوین بین',
  ],
  openGraph: {
    title: 'خدمات پس از فروش | مدیریت درخواست‌ها و رضایت مشتریان | نوین بین',
    description:
      'با پلتفرم خدمات پس از فروش نوین بین، درخواست‌های مشتریان را هوشمندانه مدیریت کنید، رضایت آن‌ها را بسنجید و خدمات بهتری ارائه دهید.',
    type: 'website',
    locale: 'fa_IR',
  },
  alternates: {
    canonical: '/after-sales-service',
  },
};

export default function AfterSalesServicePage() {
  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-white text-[#10286d]">
      <Navbar />
      <AfterSalesHero />
      <AfterSalesIntro />
      <AfterSalesFeatures />
      <AfterSalesProcess />
      <AfterSalesStats />
      <AfterSalesBenefits />
      <AfterSalesFAQ />
      <AfterSalesCTA />
      <Footer />
    </main>
  );
}
