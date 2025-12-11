import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface DocumentWithMissingFile {
  document_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  payment_id: string;
  payment_status: string;
  payment_amount: number;
  payment_gross_amount: number;
  payment_fee_amount?: number | null;
  payment_date: string;
  filename: string;
  original_filename: string | null;
  status: string;
  total_cost: number;
  verification_code: string;
  created_at: string;
  upload_failed_at: string | null;
  upload_retry_count: number;
  pages: number;
}

export function useDocumentsWithMissingFiles(userId?: string) {
  const [documents, setDocuments] = useState<DocumentWithMissingFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_documents_with_missing_files', {
        user_id_param: userId || null
      });

      if (rpcError) {
        console.error('Erro ao buscar documentos:', rpcError);
        setError(rpcError.message);
        setDocuments([]);
        return;
      }

      setDocuments(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar documentos:', err);
      setError(err.message || 'Erro desconhecido');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDocuments();

    // Configurar subscription em tempo real
    const channel = supabase
      .channel('documents_with_missing_files_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: userId ? `user_id=eq.${userId}` : undefined
        },
        () => {
          // Recarregar quando houver mudanças
          fetchDocuments();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: userId ? `user_id=eq.${userId}` : undefined
        },
        () => {
          // Recarregar quando houver mudanças em pagamentos
          fetchDocuments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchDocuments]);

  return {
    documents,
    loading,
    error,
    refetch: fetchDocuments,
    count: documents.length
  };
}

