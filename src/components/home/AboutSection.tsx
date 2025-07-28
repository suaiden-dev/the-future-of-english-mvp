import React from 'react';
import { Shield, Globe, Trophy, TrendUp, Buildings, Users, CheckCircle, GraduationCap, Student, Certificate, Money, UsersThree, Clock, Flag } from '@phosphor-icons/react';

export function AboutSection() {
  const stats = [
    { number: "$2M+", label: "Scholarships Secured", icon: Money },
    { number: "50+", label: "Partner Schools", icon: Buildings },
    { number: "70+", label: "Countries Served", icon: Flag },
    { number: "3-6", label: "Months Average", icon: Clock }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-10 right-10 w-32 h-32 bg-tfe-blue-200 rounded-full opacity-30 animate-pulse"></div>
      <div className="absolute bottom-20 left-10 w-24 h-24 bg-tfe-red-200 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Header da seção */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 shadow-lg animate-bounce bg-tfe-blue-600">
              <Shield className="w-8 h-8 text-white" weight="fill" />
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              About{' '}
              <span className="text-tfe-red-600">
                Us
              </span>
            </h2>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              At The Future of English, we help international students realize their dream of 
              studying in the United States. We offer complete guidance, from school selection 
              to securing the ideal scholarship — with{' '}
              <span className="font-semibold text-tfe-blue-600">excellence</span>,{' '}
              <span className="font-semibold text-tfe-red-600">transparency</span> and{' '}
              <span className="font-semibold text-tfe-blue-600">proven results</span>.
            </p>
          </div>

          {/* Estatísticas - Agora com informações únicas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {stats.map((stat, index) => (
              <div key={index} className="text-center group">
                <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-gray-100">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-tfe-blue-600 flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-white" weight="fill" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">{stat.number}</div>
                  <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Cards de características - Focando em aspectos únicos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {[
              {
                icon: Globe,
                title: "Global Network",
                description: "Access to 50+ partner schools across the United States with exclusive scholarship opportunities.",
                color: "bg-tfe-blue-500"
              },
              {
                icon: Certificate,
                title: "Expert Guidance",
                description: "Specialized advisors with years of experience in international education and visa processes.",
                color: "bg-tfe-red-500"
              },
              {
                icon: CheckCircle,
                title: "End-to-End Support",
                description: "From initial consultation to arrival in the USA, we handle every step of your journey.",
                color: "bg-tfe-blue-600"
              }
            ].map((feature, index) => (
              <div key={index} className="group cursor-pointer transition-all duration-500 hover:scale-105">
                <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 group-hover:border-blue-200">
                  <div className={`w-16 h-16 rounded-xl ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-8 h-8 text-white" weight="fill" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-tfe-blue-600 transition-colors">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Seção de valores */}
          <div className="bg-gray-50 rounded-3xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-200 rounded-full opacity-20 -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-tfe-red-200 rounded-full opacity-20 translate-y-12 -translate-x-12"></div>
            
            <div className="relative z-10">
              <div className="text-center mb-8">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                  Our Values
                </h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Principles that guide our mission to transform lives through education
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-tfe-blue-500 rounded-full flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-white" weight="fill" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Passion for Education</h4>
                    <p className="text-gray-600">We believe in the transformative power of international education</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-tfe-red-500 rounded-full flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-white" weight="fill" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Continuous Innovation</h4>
                    <p className="text-gray-600">We always seek the best practices and technologies</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-tfe-blue-600 rounded-full flex items-center justify-center">
                    <UsersThree className="w-5 h-5 text-white" weight="fill" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">True Partnership</h4>
                    <p className="text-gray-600">We build lasting relationships with our students</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-tfe-red-600 rounded-full flex items-center justify-center">
                    <Certificate className="w-5 h-5 text-white" weight="fill" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Excellence in Everything</h4>
                    <p className="text-gray-600">Commitment to quality in every detail</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 