import Navbar from '@/components/landing/home/Navbar';
import HeroSection from '@/components/landing/home/HeroSection';
import FeaturesSection from '@/components/landing/home/FeaturesSection';
import AboutSection from '@/components/landing/home/AboutSection';
import TestimonialsSection from '@/components/landing/home/TestimonialsSection';
import PricingSection from '@/components/landing/home/PricingSection';
import FAQSection from '@/components/landing/home/FAQSection';
import CTASection from '@/components/landing/home/CTASection';
import Footer from '@/components/landing/home/Footer';

export default function HomePage() {
  return <main dir="rtl" className="min-h-screen overflow-hidden bg-white text-[#10286d]"><Navbar /><HeroSection /><FeaturesSection /><AboutSection /><section id="solutions" className="sr-only" aria-hidden="true" /><TestimonialsSection /><PricingSection /><CTASection /><FAQSection /><Footer /></main>;
}
