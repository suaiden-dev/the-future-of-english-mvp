import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { notifyDocumentUpload, notifyTranslationStarted } from '../utils/webhookNotifications';

type Document = Database['public']['Tables']['documents']['Row'];
type DocumentInsert = Database['public']['Tables']['documents']['Insert'] & { file_url?: string };

export function useDocuments(userId?: string) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    if (!userId) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'draft')  // não incluir documentos com status draft
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDocuments(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [userId]);

  const createDocument = async (documentData: Partial<DocumentInsert> & { file_url?: string }) => {
    if (!userId) throw new Error('User not authenticated');
    if (!documentData.filename) throw new Error('Filename is required');
    if (!documentData.verification_code) throw new Error('Verification code is required');

    try {
      // Garantir que folder_id nunca seja null (apenas string ou undefined)
      const docToInsert = {
        ...documentData,
        folder_id: documentData.folder_id ?? undefined,
        user_id: userId, // sempre sobrescreve
        pages: documentData.pages ?? 1,
        total_cost: (documentData.pages ?? 1) * 20,
        filename: documentData.filename, // garantir obrigatório
        verification_code: documentData.verification_code // garantir obrigatório
      };
      const { data: newDocument, error } = await supabase
        .from('documents')
        .insert(docToInsert)
        .select()
        .single();
      
      if (error) throw error;
      setDocuments(prev => [newDocument, ...prev]);
      
      // Enviar notificação de upload
      notifyDocumentUpload(userId, newDocument.filename, newDocument.id);
      
      return newDocument;
    } catch (err) {
      console.error('DEBUG: [useDocuments] Erro ao criar documento:', err, JSON.stringify(err, null, 2));
      throw err;
    }
  };

  const updateDocumentStatus = async (documentId: string, status: 'pending' | 'processing' | 'completed') => {
    try {
      const { data: updatedDocument, error } = await supabase
        .from('documents')
        .update({ status })
        .eq('id', documentId)
        .select()
        .single();
      
      if (error) throw error;

      // Notificar quando o documento inicia processamento
      if (status === 'processing') {
        try {
          await notifyTranslationStarted(updatedDocument.user_id, updatedDocument.filename, updatedDocument.id);
        } catch (error) {
          console.error('Erro ao enviar notificação de tradução iniciada:', error);
          // Não interrompemos o processo mesmo se a notificação falhar
        }
      }

      setDocuments(prev => 
        prev.map(doc => 
          doc.id === documentId ? updatedDocument : doc
        )
      );
      return updatedDocument;
    } catch (err) {
      console.error('Error updating document status:', err);
      throw err;
    }
  };

  return {
    documents,
    loading,
    error,
    createDocument,
    updateDocumentStatus,
    refetch: fetchDocuments
  };
}

export function useAllDocuments() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllDocuments = async () => {
    try {
      setLoading(true);
      
      // Check if Supabase is properly configured
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        throw new Error('Supabase environment variables not configured');
      }

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all documents:', error);
        setError('Failed to fetch documents');
        return;
      }

      setDocuments(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching all documents:', err);
      setError('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllDocuments();
  }, []);

  const updateDocumentStatus = async (documentId: string, status: 'pending' | 'processing' | 'completed') => {
    try {
      const { data: updatedDocument, error } = await supabase
        .from('documents')
        .update({ status })
        .eq('id', documentId)
        .select()
        .single();
      
      if (error) throw error;

      // Notificar quando o documento inicia processamento
      if (status === 'processing') {
        try {
          await notifyTranslationStarted(updatedDocument.user_id, updatedDocument.filename, updatedDocument.id);
        } catch (error) {
          console.error('Erro ao enviar notificação de tradução iniciada:', error);
          // Não interrompemos o processo mesmo se a notificação falhar
        }
      }

      setDocuments(prev => 
        prev.map(doc => 
          doc.id === documentId ? updatedDocument : doc
        )
      );
      return updatedDocument;
    } catch (err) {
      console.error('Error updating document status:', err);
      throw err;
    }
  };

  return {
    documents,
    loading,
    error,
    updateDocumentStatus,
    refetch: fetchAllDocuments
  };
}

// Novo hook para buscar documentos do usuário (pending da tabela documents + processed da translated_documents)
export function useTranslatedDocuments(userId?: string) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtime, setRealtime] = useState<any>(null);

  const fetchDocuments = async () => {
    if (!userId) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      
      // Buscar documentos pending/processing da tabela documents
      const { data: pendingDocs, error: pendingError } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false });
      
      if (pendingError) throw pendingError;
      
      // Buscar documentos já processados da tabela translated_documents
      const { data: translatedDocs, error: translatedError } = await supabase
        .from('translated_documents')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['completed', 'finished'])
        .order('created_at', { ascending: false });
      
      if (translatedError) throw translatedError;
      
      // Buscar documentos completed na tabela documents_to_be_verified
      const { data: verifiedDocs, error: verifiedError } = await supabase
        .from('documents_to_be_verified')
        .select('filename, status')
        .eq('user_id', userId)
        .eq('status', 'completed');
      
      if (verifiedError) {
        console.error('[useTranslatedDocuments] Erro ao buscar documentos verificados:', verifiedError);
      }
      
      console.log('[useTranslatedDocuments] DEBUG - Documentos pending/processing encontrados:', pendingDocs?.length || 0);
      console.log('[useTranslatedDocuments] DEBUG - Documentos verificados encontrados:', verifiedDocs?.length || 0);
      console.log('[useTranslatedDocuments] DEBUG - Documentos traduzidos encontrados:', translatedDocs?.length || 0);
      console.log('[useTranslatedDocuments] DEBUG - Documentos verificados:', verifiedDocs);
      
      // Filtrar documentos processing que já foram aprovados
      const filteredPendingDocs = (pendingDocs || []).filter(doc => {
        // Se o documento está processing, verificar se não foi aprovado
        if (doc.status === 'processing') {
          const isApproved = verifiedDocs?.some(verified => {
            const match = verified.filename === doc.filename && verified.status === 'completed';
            console.log(`[useTranslatedDocuments] DEBUG - Comparando: ${verified.filename} === ${doc.filename} && ${verified.status} === 'completed' = ${match}`);
            return match;
          });
          console.log(`[useTranslatedDocuments] DEBUG - Doc ${doc.filename} (${doc.id}): isApproved = ${isApproved}`);
          return !isApproved; // Só incluir se NÃO foi aprovado
        }
        return true; // Incluir documentos pending normalmente
      });
      
      console.log('[useTranslatedDocuments] DEBUG - Documentos filtrados:', filteredPendingDocs?.length || 0);
      
      // Combinar e ordenar por data de criação
      const allDocs = [
        ...filteredPendingDocs.map(doc => ({ ...doc, source: 'documents' })),
        ...(translatedDocs || []).map(doc => ({ ...doc, source: 'translated_documents' }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setDocuments(allDocs);
      setError(null);
    } catch (err) {
      console.error('[useTranslatedDocuments] Erro ao buscar documentos:', err);
      setError('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtime = () => {
    if (!userId) return;

    const channel = supabase
      .channel('translated_documents')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('[useTranslatedDocuments] Documento atualizado na tabela documents:', payload);
          // Refetch para garantir que temos os dados mais recentes
          fetchDocuments();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'translated_documents',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('[useTranslatedDocuments] Documento atualizado na tabela translated_documents:', payload);
          // Refetch para garantir que temos os dados mais recentes
          fetchDocuments();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents_to_be_verified',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('[useTranslatedDocuments] Documento atualizado na tabela documents_to_be_verified:', payload);
          // Refetch para garantir que temos os dados mais recentes
          fetchDocuments();
        }
      )
      .subscribe();

    setRealtime(channel);
  };

  useEffect(() => {
    fetchDocuments();
    setupRealtime();

    return () => {
      if (realtime) {
        supabase.removeChannel(realtime);
      }
    };
  }, [userId]);

  return {
    documents,
    loading,
    error,
    refetch: fetchDocuments
  };
}