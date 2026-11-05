import Navbar from '@/components/landing/home/Navbar';
import Footer from '@/components/landing/home/Footer';
import LoyaltyHero from '@/components/landing/loyalty-club/Hero';
import LoyaltyIntro from '@/components/landing/loyalty-club/Intro';
import LoyaltyFeatures from '@/components/landing/loyalty-club/Features';
import LoyaltyProcess from '@/components/landing/loyalty-club/Process';
import LoyaltyStats from '@/components/landing/loyalty-club/Stats';
import LoyaltyBenefits from '@/components/landing/loyalty-club/Benefits';
import LoyaltyFAQ from '@/components/landing/loyalty-club/FAQ';
import LoyaltyCTA from '@/components/landing/loyalty-club/CTA';

export const metadata = {
  title: 'باشگاه وفاداری | برنامه‌های وفاداری و افزایش تعامل و رضایت مشتری | نوین بین',
  description:
    'پلتفرم باشگاه وفاداری نوین بین؛ ایجاد برنامه‌های وفاداری، امتیازدهی، پاداش و افزایش تعامل و رضایت مشتری. مدیریت هوشمند روابط مشتری در یک سیستم یکپارچه.',
  keywords: [
    'باشگاه وفاداری',
    'برنامه وفاداری',
    'امتیازدهی مشتری',
    'پاداش مشتری',
    'افزایش تعامل',
    'رضایت مشتری',
    'مدیریت روابط مشتری',
    'نوین بین',
  ],
  openGraph: {
    title: 'باشگاه وفاداری | برنامه‌های وفاداری و افزایش تعامل و رضایت مشتری | نوین بین',
    description:
      'با پلتفرم باشگاه وفاداری نوین بین، برنامه‌های امتیازدهی و پاداش ایجاد کنید و تعامل و رضایت مشتری را افزایش دهید.',
    type: 'website',
    locale: 'fa_IR',
  },
  alternates: {
    canonical: '/loyalty-club',
  },
};

export default function LoyaltyClubPage() {
  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-white text-[#10286d]">
      <Navbar />
      <LoyaltyHero />
      <LoyaltyIntro />
      <LoyaltyFeatures />
      <LoyaltyProcess />
      <LoyaltyStats />
      <LoyaltyBenefits />
      <LoyaltyFAQ />
      <LoyaltyCTA />
      <Footer />
    </main>
  );
}
