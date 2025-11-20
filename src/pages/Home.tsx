import React from 'react';
import { HeroSection } from '../components/home/HeroSection';
import { AboutSection } from '../components/home/AboutSection';
import { ProfilesSection } from '../components/home/ProfilesSection';
import { TestimonialsSection } from '../components/home/TestimonialsSection';
import { FAQSection } from '../components/home/FAQSection';
import { ContactSection } from '../components/home/ContactSection';
import { Footer } from '../components/Footer';
import { Chatbot } from '../components/Chatbot';
import { useAffiliateRef } from '../hooks/useAffiliateRef';



export function Mentorship() {
  // Capturar código de referência se houver na URL
  useAffiliateRef();

  return (
    <div className="min-h-screen">
      <HeroSection />
      <AboutSection />
      <ProfilesSection />
      <TestimonialsSection />
      <FAQSection />
      <ContactSection />
      <Footer />
      <Chatbot />
    </div>
  );
}