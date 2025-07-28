import React, { useState } from 'react';
import { CaretDown, CaretUp } from '@phosphor-icons/react';

export function FAQSection() {
  const [activeFAQ, setActiveFAQ] = useState<number | null>(null);

  const faqs = [
    {
      question: "How long does the entire process take?",
      answer: "The timeline varies by profile. Initial students typically take 3-6 months, COS students 2-4 months, and transfers 1-3 months. We provide detailed timelines during your initial consultation."
    },
    {
      question: "What are the costs involved?",
      answer: "Costs vary based on your profile and chosen services. We offer transparent pricing with no hidden fees. Each stage has specific costs that we clearly explain during your initial guidance session."
    },
    {
      question: "Do you guarantee scholarship approval?",
      answer: "While we can't guarantee approval, we have a 95% success rate. Our expertise in profile matching and school selection significantly increases your chances of securing scholarships."
    },
    {
      question: "What documents do I need to start?",
      answer: "Basic requirements include passport, educational certificates, financial statements, and English proficiency proof. We'll provide a complete checklist during pre-qualification."
    },
    {
      question: "Can I work while studying?",
      answer: "Yes, international students can work on-campus up to 20 hours per week during the academic year and full-time during breaks. We'll guide you through work authorization processes."
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600">
            Everything you need to know about our mentorship process
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white rounded-2xl overflow-hidden shadow-lg">
              <button
                onClick={() => setActiveFAQ(activeFAQ === index ? null : index)}
                className="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <h3 className="text-lg font-semibold text-gray-900">{faq.question}</h3>
                {activeFAQ === index ? (
                  <CaretUp className="w-6 h-6 text-gray-500" weight="fill" />
                ) : (
                  <CaretDown className="w-6 h-6 text-gray-500" weight="fill" />
                )}
              </button>
              {activeFAQ === index && (
                <div className="px-8 pb-6">
                  <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 