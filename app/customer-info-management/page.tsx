import Navbar from '@/components/landing/home/Navbar';
import Footer from '@/components/landing/home/Footer';
import CustomerInfoHero from '@/components/landing/customer-info/Hero';
import CustomerInfoIntro from '@/components/landing/customer-info/Intro';
import CustomerInfoFeatures from '@/components/landing/customer-info/Features';
import CustomerInfoProcess from '@/components/landing/customer-info/Process';
import CustomerInfoBenefits from '@/components/landing/customer-info/Benefits';
import CustomerInfoStats from '@/components/landing/customer-info/Stats';
import CustomerInfoFAQ from '@/components/landing/customer-info/FAQ';
import CustomerInfoCTA from '@/components/landing/customer-info/CTA';

export const metadata = {
  title: 'مدیریت اطلاعات مشتریان | سیستم یکپارچه اطلاعاتی و اعلانات | نوین بین',
  description:
    'پلتفرم مدیریت متمرکز اطلاعات مشتریان نوین بین؛ جمع‌آوری، دسته‌بندی و مدیریت اطلاعات مشتریان و اعلانات در یک سیستم هوشمند و یکپارچه. دسترسی سریع، امنیت بالا و تصمیم‌گیری بهتر.',
  keywords: [
    'مدیریت اطلاعات مشتریان',
    'سیستم اطلاعات مشتری',
    'مدیریت متمرکز اطلاعات',
    'اعلانات مشتریان',
    'پایگاه داده مشتریان',
    'CRM اطلاعات مشتری',
    'دسته‌بندی مشتریان',
    'مدیریت ارتباط مشتری',
    'نوین بین',
  ],
  openGraph: {
    title: 'مدیریت اطلاعات مشتریان | سیستم یکپارچه اطلاعاتی و اعلانات | نوین بین',
    description:
      'با پلتفرم مدیریت اطلاعات مشتریان نوین بین، تمام اطلاعات و اعلالات مشتریان خود را در یک سیستم هوشمند و متمرکز مدیریت کنید.',
    type: 'website',
    locale: 'fa_IR',
  },
  alternates: {
    canonical: '/customer-info-management',
  },
};

export default function CustomerInfoManagementPage() {
  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-white text-[#10286d]">
      <Navbar />
      <CustomerInfoHero />
      <CustomerInfoIntro />
      <CustomerInfoFeatures />
      <CustomerInfoProcess />
      <CustomerInfoStats />
      <CustomerInfoBenefits />
      <CustomerInfoFAQ />
      <CustomerInfoCTA />
      <Footer />
    </main>
  );
}
