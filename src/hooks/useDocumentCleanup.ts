import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface UseDocumentCleanupProps {
  documentId?: string;
  isPaymentCompleted?: boolean;
  shouldCleanup?: boolean;
  onCleanupComplete?: () => void;
}

export function useDocumentCleanup({
  documentId,
  isPaymentCompleted = false,
  shouldCleanup = true,
  onCleanupComplete
}: UseDocumentCleanupProps) {
  const navigate = useNavigate();
  const cleanupExecutedRef = useRef(false);
  const isComponentMountedRef = useRef(true);

  // Função para limpar documento individual
  const cleanupDocument = useCallback(async (docId: string) => {
    if (cleanupExecutedRef.current) {
      console.log('🧹 Cleanup já executado para documento:', docId);
      return;
    }

    try {
      console.log('🧹 Iniciando limpeza do documento:', docId);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.log('⚠️ Usuário não autenticado, pulando limpeza');
        return;
      }

      // Verificar se já existe pagamento para este documento
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('document_id', docId)
        .single();

      if (existingPayment) {
        console.log('✅ Documento já tem pagamento, pulando limpeza:', docId);
        return;
      }

      // Chamar edge function para limpeza
      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cleanup-document`;
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ documentId: docId }),
      });

      if (response.ok) {
        console.log('✅ Documento limpo com sucesso:', docId);
        cleanupExecutedRef.current = true;
        onCleanupComplete?.();
      } else {
        console.error('❌ Erro ao limpar documento:', await response.text());
      }
    } catch (error) {
      console.error('❌ Erro na limpeza do documento:', error);
    }
  }, [onCleanupComplete]);

  // Função para limpar todos os documentos pendentes do usuário
  const cleanupAllPendingDocuments = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.log('⚠️ Usuário não autenticado, pulando limpeza');
        return;
      }

      console.log('🧹 Limpando todos os documentos pendentes do usuário');

      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cleanup-draft-documents`;
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: session.user.id }),
      });

      if (response.ok) {
        console.log('✅ Todos os documentos pendentes foram limpos');
        cleanupExecutedRef.current = true;
        onCleanupComplete?.();
      } else {
        console.error('❌ Erro ao limpar documentos pendentes:', await response.text());
      }
    } catch (error) {
      console.error('❌ Erro na limpeza dos documentos pendentes:', error);
    }
  }, [onCleanupComplete]);

  // Handler para beforeunload
  const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    if (!isPaymentCompleted && shouldCleanup && isComponentMountedRef.current) {
      e.preventDefault();
      e.returnValue = 'Seu documento será perdido se você sair. Tem certeza?';
      
      // Tentar executar limpeza (pode não funcionar em todos os navegadores)
      if (documentId) {
        cleanupDocument(documentId);
      } else {
        cleanupAllPendingDocuments();
      }
      
      return 'Seu documento será perdido se você sair. Tem certeza?';
    }
  }, [documentId, isPaymentCompleted, shouldCleanup, cleanupDocument, cleanupAllPendingDocuments]);

  // Handler para visibilitychange (quando a aba fica oculta)
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden && !isPaymentCompleted && shouldCleanup && isComponentMountedRef.current) {
      console.log('👁️ Página ficou oculta, executando limpeza preventiva');
      if (documentId) {
        cleanupDocument(documentId);
      } else {
        cleanupAllPendingDocuments();
      }
    }
  }, [documentId, isPaymentCompleted, shouldCleanup, cleanupDocument, cleanupAllPendingDocuments]);

  // Handler para pagehide (quando a página é descarregada)
  const handlePageHide = useCallback((e: PageTransitionEvent) => {
    if (!isPaymentCompleted && shouldCleanup && isComponentMountedRef.current) {
      console.log('📄 Página sendo descarregada, executando limpeza');
      if (documentId) {
        cleanupDocument(documentId);
      } else {
        cleanupAllPendingDocuments();
      }
    }
  }, [documentId, isPaymentCompleted, shouldCleanup, cleanupDocument, cleanupAllPendingDocuments]);

  // Configurar event listeners
  useEffect(() => {
    if (!shouldCleanup) return;

    // Adicionar listeners para diferentes eventos de saída
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      isComponentMountedRef.current = false;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [shouldCleanup, handleBeforeUnload, handleVisibilityChange, handlePageHide]);

  // Função para navegar com limpeza
  const navigateWithCleanup = useCallback(async (path: string) => {
    if (!isPaymentCompleted && shouldCleanup && isComponentMountedRef.current) {
      console.log('🔄 Navegando com limpeza para:', path);
      if (documentId) {
        await cleanupDocument(documentId);
      } else {
        await cleanupAllPendingDocuments();
      }
    }
    navigate(path);
  }, [documentId, isPaymentCompleted, shouldCleanup, cleanupDocument, cleanupAllPendingDocuments, navigate]);

  return {
    cleanupDocument,
    cleanupAllPendingDocuments,
    navigateWithCleanup,
    isCleanupExecuted: cleanupExecutedRef.current
  };
}
