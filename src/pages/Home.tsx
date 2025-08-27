import React from 'react';
import { HeroSection } from '../components/home/HeroSection';
import { AboutSection } from '../components/home/AboutSection';
import { ProfilesSection } from '../components/home/ProfilesSection';
import { TestimonialsSection } from '../components/home/TestimonialsSection';
import { FAQSection } from '../components/home/FAQSection';
import { ContactSection } from '../components/home/ContactSection';
import { Footer } from '../components/Footer';
import { DirectI18nTest } from '../components/DirectI18nTest';


export function Mentorship() {
  return (
    <div className="min-h-screen">
      <DirectI18nTest />
      <HeroSection />
      <AboutSection />
      <ProfilesSection />
      <TestimonialsSection />
      <FAQSection />
      <ContactSection />
      <Footer />
    </div>
  );
}