import Navbar from '@/components/landing/home/Navbar';
import Footer from '@/components/landing/home/Footer';
import CallCenterHero from '@/components/landing/call-center/Hero';
import CallCenterIntro from '@/components/landing/call-center/Intro';
import CallCenterFeatures from '@/components/landing/call-center/Features';
import CallCenterProcess from '@/components/landing/call-center/Process';
import CallCenterBenefits from '@/components/landing/call-center/Benefits';
import CallCenterStats from '@/components/landing/call-center/Stats';
import CallCenterFAQ from '@/components/landing/call-center/FAQ';
import CallCenterCTA from '@/components/landing/call-center/CTA';

export const metadata = {
  title: 'مرکز تماس | مدیریت تماس‌های ورودی و خروجی و کیفیت خدمات | نوین بین',
  description:
    'پلتفرم مرکز تماس نوین بین؛ مدیریت تماس‌های ورودی و خروجی، پیگیری کیفیت خدمات، ثبت مکالمات و ارائه تجربه بهتر به مشتری. سیستم هوشمند برای مدیریت حرفه‌ای تماس‌ها.',
  keywords: [
    'مرکز تماس',
    'مدیریت تماس',
    'تماس ورودی',
    'تماس خروجی',
    'کیفیت خدمات',
    'کال سنتر',
    'مدیریت مکالمات',
    'پشتیبانی تلفنی',
    'CRM تماس',
    'نوین بین',
  ],
  openGraph: {
    title: 'مرکز تماس | مدیریت تماس‌های ورودی و خروجی و کیفیت خدمات | نوین بین',
    description:
      'با پلتفرم مرکز تماس نوین بین، تماس‌های ورودی و خروجی خود را مدیریت کنید و کیفیت خدمات را افزایش دهید.',
    type: 'website',
    locale: 'fa_IR',
  },
  alternates: {
    canonical: '/call-center',
  },
};

export default function CallCenterPage() {
  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-white text-[#10286d]">
      <Navbar />
      <CallCenterHero />
      <CallCenterIntro />
      <CallCenterFeatures />
      <CallCenterProcess />
      <CallCenterStats />
      <CallCenterBenefits />
      <CallCenterFAQ />
      <CallCenterCTA />
      <Footer />
    </main>
  );
}
