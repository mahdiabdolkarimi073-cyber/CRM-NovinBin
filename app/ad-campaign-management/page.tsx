import Navbar from '@/components/landing/home/Navbar';
import Footer from '@/components/landing/home/Footer';
import AdCampaignHero from '@/components/landing/ad-campaign/Hero';
import AdCampaignIntro from '@/components/landing/ad-campaign/Intro';
import AdCampaignFeatures from '@/components/landing/ad-campaign/Features';
import AdCampaignProcess from '@/components/landing/ad-campaign/Process';
import AdCampaignBenefits from '@/components/landing/ad-campaign/Benefits';
import AdCampaignStats from '@/components/landing/ad-campaign/Stats';
import AdCampaignFAQ from '@/components/landing/ad-campaign/FAQ';
import AdCampaignCTA from '@/components/landing/ad-campaign/CTA';

export const metadata = {
  title: 'مدیریت کمپین‌های تبلیغاتی | تحلیل عملکرد و بهینه‌سازی کمپین | نوین بین',
  description:
    'پلتفرم مدیریت کمپین‌های تبلیغاتی نوین بین؛ طراحی و اجرای کمپین، تحلیل لحظه‌ای عملکرد، بهینه‌سازی بودجه و افزایش بازگشت سرمایه. مدیریت کامل فرآیندهای تبلیغاتی در یک سیستم یکپارچه.',
  keywords: [
    'مدیریت کمپین تبلیغاتی',
    'تحلیل عملکرد کمپین',
    'بهینه‌سازی کمپین',
    'مدیریت فرآیند تبلیغات',
    'بازگشت سرمایه تبلیغات',
    'داشبورد تبلیغات',
    'کمپین دیجیتال',
    'تبلیغات داده‌محور',
    'CRM تبلیغات',
    'نوین بین',
  ],
  openGraph: {
    title: 'مدیریت کمپین‌های تبلیغاتی | تحلیل عملکرد و بهینه‌سازی کمپین | نوین بین',
    description:
      'با پلتفرم مدیریت کمپین‌های تبلیغاتی نوین بین، فرآیندهای تبلیغاتی خود را به‌صورت کامل مدیریت کنید، عملکرد را تحلیل کنید و بودجه را بهینه کنید.',
    type: 'website',
    locale: 'fa_IR',
  },
  alternates: {
    canonical: '/ad-campaign-management',
  },
};

export default function AdCampaignManagementPage() {
  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-white text-[#10286d]">
      <Navbar />
      <AdCampaignHero />
      <AdCampaignIntro />
      <AdCampaignFeatures />
      <AdCampaignProcess />
      <AdCampaignStats />
      <AdCampaignBenefits />
      <AdCampaignFAQ />
      <AdCampaignCTA />
      <Footer />
    </main>
  );
}
