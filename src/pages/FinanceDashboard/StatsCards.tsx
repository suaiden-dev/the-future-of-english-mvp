import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, DollarSign, TrendingUp, Users, AlertCircle, CreditCard, FileBarChart, UserCheck, UserX } from 'lucide-react';
import { Document } from '../../App';
import { supabase } from '../../lib/supabase';
import { DateRange } from '../../components/DateRangeFilter';

interface StatsCardsProps {
  documents: Document[];
  dateRange?: DateRange;
}

export function StatsCards({ documents, dateRange }: StatsCardsProps) {
  const [paymentStats, setPaymentStats] = useState<any>(null);
  const [translationStats, setTranslationStats] = useState<any>(null);
  const [enhancedStats, setEnhancedStats] = useState<any>(null);
  const [userTypeBreakdown, setUserTypeBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [dateRange]);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Carregando estatísticas...', { dateRange });
      
      // Preparar parâmetros de data para as funções RPC
      const startDateParam = dateRange?.startDate ? dateRange.startDate.toISOString() : null;
      const endDateParam = dateRange?.endDate ? dateRange.endDate.toISOString() : null;
      
      // Carregar estatísticas de pagamentos com filtro de data
      const { data: paymentData, error: paymentError } = await supabase
        .rpc('get_payment_stats_filtered', {
          start_date: startDateParam,
          end_date: endDateParam
        });
      
      if (paymentError) {
        console.error('❌ Erro ao carregar estatísticas de pagamentos (tentando função original):', paymentError);
        // Fallback para função original sem filtro
        const { data: fallbackData, error: fallbackError } = await supabase
          .rpc('get_payment_stats');
        if (!fallbackError) {
          setPaymentStats(fallbackData[0] || null);
        }
      } else {
        console.log('💰 Estatísticas de pagamentos (filtradas):', paymentData);
        setPaymentStats(paymentData[0] || null);
      }

      // Carregar estatísticas de traduções com filtro de data
      const { data: translationData, error: translationError } = await supabase
        .rpc('get_translation_stats_filtered', {
          start_date: startDateParam,
          end_date: endDateParam
        });
      
      if (translationError) {
        console.error('❌ Erro ao carregar estatísticas de traduções (tentando função original):', translationError);
        // Fallback para função original
        const { data: fallbackData, error: fallbackError } = await supabase
          .rpc('get_translation_stats');
        if (!fallbackError) {
          setTranslationStats(fallbackData[0] || null);
        }
      } else {
        console.log('📊 Estatísticas de traduções (filtradas):', translationData);
        setTranslationStats(translationData[0] || null);
      }

      // Carregar estatísticas aprimoradas com separação por tipo de usuário e filtro de data
      const { data: enhancedData, error: enhancedError } = await supabase
        .rpc('get_enhanced_translation_stats_filtered', {
          start_date: startDateParam,
          end_date: endDateParam
        });
      
      if (enhancedError) {
        console.error('❌ Erro ao carregar estatísticas aprimoradas (tentando função original):', enhancedError);
        // Fallback para função original
        const { data: fallbackData, error: fallbackError } = await supabase
          .rpc('get_enhanced_translation_stats');
        if (!fallbackError) {
          setEnhancedStats(fallbackData[0] || null);
        }
      } else {
        console.log('🚀 Estatísticas aprimoradas (filtradas):', enhancedData);
        setEnhancedStats(enhancedData[0] || null);
      }

      // Carregar breakdown por tipo de usuário com filtro de data
      const { data: breakdownData, error: breakdownError } = await supabase
        .rpc('get_user_type_breakdown_filtered', {
          start_date: startDateParam,
          end_date: endDateParam
        });
      
      if (breakdownError) {
        console.error('❌ Erro ao carregar breakdown por tipo de usuário (tentando função original):', breakdownError);
        // Fallback para função original
        const { data: fallbackData, error: fallbackError } = await supabase
          .rpc('get_user_type_breakdown');
        if (!fallbackError) {
          setUserTypeBreakdown(fallbackData || []);
        }
      } else {
        console.log('👥 Breakdown por tipo de usuário (filtrado):', breakdownData);
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
      <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-3 sm:h-4 bg-gray-200 rounded w-20 sm:w-24 mb-2"></div>
                  <div className="h-6 sm:h-8 bg-gray-200 rounded w-12 sm:w-16 mb-1"></div>
                  <div className="h-2 sm:h-3 bg-gray-200 rounded w-16 sm:w-20"></div>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 mb-4 sm:mb-6 lg:mb-8 w-full">
      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 w-full">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 lg:p-5 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-8 h-8 sm:w-9 sm:h-9 ${stat.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${stat.iconColor}`} />
                </div>
              </div>
              <div className="text-xs sm:text-xs text-gray-500 uppercase tracking-wider mb-1 sm:mb-2">{stat.title}</div>
              <div className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 mb-1 break-words leading-tight">{stat.value}</div>
              {stat.subtitle && (
                <div className="text-xs text-gray-500 break-words leading-relaxed">{stat.subtitle}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* User Type Breakdown */}
      {userTypeBreakdown.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 lg:p-6 w-full">
          <div className="flex items-center gap-2 mb-3 sm:mb-4 lg:mb-6">
            <Users className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <h3 className="text-sm sm:text-base font-semibold text-gray-900">User Performance</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 w-full">
            {userTypeBreakdown.map((breakdown, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center ${
                      breakdown.user_type === 'Regular Users' 
                        ? 'bg-purple-100' 
                        : 'bg-orange-100'
                    }`}>
                      {breakdown.user_type === 'Regular Users' ? (
                        <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-purple-600" />
                      ) : (
                        <UserCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-orange-600" />
                      )}
                    </div>
                    <h4 className="text-xs sm:text-sm font-medium text-gray-900 truncate">{breakdown.user_type}</h4>
                  </div>
                  <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded whitespace-nowrap">{breakdown.total_documents} docs</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="text-center">
                    <div className="text-xs sm:text-sm font-medium text-gray-900">{breakdown.completed_documents}</div>
                    <div className="text-xs text-gray-500">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs sm:text-sm font-medium text-gray-900">{breakdown.pending_documents}</div>
                    <div className="text-xs text-gray-500">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs sm:text-sm font-medium text-gray-900">{breakdown.rejected_documents}</div>
                    <div className="text-xs text-gray-500">Rejected</div>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-gray-300">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Total Revenue</span>
                    <span className="text-xs sm:text-sm font-semibold text-green-600">${breakdown.total_revenue?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-400">Avg per doc</span>
                    <span className="text-xs text-gray-600">${breakdown.avg_revenue_per_doc?.toFixed(2) || '0.00'}</span>
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
