import Navbar from '@/components/landing/home/Navbar';
import Footer from '@/components/landing/home/Footer';
import AdManagementHero from '@/components/landing/ad-management/Hero';
import AdManagementIntro from '@/components/landing/ad-management/Intro';
import AdManagementFeatures from '@/components/landing/ad-management/Features';
import AdManagementProcess from '@/components/landing/ad-management/Process';
import AdManagementBenefits from '@/components/landing/ad-management/Benefits';
import AdManagementStats from '@/components/landing/ad-management/Stats';
import AdManagementFAQ from '@/components/landing/ad-management/FAQ';
import AdManagementCTA from '@/components/landing/ad-management/CTA';

export const metadata = {
  title: 'مدیریت تبلیغات | افزایش جذب مشتری و بهینه‌سازی کمپین‌ها | نوین بین',
  description:
    'پلتفرم مدیریت تبلیغات نوین بین؛ طراحی و انتشار کمپین، پایش لحظه‌ای عملکرد، بهینه‌سازی بودجه و افزایش نرخ تبدیل. جذب مشتری بیشتر با هزینه هوشمندتر.',
  keywords: [
    'مدیریت تبلیغات',
    'کمپین تبلیغاتی',
    'افزایش جذب مشتری',
    'بهینه‌سازی کمپین',
    'تبلیغات دیجیتال',
    'تبلیغات داده‌محور',
    'نرخ تبدیل تبلیغات',
    'مدیریت بودجه تبلیغاتی',
    'CRM تبلیغات',
    'نوین بین',
  ],
  openGraph: {
    title: 'مدیریت تبلیغات | افزایش جذب مشتری و بهینه‌سازی کمپین‌ها | نوین بین',
    description:
      'با پلتفرم مدیریت تبلیغات نوین بین، کمپین‌های خود را هوشمندانه مدیریت کنید، بودجه را بهینه صرف کنید و نرخ تبدیل را به بالاترین حد برسانید.',
    type: 'website',
    locale: 'fa_IR',
  },
  alternates: {
    canonical: '/ad-management',
  },
};

export default function AdManagementPage() {
  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-white text-[#10286d]">
      <Navbar />
      <AdManagementHero />
      <AdManagementIntro />
      <AdManagementFeatures />
      <AdManagementProcess />
      <AdManagementStats />
      <AdManagementBenefits />
      <AdManagementFAQ />
      <AdManagementCTA />
      <Footer />
    </main>
  );
}
