import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface ActionLog {
  id: string;
  performed_by: string;
  performed_by_type: 'user' | 'admin' | 'authenticator' | 'finance' | 'affiliate' | 'system';
  performed_by_name: string | null;
  performed_by_email: string | null;
  action_type: string;
  action_description: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, any> | null;
  affected_user_id: string | null;
  created_at: string;
}

export interface LogFilters {
  action_type?: string;
  performed_by_type?: string;
  entity_type?: string;
  entity_id?: string;
  filename?: string;
  document_id?: string;
  date_from?: string;
  date_to?: string;
  search_term?: string;
}

interface UseActionLogsReturn {
  logs: ActionLog[];
  loading: boolean;
  error: string | null;
  filters: LogFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  fetchLogs: (page?: number, reset?: boolean) => Promise<void>;
  updateFilters: (newFilters: Partial<LogFilters>) => void;
  clearFilters: () => void;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
}

const DEFAULT_LIMIT = 20;

export function useActionLogs(userId?: string): UseActionLogsReturn {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LogFilters>({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });

  const buildQuery = useCallback(() => {
    let query = supabase
      .from('action_logs')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.action_type) {
      query = query.eq('action_type', filters.action_type);
    }

    if (filters.performed_by_type) {
      query = query.eq('performed_by_type', filters.performed_by_type);
    }

    if (filters.entity_type) {
      query = query.eq('entity_type', filters.entity_type);
    }

    if (filters.entity_id) {
      query = query.eq('entity_id', filters.entity_id);
    }

    if (filters.document_id) {
      query = query.eq('entity_id', filters.document_id).eq('entity_type', 'document');
    }

    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    // If userId is provided, filter by affected_user_id or performed_by
    if (userId) {
      query = query.or(`affected_user_id.eq.${userId},performed_by.eq.${userId}`);
    }

    // Search term - search in action_description and metadata
    if (filters.search_term) {
      const searchTerm = filters.search_term.toLowerCase();
      // Use ilike with proper escaping
      query = query.or(`action_description.ilike.%${searchTerm}%,performed_by_name.ilike.%${searchTerm}%,performed_by_email.ilike.%${searchTerm}%`);
    }

    // Order by created_at descending
    query = query.order('created_at', { ascending: false });

    return query;
  }, [filters, userId]);

  const fetchLogs = useCallback(async (page: number = 1, reset: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const query = buildQuery();

      // Apply pagination
      const from = (page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;

      const { data, error: queryError, count } = await query.range(from, to);

      if (queryError) {
        throw queryError;
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / pagination.limit);
      const hasMore = page < totalPages;

      setLogs(reset ? (data || []) : (prev => [...prev, ...(data || [])]));
      setPagination(prev => ({
        ...prev,
        page,
        total,
        totalPages,
        hasMore,
      }));
    } catch (err: any) {
      console.error('Error fetching action logs:', err);
      setError(err.message || 'Failed to fetch action logs');
    } finally {
      setLoading(false);
    }
  }, [buildQuery, pagination.limit]);

  const updateFilters = useCallback((newFilters: Partial<LogFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchLogs(page, true);
    }
  }, [fetchLogs, pagination.totalPages]);

  const nextPage = useCallback(() => {
    if (pagination.hasMore) {
      fetchLogs(pagination.page + 1, true);
    }
  }, [fetchLogs, pagination.page, pagination.hasMore]);

  const prevPage = useCallback(() => {
    if (pagination.page > 1) {
      fetchLogs(pagination.page - 1, true);
    }
  }, [fetchLogs, pagination.page]);

  // Fetch logs when filters change
  useEffect(() => {
    fetchLogs(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return {
    logs,
    loading,
    error,
    filters,
    pagination,
    fetchLogs,
    updateFilters,
    clearFilters,
    goToPage,
    nextPage,
    prevPage,
  };
}

