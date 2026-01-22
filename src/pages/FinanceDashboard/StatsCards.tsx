import { useState, useEffect } from 'react';
import { DollarSign, Users, CreditCard, UserCheck, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DateRange } from '../../components/DateRangeFilter';

interface StatsCardsProps {
  dateRange?: DateRange;
}

export function StatsCards({ dateRange }: StatsCardsProps) {
  const [enhancedStats, setEnhancedStats] = useState<any>(null);
  const [userTypeBreakdown, setUserTypeBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [dateRange]);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Buscar dados da tabela documents (excluir documentos de uso interno)
      let documentsQuery = supabase
        .from('documents')
        .select(`
          *,
          profiles:user_id (
            id,
            role
          )
        `)
        .or('is_internal_use.is.null,is_internal_use.eq.false');
      
      // Aplicar filtros de data se fornecidos
      if (dateRange?.startDate) {
        documentsQuery = documentsQuery.gte('created_at', dateRange.startDate.toISOString());
      }
      if (dateRange?.endDate) {
        documentsQuery = documentsQuery.lte('created_at', dateRange.endDate.toISOString());
      }
      
      const { data: documentsData, error: documentsError } = await documentsQuery;
      
      if (documentsError) {
        console.error('❌ [FINANCE] Erro ao buscar documentos:', documentsError);
        return;
      }
      
      console.log('✅ [FINANCE] Documents loaded:', documentsData?.length || 0);
      console.log('🔍 [FINANCE] Sample document:', documentsData?.[0]);

      // Buscar dados atualizados da tabela documents_to_be_verified
      let verifiedQuery = supabase
        .from('documents_to_be_verified')
        .select('*');
      
      // Aplicar filtros de data se fornecidos
      if (dateRange?.startDate) {
        verifiedQuery = verifiedQuery.gte('created_at', dateRange.startDate.toISOString());
      }
      if (dateRange?.endDate) {
        verifiedQuery = verifiedQuery.lte('created_at', dateRange.endDate.toISOString());
      }
      
      const { data: verifiedData, error: verifiedError } = await verifiedQuery;
      
      if (verifiedError) {
        console.error('❌ [FINANCE] Erro ao buscar documentos verificados:', verifiedError);
      }
      
      console.log('✅ [FINANCE] Verified documents loaded:', verifiedData?.length || 0);
      console.log('🔍 [FINANCE] Sample verified doc:', verifiedData?.[0]);

      // Criar Maps para matching eficiente (mesma lógica do Admin Dashboard)
      const verifiedDocsMap = new Map();
      const verifiedDocsByOriginalId = new Map();
      
      (verifiedData || []).forEach((verifiedDoc: any) => {
        // Map por original_document_id
        if (verifiedDoc.original_document_id) {
          verifiedDocsByOriginalId.set(verifiedDoc.original_document_id, verifiedDoc);
        }
        // Map por id
        verifiedDocsMap.set(verifiedDoc.id, verifiedDoc);
        // Map por user_id + filename
        const key = `${verifiedDoc.user_id}_${verifiedDoc.filename}`;
        verifiedDocsMap.set(key, verifiedDoc);
      });

      // Mesclar dados: priorizar status da documents_to_be_verified
      const allDocs = (documentsData || []).map(doc => {
        let verifiedDoc = null;
        
        // Tentar 3 métodos de matching (em ordem de prioridade)
        if (verifiedDocsMap.has(doc.id)) {
          verifiedDoc = verifiedDocsMap.get(doc.id);
        } else if (verifiedDocsByOriginalId.has(doc.id)) {
          verifiedDoc = verifiedDocsByOriginalId.get(doc.id);
        } else {
          const key = `${doc.user_id}_${doc.filename}`;
          if (verifiedDocsMap.has(key)) {
            verifiedDoc = verifiedDocsMap.get(key);
          }
        }
        
        // Usar status de documents_to_be_verified se disponível, senão usar de documents
        const finalStatus = verifiedDoc ? verifiedDoc.status : doc.status;
        
        return {
          ...doc,
          status: finalStatus,
          hasVerificationRecord: !!verifiedDoc
        };
      });
      
      console.log('📊 [FINANCE] Total docs after merging:', allDocs.length);
      console.log('🔍 [FINANCE] Sample merged doc:', allDocs[0]);
      
      // Preparar query para payments
      let paymentsQuery = supabase
        .from('payments')
        .select('*');
      
      // Aplicar filtros de data se fornecidos
      if (dateRange?.startDate) {
        paymentsQuery = paymentsQuery.gte('created_at', dateRange.startDate.toISOString());
      }
      if (dateRange?.endDate) {
        paymentsQuery = paymentsQuery.lte('created_at', dateRange.endDate.toISOString());
      }
      
      const { data: paymentsData, error: paymentsError } = await paymentsQuery;
      
      if (paymentsError) {
        console.error('❌ [FINANCE] Erro ao buscar pagamentos:', paymentsError);
      }
      
      console.log('✅ [FINANCE] Payments loaded:', paymentsData?.length || 0);
      console.log('🔍 [FINANCE] Sample payment:', paymentsData?.[0]);
      
      
      // Calcular estatísticas manualmente
      const allPayments = paymentsData || [];
      
      // Estatísticas de pagamentos (calculadas mas não utilizadas no momento)
      const calculatedPaymentStats = {
        total_payments: allPayments.length,
        total_amount: allPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
        completed_payments: allPayments.filter(p => p.status === 'completed').length,
        pending_payments: allPayments.filter(p => p.status === 'pending').length,
        failed_payments: allPayments.filter(p => p.status === 'failed').length
      };
      
      // User Uploads: usar dados da tabela payments
      // NÃO incluir receita de autenticador pois não é lucro (valores ficam pending e não são pagos)
      
      // Revenue de usuários regulares (User Uploads) - usar tabela payments
      // MESMA LÓGICA DO ADMIN DASHBOARD: somar apenas pagamentos completed de usuários regulares
      // Buscar role do usuário para filtrar authenticators
      const userRoleMap = new Map();
      const { data: profilesData } = await supabase.from('profiles').select('id, role');
      profilesData?.forEach(profile => {
        userRoleMap.set(profile.id, profile.role);
      });
      
      const regularRevenue = paymentsData?.reduce((sum, payment) => {
        const userRole = userRoleMap.get(payment.user_id);
        // Considerar apenas pagamentos completed de usuários NÃO authenticators
        if (payment.status === 'completed' && userRole !== 'authenticator') {
          return sum + (payment.amount || 0);
        }
        return sum;
      }, 0) || 0;
      
      // 🔍 LOG COMPARATIVO
      const allCompletedPayments = paymentsData?.filter(p => p.status === 'completed') || [];
      const regularCompletedPayments = allCompletedPayments.filter(p => userRoleMap.get(p.user_id) !== 'authenticator');
      const authCompletedPayments = allCompletedPayments.filter(p => userRoleMap.get(p.user_id) === 'authenticator');
      
      console.log('🔍 FINANCE DASHBOARD - Total completed payments:', allCompletedPayments.length);
      console.log('🔍 FINANCE DASHBOARD - Regular users completed payments:', regularCompletedPayments.length);
      console.log('🔍 FINANCE DASHBOARD - Authenticators completed payments (excluded):', authCompletedPayments.length);
      console.log('🔍 FINANCE DASHBOARD - Regular revenue (users only):', regularRevenue.toFixed(2));
      
      // Revenue de autenticadores não é incluída no Total Revenue
      // pois não é lucro (valores ficam pending e não são pagos)
      // Excluir documentos de uso pessoal (is_internal_use = true)
      const authenticatorRevenue = documentsData?.reduce((sum, doc) => {
        if (doc.profiles?.role === 'authenticator' && !doc.is_internal_use) {
          return sum + (doc.total_cost || 0);
        }
        return sum;
      }, 0) || 0;
      
      // Total Revenue: apenas pagamentos completed de usuários regulares
      const totalRevenue = regularRevenue;
      
      console.log('🔍 Debug - StatsCards total_revenue (only completed payments):', totalRevenue);
      console.log('🔍 Debug - User Uploads revenue (from payments table, status=completed):', regularRevenue);
      console.log('🔍 Debug - Authenticator Uploads revenue (excluded from total):', authenticatorRevenue);
      
      // Estatísticas de tradução calculadas mas não utilizadas no momento
      // const calculatedTranslationStats = {
      //   total_documents: allDocs.length,
      //   completed_translations: allDocs.filter(d => d.status === 'completed').length,
      //   pending_translations: allDocs.filter(d => d.status === 'pending').length,
      //   total_revenue: totalRevenue
      // };
      
      // Log de debug do matching de status
      const withVerification = allDocs.filter(d => d.hasVerificationRecord).length;
      const withoutVerification = allDocs.filter(d => !d.hasVerificationRecord).length;
      console.log('📊 [FINANCE] Documents with verification record:', withVerification);
      console.log('📊 [FINANCE] Documents without verification record:', withoutVerification);
      
      const statusCounts = allDocs.reduce((acc: any, doc: any) => {
        acc[doc.status] = (acc[doc.status] || 0) + 1;
        return acc;
      }, {});
      console.log('📊 [FINANCE] Status distribution:', statusCounts);
      
      // Separar por tipo de usuário (excluindo documentos de uso interno)
      const userDocs = allDocs.filter(d => d.profiles?.role === 'user' && !d.is_internal_use);
      const authenticatorDocs = allDocs.filter(d => d.profiles?.role === 'authenticator' && !d.is_internal_use);
      
      // Estatísticas aprimoradas com separação por tipo de usuário
      const calculatedEnhancedStats = {
        total_documents: allDocs.length,
        total_revenue: totalRevenue, // Usar o totalRevenue calculado com a nova lógica
        
        // User uploads
        user_uploads_total: userDocs.length,
        user_uploads_completed: userDocs.filter(d => d.status === 'completed').length,
        user_uploads_pending: userDocs.filter(d => d.status === 'pending').length,
        user_uploads_revenue: regularRevenue, // Revenue de usuários regulares (tabela payments)
        
        // Authenticator uploads  
        authenticator_uploads_total: authenticatorDocs.length,
        authenticator_uploads_completed: authenticatorDocs.filter(d => d.status === 'completed').length,
        authenticator_uploads_pending: authenticatorDocs.filter(d => d.status === 'pending').length,
        authenticator_uploads_revenue: authenticatorRevenue, // Revenue de autenticadores (tabela documents)
        
        // Status breakdown
        total_completed: allDocs.filter(d => d.status === 'completed').length,
        total_pending: allDocs.filter(d => d.status === 'pending').length,
        total_processing: allDocs.filter(d => d.status === 'processing').length,
        total_rejected: allDocs.filter(d => d.status === 'rejected').length
      };
      

      setEnhancedStats(calculatedEnhancedStats);
      
      // Breakdown por tipo de usuário usando os status reais mesclados
      const calculatedBreakdown = [
        {
          user_type: "Regular Users",
          total_documents: userDocs.length,
          completed_documents: userDocs.filter(d => d.status === 'completed').length,
          pending_documents: userDocs.filter(d => d.status === 'pending').length,
          processing_documents: userDocs.filter(d => d.status === 'processing').length,
          rejected_documents: userDocs.filter(d => d.status === 'rejected').length,
          total_revenue: regularRevenue, // Revenue de usuários regulares (tabela payments)
          avg_revenue_per_doc: userDocs.length > 0 ? regularRevenue / userDocs.length : 0
        },
        {
          user_type: "Authenticators", 
          total_documents: authenticatorDocs.length,
          completed_documents: authenticatorDocs.filter(d => d.status === 'completed').length,
          pending_documents: authenticatorDocs.filter(d => d.status === 'pending').length,
          processing_documents: authenticatorDocs.filter(d => d.status === 'processing').length,
          rejected_documents: authenticatorDocs.filter(d => d.status === 'rejected').length,
          total_revenue: authenticatorRevenue, // Revenue de autenticadores (tabela documents)
          avg_revenue_per_doc: authenticatorDocs.length > 0 ? authenticatorRevenue / authenticatorDocs.length : 0
        }
      ];
      
      setUserTypeBreakdown(calculatedBreakdown);

      // Debug dos valores calculados
      console.log('🔍 Enhanced Stats:', calculatedEnhancedStats);
      console.log('🔍 Payment Stats:', calculatedPaymentStats);
      console.log('🔍 User Uploads Revenue (from payments table):', regularRevenue);
      console.log('🔍 Authenticator Uploads Revenue (from documents table):', authenticatorRevenue);
      console.log('🔍 Total Revenue (corrected):', totalRevenue);

    } catch (error) {
      console.error('💥 Erro geral ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calcular valores reais primeiro - usar sempre os dados do enhancedStats
  const realRevenue = enhancedStats?.total_revenue ?? 0;
  
  const realDocuments = enhancedStats?.total_documents ?? 0;

  // Debug simplificado - removido para reduzir logs
  // console.log('🎯 DEBUG Estados atuais:', { loading });

  // Calcular valores reais para todos os cards - usar sempre os dados do enhancedStats
  const realUserUploads = enhancedStats?.user_uploads_total ?? 0;
    
  const realUserRevenue = enhancedStats?.user_uploads_revenue ?? 0;
    
  const realAuthUploads = enhancedStats?.authenticator_uploads_total ?? 0;
    
  const realAuthRevenue = enhancedStats?.authenticator_uploads_revenue ?? 0;

  // Debug dos valores finais
  console.log('🎯 Final Values:', {
    realRevenue,
    realDocuments,
    realUserUploads,
    realUserRevenue,
    realAuthUploads,
    realAuthRevenue
  });


  // Estatísticas principais com separação por tipo de usuário
  const stats = [
    {
      title: 'Total Payments',
      value: realDocuments || 0, // Total de documentos (users + authenticators)
      subtitle: `$${realRevenue?.toFixed(2) || '0.00'}`, // Revenue total
      icon: CreditCard,
      bgColor: 'bg-tfe-blue-100',
      iconColor: 'text-tfe-blue-950',
      trend: null
    },
    {
      title: 'Total Revenue',
      value: `$${realRevenue?.toFixed(0) || '0'}`,
      subtitle: `${realDocuments || 0} documents`,
      icon: DollarSign,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-900',
      trend: 'up'
    },
    {
      title: 'User Uploads',
      value: realUserUploads || 0,
      subtitle: `$${realUserRevenue?.toFixed(0) || '0'} revenue`,
      icon: Users,
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-900',
      trend: null
    },
    {
      title: 'Authenticator Uploads',
      value: realAuthUploads || 0,
      subtitle: `${realAuthUploads || 0} documents`,
      icon: UserCheck,
      bgColor: 'bg-orange-100',
      iconColor: 'text-orange-900',
      trend: null
    },
    {
      title: 'Authenticator Revenue',
      value: `$${realAuthRevenue?.toFixed(0) || '0'}`,
      subtitle: 'Internal use (not included in Total)',
      icon: Shield,
      bgColor: 'bg-amber-100',
      iconColor: 'text-amber-900',
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 w-full">
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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 w-full">
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
                    <div className="text-xs sm:text-sm font-medium text-gray-900">{breakdown.completed_documents || 0}</div>
                    <div className="text-xs text-gray-500">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs sm:text-sm font-medium text-gray-900">{(breakdown.processing_documents || 0) + (breakdown.pending_documents || 0)}</div>
                    <div className="text-xs text-gray-500">Processing</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs sm:text-sm font-medium text-gray-900">{breakdown.rejected_documents || 0}</div>
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