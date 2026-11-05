import Navbar from '@/components/landing/home/Navbar';
import Footer from '@/components/landing/home/Footer';
import AIHero from '@/components/landing/artificial-intelligence/Hero';
import AIIntro from '@/components/landing/artificial-intelligence/Intro';
import AIFeatures from '@/components/landing/artificial-intelligence/Features';
import AIProcess from '@/components/landing/artificial-intelligence/Process';
import AIStats from '@/components/landing/artificial-intelligence/Stats';
import AIBenefits from '@/components/landing/artificial-intelligence/Benefits';
import AIFAQ from '@/components/landing/artificial-intelligence/FAQ';
import AICTA from '@/components/landing/artificial-intelligence/CTA';

export const metadata = {
  title: 'هوش مصنوعی | مدیریت هوشمند اطلاعات، تحلیل داده و تصمیم‌گیری با AI | نوین بین',
  description:
    'پلتفرم هوش مصنوعی نوین بین؛ تحلیل هوشمند داده‌ها، پیش‌بینی فروش، تشخیص الگو و تصمیم‌گیری دقیق‌تر با AI. مدیریت اطلاعات سازمان با هوش مصنوعی.',
  keywords: [
    'هوش مصنوعی',
    'AI',
    'تحلیل داده',
    'پیش‌بینی فروش',
    'تشخیص الگو',
    'تصمیم‌گیری هوشمند',
    'تحلیل هوشمند اطلاعات',
    'نوین بین',
  ],
  openGraph: {
    title: 'هوش مصنوعی | مدیریت هوشمند اطلاعات، تحلیل داده و تصمیم‌گیری با AI | نوین بین',
    description:
      'با پلتفرم هوش مصنوعی نوین بین، داده‌های سازمان را تحلیل، الگوها را شناسایی و تصمیم‌گیری دقیق‌تر با AI داشته باشید.',
    type: 'website',
    locale: 'fa_IR',
  },
  alternates: {
    canonical: '/artificial-intelligence',
  },
};

export default function ArtificialIntelligencePage() {
  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-white text-[#10286d]">
      <Navbar />
      <AIHero />
      <AIIntro />
      <AIFeatures />
      <AIProcess />
      <AIStats />
      <AIBenefits />
      <AIFAQ />
      <AICTA />
      <Footer />
    </main>
  );
}
