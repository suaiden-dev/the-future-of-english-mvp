import React from 'react';
import { Globe, Trophy, TrendUp, CheckCircle, Student, GraduationCap, Buildings, Certificate, Money, Users } from '@phosphor-icons/react';

export function ProfilesSection() {
  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-tfe-blue-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-tfe-red-200 rounded-full opacity-20 animate-pulse"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-tfe-blue-100 rounded-full mb-6">
              <span className="text-tfe-blue-600 font-semibold text-sm">SUPPORTED PROFILES</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              What is your <span className="text-tfe-red-600">profile</span>?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We serve different student profiles with specific and personalized strategies for each situation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Initial",
                subtitle: "Outside the USA",
                description: "For those outside the USA who want to start with a student visa. Complete process from pre-qualification to arrival in the United States.",
                icon: Globe,
                color: "blue",
                benefits: ["Visa application support", "School selection guidance", "Pre-departure preparation"],
                duration: "3-6 months",
                students: "2,500+ students",
                successRate: "95%"
              },
              {
                title: "Change of Status (COS)",
                subtitle: "Already in the USA",
                description: "For those already in the USA who need to change their status to student. We handle the entire change of status process.",
                icon: GraduationCap,
                color: "gray",
                benefits: ["Status change application", "Legal documentation", "USCIS coordination"],
                duration: "2-4 months",
                students: "1,800+ students",
                successRate: "92%"
              },
              {
                title: "Transfer",
                subtitle: "School transfer in the USA",
                description: "For those who already study in the USA and want to change institutions. We facilitate the transfer process with new scholarships.",
                icon: Buildings,
                color: "slate",
                benefits: ["SEVIS transfer process", "New school applications", "Credit transfer assistance"],
                duration: "1-2 months",
                students: "1,200+ students",
                successRate: "98%"
              }
            ].map((profile, index) => (
              <div key={index} className="relative group cursor-pointer transition-all duration-500 transform hover:scale-105">
                <div className="relative bg-white rounded-2xl shadow-xl p-8 h-full border-2 transition-all duration-500 shadow-lg hover:shadow-xl flex flex-col">
                  
                  {/* Background gradient */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${
                    profile.color === 'blue' ? 'from-blue-50 to-blue-100' :
                    profile.color === 'gray' ? 'from-gray-50 to-gray-100' :
                    'from-slate-50 to-slate-100'
                  } opacity-5`}></div>
                  
                  {/* Icon */}
                  <div className={`relative inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 transition-all duration-300 ${
                    index === 0 ? 'bg-tfe-blue-600' :
                    index === 1 ? 'bg-tfe-red-600' :
                    'bg-tfe-blue-600'
                  }`}>
                    <profile.icon className="w-10 h-10 text-white" weight="fill" />
                  </div>
                  
                  {/* Content */}
                  <div className="relative flex-1 flex flex-col">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {profile.title}
                    </h3>
                    
                    <p className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wide">
                      {profile.subtitle}
                    </p>
                    
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      {profile.description}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">{profile.duration}</div>
                        <div className="text-xs text-gray-500">Duration</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">{profile.students}</div>
                        <div className="text-xs text-gray-500">Students</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">{profile.successRate}</div>
                        <div className="text-xs text-gray-500">Success Rate</div>
                      </div>
                    </div>
                    
                    {/* Benefits */}
                    <div className="mb-6 flex-1">
                      <ul className="space-y-2">
                        {profile.benefits.map((benefit, idx) => (
                          <li key={idx} className="flex items-center text-sm text-gray-600">
                            <CheckCircle className={`w-4 h-4 mr-2 ${
                            index === 0 ? 'text-tfe-blue-600' :
                            index === 1 ? 'text-tfe-red-600' :
                            'text-tfe-blue-600'
                          }`} weight="fill" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Button */}
                    <button 
                      onClick={() => window.open('https://wa.me/13237883117?text=Hello%20The%20Future%20of%20English,%20I%20would%20like%20to%20know%20more%20about%20the%20visa%20consulting%20service.', '_blank')}
                      className={`w-full py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 whitespace-nowrap text-white mt-auto ${
                      index === 0 ? 'bg-tfe-blue-600 hover:bg-tfe-blue-700' :
                      index === 1 ? 'bg-tfe-red-600 hover:bg-tfe-red-700' :
                      'bg-tfe-blue-600 hover:bg-tfe-blue-700'
                    }`}>
                      Talk to Specialist
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
} 