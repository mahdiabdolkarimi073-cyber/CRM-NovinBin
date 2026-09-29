import Navbar from '@/components/home/Navbar';
import Footer from '@/components/home/Footer';
import AfterSalesHero from '@/components/after-sales/Hero';
import AfterSalesIntro from '@/components/after-sales/Intro';
import AfterSalesFeatures from '@/components/after-sales/Features';
import AfterSalesProcess from '@/components/after-sales/Process';
import AfterSalesBenefits from '@/components/after-sales/Benefits';
import AfterSalesStats from '@/components/after-sales/Stats';
import AfterSalesFAQ from '@/components/after-sales/FAQ';
import AfterSalesCTA from '@/components/after-sales/CTA';

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
