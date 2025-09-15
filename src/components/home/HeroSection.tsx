import React from 'react';
import { ArrowRight, ChatCircle, UserCheck, Lightning, TrendUp, Users, GraduationCap, Student, Globe, Certificate } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../contexts/I18nContext';

export function HeroSection() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 overflow-hidden" style={{ paddingTop: '4rem' }}>
      {/* Animated Background Elements - Responsive */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 sm:top-20 right-10 sm:right-20 w-48 h-48 sm:w-72 sm:h-72 bg-tfe-blue-100 rounded-full opacity-30 animate-pulse"></div>
        <div className="absolute bottom-16 sm:bottom-32 left-8 sm:left-16 w-32 h-32 sm:w-48 sm:h-48 bg-tfe-red-100 rounded-full opacity-30 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/6 sm:left-1/4 w-24 h-24 sm:w-32 sm:h-32 bg-tfe-blue-200 rounded-full opacity-20 animate-pulse delay-2000"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 flex items-center min-h-screen relative z-10">
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center">
          {/* Left Content */}
          <div className="text-left">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                <span className="font-semibold text-sm uppercase tracking-wide text-gray-700">
                  {t('company.name')}
                </span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
              <span className="text-gray-900">{t('hero.title1')}</span>
              <br />
              <span className="text-gray-900">{t('hero.title2')} </span>
              <span className="text-tfe-blue-600">
                {t('Study Scholarships')}
              </span>
              <br />
              <span className="text-gray-900">{t('in the USA')}</span>
            </h1>

            <p className="text-lg sm:text-xl mb-6 sm:mb-8 text-gray-600 max-w-xl leading-relaxed">
              {t('hero.description')}
              <span className="font-semibold text-tfe-red-600"> {t('hero.successRate')}</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
              <button
                onClick={() => navigate('/register')}
                className="group bg-tfe-blue-600 hover:bg-tfe-blue-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all duration-300 cursor-pointer whitespace-nowrap shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <span className="flex items-center gap-2">
                  {t('hero.startNow')}
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>

              <button
                onClick={() => window.open('https://wa.me/13237883117?text=Hello%20The%20Future%20of%20English,%20I%20would%20like%20to%20know%20more%20about%20the%20visa%20consulting%20service.', '_blank')}
                className="group border-2 border-gray-300 text-gray-700 hover:bg-gray-50 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all duration-300 cursor-pointer whitespace-nowrap flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <ChatCircle className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                {t('hero.talkToSpecialist')}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-tfe-blue-50 rounded-full flex items-center justify-center">
                  <UserCheck className="w-3 h-3 sm:w-4 sm:h-4 text-tfe-blue-600" weight="fill" />
                </div>
                <span className="text-sm sm:text-base font-medium">{t('hero.personalized')}</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <Lightning className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" weight="fill" />
                </div>
                <span className="text-sm sm:text-base font-medium">{t('hero.fastResults')}</span>
              </div>
            </div>
          </div>

          {/* Right Image */}
          <div className="relative">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl sm:rounded-3xl transform rotate-2 sm:rotate-3 group-hover:rotate-4 sm:group-hover:rotate-6 transition-transform duration-300"></div>
              <div className="relative bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-2xl">
                <img
                  src="/foto main tfe.jpg"
                  alt="International Student"
                  className="w-full h-auto rounded-xl sm:rounded-2xl object-cover object-top"
                  loading="lazy"
                />
              </div>
              {/* Enhanced Floating Cards - Responsive Positioning */}
              <div className="absolute -top-4 sm:-top-6 lg:-top-8 -right-4 sm:-right-6 lg:-right-8 bg-white rounded-2xl shadow-2xl p-4 sm:p-6 border border-gray-100 transform hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-tfe-blue-600 rounded-2xl flex items-center justify-center">
                    <TrendUp className="w-5 h-5 sm:w-7 sm:h-7 text-white" weight="fill" />
                  </div>
                  <div>
                    <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">95%</div>
                    <div className="text-xs sm:text-sm text-gray-500 font-medium">Success Rate</div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 sm:-bottom-6 lg:-bottom-8 -left-4 sm:-left-6 lg:-left-8 bg-white rounded-2xl shadow-2xl p-4 sm:p-6 border border-gray-100 transform hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-tfe-red-600 rounded-2xl flex items-center justify-center">
                    <Student className="w-5 h-5 sm:w-7 sm:h-7 text-white" weight="fill" />
                  </div>
                  <div>
                    <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">500+</div>
                    <div className="text-xs sm:text-sm text-gray-500 font-medium">Students in 2024</div>
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