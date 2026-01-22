import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface UseStripeCleanupProps {
  documentId?: string;
  onCleanupComplete?: () => void;
}

export function useStripeCleanup({
  documentId,
  onCleanupComplete
}: UseStripeCleanupProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCleanedUpRef = useRef(false);

  // Função para limpar documento específico
  const cleanupDocument = useCallback(async (docId: string) => {
    if (isCleanedUpRef.current) {
      console.log('🧹 Documento já foi limpo:', docId);
      return;
    }

    try {
      console.log('🧹 Iniciando limpeza do documento Stripe:', docId);
      
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
        console.log('✅ Documento Stripe limpo com sucesso:', docId);
        isCleanedUpRef.current = true;
        onCleanupComplete?.();
      } else {
        console.error('❌ Erro ao limpar documento Stripe:', await response.text());
      }
    } catch (error) {
      console.error('❌ Erro na limpeza do documento Stripe:', error);
    }
  }, [onCleanupComplete]);

  // Função para marcar documento como aguardando pagamento Stripe
  const markDocumentAsStripePending = useCallback(async (docId: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ 
          status: 'stripe_pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', docId);

      if (error) {
        console.error('❌ Erro ao marcar documento como Stripe pending:', error);
      } else {
        console.log('✅ Documento marcado como Stripe pending:', docId);
      }
    } catch (error) {
      console.error('❌ Erro ao marcar documento como Stripe pending:', error);
    }
  }, []);

  // Configurar timeout para limpeza automática (2 minutos para teste)
  const setupCleanupTimeout = useCallback((docId: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    console.log('⏰ Configurando timeout de limpeza para 2 minutos (TESTE):', docId);
    
    timeoutRef.current = setTimeout(async () => {
      console.log('⏰ Timeout atingido, limpando documento Stripe:', docId);
      await cleanupDocument(docId);
    }, 2 * 60 * 1000); // 2 minutos para teste
  }, [cleanupDocument]);

  // Limpar timeout quando componente desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Função para cancelar timeout (quando pagamento for confirmado)
  const cancelCleanupTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      console.log('✅ Timeout de limpeza cancelado - pagamento confirmado');
    }
  }, []);

  return {
    cleanupDocument,
    markDocumentAsStripePending,
    setupCleanupTimeout,
    cancelCleanupTimeout,
    isCleanedUp: isCleanedUpRef.current
  };
}
