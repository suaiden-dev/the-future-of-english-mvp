import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { Chatbot } from '../components/Chatbot';

export function Translations() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeFAQ, setActiveFAQ] = useState<number | null>(null);

  // Função para fazer scroll até a seção
  const scrollToAffiliateProgram = () => {
    setTimeout(() => {
      const element = document.getElementById('affiliate-program');
      if (element) {
        const offset = 80; // Offset para compensar header fixo se houver
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  // Scroll para seção de Affiliate Program se houver hash na URL
  useEffect(() => {
    if (location.hash === '#affiliate-program') {
      scrollToAffiliateProgram();
    }
  }, [location.hash]);


  const faqs = [
    {
      question: "How long does translation take?",
      answer: "Standard translations are completed within 24-48 hours. Rush services are available for urgent documents (4-8 hours) at an additional fee."
    },
    {
      question: "Are your translations accepted by USCIS?",
      answer: "Yes, all our translations are certified and notarized, meeting USCIS requirements. They include official certification statements and are accepted by all US immigration authorities."
    },
    {
      question: "What documents can you translate?",
      answer: "We translate all immigration documents including birth certificates, marriage certificates, academic transcripts, medical records, police clearances, and more. Contact us for specific document types."
    },
    {
      question: "How do I verify my translation is authentic?",
      answer: "Each translation comes with a unique verification code. You can verify authenticity on our website or contact us directly with the code."
    },
    {
      question: "Do you offer rush services?",
      answer: "Yes, we offer rush services for urgent documents. 4-8 hour turnaround is available for an additional 50% fee. Contact us for specific rush pricing."
    },
    {
      question: "What languages do you support?",
      answer: "We support Portuguese, Portuguese (Portugal), Spanish, German, Arabic, Hebrew, Japanese, and Korean. All documents are translated to English for USCIS and US authority requirements."
    }
  ];

  const testimonials = [
    {
      name: "David Thompson",
      location: "Canada → New York",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      text: "Fast and professional service. My birth certificate translation was accepted by USCIS without any issues.",
      rating: 5,
      document: "Birth Certificate"
    },
    {
      name: "Jessica Martinez",
      location: "Mexico → Texas",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      text: "Excellent quality and quick turnaround. The verification system gave me peace of mind.",
      rating: 5,
      document: "Academic Transcript"
    },
    {
      name: "Ryan Anderson",
      location: "Brazil → California",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      text: "Professional service with competitive pricing. My marriage certificate translation was perfect.",
      rating: 5,
      document: "Marriage Certificate"
    }
  ];

  const pricingPlans = [
    {
      name: "Certified Translation",
      price: "$15.00",
      period: "per page",
      description: "Standard translation with official certification",
      features: [
        "24-48 hour turnaround",
        "Official certification stamp",
        "USCIS accepted",
        "Digital verification code",
        "Email delivery",
        "Standard support"
      ],
      popular: false
    },
    {
      name: "Notarized Translation",
      price: "$20.00",
      period: "per page",
      description: "Official notarized translation with legal notarization",
      features: [
        "24-48 hour turnaround",
        "Official notarization",
        "Legal notarization",
        "USCIS accepted",
        "Digital verification code",
        "Email delivery",
        "Priority support"
      ],
      popular: true
    },
    {
      name: "Bank Statement",
      price: "$25.00",
      period: "per page",
      description: "Special handling for financial documents",
      features: [
        "24-48 hour turnaround",
        "Enhanced verification process",
        "Financial document formatting",
        "Additional security measures",
        "USCIS accepted",
        "Digital verification code",
        "Email delivery"
      ],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section - Minimalist Style with Wave Background */}
      <section className="relative bg-gradient-to-br from-tfe-blue-950 via-tfe-blue-950 to-black py-20 sm:py-28 overflow-hidden">
        {/* Wave Shapes Background */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Bottom white wave - solid and prominent */}
          <div className="absolute bottom-0 left-0 right-0" style={{ height: '300px', width: '100vw', marginLeft: '50%', transform: 'translateX(-50%)' }}>
            <svg className="w-full h-full" viewBox="0 0 1200 300" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', width: '100%', height: '100%' }}>
              <path d="M-50,300 C50,200 150,180 350,200 C550,220 650,190 850,210 C950,220 1050,200 1250,180 L1250,300 L-50,300 Z" fill="white" opacity="1"/>
            </svg>
          </div>
          
          {/* Middle gray wave - translucent layer */}
          <div className="absolute bottom-0 left-0 right-0" style={{ height: '300px', width: '100vw', marginLeft: '50%', transform: 'translateX(-50%) translateY(-30px)' }}>
            <svg className="w-full h-full" viewBox="0 0 1200 300" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', width: '100%', height: '100%' }}>
              <path d="M-50,300 C100,190 250,170 450,195 C650,220 750,185 950,205 C1050,215 1100,195 1250,175 L1250,300 L-50,300 Z" fill="white" opacity="0.35"/>
            </svg>
          </div>
          
          {/* Top gray wave - most translucent */}
          <div className="absolute bottom-0 left-0 right-0" style={{ height: '300px', width: '100vw', marginLeft: '50%', transform: 'translateX(-50%) translateY(-60px)' }}>
            <svg className="w-full h-full" viewBox="0 0 1200 300" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', width: '100%', height: '100%' }}>
              <path d="M-50,300 C70,200 230,185 400,200 C600,220 700,195 900,210 C1000,220 1070,200 1250,185 L1250,300 L-50,300 Z" fill="white" opacity="0.25"/>
            </svg>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Text Content */}
            <div className="text-left">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                Professional
                <br />
                <span className="text-tfe-red-600">Document Translation</span>
              </h1>
              <p className="text-xl sm:text-2xl text-gray-200 mb-10 max-w-2xl leading-relaxed">
                Certified translation services for immigration documents with official authentication and verification
              </p>

              {/* Main CTA Button */}
              <div className="mb-10">
                <button
                  onClick={() => navigate('/register')}
                  className="bg-white text-tfe-blue-950 px-10 py-5 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all duration-300 flex items-center justify-center space-x-2 shadow-xl hover:shadow-2xl hover:scale-105"
                >
                  <span>Start Translation</span>
                  <i className="fas fa-arrow-right"></i>
                </button>
              </div>

              {/* Trust Indicators - Inline */}
              <div className="flex flex-wrap items-center gap-6 mb-8">
                <div className="flex items-center gap-2">
                  <i className="far fa-clock text-green-400"></i>
                  <span className="text-white font-medium">24-48h Turnaround</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="fas fa-shield-alt text-green-400"></i>
                  <span className="text-white font-medium">Certified & Notarized</span>
                </div>
              </div>

              {/* Affiliate CTA - Cleaner Design */}
              <div className="max-w-xl">
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-5 hover:bg-white/15 transition-all duration-300">
                  <Link
                    to="/translations#affiliate-program"
                    onClick={(e) => {
                      if (location.pathname === '/translations') {
                        e.preventDefault();
                        scrollToAffiliateProgram();
                        window.history.pushState(null, '', '#affiliate-program');
                      }
                    }}
                    className="flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                        <i className="far fa-share-alt text-lg" style={{ color: '#dc2626' }}></i>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1">Earn as an Affiliate</h3>
                        <p className="text-sm text-gray-200">$1.00 commission per translation</p>
                      </div>
                    </div>
                    <i className="fas fa-arrow-right text-white"></i>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Side - Trust Logos */}
            <div className="flex flex-col items-center lg:items-end justify-center gap-6">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-xl">
                <div className="flex flex-col items-center gap-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Trusted & Certified</h3>
                  
                  {/* USCIS Logo */}
                  <div className="flex items-center justify-center">
                    <img 
                      src="/USCIS_Signature_Preferred_FC.png" 
                      alt="USCIS Preferred Signature" 
                      className="h-20 w-auto object-contain"
                    />
                  </div>
                  
                  {/* ATA Logo */}
                  <div className="flex items-center justify-center">
                    <img 
                      src="/ata_logo.png" 
                      alt="American Translators Association" 
                      className="h-16 w-auto object-contain"
                      style={{ filter: 'brightness(0)' }}
                    />
                  </div>

                  {/* Trust Badge */}
                  <div className="flex items-center gap-2 mt-2">
                    <i className="far fa-check-circle text-green-600"></i>
                    <span className="text-sm font-semibold text-gray-900">100% Accepted by USCIS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - Clean White Cards */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Professional translation services with competitive rates
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {pricingPlans.map((plan, index) => (
              <div 
                key={index} 
                className={`bg-white rounded-2xl p-8 border-2 transition-all duration-300 ${
                  plan.popular ? 'border-tfe-blue-600 shadow-xl' : 'border-gray-200 shadow-sm hover:shadow-md'
                }`}
              >
                {plan.popular && (
                  <div className="text-center mb-4">
                    <span className="bg-tfe-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-tfe-blue-600">{plan.price}</span>
                    <span className="text-gray-600 ml-2">{plan.period}</span>
                  </div>
                  <p className="text-gray-600 mb-6 text-sm">{plan.description}</p>
                  
                  <div className="space-y-3 mb-8 text-left">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-start space-x-2">
                        <i className="far fa-check-circle text-green-600 flex-shrink-0 mt-0.5"></i>
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => navigate('/register')}
                    className={`w-full px-6 py-3 rounded-xl font-semibold text-base transition-all duration-300 ${
                      plan.popular
                        ? 'bg-tfe-blue-600 text-white hover:bg-tfe-blue-700'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    Choose {plan.name}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Special Pricing Information */}
          <div className="mt-16">
            <p className="text-sm text-gray-500 text-center mb-8">
              * Prices are per standard page (250 words). Complex documents may require additional fees.
            </p>
            
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-gray-900 mb-8">
                Special Pricing Information
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h4 className="text-xl font-bold text-gray-900 mb-3">Regular Documents</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Birth certificates, marriage certificates, diplomas, transcripts, and other official documents.
                </p>
                <div className="mt-4">
                  <span className="text-sm text-gray-600">Standard rate</span>
                  <div className="text-2xl font-bold text-gray-900 mt-1">$15-20/page</div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h4 className="text-xl font-bold text-gray-900 mb-3">Bank Statements</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Additional verification and formatting required for financial documents.
                </p>
                <div className="mt-4">
                  <span className="text-sm text-gray-600">Additional fee</span>
                  <div className="text-2xl font-bold text-red-600 mt-1">+$10/page</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Why Choose Us?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Professional quality with guaranteed acceptance
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: "fa-medal",
                iconStyle: "fas",
                title: "Certified & Notarized",
                description: "All translations are certified by licensed professionals. 99.9% USCIS acceptance rate.",
                color: "bg-tfe-blue-600"
              },
              {
                icon: "fa-clock",
                iconStyle: "far",
                title: "Fast Turnaround",
                description: "Standard translations completed in 24-48 hours. Express service available.",
                color: "bg-tfe-red-600"
              },
              {
                icon: "fa-file-alt",
                iconStyle: "far",
                title: "USCIS Compliant",
                description: "All translations meet USCIS requirements and are accepted worldwide.",
                color: "bg-tfe-blue-600"
              }
            ].map((feature, index) => {
              return (
                <div 
                  key={index}
                  className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="w-14 h-14 flex items-center justify-center mb-4">
                    <i className={`${feature.iconStyle || 'far'} ${feature.icon} text-2xl`} style={{ color: feature.color === 'bg-tfe-blue-600' ? '#1e40af' : '#dc2626' }}></i>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Simple, secure, and professional in 4 easy steps
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
            {[
              { icon: "fa-upload", iconStyle: "fas", title: "Upload", description: "Upload your document securely", color: "bg-blue-50" },
              { icon: "fa-dollar-sign", iconStyle: "far", title: "Get Quote", description: "Automatic pricing calculation", color: "bg-red-50" },
              { icon: "fa-credit-card", iconStyle: "far", title: "Pay", description: "Secure payment processing", color: "bg-blue-50" },
              { icon: "fa-download", iconStyle: "fas", title: "Receive", description: "Get your certified translation", color: "bg-red-50" }
            ].map((step, index) => {
              return (
                <div key={index} className="flex items-center gap-4 md:gap-6">
                  <div className={`${step.color} rounded-xl p-8 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 w-[280px] h-[200px] flex flex-col relative`}>
                    <div className="mb-4">
                      <i className={`${step.iconStyle} ${step.icon} text-3xl text-gray-900 mb-3 block`}></i>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {index + 1}. {step.title}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed flex-grow">
                      {step.description}
                    </p>
                  </div>
                  {index < 3 && (
                    <div className="hidden md:flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-arrow-right text-gray-400 text-xl"></i>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Affiliate Program CTA - Prominent */}
      <section id="affiliate-program" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-tfe-blue-600 rounded-2xl p-10 text-white">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full mb-6">
                  <i className="far fa-dollar-sign"></i>
                  <span className="text-sm font-semibold uppercase">Affiliate Program</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  Earn Money While Helping Others
                </h2>
                <p className="text-lg text-white/90 mb-6">
                  Join our affiliate program and earn <span className="font-bold">$1.00 commission</span> for every translation you refer.
                </p>
                 <div className="flex flex-col sm:flex-row gap-3">
                   <Link
                     to="/affiliates/register"
                     className="bg-white text-tfe-blue-600 px-8 py-3 rounded-xl font-semibold text-base hover:bg-gray-50 transition-all duration-300 flex items-center justify-center gap-2"
                   >
                     Join Program
                     <i className="fas fa-arrow-right"></i>
                   </Link>
                  <Link
                    to="/affiliates/login"
                    className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-xl font-semibold text-base hover:bg-white/10 transition-all duration-300 text-center"
                  >
                    Already an Affiliate?
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: "fa-check-circle", iconStyle: "far", title: "Simple", desc: "Just share link" },
                  { icon: "fa-dollar-sign", iconStyle: "far", title: "Fast Payouts", desc: "30 days" },
                  { icon: "fa-infinity", iconStyle: "fas", title: "No Limits", desc: "Unlimited referrals" },
                  { icon: "fa-shield-alt", iconStyle: "fas", title: "Trusted", desc: "Reliable system" }
                ].map((item, idx) => {
                  return (
                    <div key={idx} className="bg-white/10 rounded-xl p-4 text-center border border-white/20">
                      <i className={`${item.iconStyle || 'far'} ${item.icon} text-2xl mb-2`}></i>
                      <h3 className="font-semibold mb-1">{item.title}</h3>
                      <p className="text-sm text-white/80">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Document Types */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              We Translate Everything
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From personal documents to complex legal papers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-8 rounded-xl border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Common Documents</h3>
              <div className="space-y-3">
                {["Birth Certificates", "Marriage Certificates", "Academic Transcripts", "Bank Statements", "Medical Records", "Legal Documents"].map((doc, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <i className="far fa-check-circle text-green-600 flex-shrink-0"></i>
                    <span className="text-gray-700">{doc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-8 rounded-xl border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">And More</h3>
              <div className="space-y-3">
                {["Business Contracts", "Technical Manuals", "Website Content", "Marketing Materials", "Any Official Document"].map((doc, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <i className="far fa-check-circle text-green-600 flex-shrink-0"></i>
                    <span className="text-gray-700">{doc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-xl border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">Supported Languages</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {["Portuguese", "Portuguese (PT)", "Spanish", "German", "Arabic", "Hebrew", "Japanese", "Korean"].map((lang, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <i className="far fa-check-circle text-green-600 flex-shrink-0"></i>
                  <span className="text-gray-700 text-sm">{lang}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              What Our Clients Say
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Real feedback from satisfied clients
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center mb-4">
                  <img src={testimonial.image} alt={testimonial.name} className="w-12 h-12 rounded-full object-cover mr-3" />
                  <div>
                    <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                    <p className="text-xs text-gray-600">{testimonial.location}</p>
                    <div className="flex items-center mt-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <i key={i} className="fas fa-star text-yellow-400"></i>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-gray-700 text-sm mb-3 italic">"{testimonial.text}"</p>
                <div className="inline-block bg-tfe-blue-50 text-tfe-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                  {testimonial.document}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setActiveFAQ(activeFAQ === index ? null : index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-base font-semibold text-gray-900 pr-4">{faq.question}</h3>
                  {activeFAQ === index ? (
                    <i className="far fa-chevron-up text-tfe-blue-600 flex-shrink-0"></i>
                  ) : (
                    <i className="far fa-chevron-down text-gray-400 flex-shrink-0"></i>
                  )}
                </button>
                {activeFAQ === index && (
                  <div className="px-6 pb-4">
                    <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Need Help? Contact Us
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 text-center hover:shadow-md transition-all duration-300 cursor-pointer" onClick={() => window.location.href = 'tel:+13237883117'}>
              <div className="w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <i className="far fa-phone text-xl" style={{ color: '#1e40af' }}></i>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Phone</h3>
              <p className="text-gray-600 text-sm">(323) 788-3117</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-gray-200 text-center">
              <div className="w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <i className="far fa-envelope text-xl" style={{ color: '#dc2626' }}></i>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Email</h3>
              <p className="text-gray-600 text-sm">translations@thefutureofenglish.com</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-gray-200 text-center hover:shadow-md transition-all duration-300 cursor-pointer" onClick={() => window.open('https://wa.me/13237883117?text=Hello%20The%20Future%20of%20English,%20I%20would%20like%20to%20know%20more%20about%20the%20visa%20consulting%20service.', '_blank')}>
              <div className="w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <i className="fab fa-whatsapp text-xl" style={{ color: '#1e40af' }}></i>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">WhatsApp</h3>
              <p className="text-gray-600 text-sm">(323) 788-3117</p>
            </div>
          </div>
        </div>
      </section>

      
      <Footer />
      <Chatbot />
    </div>
  );
}
