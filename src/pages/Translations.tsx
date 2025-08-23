import React, { useState } from 'react';
import { FileText, CurrencyDollar, Clock, Shield, CheckCircle, ArrowRight, Star, Users, Globe, Trophy, ChatCircle, CaretDown, CaretUp, Phone, Envelope, Lightning, HeartStraight, Target, TrendUp, Download, Upload, Eye, Lock } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';

export function Translations() {
  const navigate = useNavigate();
  const [activeFAQ, setActiveFAQ] = useState<number | null>(null);

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

  const stats = [
    { number: "10,000+", label: "Documents Translated", icon: FileText },
    { number: "99.9%", label: "USCIS Acceptance Rate", icon: Shield },
    { number: "24h", label: "Average Turnaround", icon: Clock },
    { number: "8", label: "Languages Supported", icon: Globe }
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

  const documentTypes = [
    {
      category: "Personal Documents",
      documents: [
        "Birth Certificates",
        "Marriage Certificates", 
        "Divorce Decrees",
        "Death Certificates",
        "Passport Pages",
        "Driver's Licenses",
        "National ID Cards"
      ]
    },
    {
      category: "Academic Documents",
      documents: [
        "Academic Transcripts",
        "Diplomas & Degrees",
        "School Certificates",
        "Course Descriptions",
        "Academic References",
        "Professional Certifications"
      ]
    },
    {
      category: "Legal & Medical",
      documents: [
        "Police Clearances",
        "Medical Records",
        "Vaccination Records",
        "Employment Records",
        "Bank Statements",
        "Legal Documents"
      ]
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section with Background Image */}
      <section className="relative bg-gradient-to-r from-tfe-blue-950 via-tfe-blue-900 to-red-600 text-white py-20 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
                         <h1 className="text-4xl md:text-6xl font-bold mb-6">
               Professional
               <span className="bg-gradient-to-r from-tfe-blue-400 to-red-500 bg-clip-text text-transparent">
                 {' '}Document Translation
               </span>
             </h1>
            <p className="text-xl md:text-2xl mb-8 text-tfe-blue-100 max-w-4xl mx-auto">
              Certified translation services for immigration documents with
              official authentication and verification. 99.9% USCIS acceptance rate.
            </p>

            {/* Stats Preview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-2xl font-bold text-tfe-blue-200">{stat.number}</div>
                  <div className="text-sm text-tfe-blue-100">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/register')}
                className="bg-white text-tfe-blue-950 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 shadow-lg"
              >
                <span>Start Translation</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/verify')}
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-tfe-blue-950 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <Eye className="w-5 h-5" />
                <span>Verify Document</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Professional translation services with competitive rates and guaranteed quality
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <div key={index} className={`relative bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 ${
                plan.popular ? 'ring-2 ring-tfe-blue-500 scale-105' : 'border border-gray-200'
              }`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-tfe-blue-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-tfe-blue-950">{plan.price}</span>
                    <span className="text-gray-600 ml-2">{plan.period}</span>
                  </div>
                  <p className="text-gray-600 mb-8">{plan.description}</p>
                  
                  <div className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => navigate('/register')}
                    className={`w-full px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 transform hover:scale-105 ${
                      plan.popular
                        ? 'bg-tfe-blue-950 text-white hover:bg-tfe-blue-800'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    Choose {plan.name}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 text-sm mb-4">
              * Prices are per standard page (250 words). Complex documents may require additional fees.
            </p>
            
            {/* Additional Pricing Information */}
            <div className="bg-gray-50 rounded-2xl p-6 max-w-4xl mx-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Special Pricing Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-2">Regular Documents</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Birth certificates, marriage certificates, diplomas, transcripts, and other official documents.
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Standard rate</span>
                    <span className="text-sm font-medium text-gray-800">$15-20/page</span>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-2">Bank Statements</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Additional verification and formatting required for financial documents.
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Additional fee</span>
                    <span className="text-sm font-bold text-orange-600">+$10/page</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Our Translation Services?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Professional quality with guaranteed acceptance by US authorities
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-br from-tfe-blue-500 to-tfe-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Shield className="w-8 h-8 text-white" weight="fill" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Certified & Notarized
              </h3>
              <p className="text-gray-600">
                All translations are certified by licensed professionals and notarized 
                with official seals and signatures. 99.9% USCIS acceptance rate.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-br from-tfe-red-500 to-tfe-red-600 rounded-2xl flex items-center justify-center mb-6">
                <Clock className="w-8 h-8 text-white" weight="fill" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Fast Turnaround
              </h3>
              <p className="text-gray-600">
                Standard translations completed in 24-48 hours. Express service available 
                for urgent documents (4-8 hours) with rush processing.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-br from-tfe-blue-500 to-tfe-red-500 rounded-2xl flex items-center justify-center mb-6">
                <FileText className="w-8 h-8 text-white" weight="fill" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                USCIS Compliant
              </h3>
              <p className="text-gray-600">
                All translations meet USCIS requirements and are accepted by immigration 
                offices, embassies, and consulates worldwide.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How Our Translation Process Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Simple, secure, and professional document translation in 4 easy steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="w-20 h-20 bg-tfe-blue-950 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mb-6 mx-auto group-hover:scale-110 transition-transform">
                <Upload className="w-10 h-10" weight="fill" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Upload Document</h3>
              <p className="text-gray-600">
                Upload your document securely to our platform. We support PDF, JPG, PNG, and other common formats.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-tfe-blue-950 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mb-6 mx-auto group-hover:scale-110 transition-transform">
                <CurrencyDollar className="w-10 h-10" weight="fill" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Get Quote</h3>
              <p className="text-gray-600">
                Automatic calculation based on page count and document type. Transparent pricing with no hidden fees.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-tfe-blue-950 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mb-6 mx-auto group-hover:scale-110 transition-transform">
                <Lock className="w-10 h-10" weight="fill" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Secure Payment</h3>
              <p className="text-gray-600">
                Secure payment processing with instant confirmation. We accept all major credit cards and PayPal.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-tfe-blue-950 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mb-6 mx-auto group-hover:scale-110 transition-transform">
                <Download className="w-10 h-10" weight="fill" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Receive Translation</h3>
              <p className="text-gray-600">
                Get your certified translation with verification code. Email delivery or physical copy available.
              </p>
            </div>
          </div>
        </div>
      </section>

             {/* Document Types Section */}
       <section className="py-20 bg-gray-50">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center mb-16">
             <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
               We Translate Everything
             </h2>
             <p className="text-xl text-gray-600 max-w-3xl mx-auto">
               From personal documents to complex legal papers - we handle all types of translations
             </p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* Common Documents */}
             <div className="bg-white p-8 rounded-2xl shadow-lg">
               <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
                 Most Common Documents
               </h3>
               <div className="space-y-4">
                 <div className="flex items-center space-x-3">
                   <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                   <span className="text-gray-700">Birth Certificates</span>
                 </div>
                 <div className="flex items-center space-x-3">
                   <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                   <span className="text-gray-700">Marriage Certificates</span>
                 </div>
                 <div className="flex items-center space-x-3">
                   <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                   <span className="text-gray-700">Academic Transcripts</span>
                 </div>
                 <div className="flex items-center space-x-3">
                   <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                   <span className="text-gray-700">Bank Statements</span>
                 </div>
                 <div className="flex items-center space-x-3">
                   <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                   <span className="text-gray-700">Medical Records</span>
                 </div>
                 <div className="flex items-center space-x-3">
                   <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                   <span className="text-gray-700">Legal Documents</span>
                 </div>
               </div>
             </div>

             {/* Everything Else */}
             <div className="bg-white p-8 rounded-2xl shadow-lg">
               <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
                 And Much More
               </h3>
               <div className="space-y-4">
                 <div className="flex items-center space-x-3">
                   <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                   <span className="text-gray-700">Any Official Document</span>
                 </div>
                 <div className="flex items-center space-x-3">
                   <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                   <span className="text-gray-700">Business Contracts</span>
                 </div>
                 <div className="flex items-center space-x-3">
                   <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                   <span className="text-gray-700">Technical Manuals</span>
                 </div>
                 <div className="flex items-center space-x-3">
                   <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                   <span className="text-gray-700">Website Content</span>
                 </div>
                                   <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">Marketing Materials</span>
                  </div>
               </div>
             </div>
           </div>

                       {/* Supported Languages */}
            <div className="mt-12">
              <div className="bg-white p-8 rounded-2xl shadow-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
                  Supported Languages
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">Portuguese</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">Portuguese (Portugal)</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">Spanish</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">German</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">Arabic</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">Hebrew</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">Japanese</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">Korean</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-4 text-center">
                  All documents are translated to English for USCIS and US authority requirements.
                </p>
              </div>
            </div>


         </div>
       </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What Our Clients Say
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Real feedback from satisfied clients who trusted us with their important documents
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-50 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center mb-6">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name}
                    className="w-16 h-16 rounded-full object-cover mr-4"
                  />
                  <div>
                    <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-600">{testimonial.location}</p>
                    <div className="flex items-center mt-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-gray-700 mb-4 italic">"{testimonial.text}"</p>
                <div className="inline-block bg-tfe-blue-100 text-tfe-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {testimonial.document}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to know about our translation services
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

      {/* Contact Information Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Need Help? Contact Us
            </h2>
            <p className="text-xl text-gray-600">
              Our translation experts are here to help you with any questions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div 
              className="bg-gray-50 p-8 rounded-2xl shadow-lg text-center cursor-pointer hover:bg-gray-100 transition-all duration-300"
              onClick={() => window.location.href = 'tel:+13237883117'}
            >
              <div className="w-16 h-16 bg-tfe-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Phone className="w-8 h-8 text-tfe-blue-600" weight="fill" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Phone</h3>
              <p className="text-gray-600">(323) 788-3117</p>
              <p className="text-sm text-gray-500 mt-2">Mon-Fri: 9AM-6PM EST</p>
            </div>
            
            <div className="bg-gray-50 p-8 rounded-2xl shadow-lg text-center">
              <div className="w-16 h-16 bg-tfe-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Envelope className="w-8 h-8 text-tfe-red-600" weight="fill" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Email</h3>
              <p className="text-gray-600">translations@thefutureofenglish.com</p>
              <p className="text-sm text-gray-500 mt-2">24/7 support</p>
            </div>
            
            <div 
              className="bg-gray-50 p-8 rounded-2xl shadow-lg text-center cursor-pointer hover:bg-gray-100 transition-all duration-300"
              onClick={() => window.open('https://wa.me/13237883117?text=Hello%20The%20Future%20of%20English,%20I%20would%20like%20to%20know%20more%20about%20the%20visa%20consulting%20service.', '_blank')}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-tfe-blue-100 to-tfe-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <ChatCircle className="w-8 h-8 text-tfe-blue-600" weight="fill" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">WhatsApp</h3>
              <p className="text-gray-600">(323) 788-3117</p>
              <p className="text-sm text-gray-500 mt-2">Instant messaging</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}