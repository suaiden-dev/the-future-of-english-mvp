import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface OverviewStats {
  totalDocuments: number;
  pendingDocuments: number;
  approvedDocuments: number;
  rejectedDocuments: number;
  totalValue: number;
  totalPages: number;
  myAuthentications: number;
  myAuthenticationsThisMonth: number;
  myTranslations: number; // Documentos enviados pelo autenticador para tradução
  myTranslationsThisMonth: number;
  averageProcessingTime: number;
  topLanguages: Array<{ language: string; count: number }>;
  recentActivity: Array<{
    id: string;
    filename: string;
    action: string;
    date: string;
    user_name: string;
  }>;
}

interface OverviewContextType {
  stats: OverviewStats;
  loading: boolean;
  error: string | null;
  refreshStats: () => Promise<void>;
  lastUpdated: Date | null;
}

const OverviewContext = createContext<OverviewContextType | undefined>(undefined);

export function OverviewProvider({ children }: { children: React.ReactNode }) {
  const { user: currentUser } = useAuth();
  const [stats, setStats] = useState<OverviewStats>({
    totalDocuments: 0,
    pendingDocuments: 0,
    approvedDocuments: 0,
    rejectedDocuments: 0,
    totalValue: 0,
    totalPages: 0,
    myAuthentications: 0,
    myAuthenticationsThisMonth: 0,
    myTranslations: 0,
    myTranslationsThisMonth: 0,
    averageProcessingTime: 0,
    topLanguages: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  // ✅ OTIMIZADO: Usar ref para evitar loops de dependência
  const lastUpdatedRef = useRef<Date | null>(null);

  // ✅ OTIMIZADO: Remover lastUpdated da dependência para evitar loops
  const fetchOverviewStats = useCallback(async (forceRefresh = false) => {
    if (!currentUser) return;

    // ✅ OTIMIZADO: Usar ref para verificar cache sem causar loops
    // Check if we have recent data (less than 30 seconds old)
    const now = new Date();
    const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
    
    if (!forceRefresh && lastUpdatedRef.current && lastUpdatedRef.current > thirtySecondsAgo) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // ✅ OTIMIZADO: Buscar tudo em paralelo para melhor performance
      // Fetch documents based on user role
      let allDocumentsQuery = supabase.from('documents_to_be_verified').select('*');
      let translatedDocsQuery = supabase.from('translated_documents').select('*');
      let myUploadedDocsQuery = supabase.from('documents_to_be_verified').select('*');

      // If not admin, filter by authenticated_by for translated docs
      if (currentUser.role !== 'admin') {
        translatedDocsQuery = translatedDocsQuery.eq('authenticated_by', currentUser.id);
        // Also get documents uploaded by this authenticator
        myUploadedDocsQuery = myUploadedDocsQuery.eq('user_id', currentUser.id);
      }

      // ✅ OTIMIZADO: Buscar tudo em paralelo
      const [allDocumentsResult, translatedDocsResult, myUploadedDocsResult, paymentsResult, profilesResult] = await Promise.all([
        allDocumentsQuery,
        translatedDocsQuery,
        myUploadedDocsQuery,
        supabase
          .from('payments')
          .select('id, document_id, amount, status, user_id'),
        supabase
          .from('profiles')
          .select('id, role')
      ]);

      const { data: allDocuments, error: allError } = allDocumentsResult;
      if (allError) throw allError;

      const { data: translatedDocs, error: translatedError } = translatedDocsResult;
      if (translatedError) throw translatedError;

      const { data: myUploadedDocs, error: uploadError } = myUploadedDocsResult;
      if (uploadError) throw uploadError;

      // Buscar pagamentos para calcular totalValue corretamente
      const { data: payments, error: paymentsError } = paymentsResult;

      if (paymentsError) {
        console.warn('Error fetching payments in OverviewContext:', paymentsError);
      }

      // Buscar profiles para verificar roles e excluir autenticadores
      const { data: profiles, error: profilesError } = profilesResult;
      if (profilesError) {
        console.warn('Error fetching profiles in OverviewContext:', profilesError);
      }

      // Criar mapa de user_id -> role para verificar autenticadores
      const userRoleMap = new Map<string, string>();
      (profiles || []).forEach((profile: any) => {
        if (profile.id && profile.role) {
          userRoleMap.set(profile.id, profile.role);
        }
      });

      // Calculate statistics based on user role
      let totalDocs, pendingDocs, approvedDocs, rejectedDocs, totalValue, totalPages;

      if (currentUser.role === 'admin') {
        // Admin sees all documents
        totalDocs = allDocuments?.length || 0;
        pendingDocs = allDocuments?.filter(doc => doc.status === 'pending').length || 0;
        approvedDocs = allDocuments?.filter(doc => doc.status === 'completed').length || 0;
        rejectedDocs = allDocuments?.filter(doc => doc.status === 'rejected').length || 0;
        
        // Receita de autenticador NÃO é incluída no Total Revenue
        // pois não é lucro (valores ficam pending e não são pagos)
        
        // Receita de usuários regulares: considerar apenas pagamentos com status 'completed' EXCETO autenticadores
        const regularPaymentsRevenue = (payments || []).reduce((sum, p) => {
          if (!p) return sum;
          // Considerar apenas pagamentos com status 'completed' (pagamentos realmente pagos)
          if (p.status === 'completed') {
            // Verificar se o usuário é autenticador e excluir do Total Revenue
            const userRole = userRoleMap.get(p.user_id || '');
            if (userRole === 'authenticator') {
              return sum; // Excluir pagamentos de autenticadores
            }
            return sum + (p.amount || 0);
          }
          return sum;
        }, 0);

        totalValue = regularPaymentsRevenue;
        
        totalPages = (allDocuments?.reduce((sum, doc) => sum + (doc.pages || 0), 0) || 0) +
                    (translatedDocs?.reduce((sum, doc) => sum + (doc.pages || 0), 0) || 0);
      } else {
        // Authenticator sees their authenticated documents + pending documents they can review
        totalDocs = translatedDocs?.length || 0;
        pendingDocs = allDocuments?.filter(doc => doc.status === 'pending').length || 0; // All pending docs
        approvedDocs = translatedDocs?.length || 0; // All translated docs are approved
        rejectedDocs = 0; // Rejected docs are not in translated_documents
        
        // Para autenticadores, usar apenas pagamentos completed (se houver)
        // Excluir pagamentos de outros autenticadores para manter consistência
        const regularPaymentsRevenue = (payments || []).reduce((sum, p) => {
          if (!p) return sum;
          if (p.status === 'completed') {
            // Verificar se o usuário é autenticador e excluir do Total Revenue
            const userRole = userRoleMap.get(p.user_id || '');
            if (userRole === 'authenticator') {
              return sum; // Excluir pagamentos de autenticadores
            }
            return sum + (p.amount || 0);
          }
          return sum;
        }, 0);
        
        totalValue = regularPaymentsRevenue;
        totalPages = translatedDocs?.reduce((sum, doc) => sum + (doc.pages || 0), 0) || 0;
      }

      // My authentications (always based on current user)
      const myAuths = translatedDocs?.filter(doc => doc.authenticated_by === currentUser.id).length || 0;

      // My translations (documents uploaded by authenticator)
      const myTranslations = currentUser.role !== 'admin' ? (myUploadedDocs?.length || 0) : 0;

      // Authentications this month
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const myAuthsThisMonth = translatedDocs?.filter(doc =>
        doc.authenticated_by === currentUser.id &&
        doc.authentication_date &&
        new Date(doc.authentication_date) >= thisMonth
      ).length || 0;

      // My translations this month (documents uploaded by authenticator this month)
      const myTranslationsThisMonth = currentUser.role !== 'admin' ? (myUploadedDocs?.filter(doc =>
        doc.created_at &&
        new Date(doc.created_at) >= thisMonth
      ).length || 0) : 0;

      // Calculate average processing time (mock data for now)
      const averageProcessingTime = 2.5; // hours

      // Top languages (based on available documents)
      const languageCounts: { [key: string]: number } = {};
      const docsForLanguages = currentUser.role === 'admin' ? allDocuments : translatedDocs;
      
      docsForLanguages?.forEach(doc => {
        if (doc.source_language && doc.target_language) {
          const langPair = `${doc.source_language} → ${doc.target_language}`;
          languageCounts[langPair] = (languageCounts[langPair] || 0) + 1;
        }
      });

      const topLanguages = Object.entries(languageCounts)
        .map(([language, count]) => ({ language, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Recent activity (my authentications + my uploads)
      const authActivity = translatedDocs
        ?.filter(doc => doc.authenticated_by === currentUser.id)
        .map(doc => ({
          id: doc.id,
          filename: doc.filename,
          action: 'Authenticated',
          date: doc.authentication_date || '',
          user_name: 'You',
          type: 'auth' as const
        })) || [];

      const uploadActivity = currentUser.role !== 'admin' ? (myUploadedDocs
        ?.map(doc => ({
          id: doc.id,
          filename: doc.filename,
          action: doc.client_name ? `Uploaded for ${doc.client_name}` : 'Uploaded for translation',
          date: doc.created_at || '',
          user_name: 'You',
          type: 'upload' as const
        })) || []) : [];

      const recentActivity = [...authActivity, ...uploadActivity]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8)
        .map(({ type, ...activity }) => activity);

      const newStats = {
        totalDocuments: totalDocs,
        pendingDocuments: pendingDocs,
        approvedDocuments: approvedDocs,
        rejectedDocuments: rejectedDocs,
        totalValue,
        totalPages,
        myAuthentications: myAuths,
        myAuthenticationsThisMonth: myAuthsThisMonth,
        myTranslations,
        myTranslationsThisMonth,
        averageProcessingTime,
        topLanguages,
        recentActivity
      };

      setStats(newStats);
      setLastUpdated(now);
      // ✅ OTIMIZADO: Atualizar ref também
      lastUpdatedRef.current = now;

    } catch (err: any) {
      console.error('[OverviewContext] Error fetching stats:', err);
      setError(err.message || 'Error fetching overview statistics');
    } finally {
      setLoading(false);
    }
  }, [currentUser]); // ✅ OTIMIZADO: Remover lastUpdated da dependência para evitar loops

  const refreshStats = useCallback(async () => {
    await fetchOverviewStats(true);
  }, [fetchOverviewStats]);

  // Initial fetch
  useEffect(() => {
    fetchOverviewStats();
  }, [fetchOverviewStats]);

  return (
    <OverviewContext.Provider value={{
      stats,
      loading,
      error,
      refreshStats,
      lastUpdated
    }}>
      {children}
    </OverviewContext.Provider>
  );
}

export function useOverview() {
  const context = useContext(OverviewContext);
  if (context === undefined) {
    throw new Error('useOverview must be used within an OverviewProvider');
  }
  return context;
} 