import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
    averageProcessingTime: 0,
    topLanguages: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchOverviewStats = useCallback(async (forceRefresh = false) => {
    if (!currentUser) return;

    // Check if we have recent data (less than 30 seconds old)
    const now = new Date();
    const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
    
    if (!forceRefresh && lastUpdated && lastUpdated > thirtySecondsAgo) {
      console.log('[OverviewContext] Using cached data, last updated:', lastUpdated);
      return;
    }

    console.log('[OverviewContext] Fetching fresh data for user:', currentUser.id, 'role:', currentUser.role);
    setLoading(true);
    setError(null);

    try {
      // Fetch documents based on user role
      let allDocumentsQuery = supabase.from('documents_to_be_verified').select('*');
      let translatedDocsQuery = supabase.from('translated_documents').select('*');

      // If not admin, filter by authenticated_by
      if (currentUser.role !== 'admin') {
        translatedDocsQuery = translatedDocsQuery.eq('authenticated_by', currentUser.id);
      }

      const { data: allDocuments, error: allError } = await allDocumentsQuery;
      if (allError) throw allError;

      const { data: translatedDocs, error: translatedError } = await translatedDocsQuery;
      if (translatedError) throw translatedError;

      console.log('[OverviewContext] Found documents - all:', allDocuments?.length, 'translated:', translatedDocs?.length);

      // Calculate statistics based on user role
      let totalDocs, pendingDocs, approvedDocs, rejectedDocs, totalValue, totalPages;

      if (currentUser.role === 'admin') {
        // Admin sees all documents
        totalDocs = allDocuments?.length || 0;
        pendingDocs = allDocuments?.filter(doc => doc.status === 'pending').length || 0;
        approvedDocs = allDocuments?.filter(doc => doc.status === 'completed').length || 0;
        rejectedDocs = allDocuments?.filter(doc => doc.status === 'rejected').length || 0;
        totalValue = (allDocuments?.reduce((sum, doc) => sum + (doc.total_cost || 0), 0) || 0) +
                    (translatedDocs?.reduce((sum, doc) => sum + (doc.total_cost || 0), 0) || 0);
        totalPages = (allDocuments?.reduce((sum, doc) => sum + (doc.pages || 0), 0) || 0) +
                    (translatedDocs?.reduce((sum, doc) => sum + (doc.pages || 0), 0) || 0);
      } else {
        // Authenticator sees their authenticated documents + pending documents they can review
        totalDocs = translatedDocs?.length || 0;
        pendingDocs = allDocuments?.filter(doc => doc.status === 'pending').length || 0; // All pending docs
        approvedDocs = translatedDocs?.length || 0; // All translated docs are approved
        rejectedDocs = 0; // Rejected docs are not in translated_documents
        totalValue = translatedDocs?.reduce((sum, doc) => sum + (doc.total_cost || 0), 0) || 0;
        totalPages = translatedDocs?.reduce((sum, doc) => sum + (doc.pages || 0), 0) || 0;
      }

      // My authentications (always based on current user)
      const myAuths = translatedDocs?.filter(doc => doc.authenticated_by === currentUser.id).length || 0;

      // Authentications this month
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const myAuthsThisMonth = translatedDocs?.filter(doc =>
        doc.authenticated_by === currentUser.id &&
        doc.authentication_date &&
        new Date(doc.authentication_date) >= thisMonth
      ).length || 0;

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

      // Recent activity (my authentications)
      const recentActivity = translatedDocs
        ?.filter(doc => doc.authenticated_by === currentUser.id)
        .sort((a, b) => new Date(b.authentication_date || '').getTime() - new Date(a.authentication_date || '').getTime())
        .slice(0, 5)
        .map(doc => ({
          id: doc.id,
          filename: doc.filename,
          action: 'Authenticated',
          date: doc.authentication_date || '',
          user_name: currentUser.role === 'admin' ? 'You' : 'You'
        })) || [];

      const newStats = {
        totalDocuments: totalDocs,
        pendingDocuments: pendingDocs,
        approvedDocuments: approvedDocs,
        rejectedDocuments: rejectedDocs,
        totalValue,
        totalPages,
        myAuthentications: myAuths,
        myAuthenticationsThisMonth: myAuthsThisMonth,
        averageProcessingTime,
        topLanguages,
        recentActivity
      };

      setStats(newStats);
      setLastUpdated(now);
      console.log('[OverviewContext] Data updated successfully for', currentUser.role);

    } catch (err: any) {
      console.error('[OverviewContext] Error fetching stats:', err);
      setError(err.message || 'Error fetching overview statistics');
    } finally {
      setLoading(false);
    }
  }, [currentUser, lastUpdated]);

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