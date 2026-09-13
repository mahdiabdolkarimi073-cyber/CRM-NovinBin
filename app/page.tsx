import Navbar from '@/components/home/Navbar';
import HeroSection from '@/components/home/HeroSection';
import FeaturesSection from '@/components/home/FeaturesSection';
import AboutSection from '@/components/home/AboutSection';
import TestimonialsSection from '@/components/home/TestimonialsSection';
import PricingSection from '@/components/home/PricingSection';
import FAQSection from '@/components/home/FAQSection';
import CTASection from '@/components/home/CTASection';
import Footer from '@/components/home/Footer';

export default function HomePage() {
  return <main dir="rtl" className="min-h-screen overflow-hidden bg-white text-[#10286d]"><Navbar /><HeroSection /><FeaturesSection /><AboutSection /><section id="solutions" className="sr-only" aria-hidden="true" /><TestimonialsSection /><PricingSection /><CTASection /><FAQSection /><Footer /></main>;
}
