import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, DollarSign, TrendingUp, Users, AlertCircle, CreditCard, FileBarChart, UserCheck, UserX } from 'lucide-react';
import { Document } from '../../App';
import { supabase } from '../../lib/supabase';

interface StatsCardsProps {
  documents: Document[];
}

export function StatsCards({ documents }: StatsCardsProps) {
  const [paymentStats, setPaymentStats] = useState<any>(null);
  const [translationStats, setTranslationStats] = useState<any>(null);
  const [enhancedStats, setEnhancedStats] = useState<any>(null);
  const [userTypeBreakdown, setUserTypeBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Carregando estatísticas...');
      
      // Carregar estatísticas de pagamentos
      const { data: paymentData, error: paymentError } = await supabase
        .rpc('get_payment_stats');
      
      if (paymentError) {
        console.error('❌ Erro ao carregar estatísticas de pagamentos:', paymentError);
        throw paymentError;
      }
      
      console.log('💰 Estatísticas de pagamentos:', paymentData);
      setPaymentStats(paymentData[0] || null);

      // Carregar estatísticas de traduções (mantido para compatibilidade)
      const { data: translationData, error: translationError } = await supabase
        .rpc('get_translation_stats');
      
      if (translationError) {
        console.error('❌ Erro ao carregar estatísticas de traduções:', translationError);
        throw translationError;
      }
      
      console.log('📊 Estatísticas de traduções:', translationData);
      setTranslationStats(translationData[0] || null);

      // Carregar estatísticas aprimoradas com separação por tipo de usuário
      const { data: enhancedData, error: enhancedError } = await supabase
        .rpc('get_enhanced_translation_stats');
      
      if (enhancedError) {
        console.error('❌ Erro ao carregar estatísticas aprimoradas:', enhancedError);
        // Não falhar se a função nova não existir ainda
      } else {
        console.log('🚀 Estatísticas aprimoradas:', enhancedData);
        setEnhancedStats(enhancedData[0] || null);
      }

      // Carregar breakdown por tipo de usuário
      const { data: breakdownData, error: breakdownError } = await supabase
        .rpc('get_user_type_breakdown');
      
      if (breakdownError) {
        console.error('❌ Erro ao carregar breakdown por tipo de usuário:', breakdownError);
        // Não falhar se a função nova não existir ainda
      } else {
        console.log('👥 Breakdown por tipo de usuário:', breakdownData);
        setUserTypeBreakdown(breakdownData || []);
      }

    } catch (error) {
      console.error('💥 Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = documents.reduce((sum, doc) => sum + (doc.total_cost || 0), 0);
  const completedDocuments = documents.filter(doc => doc.status === 'completed').length;
  const pendingDocuments = documents.filter(doc => doc.status === 'pending').length;
  
  // Calcular métricas adicionais
  const uniqueUsers = new Set(documents.map(doc => doc.user_id)).size;
  const avgRevenuePerDoc = documents.length > 0 ? totalRevenue / documents.length : 0;
  const completionRate = documents.length > 0 ? (completedDocuments / documents.length) * 100 : 0;

  // Estatísticas principais com separação por tipo de usuário
  const stats = [
    {
      title: 'Total Payments',
      value: paymentStats ? paymentStats.total_payments : '...',
      subtitle: paymentStats ? `$${paymentStats.total_amount?.toFixed(2) || '0'}` : 'Loading...',
      icon: CreditCard,
      bgColor: 'bg-tfe-blue-100',
      iconColor: 'text-tfe-blue-950',
      trend: null
    },
    {
      title: 'Total Revenue',
      value: enhancedStats ? `$${enhancedStats.total_revenue?.toFixed(0) || '0'}` : `$${totalRevenue.toLocaleString()}`,
      subtitle: enhancedStats ? `${enhancedStats.total_documents || 0} documents` : `Avg: $${avgRevenuePerDoc.toFixed(0)}/doc`,
      icon: DollarSign,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-900',
      trend: 'up'
    },
    {
      title: 'User Uploads',
      value: enhancedStats ? enhancedStats.user_uploads_total : '...',
      subtitle: enhancedStats ? `$${enhancedStats.user_uploads_revenue?.toFixed(0) || '0'} revenue` : 'Loading...',
      icon: Users,
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-900',
      trend: null
    },
    {
      title: 'Authenticator Uploads',
      value: enhancedStats ? enhancedStats.authenticator_uploads_total : '...',
      subtitle: enhancedStats ? `$${enhancedStats.authenticator_uploads_revenue?.toFixed(0) || '0'} revenue` : 'Loading...',
      icon: UserCheck,
      bgColor: 'bg-orange-100',
      iconColor: 'text-orange-900',
      trend: null
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-8 w-full">
      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
            <div key={index} className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 w-full">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-gray-600 font-medium">{stat.title}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  {stat.subtitle && (
                    <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
                  )}
                </div>
                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${stat.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.iconColor}`} />
              </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* User Type Breakdown */}
      {userTypeBreakdown.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 w-full">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Breakdown por Tipo de Usuário</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {userTypeBreakdown.map((breakdown, index) => (
              <div key={index} className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold text-gray-900">{breakdown.user_type}</h4>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    breakdown.user_type === 'Regular Users' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {breakdown.total_documents} docs
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Completados:</span>
                    <span className="font-medium text-green-600">{breakdown.completed_documents}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pendentes:</span>
                    <span className="font-medium text-yellow-600">{breakdown.pending_documents}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Rejeitados:</span>
                    <span className="font-medium text-red-600">{breakdown.rejected_documents}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-gray-700">Receita Total:</span>
                      <span className="text-green-600">${breakdown.total_revenue?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Média por doc:</span>
                      <span>${breakdown.avg_revenue_per_doc?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
