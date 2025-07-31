import React from 'react';
import { FacebookLogo, InstagramLogo, LinkedinLogo, TwitterLogo, Envelope, Phone, MapPin, WhatsappLogo } from '@phosphor-icons/react';

export function Footer() {
  return (
    <footer className="bg-tfe-blue-950 text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Company Information */}
          <div className="lg:col-span-1">
            <div className="mb-4">
              <div className="flex items-center space-x-3">
                                 <div className="flex items-center gap-2">
                   <div className="w-8 h-8 bg-gradient-to-br from-tfe-red-600 to-tfe-blue-600 rounded-lg flex items-center justify-center">
                     <span className="text-white font-bold text-sm">TFE</span>
                   </div>
                   <h3 className="text-xl font-bold text-white">The Future of English</h3>
                 </div>
              </div>
            </div>
            
            <p className="text-gray-300 mb-6 leading-relaxed">
              Transforming dreams into reality through specialized mentorship for study scholarships in the United States.
            </p>
            
            {/* Social Media Icons */}
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-tfe-red-600 transition-colors">
                <FacebookLogo className="w-5 h-5" weight="fill" />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-tfe-red-600 transition-colors">
                <InstagramLogo className="w-5 h-5" weight="fill" />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-tfe-red-600 transition-colors">
                <LinkedinLogo className="w-5 h-5" weight="fill" />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-tfe-red-600 transition-colors">
                <TwitterLogo className="w-5 h-5" weight="fill" />
              </a>
            </div>
          </div>

          {/* Our Services */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Our Services</h4>
                         <ul className="space-y-3">
               <li>
                 <a href="/" className="text-gray-300 hover:text-white transition-colors">
                   Scholarship Mentorship
                 </a>
               </li>
               <li>
                 <a href="/translations" className="text-gray-300 hover:text-white transition-colors">
                   Document Translation
                 </a>
               </li>
               <li>
                 <a href="/verify" className="text-gray-300 hover:text-white transition-colors">
                   Document Verification
                 </a>
               </li>
               <li>
                 <a href="/" className="text-gray-300 hover:text-white transition-colors">
                   Selection Process
                 </a>
               </li>
               <li>
                 <a href="/" className="text-gray-300 hover:text-white transition-colors">
                   Academic Guidance
                 </a>
               </li>
             </ul>
          </div>

          {/* Profile Types */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Profile Types</h4>
                         <ul className="space-y-3">
               <li>
                 <a href="/" className="text-gray-300 hover:text-white transition-colors">
                   Initial - Outside USA
                 </a>
               </li>
               <li>
                 <a href="/" className="text-gray-300 hover:text-white transition-colors">
                   COS - Change of Status
                 </a>
               </li>
               <li>
                 <a href="/" className="text-gray-300 hover:text-white transition-colors">
                   Transfer - School Change
                 </a>
               </li>
               <li>
                 <a href="/" className="text-gray-300 hover:text-white transition-colors">
                   Student Visa
                 </a>
               </li>
               <li>
                 <a href="/" className="text-gray-300 hover:text-white transition-colors">
                   Academic Scholarships
                 </a>
               </li>
             </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Contact</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Envelope className="w-5 h-5 text-tfe-red-400" weight="fill" />
                <a href="mailto:info@thefutureofenglish.com" className="text-gray-300 hover:text-white transition-colors">
                  info@thefutureofenglish.com
                </a>
              </div>
              
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-tfe-red-400" weight="fill" />
                <a href="tel:+13237883117" className="text-gray-300 hover:text-white transition-colors">
                  (323) 788-3117
                </a>
              </div>
              
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-tfe-red-400" weight="fill" />
                <span className="text-gray-300">
                  United States
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <WhatsappLogo className="w-5 h-5 text-tfe-red-400" weight="fill" />
                <a href="https://wa.me/13237883117?text=Hello%20The%20Future%20of%20English,%20I%20would%20like%20to%20know%20more%20about%20the%20visa%20consulting%20service." className="text-gray-300 hover:text-white transition-colors">
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-gray-400 text-sm">
              © 2025 The Future of English. All rights reserved.
            </div>
            
                         <div className="flex gap-6 text-sm">
               <a href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                 Privacy Policy
               </a>
               <a href="/terms" className="text-gray-400 hover:text-white transition-colors">
                 Terms of Use
               </a>
               <a href="/cookies" className="text-gray-400 hover:text-white transition-colors">
                 Cookie Policy
               </a>
             </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 