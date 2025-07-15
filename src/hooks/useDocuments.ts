import { useState, useEffect } from 'react';
import { db } from '../lib/supabase';
import { Database } from '../lib/database.types';

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
      const data = await db.getDocuments(userId);
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

  const createDocument = async (documentData: Omit<DocumentInsert, 'user_id'>) => {
    if (!userId) throw new Error('User not authenticated');

    try {
      // Garantir que folder_id nunca seja null (apenas string ou undefined)
      const docToInsert = {
        ...documentData,
        folder_id: documentData.folder_id ?? undefined,
        user_id: userId,
        pages: documentData.pages ?? 1,
        total_cost: (documentData.pages ?? 1) * 20,
      };
      const newDocument = await db.createDocument(docToInsert);
      setDocuments(prev => [newDocument, ...prev]);
      return newDocument;
    } catch (err) {
      console.error('Error creating document:', err);
      throw err;
    }
  };

  const updateDocumentStatus = async (documentId: string, status: Document['status']) => {
    try {
      const updatedDocument = await db.updateDocumentStatus(documentId, status);
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
      console.log('[useAllDocuments] Buscando todos os documentos...');
      const data = await db.getAllDocuments();
      console.log('[useAllDocuments] Documentos encontrados:', data?.length || 0);
      setDocuments(data);
      setError(null);
    } catch (err) {
      console.error('[useAllDocuments] Erro ao buscar documentos:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch documents';
      setError(`Erro ao carregar documentos: ${errorMessage}`);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllDocuments();
  }, []);

  const updateDocumentStatus = async (documentId: string, status: Document['status']) => {
    try {
      const updatedDocument = await db.updateDocumentStatus(documentId, status);
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === documentId ? { ...doc, ...updatedDocument } : doc
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