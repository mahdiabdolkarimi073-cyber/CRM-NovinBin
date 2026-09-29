import Navbar from '@/components/landing/home/Navbar';
import Footer from '@/components/landing/home/Footer';
import DataIntelligenceHero from '@/components/landing/data-intelligence/Hero';
import DataIntelligenceIntro from '@/components/landing/data-intelligence/Intro';
import DataIntelligenceFeatures from '@/components/landing/data-intelligence/Features';
import DataIntelligenceProcess from '@/components/landing/data-intelligence/Process';
import DataIntelligenceBenefits from '@/components/landing/data-intelligence/Benefits';
import DataIntelligenceStats from '@/components/landing/data-intelligence/Stats';
import DataIntelligenceFAQ from '@/components/landing/data-intelligence/FAQ';
import DataIntelligenceCTA from '@/components/landing/data-intelligence/CTA';

export const metadata = {
  title: 'تحلیل داده و هوش تجاری | داشبورد و گزارش مدیریتی | نوین بین',
  description:
    'پلتفرم تحلیل داده و هوش تجاری نوین بین؛ تحلیل داده‌ها، ارائه گزارش‌ها و داشبوردهای مدیریتی برای تصمیم‌گیری بهتر. بینش عمیق از داده‌های کسب‌وکار شما.',
  keywords: [
    'هوش تجاری',
    'تحلیل داده',
    'داشبورد مدیریتی',
    'گزارش تجاری',
    'بیزینس اینتلجنت',
    'تحلیل کسب‌وکار',
    'داشبورد تحلیلی',
    'تصمیم‌گیری داده‌محور',
    'نوین بین',
  ],
  openGraph: {
    title: 'تحلیل داده و هوش تجاری | داشبورد و گزارش مدیریتی | نوین بین',
    description:
      'با پلتفرم هوش تجاری نوین بین، داده‌های کسب‌وکار خود را تحلیل کنید و داشبوردهای مدیریتی حرفه‌ای برای تصمیم‌گیری بهتر بسازید.',
    type: 'website',
    locale: 'fa_IR',
  },
  alternates: {
    canonical: '/data-intelligence',
  },
};

export default function DataIntelligencePage() {
  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-white text-[#10286d]">
      <Navbar />
      <DataIntelligenceHero />
      <DataIntelligenceIntro />
      <DataIntelligenceFeatures />
      <DataIntelligenceProcess />
      <DataIntelligenceStats />
      <DataIntelligenceBenefits />
      <DataIntelligenceFAQ />
      <DataIntelligenceCTA />
      <Footer />
    </main>
  );
}
