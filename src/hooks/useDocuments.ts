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
        .neq('status', 'pending')  // não incluir documentos com status pending
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
      
      // 1. Buscar documentos já processados pelo autenticador na tabela translated_documents (PRIORIDADE MÁXIMA)
      const { data: translatedDocs, error: translatedError } = await supabase
        .from('translated_documents')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['completed', 'finished', 'rejected'])
        .order('created_at', { ascending: false });
      
      if (translatedError) throw translatedError;
      
      // 2. Buscar documentos na tabela documents_to_be_verified (PRIORIDADE MÉDIA)
      // IMPORTANTE: Só incluir documentos com status que indicam conclusão do processo
      // O cliente só deve ver documentos que foram processados pelo autenticador
      const { data: verifiedDocs, error: verifiedError } = await supabase
        .from('documents_to_be_verified')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['completed', 'rejected']) // APENAS status finais - remove 'pending' e 'processing'
        .order('created_at', { ascending: false });
      
      if (verifiedError) throw verifiedError;
      
      // 3. Buscar documentos na tabela documents (PRIORIDADE MÍNIMA)
      const { data: originalDocs, error: originalError } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false });
      
      if (originalError) throw originalError;
      
      console.log('[useTranslatedDocuments] DEBUG - Documentos translated_documents encontrados:', translatedDocs?.length || 0);
      console.log('[useTranslatedDocuments] DEBUG - Documentos documents_to_be_verified encontrados:', verifiedDocs?.length || 0);
      console.log('[useTranslatedDocuments] DEBUG - Documentos documents encontrados:', originalDocs?.length || 0);
      
      // Aplicar lógica de prioridade em cascata usando as relações corretas entre tabelas
      const allDocs: any[] = [];
      const processedFilenames = new Set<string>();
      const processedVerifiedIds = new Set<string>();
      
      // PRIORIDADE 1: Documentos já processados (translated_documents)
      if (translatedDocs && translatedDocs.length > 0) {
        translatedDocs.forEach(doc => {
          if (!processedFilenames.has(doc.filename)) {
            allDocs.push({ ...doc, source: 'translated_documents' });
            processedFilenames.add(doc.filename);
            // Marcar o ID do documento verificado como processado
            if (doc.original_document_id) {
              processedVerifiedIds.add(doc.original_document_id);
            }
            console.log(`[useTranslatedDocuments] DEBUG - Adicionado da translated_documents: ${doc.filename} (original_document_id: ${doc.original_document_id}, status: ${doc.status})`);
          }
        });
      }
      
      // PRIORIDADE 2: Documentos em verificação (documents_to_be_verified) que foram FINALIZADOS
      // Só incluir documentos com status 'completed' ou 'rejected' (processados pelo autenticador)
      // Documentos com 'pending' ou 'processing' ainda estão aguardando e NÃO devem aparecer para o cliente
      if (verifiedDocs && verifiedDocs.length > 0) {
        verifiedDocs.forEach(verifiedDoc => {
          // Verificar se este documento já foi processado (existe em translated_documents)
          const alreadyProcessed = processedVerifiedIds.has(verifiedDoc.id);
          
          if (!alreadyProcessed && !processedFilenames.has(verifiedDoc.filename)) {
            allDocs.push({ ...verifiedDoc, source: 'documents_to_be_verified' });
            processedFilenames.add(verifiedDoc.filename);
            console.log(`[useTranslatedDocuments] DEBUG - Adicionado da documents_to_be_verified: ${verifiedDoc.filename} (id: ${verifiedDoc.id}, status: ${verifiedDoc.status})`);
          }
        });
      }
      
      // PRIORIDADE 3: Documentos originais (documents) que NÃO foram enviados para verificação
      if (originalDocs && originalDocs.length > 0) {
        originalDocs.forEach(originalDoc => {
          // Verificar se este documento já foi enviado para verificação (existe em documents_to_be_verified)
          const alreadyInVerification = verifiedDocs?.some(verifiedDoc => 
            verifiedDoc.filename === originalDoc.filename && verifiedDoc.user_id === originalDoc.user_id
          );
          
          if (!alreadyInVerification && !processedFilenames.has(originalDoc.filename)) {
            allDocs.push({ ...originalDoc, source: 'documents' });
            processedFilenames.add(originalDoc.filename);
            console.log(`[useTranslatedDocuments] DEBUG - Adicionado da documents: ${originalDoc.filename}`);
          }
        });
      }
      
      // Ordenar por data de criação
      allDocs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      console.log('[useTranslatedDocuments] DEBUG - Total de documentos únicos:', allDocs.length);
      console.log('[useTranslatedDocuments] DEBUG - Filenames processados:', Array.from(processedFilenames));
      console.log('[useTranslatedDocuments] DEBUG - IDs de documentos verificados processados:', Array.from(processedVerifiedIds));
      
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

// Hook para buscar APENAS documentos da tabela translated_documents do usuário
export function useUserTranslatedDocuments(userId?: string) {
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
      const { data, error } = await supabase
        .from('translated_documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
      setError(null);
    } catch (err) {
      console.error('[useUserTranslatedDocuments] Erro ao buscar documentos:', err);
      setError('Failed to fetch translated documents');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtime = () => {
    if (!userId) return;

    const channel = supabase
      .channel('translated_documents_only')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'translated_documents',
          filter: `user_id=eq.${userId}`
        },
        () => {
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