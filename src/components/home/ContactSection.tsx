import React from 'react';
import { Envelope } from '@phosphor-icons/react';

export function ContactSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Get in Touch
          </h2>
          <p className="text-xl text-gray-600">
            Ready to start your journey? Contact us today!
          </p>
        </div>

        <div className="flex justify-center">
          {/* Email Card */}
          <div className="bg-white p-8 rounded-xl shadow-lg text-center border border-gray-100">
            <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-6">
              <Envelope className="w-8 h-8 text-red-600" weight="fill" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Email</h3>
            <p className="text-gray-600 text-lg">info@thefutureofenglish.com</p>
            <p className="text-sm text-gray-500 mt-2">24/7 support</p>
          </div>
        </div>
      </div>
    </section>
  );
}
