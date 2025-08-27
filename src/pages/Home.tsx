import React from 'react';
import { HeroSection } from '../components/home/HeroSection';
import { AboutSection } from '../components/home/AboutSection';
import { ProfilesSection } from '../components/home/ProfilesSection';
import { TestimonialsSection } from '../components/home/TestimonialsSection';
import { FAQSection } from '../components/home/FAQSection';
import { ContactSection } from '../components/home/ContactSection';
import { Footer } from '../components/Footer';
import { I18nDebugTest } from '../components/I18nDebugTest';


export function Mentorship() {
  return (
    <div className="min-h-screen">
      <I18nDebugTest />
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