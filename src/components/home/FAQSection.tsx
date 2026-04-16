import React, { useState } from 'react';
import { CaretDown, CaretUp, Info } from '@phosphor-icons/react';

export function FAQSection() {
  const [activeFAQ, setActiveFAQ] = useState<number | null>(null);

  const faqs = [
    {
      question: "How long does the entire process take?",
      answer: "The timeline varies by profile. Initial students typically take 3-6 months, COS students 2-4 months, and transfers 1-3 months. We provide detailed timelines during your initial consultation."
    },
    {
      question: "What are the costs involved?",
      answer: "Costs vary based on your profile and chosen services. We offer transparent pricing with no hidden fees. Each stage has specific costs that we clearly explain during your initial session."
    },
    {
      question: "Do you guarantee scholarship approval?",
      answer: "Our expertise in profile matching and school selection significantly increases your chances of securing scholarships."
    },
    {
      question: "What documents do I need to start?",
      answer: "We'll provide a complete checklist during pre-qualification."
    },

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

        {/* Legal Disclaimer */}
        <div className="mt-12 bg-amber-50 rounded-2xl p-6 md:p-8 border-l-4 border-amber-500 flex gap-4 md:gap-6 items-start">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-amber-500 rounded-full flex-shrink-0 flex items-center justify-center">
            <Info className="w-5 h-5 md:w-6 md:h-6 text-white" weight="fill" />
          </div>
          <div>
            <h4 className="text-amber-900 font-bold uppercase tracking-wider mb-2 text-sm md:text-base">
              Legal Disclaimer
            </h4>
            <p className="text-amber-800 text-sm md:text-base italic leading-relaxed">
              Notice: The Future of English is not a law firm, does not offer legal advice, does not guarantee approval, and does not represent the client before consulates. Human support is only operational.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
 