import Navbar from '@/components/landing/home/Navbar';
import Footer from '@/components/landing/home/Footer';
import OfficeHero from '@/components/landing/office-automation/Hero';
import OfficeIntro from '@/components/landing/office-automation/Intro';
import OfficeFeatures from '@/components/landing/office-automation/Features';
import OfficeProcess from '@/components/landing/office-automation/Process';
import OfficeStats from '@/components/landing/office-automation/Stats';
import OfficeBenefits from '@/components/landing/office-automation/Benefits';
import OfficeFAQ from '@/components/landing/office-automation/FAQ';
import OfficeCTA from '@/components/landing/office-automation/CTA';

export const metadata = {
  title: 'اتوماسیون اداری | مدیریت مکاتبات، فعالیت‌ها و فرآیندهای اداری هوشمند | نوین بین',
  description:
    'پلتفرم اتوماسیون اداری نوین بین؛ مدیریت مکاتبات، نامه‌ها، فعالیت‌ها، مصوبات و فرآیندهای اداری به‌صورت هوشمند و یکپارچه. کاهش کاغذبازی و افزایش سرعت کار.',
  keywords: [
    'اتوماسیون اداری',
    'مدیریت مکاتبات',
    'مدیریت نامه',
    'فرآیند اداری',
    'مدیریت فعالیت',
    'دفترداری دیجیتال',
    'مصوبات',
    'نوین بین',
  ],
  openGraph: {
    title: 'اتوماسیون اداری | مدیریت مکاتبات، فعالیت‌ها و فرآیندهای اداری هوشمند | نوین بین',
    description:
      'با پلتفرم اتوماسیون اداری نوین بین، مکاتبات، فعالیت‌ها و فرآیندهای اداری را به‌صورت هوشمند و بدون کاغذ مدیریت کنید.',
    type: 'website',
    locale: 'fa_IR',
  },
  alternates: {
    canonical: '/office-automation',
  },
};

export default function OfficeAutomationPage() {
  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-white text-[#10286d]">
      <Navbar />
      <OfficeHero />
      <OfficeIntro />
      <OfficeFeatures />
      <OfficeProcess />
      <OfficeStats />
      <OfficeBenefits />
      <OfficeFAQ />
      <OfficeCTA />
      <Footer />
    </main>
  );
}
