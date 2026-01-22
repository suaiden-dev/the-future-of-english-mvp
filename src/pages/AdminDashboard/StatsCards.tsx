import { useState, useEffect, useCallback } from 'react';
import { FileText, CheckCircle, Clock, DollarSign, Users, AlertCircle, UserCheck } from 'lucide-react';
import { Document } from '../../App';
import { supabase } from '../../lib/supabase';
import { CardSkeleton, StatusCardSkeleton } from '../../components/Skeleton';

interface StatsCardsProps {
  documents: Document[];
}

export function StatsCards({ documents }: StatsCardsProps) {
  const [extendedStats, setExtendedStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [overrideRevenue, setOverrideRevenue] = useState<number | null>(null);
  const [authenticatorRevenue, setAuthenticatorRevenue] = useState<number>(0);
  
  const completedDocuments = documents.filter(doc => doc.status === 'completed').length;
  const pendingDocuments = documents.filter(doc => doc.status === 'pending').length;
  const processingDocuments = documents.filter(doc => doc.status === 'processing').length;
  
  // Calcular métricas adicionais
  const uniqueUsers = new Set(documents.map(doc => doc.user_id)).size;
  
  // ✅ OTIMIZADO: Buscar dados exatos para receita (apenas pagamentos com status 'completed')
  // Não incluir receita de autenticador pois não é lucro (valores ficam pending e não são pagos)
  // ✅ OTIMIZADO: Adicionar cache e evitar múltiplas requisições
  useEffect(() => {
    let isMounted = true;
    const fetchRevenueData = async () => {
      setRevenueLoading(true);
      try {
        // ✅ OTIMIZADO: Combinar queries em paralelo para melhor performance
        // Fazer queries separadas para evitar problemas com relacionamentos
        const [paysRes, docsRes, profilesRes] = await Promise.all([
          supabase
            .from('payments')
            .select('id, document_id, amount, status, user_id')
            .eq('status', 'completed'), // Filtrar no banco, não no cliente
          supabase
            .from('documents')
            .select('id, total_cost, user_id')
            .or('is_internal_use.is.null,is_internal_use.eq.false'),
          supabase
            .from('profiles')
            .select('id, role')
        ]);
        
        // ✅ OTIMIZADO: Verificar se componente ainda está montado
        if (!isMounted) return;
        
        // Log de erro se houver
        if (docsRes.error) {
          console.error('❌ [AUTH REV DEBUG] Erro ao buscar documentos:', docsRes.error);
        }
        if (profilesRes.error) {
          console.error('❌ [AUTH REV DEBUG] Erro ao buscar profiles:', profilesRes.error);
        }
        
        // Criar mapa de user_id -> role para lookup rápido
        const userRoleMap = new Map<string, string>();
        (profilesRes.data || []).forEach((profile: any) => {
          if (profile.id && profile.role) {
            userRoleMap.set(profile.id, profile.role);
          }
        });
        
        // ✅ OTIMIZADO: Reduzir logs em produção
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 [AUTH REV DEBUG] Profiles carregados:', profilesRes.data?.length || 0);
          console.log('🔍 [AUTH REV DEBUG] User role map size:', userRoleMap.size);
          
          // Log de exemplo de documento retornado
          if (docsRes.data && docsRes.data.length > 0) {
            const firstDoc = docsRes.data[0];
            const userRole = userRoleMap.get(firstDoc.user_id);
            console.log('🔍 [AUTH REV DEBUG] Exemplo de documento retornado:', {
              id: firstDoc.id,
              total_cost: firstDoc.total_cost,
              user_id: firstDoc.user_id,
              user_role: userRole || 'NOT FOUND'
            });
          }
        }
        
        // Total Revenue = Soma de todos os pagamentos com status = 'completed' EXCETO os de autenticadores
        // Autenticadores têm um card separado (Authenticator Revenue)
        let userRev = 0;
        let authPaymentsRev = 0; // Pagamentos completed de autenticadores (se houver)
        const completedPayments: any[] = [];
        let paymentsExcluded = 0;
        let authenticatorPaymentsExcluded = 0;
        
        (paysRes.data || []).forEach((p: any) => {
          // Considerar apenas pagamentos com status 'completed' (pagamentos realmente pagos)
          if (p?.status === 'completed') {
            // Verificar se o usuário é autenticador
            const userRole = userRoleMap.get(p.user_id || '');
            if (userRole === 'authenticator') {
              // Separar pagamentos de autenticadores (serão incluídos no Authenticator Revenue)
              authPaymentsRev += Number(p?.amount || 0);
              authenticatorPaymentsExcluded++;
              return;
            }
            
            // Somar apenas pagamentos de usuários regulares
            userRev += Number(p?.amount || 0);
            completedPayments.push({
              id: p.id,
              document_id: p.document_id,
              user_id: p.user_id,
              amount: p.amount,
              status: p.status
            });
          } else {
            paymentsExcluded++;
          }
        });
        
        // Calcular também o total usando total_cost dos documentos (como era antes)
        let totalFromDocuments = 0;
        let userDocsFromDocuments = 0;
        let authDocsFromDocuments = 0;
        
        (docsRes.data || []).forEach((doc: any) => {
          const userRole = userRoleMap.get(doc.user_id);
          const cost = Number(doc.total_cost || 0);
          
          if (userRole === 'authenticator') {
            authDocsFromDocuments += cost;
          } else {
            userDocsFromDocuments += cost;
            totalFromDocuments += cost;
          }
        });
        
        // ✅ OTIMIZADO: Reduzir logs em produção
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 [REVENUE DEBUG] ========== ANÁLISE DE PAGAMENTOS ==========');
          console.log('🔍 [REVENUE DEBUG] Total pagamentos na tabela:', paysRes.data?.length || 0);
          console.log('🔍 [REVENUE DEBUG] Pagamentos completed (usuários regulares):', completedPayments.length);
          console.log('🔍 [REVENUE DEBUG] Pagamentos excluídos (não completed):', paymentsExcluded);
          console.log('🔍 [REVENUE DEBUG] Pagamentos de autenticadores excluídos:', authenticatorPaymentsExcluded);
          console.log('🔍 [REVENUE DEBUG] Total Revenue (completed, excluindo autenticadores):', userRev.toFixed(2));
          console.log('🔍 [REVENUE DEBUG] ===========================================');
          console.log('🔍 [COMPARISON DEBUG] ========== COMPARAÇÃO DE MÉTODOS ==========');
          console.log('🔍 [COMPARISON DEBUG] Método 1 - Tabela payments (completed, excluindo auth):', userRev.toFixed(2));
          console.log('🔍 [COMPARISON DEBUG] Método 2 - Tabela documents (total_cost, excluindo auth):', totalFromDocuments.toFixed(2));
          console.log('🔍 [COMPARISON DEBUG] Authenticator revenue (total_cost):', authDocsFromDocuments.toFixed(2));
          console.log('🔍 [COMPARISON DEBUG] Total geral (todos documentos):', (totalFromDocuments + authDocsFromDocuments).toFixed(2));
          console.log('🔍 [COMPARISON DEBUG] Diferença entre métodos:', (totalFromDocuments - userRev).toFixed(2));
          console.log('🔍 [COMPARISON DEBUG] ===========================================');
        }
        
        // Calcular receita de autenticadores (apenas para controle, não incluída no Total Revenue)
        // Incluir APENAS os documentos de autenticadores (total_cost)
        // NÃO incluir pagamentos completed de autenticadores, pois esses já foram pagos
        // Authenticator Revenue é para controle de documentos internos (uploads de autenticadores)
        // ✅ OTIMIZADO: Analisar documentos de autenticadores (reduzir logs)
        const authenticatorDocs: any[] = [];
        const authenticatorDocsWithCost: any[] = [];
        let authRev = 0;
        
        (docsRes.data || []).forEach((doc: any) => {
          // Buscar role do usuário no mapa
          const userRole = userRoleMap.get(doc.user_id);
          
          // Verificar se é autenticador
          if (userRole === 'authenticator') {
            authenticatorDocs.push(doc);
            
            // Nota: is_internal_use não existe na tabela documents
            // Por enquanto, incluímos todos os documentos de autenticadores
            
            // Verificar se tem total_cost
            const cost = Number(doc.total_cost || 0);
            if (cost > 0) {
              authenticatorDocsWithCost.push({
                id: doc.id,
                total_cost: cost,
                user_id: doc.user_id,
                role: userRole
              });
              authRev += cost;
            }
          }
        });
        
        // NÃO adicionar pagamentos completed de autenticadores ao Authenticator Revenue
        // Authenticator Revenue é apenas para documentos (uploads internos)
        // Pagamentos completed de autenticadores não devem ser incluídos aqui
        
        // ✅ OTIMIZADO: Reduzir logs em produção
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 ADMIN DASHBOARD - Total completed payments (usuários regulares):', completedPayments.length);
          console.log('🔍 ADMIN DASHBOARD - Total revenue (completed, excluindo autenticadores):', userRev.toFixed(2));
          console.log('🔍 ADMIN DASHBOARD - Authenticator payments completed (excluídos do Total Revenue):', authPaymentsRev.toFixed(2));
          console.log('🔍 ADMIN DASHBOARD - Authenticator revenue (apenas documentos, não pagamentos):', authRev.toFixed(2));
          console.log('🔍 ADMIN DASHBOARD - [DEBUG] userRev antes de setOverrideRevenue:', userRev.toFixed(2));
          console.log('🔍 ADMIN DASHBOARD - [DEBUG] authRev antes de setAuthenticatorRevenue:', authRev.toFixed(2));
        }
        
        if (isMounted) {
          // ✅ CORREÇÃO: Verificar se os valores estão sendo atribuídos corretamente
          // userRev deve ir para Total Revenue (usuários regulares)
          // authRev deve ir para Authenticator Revenue (autenticadores)
          setOverrideRevenue(userRev);
          setAuthenticatorRevenue(authRev);
          
          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 ADMIN DASHBOARD - [DEBUG] Valores atribuídos:');
            console.log('  - overrideRevenue (Total Revenue):', userRev.toFixed(2));
            console.log('  - authenticatorRevenue (Authenticator Revenue):', authRev.toFixed(2));
          }
        }
      } catch (e) {
        if (isMounted) {
          console.warn('Revenue fetch failed, fallback to doc-based', e);
          setOverrideRevenue(null);
          setAuthenticatorRevenue(0);
        }
      } finally {
        if (isMounted) {
          setRevenueLoading(false);
        }
      }
    };
    fetchRevenueData();
    
    // ✅ OTIMIZADO: Cleanup para evitar atualizações após desmontagem
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Usar overrideRevenue se disponível (calculado corretamente excluindo autenticadores)
  // Se não estiver disponível, retornar 0 ao invés de usar fallback que incluiria autenticadores
  // O fetch deve sempre funcionar, então este é apenas um fallback de segurança
  const totalRevenue = overrideRevenue !== null ? overrideRevenue : 0;
  const avgRevenuePerDoc = documents.length > 0 ? totalRevenue / documents.length : 0;

  // ✅ OTIMIZADO: Buscar estatísticas estendidas do banco de dados com cache
  const fetchExtendedStats = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ OTIMIZADO: Buscar estatísticas de todas as tabelas relevantes em paralelo
      // Otimizar: buscar apenas campos necessários e usar contagem quando possível
      const [documentsResult, verifiedResult, translatedResult, profilesResult] = await Promise.all([
        supabase
          .from('documents')
          .select('id, status, user_id, filename, created_at')
          .or('is_internal_use.is.null,is_internal_use.eq.false')
          .limit(5000), // ✅ OTIMIZADO: Reduzir limite
        supabase
          .from('documents_to_be_verified')
          .select('id, status, user_id, filename, original_document_id, created_at')
          .limit(5000), // ✅ OTIMIZADO: Reduzir limite
        supabase
          .from('translated_documents')
          .select('status, user_id')
          .limit(5000), // ✅ OTIMIZADO: Reduzir limite
        supabase
          .from('profiles')
          .select('id, role, created_at')
          .limit(5000) // ✅ OTIMIZADO: Reduzir limite
      ]);

      // Verificar erros
      if (documentsResult.error) {
        console.error('❌ [STATS] Error fetching documents:', documentsResult.error);
      }
      if (verifiedResult.error) {
        console.error('❌ [STATS] Error fetching verified documents:', verifiedResult.error);
      }
      if (translatedResult.error) {
        console.error('❌ [STATS] Error fetching translated documents:', translatedResult.error);
      }
      if (profilesResult.error) {
        console.error('❌ [STATS] Error fetching profiles:', profilesResult.error);
      }

      if (documentsResult.data && verifiedResult.data && translatedResult.data && profilesResult.data) {
        const mainDocuments = documentsResult.data;
        const verifiedDocuments = verifiedResult.data;
        const allProfiles = profilesResult.data;

        // ✅ OTIMIZADO: Reduzir logs em produção
        if (process.env.NODE_ENV === 'development') {
          console.log('📊 [STATS] Total documents in documents table:', mainDocuments.length);
          console.log('📊 [STATS] Total documents in verified table:', verifiedDocuments.length);
          console.log('📊 [STATS] Total users in profiles table:', allProfiles.length);
        }

        // USAR A MESMA LÓGICA DO DocumentsTable.tsx (EXATAMENTE IGUAL)
        // Criar mapa dos documentos verificados para lookup rápido
        const verifiedDocsMap = new Map();
        (verifiedDocuments || []).forEach((verifiedDoc: any) => {
          // Primeira prioridade: relacionar por original_document_id
          if (verifiedDoc.original_document_id) {
            verifiedDocsMap.set(verifiedDoc.original_document_id, verifiedDoc);
          } else {
            // Segunda prioridade: relacionar por user_id + filename
            const key = `${verifiedDoc.user_id}_${verifiedDoc.filename}`;
            verifiedDocsMap.set(key, verifiedDoc);
          }
        });

        // Processar TODOS os documentos da tabela documents como base
        const documentsWithCorrectStatus = mainDocuments.map((mainDoc: any) => {
          // Verificar se existe em documents_to_be_verified
          let verifiedDoc = null;

          // Primeira tentativa: buscar por ID direto
          if (verifiedDocsMap.has(mainDoc.id)) {
            verifiedDoc = verifiedDocsMap.get(mainDoc.id);
          } else {
            // Segunda tentativa: buscar por user_id + filename
            const key = `${mainDoc.user_id}_${mainDoc.filename}`;
            if (verifiedDocsMap.has(key)) {
              verifiedDoc = verifiedDocsMap.get(key);
            }
          }

          // Determinar status final - EXATAMENTE COMO NO DocumentsTable
          let finalStatus = 'processing'; // Default: se não está em documents_to_be_verified

          if (verifiedDoc) {
            // Se existe em documents_to_be_verified, usar esse status
            finalStatus = verifiedDoc.status;
          }

          return {
            ...mainDoc,
            finalStatus,
            hasVerificationRecord: !!verifiedDoc
          };
        });

        // Contar status corretos usando a MESMA lógica do DocumentsTable
        const statusCounts = documentsWithCorrectStatus.reduce((acc: any, doc: any) => {
          acc[doc.finalStatus] = (acc[doc.finalStatus] || 0) + 1;
          return acc;
        }, {});

        // Debug: verificar quantos documentos completed existem
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 [STATS DEBUG] Status counts (from documents table):', statusCounts);
          console.log('🔍 [STATS DEBUG] Completed documents:', statusCounts.completed || 0);
          console.log('🔍 [STATS DEBUG] Processing documents:', statusCounts.processing || 0);
          console.log('🔍 [STATS DEBUG] Pending documents:', statusCounts.pending || 0);
          console.log('🔍 [STATS DEBUG] Documents with verification record:', documentsWithCorrectStatus.filter(d => d.hasVerificationRecord).length);
          console.log('🔍 [STATS DEBUG] Documents without verification record:', documentsWithCorrectStatus.filter(d => !d.hasVerificationRecord).length);
        }

        // Log de debug detalhado
        const matchStats = {
          with_verification: documentsWithCorrectStatus.filter(d => d.hasVerificationRecord).length,
          without_verification: documentsWithCorrectStatus.filter(d => !d.hasVerificationRecord).length
        };

        const stats = {
          total_documents: mainDocuments.length, // Total de documentos únicos da tabela documents
          completed: (statusCounts.completed || 0) + (statusCounts.rejected || 0), // Incluir rejeitados como completados
          pending: statusCounts.pending || 0,
          processing: statusCounts.processing || 0,
          rejected: statusCounts.rejected || 0, // Manter para referência
          translated: translatedResult.data.length,
          active_users: allProfiles.length
        };

        // ✅ OTIMIZADO: Reduzir logs em produção
        if (process.env.NODE_ENV === 'development') {
          console.log('📈 [STATS NOVA LÓGICA] Using same logic as DocumentsTable:', stats);
          console.log('📊 [STATS STATUS BREAKDOWN]:', statusCounts);
          console.log('🔗 [STATS MATCH BREAKDOWN]:', matchStats);
        }
        setExtendedStats(stats);
      } else {
        console.warn('⚠️ [STATS] Missing data from one or more queries');
        console.warn('⚠️ [STATS] documentsResult:', documentsResult.error ? 'ERROR' : 'OK', documentsResult.data?.length || 0);
        console.warn('⚠️ [STATS] verifiedResult:', verifiedResult.error ? 'ERROR' : 'OK', verifiedResult.data?.length || 0);
        console.warn('⚠️ [STATS] translatedResult:', translatedResult.error ? 'ERROR' : 'OK', translatedResult.data?.length || 0);
        console.warn('⚠️ [STATS] profilesResult:', profilesResult.error ? 'ERROR' : 'OK', profilesResult.data?.length || 0);
      }
    } catch (error) {
      console.error('❌ [STATS ERROR] Error fetching extended stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ OTIMIZADO: Executar apenas uma vez no mount
  useEffect(() => {
    fetchExtendedStats();
  }, [fetchExtendedStats]);

  const stats = [
    {
      title: 'Total Documents',
      value: documents.length,
      subtitle: 'All time',
      icon: FileText,
      bgColor: 'bg-tfe-blue-100',
      iconColor: 'text-tfe-blue-950',
      trend: null
    },
    {
      title: 'Total Revenue',
      value: `$${totalRevenue.toLocaleString()}`,
      subtitle: `Avg: $${avgRevenuePerDoc.toFixed(0)}/doc`,
      icon: DollarSign,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-900',
      trend: 'up'
    },
    {
      title: 'Authenticator Revenue',
      value: `$${authenticatorRevenue.toLocaleString()}`,
      subtitle: 'Internal use (not included in Total)',
      icon: UserCheck,
      bgColor: 'bg-orange-100',
      iconColor: 'text-orange-900',
      trend: null
    },
    {
      title: 'Active Users',
      value: extendedStats?.active_users || uniqueUsers,
      subtitle: 'Registered users',
      icon: Users,
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-900',
      trend: null
    }
  ];

  const statusStats = [
    {
      title: 'Completed',
      value: extendedStats?.completed || completedDocuments,
      icon: CheckCircle,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-900',
      textColor: 'text-green-700',
      description: 'Translated and Authenticated'
    },
    {
      title: 'Processing', 
      value: extendedStats?.processing || processingDocuments,
      icon: Clock,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-900',
      textColor: 'text-blue-700',
      description: 'Not translated and not authenticated'
    },
    {
      title: 'Pending',
      value: extendedStats?.pending || pendingDocuments,
      icon: AlertCircle,
      bgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-900',
      textColor: 'text-yellow-700',
      description: 'Translated, awaiting Authenticator approval'
    }
  ];

  // Mostrar skeleton enquanto carrega
  if (loading || revenueLoading) {
    return (
      <div className="space-y-3 sm:space-y-4 lg:space-y-6 mb-4 sm:mb-6 lg:mb-8 w-full">
        {/* Main Stats Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 w-full">
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        {/* Status Breakdown Skeleton */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 lg:p-6 w-full">
          <div className="flex items-center gap-2 mb-3 sm:mb-4 lg:mb-6">
            <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 w-full">
            {[...Array(3)].map((_, i) => (
              <StatusCardSkeleton key={i} />
            ))}
          </div>
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

      {/* Status Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 lg:p-6 w-full">
        <div className="flex items-center gap-2 mb-3 sm:mb-4 lg:mb-6">
          <AlertCircle className="w-4 h-4 text-gray-600 flex-shrink-0" />
          <h3 className="text-sm sm:text-base font-semibold text-gray-900">Status Breakdown</h3>
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-tfe-blue-600"></div>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 w-full">
          {statusStats.map((stat, index) => {
            const Icon = stat.icon;
            
            return (
              <div key={index} className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200 hover:bg-gray-100 transition-colors w-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${stat.iconColor}`} />
                    </div>
                    <h4 className="text-xs sm:text-sm font-medium text-gray-900 truncate">{stat.title}</h4>
                  </div>
                  <div className="text-right">
                    <div className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-xs text-gray-500">docs</div>
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-300">
                  <div className="text-xs text-gray-600">{stat.description}</div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}