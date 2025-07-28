import React from 'react';
import { ChatCircle, Star, Users, Trophy, TrendUp, Money, GraduationCap, Student, Certificate } from '@phosphor-icons/react';

export function TestimonialsSection() {
  const testimonials = [
    {
      name: "David Thompson",
      location: "Canada → Massachusetts",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face&auto=format",
      text: "Got accepted with a 70% scholarship. The guidance was exceptional and the process was seamless.",
      rating: 5,
      profile: "Initial Student",
      age: 22,
      program: "Mechanical Engineering",
      scholarship: "70%",
      duration: "5 months"
    },
    {
      name: "Jessica Martinez",
      location: "Spain → California",
      image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&crop=face&auto=format",
      text: "Secured a psychology program with amazing financial aid. The team's expertise made all the difference.",
      rating: 5,
      profile: "COS Student",
      age: 21,
      program: "Psychology",
      scholarship: "55%",
      duration: "4 months"
    },
    {
      name: "Ryan Anderson",
      location: "Germany → Illinois",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=face&auto=format",
      text: "Transferred from a community college successfully. The scholarship opportunities they found were incredible.",
      rating: 5,
      profile: "Transfer Student",
      age: 26,
      program: "Business Management",
      scholarship: "75%",
      duration: "2 months"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
      {/* Elementos decorativos */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-20 right-20 w-40 h-40 bg-tfe-blue-200 rounded-full opacity-30 animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-32 h-32 bg-tfe-red-200 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-tfe-red-600 rounded-full mb-6 shadow-lg animate-pulse">
              <ChatCircle className="w-10 h-10 text-white" weight="fill" />
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Success{' '}
              <span className="text-tfe-blue-600">
                Stories
              </span>
            </h2>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Meet students who transformed their lives through international education 
              with our specialized mentorship.
            </p>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {[
              { number: '500+', label: 'Students Approved', icon: Users },
              { number: '95%', label: 'Success Rate', icon: Trophy },
              { number: '70%', label: 'Average Scholarship', icon: Money },
              { number: '4.9', label: 'Average Rating', icon: Star }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100">
                  <div className="text-3xl font-bold text-tfe-red-600 mb-2">
                    {stat.number}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Grid de testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index} 
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 cursor-pointer"
              >
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-16 h-16 rounded-full object-cover"
                    loading="lazy"
                  />
                  <div>
                    <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-500">{testimonial.program}</p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex gap-1 mb-2">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <div key={i} className="w-4 h-4 flex items-center justify-center">
                        <Star className="w-4 h-4 text-tfe-red-400 fill-current" weight="fill" />
                      </div>
                    ))}
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm italic line-clamp-3">
                  "{testimonial.text}"
                </p>
                
                <div className="mt-4 flex gap-2">
                  <span className="text-xs bg-tfe-red-100 text-tfe-red-800 px-2 py-1 rounded-full">
                    {testimonial.scholarship} scholarship
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                    Process: {testimonial.duration}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
} 